import { nonNull, extendType, stringArg, intArg, booleanArg, arg } from "nexus"
import { CapabilityCode, Prisma } from "@prisma/client"
import { getOptionalUserId } from "../../../utils"
import { Context } from "../../../context"
import { partnerUserIdsWithCapability } from '../../../modules/capabilities/service'

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
                return ctx.prisma.productTemplatePartnerPreview.findFirst({
                    where: {
                        product_template_id: id, partnerId,
                        ...(!getOptionalUserId(ctx) ? { isActive: true } : {}),
                    },
                })
            },
        })

        t.field('findManyProducts', {
            type: 'ProductViewResult',
            args: {
                partnerId: intArg(),
                category_id: intArg(),
                brand_id: intArg(),
                product_type_id: intArg(),
                search: stringArg(),
                page: nonNull(intArg()),
                limit: nonNull(intArg()),
                isFull: booleanArg(),
                order: arg({ type: "QueryOrder" })
            },
            resolve: async (_parent, { search, page, limit, isFull = false, category_id, brand_id, product_type_id, partnerId, order }: any, ctx: Context) => {


                const userId = getOptionalUserId(ctx);
                const partner = userId
                    ? await ctx.prisma.partner.findUnique({ where: { userId } })
                    : null
                if (partner)
                    partnerId = partner.userId

                let where: Prisma.ProductViewWhereInput = search
                    ? {
                        partnerId,
                        OR: [
                            { name: { contains: search, mode: 'insensitive' } },
                            { name_ar: { contains: search, mode: 'insensitive' } },
                            { sku: { contains: search, mode: 'insensitive' } },
                            { customName: { contains: search, mode: 'insensitive' } },
                            { vendorSku: { contains: search, mode: 'insensitive' } },
                            { vendorBarcode: { contains: search, mode: 'insensitive' } },
                        ],
                    }
                    : {
                        partnerId
                    };
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
                const totalProducts = await ctx.prisma.productView.count({ where });

                const args: Prisma.ProductViewFindManyArgs = isFull ? { where } : {
                    where,
                    take: limit,
                    skip: limit * (page - 1),
                }
                if (order)
                    args.orderBy = {
                        id: order
                    }

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
            },
            resolve: async (_parent, { search, page, limit, isFull = false, category_id, brand_id, product_type_id, partnerId, order, giftEligible, niche_id }: any, ctx: Context) => {


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

                let where: Prisma.ProductTemplatePartnerPreviewWhereInput = search
                    ? {
                        partnerId,
                        OR: [
                            { name: { contains: search, mode: 'insensitive' } },
                            { name_ar: { contains: search, mode: 'insensitive' } },
                            // { description: { contains: search, mode: 'insensitive' } },
                        ],
                    }
                    : {
                        partnerId
                    };
                if (giftPartnerIds) where.partnerId = partnerId ?? { in: giftPartnerIds }
                if (niche_id) {
                    const categories = await ctx.prisma.category.findMany({ where: { niche_id }, select: { id: true } })
                    where.AND = [{ category_id: { in: categories.map(category => category.id) } }]
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
                if (order)
                    args.orderBy = {
                        product_template_id: order
                    }
                const productPartners = await ctx.prisma.productTemplatePartnerPreview.findMany(args);

                return {
                    productPartners,
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
                let where: Prisma.ProductTemplateViewWhereInput = search
                    ? {
                        OR: [
                            { name: { contains: search, mode: 'insensitive' } },
                            { name_ar: { contains: search, mode: 'insensitive' } },
                            { description: { contains: search, mode: 'insensitive' } },
                        ],
                    }
                    : {};
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
