// @ts-nocheck
import { arg, intArg, nonNull, inputObjectType, list, extendType, objectType, stringArg, floatArg, booleanArg } from "nexus"
import { GraphQLError } from "graphql"
import { getUserId } from "../../../utils"
import { Context } from "../../../context"
import { publishStoreProducts } from "../../../modules/store-network/service"
import {
    createManyProducts,
    createProduct,
    createProductTemplate,
    updateProduct,
    setProductsAvailability,
    updateProductTemplate,
    updateProductTemplateImages
} from "../../../application/catalog/product.service"

export const ImagesList = inputObjectType({
    name: "ImagesList",
    definition(t) {
        t.nonNull.list.nonNull.string("images")
    },
})

async function publishPartnerCatalog(ctx: Context, partnerId: number) {
    const stores = await ctx.prisma.store.findMany({
        where: { partnerId, cloudSyncEnabled: true, status: 'ACTIVE' },
        select: { id: true },
    })
    await Promise.all(stores.map((store) => publishStoreProducts(ctx.prisma, store.id)))
}

const BulkProductAvailabilityResult = objectType({
    name: 'BulkProductAvailabilityResult',
    definition(t) {
        t.nonNull.list.nonNull.int('updatedIds')
        t.nonNull.list.nonNull.int('failedIds')
    },
})

const AdminPartnerProductUpdateInput = inputObjectType({
    name: 'AdminPartnerProductUpdateInput',
    definition(t) {
        t.nonNull.int('id')
        t.float('price')
        t.boolean('available')
        t.boolean('onlineVisible')
        t.boolean('priceOnRequest')
    },
})

async function deleteProductTemplatesSafely(ctx: Context, ids: number[]) {
    const uniqueIds = [...new Set(ids)]
    if (!uniqueIds.length || uniqueIds.length > 50 || uniqueIds.some((id) => !Number.isSafeInteger(id) || id < 1)) {
        throw new GraphQLError('Select between 1 and 50 valid product templates')
    }

    return ctx.prisma.$transaction(async (tx) => {
        const templates = await tx.productTemplate.findMany({
            where: { id: { in: uniqueIds } },
            include: { variants: { select: { id: true, _count: { select: { products: true } } } } },
        })
        if (templates.length !== uniqueIds.length) throw new GraphQLError('One or more product templates no longer exist')

        const blocked = templates.flatMap((template) => template.variants
            .filter((variant) => variant._count.products > 0)
            .map((variant) => ({ templateId: template.id, variantId: variant.id })))
        if (blocked.length) {
            throw new GraphQLError(`TEMPLATE_HAS_PARTNER_PRODUCTS:${blocked.map((item) => item.templateId).join(',')}`)
        }

        const variantIds = templates.flatMap((template) => template.variants.map((variant) => variant.id))
        if (variantIds.length) {
            await tx.productImage.deleteMany({ where: { variantId: { in: variantIds } } })
            await tx.tag.deleteMany({ where: { variantId: { in: variantIds } } })
            await tx.variant.deleteMany({ where: { id: { in: variantIds } } })
        }
        await tx.productImage.deleteMany({ where: { product_template_id: { in: uniqueIds } } })
        await tx.productTemplateRequest.updateMany({
            where: { approvedTemplateId: { in: uniqueIds } },
            data: { approvedTemplateId: null },
        })
        await tx.productTemplate.deleteMany({ where: { id: { in: uniqueIds } } })
        await tx.auditLog.create({
            data: {
                actorId: getUserId(ctx),
                action: 'PRODUCT_TEMPLATES_DELETED',
                entity: 'ProductTemplate',
                entityId: uniqueIds.join(','),
                metadata: { templateIds: uniqueIds, deletedVariantIds: variantIds },
            },
        })

        return templates
    }, { timeout: 15000 })
}

