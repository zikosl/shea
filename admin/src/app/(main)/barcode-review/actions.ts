"use server";

import { revalidatePath } from "next/cache";
import { FIND_BARCODE_CANDIDATES } from "@/api/queries/barcode-candidates";
import { REVIEW_BARCODE_CANDIDATE, SUBMIT_BARCODE_CANDIDATE } from "@/api/mutations/barcode-candidates";
import { requestServerGraphQL } from "@/lib/server-request";

export type BarcodeReviewItem = {
  id: string;
  barcode: string;
  sourceUrl: string;
  sourceName?: string | null;
  matchScore: number;
  status: string;
  createdAt: string;
  variant: {
    id: number;
    name?: string | null;
    sku?: string | null;
    barcode?: string | null;
    images: Array<{ url: string }>;
    product: { id: number; name: string; brand?: { name: string } | null; images: Array<{ url: string }> };
  };
};

export async function getBarcodeCandidates(status: string, page: number) {
  const response = await requestServerGraphQL<{ findBarcodeCandidates: { total: number; candidates: BarcodeReviewItem[] } }>(
    FIND_BARCODE_CANDIDATES, { status, page, limit: 25 },
  );
  return response.findBarcodeCandidates;
}

export async function reviewBarcodeCandidate(formData: FormData) {
  await requestServerGraphQL(REVIEW_BARCODE_CANDIDATE, {
    id: String(formData.get("id")),
    approve: formData.get("decision") === "approve",
  });
  revalidatePath("/barcode-review");
}

export async function submitBarcodeCandidate(variantId: number, barcode: string, sourceUrl: string) {
  await requestServerGraphQL(SUBMIT_BARCODE_CANDIDATE, { variantId, barcode, sourceUrl });
  revalidatePath("/barcode-review");
}
