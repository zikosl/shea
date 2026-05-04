"use client";

import { BackButton } from "@/components/ui/back-button";

export function PageHeader({
  title,
  meta,
  back,
}: {
  title: string;
  meta?: React.ReactNode;
  back?: boolean;
}) {
  return (
    <div className="flex min-h-[38px] items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        {back ? <BackButton /> : null}
        <h1 className="truncate text-[1.3rem] font-semibold tracking-[-0.03em] text-[hsl(var(--foreground))] sm:text-[1.45rem]">{title}</h1>
      </div>
      {meta ? <div className="flex items-center gap-2">{meta}</div> : null}
    </div>
  );
}
