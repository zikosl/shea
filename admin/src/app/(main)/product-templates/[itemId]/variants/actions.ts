"use server";

import { revalidatePath } from "next/cache";

import { CREATE_VARIANTS, DELETE_VARIANT, UPDATE_VARIANT } from "@/api/mutations";
import { FIND_MANY_VARIANTS } from "@/api/queries";
import { requestServerGraphQL } from "@/lib/server-request";

type VariantResponse = {
  id: number;
  name?: string | null;
  description?: string | null;
  sku?: string | null;
  productId: number;
  tags?: Array<{ id: number; value: string }>;
  images?: Array<{ id: number; url: string }>;
  products?: Array<{ id: number }>;
};

function mapVariant(variant: VariantResponse): ProductVariant {
  return {
    id: String(variant.id),
    name: variant.name,
    description: variant.description,
    sku: variant.sku,
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
  data: { name: string; description: string; sku: string; tags: string[]; images: string[] },
) {
  const tags = Array.from(new Set(data.tags.map((tag) => tag.trim()).filter(Boolean)));
  if (!data.name.trim() && !tags.length) throw new Error("Add a variant name or at least one tag");
  await requestServerGraphQL(UPDATE_VARIANT, {
    id,
    data: {
      name: data.name.trim() || null,
      description: data.description.trim() || null,
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
