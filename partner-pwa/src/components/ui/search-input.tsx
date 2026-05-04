"use client";

import { Search } from "lucide-react";

import { cn } from "@/lib/utils";

export function SearchInput({
  className,
  inputClassName,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  inputClassName?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
      <input
        {...props}
        className={cn(
          "ds-input rounded-[16px] pl-9 shadow-none",
          inputClassName,
        )}
      />
    </div>
  );
}
