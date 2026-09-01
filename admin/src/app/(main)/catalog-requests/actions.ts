"use server";

import { revalidatePath } from "next/cache";
import { APPROVE_CATALOG_PROPOSAL, MERGE_CATALOG_PROPOSAL, REJECT_CATALOG_PROPOSAL } from "@/api/mutations/catalog-proposal";
import { FIND_MANY_CATALOG_PROPOSALS } from "@/api/queries/catalog-proposal";
import { requestServerGraphQL } from "@/lib/server-request";

export type CatalogProposalItem = {
  id: string; localId: string; entityType: "CATEGORY" | "PRODUCT_TYPE"; status: string;
  name: string; name_ar: string; description?: string; image?: string; nicheId: number;
  categoryId?: number; parentProposalId?: string; rejectionReason?: string; createdAt: string;
  partner?: { companyName?: string; user?: { email?: string } };
};

export async function getCatalogProposals(input: { search?: string; status?: string; entityType?: string; page?: number } = {}) {
  const response = await requestServerGraphQL<{ findManyCatalogProposals: { total: number; proposals: CatalogProposalItem[] } }>(FIND_MANY_CATALOG_PROPOSALS, {
    search: input.search || undefined, status: input.status || undefined, entityType: input.entityType || undefined,
    page: input.page ?? 1, limit: 30,
  });
  return response.findManyCatalogProposals;
}

export async function approveCatalogProposal(formData: FormData) {
  await requestServerGraphQL(APPROVE_CATALOG_PROPOSAL, { id: String(formData.get("id")), adminNote: String(formData.get("adminNote") || "") || undefined });
  revalidatePath("/catalog-requests");
}
export async function mergeCatalogProposal(formData: FormData) {
  const targetId = Number(formData.get("targetId"));
  if (!Number.isInteger(targetId) || targetId <= 0) throw new Error("Choose a valid merge target");
  await requestServerGraphQL(MERGE_CATALOG_PROPOSAL, { id: String(formData.get("id")), targetId, adminNote: String(formData.get("adminNote") || "") || undefined });
  revalidatePath("/catalog-requests");
}
export async function rejectCatalogProposal(formData: FormData) {
  const rejectionReason = String(formData.get("rejectionReason") || "").trim();
  if (rejectionReason.length < 3) throw new Error("A rejection reason is required");
  await requestServerGraphQL(REJECT_CATALOG_PROPOSAL, { id: String(formData.get("id")), rejectionReason });
  revalidatePath("/catalog-requests");
}
