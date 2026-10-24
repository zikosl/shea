"use server";

import { revalidatePath } from "next/cache";
import { gql } from "graphql-request";
import { requestServerGraphQL } from "@/lib/server-request";

const PARTNER_PRODUCTS = gql`
  query PartnerCatalogProducts($partnerId: Int!, $search: String, $page: Int!, $limit: Int!) {
    adminPartnerCatalogProducts(partnerId: $partnerId, search: $search, page: $page, limit: $limit) {
      totalProducts
      products {
        id partnerId variantId product_template_id name name_ar variantName variantNameAr
        price priceOnRequest available onlineVisible isActive stock trackInventory
        images { id url }
        category { id name name_ar }
      }
    }
  }
`;

const SEARCH_CATALOG = gql`
  query PartnerCatalogTemplateSearch($partnerId: Int!, $search: String, $page: Int!, $limit: Int!) {
    adminPartnerCatalogTemplates(partnerId: $partnerId, search: $search, page: $page, limit: $limit) {
      totalProductTemplates
      productTemplates {
        id name name_ar image
        variants {
          id name name_ar sku barcode image alreadyAdded previouslyRemoved
        }
      }
    }
  }
`;

const ADD_PRODUCTS = gql`
  mutation AdminAddPartnerProducts($partnerId: Int!, $data: [InputProductVariant!]!) {
    adminAddPartnerProducts(partnerId: $partnerId, data: $data)
  }
`;
const UPDATE_PRODUCTS = gql`
  mutation AdminUpdatePartnerProducts($partnerId: Int!, $updates: [AdminPartnerProductUpdateInput!]!) {
    adminUpdatePartnerProducts(partnerId: $partnerId, updates: $updates)
  }
`;
const REMOVE_PRODUCTS = gql`
  mutation AdminRemovePartnerProducts($partnerId: Int!, $ids: [Int!]!) {
    adminRemovePartnerProducts(partnerId: $partnerId, ids: $ids)
  }
`;

export type PartnerCatalogProduct = {
  id: number;
  partnerId: number;
  variantId: number;
  product_template_id: number;
  name: string;
  name_ar?: string | null;
  variantName?: string | null;
  variantNameAr?: string | null;
  price: number;
  priceOnRequest: boolean;
  available: boolean;
  onlineVisible: boolean;
  isActive: boolean;
  stock: number;
  trackInventory: boolean;
  images: Array<{ id: number; url: string }>;
  category?: { id: number; name: string; name_ar?: string | null } | null;
};

export type CatalogTemplate = {
  id: number;
  name: string;
  name_ar?: string | null;
  image?: string | null;
  variants: Array<{
    id: number;
    name?: string | null;
    name_ar?: string | null;
    sku?: string | null;
    barcode?: string | null;
    image?: string | null;
    alreadyAdded: boolean;
    previouslyRemoved: boolean;
  }>;
};

function validPartnerId(value: number) {
  if (!Number.isSafeInteger(value) || value < 1) throw new Error("Invalid partner");
}

export async function getPartnerCatalog(partnerId: number, search: string, page: number, limit: number) {
  validPartnerId(partnerId);
  const result = await requestServerGraphQL<{
    adminPartnerCatalogProducts: { products: PartnerCatalogProduct[]; totalProducts: number };
  }>(PARTNER_PRODUCTS, { partnerId, search: search.trim() || undefined, page, limit });
  return result.adminPartnerCatalogProducts;
}

export async function searchPartnerCatalogTemplates(search: string, partnerId: number, page = 1, limit = 20) {
  validPartnerId(partnerId);
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > 50) throw new Error("Invalid catalog page");
  const result = await requestServerGraphQL<{
    adminPartnerCatalogTemplates: { productTemplates: CatalogTemplate[]; totalProductTemplates: number };
  }>(SEARCH_CATALOG, { partnerId, search: search.trim() || undefined, page, limit });
  return result.adminPartnerCatalogTemplates;
}

export async function addPartnerCatalogProducts(partnerId: number, items: Array<{ variantId: number; price: number }>) {
  validPartnerId(partnerId);
  if (!items.length || items.length > 200 || items.some((item) => !Number.isSafeInteger(item.variantId) || !Number.isFinite(item.price) || item.price < 0)) {
    throw new Error("Check the selected products and prices, then try again.");
  }
  const result = await requestServerGraphQL<{ adminAddPartnerProducts: number }>(ADD_PRODUCTS, {
    partnerId,
    data: items.map(({ variantId, price }) => ({ variantId, price, stock: 0, trackInventory: true, available: true, onlineVisible: true, isVisibleInPos: true })),
  });
  revalidatePath('/partners/[itemId]', 'page');
  return result.adminAddPartnerProducts;
}

export async function updatePartnerCatalogProducts(partnerId: number, updates: Array<{ id: number; price?: number; available?: boolean; onlineVisible?: boolean }>) {
  validPartnerId(partnerId);
  if (!updates.length || updates.length > 500 || updates.some((item) => !Number.isSafeInteger(item.id) || (item.price !== undefined && (!Number.isFinite(item.price) || item.price < 0)))) {
    throw new Error("Check the selected updates and try again.");
  }
  const result = await requestServerGraphQL<{ adminUpdatePartnerProducts: number }>(UPDATE_PRODUCTS, { partnerId, updates });
  revalidatePath('/partners/[itemId]', 'page');
  return result.adminUpdatePartnerProducts;
}

export async function removePartnerCatalogProducts(partnerId: number, ids: number[]) {
  validPartnerId(partnerId);
  if (!ids.length || ids.length > 500) throw new Error("Select products to remove.");
  const result = await requestServerGraphQL<{ adminRemovePartnerProducts: number }>(REMOVE_PRODUCTS, { partnerId, ids });
  revalidatePath('/partners/[itemId]', 'page');
  return result.adminRemovePartnerProducts;
}
