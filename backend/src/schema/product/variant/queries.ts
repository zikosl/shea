import { nonNull, extendType, stringArg, intArg, booleanArg } from "nexus"
import { Context } from "../../../context"
import { Prisma } from "@prisma/client"
import { catalogSearchTerms } from "../../../modules/catalog/search"

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
                            { name_ar: { contains: search, mode: 'insensitive' } },
                            { sku: { contains: search, mode: 'insensitive' } },
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
        t.field('adminCatalogVariants', {
            type: 'VariantResult',
            args: {
                search: stringArg(),
                nicheId: intArg(),
                categoryId: intArg(),
                productTypeId: intArg(),
                brandId: intArg(),
                page: nonNull(intArg()),
                limit: nonNull(intArg()),
            },
            resolve: async (_parent, { search, nicheId, categoryId, productTypeId, brandId, page, limit }, ctx: Context) => {
                if (page < 1 || limit < 1 || limit > 100) throw new Error('Invalid catalog page')
                const terms = catalogSearchTerms(search)
                const templateFilter: Prisma.ProductTemplateWhereInput = {
                    ...(categoryId ? { category_id: categoryId } : {}),
                    ...(productTypeId ? { product_type_id: productTypeId } : {}),
                    ...(brandId ? { brand_id: brandId } : {}),
                    ...(nicheId ? { category: { is: { niche_id: nicheId } } } : {}),
                }
                const where: Prisma.VariantWhereInput = {
                    ...(Object.keys(templateFilter).length ? { product: { is: templateFilter } } : {}),
                    ...(terms.length ? {
                        AND: terms.map((term) => ({
                            OR: [
                                { name: { contains: term, mode: 'insensitive' } },
                                { name_ar: { contains: term, mode: 'insensitive' } },
                                { sku: { contains: term, mode: 'insensitive' } },
                                { barcode: { contains: term, mode: 'insensitive' } },
                                { product: { is: { name: { contains: term, mode: 'insensitive' } } } },
                                { product: { is: { name_ar: { contains: term, mode: 'insensitive' } } } },
                            ],
                        })),
                    } : {}),
                }
                const [totalVariants, variants] = await Promise.all([
                    ctx.prisma.variant.count({ where }),
                    ctx.prisma.variant.findMany({
                        where,
                        orderBy: [{ productId: 'asc' }, { id: 'asc' }],
                        skip: (page - 1) * limit,
                        take: limit,
                        include: {
                            _count: { select: { products: true } },
                            tags: true,
                            images: true,
                            product: { include: { category: true } },
                        },
                    }),
                ])
                return { variants, totalVariants }
            },
        })
    },
})



export default { VariantQuery }
