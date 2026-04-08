import { arg, intArg, nonNull, extendType, stringArg } from "nexus"
import { Context } from "../../context"

const Mutation = extendType({
    type: 'Mutation',
    definition(t) {
        t.field('createProductType', {
            type: 'ProductType',
            args: {
                name: nonNull(stringArg()),
                name_ar: nonNull(stringArg()),
                category_id: nonNull(intArg()),
            },
            resolve: async (_parent, data: { name: string; name_ar: string; category_id: number }, ctx: Context) => {
                const { name, name_ar, category_id } = data

                const newProductType = await ctx.prisma.productType.create({
                    data: {
                        name,
                        name_ar,
                        category_id
                    },
                })
                return newProductType
            },
        })

        t.field('updateProductType', {
            type: 'ProductType',
            args: {
                id: nonNull(intArg()),
                name: stringArg(),
                name_ar: stringArg(),
            },
            resolve: async (_parent, data: { id: number; name?: string | null; name_ar?: string | null }, ctx: Context) => {
                const { id, name, name_ar } = data
                const updatedProductType = await ctx.prisma.productType.update({
                    where: { id },
                    data: {
                        name: name ?? undefined,
                        name_ar: name_ar ?? undefined,
                    },
                })
                return updatedProductType
            },
        })

        t.field('deleteProductType', {
            type: 'ProductType',
            args: {
                id: nonNull(intArg()),
            },
            resolve: async (_parent, { id }, ctx: Context) => {
                const deletedProductType = await ctx.prisma.productType.delete({
                    where: { id },
                })
                return deletedProductType
            },
        })
    },
})

export default Mutation
