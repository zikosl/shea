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
  },
})
