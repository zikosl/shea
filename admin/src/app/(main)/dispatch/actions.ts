"use server";

import { gql } from "graphql-request";
import { revalidatePath } from "next/cache";

import { requestServerGraphQL } from "@/lib/server-request";

export type DispatchLine = { id: number; name: string; quantity: number; price: number };
export type DispatchOrder = {
  orderId: number;
  deliveryId: number;
  status: "READY" | "ASSIGNED" | "PICKED";
  type: "NORMAL";
  createdAt: string;
  scheduledAt?: string | null;
  total: number;
  partnerName: string;
  partnerAddress?: string | null;
  partnerLatitude: number;
  partnerLongitude: number;
  clientName: string;
  clientPhone?: string | null;
  destinationAddress?: string | null;
  destinationLatitude?: number | null;
  destinationLongitude?: number | null;
  assignedDriverId?: number | null;
  dispatchCount: number;
  activeOfferCount: number;
  lastDispatchAt?: string | null;
  needsAttention: boolean;
  items: DispatchLine[];
};
export type DispatchDriver = {
  userId: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  latitude: number;
  longitude: number;
  online: boolean;
  isAvailable: boolean;
  locationUpdatedAt?: string | null;
  activeDeliveryCount: number;
  state: "AVAILABLE" | "IN_DELIVERY" | "UNAVAILABLE" | "OFFLINE" | "STALE";
};
export type DispatchBoard = { generatedAt: string; orders: DispatchOrder[]; drivers: DispatchDriver[] };

const BOARD = gql`
  query AdminDispatchBoard {
    adminDispatchBoard {
      generatedAt
      orders {
        orderId deliveryId status type createdAt scheduledAt total
        partnerName partnerAddress partnerLatitude partnerLongitude
        clientName clientPhone destinationAddress destinationLatitude destinationLongitude
        assignedDriverId dispatchCount activeOfferCount lastDispatchAt needsAttention
        items { id name quantity price }
      }
      drivers {
        userId name phone email latitude longitude online isAvailable
        locationUpdatedAt activeDeliveryCount state
      }
    }
  }
`;

const OFFER = gql`
  mutation AdminOfferDelivery($deliveryId: Int!, $driverId: Int!) {
    adminOfferDelivery(deliveryId: $deliveryId, driverId: $driverId) { id }
  }
`;
const ASSIGN = gql`
  mutation AdminAssignDelivery($deliveryId: Int!, $driverId: Int!, $force: Boolean, $reason: String) {
    adminAssignDelivery(deliveryId: $deliveryId, driverId: $driverId, force: $force, reason: $reason) { id }
  }
`;
const UNASSIGN = gql`
  mutation AdminUnassignDelivery($deliveryId: Int!, $reason: String!) {
    adminUnassignDelivery(deliveryId: $deliveryId, reason: $reason) { id }
  }
`;

export async function getDispatchBoard() {
  const response = await requestServerGraphQL<{ adminDispatchBoard: DispatchBoard }>(BOARD);
  return response.adminDispatchBoard;
}

export async function offerDelivery(deliveryId: number, driverId: number) {
  await requestServerGraphQL(OFFER, { deliveryId, driverId });
  revalidatePath("/dispatch");
}

export async function assignDelivery(deliveryId: number, driverId: number, force = false, reason = "") {
  await requestServerGraphQL(ASSIGN, { deliveryId, driverId, force, reason });
  revalidatePath("/dispatch");
}

export async function unassignDelivery(deliveryId: number, reason: string) {
  await requestServerGraphQL(UNASSIGN, { deliveryId, reason });
  revalidatePath("/dispatch");
}
