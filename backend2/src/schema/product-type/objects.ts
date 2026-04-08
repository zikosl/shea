import { objectType } from "nexus"

const ProductType = objectType({
    name: 'ProductType',
    definition(t) {
        t.nonNull.int('id')
        t.string('name')
        t.string('name_ar')
        t.int('category_id')
        t.field('category', {
            type: 'Category',
            resolve: async (parent, _args, ctx) => {
                return ctx.prisma.category.findUnique({
                    where: { id: parent.category_id ?? undefined },
                })
            }
        })
        t.field('products', {
            type: 'ProductTemplateResult',
            resolve: async (parent, _args, ctx) => {
                const products = await ctx.prisma.productTemplate.findMany({
                    where: { product_type_id: parent.id },
                })
                const totalProducts = await ctx.prisma.productTemplate.count({
                    where: { product_type_id: parent.id },
                })
                return {
                    productTemplates: products,
                    totalProductTemplates: totalProducts,
                }
            }
        })
    },
})

const ProductTypeResult = objectType({
    name: 'ProductTypeResult',
    definition(t) {
        t.nonNull.list.nonNull.field('productTypes', { type: 'ProductType' })
        t.int('totalProductTypes')
    },
})

export default { ProductType, ProductTypeResult } 
