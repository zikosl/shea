import { Prisma } from "@prisma/client"
import { objectType } from "nexus"
import { getUserId, getOptionalUserId } from "../../../utils"

type ProductCatalogDetails = {
    name: string | null
    name_ar: string | null
    variantName: string | null
    variantNameAr: string | null
    sku: string | null
    images: Array<{ id: number; url: string; altText: string | null; variantId: number | null; product_template_id: number | null }>
}

const productCatalogCache = new WeakMap<object, Promise<ProductCatalogDetails>>()

const getProductCatalogDetails = (parent: Record<string, unknown>, ctx: any) => {
    const cached = productCatalogCache.get(parent)
    if (cached) return cached

    const details = ctx.prisma.variant.findUnique({
        where: { id: parent.variantId as number },
        select: {
            name: true,
            name_ar: true,
            sku: true,
            images: true,
            product: { select: { name: true, name_ar: true } },
        },
    }).then((variant: any) => ({
        name: (parent.customName as string | null) || variant?.product.name || null,
        name_ar: (parent.customName as string | null) || variant?.product.name_ar || null,
        variantName: variant?.name || null,
        variantNameAr: variant?.name_ar || null,
        sku: (parent.vendorSku as string | null) || variant?.sku || null,
        images: variant?.images || [],
    }))

    productCatalogCache.set(parent, details)
    return details
}


const Product = objectType({
    name: 'Product',
    definition(t) {
        t.nonNull.int('id')
        t.float('price', {
            resolve: parent => parent.priceOnRequest ? 0 : parent.price,
        })
        t.float('costPrice')
        t.float('discount')
        t.boolean('available')
        t.int('stock')
        t.boolean('trackInventory', {
            resolve: async (parent, _args, ctx) => {
                if (typeof parent.trackInventory === 'boolean') return parent.trackInventory
                const product = await ctx.prisma.product.findUnique({ where: { id: parent.id }, select: { trackInventory: true } })
                return product?.trackInventory ?? true
            },
        })
        t.int('reorderThreshold')
        t.boolean('isVisibleInPos')
        t.boolean('onlineVisible')
        t.boolean('priceOnRequest', {
            resolve: parent => parent.priceOnRequest ?? false,
        })
        t.boolean('isActive')
        t.string('customName')
        t.string('customDescription')
        t.list.string('customImages')
        t.string('vendorSku')
        t.string('vendorBarcode')
        t.string('notes')
        t.int('partnerId')
        t.int('variantId')
        t.string('name', {
            resolve: async (parent, _args, ctx) => (await getProductCatalogDetails(parent, ctx)).name,
        })
        t.string('name_ar', {
            resolve: async (parent, _args, ctx) => (await getProductCatalogDetails(parent, ctx)).name_ar,
        })
        t.string('variantName', {
            resolve: async (parent, _args, ctx) => (await getProductCatalogDetails(parent, ctx)).variantName,
        })
        t.string('variantNameAr', {
            resolve: async (parent, _args, ctx) => (await getProductCatalogDetails(parent, ctx)).variantNameAr,
        })
        t.string('sku', {
            resolve: async (parent, _args, ctx) => (await getProductCatalogDetails(parent, ctx)).sku,
        })
        t.nonNull.list.nonNull.field('images', {
            type: 'ProductImage',
            resolve: async (parent, _args, ctx) => (await getProductCatalogDetails(parent, ctx)).images,
        })
        t.field('image', {
            type: 'ProductImage',
            resolve: async (parent, _args, ctx) => (await getProductCatalogDetails(parent, ctx)).images[0] ?? null,
        })

        t.field('partner', {
            type: 'Partner',
            resolve: async (parent, _args, ctx) => {
                return ctx.prisma.partner.findUnique({
                    where: { userId: parent.partnerId ?? undefined },
                })
            },
        })

        t.field('variant', {
            type: 'Variant',
            resolve: async (parent, _args, ctx) => {
                return ctx.prisma.variant.findUnique({
                    where: { id: parent.variantId ?? undefined },
                })
            },
        })
    },
})

