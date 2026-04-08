import { arg, intArg, list, inputObjectType, nonNull, extendType, stringArg, floatArg, booleanArg } from "nexus"
import { Context } from "../../../context"
import { GraphQLError } from 'graphql';



const UpdateVariantInput = inputObjectType({
    name: "UpdateVariantInput",
    definition(t) {
        t.string("name")
        t.string("sku") // optional manual SKU override
        t.list.nonNull.string("images") // URLs of new images
    },
})



const ProductVariantInput = inputObjectType({
    name: "ProductVariantInput",
    definition(t) {
        t.list.string("tags")
    },
})

export const VariantMutation = extendType({
    type: "Mutation",
    definition(t) {
        t.nonNull.list.nonNull.field("createVariant", {
            type: "Variant",
            args: {
                productId: nonNull(intArg()),
                data: nonNull(list(nonNull("ProductVariantInput"))),
            },
            resolve: async (_parent, { productId, data }: { productId: number, data: Array<{ tags?: Array<string | null> | null }> }, ctx: Context) => {
                // Step 1: Get product name
                try {
                    const result: any = [];
                    const items: {
                        name: string
                        sku: string
                        productId: number
                    }[] = []
                    const product = await ctx.prisma.productTemplate.findUnique({
                        where: { id: productId },
                    });
                    if (!product) throw new Error("Product not found");

                    for (const variant of data) {
                        const tags = (variant.tags ?? []).filter((tag): tag is string => Boolean(tag))
                        const variantName = `${product.name} ${tags.join(" ")}`.trim();
                        const sku = `${product.name.toUpperCase().replace(/\s+/g, "-")}-${tags.map(tag => tag.toUpperCase().substring(0, 5)).join("-")}`.substring(0, 50);

                        items.push({
                            name: variantName,
                            sku,
                            productId,
                        });
                    }

                    const createdVariants = await ctx.prisma.variant.createManyAndReturn({
                        data: items,
                    });
                    result.push(...createdVariants);
                    return result;
                } catch (error) {
                    console.log(error)
                    throw new GraphQLError("Something Wrong")
                }
            },
        })
        t.field("updateVariant", {
            type: "Variant",
            args: {
                id: nonNull(intArg()),
                data: nonNull(arg({ type: "UpdateVariantInput" })),
            },
            resolve: async (_parent, { id, data }, ctx: Context) => {
                // Step 1: Fetch variant
                const variant = await ctx.prisma.variant.findUnique({
                    where: { id },
                });
                if (!variant) throw new Error("Variant not found");

                // Step 2: Determine new SKU
                let sku = data.sku ?? variant.sku;

                // Step 3: Update variant basic info
                await ctx.prisma.variant.update({
                    where: { id },
                    data: {
                        name: data.name ?? variant.name,
                        sku,
                    },
                });


                // Step 5: Attach new images if provided
                if (data.images && data.images.length > 0) {
                    await ctx.prisma.productImage.deleteMany({
                        where: { variantId: id },
                    });
                    await ctx.prisma.productImage.createMany({
                        data: data.images.map(url => ({ url, variantId: id })),
                    });
                }

                // Step 6: Return updated variant
                return ctx.prisma.variant.findUnique({
                    where: { id },
                });
            },
        });
    },
});


export default { VariantMutation, UpdateVariantInput, ProductVariantInput }
