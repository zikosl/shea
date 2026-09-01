"use server";

import { revalidatePath } from "next/cache";

import { APPROVE_PRODUCT_TEMPLATE_REQUEST, REJECT_PRODUCT_TEMPLATE_REQUEST } from "@/api/mutations/product-template-request";
import { FIND_MANY_PRODUCT_TEMPLATE_REQUESTS } from "@/api/queries/product-template-request";
import { requestServerGraphQL } from "@/lib/server-request";

export type ProductTemplateRequestItem = {
  id: number;
  name: string;
  description?: string | null;
  images?: string[];
  status: string;
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
    name?: string | null;
    description?: string | null;
    sku?: string | null;
    image?: string | null;
    price?: number | null;
    stock?: number | null;
    tags?: string[] | null;
  }>;
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
