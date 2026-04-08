import { objectType } from "nexus"



const Tag = objectType({
    name: "Tag",
    definition(t) {
        t.nonNull.int("id")
        t.nonNull.string('value')
        t.nonNull.int('variantId')
    }
})

const Variant = objectType({
    name: 'Variant',
    definition(t) {
        t.nonNull.int('id')
        t.nullable.string('name') // e.g. "Banana flavor"
        t.nullable.string('sku')
        t.nonNull.int('productId')

        t.list.field("tags", {
            type: "Tag",
            resolve: (parent, _args, ctx) => {
                return ctx.prisma.tag
                    .findMany({
                        where: { variantId: parent.id },
                    });
            },
        });

        t.field('product', {
            type: 'ProductTemplate',
            resolve: async (parent, _args, ctx) => {
                return ctx.prisma.productTemplate.findUnique({
                    where: { id: parent.productId },
                })
            },
        })

        t.string('image', {
            resolve: async (parent, _args, ctx) => {
                const image = await ctx.prisma.productImage.findFirst({
                    where: { variantId: parent.id },
                })
                return image?.url ?? ""
            },
        })
        t.list.field('images', {
            type: 'ProductImage',
            resolve: async (parent, _args, ctx) => {
                return ctx.prisma.productImage.findMany({
                    where: { variantId: parent.id },
                })
            },
        })

        t.list.field('products', {
            type: 'Product',
            resolve: async (parent, _args, ctx) => {
                return ctx.prisma.product.findMany({
                    where: { variantId: parent.id },
                })
            },
        })
    },
})


const ProductImage = objectType({
    name: 'ProductImage',
    definition(t) {
        t.nonNull.int('id')
        t.nonNull.string('url')      // stored path or S3 URL
        t.nullable.string('altText')

        t.nullable.int('variantId')
        t.nullable.int('product_template_id')

        t.field('variant', {
            type: 'Variant',
            resolve: async (parent, _args, ctx) => {
                if (!parent.variantId) return null
                return ctx.prisma.variant.findUnique({
                    where: { id: parent.variantId },
                })
            },
        })

        t.field('productTemplate', {
            type: 'ProductTemplate',
            resolve: async (parent, _args, ctx) => {
                if (!parent.product_template_id) return null
                return ctx.prisma.productTemplate.findUnique({
                    where: { id: parent.product_template_id },
                })
            },
        })
    },
})











const VariantResult = objectType({
    name: 'VariantResult',
    definition(t) {
        t.nonNull.list.nonNull.field('variants', { type: 'Variant' })
        t.int('totalVariants')
    },
})






export default { ProductImage, Variant, VariantResult, Tag } 
