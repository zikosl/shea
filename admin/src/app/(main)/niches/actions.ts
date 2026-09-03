"use server";

import { createResourceActions } from "@/lib/resource-actions";
import { requestServerGraphQL } from "@/lib/server-request";
import { gql } from "graphql-request";

import { Item, link, title_plural, title_singular } from "./_constant";
import {
  CREATE_ITEM,
  DELETE_ITEM,
  FIND_MANY_ITEMS,
  FIND_ONE_ITEM,
  UPDATE_ITEM,
} from "./_constant/request";

export const {
  createItem,
  getItemById,
  getSearchItem,
  updateItem,
  deleteItem,
} = createResourceActions<Item>({
  createMutation: CREATE_ITEM,
  deleteMutation: DELETE_ITEM,
  findManyQuery: FIND_MANY_ITEMS,
  findOneQuery: FIND_ONE_ITEM,
  updateMutation: UPDATE_ITEM,
  singularKey: title_singular,
  pluralKey: title_plural,
  path: link,
});

const NICHE_CAPABILITIES = gql`
  query NicheCapabilities($nicheId: Int!) {
    capabilityCatalog
    nicheCapabilityDefaults(nicheId: $nicheId) {
      capability
      enabledByDefault
    }
  }
`;

const SET_NICHE_CAPABILITY = gql`
  mutation SetNicheCapability($nicheId: Int!, $capability: CapabilityCode!, $enabled: Boolean!) {
    setNicheCapability(nicheId: $nicheId, capability: $capability, enabled: $enabled) {
      capability
      enabledByDefault
    }
  }
`;

export async function getNicheCapabilities(nicheId: string) {
  const response = await requestServerGraphQL<{
    capabilityCatalog: CapabilityCode[];
    nicheCapabilityDefaults: Array<{ capability: CapabilityCode; enabledByDefault: boolean }>;
  }>(NICHE_CAPABILITIES, { nicheId: Number(nicheId) });

  return {
    catalog: response.capabilityCatalog,
    enabled: response.nicheCapabilityDefaults
      .filter((item) => item.enabledByDefault)
      .map((item) => item.capability),
  };
}

export async function saveNicheCapabilities(nicheId: string, enabledCapabilities: CapabilityCode[]) {
  const catalog = await requestServerGraphQL<{ capabilityCatalog: CapabilityCode[] }>(gql`
    query CapabilityCatalog { capabilityCatalog }
  `);
  const enabled = new Set(enabledCapabilities);
  await Promise.all(catalog.capabilityCatalog.map((capability) =>
    requestServerGraphQL(SET_NICHE_CAPABILITY, {
      nicheId: Number(nicheId),
      capability,
      enabled: enabled.has(capability),
    }),
  ));
}
