"use server";

import { gql } from "graphql-request";
import { requestInternalGraphQL } from "@/lib/graphql";

const REQUEST_INVITE = gql`mutation RequestTestFlightInvite($email: String!) { requestTestFlightInvite(email: $email) }`;

export async function requestTestFlightInvite(email: string, website: string): Promise<{ ok: boolean; reason?: "invalid" | "limited" | "unavailable" }> {
  if (website) return { ok: true };
  const normalized = email.trim().toLowerCase();
  if (normalized.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return { ok: false, reason: "invalid" };
  try {
    await requestInternalGraphQL(REQUEST_INVITE, { email: normalized });
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("INVALID_TESTFLIGHT_EMAIL")) return { ok: false, reason: "invalid" };
    if (message.includes("TESTFLIGHT_REQUEST_RATE_LIMITED")) return { ok: false, reason: "limited" };
    return { ok: false, reason: "unavailable" };
  }
}
