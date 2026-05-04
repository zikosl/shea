"use client";

import Link from "next/link";
import { Loader2, Moon, RefreshCw, Sun, UserRound } from "lucide-react";
import { useTheme } from "next-themes";

import { IconButton } from "@/components/ui/icon-button";

export function WorkspaceTopbar({
  companyName,
  email,
  isSyncing,
  onRefresh,
}: {
  companyName?: string | null;
  email?: string | null;
  isSyncing: boolean;
  onRefresh: () => void;
}) {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <header className="ds-toolbar rounded-[20px] px-2.5 py-2">
      <div className="mr-auto hidden min-w-0 items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))] md:inline-flex">
        Workspace
      </div>
      <Link href="/settings" className="group inline-flex min-w-0 items-center gap-2 rounded-full px-1.5 py-1 transition hover:bg-[hsla(var(--foreground),0.03)]">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[hsla(var(--primary),0.22)] text-[hsl(var(--primary-strong))]">
          <UserRound className="h-4 w-4" />
        </div>
        <div className="min-w-0 hidden sm:block">
          <p className="truncate text-sm font-semibold leading-none">{companyName || "Store"}</p>
          <p className="mt-1 truncate text-[11px] text-[hsl(var(--muted-foreground))]">{email || "Partner"}</p>
        </div>
      </Link>
      <IconButton type="button" onClick={onRefresh} aria-label="Refresh workspace" className="h-8 w-8">
        {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
      </IconButton>
      <IconButton
        type="button"
        onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        aria-label={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        className="h-8 w-8"
      >
        {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </IconButton>
    </header>
  );
}
