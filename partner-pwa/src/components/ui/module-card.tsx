"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function ModuleCard({
  href,
  title,
  description,
  icon: Icon,
  tone = "rose",
  meta,
}: {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  tone?: "rose" | "violet" | "green" | "amber" | "blue";
  meta?: React.ReactNode;
}) {
  const tones = {
    rose: "bg-[hsla(var(--primary),0.22)] text-[hsl(var(--primary-strong))]",
    violet: "bg-[hsla(var(--accent),0.24)] text-[hsl(var(--accent-strong))]",
    green: "bg-[hsla(var(--success),0.14)] text-[hsl(var(--success))]",
    amber: "bg-[hsla(var(--warning),0.16)] text-[hsl(var(--warning-foreground))]",
    blue: "bg-[hsla(207,72%,58%,0.14)] text-[hsl(207,72%,56%)]",
  } as const;

  return (
    <Link
      href={href}
      className="ds-surface group flex min-h-[132px] flex-col justify-between rounded-[22px] p-3.5 transition duration-200 hover:-translate-y-0.5 hover:border-[hsla(var(--primary-strong),0.42)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-[14px] border border-[hsla(var(--border),0.82)]", tones[tone])}>
          <Icon className="h-4.5 w-4.5" />
        </div>
        <ArrowRight className="h-4 w-4 text-[hsl(var(--muted-foreground))] transition group-hover:translate-x-1 group-hover:text-[hsl(var(--foreground))]" />
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold">{title}</h2>
          {meta}
        </div>
        <p className="text-[13px] leading-5 text-[hsl(var(--muted-foreground))]">{description}</p>
      </div>
    </Link>
  );
}
