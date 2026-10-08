"use server";

import { revalidatePath } from "next/cache";

import { requestServerGraphQL } from "@/lib/server-request";

import { link } from "./_constant";
import {
  CREATE_ITEM,
  DELETE_ITEM,
  FIND_MANY_ITEMS,
  FIND_ONE_ITEM,
  UPDATE_ITEM,
  UPDATE_ITEM_IMAGES,
} from "./_constant/request";
import { MERGE_PRODUCT_TEMPLATES } from "@/api/mutations/productTemplate";
import { FIND_TEMPLATE_MERGE_DATA, SEARCH_TEMPLATE_MERGE_CANDIDATES } from "@/api/queries/productTemplate";

type ProductTemplateResponse = {
  id: number;
  name: string;
  name_ar?: string | null;
  description?: string | null;
  description_ar?: string | null;
  product_type_id?: number | null;
  brand_id: number;
  category_id?: number | null;
  niche_id?: number | null;
  productType?: ProductType | null;
  brand?: Brand | null;
  category?: Category | null;
  niche?: Niche | null;
  images?: Array<{ id?: number | string; url: string }>;
};

type ProductTemplatePayload = {
  name: string;
  name_ar?: string;
  description?: string;
  description_ar?: string;
  category_id: string;
  product_type_id?: string;
  brand_id: string;
  images?: string[];
};

type SearchParams = {
  search?: string;
  page: number;
  limit: number;
  isFull?: boolean;
  niche_id?: number;
  category_id?: number;
  product_type_id?: number;
  brand_id?: number;
};

export type MergeTemplate = {
  id: number;
  name: string;
  name_ar?: string | null;
  description?: string | null;
  category_id?: number | null;
  brand_id?: number | null;
  brand?: { id: number; name: string } | null;
  category?: { id: number; name: string; name_ar?: string | null } | null;
  images: Array<{ id: number; url: string }>;
  variants: Array<{
    id: number;
    name?: string | null;
    name_ar?: string | null;
    sku?: string | null;
    barcode?: string | null;
    products: Array<{ id: number }>;
  }>;
};

function mapItem(data: ProductTemplateResponse): ProductTemplate {
  return {
    id: String(data.id),
    name: data.name,
    name_ar: data.name_ar ?? "",
    description: data.description ?? "",
    description_ar: data.description_ar ?? "",
    product_type_id: data.product_type_id ? String(data.product_type_id) : "",
    brand_id: String(data.brand_id),
    category_id: data.category_id ? String(data.category_id) : undefined,
    niche_id: data.niche_id ? String(data.niche_id) : undefined,
    productType: data.productType ?? null,
    brand: data.brand ?? null,
    category: data.category ?? null,
    niche: data.niche ?? null,
    images: (data.images ?? []).map((image) => ({
      id: image.id ? String(image.id) : undefined,
      url: image.url,
    })),
  };
}

export async function createItem(itemData: ProductTemplatePayload) {
  const response = await requestServerGraphQL<{ createProductTemplate: ProductTemplateResponse }>(
    CREATE_ITEM,
    {
      name: itemData.name,
      name_ar: itemData.name_ar,
      description: itemData.description,
      description_ar: itemData.description_ar,
      category_id: Number(itemData.category_id),
      product_type_id: itemData.product_type_id ? Number(itemData.product_type_id) : null,
      brand_id: Number(itemData.brand_id),
      images: itemData.images?.length ? { images: itemData.images } : undefined,
    },
  );

  revalidatePath(`/${link}`);
  return mapItem(response.createProductTemplate);
}

export async function getItemById(id: string) {
  const response = await requestServerGraphQL<{ findOneProductTemplate: ProductTemplateResponse | null }>(
    FIND_ONE_ITEM,
    { id: Number.parseInt(id, 10) },
  );

  if (!response.findOneProductTemplate) {
    return null;
  }

  return mapItem(response.findOneProductTemplate);
}

export async function getSearchItem({
  search,
  page,
  limit,
  isFull = false,
  niche_id,
  category_id,
  product_type_id,
  brand_id,
}: SearchParams) {
  const response = await requestServerGraphQL<{
    findManyProductTemplates: {
      productTemplates: ProductTemplateResponse[];
      totalProductTemplates: number;
    };
  }>(FIND_MANY_ITEMS, { search, page, limit, isFull, niche_id, category_id, product_type_id, brand_id });

  return {
    items: response.findManyProductTemplates.productTemplates.map(mapItem),
    totalItems: response.findManyProductTemplates.totalProductTemplates,
  };
}

export async function updateItem(id: string, itemData: ProductTemplatePayload) {
  const response = await requestServerGraphQL<{ updateProductTemplate: ProductTemplateResponse }>(
    UPDATE_ITEM,
    {
      id: Number.parseInt(id, 10),
      name: itemData.name,
      name_ar: itemData.name_ar,
      description: itemData.description,
      description_ar: itemData.description_ar,
      category_id: Number(itemData.category_id),
      product_type_id: itemData.product_type_id ? Number(itemData.product_type_id) : null,
      brand_id: Number(itemData.brand_id),
    },
  );

  if (itemData.images) {
    await requestServerGraphQL(UPDATE_ITEM_IMAGES, {
      id: Number.parseInt(id, 10),
      images: { images: itemData.images },
    });
  }

  revalidatePath(`/${link}`);
  return mapItem(response.updateProductTemplate);
}

export async function deleteItem(id: string) {
  const response = await requestServerGraphQL<{ deleteProductTemplate: { id: number } }>(
    DELETE_ITEM,
    { id: Number.parseInt(id, 10) },
  );

  revalidatePath(`/${link}`);
  return response.deleteProductTemplate.id;
}

export async function getTemplateForMerge(id: number) {
  const response = await requestServerGraphQL<{ findOneProductTemplate: MergeTemplate | null }>(
    FIND_TEMPLATE_MERGE_DATA,
    { id },
  );
  return response.findOneProductTemplate;
}

export async function searchTemplateMergeCandidates(targetId: number, categoryId: number | null, search: string) {
  const response = await requestServerGraphQL<{
    findManyProductTemplates: { productTemplates: MergeTemplate[]; totalProductTemplates: number };
  }>(SEARCH_TEMPLATE_MERGE_CANDIDATES, {
    search,
    category_id: categoryId,
    page: 1,
    limit: 12,
  });

  return response.findManyProductTemplates.productTemplates.filter(
    (template) => template.id !== targetId && template.category_id === categoryId,
  );
}

export async function mergeProductTemplates(targetId: number, sourceIds: number[]) {
  try {
    const response = await requestServerGraphQL<{ mergeProductTemplates: { id: number; name: string } }>(
      MERGE_PRODUCT_TEMPLATES,
      { targetId, sourceIds },
    );
    revalidatePath(`/${link}`);
    revalidatePath(`/${link}/${targetId}`);
    revalidatePath(`/${link}/${targetId}/variants`);
    return { ok: true as const, name: response.mergeProductTemplates.name };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not merge these templates.";
    if (message.includes("MERGE_CATEGORY_MISMATCH")) {
      return { ok: false as const, message: "Templates must belong to the same category." };
    }
    if (message.includes("MERGE_TARGET_NOT_FOUND") || message.includes("MERGE_SOURCE_NOT_FOUND")) {
      return { ok: false as const, message: "A selected template no longer exists. Refresh and try again." };
    }
    if (message.includes("INVALID_TEMPLATE_MERGE")) {
      return { ok: false as const, message: "Select between 1 and 50 other templates to merge." };
    }
    return { ok: false as const, message: "Merge failed. No changes were applied. Please try again." };
  }
}
