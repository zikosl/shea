import { nonNull, extendType, stringArg, intArg, booleanArg } from "nexus"
import { Context } from "../../../context"

export const VariantQuery = extendType({
    type: 'Query',
    definition(t) {
        t.field('findOneVariant', {
            type: 'Variant',
            args: {
                id: nonNull(intArg()),
            },
            resolve: async (_parent, { id }, ctx: Context) => {
                return ctx.prisma.variant.findUnique({
                    where: { id },
                })
            },
        })
        t.field('findManyVariants', {
            type: 'VariantResult',
            args: {
                productId: nonNull(intArg()),
                search: stringArg(),
                page: nonNull(intArg()),
                limit: nonNull(intArg()),
                isFull: booleanArg(),
            },
            resolve: async (_parent, { search, page, limit, isFull = false, productId }, ctx: Context) => {
                let where: any = search
                    ? {
                        productId,
                        OR: [
                            { name: { contains: search, mode: 'insensitive' } },
                            // { description: { contains: search, mode: 'insensitive' } },
                        ],
                    }
                    : {
                        productId
                    };
                const args = isFull ? where : {
                    where,
                    take: limit,
                    skip: limit * (page - 1),
                }


                const totalVariants = await ctx.prisma.variant.count({ where });
                const variants = await ctx.prisma.variant.findMany(args);

                return {
                    variants,
                    totalVariants,
                };
            },
        });
    },
})



export default { VariantQuery }
