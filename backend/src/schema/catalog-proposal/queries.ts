// @ts-nocheck
import { arg, extendType, intArg, nonNull, stringArg } from 'nexus'
import { Context } from '../../context'
import { getUserId } from '../../utils'

const Query = extendType({
  type: 'Query',
  definition(t) {
    t.field('findManyCatalogProposals', {
      type: 'CatalogProposalResult',
      args: {
        status: arg({ type: 'CatalogProposalStatus' }),
        entityType: arg({ type: 'CatalogProposalEntityType' }),
        search: stringArg(),
        partnerId: intArg(),
        page: nonNull(intArg()),
        limit: nonNull(intArg()),
      },
      resolve: async (_parent, args: any, ctx: Context) => {
        const userId = getUserId(ctx)
        const user = await ctx.prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
        const where: any = {
          ...(user?.role === 'ADMIN' ? (args.partnerId ? { partnerId: args.partnerId } : {}) : { partnerId: userId }),
          ...(args.status ? { status: args.status } : {}),
          ...(args.entityType ? { entityType: args.entityType } : {}),
          ...(args.search?.trim() ? {
            OR: [
              { name: { contains: args.search.trim(), mode: 'insensitive' } },
              { name_ar: { contains: args.search.trim(), mode: 'insensitive' } },
            ],
          } : {}),
        }
        const [proposals, total] = await Promise.all([
          ctx.prisma.catalogProposal.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (args.page - 1) * args.limit,
            take: Math.min(args.limit, 100),
          }),
          ctx.prisma.catalogProposal.count({ where }),
        ])
        return { proposals, total }
      },
    })
  },
})

export default Query