const ProductTemplate = objectType({
    name: 'ProductTemplate',
    definition(t) {
        t.nonNull.int('id')
        t.string('name')
        t.string('name_ar')
        t.string('description')
        t.string('description_ar')
        t.int('product_type_id')

        t.field('productType', {
            type: 'ProductType',
            resolve: async (parent, _args, ctx) => {
                if (!parent.product_type_id) return null
                return ctx.prisma.productType.findUnique({
                    where: { id: parent.product_type_id },
                })
            },
        })

        t.int('category_id')
        t.field('category', {
            type: 'Category',
            resolve: async (parent, _args, ctx) => {
                return ctx.prisma.category.findUnique({
                    where: { id: parent.category_id ?? undefined },
                })
            },
        })

        t.int('niche_id')
        t.field('niche', {
            type: 'Niche',
            resolve: async (parent, _args, ctx) => {
                return ctx.prisma.niche.findUnique({
                    where: { id: parent.niche_id ?? undefined },
                })
            },
        })

        t.int('brand_id')
        t.field('brand', {
            type: 'Brand',
            resolve: async (parent, _args, ctx) => {
                return parent.brand_id
                    ? ctx.prisma.brand.findUnique({ where: { id: parent.brand_id ?? undefined } })
                    : null
            },
        })

        t.list.field('variants', {
            type: 'Variant',
            resolve: async (parent, _args, ctx) => {
                let where: Prisma.VariantWhereInput = { productId: parent.id };
                const userId = getUserId(ctx);
                const partner = await ctx.prisma.partner.findUnique({ where: { userId }, select: { userId: true } })
                if (partner) {
                    const products = await ctx.prisma.product.findMany({
                        where: {
                            partnerId: partner.userId,
                        },
                        select: {
                            variantId: true
                        }
                    })
                    where = {
                        ...where,
                        id: {
                            notIn: products.map((v: { variantId: number }) => v.variantId)
                        }
                    }
                }
                return ctx.prisma.variant.findMany({
                    where: where,
                })
            },
        })


        t.list.field('images', {
            type: 'ProductImage',
            resolve: async (parent, _args, ctx) => {
                return ctx.prisma.productImage.findMany({
                    where: { product_template_id: parent.id },
                })
            },
        })
    },
})



const ProductView = objectType({
    name: 'ProductView',
    definition(t) {
        t.nonNull.int('id')
        t.string('name')
        t.string('name_ar')
        t.string('sku')
        t.string('variantName')
        t.string('variantNameAr', {
            resolve: async (parent, _args, ctx) => {
                const variant = await ctx.prisma.variant.findUnique({ where: { id: parent.variantId }, select: { name_ar: true } })
                return variant?.name_ar ?? null
            },
        })
        t.float('price', {
            resolve: parent => parent.priceOnRequest ? 0 : parent.price,
        })
        t.float('costPrice')
        t.float('discount')
        t.int('stock')
        t.boolean('trackInventory', {
            resolve: async (parent, _args, ctx) => {
                const product = await ctx.prisma.product.findUnique({ where: { id: parent.id }, select: { trackInventory: true } })
                return product?.trackInventory ?? true
            },
        })
        t.int('reorderThreshold')
        t.boolean('available')
        t.boolean('isVisibleInPos')
        t.boolean('onlineVisible')
        t.boolean('priceOnRequest', {
            resolve: parent => parent.priceOnRequest ?? false,
        })
        t.boolean('isActive')
        t.string('customName')
        t.string('customDescription')
        t.list.string('customImages')
        t.string('vendorSku')
        t.string('vendorBarcode')
        t.string('notes')
        t.int('partnerId')
        t.int('product_template_id')
        t.int('variantId')
        t.int('product_type_id')
        t.int('brand_id')
        t.int('category_id')

        t.list.field("tags", {
            type: "Tag",
            resolve: (parent, _args, ctx) => {
                return ctx.prisma.tag
                    .findMany({
                        where: { variantId: parent.variantId ?? undefined },
                    });
            },
        });
        t.nonNull.list.field('images', {
            type: 'ProductImage',
            resolve: async (parent, _args, ctx) => {
                return ctx.prisma.productImage.findMany({
                    where: { variantId: parent.variantId },
                })
            }
        })
        t.field('image', {
            type: 'ProductImage',
            resolve: async (parent, _args, ctx) => {
                return ctx.prisma.productImage.findFirst({
                    where: { variantId: parent.variantId },
                })
            }
        })
        t.field('partner', {
            type: 'Partner',
            resolve: async (parent, _args, ctx) =>
                ctx.prisma.partner.findUnique({
                    where: { userId: parent.partnerId ?? undefined },
                }),
        })

        t.field('productType', {
            type: 'ProductType',
            resolve: async (parent, _args, ctx) => parent.product_type_id
                ? ctx.prisma.productType.findUnique({ where: { id: parent.product_type_id } })
                : null,
        })

        t.field('brand', {
            type: 'Brand',
            resolve: async (parent, _args, ctx) =>
                parent.brand_id
                    ? ctx.prisma.brand.findUnique({ where: { id: parent.brand_id ?? undefined } })
                    : null,
        })

        t.field('category', {
            type: 'Category',
            resolve: async (parent, _args, ctx) =>
                ctx.prisma.category.findUnique({
                    where: { id: parent.category_id ?? undefined },
                }),
        })
    },
})



