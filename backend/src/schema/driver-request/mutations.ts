import { arg, extendType, nonNull, stringArg } from 'nexus'
import { GraphQLError } from 'graphql'
import { Context } from '../../context'
import { DeliveryStatus, DeliveryType, DispatchStatus, LogSatus, PricingName } from '../../types'
import { getUserId } from '../../utils'
import { ensurePartnerPosIdentity } from '../order/pos'
import { sendNotification } from '../../servers/firebase'

const requestInclude = {
  order: {
    include: {
      delivery: {
        include: {
          driver: {
            include: { user: { include: { pushTokens: { orderBy: { createdAt: 'desc' }, take: 1 } } } },
          },
        },
      },
    },
  },
} as const

function required(value: string, code: string) {
  const normalized = value?.trim()
  if (!normalized) throw new GraphQLError(code)
  return normalized
}

function coordinate(value: number, min: number, max: number, code: string) {
  if (!Number.isFinite(value) || value < min || value > max) throw new GraphQLError(code)
  return value
}

export default extendType({
  type: 'Mutation',
  definition(t) {
    t.nonNull.field('createPartnerDriverRequest', {
      type: 'PartnerDriverRequest',
      args: { data: nonNull(arg({ type: 'PartnerDriverRequestInput' })) },
      resolve: async (_parent, { data }, ctx: Context) => {
        const partnerId = getUserId(ctx)
        const recipientName = required(data.recipientName, 'RECIPIENT_NAME_REQUIRED')
        const recipientPhone = required(data.recipientPhone, 'RECIPIENT_PHONE_REQUIRED')
        const packageDescription = required(data.packageDescription, 'PACKAGE_DESCRIPTION_REQUIRED')
        const destinationAddress = required(data.destinationAddress, 'DESTINATION_ADDRESS_REQUIRED')
        const destinationLatitude = coordinate(data.destinationLatitude, -90, 90, 'INVALID_DESTINATION_COORDINATES')
        const destinationLongitude = coordinate(data.destinationLongitude, -180, 180, 'INVALID_DESTINATION_COORDINATES')
        const cashToCollect = Number(data.cashToCollect ?? 0)
        if (!Number.isFinite(cashToCollect) || cashToCollect < 0) throw new GraphQLError('INVALID_CASH_AMOUNT')
        if (data.scheduledAt && new Date(data.scheduledAt).getTime() < Date.now() - 60_000) {
          throw new GraphQLError('SCHEDULE_MUST_BE_IN_THE_FUTURE')
        }

        const identity = await ensurePartnerPosIdentity(ctx.prisma, partnerId)
        const pickupLatitude = coordinate(identity.partner.latitude, -90, 90, 'STORE_LOCATION_REQUIRED')
        const pickupLongitude = coordinate(identity.partner.longitude, -180, 180, 'STORE_LOCATION_REQUIRED')
        if (pickupLatitude === 0 && pickupLongitude === 0) throw new GraphQLError('STORE_LOCATION_REQUIRED')
        const pickupAddress = required(identity.partner.address ?? '', 'STORE_ADDRESS_REQUIRED')
        const pricing = await ctx.prisma.pricing.findUnique({ where: { name: PricingName.NORMAL_DELIVERY_TAX } })
        const deliveryPrice = Number(pricing?.price ?? 0)
        const requestNumber = `DRV-${partnerId}-${Date.now().toString(36).toUpperCase()}`

        const request = await ctx.prisma.$transaction(async (tx) => {
          const address = await tx.address.create({
            data: {
              userId: identity.user.id,
              label: recipientName,
              address: destinationAddress,
              latitude: destinationLatitude,
              longitude: destinationLongitude,
            },
          })
          const order = await tx.order.create({
            data: {
              partnerId,
              clientId: identity.user.id,
              addressId: address.id,
              source: 'DRIVER_REQUEST',
              walkInCustomerName: recipientName,
              note: data.note?.trim() || null,
              deliveryTax: deliveryPrice,
              subtotal: 0,
              delivery: {
                create: {
                  type: DeliveryType.NORMAL,
                  status: DeliveryStatus.READY,
                  price: deliveryPrice,
                  addressId: address.id,
                  scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
                },
              },
            },
          })
          const created = await tx.partnerDriverRequest.create({
            data: {
              requestNumber,
              partnerId,
              orderId: order.id,
              recipientName,
              recipientPhone,
              packageDescription,
              pickupAddress,
              pickupLatitude,
              pickupLongitude,
              destinationAddress,
              destinationLatitude,
              destinationLongitude,
              cashToCollect,
              note: data.note?.trim() || null,
            },
            include: requestInclude,
          })
          await tx.auditLog.create({
            data: {
              actorId: partnerId,
              partnerId,
              action: 'CREATE_DRIVER_REQUEST',
              entity: 'PartnerDriverRequest',
              entityId: created.id,
              after: { requestNumber, orderId: order.id, destinationAddress, cashToCollect },
            },
          })
          await tx.log.create({
            data: {
              title: `Driver request ${requestNumber} created`,
              body: `A driver was requested for ${recipientName}.`,
              title_ar: `تم إنشاء طلب السائق ${requestNumber}`,
              body_ar: `تم طلب سائق للتوصيل إلى ${recipientName}.`,
              type: LogSatus.ORDER_UPDATE,
              userId: partnerId,
            },
          })
          return created
        })

        const scheduledAt = data.scheduledAt ? new Date(data.scheduledAt).getTime() : 0
        const delay = Math.max(0, scheduledAt - Date.now())
        await ctx.dispatchQueue.add(
          'dispatch-order',
          { orderId: request.orderId, attempt: 1 },
          { delay, jobId: `dispatch:${request.orderId}:partner-request` },
        )
        return request
      },
    })

    t.nonNull.field('cancelPartnerDriverRequest', {
      type: 'PartnerDriverRequest',
      args: { id: nonNull(stringArg()) },
      resolve: async (_parent, { id }, ctx: Context) => {
        const partnerId = getUserId(ctx)
        const existing = await ctx.prisma.partnerDriverRequest.findFirst({
          where: { id, partnerId },
          include: requestInclude,
        })
        if (!existing) throw new GraphQLError('DRIVER_REQUEST_NOT_FOUND')
        const delivery = existing.order.delivery
        if (!delivery || ![DeliveryStatus.READY, DeliveryStatus.ASSIGNED].includes(delivery.status)) {
          throw new GraphQLError('DRIVER_REQUEST_CANNOT_BE_CANCELED')
        }

        const previousDriverId = delivery.driverId
        const canceled = await ctx.prisma.$transaction(async (tx) => {
          await tx.orderDispatch.updateMany({
            where: { deliveryId: delivery.id, status: { in: [DispatchStatus.SENT, DispatchStatus.ACCEPTED] } },
            data: { status: DispatchStatus.EXPIRED },
          })
          await tx.delivery.update({
            where: { id: delivery.id },
            data: { status: DeliveryStatus.CANCELED, driverId: null },
          })
          if (previousDriverId) {
            const active = await tx.delivery.count({
              where: { driverId: previousDriverId, id: { not: delivery.id }, status: { in: [DeliveryStatus.ASSIGNED, DeliveryStatus.PICKED] } },
            })
            if (active === 0) await tx.driver.update({ where: { userId: previousDriverId }, data: { isAvailable: true } })
          }
          await tx.auditLog.create({
            data: { actorId: partnerId, partnerId, action: 'CANCEL_DRIVER_REQUEST', entity: 'PartnerDriverRequest', entityId: id },
          })
          return tx.partnerDriverRequest.findUniqueOrThrow({ where: { id }, include: requestInclude })
        })

        if (delivery.driver?.user?.pushTokens?.[0]?.token) {
          await sendNotification({
            tokens: delivery.driver.user.pushTokens[0].token,
            title: 'Delivery canceled',
            body: `Request ${existing.requestNumber} was canceled by the store.`,
            data: { event: 'ORDER_CANCELED', orderId: String(existing.orderId) },
          })
        }
        return canceled
      },
    })
  },
})
