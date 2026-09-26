import { CapabilityCode, CapabilityOverrideEffect, PrismaClient } from '@prisma/client'
import { GraphQLError } from 'graphql'

export const capabilityCatalog = Object.values(CapabilityCode)

export type EffectiveCapability = {
  code: CapabilityCode
  enabled: boolean
  source: 'GLOBAL_DEFAULT' | 'NICHE_DEFAULT' | 'PARTNER_OVERRIDE'
}

const capabilityDependencies: Partial<Record<CapabilityCode, CapabilityCode[]>> = {
  [CapabilityCode.GIFT_BUILDER]: [
    CapabilityCode.CUSTOM_ORDERS,
    CapabilityCode.QUOTATIONS,
    CapabilityCode.DELIVERY_PICKUP,
  ],
  [CapabilityCode.PRODUCTION_TASKS]: [CapabilityCode.PRODUCTION],
}

function closeDependencies(effective: Map<CapabilityCode, EffectiveCapability>) {
  let changed = true
  while (changed) {
    changed = false
    for (const [code, dependencies] of Object.entries(capabilityDependencies) as [CapabilityCode, CapabilityCode[]][]) {
      const parent = effective.get(code)
      if (!parent?.enabled) continue
      for (const dependency of dependencies) {
        if (effective.get(dependency)?.enabled) continue
        effective.set(dependency, { code: dependency, enabled: true, source: parent.source })
        changed = true
      }
    }
  }
}

export async function effectiveCapabilities(
  prisma: PrismaClient,
  partnerUserId: number,
  options: { includePartnerOverrides?: boolean } = {},
): Promise<EffectiveCapability[]> {
  const [partner, globalSettings] = await Promise.all([
    prisma.partner.findUnique({
      where: { userId: partnerUserId },
      include: {
        partnerNiches: { include: { niche: { include: { capabilities: true } } } },
        capabilityOverrides: true,
      },
    }),
    prisma.globalCapabilitySetting.findMany(),
  ])
  if (!partner) throw new GraphQLError('PARTNER_REQUIRED')

  const global = new Map(globalSettings.map((entry) => [entry.capability, entry.enabled]))
  const effective = new Map<CapabilityCode, EffectiveCapability>(
    capabilityCatalog.map((code) => [
      code,
      { code, enabled: global.get(code) ?? false, source: 'GLOBAL_DEFAULT' as const },
    ]),
  )

  for (const code of capabilityCatalog) {
    const explicitNicheValues = partner.partnerNiches
      .map((assignment) => assignment.niche?.capabilities.find((entry) => entry.capability === code)?.enabledByDefault)
    if (explicitNicheValues.some((value) => value !== undefined)) {
      effective.set(code, {
        code,
        enabled: explicitNicheValues.some((value) => value ?? (global.get(code) ?? false)),
        source: 'NICHE_DEFAULT',
      })
    }
  }
  if (options.includePartnerOverrides !== false) {
    for (const override of partner.capabilityOverrides) {
      effective.set(override.capability, {
        code: override.capability,
        enabled: override.effect === CapabilityOverrideEffect.ENABLE,
        source: 'PARTNER_OVERRIDE',
      })
    }
  }
  closeDependencies(effective)
  return capabilityCatalog.map((code) => effective.get(code)!)
}

export async function requireCapability(prisma: PrismaClient, partnerUserId: number, code: CapabilityCode) {
  const capabilities = await effectiveCapabilities(prisma, partnerUserId)
  if (!capabilities.some((item) => item.code === code && item.enabled))
    throw new GraphQLError(`CAPABILITY_REQUIRED:${code}`)
}

export async function partnerUserIdsWithCapability(
  prisma: PrismaClient,
  capability: CapabilityCode,
  options: { onlineOnly?: boolean } = { onlineOnly: true },
) {
  const globalSetting = await prisma.globalCapabilitySetting.findUnique({ where: { capability } })
  const inheritedConditions = [
    { partnerNiches: { some: { niche: { capabilities: { some: { capability, enabledByDefault: true } } } } } },
    ...(globalSetting?.enabled ? [
      { partnerNiches: { none: {} } },
      { partnerNiches: { some: { niche: { capabilities: { none: { capability } } } } } },
    ] : []),
  ]
  const partners = await prisma.partner.findMany({
    where: {
      ...(options.onlineOnly === false ? {} : { online: true }),
      OR: [
        { capabilityOverrides: { some: { capability, effect: CapabilityOverrideEffect.ENABLE } } },
        {
          AND: [
            { capabilityOverrides: { none: { capability, effect: CapabilityOverrideEffect.DISABLE } } },
            {
              OR: inheritedConditions,
            },
          ],
        },
      ],
    },
    select: { userId: true },
  })
  return partners.map(({ userId }) => userId)
}
