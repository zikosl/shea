"use server";

import { revalidatePath } from "next/cache";
import { gql } from "graphql-request";

import { requestServerGraphQL } from "@/lib/server-request";

export type ContributorAccount = {
  userId: number;
  name: string;
  email: string | null;
  active: boolean;
};
export type SahimReviewItem = { id: string; kind: string; contributorId: number; payloadJson: string; createdAt: string; targetProductName: string | null; targetVariantName: string | null };

type ActionResult = { ok: true } | { ok: false; message: string };

const CONTRIBUTORS = gql`
  query SahimContributors {
    contributors { userId name email active }
  }
`;

const CREATE_CONTRIBUTOR = gql`
  mutation CreateSahimContributor($name: String!, $email: String!) {
    createContributor(name: $name, email: $email) { userId }
  }
`;

const SET_ACTIVE = gql`
  mutation SetSahimContributorActive($userId: Int!, $active: Boolean!) {
    setContributorActive(userId: $userId, active: $active) { userId active }
  }
`;

const RESET_ACCESS = gql`
  mutation ResetSahimContributorAccess($userId: Int!) {
    resetContributorAccess(userId: $userId)
  }
`;
const REVIEW_QUEUE = gql`query SahimReviewQueue { sahimReviewQueue { id kind contributorId payloadJson createdAt targetProductName targetVariantName } }`;
const REVIEW = gql`mutation ReviewSahimContribution($id: String!, $approve: Boolean!, $note: String, $mergeTemplateId: Int) {
  reviewSahimContribution(id: $id, approve: $approve, note: $note, mergeTemplateId: $mergeTemplateId) { id status }
}`;

function errorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("EMAIL_ALREADY_IN_USE")) return "An account already uses this email address.";
  if (message.includes("INVITE_EMAIL_FAILED")) return "The invitation email could not be sent. No account was created. Check email delivery and try again.";
  if (message.includes("CONTRIBUTOR_NOT_FOUND")) return "This contributor no longer exists. Refresh the page.";
  return "The action could not be completed. Please try again.";
}

export async function getContributors(): Promise<ContributorAccount[]> {
  const result = await requestServerGraphQL<{ contributors: ContributorAccount[] }>(CONTRIBUTORS);
  return result.contributors;
}
export async function getSahimReviewQueue(): Promise<SahimReviewItem[]> {
  const result = await requestServerGraphQL<{ sahimReviewQueue: SahimReviewItem[] }>(REVIEW_QUEUE);
  return result.sahimReviewQueue;
}

export async function reviewSahimItem(id: string, approve: boolean, note: string, mergeTemplateId?: number): Promise<ActionResult> {
  if (!id || (mergeTemplateId !== undefined && (!Number.isSafeInteger(mergeTemplateId) || mergeTemplateId < 1))) return { ok: false, message: "Invalid review selection." };
  if (!approve && !note.trim()) return { ok: false, message: "Add a reason before rejecting this contribution." };
  try {
    await requestServerGraphQL(REVIEW, { id, approve, note: note.trim().slice(0, 500) || null, mergeTemplateId: mergeTemplateId ?? null });
    revalidatePath("/sahim");
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("BARCODE_CONFLICT") || message.includes("BARCODE_ALREADY_ASSIGNED")) return { ok: false, message: "This barcode is already assigned. Refresh the queue and review the product." };
    if (message.includes("BARCODE_ALREADY_PENDING")) return { ok: false, message: "This barcode already has a pending contribution." };
    if (message.includes("SKU_CONFLICT")) return { ok: false, message: "A variant already uses this SKU." };
    if (message.includes("MERGE_CATEGORY_MISMATCH")) return { ok: false, message: "The chosen template is not in the same category." };
    return { ok: false, message: "Review could not be saved. Refresh and try again." };
  }
}

export async function createContributorAccount(name: string, email: string): Promise<ActionResult> {
  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();
  if (cleanName.length < 2 || cleanName.length > 120) return { ok: false, message: "Name must be between 2 and 120 characters." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return { ok: false, message: "Enter a valid email address." };

  try {
    await requestServerGraphQL(CREATE_CONTRIBUTOR, { name: cleanName, email: cleanEmail });
    revalidatePath("/sahim");
    return { ok: true };
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }
}

export async function setContributorAccountActive(userId: number, active: boolean): Promise<ActionResult> {
  if (!Number.isSafeInteger(userId) || userId < 1 || typeof active !== "boolean") return { ok: false, message: "Invalid contributor." };
  try {
    await requestServerGraphQL(SET_ACTIVE, { userId, active });
    revalidatePath("/sahim");
    return { ok: true };
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }
}

export async function resetContributorAccountAccess(userId: number): Promise<ActionResult> {
  if (!Number.isSafeInteger(userId) || userId < 1) return { ok: false, message: "Invalid contributor." };
  try {
    await requestServerGraphQL(RESET_ACCESS, { userId });
    revalidatePath("/sahim");
    return { ok: true };
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }
}
