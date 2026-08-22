import { extendType } from 'nexus'
import { Context } from '../../context'
import { getUserId } from '../../utils'

export const Query = extendType({
  type: 'Query',
  definition(t) {
    t.list.field('findManyLogs', {
      type: 'Log',
      resolve: async (_parent, _args, ctx: Context) => {
        const userId = getUserId(ctx)
        return (await ctx.prisma.log.findMany({
          where: { userId },
          orderBy: {
            id: 'desc',
          },
        })) as any
      },
    })
  },
})

export default Query
