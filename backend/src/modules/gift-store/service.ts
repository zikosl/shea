import { CapabilityCode, CustomOrderStatus, Prisma, PrismaClient } from '@prisma/client'
import { GraphQLError } from 'graphql'
import { randomUUID } from 'node:crypto'
import { requireCapability } from '../capabilities/service'

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
  gift: true,
  lines: { orderBy: { sortOrder: 'asc' as const } },
  quotations: { orderBy: { createdAt: 'desc' as const }, include: { lines: { orderBy: { sortOrder: 'asc' as const } } } },
  tasks: { orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }] },
  reservations: true,
}

function documentNumber(prefix: string) {
  return `${prefix}-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${randomUUID().slice(0, 6).toUpperCase()}`
}

export async function createGiftOrder(prisma: PrismaClient, partnerId: number, input: any) {
  await requireCapability(prisma, partnerId, CapabilityCode.GIFT_BUILDER)
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
  const subtotal = input.lines.reduce((sum: number, line: any) => sum + line.quantity * line.unitPrice, 0)
  const discount = Math.min(Math.max(input.discount ?? 0, 0), subtotal)
  return prisma.customOrder.create({
    data: {
      orderNumber: input.orderNumber || documentNumber('GFT'), partnerId,
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
      quoteNumber: documentNumber('QUO'), customOrderId, subtotal: order.subtotal, discount: order.discount,
      total: order.total, validUntil: validUntil ?? null, note: note?.trim() || null,
      lines: { create: order.lines.map((line) => ({ name: line.name, description: line.description, quantity: line.quantity, unitPrice: line.unitPrice, total: line.total, sortOrder: line.sortOrder })) },
    }, include: { lines: true } })
    if (['DRAFT', 'REQUESTED'].includes(order.status)) await tx.customOrder.update({ where: { id: order.id }, data: { status: 'QUOTED', version: { increment: 1 } } })
    return quote
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
