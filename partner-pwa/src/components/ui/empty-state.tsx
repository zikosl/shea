"use client";

import { Sparkles } from "lucide-react";

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="ds-surface partner-hero flex flex-col items-center rounded-[30px] px-6 py-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-[1.35rem] bg-[hsla(var(--primary),0.14)] text-[hsl(var(--primary-strong))]">
        <Sparkles className="h-5 w-5" />
      </div>
      <h3 className="ds-display mt-4 text-[2rem] leading-none">{title}</h3>
      {body ? <p className="mt-2 max-w-[42ch] text-sm text-[hsl(var(--muted-foreground))]">{body}</p> : null}
    </div>
  );
}
