import { CapabilityCode, CustomOrderStatus, Prisma, PrismaClient } from '@prisma/client'
import { GraphQLError } from 'graphql'
import { randomUUID } from 'node:crypto'
import { requireCapability } from '../capabilities/service'
import { DeliveryStatus, DeliveryType, LogSatus } from '../../types'
import { calculatePartnerFee } from '../../utils/partner-fees'

const transitions: Record<CustomOrderStatus, CustomOrderStatus[]> = {
  DRAFT: ['REQUESTED', 'CANCELLED'],
  REQUESTED: ['QUOTED', 'CANCELLED'],
  QUOTED: ['AWAITING_CUSTOMER_APPROVAL', 'CANCELLED'],
  AWAITING_CUSTOMER_APPROVAL: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['MATERIALS_RESERVED', 'IN_PREPARATION', 'CANCELLED'],
  MATERIALS_RESERVED: ['IN_PREPARATION', 'CANCELLED'],
  IN_PREPARATION: ['READY', 'CANCELLED'],
  READY: ['FULFILLED', 'CANCELLED'],
  FULFILLED: [],
  CANCELLED: [],
}

export const giftOrderInclude = {
  client: { include: { user: { select: { email: true, phone: true } } } },
  address: true,
  confirmedOrder: true,
  gift: true,
  lines: { orderBy: { sortOrder: 'asc' as const } },
  quotations: { orderBy: { createdAt: 'desc' as const }, include: { lines: { orderBy: { sortOrder: 'asc' as const } } } },
  tasks: { orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }] },
  reservations: true,
}

function documentNumber(prefix: string) {
  return `${prefix}-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${randomUUID().slice(0, 6).toUpperCase()}`
}

async function validateGiftLines(prisma: PrismaClient, partnerId: number, input: any) {
  if (!input.customerName?.trim()) throw new GraphQLError('CUSTOMER_NAME_REQUIRED')
  if (!input.lines?.length) throw new GraphQLError('CUSTOM_ORDER_LINES_REQUIRED')
  if (input.fulfillmentMode === 'DELIVERY' && !input.deliveryAddress?.trim())
    throw new GraphQLError('DELIVERY_ADDRESS_REQUIRED')
  if (input.discount != null && (!Number.isFinite(input.discount) || input.discount < 0))
    throw new GraphQLError('INVALID_DISCOUNT')
  for (const line of input.lines) {
    if (!line.name?.trim()) throw new GraphQLError('CUSTOM_ORDER_LINE_NAME_REQUIRED')
    if (!Number.isFinite(line.quantity) || line.quantity <= 0) throw new GraphQLError('INVALID_LINE_QUANTITY')
    if (!Number.isFinite(line.unitPrice) || line.unitPrice < 0) throw new GraphQLError('INVALID_LINE_PRICE')
    if (line.unitCost != null && (!Number.isFinite(line.unitCost) || line.unitCost < 0))
      throw new GraphQLError('INVALID_LINE_COST')
  }
  const productIds = input.lines.map((line: any) => line.productId).filter(Boolean)
  const products = productIds.length ? await prisma.product.findMany({ where: { id: { in: productIds }, partnerId, isActive: true } }) : []
  if (products.length !== new Set(productIds).size) throw new GraphQLError('PRODUCT_NOT_FOUND')
}

