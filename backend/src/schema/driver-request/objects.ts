import { inputObjectType, objectType } from 'nexus'

const PartnerDriverRequestInput = inputObjectType({
  name: 'PartnerDriverRequestInput',
  definition(t) {
    t.nonNull.string('recipientName')
    t.nonNull.string('recipientPhone')
    t.nonNull.string('packageDescription')
    t.nonNull.string('destinationAddress')
    t.nonNull.float('destinationLatitude')
    t.nonNull.float('destinationLongitude')
    t.float('cashToCollect')
    t.string('note')
    t.field('scheduledAt', { type: 'DateTime' })
  },
})

const PartnerDriverRequest = objectType({
  name: 'PartnerDriverRequest',
  definition(t) {
    t.nonNull.string('id')
    t.nonNull.string('requestNumber')
    t.nonNull.int('partnerId')
    t.nonNull.int('orderId')
    t.nonNull.string('recipientName')
    t.nonNull.string('recipientPhone')
    t.nonNull.string('packageDescription')
    t.nonNull.string('pickupAddress')
    t.nonNull.float('pickupLatitude')
    t.nonNull.float('pickupLongitude')
    t.nonNull.string('destinationAddress')
    t.nonNull.float('destinationLatitude')
    t.nonNull.float('destinationLongitude')
    t.nonNull.float('cashToCollect')
    t.string('note')
    t.nonNull.field('createdAt', { type: 'DateTime' })
    t.nonNull.field('updatedAt', { type: 'DateTime' })
    t.nonNull.field('delivery', {
      type: 'Delivery',
      resolve: (parent, _args, ctx) =>
        parent.order?.delivery ?? ctx.prisma.delivery.findUniqueOrThrow({ where: { orderId: parent.orderId } }),
    })
    t.string('driverName', {
      resolve: async (parent, _args, ctx) => {
        const delivery = parent.order?.delivery ?? await ctx.prisma.delivery.findUnique({
          where: { orderId: parent.orderId },
          include: { driver: true },
        })
        return delivery?.driver ? `${delivery.driver.firstname} ${delivery.driver.lastname}`.trim() : null
      },
    })
    t.string('driverPhone', {
      resolve: async (parent, _args, ctx) => {
        const delivery = parent.order?.delivery ?? await ctx.prisma.delivery.findUnique({
          where: { orderId: parent.orderId },
          include: { driver: { include: { user: true } } },
        })
        return delivery?.driver?.user?.phone ?? null
      },
    })
  },
})

export default { PartnerDriverRequestInput, PartnerDriverRequest }
