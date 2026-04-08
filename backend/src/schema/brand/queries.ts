import { nonNull, extendType, stringArg, intArg, booleanArg } from "nexus"
import { Prisma } from "@prisma/client"
import { Context } from "../../context"

export const Query = extendType({
    type: 'Query',
    definition(t) {
        t.field('findOneBrand', {
            type: 'Brand',
            args: {
                id: nonNull(intArg()),
            },
            resolve: async (_parent, { id }, ctx: Context) => {
                return ctx.prisma.brand.findUnique({
                    where: { id },
                })
            },
        })

        t.nonNull.list.nonNull.field('getAllBrands', {
            type: 'Brand',
            resolve: async (_parent, _args, ctx: Context) => {
                return ctx.prisma.brand.findMany({})
            },
        })

        t.field('findManyBrands', {
            type: 'BrandResult',
            args: {
                search: stringArg(),
                page: nonNull(intArg()),
                limit: nonNull(intArg()),
                isFull: booleanArg(),
            },
            resolve: async (_parent, { search, page, limit, isFull = false }, ctx: Context) => {
                if (isFull) {
                    const brands = await ctx.prisma.brand.findMany({});
                    return {
                        brands,
                        totalBrands: brands.length,
                    };
                }

                const where: Prisma.BrandWhereInput = search
                    ? {
                        OR: [
                            { name: { contains: search, mode: 'insensitive' } },
                            // { description: { contains: search, mode: 'insensitive' } },
                        ],
                    }
                    : {};

                const totalBrands = await ctx.prisma.brand.count({ where });
                const brands = await ctx.prisma.brand.findMany({
                    where,
                    take: limit,
                    skip: limit * (page - 1),
                });

                return {
                    brands,
                    totalBrands,
                };
            },
        });
    },
})

export default Query
