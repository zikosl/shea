"use client";

import { Loader2 } from "lucide-react";

export function LoadingStage({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="ds-surface partner-hero flex w-full max-w-md flex-col items-center gap-4 rounded-[34px] px-8 py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-[hsla(var(--primary),0.18)]">
          <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--primary-strong))]" />
        </div>
        <p className="ds-kicker">Preparing workspace</p>
        <h1 className="ds-display text-[2.4rem] leading-none">Loading</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">{label}</p>
      </div>
    </div>
  );
}
