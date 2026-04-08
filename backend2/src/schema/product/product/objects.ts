import { Prisma } from "@prisma/client"
import { objectType } from "nexus"
import { getUserId } from "../../../utils"


const Product = objectType({
    name: 'Product',
    definition(t) {
        t.nonNull.int('id')
        t.float('price')
        t.boolean('available')
        t.int('stock')
        t.int('partnerId')
        t.int('variantId')

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
        t.int('product_type_id')

        t.field('productType', {
            type: 'ProductType',
            resolve: async (parent, _args, ctx) => {
                return ctx.prisma.productType.findUnique({
                    where: { id: parent.product_type_id ?? undefined },
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
                            notIn: products.map(v => v.variantId)
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
        t.float('price')
        t.int('stock')
        t.boolean('available')
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
            resolve: async (parent, _args, ctx) =>
                ctx.prisma.productType.findUnique({
                    where: { id: parent.product_type_id ?? undefined },
                }),
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
        t.nonNull.int('product_type_id');
        t.nonNull.int('category_id');
        t.int('brand_id');

        // Variant fields
        t.nonNull.int('variantId');
        t.string('variant_name');
        t.string('variant_sku');

        // Product fields
        t.nonNull.int('product_id');
        t.nonNull.float('price');
        t.nonNull.boolean('available');
        t.nonNull.int('stock');
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
                console.log("product");
                return ctx.prisma.productView.findMany({
                    where: { product_template_id: parent.product_template_id, partnerId: parent.partnerId },
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
