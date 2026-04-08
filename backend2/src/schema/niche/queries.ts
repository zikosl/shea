import { nonNull, extendType, stringArg, intArg, booleanArg } from "nexus"
import { Prisma } from "@prisma/client"
import { Context } from "../../context"

export const Query = extendType({
    type: 'Query',
    definition(t) {
        t.field('findOneNiche', {
            type: 'Niche',
            args: {
                id: nonNull(intArg()),
            },
            resolve: async (_parent, { id }, ctx: Context) => {
                return ctx.prisma.niche.findUnique({
                    where: { id },
                })
            },
        })
        t.nonNull.list.nonNull.field('getAllNiches', {
            type: 'Niche',
            resolve: async (_parent, _args, ctx: Context) => {
                return ctx.prisma.niche.findMany({})
            },
        })
        t.field('findManyNiches', {
            type: 'NicheResult',
            args: {
                search: stringArg(),
                page: nonNull(intArg()),
                limit: nonNull(intArg()),
                isFull: booleanArg(),
            },
            resolve: async (_parent, { search, page, limit, isFull = false }, ctx: Context) => {
                if (isFull) {
                    const niches = await ctx.prisma.niche.findMany({});
                    return {
                        niches,
                        totalNiches: niches.length,
                    };
                }

                const where: Prisma.NicheWhereInput = search
                    ? {
                        OR: [
                            { name: { contains: search, mode: 'insensitive' } },
                            // { description: { contains: search, mode: 'insensitive' } },
                        ],
                    }
                    : {};

                const totalNiches = await ctx.prisma.niche.count({ where });
                const niches = await ctx.prisma.niche.findMany({
                    where,
                    take: limit,
                    skip: limit * (page - 1),
                });

                return {
                    niches,
                    totalNiches,
                };
            },
        });
    },
})

export default Query
