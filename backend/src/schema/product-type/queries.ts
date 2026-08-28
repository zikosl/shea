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
                niche_id: intArg(),
                category_id: intArg(),
                brand_id: intArg(),
                search: stringArg(),
                page: nonNull(intArg()),
                limit: nonNull(intArg()),
                isFull: booleanArg(),
            },
            resolve: async (_parent, args, ctx: Context) => {
                const { niche_id, category_id, brand_id, search, page, limit, isFull = false } = args as {
                    niche_id?: number | null;
                    category_id?: number | null;
                    brand_id?: number | null;
                    search?: string | null;
                    page: number;
                    limit: number;
                    isFull?: boolean | null;
                };

                const where: Prisma.ProductTypeWhereInput = search
                    ? {
                        OR: [
                            { name: { contains: search, mode: 'insensitive' } },
                            { name_ar: { contains: search, mode: 'insensitive' } },
                        ],
                    }
                    : {};
                if (niche_id) {
                    where.category = { niche_id }
                }
                if (category_id) {
                    where.category_id = category_id
                }
                if (brand_id) {
                    where.products = { some: { brand_id } }
                }
                const findManyArgs: Prisma.ProductTypeFindManyArgs = isFull ? { where } : {
                    where,
                    take: limit,
                    skip: limit * (page - 1),
                }

                const totalProductTypes = await ctx.prisma.productType.count({ where });
                const productTypes = await ctx.prisma.productType.findMany(findManyArgs);

                return {
                    productTypes,
                    totalProductTypes,
                };
            },
        });
    },
})

export default Query
