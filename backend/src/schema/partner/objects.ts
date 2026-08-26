// @ts-nocheck
import { objectType } from "nexus"

const PartnerResult = objectType({
    name: 'PartnerResult',
    definition(t) {
        t.nonNull.list.nonNull.field('partners', { type: 'Partner' })
        t.int('totalPartners')
    },
})
const PartnerNiche = objectType({
    name: 'PartnerNiche',
    definition(t) {
        t.int('id')
        t.int('partnerId')
        t.int('niche_id')
        t.field('niche', {
            type: 'Niche',
            resolve: async (parent, _args, ctx) => {
                return ctx.prisma.niche.findUnique({
                    where: { id: parent.niche_id ?? undefined },
                })
            }
        })
    },
})
const PartnerStatistics = objectType({
    name: 'PartnerStatistics',
    definition(t) {
        t.nonNull.float('gross')
        t.nonNull.float('fees')
        t.nonNull.float('net')
        t.nonNull.int('orders')
        t.nonNull.float('averageOrderValue')
    },
})
const PartnerStatisticsResult = objectType({
    name: 'PartnerStatisticsResult',
    definition(t) {
        t.nonNull.field('today', { type: 'PartnerStatistics' })
        t.nonNull.field('week', { type: 'PartnerStatistics' })
        t.nonNull.field('month', { type: 'PartnerStatistics' })
        t.nonNull.field('allTime', { type: 'PartnerStatistics' })
    },
})
export default {
    PartnerResult,
    PartnerNiche,
    PartnerStatistics,
    PartnerStatisticsResult,
}
