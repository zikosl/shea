export type BusinessModuleCode = "CUSTOM_SALES" | "GIFT_STUDIO" | "PRODUCTION_WORKFLOW";
export type BusinessModuleChoice = "INHERIT" | "ENABLE" | "DISABLE";

export const businessModuleOrder: BusinessModuleCode[] = [
  "CUSTOM_SALES",
  "GIFT_STUDIO",
  "PRODUCTION_WORKFLOW",
];

export const businessModuleCapabilities: Record<BusinessModuleCode, CapabilityCode[]> = {
  CUSTOM_SALES: ["CUSTOM_ORDERS", "QUOTATIONS", "DELIVERY_PICKUP"],
  GIFT_STUDIO: ["GIFT_BUILDER", "GIFT_TEMPLATES", "GIFT_GALLERY", "GIFT_REPORTS"],
  PRODUCTION_WORKFLOW: ["PRODUCTION", "PRODUCTION_TASKS"],
};

export const businessModuleDependencies: Partial<Record<BusinessModuleCode, BusinessModuleCode[]>> = {
  GIFT_STUDIO: ["CUSTOM_SALES"],
};

export function modulesFromCapabilities(capabilities: Iterable<CapabilityCode>) {
  const enabled = new Set(capabilities);
  return new Set(businessModuleOrder.filter((moduleCode) =>
    businessModuleCapabilities[moduleCode].some((capability) => enabled.has(capability)),
  ));
}

export function capabilitiesFromModules(modules: Iterable<BusinessModuleCode>) {
  const selected = new Set(modules);
  if (selected.has("GIFT_STUDIO")) selected.add("CUSTOM_SALES");
  return new Set([...selected].flatMap((moduleCode) => businessModuleCapabilities[moduleCode]));
}

export function moduleChoicesFromOverrides(
  overrides: Array<{ capability: CapabilityCode; effect: CapabilityOverrideEffect }>,
) {
  const byCapability = new Map(overrides.map((item) => [item.capability, item.effect]));
  return Object.fromEntries(businessModuleOrder.map((moduleCode) => {
    const effects = businessModuleCapabilities[moduleCode]
      .map((capability) => byCapability.get(capability))
      .filter(Boolean) as CapabilityOverrideEffect[];
    const choice: BusinessModuleChoice = effects.includes("ENABLE")
      ? "ENABLE"
      : effects.includes("DISABLE")
        ? "DISABLE"
        : "INHERIT";
    return [moduleCode, choice];
  })) as Record<BusinessModuleCode, BusinessModuleChoice>;
}

export function capabilityOverridesFromModuleChoices(
  catalog: CapabilityCode[],
  choices: Record<BusinessModuleCode, BusinessModuleChoice>,
) {
  const normalized = { ...choices };
  if (normalized.GIFT_STUDIO === "ENABLE") normalized.CUSTOM_SALES = "ENABLE";
  if (normalized.CUSTOM_SALES === "DISABLE") normalized.GIFT_STUDIO = "DISABLE";

  const result = Object.fromEntries(catalog.map((code) => [code, null])) as Record<CapabilityCode, CapabilityOverrideEffect | null>;
  for (const moduleCode of businessModuleOrder) {
    const choice = normalized[moduleCode];
    for (const capability of businessModuleCapabilities[moduleCode]) {
      result[capability] = choice === "INHERIT" ? null : choice;
    }
  }
  return result;
}
