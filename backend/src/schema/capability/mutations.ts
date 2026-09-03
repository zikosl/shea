// @ts-nocheck
import { arg, booleanArg, extendType, intArg, nonNull } from 'nexus'

export default extendType({
  type: 'Mutation',
  definition(t) {
    t.field('setNicheCapability', {
      type: 'NicheCapability',
      args: { nicheId: nonNull(intArg()), capability: nonNull(arg({ type: 'CapabilityCode' })), enabled: nonNull(booleanArg()) },
      resolve: (_root, { nicheId, capability, enabled }, ctx) => ctx.prisma.nicheCapability.upsert({
        where: { nicheId_capability: { nicheId, capability } },
        create: { nicheId, capability, enabledByDefault: enabled },
        update: { enabledByDefault: enabled },
      }),
    })
    t.field('setPartnerCapabilityOverride', {
      type: 'PartnerCapabilityOverride',
      args: { partnerId: nonNull(intArg()), capability: nonNull(arg({ type: 'CapabilityCode' })), effect: arg({ type: 'CapabilityOverrideEffect' }) },
      resolve: async (_root, { partnerId, capability, effect }, ctx) => {
        const partner = await ctx.prisma.partner.findUnique({ where: { id: partnerId }, select: { userId: true } })
        if (!partner) throw new Error('PARTNER_NOT_FOUND')
        if (!effect) {
          await ctx.prisma.partnerCapabilityOverride.deleteMany({ where: { partnerId: partner.userId, capability } })
          return null
        }
        return ctx.prisma.partnerCapabilityOverride.upsert({
          where: { partnerId_capability: { partnerId: partner.userId, capability } },
          create: { partnerId: partner.userId, capability, effect }, update: { effect },
        })
      },
    })
  },
})
