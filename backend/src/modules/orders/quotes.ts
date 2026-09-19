import { PartnerFeeType, PrismaClient } from '@prisma/client'
import { GraphQLError } from 'graphql'
import { calculatePartnerFee } from '../../utils/partner-fees'
import { createOrderOutboxEvent } from './workflow'

const money = (value: number) => Math.round(value * 100) / 100
const fail = (code: string): never => { throw new GraphQLError(code) }

export async function createOrderQuotation(prisma: PrismaClient, partnerId: number, input: {
  orderId: number; expectedVersion: number; validUntil?: Date | null; note?: string | null
  lines: Array<{ orderItemId: number; unitPrice: number }>
}) {
  if (!input.lines.length || input.lines.length > 100) fail('INVALID_QUOTATION')
  if (input.validUntil && input.validUntil <= new Date()) fail('INVALID_QUOTATION_EXPIRY')
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({ where: { id: input.orderId, partnerId }, include: { items: true, partner: true } })
    if (!order) throw new GraphQLError('ORDER_NOT_FOUND')
    if (order.pricingMode !== 'QUOTE_REQUIRED' || order.status !== 'REQUESTED') fail('ORDER_NOT_QUOTABLE')
    if (order.version !== input.expectedVersion) fail('ORDER_VERSION_CONFLICT')
    const prices = new Map(input.lines.map((line) => [line.orderItemId, line.unitPrice]))
    if (prices.size !== order.items.length || order.items.some((item) => !prices.has(item.id))) fail('QUOTATION_MUST_PRICE_ALL_ITEMS')
    for (const price of prices.values()) if (!Number.isFinite(price) || price < 0) fail('INVALID_QUOTATION_PRICE')
    const lines = order.items.map((item, index) => ({
      orderItemId: item.id, name: item.nameSnapshot || `Item #${item.productId}`, quantity: item.quantity,
      unitPrice: money(prices.get(item.id)!), total: money(prices.get(item.id)! * item.quantity), sortOrder: index,
    }))
    const subtotal = money(lines.reduce((sum, line) => sum + line.total, 0))
    const total = money(Math.max(0, subtotal + order.appTax + order.deliveryTax - order.discount))
    const financials = calculatePartnerFee(subtotal, order.partner)
    await tx.orderQuotation.updateMany({ where: { orderId: order.id, status: { in: ['DRAFT', 'SENT'] } }, data: { status: 'EXPIRED' } })
    const quotation = await tx.orderQuotation.create({
      data: { orderId: order.id, status: 'SENT', subtotal, discount: order.discount, total, validUntil: input.validUntil ?? null, note: input.note?.trim() || null, lines: { create: lines } },
      include: { lines: { orderBy: { sortOrder: 'asc' } } },
    })
    for (const line of lines) await tx.orderItem.update({ where: { id: line.orderItemId }, data: { price: line.unitPrice } })
    const updated = await tx.order.updateMany({ where: { id: order.id, version: input.expectedVersion, status: 'REQUESTED' }, data: {
      status: 'AWAITING_CLIENT_APPROVAL', version: { increment: 1 }, ...financials,
      partnerFeeType: financials.partnerFeeType as PartnerFeeType,
    } })
    if (updated.count !== 1) fail('ORDER_VERSION_CONFLICT')
    await tx.orderStatusHistory.create({ data: { orderId: order.id, from: 'REQUESTED', to: 'AWAITING_CLIENT_APPROVAL', actorId: partnerId, reason: 'Partner submitted a price quotation', metadata: { quotationId: quotation.id } } })
    await createOrderOutboxEvent(tx, order.id, 'AWAITING_CLIENT_APPROVAL', { clientId: order.clientId, partnerId, actorId: partnerId, quotationId: quotation.id })
    return quotation
  }, { isolationLevel: 'Serializable' })
}

export async function respondToOrderQuotation(prisma: PrismaClient, clientId: number, input: {
  quotationId: string; accepted: boolean; expectedOrderVersion: number; expectedQuoteVersion: number
}) {
  return prisma.$transaction(async (tx) => {
    const quote = await tx.orderQuotation.findUnique({ where: { id: input.quotationId }, include: { order: true } })
    if (!quote || quote.order.clientId !== clientId) throw new GraphQLError('QUOTATION_NOT_FOUND')
    if (quote.status !== 'SENT' || quote.version !== input.expectedQuoteVersion) fail('QUOTATION_VERSION_CONFLICT')
    if (quote.validUntil && quote.validUntil <= new Date()) fail('QUOTATION_EXPIRED')
    if (quote.order.status !== 'AWAITING_CLIENT_APPROVAL' || quote.order.version !== input.expectedOrderVersion) fail('ORDER_VERSION_CONFLICT')
    const target = input.accepted ? 'CONFIRMED' : 'CANCELLED'
    if ((await tx.orderQuotation.updateMany({ where: { id: quote.id, status: 'SENT', version: input.expectedQuoteVersion }, data: { status: input.accepted ? 'ACCEPTED' : 'REJECTED', version: { increment: 1 } } })).count !== 1) fail('QUOTATION_VERSION_CONFLICT')
    if ((await tx.order.updateMany({ where: { id: quote.orderId, status: 'AWAITING_CLIENT_APPROVAL', version: input.expectedOrderVersion }, data: { status: target, version: { increment: 1 }, ...(input.accepted ? {} : { cancelledAt: new Date() }) } })).count !== 1) fail('ORDER_VERSION_CONFLICT')
    await tx.orderStatusHistory.create({ data: { orderId: quote.orderId, from: 'AWAITING_CLIENT_APPROVAL', to: target, actorId: clientId, reason: input.accepted ? 'Client accepted quotation' : 'Client rejected quotation', metadata: { quotationId: quote.id } } })
    await createOrderOutboxEvent(tx, quote.orderId, target, { clientId, partnerId: quote.order.partnerId, actorId: clientId, quotationId: quote.id })
    return tx.order.findUniqueOrThrow({ where: { id: quote.orderId } })
  }, { isolationLevel: 'Serializable' })
}
