import { arg, intArg, nonNull, extendType, stringArg } from "nexus"
import { Context } from "../../context"

const Mutation = extendType({
    type: 'Mutation',
    definition(t) {
        t.field('createCategory', {
            type: 'Category',
            args: {
                name: nonNull(stringArg()),
                name_ar: nonNull(stringArg()),
                image: stringArg(),
                niche_id: nonNull(intArg())
            },
            resolve: async (_parent, data: { name: string; name_ar: string; image?: string | null; niche_id: number }, ctx: Context) => {
                const { name, name_ar, image, niche_id } = data
                const newCategory = await ctx.prisma.category.create({
                    data: {
                        name,
                        name_ar,
                        image: image ?? '',
                        niche_id
                    },
                })
                return newCategory
            },
        })

        t.field('updateCategory', {
            type: 'Category',
            args: {
                id: nonNull(intArg()),
                name: stringArg(),
                name_ar: stringArg(),
                image: stringArg(),
            },
            resolve: async (_parent, data: { id: number; name?: string | null; name_ar?: string | null; image?: string | null }, ctx: Context) => {
                const { id, name, name_ar, image } = data
                const updatedCategory = await ctx.prisma.category.update({
                    where: { id },
                    data: {
                        name: name ?? undefined,
                        name_ar: name_ar ?? undefined,
                        image: image ?? undefined
                    },
                })
                return updatedCategory
            },
        })

        t.field('deleteCategory', {
            type: 'Category',
            args: {
                id: nonNull(intArg()),
            },
            resolve: async (_parent, { id }, ctx: Context) => {
                const deletedCategory = await ctx.prisma.category.delete({
                    where: { id },
                })
                return deletedCategory
            },
        })
    },
})

export default Mutation
