// @ts-nocheck
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
            args: {
                niche_id: intArg(),
            },
            resolve: async (_parent, { niche_id }, ctx: Context) => {
                return ctx.prisma.brand.findMany({
                    where: niche_id ? { niche_id } : {},
                    orderBy: { name: 'asc' },
                })
            },
        })

        t.field('findManyBrands', {
            type: 'BrandResult',
            args: {
                search: stringArg(),
                niche_id: intArg(),
                page: nonNull(intArg()),
                limit: nonNull(intArg()),
                isFull: booleanArg(),
            },
            resolve: async (_parent, { search, niche_id, page, limit, isFull = false }, ctx: Context) => {
                const where: Prisma.BrandWhereInput = {
                    ...(niche_id ? { niche_id } : {}),
                    ...(search
                        ? {
                            OR: [
                                { name: { contains: search, mode: 'insensitive' } },
                            ],
                        }
                        : {}),
                };

                if (isFull) {
                    const brands = await ctx.prisma.brand.findMany({ where });
                    return {
                        brands,
                        totalBrands: brands.length,
                    };
                }

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
