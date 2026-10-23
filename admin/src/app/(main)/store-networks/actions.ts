"use server";

import { revalidatePath } from "next/cache";
import { gql } from "graphql-request";
import { requestServerGraphQL } from "@/lib/server-request";

const CONFIGURE = gql`
  mutation ConfigureStoreNetwork(
    $storeId: String!
    $cloudSyncEnabled: Boolean!
    $cloudGatewayUrl: String
    $localGatewayUrl: String
  ) {
    configureStoreNetwork(
      storeId: $storeId
      cloudSyncEnabled: $cloudSyncEnabled
      cloudGatewayUrl: $cloudGatewayUrl
      localGatewayUrl: $localGatewayUrl
    ) { id }
  }
`;

const AUTHORIZE_POS_TRANSFER = gql`
  mutation AuthorizePosDeviceTransfer($deviceId: String!, $targetPartnerId: Int!) {
    authorizePosDeviceTransfer(deviceId: $deviceId, targetPartnerId: $targetPartnerId) { id }
  }
`;

const CANCEL_POS_TRANSFER = gql`
  mutation CancelPosDeviceTransfer($deviceId: String!) {
    cancelPosDeviceTransfer(deviceId: $deviceId)
  }
`;

export type StoreNetworkActionState = { status: "idle" | "success" | "error"; message?: string };

export async function saveStoreNetwork(
  _state: StoreNetworkActionState,
  formData: FormData,
): Promise<StoreNetworkActionState> {
  try {
    await requestServerGraphQL(CONFIGURE, {
      storeId: String(formData.get("storeId") || ""),
      cloudSyncEnabled: formData.get("cloudSyncEnabled") === "on",
      cloudGatewayUrl: String(formData.get("cloudGatewayUrl") || "") || null,
      localGatewayUrl: String(formData.get("localGatewayUrl") || "") || null,
    });
    revalidatePath("/store-networks");
    return { status: "success", message: "Store gateway configuration saved." };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Configuration could not be saved." };
  }
}

export async function authorizePosDeviceTransfer(
  _state: StoreNetworkActionState,
  formData: FormData,
): Promise<StoreNetworkActionState> {
  try {
    const deviceId = String(formData.get("deviceId") || "");
    const targetPartnerId = Number(formData.get("targetPartnerId"));
    if (!deviceId || !Number.isSafeInteger(targetPartnerId) || targetPartnerId <= 0) {
      return { status: "error", message: "Choose a valid destination partner." };
    }
    await requestServerGraphQL(AUTHORIZE_POS_TRANSFER, { deviceId, targetPartnerId });
    revalidatePath("/store-networks");
    return { status: "success", message: "Transfer authorized. The POS must complete the transfer while online." };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Transfer could not be authorized." };
  }
}

export async function cancelPosDeviceTransfer(
  _state: StoreNetworkActionState,
  formData: FormData,
): Promise<StoreNetworkActionState> {
  try {
    const deviceId = String(formData.get("deviceId") || "");
    if (!deviceId) return { status: "error", message: "POS device is required." };
    await requestServerGraphQL(CANCEL_POS_TRANSFER, { deviceId });
    revalidatePath("/store-networks");
    return { status: "success", message: "Pending transfer authorization canceled." };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Transfer authorization could not be canceled." };
  }
}
