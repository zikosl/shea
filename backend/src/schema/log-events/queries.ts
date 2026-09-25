import { extendType, intArg } from 'nexus'
import { Context } from '../../context'
import { getUserId } from '../../utils'

export const Query = extendType({
  type: 'Query',
  definition(t) {
    t.list.field('findManyLogs', {
      type: 'Log',
      args: {
        limit: intArg({ default: 30 }),
        beforeId: intArg(),
      },
      resolve: async (_parent, { limit, beforeId }, ctx: Context) => {
        const userId = getUserId(ctx)
        return (await ctx.prisma.log.findMany({
          where: { userId, id: beforeId ? { lt: beforeId } : undefined },
          orderBy: {
            id: 'desc',
          },
          take: Math.min(Math.max(limit ?? 30, 1), 100),
        })) as any
      },
    })
    t.nonNull.int('unreadLogCount', {
      resolve: (_parent, _args, ctx: Context) => {
        const userId = getUserId(ctx)
        return ctx.prisma.log.count({ where: { userId, read: false } })
      },
    })
  },
})

export default Query
