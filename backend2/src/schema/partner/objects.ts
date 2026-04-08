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
export default {
    PartnerResult,
    PartnerNiche
}