const ProductMutation = extendType({
    type: 'Mutation',
    definition(t) {

        t.field('createProduct', {
            type: 'Product',
            args: {
                variantId: nonNull(intArg()),
                price: floatArg(),
                costPrice: floatArg(),
                discount: floatArg(),
                available: booleanArg(),
                stock: intArg(),
                trackInventory: booleanArg(),
                reorderThreshold: intArg(),
                isVisibleInPos: booleanArg(),
                onlineVisible: booleanArg(),
                priceOnRequest: booleanArg(),
                isActive: booleanArg(),
                customName: stringArg(),
                customDescription: stringArg(),
                customImages: arg({ type: ImagesList }),
                vendorSku: stringArg(),
                vendorBarcode: stringArg(),
                notes: stringArg(),
            },
            resolve: async (_parent, data: any, ctx: Context) => {
                const userId = getUserId(ctx);
                const product = await createProduct(ctx.prisma, userId, {
                    ...data,
                    customImages: data.customImages?.images,
                })
                await publishPartnerCatalog(ctx, userId)
                return product
            },
        })

        t.boolean('createManyProducts', {
            args: {
                data: list("InputProductVariant")
            },
            resolve: async (_parent, { data }: { data?: any }, ctx: Context) => {
                const userId = getUserId(ctx)
                const created = await createManyProducts(ctx.prisma, userId, data ?? [])
                await publishPartnerCatalog(ctx, userId)
                return created
            },
        })
        t.field('updateProduct', {
            type: 'ProductView',
            args: {
                id: nonNull(intArg()),
                price: floatArg(),
                costPrice: floatArg(),
                discount: floatArg(),
                available: booleanArg(),
                stock: intArg(),
                trackInventory: booleanArg(),
                reorderThreshold: intArg(),
                isVisibleInPos: booleanArg(),
                onlineVisible: booleanArg(),
                priceOnRequest: booleanArg(),
                isActive: booleanArg(),
                customName: stringArg(),
                customDescription: stringArg(),
                customImages: arg({ type: ImagesList }),
                vendorSku: stringArg(),
                vendorBarcode: stringArg(),
                notes: stringArg(),
            },
            resolve: async (_parent, data, ctx: Context) => {
                const userId = getUserId(ctx)
                const updated = await updateProduct(ctx.prisma, userId, {
                    ...data,
                    customImages: data.customImages?.images,
                })
                await publishPartnerCatalog(ctx, userId)
                return updated
            },
        })

        t.field('setProductsAvailability', {
            type: BulkProductAvailabilityResult,
            args: {
                ids: nonNull(list(nonNull(intArg()))),
                available: nonNull(booleanArg()),
            },
            resolve: async (_parent, { ids, available }, ctx: Context) => {
                const userId = getUserId(ctx)
                const result = await setProductsAvailability(ctx.prisma, userId, ids, available)
                if (result.updatedIds.length) await publishPartnerCatalog(ctx, userId)
                return result
            },
        })

        t.field('deleteProduct', {
            type: 'Product',
            args: {
                id: nonNull(intArg()),
            },
            resolve: async (_parent, { id }, ctx: Context) => {
                const userId = getUserId(ctx)
                const product = await ctx.prisma.product.findFirst({
                    where: {
                        id,
                        partnerId: userId,
                    },
                })

                if (!product) {
                    throw new Error('Product not found')
                }

                const deletedProduct = await ctx.prisma.product.delete({
                    where: { id },
                })
                await publishPartnerCatalog(ctx, userId)
                return deletedProduct
            },
        })

        t.nonNull.int('adminUpdatePartnerProducts', {
            args: {
                partnerId: nonNull(intArg()),
                updates: nonNull(list(nonNull('AdminPartnerProductUpdateInput'))),
            },
            resolve: async (_parent, { partnerId, updates }, ctx: Context) => {
                const partner = await ctx.prisma.partner.findUnique({ where: { userId: partnerId }, select: { userId: true } })
                if (!partner) throw new GraphQLError('PARTNER_NOT_FOUND')
                const uniqueUpdates = [...new Map(updates.map((item: any) => [item.id, item])).values()]
                if (!uniqueUpdates.length || uniqueUpdates.length > 500) throw new GraphQLError('INVALID_PARTNER_PRODUCT_UPDATES')
                for (const update of uniqueUpdates) {
                    if (update.price != null && (!Number.isFinite(update.price) || update.price < 0)) throw new GraphQLError('INVALID_PRODUCT_PRICE')
                }
                return ctx.prisma.$transaction(async (tx) => {
                    const ids = uniqueUpdates.map((item: any) => item.id)
                    const existing = await tx.product.findMany({ where: { id: { in: ids }, partnerId }, select: { id: true, price: true, available: true, onlineVisible: true, priceOnRequest: true } })
                    if (existing.length !== ids.length) throw new GraphQLError('PARTNER_PRODUCTS_NOT_FOUND')
                    for (const update of uniqueUpdates) {
                        const before = existing.find((item) => item.id === update.id)!
                        const data: any = {}
                        for (const field of ['price', 'available', 'onlineVisible', 'priceOnRequest']) {
                            if (update[field] !== undefined && update[field] !== null) data[field] = update[field]
                        }
                        if (!Object.keys(data).length) continue
                        await tx.product.update({ where: { id: update.id }, data })
                        await tx.auditLog.create({ data: { actorId: getUserId(ctx), partnerId, action: 'PARTNER_CATALOG_PRODUCT_UPDATED', entity: 'Product', entityId: String(update.id), before, after: { ...before, ...data } } })
                    }
                    return uniqueUpdates.length
                }).then(async (count) => {
                    await publishPartnerCatalog(ctx, partnerId)
                    return count
                })
            },
        })

        t.nonNull.int('adminAddPartnerProducts', {
            args: {
                partnerId: nonNull(intArg()),
                data: nonNull(list(nonNull('InputProductVariant'))),
            },
            resolve: async (_parent, { partnerId, data }, ctx: Context) => {
                if (!data.length || data.length > 200) throw new GraphQLError('INVALID_PARTNER_PRODUCT_BATCH')
                const partner = await ctx.prisma.partner.findUnique({ where: { userId: partnerId }, select: { userId: true } })
                if (!partner) throw new GraphQLError('PARTNER_NOT_FOUND')
                const variantIds = [...new Set(data.map((item: any) => item.variantId))]
                if (variantIds.length !== data.length) throw new GraphQLError('DUPLICATE_VARIANT_IN_BATCH')
                const variants = await ctx.prisma.variant.findMany({ where: { id: { in: variantIds } }, select: { id: true } })
                if (variants.length !== variantIds.length) throw new GraphQLError('VARIANT_NOT_FOUND')
                for (const item of data) {
                    if (!Number.isFinite(item.price) || item.price < 0) throw new GraphQLError('INVALID_PRODUCT_PRICE')
                }
                return ctx.prisma.$transaction(async (tx) => {
                    const existing = await tx.product.findMany({ where: { partnerId, variantId: { in: variantIds } }, select: { id: true, variantId: true, isActive: true } })
                    const existingByVariant = new Map(existing.map((item) => [item.variantId, item]))
                    const toCreate = data.filter((item: any) => !existingByVariant.has(item.variantId))
                    const toRestore = data.filter((item: any) => existingByVariant.get(item.variantId)?.isActive === false)
                    for (const item of toRestore) {
                        const existingProduct = existingByVariant.get(item.variantId)!
                        await tx.product.update({ where: { id: existingProduct.id }, data: { price: item.price, available: true, onlineVisible: true, isActive: true } })
                    }
                    const created = toCreate.length ? await tx.product.createMany({ data: toCreate.map((item: any) => ({
                        partnerId,
                        variantId: item.variantId,
                        price: item.price,
                        available: item.available ?? true,
                        stock: 0,
                        trackInventory: true,
                        onlineVisible: item.onlineVisible ?? true,
                        isVisibleInPos: item.isVisibleInPos ?? true,
                        priceOnRequest: item.priceOnRequest ?? false,
                        isActive: item.isActive ?? true,
                    })) , skipDuplicates: true }) : { count: 0 }
                    const changedCount = created.count + toRestore.length
                    if (!changedCount) return 0
                    await tx.auditLog.create({ data: { actorId: getUserId(ctx), partnerId, action: 'PARTNER_CATALOG_PRODUCTS_ADDED', entity: 'Partner', entityId: String(partnerId), metadata: { variantIds: [...toCreate.map((item: any) => item.variantId), ...toRestore.map((item: any) => item.variantId)], count: changedCount, restored: toRestore.length } } })
                    return changedCount
                }).then(async (count) => {
                    if (count) await publishPartnerCatalog(ctx, partnerId)
                    return count
                })
            },
        })

        t.nonNull.int('adminRemovePartnerProducts', {
            args: { partnerId: nonNull(intArg()), ids: nonNull(list(nonNull(intArg()))) },
            resolve: async (_parent, { partnerId, ids }, ctx: Context) => {
                const uniqueIds = [...new Set<number>(ids)]
                if (!uniqueIds.length || uniqueIds.length > 500) throw new GraphQLError('INVALID_PARTNER_PRODUCT_IDS')
                const products = await ctx.prisma.product.findMany({ where: { id: { in: uniqueIds }, partnerId }, select: { id: true, isActive: true, available: true, onlineVisible: true } })
                if (products.length !== uniqueIds.length) throw new GraphQLError('PARTNER_PRODUCTS_NOT_FOUND')
                await ctx.prisma.$transaction(async (tx) => {
                    await tx.product.updateMany({ where: { id: { in: uniqueIds }, partnerId }, data: { isActive: false, available: false, onlineVisible: false } })
                    await tx.auditLog.create({ data: { actorId: getUserId(ctx), partnerId, action: 'PARTNER_CATALOG_PRODUCTS_REMOVED', entity: 'Partner', entityId: String(partnerId), before: products, metadata: { productIds: uniqueIds } } })
                })
                await publishPartnerCatalog(ctx, partnerId)
                return uniqueIds.length
            },
        })
    },
})


