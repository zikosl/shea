"use server";

import { revalidatePath } from "next/cache";

import { CREATE_SCHEDULE, DELETE_SCHEDULE, UPSERT_PRICING } from "@/api/mutations";
import { FIND_MANY_PRICING, FIND_MANY_SCHEDULES } from "@/api/queries";
import { requestServerGraphQL } from "@/lib/server-request";
import { gql } from "graphql-request";
import { BusinessModuleCode, capabilitiesFromModules } from "@/lib/business-modules";

export type PricingName = "APP_TAX" | "NORMAL_DELIVERY_TAX" | "DRIVER_REQUEST_FEE" | "GROUP_DELIVERY_TAX" | "STORE_TAX" | "PICKUP_TAX";
export type PricingItem = { id: number; name: PricingName; price: number };
export type ScheduleItem = { id: number; time: string; isActive: boolean };

const GLOBAL_CAPABILITIES = gql`
  query GlobalBusinessModules {
    capabilityCatalog
    globalCapabilitySettings { capability enabled }
  }
`;

const SET_GLOBAL_CAPABILITIES = gql`
  mutation SetGlobalCapabilities($enabled: [CapabilityCode!]!) {
    setGlobalCapabilities(enabled: $enabled) { capability enabled }
  }
`;

export async function getCommerceSettings() {
  const [pricing, schedules, capabilities] = await Promise.all([
    requestServerGraphQL<{ findManyPricing: PricingItem[] }>(FIND_MANY_PRICING),
    requestServerGraphQL<{ findManySchedule: ScheduleItem[] }>(FIND_MANY_SCHEDULES),
    requestServerGraphQL<{
      capabilityCatalog: CapabilityCode[];
      globalCapabilitySettings: Array<{ capability: CapabilityCode; enabled: boolean }>;
    }>(GLOBAL_CAPABILITIES),
  ]);
  return {
    pricing: pricing.findManyPricing,
    schedules: schedules.findManySchedule.sort((a, b) => a.time.localeCompare(b.time)),
    globalCapabilities: capabilities.globalCapabilitySettings
      .filter((item) => item.enabled)
      .map((item) => item.capability),
  };
}

export async function saveGlobalBusinessModules(modules: BusinessModuleCode[]) {
  const response = await requestServerGraphQL<{ capabilityCatalog: CapabilityCode[] }>(gql`
    query CapabilityCatalogForGlobalModules { capabilityCatalog }
  `);
  const enabled = capabilitiesFromModules(modules);
  await requestServerGraphQL(SET_GLOBAL_CAPABILITIES, {
    enabled: response.capabilityCatalog.filter((capability) => enabled.has(capability)),
  });
  revalidatePath("/commerce-settings");
}

export async function savePricing(name: PricingName, price: number) {
  if (!Number.isInteger(price) || price < 0) throw new Error("Enter a valid non-negative DZD amount");
  await requestServerGraphQL(UPSERT_PRICING, { name, price });
  revalidatePath("/commerce-settings");
}

export async function addSchedule(time: string) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error("Use a valid 24-hour time");
  await requestServerGraphQL(CREATE_SCHEDULE, { time });
  revalidatePath("/commerce-settings");
}

export async function removeSchedule(id: number) {
  await requestServerGraphQL(DELETE_SCHEDULE, { id });
  revalidatePath("/commerce-settings");
}
