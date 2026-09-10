"use server";

import { gql } from "graphql-request";
import { requestServerGraphQL } from "@/lib/server-request";

export type ResettableAccount = "partner" | "driver";

type ResetAccessCodeErrorCode = "EMAIL_FAILED" | "ACCOUNT_NOT_FOUND" | "UNKNOWN";

export type ResetAccessCodeResult =
  | { ok: true }
  | { ok: false; code: ResetAccessCodeErrorCode };

const RESET_PARTNER_ACCESS_CODE = gql`
  mutation ResetPartnerAccessCode($id: Int!) {
    resetPartnerAccessCode(id: $id)
  }
`;

const RESET_DRIVER_ACCESS_CODE = gql`
  mutation ResetDriverAccessCode($id: Int!) {
    resetDriverAccessCode(id: $id)
  }
`;

function getResetErrorCode(error: unknown): ResetAccessCodeErrorCode {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("ACCESS_CODE_EMAIL_FAILED")) return "EMAIL_FAILED";
  if (message.includes("_NOT_FOUND")) return "ACCOUNT_NOT_FOUND";
  return "UNKNOWN";
}

export async function resetAccessCode(
  account: ResettableAccount,
  id: string,
): Promise<ResetAccessCodeResult> {
  const profileId = Number(id);
  if (!Number.isInteger(profileId) || profileId <= 0) {
    return { ok: false, code: "ACCOUNT_NOT_FOUND" };
  }

  try {
    if (account === "partner") {
      await requestServerGraphQL(RESET_PARTNER_ACCESS_CODE, { id: profileId });
    } else {
      await requestServerGraphQL(RESET_DRIVER_ACCESS_CODE, { id: profileId });
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, code: getResetErrorCode(error) };
  }
}
