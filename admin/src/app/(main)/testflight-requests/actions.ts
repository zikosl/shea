"use server";

import { revalidatePath } from "next/cache";
import { gql } from "graphql-request";
import { requestServerGraphQL } from "@/lib/server-request";

export type TestFlightRequest = {
  id: string;
  email: string;
  status: "REQUESTED" | "INVITED";
  createdAt: string;
  invitedAt: string | null;
};

const REQUESTS = gql`query AdminTestFlightRequests { adminTestFlightRequests { id email status createdAt invitedAt } }`;
const MARK_SENT = gql`mutation MarkTestFlightInvitationSent($id: String!) { markTestFlightInvitationSent(id: $id) { id status } }`;

export async function getTestFlightRequests(): Promise<TestFlightRequest[]> {
  const data = await requestServerGraphQL<{ adminTestFlightRequests: TestFlightRequest[] }>(REQUESTS);
  return data.adminTestFlightRequests;
}

export async function markTestFlightInvitationSent(id: string): Promise<{ ok: boolean; message?: string }> {
  if (!/^[a-f0-9-]{36}$/i.test(id)) return { ok: false, message: "Invalid request. Refresh and try again." };
  try {
    await requestServerGraphQL(MARK_SENT, { id });
    revalidatePath("/testflight-requests");
    return { ok: true };
  } catch {
    return { ok: false, message: "Could not update this request. Refresh and try again." };
  }
}
