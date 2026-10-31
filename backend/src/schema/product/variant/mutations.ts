import { arg, intArg, list, inputObjectType, nonNull, extendType, stringArg, floatArg, booleanArg } from "nexus"
import { Context } from "../../../context"
import { GraphQLError } from 'graphql';
import { getUserId } from "../../../utils";
import { requireGtin } from "../../../modules/catalog/barcodes";



const UpdateVariantInput = inputObjectType({
    name: "UpdateVariantInput",
    definition(t) {
        t.string("name")
        t.string("name_ar")
        t.string("description")
        t.string("description_ar")
        t.string("sku") // optional manual SKU override
        t.list.string("tags")
        t.list.nonNull.string("images") // URLs of new images
        t.string("barcode")
    },
})



const ProductVariantInput = inputObjectType({
    name: "ProductVariantInput",
    definition(t) {
        t.string("name")
        t.string("name_ar")
        t.string("description")
        t.string("description_ar")
        t.string("sku")
        t.list.string("tags")
        t.list.string("images")
        t.string("barcode")
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
            resolve: async (_parent, { productId, data }: { productId: number, data: Array<{ name?: string | null; name_ar?: string | null; description?: string | null; description_ar?: string | null; sku?: string | null; tags?: Array<string | null> | null; images?: Array<string | null> | null; barcode?: string | null }> }, ctx: Context) => {
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
                    const images = Array.from(new Set(
                        (variant.images ?? [])
                            .filter((url): url is string => Boolean(url?.trim()))
                            .map((url) => url.trim()),
                    ));
                    if (!providedName && !tags.length) {
                        throw new GraphQLError("Every variant needs a name or at least one tag");
                    }
                    if (images.length > 6) throw new GraphQLError("A variant can have at most 6 images");

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
                        name_ar: variant.name_ar?.trim() || null,
                        description: variant.description?.trim() || null,
                        description_ar: variant.description_ar?.trim() || null,
                        sku: variant.sku?.trim() || `${productSlug}-${generatedSuffix}`.substring(0, 50),
                        barcode: variant.barcode?.trim() ? requireGtin(variant.barcode) : null,
                        tags,
                        images,
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
                            name_ar: variant.name_ar,
                            description: variant.description,
                            description_ar: variant.description_ar,
                            sku: variant.sku,
                            barcode: variant.barcode,
                            barcodeSource: variant.barcode ? 'admin-manual' : null,
                            barcodeVerifiedAt: variant.barcode ? new Date() : null,
                            productId,
                            tags: {
                                create: variant.tags.map((value) => ({ value })),
                            },
                            images: {
                                create: variant.images.map((url) => ({ url })),
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
            resolve: async (_parent, { id, data }: { id: number; data: { name?: string | null; name_ar?: string | null; description?: string | null; description_ar?: string | null; sku?: string | null; tags?: Array<string | null> | null; images?: Array<string | null> | null; barcode?: string | null } }, ctx: Context) => {
                // Step 1: Fetch variant
                const variant = await ctx.prisma.variant.findUnique({
                    where: { id },
                    include: { tags: true },
                });
                if (!variant) throw new Error("Variant not found");

                const tags: string[] = data.tags === undefined
                    ? variant.tags.map((tag) => tag.value)
                    : Array.from(new Set((data.tags ?? []).filter((tag): tag is string => Boolean(tag?.trim())).map((tag) => tag.trim())));
                const name = data.name === undefined ? variant.name : data.name?.trim() || null;
                if (!name && !tags.length) {
                    throw new GraphQLError("Every variant needs a name or at least one tag");
                }
                const sku = data.sku === undefined ? variant.sku : data.sku?.trim() || null;
                const barcode = data.barcode === undefined ? variant.barcode : data.barcode ? requireGtin(data.barcode) : null;
                if (barcode && barcode !== variant.barcode) {
                    const owner = await ctx.prisma.variant.findUnique({ where: { barcode }, select: { id: true } });
                    if (owner && owner.id !== id) throw new GraphQLError('This barcode is already assigned to another variant');
                }

                // Step 3: Update variant basic info
                await ctx.prisma.$transaction(async (tx) => {
                    await tx.variant.update({
                        where: { id },
                        data: {
                            name,
                            name_ar: data.name_ar === undefined ? variant.name_ar : data.name_ar?.trim() || null,
                            description: data.description === undefined ? variant.description : data.description?.trim() || null,
                            description_ar: data.description_ar === undefined ? variant.description_ar : data.description_ar?.trim() || null,
                            sku,
                            barcode,
                            barcodeSource: data.barcode === undefined ? variant.barcodeSource : barcode ? 'admin-manual' : null,
                            barcodeVerifiedAt: data.barcode === undefined ? variant.barcodeVerifiedAt : barcode ? new Date() : null,
                        },
                    });
                    if (data.tags !== undefined) {
                        await tx.tag.deleteMany({ where: { variantId: id } });
                        if (tags.length) await tx.tag.createMany({ data: tags.map((value) => ({ value, variantId: id })) });
                    }
                    if (data.images) {
                        const imageUrls = Array.from(new Set(
                            data.images
                                .filter((url): url is string => Boolean(url?.trim()))
                                .map((url) => url.trim()),
                        ));

                        // ProductImage URLs are globally unique, so reconnect existing rows
                        // instead of deleting and recreating them (which can violate url's
                        // unique constraint when another catalog record already uses a URL).
                        await tx.productImage.deleteMany({
                            where: {
                                variantId: id,
                                ...(imageUrls.length ? { url: { notIn: imageUrls } } : {}),
                            },
                        });
                        for (const url of imageUrls) {
                            await tx.productImage.upsert({
                                where: { url },
                                create: { url, variantId: id },
                                update: { variantId: id, product_template_id: null },
                            });
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
        t.nonNull.int("deleteVariants", {
            args: { ids: nonNull(list(nonNull(intArg()))) },
            resolve: async (_parent, { ids }: { ids: number[] }, ctx: Context) => {
                const uniqueIds = [...new Set(ids)];
                if (!uniqueIds.length || uniqueIds.length > 100 || uniqueIds.some((id) => !Number.isSafeInteger(id) || id < 1)) {
                    throw new GraphQLError("Select between 1 and 100 valid variants");
                }

                return ctx.prisma.$transaction(async (tx) => {
                    const variants = await tx.variant.findMany({
                        where: { id: { in: uniqueIds } },
                        select: { id: true, productId: true, _count: { select: { products: true } } },
                    });
                    if (variants.length !== uniqueIds.length) throw new GraphQLError("One or more variants no longer exist");
                    if (variants.some((variant) => variant._count.products > 0)) {
                        throw new GraphQLError("VARIANT_HAS_PARTNER_PRODUCTS");
                    }

                    const counts = await tx.variant.groupBy({
                        by: ["productId"],
                        where: { productId: { in: [...new Set(variants.map((variant) => variant.productId))] } },
                        _count: { _all: true },
                    });
                    const selectedByTemplate = new Map<number, number>();
                    for (const variant of variants) selectedByTemplate.set(variant.productId, (selectedByTemplate.get(variant.productId) ?? 0) + 1);
                    if (counts.some((count) => count._count._all <= (selectedByTemplate.get(count.productId) ?? 0))) {
                        throw new GraphQLError("A product template must keep at least one variant");
                    }

                    await tx.productImage.deleteMany({ where: { variantId: { in: uniqueIds } } });
                    await tx.tag.deleteMany({ where: { variantId: { in: uniqueIds } } });
                    await tx.variant.deleteMany({ where: { id: { in: uniqueIds } } });
                    await tx.auditLog.create({
                        data: {
                            actorId: getUserId(ctx),
                            action: "VARIANTS_DELETED",
                            entity: "Variant",
                            entityId: uniqueIds.join(","),
                            metadata: { variantIds: uniqueIds, productTemplateIds: [...new Set(variants.map((variant) => variant.productId))] },
                        },
                    });
                    return uniqueIds.length;
                }, { timeout: 15000 });
            },
        });
        t.nonNull.field("moveVariantToTemplate", {
            type: "Variant",
            args: {
                variantId: nonNull(intArg()),
                targetTemplateId: nonNull(intArg()),
            },
            resolve: async (_parent, { variantId, targetTemplateId }, ctx: Context) => ctx.prisma.$transaction(async (tx) => {
                const variant = await tx.variant.findUnique({
                    where: { id: variantId },
                    include: { product: { select: { id: true, category_id: true } } },
                });
                if (!variant) throw new GraphQLError("VARIANT_NOT_FOUND");
                if (variant.productId === targetTemplateId) throw new GraphQLError("VARIANT_ALREADY_IN_TEMPLATE");

                const target = await tx.productTemplate.findUnique({
                    where: { id: targetTemplateId },
                    select: { id: true, category_id: true },
                });
                if (!target) throw new GraphQLError("TARGET_TEMPLATE_NOT_FOUND");
                if (target.category_id !== variant.product.category_id) throw new GraphQLError("TEMPLATE_CATEGORY_MISMATCH");

                const moved = await tx.variant.update({
                    where: { id: variantId },
                    data: { productId: targetTemplateId },
                });
                await tx.auditLog.create({ data: {
                    actorId: getUserId(ctx),
                    action: "VARIANT_MOVED_TEMPLATE",
                    entity: "Variant",
                    entityId: String(variantId),
                    metadata: { variantId, sourceTemplateId: variant.productId, targetTemplateId },
                } });
                return moved;
            }),
        });
    },
});


export default { VariantMutation, UpdateVariantInput, ProductVariantInput }
