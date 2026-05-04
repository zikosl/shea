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

type ProductTemplateResponse = {
  id: number;
  name: string;
  description?: string | null;
  product_type_id: number;
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
  description?: string;
  product_type_id: string;
  brand_id: string;
  images?: string[];
};

type SearchParams = {
  search?: string;
  page: number;
  limit: number;
  isFull?: boolean;
};

function mapItem(data: ProductTemplateResponse): ProductTemplate {
  return {
    id: String(data.id),
    name: data.name,
    description: data.description ?? "",
    product_type_id: String(data.product_type_id),
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
      description: itemData.description,
      product_type_id: Number(itemData.product_type_id),
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
}: SearchParams) {
  const response = await requestServerGraphQL<{
    findManyProductTemplates: {
      productTemplates: ProductTemplateResponse[];
      totalProductTemplates: number;
    };
  }>(FIND_MANY_ITEMS, { search, page, limit, isFull });

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
      description: itemData.description,
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
