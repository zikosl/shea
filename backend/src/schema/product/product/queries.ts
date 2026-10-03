import { nonNull, extendType, stringArg, intArg, booleanArg, arg } from "nexus"
import { CapabilityCode, Prisma } from "@prisma/client"
import { getOptionalUserId } from "../../../utils"
import { Context } from "../../../context"
import { partnerUserIdsWithCapability } from '../../../modules/capabilities/service'
import { catalogSearchTerms, previewSearchWhere, productSearchWhere, templateSearchWhere } from '../../../modules/catalog/search'

async function attachCatalogPartners(ctx: Context, products: Array<Record<string, unknown>>) {
    const partnerIds = [...new Set(products.map(product => Number(product.partnerId)).filter(Number.isFinite))]
    if (partnerIds.length === 0) return products

    const partners = await ctx.prisma.partner.findMany({ where: { userId: { in: partnerIds } } })
    const partnersByUserId = new Map(partners.map(partner => [partner.userId, partner]))
    return products.map(product => ({ ...product, partner: partnersByUserId.get(Number(product.partnerId)) ?? null }))
}

export const ProductQuery = extendType({
    type: 'Query',
    definition(t) {
        t.field('findOneProduct', {
            type: 'ProductView',
            args: {
                id: nonNull(intArg()),
            },
            resolve: async (_parent, { id }, ctx: Context) => {
                return ctx.prisma.productView.findFirst({
                    where: { id, ...(!getOptionalUserId(ctx) ? { isActive: true } : {}) },
                })
            },
        })

        t.field('findOneProductPartner', {
            type: 'ProductTemplatePartnerPreview',
            args: {
                id: nonNull(intArg()),
                partnerId: nonNull(intArg()),
            },
            resolve: async (_parent, { id, partnerId }, ctx: Context) => {
                const product = await ctx.prisma.productTemplatePartnerPreview.findFirst({
                    where: {
                        product_template_id: id, partnerId,
                        ...(!getOptionalUserId(ctx) ? { isActive: true } : {}),
                    },
                })
                if (!product) return null
                const [result] = await attachCatalogPartners(ctx, [product])
                return result
            },
        })

        t.field('findManyProducts', {
            type: 'ProductViewResult',
            args: {
                partnerId: intArg(),
                niche_id: intArg(),
                category_id: intArg(),
                brand_id: intArg(),
                product_type_id: intArg(),
                search: stringArg(),
                page: nonNull(intArg()),
                limit: nonNull(intArg()),
                isFull: booleanArg(),
                order: arg({ type: "QueryOrder" })
            },
            resolve: async (_parent, { search, page, limit, isFull = false, niche_id, category_id, brand_id, product_type_id, partnerId, order }: any, ctx: Context) => {


                const userId = getOptionalUserId(ctx);
                const partner = userId
                    ? await ctx.prisma.partner.findUnique({ where: { userId } })
                    : null
                if (partner)
                    partnerId = partner.userId

                const terms = catalogSearchTerms(search)
                let where: Prisma.ProductViewWhereInput = { partnerId, ...(terms.length ? productSearchWhere(terms) : {}) };
                if (brand_id) {
                    where = {
                        ...where,
                        brand_id: brand_id,
                    }
                }
                if (niche_id && !category_id && !product_type_id) {
                    const categories = await ctx.prisma.category.findMany({
                        where: { niche_id },
                        select: { id: true },
                    })
                    where.category_id = { in: categories.map(category => category.id) }
                }
                if (product_type_id) {
                    where = {
                        ...where,
                        product_type_id: product_type_id,
                    }
                }
                else if (category_id) {
                    where = {
                        ...where,
                        category_id: category_id,
                    }
                }
                if (!userId) Object.assign(where, { isActive: true });
                const totalProducts = await ctx.prisma.productView.count({ where });

                const args: Prisma.ProductViewFindManyArgs = isFull ? { where } : {
                    where,
                    take: limit,
                    skip: limit * (page - 1),
                }
                args.orderBy = { id: order ?? 'asc' }

                const products = await ctx.prisma.productView.findMany(args);

                return {
                    products,
                    totalProducts,
                };
            },
        });
        t.field('findManyProductPartners', {
            type: 'ProductTemplatePartnerPreviewResult',
            args: {
                niche_id: intArg(),
                partnerId: intArg(),
                category_id: intArg(),
                brand_id: intArg(),
                product_type_id: intArg(),
                search: stringArg(),
                page: nonNull(intArg()),
                limit: nonNull(intArg()),
                isFull: booleanArg(),
                order: arg({ type: "QueryOrder" }),
                giftEligible: booleanArg(),
                availableOnly: booleanArg(),
            },
            resolve: async (_parent, { search, page, limit, isFull = false, category_id, brand_id, product_type_id, partnerId, order, giftEligible, availableOnly, niche_id }: any, ctx: Context) => {


                const userId = getOptionalUserId(ctx);
                const partner = userId
                    ? await ctx.prisma.partner.findUnique({ where: { userId } })
                    : null
                if (partner)
                    partnerId = partner.userId

                const giftPartnerIds = giftEligible
                    ? await partnerUserIdsWithCapability(ctx.prisma, CapabilityCode.GIFT_BUILDER)
                    : null
                if (giftPartnerIds && partnerId && !giftPartnerIds.includes(partnerId)) {
                    return { productPartners: [], totalProductPartners: 0 }
                }

                const terms = catalogSearchTerms(search)
                let where: Prisma.ProductTemplatePartnerPreviewWhereInput = { partnerId, ...(terms.length ? previewSearchWhere(terms) : {}) };
                if (giftPartnerIds) where.partnerId = partnerId ?? { in: giftPartnerIds }
                if (availableOnly) {
                    Object.assign(where, {
                        available: true,
                        isActive: true,
                        onlineVisible: true,
                        partnerOnline: true,
                    })
                    where.AND = [
                        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
                        { OR: [{ trackInventory: false }, { stock: { gt: 0 } }] },
                    ]
                }
                if (niche_id) {
                    const categories = await ctx.prisma.category.findMany({ where: { niche_id }, select: { id: true } })
                    where.AND = [
                        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
                        { category_id: { in: categories.map(category => category.id) } },
                    ]
                }
                if (brand_id) {
                    where = {
                        ...where,
                        brand_id: brand_id,
                    }
                }
                if (product_type_id) {
                    where = {
                        ...where,
                        product_type_id: product_type_id,
                    }
                }
                else if (category_id) {
                    where = {
                        ...where,
                        category_id: category_id,
                    }
                }


                if (!userId) Object.assign(where, { isActive: true });
                const totalProductPartners = await ctx.prisma.productTemplatePartnerPreview.count({ where });

                const args: Prisma.ProductTemplatePartnerPreviewFindManyArgs = isFull ? { where } : {
                    where,
                    take: limit,
                    skip: limit * (page - 1),
                }
                args.orderBy = [
                    { product_template_id: order ?? 'asc' },
                    { partnerId: 'asc' },
                    { product_id: 'asc' },
                ]
                const productPartners = await ctx.prisma.productTemplatePartnerPreview.findMany(args);
                const productPartnersWithStores = await attachCatalogPartners(ctx, productPartners);

                return {
                    productPartners: productPartnersWithStores,
                    totalProductPartners,
                };
            },
        });
    },
})

