import { extendType, intArg, nonNull, stringArg } from 'nexus'
import { Context } from '../../context'
import { getUserId } from '../../utils'

const Mutation = extendType({
  type: 'Mutation',
  definition(t) {
    t.boolean('readLog', {
      args: {
        id: nonNull(intArg()),
      },
      resolve: async (_parent, { id }, ctx: Context) => {
        const userId = getUserId(ctx)
        try {
          const result = await ctx.prisma.log.updateMany({
            where: {
              userId,
              id,
            },
            data: {
              read: true,
              readAt: new Date(),
            },
          })
          return result.count > 0
        } catch {
          return false
        }
      },
    })

    t.boolean('readAllLogs', {
      resolve: async (_parent, _, ctx: Context) => {
        const id = getUserId(ctx)
        try {
          await ctx.prisma.log.updateMany({
            where: {
              userId: id,
              read: false,
            },
            data: {
              read: true,
              readAt: new Date(),
            },
          })
          return true
        } catch {
          return false
        }
      },
    })
    t.nonNull.int('readLogsByEntity', {
      args: {
        entityType: nonNull(stringArg()),
        entityId: nonNull(stringArg()),
      },
      resolve: async (_parent, { entityType, entityId }, ctx: Context) => {
        const userId = getUserId(ctx)
        const result = await ctx.prisma.log.updateMany({
          where: { userId, entityType, entityId, read: false },
          data: { read: true, readAt: new Date() },
        })
        return result.count
      },
    })
  },
})

export default Mutation
