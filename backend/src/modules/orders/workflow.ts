import { OrderStatus, Prisma, PrismaClient, Role } from '@prisma/client'
import { GraphQLError } from 'graphql'
import { DeliveryStatus } from '../../types'

type Database = PrismaClient | Prisma.TransactionClient

export const allowedOrderTransitions: Record<OrderStatus, readonly OrderStatus[]> = {
  REQUESTED: ['PARTNER_ACCEPTED', 'PARTNER_REJECTED', 'AWAITING_CLIENT_APPROVAL', 'CANCELLED'],
  PARTNER_ACCEPTED: ['CONFIRMED', 'PREPARING', 'CANCELLED'],
  PARTNER_REJECTED: [],
  AWAITING_CLIENT_APPROVAL: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['FULFILLMENT_STARTED', 'COMPLETED', 'CANCELLED'],
  FULFILLMENT_STARTED: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
}

const partnerTargets = new Set<OrderStatus>([
  'PARTNER_ACCEPTED', 'PARTNER_REJECTED', 'AWAITING_CLIENT_APPROVAL', 'CONFIRMED',
  'PREPARING', 'READY', 'CANCELLED', 'COMPLETED',
])
const clientTargets = new Set<OrderStatus>(['CONFIRMED', 'CANCELLED'])
const driverTargets = new Set<OrderStatus>(['FULFILLMENT_STARTED', 'COMPLETED'])

function assertActor(role: Role, target: OrderStatus) {
  if (role === 'ADMIN') return
  if (role === 'PARTNER' && partnerTargets.has(target)) return
  if (role === 'CLIENT' && clientTargets.has(target)) return
  if (role === 'DRIVER' && driverTargets.has(target)) return
  throw new GraphQLError('ORDER_TRANSITION_FORBIDDEN')
}

function timestampData(target: OrderStatus) {
  if (target === 'PARTNER_ACCEPTED') return { acceptedAt: new Date() }
  if (target === 'READY') return { readyAt: new Date() }
  if (target === 'COMPLETED') return { completedAt: new Date() }
  if (target === 'CANCELLED' || target === 'PARTNER_REJECTED') return { cancelledAt: new Date() }
  return {}
}

function deliveryStatusFor(target: OrderStatus): number | undefined {
  if (target === 'PARTNER_ACCEPTED' || target === 'CONFIRMED' || target === 'PREPARING') return DeliveryStatus.ACCEPTED
  if (target === 'READY') return DeliveryStatus.READY
  if (target === 'FULFILLMENT_STARTED') return DeliveryStatus.PICKED
  if (target === 'COMPLETED') return DeliveryStatus.DELIVERED
  if (target === 'CANCELLED' || target === 'PARTNER_REJECTED') return DeliveryStatus.CANCELED
  return undefined
}

export async function transitionOrderStatus(
  prisma: PrismaClient,
  input: { orderId: number; actorId: number; target: OrderStatus; expectedVersion: number; reason?: string | null },
) {
  if (!Number.isSafeInteger(input.expectedVersion) || input.expectedVersion < 1) {
    throw new GraphQLError('INVALID_EXPECTED_VERSION')
  }
  const actor = await prisma.user.findUnique({ where: { id: input.actorId }, select: { role: true } })
  if (!actor) throw new GraphQLError('ACTOR_NOT_FOUND')
  assertActor(actor.role, input.target)

  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: input.orderId }, include: { delivery: true } })
    if (!order) throw new GraphQLError('ORDER_NOT_FOUND')
    if (order.version !== input.expectedVersion) throw new GraphQLError('ORDER_VERSION_CONFLICT')
    if (actor.role === 'PARTNER' && order.partnerId !== input.actorId) throw new GraphQLError('ORDER_TRANSITION_FORBIDDEN')
    if (actor.role === 'CLIENT' && order.clientId !== input.actorId) throw new GraphQLError('ORDER_TRANSITION_FORBIDDEN')
    if (actor.role === 'DRIVER' && order.delivery?.driverId !== input.actorId) throw new GraphQLError('ORDER_TRANSITION_FORBIDDEN')
    if (!allowedOrderTransitions[order.status].includes(input.target)) {
      throw new GraphQLError(`INVALID_ORDER_TRANSITION:${order.status}:${input.target}`)
    }
    if ((input.target === 'CANCELLED' || input.target === 'PARTNER_REJECTED') && !input.reason?.trim()) {
      throw new GraphQLError('ORDER_TRANSITION_REASON_REQUIRED')
    }

    const updated = await tx.order.updateMany({
      where: { id: order.id, version: input.expectedVersion },
      data: { status: input.target, version: { increment: 1 }, ...timestampData(input.target) },
    })
    if (updated.count !== 1) throw new GraphQLError('ORDER_VERSION_CONFLICT')

    const deliveryStatus = deliveryStatusFor(input.target)
    if (deliveryStatus !== undefined && order.delivery) {
      await tx.delivery.update({ where: { id: order.delivery.id }, data: { status: deliveryStatus } })
    }
    await tx.orderStatusHistory.create({
      data: { orderId: order.id, from: order.status, to: input.target, actorId: input.actorId, reason: input.reason?.trim() || null },
    })
    await createOrderOutboxEvent(tx, order.id, input.target, {
      clientId: order.clientId,
      partnerId: order.partnerId,
      actorId: input.actorId,
    })
    return tx.order.findUniqueOrThrow({ where: { id: order.id }, include: { statusHistory: { orderBy: { createdAt: 'asc' } } } })
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
}

export async function createOrderOutboxEvent(
  tx: Database,
  orderId: number,
  status: OrderStatus,
  payload: Record<string, unknown>,
) {
  return tx.outboxEvent.upsert({
    where: { idempotencyKey: `order:${orderId}:status:${status}` },
    create: {
      topic: 'order.status.changed', aggregateType: 'Order', aggregateId: String(orderId),
      idempotencyKey: `order:${orderId}:status:${status}`, payload: { orderId, status, ...payload },
    },
    update: {},
  })
}

export async function syncLegacyDeliveryTransition(
  prisma: PrismaClient,
  input: { orderId: number; actorId: number; deliveryStatus: number; reason?: string },
) {
  const target = input.deliveryStatus === DeliveryStatus.ACCEPTED ? 'PARTNER_ACCEPTED'
    : input.deliveryStatus === DeliveryStatus.READY ? 'READY'
      : input.deliveryStatus === DeliveryStatus.ASSIGNED || input.deliveryStatus === DeliveryStatus.PICKED ? 'FULFILLMENT_STARTED'
        : input.deliveryStatus === DeliveryStatus.DELIVERED ? 'COMPLETED'
          : input.deliveryStatus === DeliveryStatus.CANCELED ? 'CANCELLED'
            : null
  if (!target) return null
  let order = await prisma.order.findUnique({ where: { id: input.orderId }, select: { status: true, version: true } })
  if (!order || order.status === target) return order
  if (target === 'READY' && ['PARTNER_ACCEPTED', 'CONFIRMED'].includes(order.status)) {
    await transitionOrderStatus(prisma, { orderId: input.orderId, actorId: input.actorId, target: 'PREPARING', expectedVersion: order.version })
    order = await prisma.order.findUnique({ where: { id: input.orderId }, select: { status: true, version: true } })
    if (!order) return null
  }
  if (!allowedOrderTransitions[order.status].includes(target)) return order
  return transitionOrderStatus(prisma, {
    orderId: input.orderId, actorId: input.actorId, target, expectedVersion: order.version,
    reason: input.reason ?? (target === 'CANCELLED' ? 'Cancelled through legacy fulfillment flow' : undefined),
  })
}
