import { extendType, intArg, nonNull } from 'nexus'
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
          await ctx.prisma.log.updateMany({
            where: {
              userId,
              id,
            },
            data: {
              read: true,
            },
          })
          return true
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
            },
            data: {
              read: true,
            },
          })
          return true
        } catch {
          return false
        }
      },
    })
  },
})

export default Mutation