const ProductTemplateMutation = extendType({
    type: 'Mutation',
    definition(t) {
        t.field('createProductTemplate', {
            type: 'ProductTemplate',
            args: {
                name: nonNull(stringArg()),
                name_ar: stringArg(),
                description: stringArg(),
                description_ar: stringArg(),
                images: arg({ type: ImagesList }),
                category_id: nonNull(intArg()),
                product_type_id: intArg(),
                brand_id: nonNull(intArg())
            },
            resolve: async (_parent: any, data: any, ctx: Context) => {
                return createProductTemplate(ctx.prisma, {
                    ...data,
                    images: data.images?.images
                })
            },
        })

        t.field('updateProductTemplate', {
            type: 'ProductTemplate',
            args: {
                id: nonNull(intArg()),
                name: stringArg(),
                name_ar: stringArg(),
                description: stringArg(),
                description_ar: stringArg(),
                category_id: intArg(),
                product_type_id: intArg(),
                brand_id: intArg(),
            },
            resolve: async (_parent, data: any, ctx: Context) => {
                return updateProductTemplate(ctx.prisma, data)
            },
        })

        t.list.field('updateProductTemplateImages', {
            type: "ProductImage",
            args: {
                id: nonNull(intArg()),
                images: arg({ type: ImagesList }),
            },
            resolve: async (_parent, data: any, ctx: Context) => {
                return updateProductTemplateImages(ctx.prisma, data.id, data.images?.images ?? [])
            },
        })

        t.field('deleteProductTemplate', {
            type: 'ProductTemplate',
            args: {
                id: nonNull(intArg()),
            },
            resolve: async (_parent, { id }, ctx: Context) => {
                const deleted = await deleteProductTemplatesSafely(ctx, [id])
                return deleted[0]
            },
        })
        t.nonNull.int('deleteProductTemplates', {
            args: { ids: nonNull(list(nonNull(intArg()))) },
            resolve: async (_parent, { ids }: { ids: number[] }, ctx: Context) => {
                const deleted = await deleteProductTemplatesSafely(ctx, ids)
                return deleted.length
            },
        })
        t.nonNull.field('mergeProductTemplates', {
            type: 'ProductTemplate',
            args: {
                targetId: nonNull(intArg()),
                sourceIds: nonNull(list(nonNull(intArg()))),
            },
            resolve: async (_parent, { targetId, sourceIds }, ctx: Context) => {
                const sources = [...new Set<number>(sourceIds)].filter((id) => id !== targetId)
                if (!Number.isSafeInteger(targetId) || targetId < 1 || !sources.length || sources.length > 50) throw new GraphQLError('INVALID_TEMPLATE_MERGE')

                return ctx.prisma.$transaction(async (tx) => {
                    const [target, sourceTemplates] = await Promise.all([
                        tx.productTemplate.findUnique({ where: { id: targetId } }),
                        tx.productTemplate.findMany({
                            where: { id: { in: sources } },
                            include: {
                                variants: {
                                    select: {
                                        id: true, name: true, name_ar: true, sku: true, barcode: true,
                                        tags: { select: { value: true } },
                                        images: { select: { url: true } },
                                    },
                                },
                                images: { select: { url: true } },
                            },
                        }),
                    ])
                    if (!target) throw new GraphQLError('MERGE_TARGET_NOT_FOUND')
                    if (sourceTemplates.length !== sources.length) throw new GraphQLError('MERGE_SOURCE_NOT_FOUND')
                    if (sourceTemplates.some((source) => source.category_id !== target.category_id)) throw new GraphQLError('MERGE_CATEGORY_MISMATCH')

                    const sourceIdsSet = sourceTemplates.map((source) => source.id)
                    const sourceImageRows = await tx.productImage.findMany({ where: { product_template_id: { in: sourceIdsSet } }, select: { id: true, url: true } })
                    const targetImages = await tx.productImage.findMany({ where: { product_template_id: targetId }, select: { url: true } })
                    const targetImageUrls = new Set(targetImages.map((image) => image.url))
                    let movedImageCount = 0
                    for (const image of sourceImageRows) {
                        if (targetImageUrls.has(image.url)) await tx.productImage.delete({ where: { id: image.id } })
                        else {
                            await tx.productImage.update({ where: { id: image.id }, data: { product_template_id: targetId } })
                            movedImageCount += 1
                        }
                    }

                    const movedVariantIds = sourceTemplates.flatMap((source) => source.variants.map((variant) => variant.id))
                    if (movedVariantIds.length) await tx.variant.updateMany({ where: { id: { in: movedVariantIds } }, data: { productId: targetId } })
                    await tx.productTemplateRequest.updateMany({ where: { approvedTemplateId: { in: sourceIdsSet } }, data: { approvedTemplateId: targetId } })
                    await tx.productTemplateRequest.updateMany({ where: { mergedIntoTemplateId: { in: sourceIdsSet } }, data: { mergedIntoTemplateId: targetId } })

                    const contributions = await tx.catalogContribution.findMany({
                        where: {
                            kind: 'PRODUCT',
                            OR: sourceIdsSet.map((sourceId) => ({ payload: { path: ['mergeTemplateId'], equals: sourceId } })),
                        },
                        select: { id: true, payload: true },
                    })
                    for (const contribution of contributions) {
                        const payload = contribution.payload as Record<string, unknown>
                        if (typeof payload?.mergeTemplateId === 'number' && sourceIdsSet.includes(payload.mergeTemplateId)) {
                            await tx.catalogContribution.update({ where: { id: contribution.id }, data: { payload: { ...payload, mergeTemplateId: targetId } } })
                        }
                    }

                    await tx.productTemplate.deleteMany({ where: { id: { in: sourceIdsSet } } })
                    await tx.auditLog.create({ data: {
                        actorId: getUserId(ctx), action: 'PRODUCT_TEMPLATES_MERGED', entity: 'ProductTemplate', entityId: String(targetId),
                        metadata: {
                            targetId,
                            sourceIds: sourceIdsSet,
                            movedVariantIds,
                            movedImageCount,
                            removedDuplicateImageCount: sourceImageRows.length - movedImageCount,
                            sourceSnapshots: sourceTemplates.map((source) => ({
                                id: source.id,
                                name: source.name,
                                name_ar: source.name_ar,
                                description: source.description,
                                description_ar: source.description_ar,
                                category_id: source.category_id,
                                product_type_id: source.product_type_id,
                                brand_id: source.brand_id,
                                images: source.images.map((image) => image.url),
                                variants: source.variants,
                            })),
                        },
                    } })
                    return tx.productTemplate.findUniqueOrThrow({ where: { id: targetId } })
                }, { timeout: 15000 })
            },
        })
    },
})

const InputProductVariant = inputObjectType({
    name: "InputProductVariant",
    definition(t) {
        t.nonNull.int("variantId")
        t.nonNull.float("price")
        t.int("stock")
        t.boolean("trackInventory")
        t.boolean("available")
        t.float("discount")
        t.int("reorderThreshold")
        t.boolean("isVisibleInPos")
        t.boolean("onlineVisible")
        t.boolean("priceOnRequest")
        t.boolean("isActive")
    },
})
export default {
    InputProductVariant,
    AdminPartnerProductUpdateInput,
    BulkProductAvailabilityResult,
    ProductMutation,
    ProductTemplateMutation
}
