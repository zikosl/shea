"use client";

import { cn } from "@/lib/utils";

export function Badge({
  children,
  tone = "default",
  className,
}: {
  children: React.ReactNode;
  tone?: "default" | "success" | "warning" | "danger" | "accent";
  className?: string;
}) {
  const tones = {
    default: "border-[hsla(var(--border),0.92)] bg-[hsl(var(--pill))] text-[hsl(var(--pill-foreground))]",
    success: "border-[hsla(var(--success),0.18)] bg-[hsla(var(--success),0.14)] text-[hsl(var(--success))]",
    warning: "border-[hsla(var(--warning),0.2)] bg-[hsla(var(--warning),0.14)] text-[hsl(var(--warning-foreground))]",
    danger: "border-[hsla(var(--danger),0.18)] bg-[hsla(var(--danger),0.14)] text-[hsl(var(--danger))]",
    accent: "border-[hsla(var(--accent-strong),0.16)] bg-[hsla(var(--accent),0.22)] text-[hsl(var(--accent-strong))]",
  } as const;

  return <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]", tones[tone], className)}>{children}</span>;
}
