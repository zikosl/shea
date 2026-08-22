// @ts-nocheck
import { arg, intArg, nonNull, inputObjectType, list, extendType, stringArg, floatArg, booleanArg } from "nexus"
import { getUserId } from "../../../utils"
import { Context } from "../../../context"
import {
    createManyProducts,
    createProduct,
    createProductTemplate,
    updateProduct,
    updateProductTemplate,
    updateProductTemplateImages
} from "../../../application/catalog/product.service"

export const ImagesList = inputObjectType({
    name: "ImagesList",
    definition(t) {
        t.nonNull.list.nonNull.string("images")
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
                reorderThreshold: intArg(),
                isVisibleInPos: booleanArg(),
                onlineVisible: booleanArg(),
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
                return createProduct(ctx.prisma, userId, {
                    ...data,
                    customImages: data.customImages?.images,
                })
            },
        })

        t.boolean('createManyProducts', {
            args: {
                data: list("InputProductVariant")
            },
            resolve: async (_parent, { data }: { data?: any }, ctx: Context) => {
                const userId = getUserId(ctx)
                return createManyProducts(ctx.prisma, userId, data ?? [])
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
                reorderThreshold: intArg(),
                isVisibleInPos: booleanArg(),
                onlineVisible: booleanArg(),
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
                return updateProduct(ctx.prisma, userId, {
                    ...data,
                    customImages: data.customImages?.images,
                })
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
                description: stringArg(),
                images: arg({ type: ImagesList }),
                product_type_id: nonNull(intArg()),
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
                description: stringArg(),
                // product_type_id: intArg(),
                // brand_id: intArg()
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
    },
})

const InputProductVariant = inputObjectType({
    name: "InputProductVariant",
    definition(t) {
        t.nonNull.int("variantId")
        t.nonNull.float("price")
        t.int("stock")
        t.boolean("available")
        t.float("discount")
        t.int("reorderThreshold")
        t.boolean("isVisibleInPos")
        t.boolean("onlineVisible")
        t.boolean("isActive")
    },
})
export default {
    InputProductVariant,
    ProductMutation,
    ProductTemplateMutation
}
