import { arg, intArg, list, inputObjectType, nonNull, extendType, stringArg, floatArg, booleanArg } from "nexus"
import { Context } from "../../../context"
import { GraphQLError } from 'graphql';



const UpdateVariantInput = inputObjectType({
    name: "UpdateVariantInput",
    definition(t) {
        t.string("name")
        t.string("description")
        t.string("sku") // optional manual SKU override
        t.list.string("tags")
        t.list.nonNull.string("images") // URLs of new images
    },
})



const ProductVariantInput = inputObjectType({
    name: "ProductVariantInput",
    definition(t) {
        t.string("name")
        t.string("description")
        t.string("sku")
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
            resolve: async (_parent, { productId, data }: { productId: number, data: Array<{ name?: string | null; description?: string | null; sku?: string | null; tags?: Array<string | null> | null }> }, ctx: Context) => {
                const product = await ctx.prisma.productTemplate.findUnique({
                    where: { id: productId },
                });
                if (!product) throw new GraphQLError("Product template not found");

                const variants = data.map((variant) => {
                    const providedName = variant.name?.trim() || null;
                    const tags = Array.from(new Set(
                        (variant.tags ?? [])
                            .filter((tag): tag is string => Boolean(tag?.trim()))
                            .map((tag) => tag.trim()),
                    ));
                    if (!providedName && !tags.length) {
                        throw new GraphQLError("Every variant needs a name or at least one tag");
                    }

                    const suffix = tags
                        .map((tag) => tag.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, ""))
                        .filter(Boolean)
                        .join("-");
                    const productSlug = product.name
                        .toUpperCase()
                        .replace(/[^A-Z0-9]+/g, "-")
                        .replace(/^-|-$/g, "") || `PRODUCT-${productId}`;

                    const name = providedName ?? tags.join(" / ");
                    const generatedSuffix = suffix || name.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "") || "VARIANT";
                    return {
                        name,
                        description: variant.description?.trim() || null,
                        sku: variant.sku?.trim() || `${productSlug}-${generatedSuffix}`.substring(0, 50),
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
                            description: variant.description,
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
            resolve: async (_parent, { id, data }: { id: number; data: { name?: string | null; description?: string | null; sku?: string | null; tags?: string[] | null; images?: string[] | null } }, ctx: Context) => {
                // Step 1: Fetch variant
                const variant = await ctx.prisma.variant.findUnique({
                    where: { id },
                    include: { tags: true },
                });
                if (!variant) throw new Error("Variant not found");

                const tags: string[] = data.tags === undefined
                    ? variant.tags.map((tag) => tag.value)
                    : Array.from(new Set((data.tags ?? []).map((tag: string) => tag.trim()).filter(Boolean)));
                const name = data.name === undefined ? variant.name : data.name?.trim() || null;
                if (!name && !tags.length) {
                    throw new GraphQLError("Every variant needs a name or at least one tag");
                }
                const sku = data.sku === undefined ? variant.sku : data.sku?.trim() || null;

                // Step 3: Update variant basic info
                await ctx.prisma.$transaction(async (tx) => {
                    await tx.variant.update({
                        where: { id },
                        data: {
                            name,
                            description: data.description === undefined ? variant.description : data.description?.trim() || null,
                            sku,
                        },
                    });
                    if (data.tags !== undefined) {
                        await tx.tag.deleteMany({ where: { variantId: id } });
                        if (tags.length) await tx.tag.createMany({ data: tags.map((value) => ({ value, variantId: id })) });
                    }
                    if (data.images) {
                        await tx.productImage.deleteMany({ where: { variantId: id } });
                        if (data.images.length) {
                            await tx.productImage.createMany({ data: data.images.map((url: string) => ({ url, variantId: id })) });
                        }
                    }
                });

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
                const variantCount = await ctx.prisma.variant.count({ where: { productId: variant.productId } });
                if (variantCount <= 1) {
                    throw new GraphQLError("A product template must keep at least one variant");
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
