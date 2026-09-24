import { extendType } from 'nexus'
import { Context } from '../../context'
import { getUserId } from '../../utils'

const Query = extendType({
  type: 'Query',
  definition(t) {
    t.nonNull.list.nonNull.field('mySessions', {
      type: 'AccountSession',
      resolve: async (_parent, _args, context: Context) => {
        const now = new Date()
        return context.prisma.token.findMany({
          where: { userId: getUserId(context), revokedAt: null, expiresAt: { gt: now } },
          orderBy: { lastSeenAt: 'desc' },
        })
      },
    })
  },
})

export default Query