export const ProductTemplateQuery = extendType({
    type: 'Query',
    definition(t) {
        t.field('findOneProductTemplate', {
            type: 'ProductTemplate',
            args: {
                id: nonNull(intArg()),
            },
            resolve: async (_parent, { id }, ctx: Context) => {
                return ctx.prisma.productTemplateView.findFirst({
                    where: { id },
                })
            },
        })

        t.field('findManyProductTemplates', {
            type: 'ProductTemplateResult',
            args: {
                product_type_id: intArg(),
                category_id: intArg(),
                niche_id: intArg(),
                brand_id: intArg(),
                search: stringArg(),
                page: nonNull(intArg()),
                limit: nonNull(intArg()),
                isFull: booleanArg(),
            },
            resolve: async (_parent, { search, page, limit, isFull = false, brand_id, product_type_id, niche_id, category_id }, ctx: Context) => {
                const terms = catalogSearchTerms(search)
                let where: Prisma.ProductTemplateViewWhereInput = terms.length ? templateSearchWhere(terms) : {};
                if (niche_id) {
                    where = {
                        ...where,
                        niche_id: niche_id,
                    }
                }
                if (category_id) {
                    where = {
                        ...where,
                        category_id: category_id,
                    }
                }
                if (product_type_id) {
                    where = {
                        ...where,
                        product_type_id: product_type_id,
                    }
                }
                if (brand_id) {
                    where = {
                        ...where,
                        brand_id: brand_id,
                    }
                }


                const totalProducts = await ctx.prisma.productTemplateView.count({ where });
                const args: any = isFull ? {
                    where,
                } : {
                    where,
                    take: limit,
                    skip: limit * (page - 1),
                    orderBy: {
                        id: "asc"
                    }
                }
                const products = await ctx.prisma.productTemplateView.findMany(args);
                return {
                    productTemplates: products,
                    totalProductTemplates: totalProducts,
                };
            },
        });
    },
})
export default { ProductQuery, ProductTemplateQuery }
