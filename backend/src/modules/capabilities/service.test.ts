import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CapabilityCode, CapabilityOverrideEffect } from '@prisma/client'
import { effectiveCapabilities } from './service'

function database({
  global = [],
  niches = [],
  overrides = [],
}: {
  global?: Array<{ capability: CapabilityCode; enabled: boolean }>
  niches?: Array<Array<{ capability: CapabilityCode; enabledByDefault: boolean }>>
  overrides?: Array<{ capability: CapabilityCode; effect: CapabilityOverrideEffect }>
}) {
  return {
    globalCapabilitySetting: { findMany: async () => global },
    partner: {
      findUnique: async () => ({
        partnerNiches: niches.map((capabilities) => ({ niche: { capabilities } })),
        capabilityOverrides: overrides,
      }),
    },
  } as any
}

test('capabilities resolve global, niche, then partner precedence', async () => {
  const result = await effectiveCapabilities(database({
    global: [{ capability: CapabilityCode.PRODUCTION, enabled: true }],
    niches: [[{ capability: CapabilityCode.PRODUCTION, enabledByDefault: false }]],
    overrides: [{ capability: CapabilityCode.PRODUCTION, effect: CapabilityOverrideEffect.ENABLE }],
  }), 7)

  assert.deepEqual(
    result.find((item) => item.code === CapabilityCode.PRODUCTION),
    { code: CapabilityCode.PRODUCTION, enabled: true, source: 'PARTNER_OVERRIDE' },
  )
})

test('gift studio closes required custom sales dependencies', async () => {
  const result = await effectiveCapabilities(database({
    overrides: [{ capability: CapabilityCode.GIFT_BUILDER, effect: CapabilityOverrideEffect.ENABLE }],
  }), 7)
  const enabled = new Set(result.filter((item) => item.enabled).map((item) => item.code))

  assert.equal(enabled.has(CapabilityCode.GIFT_BUILDER), true)
  assert.equal(enabled.has(CapabilityCode.CUSTOM_ORDERS), true)
  assert.equal(enabled.has(CapabilityCode.QUOTATIONS), true)
  assert.equal(enabled.has(CapabilityCode.DELIVERY_PICKUP), true)
})

test('inherited capability reads ignore partner overrides', async () => {
  const result = await effectiveCapabilities(database({
    global: [{ capability: CapabilityCode.PRODUCTION, enabled: true }],
    overrides: [{ capability: CapabilityCode.PRODUCTION, effect: CapabilityOverrideEffect.DISABLE }],
  }), 7, { includePartnerOverrides: false })

  assert.deepEqual(
    result.find((item) => item.code === CapabilityCode.PRODUCTION),
    { code: CapabilityCode.PRODUCTION, enabled: true, source: 'GLOBAL_DEFAULT' },
  )
})

test('global defaults remain available through a niche without an override', async () => {
  const result = await effectiveCapabilities(database({
    global: [{ capability: CapabilityCode.PRODUCTION, enabled: true }],
    niches: [
      [{ capability: CapabilityCode.PRODUCTION, enabledByDefault: false }],
      [],
    ],
  }), 7)

  assert.equal(result.find((item) => item.code === CapabilityCode.PRODUCTION)?.enabled, true)
})
