import { nonNull, extendType, stringArg, intArg, booleanArg, arg, objectType } from "nexus"
import { CapabilityCode, Prisma } from "@prisma/client"
import { checkUser, getOptionalUserId } from "../../../utils"
import { Context } from "../../../context"
import { partnerUserIdsWithCapability } from '../../../modules/capabilities/service'
import { catalogSearchTerms, previewSearchWhere, productSearchWhere, templateSearchWhere } from '../../../modules/catalog/search'

const AdminPartnerCatalogVariant = objectType({
    name: 'AdminPartnerCatalogVariant',
    definition(t) {
        t.nonNull.int('id')
        t.string('name')
        t.string('name_ar')
        t.string('sku')
        t.string('barcode')
        t.string('image')
        t.nonNull.boolean('alreadyAdded')
        t.nonNull.boolean('previouslyRemoved')
    },
})

const AdminPartnerCatalogTemplate = objectType({
    name: 'AdminPartnerCatalogTemplate',
    definition(t) {
        t.nonNull.int('id')
        t.nonNull.string('name')
        t.string('name_ar')
        t.string('image')
        t.nonNull.list.nonNull.field('variants', { type: AdminPartnerCatalogVariant })
    },
})

const AdminPartnerCatalogTemplateResult = objectType({
    name: 'AdminPartnerCatalogTemplateResult',
    definition(t) {
        t.nonNull.list.nonNull.field('productTemplates', { type: AdminPartnerCatalogTemplate })
        t.nonNull.int('totalProductTemplates')
    },
})

