import { nonNull, extendType, stringArg, intArg, booleanArg } from "nexus"
import { Prisma } from "@prisma/client"
import { Context } from "../../context"

export const Query = extendType({
    type: 'Query',
    definition(t) {
        t.field('findOneProductType', {
            type: 'ProductType',
            args: {
                id: nonNull(intArg()),
            },
            resolve: async (_parent, { id }, ctx: Context) => {
                return ctx.prisma.productType.findUnique({
                    where: { id },
                })
            },
        })

        t.field('findManyProductTypes', {
            type: 'ProductTypeResult',
            args: {
                category_id: intArg(),
                search: stringArg(),
                page: nonNull(intArg()),
                limit: nonNull(intArg()),
                isFull: booleanArg(),
            },
            resolve: async (_parent, { category_id, search, page, limit, isFull = false }, ctx: Context) => {

                const where: Prisma.ProductTypeWhereInput = search
                    ? {
                        OR: [
                            { name: { contains: search, mode: 'insensitive' } },
                            // { description: { contains: search, mode: 'insensitive' } },
                        ],
                    }
                    : {};
                if (category_id) {
                    where.category_id = category_id
                }
                const args: Prisma.ProductTypeFindManyArgs = isFull ? { where } : {
                    where,
                    take: limit,
                    skip: limit * (page - 1),
                }

                const totalProductTypes = await ctx.prisma.productType.count({ where });
                const productTypes = await ctx.prisma.productType.findMany(args);

                return {
                    productTypes,
                    totalProductTypes,
                };
            },
        });
    },
})

export default Query
