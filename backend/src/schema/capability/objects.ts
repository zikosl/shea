// @ts-nocheck
import { enumType, objectType } from 'nexus'

const CapabilityCode = enumType({
  name: 'CapabilityCode',
  members: ['CUSTOM_ORDERS', 'QUOTATIONS', 'GIFT_BUILDER', 'GIFT_TEMPLATES', 'PRODUCTION', 'PRODUCTION_TASKS', 'DELIVERY_PICKUP', 'GIFT_GALLERY', 'GIFT_REPORTS'],
})
const CapabilityOverrideEffect = enumType({ name: 'CapabilityOverrideEffect', members: ['ENABLE', 'DISABLE'] })
const CapabilitySource = enumType({ name: 'CapabilitySource', members: ['NICHE_DEFAULT', 'PARTNER_OVERRIDE'] })
const EffectiveCapability = objectType({
  name: 'EffectiveCapability',
  definition(t) {
    t.nonNull.field('code', { type: 'CapabilityCode' })
    t.nonNull.boolean('enabled')
    t.nonNull.field('source', { type: 'CapabilitySource' })
  },
})
const NicheCapability = objectType({
  name: 'NicheCapability',
  definition(t) {
    t.nonNull.int('id')
    t.nonNull.int('nicheId')
    t.nonNull.field('capability', { type: 'CapabilityCode' })
    t.nonNull.boolean('enabledByDefault')
  },
})
const PartnerCapabilityOverride = objectType({
  name: 'PartnerCapabilityOverride',
  definition(t) {
    t.nonNull.int('id')
    t.nonNull.int('partnerId')
    t.nonNull.field('capability', { type: 'CapabilityCode' })
    t.nonNull.field('effect', { type: 'CapabilityOverrideEffect' })
  },
})
export default { CapabilityCode, CapabilityOverrideEffect, CapabilitySource, EffectiveCapability, NicheCapability, PartnerCapabilityOverride }
