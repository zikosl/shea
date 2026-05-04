"use client";

import { cn } from "@/lib/utils";

export function IconButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full border border-[hsla(var(--border),0.75)] bg-[hsla(var(--card),0.72)] text-[hsl(var(--muted-foreground))] transition hover:border-[hsla(var(--primary-strong),0.26)] hover:bg-[hsla(var(--primary),0.14)] hover:text-[hsl(var(--foreground))]",
        className,
      )}
    >
      {children}
    </button>
  );
}
