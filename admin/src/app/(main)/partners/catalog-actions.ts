"use server";

import { revalidatePath } from "next/cache";
import { gql } from "graphql-request";
import { requestServerGraphQL } from "@/lib/server-request";
import { SET_VARIANT_BARCODE } from "@/api/mutations/barcode-candidates";

const PARTNER_PRODUCTS = gql`
  query PartnerCatalogProducts($partnerId: Int!, $search: String, $page: Int!, $limit: Int!) {
    adminPartnerCatalogProducts(partnerId: $partnerId, search: $search, page: $page, limit: $limit) {
      totalProducts
      products {
        id partnerId variantId product_template_id name name_ar variantName variantNameAr barcode
        price priceOnRequest available onlineVisible isActive stock trackInventory
        images { id url }
        category { id name name_ar }
      }
    }
  }
`;

const SEARCH_CATALOG = gql`
  query PartnerCatalogTemplateSearch($partnerId: Int!, $search: String, $nicheId: Int, $categoryId: Int, $brandId: Int, $page: Int!, $limit: Int!) {
    adminPartnerCatalogTemplates(partnerId: $partnerId, search: $search, nicheId: $nicheId, categoryId: $categoryId, brandId: $brandId, page: $page, limit: $limit) {
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

const CATALOG_FILTERS = gql`
  query PartnerCatalogFilters {
    getAllNiches { id name name_ar }
    getAllCategories { id name name_ar niche_id }
    getAllBrands { id name name_ar niche_id }
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
  barcode?: string | null;
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

export type PartnerCatalogFilters = {
  niches: Array<{ id: number; name: string; name_ar?: string | null }>;
  categories: Array<{ id: number; name: string; name_ar?: string | null; niche_id?: number | null }>;
  brands: Array<{ id: number; name: string; name_ar?: string | null; niche_id?: number | null }>;
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

export async function getPartnerCatalogFilters(): Promise<PartnerCatalogFilters> {
  const result = await requestServerGraphQL<{
    getAllNiches: PartnerCatalogFilters['niches'];
    getAllCategories: PartnerCatalogFilters['categories'];
    getAllBrands: PartnerCatalogFilters['brands'];
  }>(CATALOG_FILTERS, {});
  return { niches: result.getAllNiches, categories: result.getAllCategories, brands: result.getAllBrands };
}

export async function searchPartnerCatalogTemplates(
  search: string,
  partnerId: number,
  page = 1,
  limit = 20,
  filters: { nicheId?: number; categoryId?: number; brandId?: number } = {},
) {
  validPartnerId(partnerId);
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > 50) throw new Error("Invalid catalog page");
  const result = await requestServerGraphQL<{
    adminPartnerCatalogTemplates: { productTemplates: CatalogTemplate[]; totalProductTemplates: number };
  }>(SEARCH_CATALOG, { partnerId, search: search.trim() || undefined, ...filters, page, limit });
  return result.adminPartnerCatalogTemplates;
}

export async function searchAllPartnerCatalogTemplates(
  search: string,
  partnerId: number,
  filters: { nicheId?: number; categoryId?: number; brandId?: number } = {},
) {
  validPartnerId(partnerId);
  const pageSize = 50;
  const fetchPage = async (page: number) => {
    const result = await requestServerGraphQL<{
      adminPartnerCatalogTemplates: { productTemplates: CatalogTemplate[]; totalProductTemplates: number };
    }>(SEARCH_CATALOG, { partnerId, search: search.trim() || undefined, ...filters, page, limit: pageSize });
    return result.adminPartnerCatalogTemplates;
  };

  const firstPage = await fetchPage(1);
  const pageCount = Math.ceil(firstPage.totalProductTemplates / pageSize);
  if (pageCount > 100) throw new Error('There are too many matches to select at once. Narrow your filters and try again.');

  const templates = [...firstPage.productTemplates];
  for (let start = 2; start <= pageCount; start += 4) {
    const pages = Array.from({ length: Math.min(4, pageCount - start + 1) }, (_, index) => start + index);
    const results = await Promise.all(pages.map(fetchPage));
    for (const result of results) templates.push(...result.productTemplates);
  }
  return templates;
}

export async function addPartnerCatalogProducts(partnerId: number, items: Array<{ variantId: number; price: number }>) {
  validPartnerId(partnerId);
  if (!items.length || items.length > 5_000 || items.some((item) => !Number.isSafeInteger(item.variantId) || !Number.isFinite(item.price) || item.price < 0)) {
    throw new Error("Check the selected products and prices, then try again.");
  }
  let added = 0;
  try {
    for (let start = 0; start < items.length; start += 200) {
      const batch = items.slice(start, start + 200);
      const result = await requestServerGraphQL<{ adminAddPartnerProducts: number }>(ADD_PRODUCTS, {
        partnerId,
        data: batch.map(({ variantId, price }) => ({ variantId, price, stock: 0, trackInventory: true, available: true, onlineVisible: true, isVisibleInPos: true })),
      });
      added += result.adminAddPartnerProducts;
    }
  } catch (error) {
    if (added > 0) throw new Error(`${added} products were added before the request stopped. Retry to add the remaining selections.`);
    throw error;
  }
  revalidatePath('/partners/[itemId]', 'page');
  return added;
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

export async function setPartnerCatalogVariantBarcode(variantId: number, barcode: string) {
  if (!Number.isSafeInteger(variantId) || variantId < 1) throw new Error("Invalid product variant");
  const normalized = barcode.trim().replace(/[\s-]/g, "");
  if (!/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(normalized)) {
    throw new Error("Enter an 8, 12, 13, or 14 digit barcode.");
  }
  const result = await requestServerGraphQL<{ setVariantBarcode: { id: number; barcode: string } }>(SET_VARIANT_BARCODE, {
    variantId,
    barcode: normalized,
  });
  revalidatePath('/partners/[itemId]/products', 'page');
  return result.setVariantBarcode;
}