async function createGiftOrderForPartner(prisma: PrismaClient, partnerId: number, input: any, clientId?: number) {
  await validateGiftLines(prisma, partnerId, input)
  const subtotal = input.lines.reduce((sum: number, line: any) => sum + line.quantity * line.unitPrice, 0)
  const discount = Math.min(Math.max(input.discount ?? 0, 0), subtotal)
  return prisma.customOrder.create({
    data: {
      orderNumber: input.orderNumber || documentNumber('GFT'), partnerId, clientId: clientId ?? null,
      addressId: input.addressId ?? null,
      customerName: input.customerName.trim(), customerPhone: input.customerPhone?.trim() || null,
      requiredAt: input.requiredAt ?? null, fulfillmentMode: input.fulfillmentMode,
      deliveryAddress: input.deliveryAddress?.trim() || null, note: input.note?.trim() || null,
      subtotal, discount, total: subtotal - discount,
      gift: { create: {
        occasion: input.occasion?.trim() || null, recipientName: input.recipientName?.trim() || null,
        cardMessage: input.cardMessage?.trim() || null, style: input.style?.trim() || null,
        wrappingNote: input.wrappingNote?.trim() || null,
      } },
      lines: { create: input.lines.map((line: any, index: number) => ({
        productId: line.productId ?? null, name: line.name.trim(), description: line.description?.trim() || null,
        quantity: line.quantity, unitPrice: line.unitPrice, unitCost: line.unitCost ?? 0,
        total: line.quantity * line.unitPrice, sortOrder: index,
      })) },
      tasks: input.tasks?.length ? { create: input.tasks.map((title: string, index: number) => ({ title: title.trim(), sortOrder: index, dueAt: input.requiredAt ?? null })) } : undefined,
    }, include: giftOrderInclude,
  })
}

export async function createGiftOrder(prisma: PrismaClient, partnerId: number, input: any) {
  await requireCapability(prisma, partnerId, CapabilityCode.GIFT_BUILDER)
  return createGiftOrderForPartner(prisma, partnerId, input)
}

/** Client requests must be bound to an account and a single storefront. */
export async function createClientGiftOrder(prisma: PrismaClient, clientId: number, input: any) {
  if (!input.partnerId) throw new GraphQLError('PARTNER_REQUIRED')
  const [client, partner] = await Promise.all([
    prisma.client.findUnique({ where: { userId: clientId }, include: { user: { select: { phone: true } } } }),
    prisma.partner.findUnique({ where: { userId: input.partnerId } }),
  ])
  if (!client) throw new GraphQLError('CLIENT_REQUIRED')
  if (!partner?.online) throw new GraphQLError('STORE_UNAVAILABLE')
  if (input.addressId) {
    const address = await prisma.address.findFirst({ where: { id: input.addressId, userId: clientId } })
    if (!address) throw new GraphQLError('ADDRESS_NOT_FOUND')
  }
  const customerName = `${client.firstname} ${client.lastname}`.trim() || 'Shea client'
  const created = await createGiftOrderForPartner(prisma, input.partnerId, {
    ...input,
    customerName,
    customerPhone: client.user.phone ?? input.customerPhone,
  }, clientId)
  await prisma.log.create({ data: {
    userId: input.partnerId, type: LogSatus.ORDER_UPDATE,
    title: `New gift request ${created.orderNumber}`, body: 'A customer requested a custom gift or gift bundle.',
    title_ar: `طلب هدية جديد ${created.orderNumber}`, body_ar: 'قام عميل بإرسال طلب هدية أو باقة مخصصة.',
  } })
  return created
}

export async function transitionGiftOrder(prisma: PrismaClient, partnerId: number, id: string, next: CustomOrderStatus, expectedVersion: number) {
  await requireCapability(prisma, partnerId, CapabilityCode.CUSTOM_ORDERS)
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) throw new GraphQLError('INVALID_EXPECTED_VERSION')
  return prisma.$transaction(async (tx) => {
    const order = await tx.customOrder.findFirst({ where: { id, partnerId } })
    if (!order) throw new GraphQLError('CUSTOM_ORDER_NOT_FOUND')
    if (order.version !== expectedVersion) throw new GraphQLError('CUSTOM_ORDER_VERSION_CONFLICT')
    if (!transitions[order.status].includes(next)) throw new GraphQLError(`INVALID_CUSTOM_ORDER_TRANSITION:${order.status}:${next}`)
    if (next === 'CANCELLED') await tx.stockReservation.updateMany({ where: { customOrderId: id, releasedAt: null, consumedAt: null }, data: { releasedAt: new Date() } })
    const updated = await tx.customOrder.updateMany({ where: { id, partnerId, version: expectedVersion }, data: { status: next, version: { increment: 1 } } })
    if (updated.count !== 1) throw new GraphQLError('CUSTOM_ORDER_VERSION_CONFLICT')
    return tx.customOrder.findUnique({ where: { id }, include: giftOrderInclude })
  })
}

