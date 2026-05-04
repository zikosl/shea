"use client";

import { cn } from "@/lib/utils";

export function FilterTabs<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ value: T; label: string; count?: number }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="ds-toolbar flex gap-1 overflow-x-auto rounded-[18px] p-1">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex min-h-9 shrink-0 items-center gap-2 rounded-[14px] px-3 text-[13px] font-semibold transition",
              active
                ? "bg-[hsl(var(--solid))] text-[hsl(var(--solid-foreground))] shadow-[0_12px_22px_-18px_hsla(var(--shadow),0.42)]"
                : "text-[hsl(var(--muted-foreground))] hover:bg-[hsla(var(--primary),0.12)] hover:text-[hsl(var(--foreground))]",
            )}
          >
            <span>{option.label}</span>
            {typeof option.count === "number" ? (
              <span className={cn("rounded-full px-1.5 py-0.5 text-[10px]", active ? "bg-white/14" : "bg-[hsla(var(--muted),0.72)]")}>{option.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
