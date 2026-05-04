"use client";

import { Activity, Boxes, CircleDollarSign, Truck } from "lucide-react";

import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "default" | "success" | "warning" | "accent";
}) {
  const tones = {
    default: {
      bar: "before:bg-[hsla(var(--primary-strong),0.92)]",
      icon: "bg-[hsla(var(--primary),0.2)] text-[hsl(var(--primary-strong))]",
      glow: "shadow-[inset_0_1px_0_hsla(0,0%,100%,0.5),0_16px_26px_-20px_hsla(var(--primary-strong),0.28)]",
      Icon: Boxes,
    },
    success: {
      bar: "before:bg-[hsla(var(--success),0.96)]",
      icon: "bg-[hsla(var(--success),0.16)] text-[hsl(var(--success))]",
      glow: "shadow-[inset_0_1px_0_hsla(0,0%,100%,0.5),0_16px_26px_-20px_hsla(var(--success),0.3)]",
      Icon: Truck,
    },
    warning: {
      bar: "before:bg-[hsla(var(--warning),0.96)]",
      icon: "bg-[hsla(var(--warning),0.16)] text-[hsl(var(--warning-foreground))]",
      glow: "shadow-[inset_0_1px_0_hsla(0,0%,100%,0.5),0_16px_26px_-20px_hsla(var(--warning),0.26)]",
      Icon: Activity,
    },
    accent: {
      bar: "before:bg-[hsla(var(--accent-strong),0.96)]",
      icon: "bg-[hsla(var(--accent),0.24)] text-[hsl(var(--accent-strong))]",
      glow: "shadow-[inset_0_1px_0_hsla(0,0%,100%,0.5),0_16px_26px_-20px_hsla(var(--accent-strong),0.3)]",
      Icon: CircleDollarSign,
    },
  } as const;

  const config = tones[tone];
  const Icon = config.Icon;

  return (
    <article
      className={cn(
        "ds-surface relative overflow-hidden rounded-[22px] p-3.5 before:absolute before:left-0 before:top-0 before:h-full before:w-1 transition duration-200 hover:-translate-y-0.5",
        config.bar,
        config.glow,
      )}
    >
      <div className="pointer-events-none absolute inset-x-3 top-0 h-16 rounded-b-[22px] bg-[linear-gradient(180deg,hsla(var(--primary),0.1),transparent)]" />
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-[hsl(var(--muted-foreground))]">{label}</p>
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-[0.95rem]", config.icon)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <h3 className="mt-3 text-[1.55rem] font-semibold tracking-[-0.05em]">{value}</h3>
      <p className="mt-1 text-[12px] text-[hsl(var(--muted-foreground))]">{hint}</p>
    </article>
  );
}