export async function createGiftQuotation(prisma: PrismaClient, partnerId: number, customOrderId: string, validUntil?: Date | null, note?: string | null) {
  await requireCapability(prisma, partnerId, CapabilityCode.QUOTATIONS)
  return prisma.$transaction(async (tx) => {
    const order = await tx.customOrder.findFirst({ where: { id: customOrderId, partnerId }, include: { lines: { orderBy: { sortOrder: 'asc' } } } })
    if (!order) throw new GraphQLError('CUSTOM_ORDER_NOT_FOUND')
    const quote = await tx.giftQuotation.create({ data: {
      quoteNumber: documentNumber('QUO'), customOrderId, status: 'SENT', subtotal: order.subtotal, discount: order.discount,
      total: order.total, validUntil: validUntil ?? null, note: note?.trim() || null,
      lines: { create: order.lines.map((line) => ({ productId: line.productId, name: line.name, description: line.description, quantity: line.quantity, unitPrice: line.unitPrice, total: line.total, sortOrder: line.sortOrder })) },
    }, include: { lines: true } })
    if (['DRAFT', 'REQUESTED', 'QUOTED'].includes(order.status)) await tx.customOrder.update({ where: { id: order.id }, data: { status: 'AWAITING_CUSTOMER_APPROVAL', version: { increment: 1 } } })
    if (order.clientId) await tx.log.create({ data: {
      userId: order.clientId, type: LogSatus.ORDER_UPDATE,
      title: `Your gift quote is ready`, body: `Review quote ${quote.quoteNumber} and confirm when you are ready.`,
      title_ar: 'عرض سعر هديتك جاهز', body_ar: `راجع عرض السعر ${quote.quoteNumber} وأكده عندما تكون جاهزاً.`,
    } })
    return quote
  })
}