const ProductResult = objectType({
    name: 'ProductResult',
    definition(t) {
        t.nonNull.list.nonNull.field('products', { type: 'Product' })
        t.int('totalProducts')
    },
})

const ProductTemplateResult = objectType({
    name: 'ProductTemplateResult',
    definition(t) {
        t.nonNull.list.nonNull.field('productTemplates', { type: 'ProductTemplate' })
        t.int('totalProductTemplates')
    },
})




const ProductViewResult = objectType({
    name: 'ProductViewResult',
    definition(t) {
        t.nonNull.list.nonNull.field('products', { type: 'ProductView' })
        t.int('totalProducts')
    },
})



const ProductTemplatePartnerPreview = objectType({
    name: 'ProductTemplatePartnerPreview',
    definition(t) {
        // Composite identity (logical ID, not GraphQL ID)
        t.nonNull.int('product_template_id');
        t.nonNull.int('partnerId');

        // ProductTemplate fields
        t.nonNull.string('name');
        t.nonNull.string('name_ar');
        t.nonNull.string('description');
        t.string('description_ar', {
            resolve: async (parent, _args, ctx) => {
                const template = await ctx.prisma.productTemplate.findUnique({ where: { id: parent.product_template_id }, select: { description_ar: true } })
                return template?.description_ar ?? ''
            },
        });
        t.nullable.int('product_type_id', { resolve: (parent) => parent.product_type_id ?? null });
        t.nonNull.int('category_id');
        t.int('brand_id');

        // Variant fields
        t.nonNull.int('variantId');
        t.string('variant_name');
        t.string('variant_name_ar', {
            resolve: async (parent, _args, ctx) => {
                const variant = await ctx.prisma.variant.findUnique({ where: { id: parent.variantId }, select: { name_ar: true } })
                return variant?.name_ar ?? null
            },
        });
        t.string('variant_sku');

        // Product fields
        t.nonNull.int('product_id');
        t.nonNull.float('price', {
            resolve: parent => parent.priceOnRequest ? 0 : parent.price,
        });
        t.float('costPrice');
        t.nonNull.float('discount');
        t.nonNull.boolean('available');
        t.nonNull.int('stock');
        t.nonNull.boolean('trackInventory', {
            resolve: async (parent, _args, ctx) => {
                const product = await ctx.prisma.product.findUnique({ where: { id: parent.product_id }, select: { trackInventory: true } })
                return product?.trackInventory ?? true
            },
        });
        t.nonNull.int('reorderThreshold');
        t.nonNull.boolean('isVisibleInPos');
        t.nonNull.boolean('onlineVisible');
        t.nonNull.boolean('priceOnRequest', {
            resolve: parent => parent.priceOnRequest ?? false,
        });
        t.nonNull.boolean('isActive');
        t.string('customName');
        t.string('customDescription');
        t.list.string('customImages');
        t.string('vendorSku');
        t.string('vendorBarcode');
        t.string('notes');
        t.field('image', {
            type: 'ProductImage',
            resolve: async (parent, _args, ctx) => {
                return ctx.prisma.productImage.findFirst({
                    where: { variantId: parent.variantId },
                })
            }
        });
        t.nonNull.list.field('images', {
            type: 'ProductImage',
            resolve: async (parent, _args, ctx) => {
                return ctx.prisma.productImage.findMany({
                    where: { product_template_id: parent.product_template_id },
                })
            }
        })
        t.nonNull.list.field('products', {
            type: 'ProductView',
            resolve: async (parent, _args, ctx) => {
                return ctx.prisma.productView.findMany({
                    where: { product_template_id: parent.product_template_id, partnerId: parent.partnerId, ...(!getOptionalUserId(ctx) ? { isActive: true } : {}) },
                })
            }
        })
    },
});



const ProductTemplatePartnerPreviewResult = objectType({
    name: 'ProductTemplatePartnerPreviewResult',
    definition(t) {
        t.nonNull.list.nonNull.field('productPartners', { type: 'ProductTemplatePartnerPreview' })
        t.int('totalProductPartners')
    },
})


export default { Product, ProductTemplatePartnerPreview, ProductTemplatePartnerPreviewResult, ProductTemplate, ProductTemplateResult, ProductView, ProductResult, ProductViewResult } 
