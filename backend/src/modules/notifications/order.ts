import { OrderStatus, Prisma, PrismaClient } from '@prisma/client'

type Database = PrismaClient | Prisma.TransactionClient

type NotificationCopy = {
  title: string
  body: string
  titleAr: string
  bodyAr: string
  action: 'VIEW_ORDER' | 'REVIEW_QUOTE'
  priority: 'NORMAL' | 'HIGH'
}

function orderCopy(status: OrderStatus, orderId: number): NotificationCopy {
  const number = `#${orderId}`
  const copy: Record<OrderStatus, NotificationCopy> = {
    REQUESTED: {
      title: `New order ${number}`,
      body: 'A customer placed a new order.',
      titleAr: `طلب جديد ${number}`,
      bodyAr: 'تم استلام طلب جديد من زبون.',
      action: 'VIEW_ORDER', priority: 'HIGH',
    },
    PARTNER_ACCEPTED: {
      title: `Order ${number} accepted`,
      body: 'The store accepted your order.',
      titleAr: `تم قبول الطلب ${number}`,
      bodyAr: 'وافق المتجر على طلبك.',
      action: 'VIEW_ORDER', priority: 'NORMAL',
    },
    PARTNER_REJECTED: {
      title: `Order ${number} unavailable`,
      body: 'The store could not accept your order. Open it for details.',
      titleAr: `الطلب ${number} غير متاح`,
      bodyAr: 'تعذر على المتجر قبول طلبك. افتح الطلب للاطلاع على التفاصيل.',
      action: 'VIEW_ORDER', priority: 'HIGH',
    },
    AWAITING_CLIENT_APPROVAL: {
      title: `Review the price for order ${number}`,
      body: 'The store sent a quotation that needs your approval.',
      titleAr: `راجع سعر الطلب ${number}`,
      bodyAr: 'أرسل المتجر عرض سعر يحتاج إلى موافقتك.',
      action: 'REVIEW_QUOTE', priority: 'HIGH',
    },
    CONFIRMED: {
      title: `Order ${number} confirmed`,
      body: 'The order is confirmed and can move to preparation.',
      titleAr: `تم تأكيد الطلب ${number}`,
      bodyAr: 'تم تأكيد الطلب ويمكن البدء في تحضيره.',
      action: 'VIEW_ORDER', priority: 'NORMAL',
    },
    PREPARING: {
      title: `Order ${number} is being prepared`,
      body: 'The store is preparing your items.',
      titleAr: `جاري تحضير الطلب ${number}`,
      bodyAr: 'يقوم المتجر بتحضير منتجاتك.',
      action: 'VIEW_ORDER', priority: 'NORMAL',
    },
    READY: {
      title: `Order ${number} is ready`,
      body: 'Your order is ready for pickup or delivery.',
      titleAr: `الطلب ${number} جاهز`,
      bodyAr: 'طلبك جاهز للاستلام أو التوصيل.',
      action: 'VIEW_ORDER', priority: 'HIGH',
    },
    FULFILLMENT_STARTED: {
      title: `Order ${number} is on the way`,
      body: 'Your order has left the store.',
      titleAr: `الطلب ${number} في الطريق`,
      bodyAr: 'غادر طلبك المتجر وهو في طريقه إليك.',
      action: 'VIEW_ORDER', priority: 'HIGH',
    },
    COMPLETED: {
      title: `Order ${number} delivered`,
      body: 'Your order has been completed.',
      titleAr: `تم تسليم الطلب ${number}`,
      bodyAr: 'اكتمل طلبك بنجاح.',
      action: 'VIEW_ORDER', priority: 'NORMAL',
    },
    CANCELLED: {
      title: `Order ${number} cancelled`,
      body: 'The order was cancelled. Open it for details.',
      titleAr: `تم إلغاء الطلب ${number}`,
      bodyAr: 'تم إلغاء الطلب. افتحه للاطلاع على التفاصيل.',
      action: 'VIEW_ORDER', priority: 'HIGH',
    },
  }
  return copy[status]
}

export async function createOrderInboxNotifications(
  tx: Database,
  input: { orderId: number; status: OrderStatus; clientId: number; partnerId: number; actorId?: number },
) {
  const candidateIds = input.status === 'REQUESTED'
    ? [input.partnerId]
    : [input.clientId, input.partnerId]
  const recipientIds = [...new Set(candidateIds)].filter((id) => id !== input.actorId)
  const copy = orderCopy(input.status, input.orderId)

  await Promise.all(recipientIds.map((userId) => tx.log.upsert({
    where: { userId_eventKey: { userId, eventKey: `order:${input.orderId}:status:${input.status}:user:${userId}` } },
    create: {
      userId,
      eventKey: `order:${input.orderId}:status:${input.status}:user:${userId}`,
      entityType: 'ORDER',
      entityId: String(input.orderId),
      action: copy.action,
      priority: copy.priority,
      type: 0,
      title: copy.title,
      body: copy.body,
      title_ar: copy.titleAr,
      body_ar: copy.bodyAr,
      metadata: { status: input.status },
    },
    update: {},
  })))
}

export function getOrderPushCopy(status: OrderStatus, orderId: number, language: string) {
  const copy = orderCopy(status, orderId)
  return language.toLowerCase().startsWith('ar')
    ? { title: copy.titleAr, body: copy.bodyAr }
    : { title: copy.title, body: copy.body }
}