/** Accepting a quote is client-owned; a catalog-backed gift then becomes a normal fulfillment order. */
export async function respondToGiftQuotation(prisma: PrismaClient, clientId: number, customOrderId: string, accept: boolean, addressId?: number | null) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.customOrder.findFirst({
      where: { id: customOrderId, clientId },
      include: { lines: true, partner: true, quotations: { where: { status: 'SENT' }, orderBy: { createdAt: 'desc' }, take: 1 } },
    })
    if (!order) throw new GraphQLError('GIFT_ORDER_NOT_FOUND')
    const quote = order.quotations[0]
    if (!quote) throw new GraphQLError('GIFT_QUOTE_NOT_FOUND')
    if (quote.validUntil && quote.validUntil.getTime() < Date.now()) {
      await tx.giftQuotation.update({ where: { id: quote.id }, data: { status: 'EXPIRED' } })
      throw new GraphQLError('GIFT_QUOTE_EXPIRED')
    }
    if (!accept) {
      await tx.giftQuotation.update({ where: { id: quote.id }, data: { status: 'REJECTED' } })
      return tx.customOrder.update({ where: { id: order.id }, data: { status: 'CANCELLED', version: { increment: 1 } }, include: giftOrderInclude })
    }
    if (order.confirmedOrderId) return tx.customOrder.findUnique({ where: { id: order.id }, include: giftOrderInclude })
    if (order.lines.some((line) => !line.productId)) throw new GraphQLError('GIFT_CATALOG_ITEMS_MUST_BE_RESOLVED')
    const resolvedAddressId = addressId ?? order.addressId ?? (await tx.address.findFirst({ where: { userId: clientId, isDefault: true }, select: { id: true } }))?.id
    if (!resolvedAddressId) throw new GraphQLError('ADDRESS_REQUIRED')
    const address = await tx.address.findFirst({ where: { id: resolvedAddressId, userId: clientId } })
    if (!address) throw new GraphQLError('ADDRESS_NOT_FOUND')
    const financials = calculatePartnerFee(order.total, order.partner)
    const fulfillmentOrder = await tx.order.create({ data: {
      clientId, partnerId: order.partnerId, addressId: resolvedAddressId, source: 'GIFT', note: order.note,
      ...financials,
      partnerFeeType: financials.partnerFeeType as any,
      items: { create: order.lines.map((line) => ({ productId: line.productId!, quantity: Math.max(1, Math.round(line.quantity)), price: line.unitPrice })) },
      delivery: { create: { type: order.fulfillmentMode === 'PICKUP' ? DeliveryType.PICKUP : DeliveryType.NORMAL, status: DeliveryStatus.PENDING, addressId: order.fulfillmentMode === 'PICKUP' ? null : resolvedAddressId, scheduledAt: order.requiredAt } },
    } })
    await tx.giftQuotation.update({ where: { id: quote.id }, data: { status: 'ACCEPTED' } })
    await tx.log.createMany({ data: [
      { userId: order.partnerId, type: LogSatus.ORDER_UPDATE, title: `Gift quote accepted`, body: `${order.orderNumber} is confirmed and ready for preparation.`, title_ar: 'تم قبول عرض الهدية', body_ar: `تم تأكيد ${order.orderNumber} وأصبح جاهزاً للتحضير.` },
      { userId: clientId, type: LogSatus.ORDER_UPDATE, title: `Gift order confirmed`, body: `Your gift order ${order.orderNumber} is now being prepared.`, title_ar: 'تم تأكيد طلب الهدية', body_ar: `طلب هديتك ${order.orderNumber} قيد التحضير الآن.` },
    ] })
    return tx.customOrder.update({ where: { id: order.id }, data: { status: 'CONFIRMED', confirmedOrderId: fulfillmentOrder.id, addressId: resolvedAddressId, version: { increment: 1 } }, include: giftOrderInclude })
  })
}

export async function reserveGiftMaterials(prisma: PrismaClient, partnerId: number, customOrderId: string) {
  await requireCapability(prisma, partnerId, CapabilityCode.PRODUCTION)
  return prisma.$transaction(async (tx) => {
    const order = await tx.customOrder.findFirst({ where: { id: customOrderId, partnerId }, include: { lines: true } })
    if (!order) throw new GraphQLError('CUSTOM_ORDER_NOT_FOUND')
    if (order.status !== 'CONFIRMED') throw new GraphQLError('CUSTOM_ORDER_MUST_BE_CONFIRMED')
    for (const line of order.lines.filter((item) => item.productId)) {
      const product = await tx.product.findFirst({ where: { id: line.productId!, partnerId, isActive: true } })
      if (!product) throw new GraphQLError('PRODUCT_NOT_FOUND')
      if (!product.trackInventory) continue
      const reserved = await tx.stockReservation.aggregate({ where: { productId: product.id, releasedAt: null, consumedAt: null }, _sum: { quantity: true } })
      if (product.stock - Number(reserved._sum.quantity ?? 0) < line.quantity) throw new GraphQLError(`INSUFFICIENT_AVAILABLE_STOCK:${product.id}`)
      await tx.stockReservation.upsert({ where: { customOrderId_productId: { customOrderId, productId: product.id } }, create: { customOrderId, productId: product.id, quantity: line.quantity }, update: { quantity: line.quantity, releasedAt: null, consumedAt: null } })
    }
    await tx.customOrder.update({ where: { id: customOrderId }, data: { status: 'MATERIALS_RESERVED', version: { increment: 1 } } })
    return tx.customOrder.findUnique({ where: { id: customOrderId }, include: giftOrderInclude })
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
}
