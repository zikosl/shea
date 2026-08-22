// @ts-nocheck
import { arg, booleanArg, extendType, intArg, nonNull, stringArg } from 'nexus'
import { GraphQLError } from 'graphql'
import { Context } from '../../context'
import { getUserId } from '../../utils'

async function assertPartner(ctx: Context, userId: number) {
  const partner = await ctx.prisma.partner.findUnique({ where: { userId } })
  if (!partner) throw new GraphQLError('PARTNER_REQUIRED')
  return partner
}

const Query = extendType({
  type: 'Query',
  definition(t) {
    t.nonNull.list.nonNull.field('listDevices', {
      type: 'Device',
      resolve: async (_parent, _args, ctx: Context) => {
        const partnerId = getUserId(ctx)
        await assertPartner(ctx, partnerId)
        return ctx.prisma.device.findMany({ where: { partnerId }, orderBy: { createdAt: 'desc' } })
      },
    })

    t.nonNull.list.nonNull.field('listSales', {
      type: 'Sale',
      args: {
        status: arg({ type: 'SaleStatus' }),
        page: intArg(),
        limit: intArg(),
      },
      resolve: async (_parent, { status, page = 1, limit = 25 }: any, ctx: Context) => {
        const partnerId = getUserId(ctx)
        await assertPartner(ctx, partnerId)
        return ctx.prisma.sale.findMany({
          where: { partnerId, status: status ?? undefined },
          take: limit,
          skip: limit * (page - 1),
          orderBy: { createdAt: 'desc' },
        })
      },
    })

    t.field('getSale', {
      type: 'Sale',
      args: {
        id: nonNull(stringArg()),
      },
      resolve: async (_parent, { id }, ctx: Context) => {
        const partnerId = getUserId(ctx)
        await assertPartner(ctx, partnerId)
        return ctx.prisma.sale.findFirst({ where: { id, partnerId } })
      },
    })

    t.nonNull.list.nonNull.field('listStockMovements', {
      type: 'StockMovement',
      args: {
        productId: intArg(),
        type: arg({ type: 'StockMovementType' }),
        page: intArg(),
        limit: intArg(),
      },
      resolve: async (_parent, { productId, type, page = 1, limit = 25 }: any, ctx: Context) => {
        const partnerId = getUserId(ctx)
        await assertPartner(ctx, partnerId)
        return ctx.prisma.stockMovement.findMany({
          where: {
            partnerId,
            productId: productId ?? undefined,
            type: type ?? undefined,
          },
          take: limit,
          skip: limit * (page - 1),
          orderBy: { createdAt: 'desc' },
        })
      },
    })

    t.nonNull.list.nonNull.field('listCashSessions', {
      type: 'CashSession',
      args: {
        isOpen: booleanArg(),
        deviceId: stringArg(),
      },
      resolve: async (_parent, { isOpen, deviceId }, ctx: Context) => {
        const partnerId = getUserId(ctx)
        await assertPartner(ctx, partnerId)
        return ctx.prisma.cashSession.findMany({
          where: {
            partnerId,
            deviceId: deviceId ?? undefined,
            status: isOpen === undefined || isOpen === null ? undefined : isOpen ? 'OPEN' : 'CLOSED',
          },
          orderBy: { openedAt: 'desc' },
        })
      },
    })

    t.nonNull.list.nonNull.field('listSyncEvents', {
      type: 'SyncEvent',
      args: {
        status: arg({ type: 'SyncEventStatus' }),
        deviceId: stringArg(),
        page: intArg(),
        limit: intArg(),
      },
      resolve: async (_parent, { status, deviceId, page = 1, limit = 25 }: any, ctx: Context) => {
        const partnerId = getUserId(ctx)
        await assertPartner(ctx, partnerId)
        return ctx.prisma.syncEvent.findMany({
          where: {
            partnerId,
            deviceId: deviceId ?? undefined,
            status: status ?? undefined,
          },
          take: limit,
          skip: limit * (page - 1),
          orderBy: { createdAt: 'desc' },
        })
      },
    })
  },
})

export default Query
