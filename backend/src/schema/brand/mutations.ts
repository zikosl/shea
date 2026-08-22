import { arg, intArg, nonNull, extendType, stringArg } from "nexus"
import { Context } from "../../context"

const Mutation = extendType({
    type: 'Mutation',
    definition(t) {
        t.field('createBrand', {
            type: 'Brand',
            args: {
                name: nonNull(stringArg()),
                image: nonNull(stringArg()),
                niche_id: intArg(),
            },
            resolve: async (_parent, data: { name: string; image: string; niche_id?: number | null }, ctx: Context) => {
                const { name, image, niche_id } = data

                const newBrand = await ctx.prisma.brand.create({
                    data: {
                        name,
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
                image: stringArg(),
                niche_id: intArg(),
            },
            resolve: async (_parent, data: { id: number; name?: string | null; image?: string | null; niche_id?: number | null }, ctx: Context) => {
                const { id, name, image, niche_id } = data
                const updatedBrand = await ctx.prisma.brand.update({
                    where: { id },
                    data: {
                        name: name ?? undefined,
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
