// @ts-nocheck
import { extendType, intArg } from 'nexus'
import { getUserId } from '../../utils'
import { capabilityCatalog, effectiveCapabilities } from '../../modules/capabilities/service'

export default extendType({
  type: 'Query',
  definition(t) {
    t.nonNull.list.nonNull.field('capabilityCatalog', {
      type: 'CapabilityCode',
      resolve: () => capabilityCatalog,
    })
    t.nonNull.list.nonNull.field('effectiveCapabilities', {
      type: 'EffectiveCapability',
      args: { partnerId: intArg() },
      resolve: async (_root, { partnerId }, ctx) => {
        const actorId = getUserId(ctx)
        const actor = await ctx.prisma.user.findUnique({ where: { id: actorId }, select: { role: true } })
        if (partnerId && actor?.role !== 'ADMIN') throw new Error('ADMIN_ROLE_REQUIRED')
        const partnerUserId = partnerId
          ? (await ctx.prisma.partner.findUnique({ where: { id: partnerId }, select: { userId: true } }))?.userId
          : actorId
        if (!partnerUserId) throw new Error('PARTNER_REQUIRED')
        return effectiveCapabilities(ctx.prisma, partnerUserId)
      },
    })
    t.nonNull.list.nonNull.field('nicheCapabilityDefaults', {
      type: 'NicheCapability', args: { nicheId: intArg() },
      resolve: (_root, { nicheId }, ctx) => ctx.prisma.nicheCapability.findMany({ where: nicheId ? { nicheId } : {}, orderBy: [{ nicheId: 'asc' }, { capability: 'asc' }] }),
    })
    t.nonNull.list.nonNull.field('partnerCapabilityOverrides', {
      type: 'PartnerCapabilityOverride', args: { partnerId: intArg() },
      resolve: async (_root, { partnerId }, ctx) => {
        if (!partnerId) return []
        const partner = await ctx.prisma.partner.findUnique({ where: { id: partnerId }, select: { userId: true } })
        return partner ? ctx.prisma.partnerCapabilityOverride.findMany({ where: { partnerId: partner.userId } }) : []
      },
    })
  },
})
