import { Job, Worker } from 'bullmq'
import { OrderStatus } from '@prisma/client'
import { dispatchQueue, prisma, redis, workflowQueue } from '../servers'
import { getExpoPushReceipts, sendNotification } from '../servers/firebase'
import { DeliveryStatus, DeliveryType } from '../types'
import { getOrderPushCopy } from '../modules/notifications/order'

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
      const actorId = Number(payload.actorId)
      const deliveredUserIds = new Set(
        Array.isArray(payload.deliveredUserIds)
          ? payload.deliveredUserIds.map(Number).filter(Number.isSafeInteger)
          : [],
      )
      const isGiftPreparation = event.topic === 'gift.preparation.due'
      const isGiftQuote = event.topic === 'gift.quote.ready'
      const recipientIds = (isGiftPreparation ? [partnerId] : isGiftQuote ? [clientId] : status === 'REQUESTED' ? [partnerId] : [clientId, partnerId])
        .filter((id) => !Number.isSafeInteger(actorId) || id !== actorId)
        .filter((id) => !deliveredUserIds.has(id))
      const userIds = [...new Set(recipientIds.filter(Number.isSafeInteger))]
      const recipients = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          client: { select: { language: true } },
          partner: { select: { language: true } },
          pushTokens: { where: { isActive: true }, select: { token: true } },
        },
      })
      const deliveryResults = await Promise.all(recipients.map(async (recipient) => {
        const language = recipient.client?.language ?? recipient.partner?.language ?? 'en'
        const copy = isGiftPreparation
          ? language.toLowerCase().startsWith('ar')
            ? { title: 'حان وقت تحضير الهدية', body: `يجب بدء تحضير ${String(payload.orderNumber ?? 'الهدية المجدولة')} الآن.` }
            : { title: 'Gift preparation is due', body: `${String(payload.orderNumber ?? 'A scheduled gift')} should enter preparation now.` }
          : isGiftQuote
            ? language.toLowerCase().startsWith('ar')
              ? { title: 'عرض سعر هديتك جاهز', body: `راجع عرض السعر ${String(payload.quoteNumber ?? '')} وأكده للمتابعة.` }
              : { title: 'Your gift quote is ready', body: `Review quote ${String(payload.quoteNumber ?? '')} and confirm it to continue.` }
          : getOrderPushCopy(status as OrderStatus, Number(payload.orderId ?? event.aggregateId), language)
        const result = await sendNotification({
          tokens: recipient.pushTokens.map((entry) => entry.token), title: copy.title, body: copy.body,
          data: isGiftPreparation
            ? { event: 'GIFT_PREPARATION_DUE', customOrderId: String(payload.customOrderId ?? event.aggregateId), status }
            : isGiftQuote
              ? { event: 'GIFT_QUOTE_READY', customOrderId: String(payload.customOrderId ?? event.aggregateId), quoteId: String(payload.quoteId ?? ''), status }
            : { event: 'ORDER_STATUS_CHANGED', orderId: String(payload.orderId ?? event.aggregateId), status },
        })
        return { userId: recipient.id, result }
      }))
      const permanentFailureTokens = deliveryResults.flatMap(({ result }) => result.permanentFailureTokens)
      const transientFailureTokens = deliveryResults.flatMap(({ result }) => result.transientFailureTokens)
      const expoReceipts = deliveryResults.flatMap(({ userId, result }) => result.expoTickets.map((ticket) => ({
        ticketId: ticket.id,
        token: ticket.token,
        userId,
        outboxEventId: event.id,
        availableAt: new Date(Date.now() + 15 * 60_000),
      })))
      if (expoReceipts.length) {
        await prisma.pushReceipt.createMany({ data: expoReceipts, skipDuplicates: true })
      }
      deliveryResults.forEach(({ userId, result }) => {
        if (result.transientFailureTokens.length === 0) deliveredUserIds.add(userId)
      })
      if (permanentFailureTokens.length) {
        await prisma.pushToken.updateMany({
          where: { token: { in: permanentFailureTokens } },
          data: { isActive: false },
        })
      }
      if (transientFailureTokens.length) {
        await prisma.outboxEvent.update({
          where: { id: event.id },
          data: { payload: { ...payload, deliveredUserIds: [...deliveredUserIds] } },
        })
        throw new Error('PUSH_DELIVERY_TEMPORARILY_FAILED')
      }
      if (!isGiftPreparation && !isGiftQuote && status === 'READY') {
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

async function processPushReceipts() {
  const receipts = await prisma.pushReceipt.findMany({
    where: {
      status: { in: ['PENDING', 'FAILED'] },
      attempts: { lt: 10 },
      availableAt: { lte: new Date() },
    },
    orderBy: { createdAt: 'asc' },
    take: 1000,
  })
  if (!receipts.length) return

  try {
    const results = await getExpoPushReceipts(receipts.map((receipt) => receipt.ticketId))
    const byTicketId = new Map(receipts.map((receipt) => [receipt.ticketId, receipt]))
    for (const result of results) {
      const receipt = byTicketId.get(result.ticketId)
      if (!receipt) continue
      if (result.status === 'DELIVERED') {
        await prisma.pushReceipt.update({
          where: { id: receipt.id },
          data: { status: 'DELIVERED', deliveredAt: new Date(), lastError: null },
        })
        continue
      }
      if (result.status === 'PERMANENT_FAILURE') {
        await prisma.$transaction([
          prisma.pushReceipt.update({
            where: { id: receipt.id },
            data: { status: 'FAILED', attempts: 10, lastError: result.error ?? 'PERMANENT_PUSH_FAILURE' },
          }),
          ...(result.error === 'DeviceNotRegistered'
            ? [prisma.pushToken.updateMany({ where: { token: receipt.token }, data: { isActive: false } })]
            : []),
        ])
        continue
      }
      const attempts = receipt.attempts + 1
      const exhausted = attempts >= 10
      await prisma.pushReceipt.update({
        where: { id: receipt.id },
        data: {
          status: exhausted || result.status === 'TRANSIENT_FAILURE' ? 'FAILED' : 'PENDING',
          attempts: { increment: 1 },
          lastError: result.error ?? (exhausted ? 'EXPO_RECEIPT_NOT_AVAILABLE' : null),
          availableAt: new Date(Date.now() + Math.min(60 * 60_000, 2 ** attempts * 60_000)),
        },
      })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 1000) : String(error).slice(0, 1000)
    await Promise.all(receipts.map((receipt) => prisma.pushReceipt.update({
      where: { id: receipt.id },
      data: {
        status: 'FAILED',
        attempts: { increment: 1 },
        lastError: message,
        availableAt: new Date(Date.now() + Math.min(60 * 60_000, 2 ** (receipt.attempts + 1) * 60_000)),
      },
    })))
  }
}

async function processNotificationCleanup() {
  const now = Date.now()
  const [exhaustedReceipts] = await Promise.all([
    prisma.pushReceipt.count({ where: { status: 'FAILED', attempts: { gte: 10 } } }),
    prisma.pushReceipt.deleteMany({
      where: {
        OR: [
          { status: 'DELIVERED', updatedAt: { lt: new Date(now - 30 * 24 * 60 * 60_000) } },
          { status: 'FAILED', attempts: { gte: 10 }, updatedAt: { lt: new Date(now - 90 * 24 * 60 * 60_000) } },
        ],
      },
    }),
    prisma.pushToken.deleteMany({ where: { isActive: false, updatedAt: { lt: new Date(now - 180 * 24 * 60 * 60_000) } } }),
    prisma.log.deleteMany({ where: { read: true, createdAt: { lt: new Date(now - 365 * 24 * 60 * 60_000) } } }),
    prisma.outboxEvent.deleteMany({ where: { status: 'DELIVERED', processedAt: { lt: new Date(now - 30 * 24 * 60 * 60_000) } } }),
  ])
  if (exhaustedReceipts > 0) {
    console.error(`[notification-health] ${exhaustedReceipts} push receipt(s) exhausted all retries`)
  }
}

const workflowWorker = new Worker('workflow-queue', async (job: Job) => {
  if (job.name === 'gift-scheduler') return processGiftSchedule()
  if (job.name === 'outbox-pump') return processOutbox()
  if (job.name === 'push-receipts') return processPushReceipts()
  if (job.name === 'notification-cleanup') return processNotificationCleanup()
}, { connection: redis })

workflowWorker.on('error', (error) => console.error('[workflow-worker]', error))

void workflowQueue.upsertJobScheduler('gift-scheduler', { every: 60_000 }, { name: 'gift-scheduler' })
  .catch((error) => console.error('[gift-scheduler]', error))
void workflowQueue.upsertJobScheduler('outbox-pump', { every: 15_000 }, { name: 'outbox-pump' })
  .catch((error) => console.error('[outbox-pump]', error))
void workflowQueue.upsertJobScheduler('push-receipts', { every: 2 * 60_000 }, { name: 'push-receipts' })
  .catch((error) => console.error('[push-receipts]', error))
void workflowQueue.upsertJobScheduler('notification-cleanup', { every: 24 * 60 * 60_000 }, { name: 'notification-cleanup' })
  .catch((error) => console.error('[notification-cleanup]', error))
