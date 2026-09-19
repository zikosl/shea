import { Job, Worker } from 'bullmq'
import { dispatchQueue, prisma, redis, workflowQueue } from '../servers'
import { sendNotification } from '../servers/firebase'
import { DeliveryStatus, DeliveryType } from '../types'

const statusCopy: Record<string, { title: string; body: string }> = {
  REQUESTED: { title: 'New order', body: 'A new order is waiting for review.' },
  PARTNER_ACCEPTED: { title: 'Order accepted', body: 'The store accepted your order.' },
  AWAITING_CLIENT_APPROVAL: { title: 'Approval needed', body: 'A store offer is ready for your review.' },
  CONFIRMED: { title: 'Order confirmed', body: 'Your order has been confirmed.' },
  PREPARING: { title: 'Order in preparation', body: 'The store is preparing your order.' },
  READY: { title: 'Order ready', body: 'Your order is ready for fulfillment.' },
  FULFILLMENT_STARTED: { title: 'Order on the way', body: 'Fulfillment of your order has started.' },
  COMPLETED: { title: 'Order completed', body: 'Your order has been completed.' },
  CANCELLED: { title: 'Order cancelled', body: 'Your order was cancelled.' },
  PARTNER_REJECTED: { title: 'Order unavailable', body: 'The store could not accept your order.' },
}

async function processGiftSchedule() {
  const due = await prisma.customOrder.findMany({
    where: { status: 'SCHEDULED', preparationStartsAt: { lte: new Date() } },
    select: { id: true, orderNumber: true, partnerId: true, version: true },
    take: 100,
  })
  for (const order of due) {
    await prisma.$transaction(async (tx) => {
      const updated = await tx.customOrder.updateMany({
        where: { id: order.id, status: 'SCHEDULED', version: order.version },
        data: { status: 'PREPARATION_DUE', version: { increment: 1 } },
      })
      if (!updated.count) return
      await tx.log.create({ data: {
        userId: order.partnerId, type: 0,
        title: `Gift ${order.orderNumber} is due`, body: 'Preparation should start now.',
        title_ar: `حان وقت تحضير الهدية ${order.orderNumber}`, body_ar: 'يجب بدء التحضير الآن.',
      } })
      await tx.outboxEvent.upsert({
        where: { idempotencyKey: `gift:${order.id}:status:PREPARATION_DUE` },
        create: {
          topic: 'gift.preparation.due', aggregateType: 'CustomOrder', aggregateId: order.id,
          idempotencyKey: `gift:${order.id}:status:PREPARATION_DUE`,
          payload: { customOrderId: order.id, orderNumber: order.orderNumber, partnerId: order.partnerId, status: 'PREPARATION_DUE' },
        },
        update: {},
      })
    })
  }
}

async function processOutbox() {
  const staleProcessingCutoff = new Date(Date.now() - 5 * 60_000)
  const events = await prisma.outboxEvent.findMany({
    where: {
      attempts: { lt: 10 },
      OR: [
        { status: { in: ['PENDING', 'FAILED'] }, availableAt: { lte: new Date() } },
        { status: 'PROCESSING', updatedAt: { lte: staleProcessingCutoff } },
      ],
    },
    orderBy: { createdAt: 'asc' },
    take: 50,
  })
  for (const event of events) {
    const claimed = await prisma.outboxEvent.updateMany({
      where: { id: event.id, status: event.status, updatedAt: event.updatedAt },
      data: { status: 'PROCESSING', attempts: { increment: 1 } },
    })
    if (!claimed.count) continue
    try {
      const payload = event.payload as Record<string, unknown>
      const status = String(payload.status ?? '')
      const clientId = Number(payload.clientId)
      const partnerId = Number(payload.partnerId)
      const isGiftPreparation = event.topic === 'gift.preparation.due'
      const recipientIds = isGiftPreparation ? [partnerId] : status === 'REQUESTED' ? [partnerId] : [clientId, partnerId]
      const userIds = [...new Set(recipientIds.filter(Number.isSafeInteger))]
      const tokens = await prisma.pushToken.findMany({ where: { userId: { in: userIds }, isActive: true }, select: { token: true } })
      const copy = isGiftPreparation
        ? { title: 'Gift preparation is due', body: `${String(payload.orderNumber ?? 'A scheduled gift')} should enter preparation now.` }
        : statusCopy[status] ?? { title: 'Order updated', body: 'Your order status has changed.' }
      const deliveryResult = await sendNotification({
        tokens: tokens.map((entry) => entry.token), title: copy.title, body: copy.body,
        data: isGiftPreparation
          ? { event: 'GIFT_PREPARATION_DUE', customOrderId: String(payload.customOrderId ?? event.aggregateId), status }
          : { event: 'ORDER_STATUS_CHANGED', orderId: String(payload.orderId ?? event.aggregateId), status },
        strict: true,
      })
      if (deliveryResult.permanentFailureTokens.length) {
        await prisma.pushToken.updateMany({
          where: { token: { in: deliveryResult.permanentFailureTokens } },
          data: { isActive: false },
        })
      }
      if (deliveryResult.transientFailureTokens.length) throw new Error('PUSH_DELIVERY_TEMPORARILY_FAILED')
      if (!isGiftPreparation && status === 'READY') {
        const orderId = Number(payload.orderId ?? event.aggregateId)
        const delivery = Number.isSafeInteger(orderId)
          ? await prisma.delivery.findUnique({ where: { orderId }, select: { type: true, status: true } })
          : null
        if (delivery?.type === DeliveryType.NORMAL && delivery.status === DeliveryStatus.READY) {
          await dispatchQueue.add('dispatch-order', { orderId, attempt: 1 }, { jobId: `dispatch:${orderId}:1` })
        }
      }
      await prisma.outboxEvent.update({ where: { id: event.id }, data: { status: 'DELIVERED', processedAt: new Date(), lastError: null } })
    } catch (error) {
      const attempts = event.attempts + 1
      await prisma.outboxEvent.update({ where: { id: event.id }, data: {
        status: 'FAILED', lastError: error instanceof Error ? error.message.slice(0, 1000) : String(error).slice(0, 1000),
        availableAt: new Date(Date.now() + Math.min(60 * 60_000, 2 ** attempts * 1_000)),
      } })
    }
  }
}

const workflowWorker = new Worker('workflow-queue', async (job: Job) => {
  if (job.name === 'gift-scheduler') return processGiftSchedule()
  if (job.name === 'outbox-pump') return processOutbox()
}, { connection: redis })

workflowWorker.on('error', (error) => console.error('[workflow-worker]', error))

void workflowQueue.upsertJobScheduler('gift-scheduler', { every: 60_000 }, { name: 'gift-scheduler' })
  .catch((error) => console.error('[gift-scheduler]', error))
void workflowQueue.upsertJobScheduler('outbox-pump', { every: 15_000 }, { name: 'outbox-pump' })
  .catch((error) => console.error('[outbox-pump]', error))
