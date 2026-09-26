// @ts-nocheck
import { arg, booleanArg, extendType, intArg, list, nonNull } from 'nexus'
import { CapabilityCode, CapabilityOverrideEffect } from '@prisma/client'
import { GraphQLError } from 'graphql'

function assertDisjoint(enabled: CapabilityCode[], disabled: CapabilityCode[]) {
  const enabledSet = new Set(enabled)
  if (disabled.some((capability) => enabledSet.has(capability))) {
    throw new GraphQLError('CAPABILITY_SETTING_CONFLICT')
  }
}

export default extendType({
  type: 'Mutation',
  definition(t) {
    t.nonNull.list.nonNull.field('setGlobalCapabilities', {
      type: 'GlobalCapabilitySetting',
      args: { enabled: nonNull(list(nonNull(arg({ type: 'CapabilityCode' })))) },
      resolve: async (_root, { enabled }, ctx) => {
        const enabledSet = new Set(enabled)
        return ctx.prisma.$transaction(async (tx) => {
          for (const capability of Object.values(CapabilityCode)) {
            await tx.globalCapabilitySetting.upsert({
              where: { capability },
              create: { capability, enabled: enabledSet.has(capability) },
              update: { enabled: enabledSet.has(capability) },
            })
          }
          return tx.globalCapabilitySetting.findMany({ orderBy: { capability: 'asc' } })
        })
      },
    })
    t.nonNull.list.nonNull.field('setNicheCapabilities', {
      type: 'NicheCapability',
      args: {
        nicheId: nonNull(intArg()),
        enabled: nonNull(list(nonNull(arg({ type: 'CapabilityCode' })))),
        disabled: nonNull(list(nonNull(arg({ type: 'CapabilityCode' })))),
      },
      resolve: async (_root, { nicheId, enabled, disabled }, ctx) => {
        assertDisjoint(enabled, disabled)
        return ctx.prisma.$transaction(async (tx) => {
          await tx.nicheCapability.deleteMany({ where: { nicheId } })
          const rows = [
            ...[...new Set(enabled)].map((capability) => ({ nicheId, capability, enabledByDefault: true })),
            ...[...new Set(disabled)].map((capability) => ({ nicheId, capability, enabledByDefault: false })),
          ]
          if (rows.length) await tx.nicheCapability.createMany({ data: rows, skipDuplicates: true })
          return tx.nicheCapability.findMany({ where: { nicheId }, orderBy: { capability: 'asc' } })
        })
      },
    })
    t.nonNull.list.nonNull.field('setPartnerCapabilities', {
      type: 'PartnerCapabilityOverride',
      args: {
        partnerId: nonNull(intArg()),
        enabled: nonNull(list(nonNull(arg({ type: 'CapabilityCode' })))),
        disabled: nonNull(list(nonNull(arg({ type: 'CapabilityCode' })))),
      },
      resolve: async (_root, { partnerId, enabled, disabled }, ctx) => {
        assertDisjoint(enabled, disabled)
        const partner = await ctx.prisma.partner.findUnique({ where: { id: partnerId }, select: { userId: true } })
        if (!partner) throw new Error('PARTNER_NOT_FOUND')
        return ctx.prisma.$transaction(async (tx) => {
          await tx.partnerCapabilityOverride.deleteMany({ where: { partnerId: partner.userId } })
          const rows = [
            ...[...new Set(enabled)].map((capability) => ({ partnerId: partner.userId, capability, effect: CapabilityOverrideEffect.ENABLE })),
            ...[...new Set(disabled)].map((capability) => ({ partnerId: partner.userId, capability, effect: CapabilityOverrideEffect.DISABLE })),
          ]
          if (rows.length) await tx.partnerCapabilityOverride.createMany({ data: rows, skipDuplicates: true })
          return tx.partnerCapabilityOverride.findMany({ where: { partnerId: partner.userId }, orderBy: { capability: 'asc' } })
        })
      },
    })
    t.nonNull.field('setGlobalCapability', {
      type: 'GlobalCapabilitySetting',
      args: { capability: nonNull(arg({ type: 'CapabilityCode' })), enabled: nonNull(booleanArg()) },
      resolve: (_root, { capability, enabled }, ctx) => ctx.prisma.globalCapabilitySetting.upsert({
        where: { capability },
        create: { capability, enabled },
        update: { enabled },
      }),
    })
    t.field('setNicheCapability', {
      type: 'NicheCapability',
      args: { nicheId: nonNull(intArg()), capability: nonNull(arg({ type: 'CapabilityCode' })), enabled: booleanArg() },
      resolve: async (_root, { nicheId, capability, enabled }, ctx) => {
        if (enabled == null) {
          await ctx.prisma.nicheCapability.deleteMany({ where: { nicheId, capability } })
          return null
        }
        return ctx.prisma.nicheCapability.upsert({
          where: { nicheId_capability: { nicheId, capability } },
          create: { nicheId, capability, enabledByDefault: enabled },
          update: { enabledByDefault: enabled },
        })
      },
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
