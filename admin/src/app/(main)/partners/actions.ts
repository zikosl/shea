"use server";

import { createResourceActions } from "@/lib/resource-actions";
import { requestServerGraphQL } from "@/lib/server-request";

import { Item, link, title_plural, title_singular } from "./_constant";
import {
  CREATE_ITEM,
  DELETE_ITEM,
  FIND_MANY_ITEMS,
  FIND_ONE_ITEM,
  UPDATE_ITEM
} from "./_constant/request";
import { FIND_MANY_NICHES } from "@/api/queries";
import { gql } from "graphql-request";
import {
  AccountSaveResult,
  getAccountSaveErrorCode,
} from "@/lib/form-errors";

type PartnerResponse = {
  id: string;
  companyName: string;
  primaryColor?: string | null;
  feeType?: "NONE" | "PERCENTAGE" | "FIXED" | "MIXED";
  feeRate?: number | null;
  fixedFee?: number | null;
  driverRequestFee?: number | null;
  niches?: ({
    id: string;
    niche_id: number | string | null;
    niche?: Niche | null;
  } | number)[];
  user: {
    email: string;
    password?: string;
  };
};

const mapPartner = (data: PartnerResponse) =>
  data
    ? {
        id: data.id,
    companyName: data.companyName,
    primaryColor: data.primaryColor ?? "#CC6F98",
    feeType: data.feeType ?? "NONE",
    feeRate: Number(data.feeRate ?? 0),
    fixedFee: Number(data.fixedFee ?? 0),
    driverRequestFee: data.driverRequestFee ?? null,
        email: data.user.email,
        password: data.user.password,
        niches: (data.niches ?? [])
          .map((item) => Number(typeof item === "number" ? item : item.niche_id))
          .filter((id) => Number.isFinite(id)),
        partnerNiches: (data.niches ?? []).filter((item) => typeof item !== "number"),
      }
    : null;

const resourceActions = createResourceActions<PartnerResponse, Item>({
  createMutation: CREATE_ITEM,
  deleteMutation: DELETE_ITEM,
  findManyQuery: FIND_MANY_ITEMS,
  findOneQuery: FIND_ONE_ITEM,
  updateMutation: UPDATE_ITEM,
  singularKey: title_singular,
  pluralKey: title_plural,
  path: link,
  mapItem: mapPartner,
});

export const {
  createItem,
  getItemById,
  getSearchItem,
  updateItem,
  deleteItem
} = resourceActions;

type PartnerAccountInput = Partial<{
  companyName: string;
  email: string;
  primaryColor: string;
  feeType: "NONE" | "PERCENTAGE" | "FIXED" | "MIXED";
  feeRate: number;
  fixedFee: number;
  driverRequestFee: number | null;
  niches: number[];
}>;

export async function savePartnerAccount(
  id: string | undefined,
  data: PartnerAccountInput,
): Promise<AccountSaveResult<Item>> {
  try {
    const item = id
      ? await resourceActions.updateItem(id, data as Partial<PartnerResponse>)
      : await resourceActions.createItem(data as Partial<PartnerResponse>);
    return { ok: true, item };
  } catch (error) {
    return { ok: false, code: getAccountSaveErrorCode(error) };
  }
}

export async function getPartnerFormNiches() {
  const response = await requestServerGraphQL<{
    findManyNiches: {
      niches: Niche[];
    };
  }>(FIND_MANY_NICHES, {
    search: undefined,
    page: 1,
    limit: 100,
    isFull: true,
  });

  return response.findManyNiches.niches;
}

const PARTNER_CAPABILITIES = gql`
  query PartnerCapabilities($partnerId: Int!) {
    capabilityCatalog
    effectiveCapabilities(partnerId: $partnerId) {
      code
      enabled
      source
    }
    inheritedCapabilities(partnerId: $partnerId) {
      code
      enabled
      source
    }
    partnerCapabilityOverrides(partnerId: $partnerId) {
      capability
      effect
    }
  }
`;

const SET_PARTNER_CAPABILITIES = gql`
  mutation SetPartnerCapabilities(
    $partnerId: Int!
    $enabled: [CapabilityCode!]!
    $disabled: [CapabilityCode!]!
  ) {
    setPartnerCapabilities(
      partnerId: $partnerId
      enabled: $enabled
      disabled: $disabled
    ) {
      capability
      effect
    }
  }
`;

export async function getPartnerCapabilities(partnerId: string): Promise<PartnerCapabilityConfig> {
  const response = await requestServerGraphQL<{
    capabilityCatalog: CapabilityCode[];
    effectiveCapabilities: PartnerCapabilityConfig["effective"];
    inheritedCapabilities: PartnerCapabilityConfig["inherited"];
    partnerCapabilityOverrides: PartnerCapabilityConfig["overrides"];
  }>(PARTNER_CAPABILITIES, { partnerId: Number(partnerId) });

  return {
    catalog: response.capabilityCatalog,
    effective: response.effectiveCapabilities,
    inherited: response.inheritedCapabilities,
    overrides: response.partnerCapabilityOverrides,
  };
}

export async function savePartnerCapabilities(
  partnerId: string,
  overrides: Record<CapabilityCode, CapabilityOverrideEffect | null>,
) {
  await requestServerGraphQL(SET_PARTNER_CAPABILITIES, {
    partnerId: Number(partnerId),
    enabled: Object.entries(overrides).filter(([, effect]) => effect === "ENABLE").map(([capability]) => capability),
    disabled: Object.entries(overrides).filter(([, effect]) => effect === "DISABLE").map(([capability]) => capability),
  });
}
