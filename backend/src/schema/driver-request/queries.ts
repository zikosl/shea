import { extendType } from 'nexus'
import { Context } from '../../context'
import { getUserId } from '../../utils'
import { resolveDriverRequestFee } from './pricing'

export default extendType({
  type: 'Query',
  definition(t) {
    t.nonNull.field('partnerDriverRequestQuote', {
      type: 'PartnerDriverRequestQuote',
      resolve: (_parent, _args, ctx: Context) => resolveDriverRequestFee(ctx.prisma, getUserId(ctx)),
    })

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
