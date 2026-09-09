import { arg, intArg, nonNull, extendType, stringArg } from "nexus"
import { Context } from "../../context"

const Mutation = extendType({
    type: 'Mutation',
    definition(t) {
        t.field('createBrand', {
            type: 'Brand',
            args: {
                name: nonNull(stringArg()),
                name_ar: stringArg(),
                image: nonNull(stringArg()),
                niche_id: intArg(),
            },
            resolve: async (_parent, data: { name: string; name_ar?: string | null; image: string; niche_id?: number | null }, ctx: Context) => {
                const { name, name_ar, image, niche_id } = data

                const newBrand = await ctx.prisma.brand.create({
                    data: {
                        name,
                        name_ar: name_ar?.trim() ?? '',
                        image,
                        niche_id: niche_id ?? undefined,
                    },
                })
                return newBrand
            },
        })

        t.field('updateBrand', {
            type: 'Brand',
            args: {
                id: nonNull(intArg()),
                name: stringArg(),
                name_ar: stringArg(),
                image: stringArg(),
                niche_id: intArg(),
            },
            resolve: async (_parent, data: { id: number; name?: string | null; name_ar?: string | null; image?: string | null; niche_id?: number | null }, ctx: Context) => {
                const { id, name, name_ar, image, niche_id } = data
                const updatedBrand = await ctx.prisma.brand.update({
                    where: { id },
                    data: {
                        name: name ?? undefined,
                        name_ar: name_ar?.trim() ?? undefined,
                        image: image ?? undefined,
                        niche_id: niche_id ?? undefined,
                    },
                })
                return updatedBrand
            },
        })

        t.field('deleteBrand', {
            type: 'Brand',
            args: {
                id: nonNull(intArg()),
            },
            resolve: async (_parent, { id }, ctx: Context) => {
                const deletedBrand = await ctx.prisma.brand.delete({
                    where: { id },
                })
                return deletedBrand
            },
        })
    },
})

export default Mutation
