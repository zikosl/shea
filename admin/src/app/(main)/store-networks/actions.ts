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
