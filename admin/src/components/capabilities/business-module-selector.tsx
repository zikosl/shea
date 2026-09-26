"use client";

import { Boxes, Check, Factory, Gift, RotateCcw, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  businessModuleOrder,
  BusinessModuleChoice,
  BusinessModuleCode,
} from "@/lib/business-modules";

const moduleDetails: Record<BusinessModuleCode, {
  title: string;
  description: string;
  includes: string;
  icon: typeof Boxes;
}> = {
  CUSTOM_SALES: {
    title: "Custom Sales",
    description: "Price and fulfill requests that are not standard catalog orders.",
    includes: "Custom orders, quotations, pickup and delivery",
    icon: Boxes,
  },
  GIFT_STUDIO: {
    title: "Gift Studio",
    description: "Create, schedule and showcase personalized gifts.",
    includes: "Gift builder, templates, gallery and gift reporting",
    icon: Gift,
  },
  PRODUCTION_WORKFLOW: {
    title: "Production",
    description: "Prepare made-to-order work through clear operational stages.",
    includes: "Preparation, stock reservation and production tasks",
    icon: Factory,
  },
};

const presets: Array<{ label: string; modules: BusinessModuleCode[] }> = [
  { label: "Retail", modules: [] },
  { label: "Custom sales", modules: ["CUSTOM_SALES"] },
  { label: "Gift store", modules: ["CUSTOM_SALES", "GIFT_STUDIO"] },
  { label: "Full studio", modules: businessModuleOrder },
];

type Props = {
  values: Record<BusinessModuleCode, BusinessModuleChoice>;
  onChange: (values: Record<BusinessModuleCode, BusinessModuleChoice>) => void;
  inherited?: Partial<Record<BusinessModuleCode, boolean>>;
  allowInheritance?: boolean;
  showPresets?: boolean;
};

export function BusinessModuleSelector({ values, onChange, inherited, allowInheritance = false, showPresets = true }: Props) {
  function setModule(code: BusinessModuleCode, choice: BusinessModuleChoice) {
    const next = { ...values, [code]: choice };
    if (code === "GIFT_STUDIO" && choice === "ENABLE") next.CUSTOM_SALES = "ENABLE";
    if (code === "CUSTOM_SALES" && choice === "DISABLE") next.GIFT_STUDIO = "DISABLE";
    if (code === "CUSTOM_SALES" && choice === "INHERIT" && next.GIFT_STUDIO === "ENABLE") next.GIFT_STUDIO = "INHERIT";
    onChange(next);
  }

  function applyPreset(modules: BusinessModuleCode[]) {
    const enabled = new Set(modules);
    onChange(Object.fromEntries(businessModuleOrder.map((module) => [
      module,
      enabled.has(module) ? "ENABLE" : "DISABLE",
    ])) as Record<BusinessModuleCode, BusinessModuleChoice>);
  }

  const effectiveEnabled = businessModuleOrder.filter((module) =>
    values[module] === "ENABLE" || (values[module] === "INHERIT" && inherited?.[module]),
  ).length;

  return (
    <section className="space-y-4 rounded-2xl border bg-muted/20 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">Business modules</h3>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose complete workflows instead of configuring individual technical permissions.
          </p>
        </div>
        <Badge variant="secondary" className="w-fit rounded-full">{effectiveEnabled} active</Badge>
      </div>

      {showPresets ? (
        <div className="flex flex-wrap gap-2" aria-label="Business module presets">
          {presets.map((preset) => (
            <Button key={preset.label} type="button" variant="outline" size="sm" className="rounded-full" onClick={() => applyPreset(preset.modules)}>
              {preset.label}
            </Button>
          ))}
          {allowInheritance ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-full"
              onClick={() => onChange(Object.fromEntries(businessModuleOrder.map((module) => [module, "INHERIT"])) as Record<BusinessModuleCode, BusinessModuleChoice>)}
            >
              <RotateCcw className="h-3.5 w-3.5" /> Use inherited
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-3">
        {businessModuleOrder.map((code) => {
          const details = moduleDetails[code];
          const Icon = details.icon;
          const choice = values[code];
          const enabled = choice === "ENABLE" || (choice === "INHERIT" && inherited?.[code]);
          return (
            <article
              key={code}
              className={cn(
                "flex min-h-56 flex-col rounded-2xl border bg-background p-4 transition-colors",
                enabled && "border-primary/35 bg-primary/[0.025]",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground", enabled && "bg-primary/10 text-primary")}>
                  <Icon className="h-5 w-5" />
                </div>
                <Badge variant={enabled ? "default" : "outline"} className="rounded-full">
                  {enabled ? <Check className="mr-1 h-3 w-3" /> : null}
                  {choice === "INHERIT" ? `Inherited ${enabled ? "on" : "off"}` : enabled ? "Enabled" : "Disabled"}
                </Badge>
              </div>
              <h4 className="mt-4 font-semibold">{details.title}</h4>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">{details.description}</p>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">{details.includes}</p>
              {code === "GIFT_STUDIO" ? <p className="mt-2 text-xs font-medium text-primary">Includes Custom Sales automatically</p> : null}
              <div className="mt-auto pt-4">
                {allowInheritance ? (
                  <select
                    aria-label={`${details.title} setting`}
                    value={choice}
                    onChange={(event) => setModule(code, event.target.value as BusinessModuleChoice)}
                    className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                  >
                    <option value="INHERIT">Use inherited setting</option>
                    <option value="ENABLE">Enable for this partner</option>
                    <option value="DISABLE">Disable for this partner</option>
                  </select>
                ) : (
                  <Button type="button" variant={enabled ? "default" : "outline"} className="w-full rounded-xl" onClick={() => setModule(code, enabled ? "DISABLE" : "ENABLE")}>
                    {enabled ? "Enabled" : "Enable module"}
                  </Button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