async function clientVisiblePartnerIds(ctx: Context) {
    const userId = getOptionalUserId(ctx)
    if (userId) {
        const role = await ctx.prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
        if (role?.role === 'ADMIN' || role?.role === 'PARTNER') return null
    }
    const partners = await ctx.prisma.partner.findMany({ where: { clientVisible: true }, select: { userId: true } })
    return partners.map(({ userId }) => userId)
}

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
                const product = await ctx.prisma.productView.findFirst({
                    where: { id, ...(!getOptionalUserId(ctx) ? { isActive: true } : {}) },
                })
                if (!product) return null
                const visibleIds = await clientVisiblePartnerIds(ctx)
                if (visibleIds && !visibleIds.includes(product.partnerId)) return null
                return product
            },
        })

        t.field('findOneProductPartner', {
            type: 'ProductTemplatePartnerPreview',
            args: {
                id: nonNull(intArg()),
                partnerId: nonNull(intArg()),
            },
            resolve: async (_parent, { id, partnerId }, ctx: Context) => {
                const visibleIds = await clientVisiblePartnerIds(ctx)
                if (visibleIds && !visibleIds.includes(partnerId)) return null
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
                const visibleIds = await clientVisiblePartnerIds(ctx)
                if (visibleIds) where.AND = [...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []), { partnerId: { in: visibleIds } }]
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
                const visibleIds = await clientVisiblePartnerIds(ctx)
                if (visibleIds) where.AND = [...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []), { partnerId: { in: visibleIds } }]
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

                // The catalog preview intentionally exposes one representative variant per
                // template/store. For a variant-specific query, promote the matching
                // partner product so the card and its details start on that exact variant.
                if (terms.length) {
                    const onlinePartnerIds = availableOnly
                        ? (await ctx.prisma.partner.findMany({ where: { online: true }, select: { userId: true } })).map(item => item.userId)
                        : undefined
                    const eligiblePartnerIds = onlinePartnerIds?.filter(id => !partnerId || id === partnerId)
                    const nicheCategoryIds = niche_id
                        ? (await ctx.prisma.category.findMany({ where: { niche_id }, select: { id: true } })).map(item => item.id)
                        : undefined
                    let variantWhere: Prisma.ProductViewWhereInput = {
                        ...(partnerId ? { partnerId } : {}),
                        ...productSearchWhere(terms),
                        ...(brand_id ? { brand_id } : {}),
                        ...(product_type_id ? { product_type_id } : {}),
                        ...(category_id && !product_type_id ? { category_id } : {}),
                        ...(!userId ? { isActive: true } : {}),
                        ...(availableOnly ? {
                            available: true,
                            isActive: true,
                            onlineVisible: true,
                            partnerId: { in: eligiblePartnerIds ?? [] },
                        } : {}),
                    }
                    if (visibleIds) variantWhere.AND = [...(Array.isArray(variantWhere.AND) ? variantWhere.AND : variantWhere.AND ? [variantWhere.AND] : []), { partnerId: { in: visibleIds } }]
                    variantWhere.AND = [
                        ...(Array.isArray(variantWhere.AND) ? variantWhere.AND : variantWhere.AND ? [variantWhere.AND] : []),
                        ...(nicheCategoryIds ? [{ category_id: { in: nicheCategoryIds } }] : []),
                        { OR: terms.map(term => ({ variantName: { contains: term, mode: 'insensitive' } })) },
                    ]
                    const variantRows = await ctx.prisma.productView.findMany({ where: variantWhere })
                    const [attachedRows, tracking] = await Promise.all([
                        attachCatalogPartners(ctx, variantRows),
                        variantRows.length
                            ? ctx.prisma.product.findMany({ where: { id: { in: variantRows.map(item => item.id) } }, select: { id: true, trackInventory: true, stock: true } })
                            : Promise.resolve([]),
                    ])
                    const trackedById = new Map(tracking.map(item => [item.id, item]))
                    const typedRows = attachedRows as Array<(typeof variantRows)[number] & { partner?: { online?: boolean } | null }>
                    const rowsWithPartners = (availableOnly
                        ? typedRows.filter(row => {
                            const tracked = trackedById.get(row.id)
                            return tracked && (!tracked.trackInventory || tracked.stock > 0)
                        })
                        : typedRows)
                    const trackById = new Map(tracking.map(item => [item.id, item.trackInventory]))
                    const termsInVariant = (value?: string | null) => terms.filter(term => value?.normalize('NFKC').toLocaleLowerCase().includes(term)).length
                    const bestByTemplate = new Map<string, (typeof rowsWithPartners)[number]>()
                    for (const row of rowsWithPartners) {
                        const key = `${row.product_template_id}:${row.partnerId}`
                        const previous = bestByTemplate.get(key)
                        const score = termsInVariant(row.variantName)
                        const previousScore = termsInVariant(previous?.variantName)
                        const availableScore = Number(row.available && row.isActive && row.onlineVisible && (!trackById.get(row.id) || row.stock > 0))
                        const previousAvailableScore = Number(previous?.available && previous.isActive && previous.onlineVisible && (!trackById.get(previous?.id ?? -1) || (previous?.stock ?? 0) > 0))
                        if (!previous || score > previousScore || (score === previousScore && availableScore > previousAvailableScore) || (score === previousScore && availableScore === previousAvailableScore && row.id < previous.id)) {
                            bestByTemplate.set(key, row)
                        }
                    }
                    const prioritized = [...bestByTemplate.values()]
                        .sort((a, b) => termsInVariant(b.variantName) - termsInVariant(a.variantName) || a.product_template_id - b.product_template_id || a.partnerId - b.partnerId)
                        .map(row => ({
                            ...row,
                            product_template_id: row.product_template_id,
                            variantId: row.variantId,
                            variant_name: row.variantName,
                            variant_name_ar: row.variantNameAr,
                            variant_sku: row.sku,
                            product_id: row.id,
                            brand_id: row.brand_id,
                            trackInventory: trackById.get(row.id) ?? true,
                            partnerOnline: row.partner?.online ?? false,
                        }))

                    if (prioritized.length) {
                        const excludedGroups = prioritized.map(row => ({ product_template_id: row.product_template_id, partnerId: row.partnerId }))
                        const standardWhere: Prisma.ProductTemplatePartnerPreviewWhereInput = {
                            ...where,
                            NOT: excludedGroups,
                        }
                        const standardTotal = await ctx.prisma.productTemplatePartnerPreview.count({ where: standardWhere })
                        const total = prioritized.length + standardTotal
                        const offset = isFull ? 0 : limit * (page - 1)
                        const prioritizedPage = prioritized.slice(offset, isFull ? undefined : offset + limit)
                        const standardOffset = Math.max(0, offset - prioritized.length)
                        const remaining = isFull ? undefined : Math.max(0, limit - prioritizedPage.length)
                        const standardRows = remaining === 0 ? [] : await ctx.prisma.productTemplatePartnerPreview.findMany({
                            where: standardWhere,
                            ...(isFull ? {} : { skip: standardOffset, take: remaining }),
                            orderBy: [
                                { product_template_id: order ?? 'asc' },
                                { partnerId: 'asc' },
                                { product_id: 'asc' },
                            ],
                        })
                        const result = [...prioritizedPage, ...standardRows]
                        return { productPartners: await attachCatalogPartners(ctx, result), totalProductPartners: total }
                    }
                }

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
        t.field('adminPartnerCatalogTemplates', {
            type: AdminPartnerCatalogTemplateResult,
            args: {
                partnerId: nonNull(intArg()),
                search: stringArg(),
                nicheId: intArg(),
                categoryId: intArg(),
                brandId: intArg(),
                page: nonNull(intArg()),
                limit: nonNull(intArg()),
            },
            resolve: async (_parent, { partnerId, search, nicheId, categoryId, brandId, page, limit }, ctx: Context) => {
                const partner = await ctx.prisma.partner.findUnique({ where: { userId: partnerId }, select: { userId: true } })
                if (!partner) return { productTemplates: [], totalProductTemplates: 0 }
                const terms = catalogSearchTerms(search)
                const where: Prisma.ProductTemplateViewWhereInput = {
                    ...(terms.length ? templateSearchWhere(terms) : {}),
                    ...(nicheId ? { niche_id: nicheId } : {}),
                    ...(categoryId ? { category_id: categoryId } : {}),
                    ...(brandId ? { brand_id: brandId } : {}),
                }
                const safeLimit = Math.min(50, Math.max(1, limit))
                const safePage = Math.max(1, page)
                const [totalProductTemplates, templates] = await Promise.all([
                    ctx.prisma.productTemplateView.count({ where }),
                    ctx.prisma.productTemplateView.findMany({ where, orderBy: { id: 'asc' }, skip: (safePage - 1) * safeLimit, take: safeLimit }),
                ])
                const templateIds = templates.map((template) => template.id)
                const variants = templateIds.length ? await ctx.prisma.variant.findMany({
                    where: { productId: { in: templateIds } },
                    select: { id: true, productId: true, name: true, name_ar: true, sku: true, barcode: true },
                    orderBy: { id: 'asc' },
                }) : []
                const variantIds = variants.map((variant) => variant.id)
                const [partnerProducts, images] = await Promise.all([
                    variantIds.length ? ctx.prisma.product.findMany({ where: { partnerId, variantId: { in: variantIds } }, select: { variantId: true, isActive: true } }) : [],
                    templateIds.length ? ctx.prisma.productImage.findMany({ where: { OR: [{ product_template_id: { in: templateIds } }, { variantId: { in: variantIds } }] }, orderBy: { id: 'asc' }, select: { url: true, product_template_id: true, variantId: true } }) : [],
                ])
                const partnerProductsByVariant = new Map(partnerProducts.map((product) => [product.variantId, product]))
                const templateImages = new Map<number, string>()
                const variantImages = new Map<number, string>()
                for (const image of images) {
                    if (image.product_template_id && !templateImages.has(image.product_template_id)) templateImages.set(image.product_template_id, image.url)
                    if (image.variantId && !variantImages.has(image.variantId)) variantImages.set(image.variantId, image.url)
                }
                const variantsByTemplate = new Map<number, typeof variants>()
                for (const variant of variants) variantsByTemplate.set(variant.productId, [...(variantsByTemplate.get(variant.productId) ?? []), variant])
                return {
                    totalProductTemplates,
                    productTemplates: templates.map((template) => ({
                        id: template.id,
                        name: template.name,
                        name_ar: template.name_ar,
                        image: templateImages.get(template.id) ?? null,
                        variants: (variantsByTemplate.get(template.id) ?? []).map((variant) => {
                            const existing = partnerProductsByVariant.get(variant.id)
                            return {
                                ...variant,
                                image: variantImages.get(variant.id) ?? templateImages.get(template.id) ?? null,
                                alreadyAdded: existing?.isActive ?? false,
                                previouslyRemoved: existing != null && !existing.isActive,
                            }
                        }),
                    })),
                }
            },
        })

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

        t.field('adminPartnerCatalogProducts', {
            type: 'ProductViewResult',
            args: {
                partnerId: nonNull(intArg()),
                search: stringArg(),
                page: nonNull(intArg()),
                limit: nonNull(intArg()),
            },
            resolve: async (_parent, { partnerId, search, page, limit }, ctx: Context) => {
                const partner = await ctx.prisma.partner.findUnique({ where: { userId: partnerId }, select: { userId: true } })
                if (!partner) return { products: [], totalProducts: 0 }
                const terms = catalogSearchTerms(search)
                const where: Prisma.ProductViewWhereInput = { partnerId, isActive: true, ...(terms.length ? productSearchWhere(terms) : {}) }
                const [totalProducts, products] = await Promise.all([
                    ctx.prisma.productView.count({ where }),
                    ctx.prisma.productView.findMany({ where, orderBy: { id: 'asc' }, skip: Math.max(0, page - 1) * Math.min(100, Math.max(1, limit)), take: Math.min(100, Math.max(1, limit)) }),
                ])
                return { products, totalProducts }
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
                const variantCounts = products.length
                    ? await ctx.prisma.variant.groupBy({
                        by: ['productId'],
                        where: { productId: { in: products.map((product) => product.id) } },
                        _count: { _all: true },
                    })
                    : []
                const variantCountByTemplateId = new Map(variantCounts.map((entry) => [entry.productId, entry._count._all]))
                return {
                    productTemplates: products.map((product) => ({
                        ...product,
                        variantCount: variantCountByTemplateId.get(product.id) ?? 0,
                    })),
                    totalProductTemplates: totalProducts,
                };
            },
        });
    },
})
export default { ProductQuery, ProductTemplateQuery }
