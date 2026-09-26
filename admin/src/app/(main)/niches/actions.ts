"use server";

import { createResourceActions } from "@/lib/resource-actions";
import { requestServerGraphQL } from "@/lib/server-request";
import { gql } from "graphql-request";
import { capabilityOverridesFromModuleChoices } from "@/lib/business-modules";

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
  query NicheCapabilities($nicheId: Int) {
    capabilityCatalog
    globalCapabilitySettings { capability enabled }
    nicheCapabilityDefaults(nicheId: $nicheId) {
      capability
      enabledByDefault
    }
  }
`;

const SET_NICHE_CAPABILITIES = gql`
  mutation SetNicheCapabilities($nicheId: Int!, $enabled: [CapabilityCode!]!, $disabled: [CapabilityCode!]!) {
    setNicheCapabilities(nicheId: $nicheId, enabled: $enabled, disabled: $disabled) {
      capability
      enabledByDefault
    }
  }
`;

export async function getNicheCapabilities(nicheId?: string) {
  const response = await requestServerGraphQL<{
    capabilityCatalog: CapabilityCode[];
    globalCapabilitySettings: Array<{ capability: CapabilityCode; enabled: boolean }>;
    nicheCapabilityDefaults: Array<{ capability: CapabilityCode; enabledByDefault: boolean }>;
  }>(NICHE_CAPABILITIES, { nicheId: nicheId ? Number(nicheId) : undefined });

  return {
    catalog: response.capabilityCatalog,
    inherited: response.globalCapabilitySettings.filter((item) => item.enabled).map((item) => item.capability),
    overrides: response.nicheCapabilityDefaults,
  };
}

export async function saveNicheCapabilities(
  nicheId: string,
  choices: Record<BusinessModuleCode, BusinessModuleChoice>,
) {
  const catalog = await requestServerGraphQL<{ capabilityCatalog: CapabilityCode[] }>(gql`
    query CapabilityCatalog { capabilityCatalog }
  `);
  const overrides = capabilityOverridesFromModuleChoices(catalog.capabilityCatalog, choices);
  await requestServerGraphQL(SET_NICHE_CAPABILITIES, {
    nicheId: Number(nicheId),
    enabled: catalog.capabilityCatalog.filter((capability) => overrides[capability] === "ENABLE"),
    disabled: catalog.capabilityCatalog.filter((capability) => overrides[capability] === "DISABLE"),
  });
}
