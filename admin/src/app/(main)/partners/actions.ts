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

type PartnerResponse = {
  id: string;
  companyName: string;
  feeType?: "NONE" | "PERCENTAGE" | "FIXED" | "MIXED";
  feeRate?: number | null;
  fixedFee?: number | null;
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
    feeType: data.feeType ?? "NONE",
    feeRate: Number(data.feeRate ?? 0),
    fixedFee: Number(data.fixedFee ?? 0),
        email: data.user.email,
        password: data.user.password,
        niches: (data.niches ?? [])
          .map((item) => Number(typeof item === "number" ? item : item.niche_id))
          .filter((id) => Number.isFinite(id)),
        partnerNiches: (data.niches ?? []).filter((item) => typeof item !== "number"),
      }
    : null;

export const {
  createItem,
  getItemById,
  getSearchItem,
  updateItem,
  deleteItem
} = createResourceActions<PartnerResponse, Item>({
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
