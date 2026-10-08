"use server";

import { revalidatePath } from "next/cache";

import { CREATE_VARIANTS, DELETE_VARIANT, MOVE_VARIANT_TO_TEMPLATE, UPDATE_VARIANT } from "@/api/mutations";
import { FIND_MANY_VARIANTS } from "@/api/queries";
import { SEARCH_TEMPLATE_MERGE_CANDIDATES } from "@/api/queries/productTemplate";
import { requestServerGraphQL } from "@/lib/server-request";
import { SUBMIT_BARCODE_CANDIDATE } from "@/api/mutations/barcode-candidates";

type VariantResponse = {
  id: number;
  name?: string | null;
  name_ar?: string | null;
  description?: string | null;
  description_ar?: string | null;
  sku?: string | null;
  barcode?: string | null;
  productId: number;
  tags?: Array<{ id: number; value: string }>;
  images?: Array<{ id: number; url: string }>;
  products?: Array<{ id: number }>;
};

export type VariantMoveTarget = {
  id: number;
  name: string;
  category_id: number;
  brand?: { id: number; name: string } | null;
  variants: Array<{ id: number; name?: string | null; products: Array<{ id: number }> }>;
};

function mapVariant(variant: VariantResponse): ProductVariant {
  return {
    id: String(variant.id),
    name: variant.name,
    name_ar: variant.name_ar,
    description: variant.description,
    description_ar: variant.description_ar,
    sku: variant.sku,
    barcode: variant.barcode,
    productId: String(variant.productId),
    tags: (variant.tags ?? []).map((tag) => ({ id: String(tag.id), value: tag.value })),
    images: (variant.images ?? []).map((image) => ({ id: String(image.id), url: image.url })),
    productCount: variant.products?.length ?? 0,
  };
}

export async function getVariants(productId: number, search: string, page: number, limit: number) {
  const response = await requestServerGraphQL<{
    findManyVariants: { variants: VariantResponse[]; totalVariants: number };
  }>(FIND_MANY_VARIANTS, { productId, search: search || undefined, page, limit, isFull: false });

  return {
    variants: response.findManyVariants.variants.map(mapVariant),
    total: response.findManyVariants.totalVariants,
  };
}

function combinations(dimensions: string[][]): string[][] {
  return dimensions.reduce<string[][]>(
    (current, dimension) => current.flatMap((combination) => dimension.map((value) => [...combination, value])),
    [[]],
  );
}

export async function createVariantCombinations(productId: number, dimensions: string[][]) {
  const normalized = dimensions
    .map((dimension) => Array.from(new Set(dimension.map((value) => value.trim()).filter(Boolean))))
    .filter((dimension) => dimension.length > 0);
  if (!Number.isInteger(productId) || productId < 1) throw new Error("Invalid product template");
  if (!normalized.length) throw new Error("Add at least one variant option");

  const generated = combinations(normalized);
  if (generated.length > 100) throw new Error("A maximum of 100 combinations can be created at once");

  await requestServerGraphQL(CREATE_VARIANTS, {
    productId,
    data: generated.map((tags) => ({ tags })),
  });
  revalidatePath(`/product-templates/${productId}/variants`);
}

export async function updateVariantItem(
  productId: number,
  id: number,
  data: { name: string; name_ar: string; description: string; description_ar: string; sku: string; tags: string[]; images: string[] },
) {
  const tags = Array.from(new Set(data.tags.map((tag) => tag.trim()).filter(Boolean)));
  if (!data.name.trim() && !tags.length) throw new Error("Add a variant name or at least one tag");
  await requestServerGraphQL(UPDATE_VARIANT, {
    id,
    data: {
      name: data.name.trim() || null,
      name_ar: data.name_ar.trim() || null,
      description: data.description.trim() || null,
      description_ar: data.description_ar.trim() || null,
      sku: data.sku.trim() || null,
      tags,
      images: data.images,
    },
  });
  revalidatePath(`/product-templates/${productId}/variants`);
}

export async function deleteVariantItem(productId: number, id: number) {
  await requestServerGraphQL(DELETE_VARIANT, { id });
  revalidatePath(`/product-templates/${productId}/variants`);
}

export async function submitPhysicalBarcode(productId: number, variantId: number, barcode: string) {
  await requestServerGraphQL(SUBMIT_BARCODE_CANDIDATE, {
    variantId,
    barcode: barcode.trim(),
    sourceUrl: "physical-package:admin-entry",
  });
  revalidatePath(`/product-templates/${productId}/variants`);
  revalidatePath("/barcode-review");
}

export async function searchVariantMoveTargets(sourceTemplateId: number, categoryId: number, search: string) {
  const response = await requestServerGraphQL<{
    findManyProductTemplates: { productTemplates: VariantMoveTarget[] };
  }>(SEARCH_TEMPLATE_MERGE_CANDIDATES, {
    search,
    category_id: categoryId,
    page: 1,
    limit: 12,
  });

  return response.findManyProductTemplates.productTemplates.filter(
    (template) => template.id !== sourceTemplateId && template.category_id === categoryId,
  );
}

export async function moveVariantToTemplate(sourceTemplateId: number, variantId: number, targetTemplateId: number) {
  try {
    await requestServerGraphQL(MOVE_VARIANT_TO_TEMPLATE, { variantId, targetTemplateId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not move this variant.";
    if (message.includes("TEMPLATE_CATEGORY_MISMATCH")) throw new Error("The destination must be in the same category.");
    if (message.includes("VARIANT_NOT_FOUND") || message.includes("TARGET_TEMPLATE_NOT_FOUND")) {
      throw new Error("The variant or destination template no longer exists. Refresh and try again.");
    }
    if (message.includes("VARIANT_ALREADY_IN_TEMPLATE")) throw new Error("This variant is already in that template.");
    throw new Error("Move failed. No changes were applied. Please try again.");
  }

  revalidatePath(`/product-templates/${sourceTemplateId}/variants`);
  revalidatePath(`/product-templates/${targetTemplateId}/variants`);
  revalidatePath("/product-templates");
}
