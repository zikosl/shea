// @ts-nocheck
import { extendType, stringArg } from 'nexus'
import { getUserId } from '../../utils'
import { ensureDefaultStore } from '../../modules/store-network/service'

export default extendType({
  type: 'Query',
  definition(t) {
    t.nonNull.list.nonNull.field('myStores', {
      type: 'Store',
      resolve: async (_parent, _args, ctx) => {
        const partnerId = getUserId(ctx)
        await ensureDefaultStore(ctx.prisma, partnerId)
        return ctx.prisma.store.findMany({ where: { partnerId }, orderBy: { createdAt: 'asc' } })
      },
    })
    t.nonNull.list.nonNull.field('adminStoreNetworks', {
      type: 'Store',
      args: { search: stringArg() },
      resolve: async (_parent, { search }, ctx) => ctx.prisma.store.findMany({
        where: search ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { code: { contains: search, mode: 'insensitive' } },
            { partner: { companyName: { contains: search, mode: 'insensitive' } } },
          ],
        } : undefined,
        orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
        take: 500,
      }),
    })
    t.nonNull.list.nonNull.field('adminPosDevices', {
      type: 'AdminPosDevice',
      resolve: async (_parent, _args, ctx) => {
        const devices = await ctx.prisma.device.findMany({
          where: { platform: 'DESKTOP' },
          include: { partner: { select: { companyName: true } }, storeTerminal: { include: { store: { select: { name: true } } } } },
          orderBy: [{ revokedAt: 'asc' }, { updatedAt: 'desc' }],
        })
        return devices.map((device) => ({
          ...device,
          partnerName: device.partner.companyName,
          storeName: device.storeTerminal?.store.name ?? null,
        }))
      },
    })
  },
})
