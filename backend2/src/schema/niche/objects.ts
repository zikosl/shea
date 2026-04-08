import { objectType } from "nexus"

const Niche = objectType({
    name: 'Niche',
    definition(t) {
        t.nonNull.int('id')
        t.string('name')
        t.string('name_ar')
        t.string('image')
        t.field('categories', {
            type: 'CategoryResult',
            resolve: async (parent, _args, ctx) => {
                const categories = await ctx.prisma.category.findMany({
                    where: { niche_id: parent.id },
                })
                const totalCategories = await ctx.prisma.category.count({
                    where: { niche_id: parent.id },
                })
                return {
                    categories,
                    totalCategories,
                }
            }
        })
    },
})

const NicheResult = objectType({
    name: 'NicheResult',
    definition(t) {
        t.nonNull.list.nonNull.field('niches', { type: 'Niche' })
        t.int('totalNiches')
    },
})

export default { Niche, NicheResult } 
