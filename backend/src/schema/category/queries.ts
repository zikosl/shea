import { nonNull, extendType, stringArg, intArg, booleanArg } from "nexus"
import { Prisma } from "@prisma/client"
import { Context } from "../../context"

export const Query = extendType({
    type: 'Query',
    definition(t) {
        t.field('findOneCategory', {
            type: 'Category',
            args: {
                id: nonNull(intArg()),
            },
            resolve: async (_parent, { id }, ctx: Context) => {
                return ctx.prisma.category.findUnique({
                    where: { id },
                })
            },
        })
        t.nonNull.list.nonNull.field('getAllCategories', {
            type: 'Category',
            resolve: async (_parent, _args, ctx: Context) => {
                return ctx.prisma.category.findMany({})
            },
        })
        t.field('findManyCategories', {
            type: 'CategoryResult',
            args: {
                niche_id: intArg(),
                search: stringArg(),
                page: nonNull(intArg()),
                limit: nonNull(intArg()),
                isFull: booleanArg(),
            },
            resolve: async (_parent, { search, page, limit, isFull = false, niche_id }, ctx: Context) => {

                const where: Prisma.CategoryWhereInput = {
                    ...(niche_id ? { niche_id } : {}),
                    ...(search
                        ? {
                            OR: [
                                { name: { contains: search, mode: 'insensitive' } },
                                { name_ar: { contains: search, mode: 'insensitive' } },
                            ],
                        }
                        : {}),
                };

                const args: Prisma.CategoryFindManyArgs = isFull ? { where } : {
                    where,
                    take: limit,
                    skip: limit * (page - 1),
                }
                const totalCategories = await ctx.prisma.category.count({ where });
                const categories = await ctx.prisma.category.findMany(args);

                return {
                    categories,
                    totalCategories,
                };
            },
        });
    },
})

export default Query
