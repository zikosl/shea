import { extendType } from 'nexus'
import { Context } from '../../context'
import { getUserId } from '../../utils'

export default extendType({
  type: 'Query',
  definition(t) {
    t.nonNull.list.nonNull.field('listPartnerDriverRequests', {
      type: 'PartnerDriverRequest',
      resolve: (_parent, _args, ctx: Context) => ctx.prisma.partnerDriverRequest.findMany({
        where: { partnerId: getUserId(ctx) },
        include: {
          order: {
            include: {
              delivery: {
                include: {
                  driver: {
                    include: {
                      user: {
                        include: {
                          pushTokens: { orderBy: { createdAt: 'desc' }, take: 1 },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    })
  },
})
