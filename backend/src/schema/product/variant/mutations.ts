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
                const product = await ctx.prisma.productTemplate.findUnique({
                    where: { id: productId },
                });
                if (!product) throw new GraphQLError("Product template not found");

                const variants = data.map((variant) => {
                    const tags = Array.from(new Set(
                        (variant.tags ?? [])
                            .filter((tag): tag is string => Boolean(tag?.trim()))
                            .map((tag) => tag.trim()),
                    ));
                    if (!tags.length) throw new GraphQLError("Every variant needs at least one value");

                    const suffix = tags
                        .map((tag) => tag.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, ""))
                        .filter(Boolean)
                        .join("-");
                    const productSlug = product.name
                        .toUpperCase()
                        .replace(/[^A-Z0-9]+/g, "-")
                        .replace(/^-|-$/g, "") || `PRODUCT-${productId}`;

                    return {
                        name: `${product.name} ${tags.join(" / ")}`,
                        sku: `${productSlug}-${suffix}`.substring(0, 50),
                        tags,
                    };
                });

                const uniqueSkus = new Set(variants.map((variant) => variant.sku));
                if (uniqueSkus.size !== variants.length) {
                    throw new GraphQLError("Duplicate variant combinations are not allowed");
                }

                const existing = await ctx.prisma.variant.findFirst({
                    where: { productId, sku: { in: [...uniqueSkus] } },
                    select: { id: true },
                });
                if (existing) throw new GraphQLError("One or more variant combinations already exist");

                return ctx.prisma.$transaction(
                    variants.map((variant) => ctx.prisma.variant.create({
                        data: {
                            name: variant.name,
                            sku: variant.sku,
                            productId,
                            tags: {
                                create: variant.tags.map((value) => ({ value })),
                            },
                        },
                    })),
                );
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
                if (data.images) {
                    await ctx.prisma.productImage.deleteMany({
                        where: { variantId: id },
                    });
                    if (data.images.length > 0) {
                        await ctx.prisma.productImage.createMany({
                            data: data.images.map((url: string) => ({ url, variantId: id })),
                        });
                    }
                }

                // Step 6: Return updated variant
                return ctx.prisma.variant.findUnique({
                    where: { id },
                });
            },
        });
        t.field("deleteVariant", {
            type: "Variant",
            args: {
                id: nonNull(intArg()),
            },
            resolve: async (_parent, { id }, ctx: Context) => {
                const variant = await ctx.prisma.variant.findUnique({
                    where: { id },
                    include: { _count: { select: { products: true } } },
                });
                if (!variant) throw new GraphQLError("Variant not found");
                if (variant._count.products > 0) {
                    throw new GraphQLError("This variant is used by partner products and cannot be deleted");
                }

                return ctx.prisma.$transaction(async (tx) => {
                    await tx.productImage.deleteMany({ where: { variantId: id } });
                    await tx.tag.deleteMany({ where: { variantId: id } });
                    return tx.variant.delete({ where: { id } });
                });
            },
        });
    },
});


export default { VariantMutation, UpdateVariantInput, ProductVariantInput }
