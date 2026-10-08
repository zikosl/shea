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
                const deletedProduct = await ctx.prisma.productTemplate.delete({
                    where: { id },
                })
                return deletedProduct
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
    BulkProductAvailabilityResult,
    ProductMutation,
    ProductTemplateMutation
}
