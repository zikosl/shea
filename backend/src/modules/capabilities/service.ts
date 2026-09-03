import { CapabilityCode, CapabilityOverrideEffect, PrismaClient } from '@prisma/client'
import { GraphQLError } from 'graphql'

export const capabilityCatalog = Object.values(CapabilityCode)

export type EffectiveCapability = {
  code: CapabilityCode
  enabled: boolean
  source: 'NICHE_DEFAULT' | 'PARTNER_OVERRIDE'
}

export async function effectiveCapabilities(prisma: PrismaClient, partnerUserId: number): Promise<EffectiveCapability[]> {
  const partner = await prisma.partner.findUnique({
    where: { userId: partnerUserId },
    include: {
      partnerNiches: { include: { niche: { include: { capabilities: true } } } },
      capabilityOverrides: true,
    },
  })
  if (!partner) throw new GraphQLError('PARTNER_REQUIRED')

  const effective = new Map<CapabilityCode, EffectiveCapability>()
  for (const assignment of partner.partnerNiches) {
    for (const entry of assignment.niche?.capabilities ?? []) {
      if (entry.enabledByDefault)
        effective.set(entry.capability, { code: entry.capability, enabled: true, source: 'NICHE_DEFAULT' })
    }
  }
  for (const override of partner.capabilityOverrides) {
    effective.set(override.capability, {
      code: override.capability,
      enabled: override.effect === CapabilityOverrideEffect.ENABLE,
      source: 'PARTNER_OVERRIDE',
    })
  }
  return capabilityCatalog.map((code) => effective.get(code) ?? { code, enabled: false, source: 'NICHE_DEFAULT' })
}

export async function requireCapability(prisma: PrismaClient, partnerUserId: number, code: CapabilityCode) {
  const capabilities = await effectiveCapabilities(prisma, partnerUserId)
  if (!capabilities.some((item) => item.code === code && item.enabled))
    throw new GraphQLError(`CAPABILITY_REQUIRED:${code}`)
}
