"use server";

import { revalidatePath } from "next/cache";

import { APPROVE_PRODUCT_TEMPLATE_REQUEST, MERGE_PRODUCT_TEMPLATE_REQUEST, REJECT_PRODUCT_TEMPLATE_REQUEST } from "@/api/mutations/product-template-request";
import { FIND_MANY_PRODUCT_TEMPLATE_REQUESTS } from "@/api/queries/product-template-request";
import { SEARCH_TEMPLATE_MERGE_CANDIDATES } from "@/api/queries/productTemplate";
import { requestServerGraphQL } from "@/lib/server-request";

export type ProductTemplateRequestItem = {
  id: number;
  name: string;
  description?: string | null;
  images?: string[];
  status: string;
  provisionalTemplateId?: number | null;
  createdAt?: string;
  partner?: {
    companyName?: string | null;
    user?: { email?: string | null } | null;
  } | null;
  brand?: { name?: string | null; image?: string | null } | null;
  productType?: { name?: string | null; category?: { name?: string | null } | null } | null;
  category?: { id?: number; name?: string | null; niche_id?: number | null; niche?: { id?: number; name?: string | null } | null } | null;
  variants?: Array<{
    id: number;
    resolvedVariantId?: number | null;
    name?: string | null;
    description?: string | null;
    sku?: string | null;
    image?: string | null;
    price?: number | null;
    stock?: number | null;
    tags?: string[] | null;
  }>;
};

export type ProductTemplateMergeCandidate = {
  id: number;
  name: string;
  name_ar?: string | null;
  category_id?: number | null;
  product_type_id?: number | null;
  brand_id?: number | null;
  brand?: { name?: string | null } | null;
  category?: { name?: string | null; name_ar?: string | null } | null;
  catalogStatus: string;
  images?: Array<{ id: number; url: string }>;
  variants?: Array<{ id: number; name?: string | null; name_ar?: string | null; sku?: string | null; barcode?: string | null; images?: Array<{ id: number; url: string }> }>;
};

export async function getProductTemplateRequests(filters: { search?: string; niche_id?: number; category_id?: number; product_type_id?: number } = {}) {
  const response = await requestServerGraphQL<{
    findManyProductTemplateRequests: {
      totalRequests: number;
      requests: ProductTemplateRequestItem[];
    };
  }>(FIND_MANY_PRODUCT_TEMPLATE_REQUESTS, {
    status: "PENDING",
    ...filters,
    page: 1,
    limit: 50,
  });

  return response.findManyProductTemplateRequests;
}

export async function searchProductTemplateMergeCandidates(search: string, categoryId: number, page: number) {
  const response = await requestServerGraphQL<{
    findManyProductTemplates: { productTemplates: ProductTemplateMergeCandidate[]; totalProductTemplates: number };
  }>(SEARCH_TEMPLATE_MERGE_CANDIDATES, {
    search: search.trim(), category_id: categoryId, catalogStatus: "APPROVED", page: Math.max(1, page), limit: 20,
  });
  const result = response.findManyProductTemplates;
  return result;
}

export async function approveRequest(formData: FormData) {
  const id = Number(formData.get("id"));
  await requestServerGraphQL(APPROVE_PRODUCT_TEMPLATE_REQUEST, { id });
  revalidatePath("/product-requests");
}

export async function rejectRequest(formData: FormData) {
  const id = Number(formData.get("id"));
  await requestServerGraphQL(REJECT_PRODUCT_TEMPLATE_REQUEST, {
    id,
    rejectionReason: "Rejected from admin review",
  });
  revalidatePath("/product-requests");
}

export async function mergeRequest(id: number, targetTemplateId: number, variantMappings: Array<{ requestVariantId: number; targetVariantId: number }>) {
  if (!Number.isInteger(targetTemplateId) || targetTemplateId < 1) throw new Error("Choose a valid target template");
  await requestServerGraphQL(MERGE_PRODUCT_TEMPLATE_REQUEST, { id, targetTemplateId, variantMappings });
  revalidatePath("/product-requests");
}
