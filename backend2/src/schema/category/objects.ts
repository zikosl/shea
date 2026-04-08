import { objectType } from "nexus"

const Category = objectType({
    name: 'Category',
    definition(t) {
        t.nonNull.int('id')
        t.string('name')
        t.string('name_ar')
        t.string('image')
        t.int('niche_id')
        t.field('niche', {
            type: 'Niche',
            resolve: (parent, _args, ctx) => {
                return ctx.prisma.niche.findUnique({
                    where: { id: parent.niche_id ?? undefined },
                })
            }
        })
        t.field('productTypes', {
            type: 'ProductTypeResult',
            resolve: async (parent, _args, ctx) => {
                const productTypes = await ctx.prisma.productType.findMany({
                    where: { category_id: parent.id },
                })
                const totalProductTypes = await ctx.prisma.productType.count({
                    where: { category_id: parent.id },
                })
                return {
                    productTypes,
                    totalProductTypes,
                }
            }
        })
    },
})

const CategoryResult = objectType({
    name: 'CategoryResult',
    definition(t) {
        t.nonNull.list.nonNull.field('categories', { type: 'Category' })
        t.int('totalCategories')
    },
})

export default { Category, CategoryResult } 
