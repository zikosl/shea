import { arg, intArg, nonNull, extendType, stringArg } from "nexus"
import { Context } from "../../context"

const Mutation = extendType({
    type: 'Mutation',
    definition(t) {
        t.field('createNiche', {
            type: 'Niche',
            args: {
                name: nonNull(stringArg()),
                name_ar: nonNull(stringArg()),
                image: stringArg(),
            },
            resolve: async (_parent, data: { name: string; name_ar: string; image?: string | null }, ctx: Context) => {
                const { name, name_ar, image } = data
                const newNiche = await ctx.prisma.niche.create({
                    data: {
                        name,
                        name_ar,
                        image: image ?? ''
                    },
                })
                return newNiche
            },
        })

        t.field('updateNiche', {
            type: 'Niche',
            args: {
                id: nonNull(intArg()),
                name: stringArg(),
                name_ar: stringArg(),
                image: stringArg(),
            },
            resolve: async (_parent, data: { id: number; name?: string | null; name_ar?: string | null; image?: string | null }, ctx: Context) => {
                const { id, name, name_ar, image } = data
                const updatedNiche = await ctx.prisma.niche.update({
                    where: { id },
                    data: {
                        name: name ?? undefined,
                        name_ar: name_ar ?? undefined,
                        image: image ?? undefined
                    },
                })
                return updatedNiche
            },
        })

        t.field('deleteNiche', {
            type: 'Niche',
            args: {
                id: nonNull(intArg()),
            },
            resolve: async (_parent, { id }, ctx: Context) => {
                const deletedNiche = await ctx.prisma.niche.delete({
                    where: { id },
                })
                return deletedNiche
            },
        })
    },
})

export default Mutation
