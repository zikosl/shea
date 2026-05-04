"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, ChevronLeft, ChevronRight, ClipboardList, PackageSearch, ScanLine, ShoppingBag, Sparkles, UserRound } from "lucide-react";

import { cn, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const nav = [
  { href: "/dashboard", label: "Modules", icon: Sparkles },
  { href: "/pos", label: "POS", icon: ScanLine },
  { href: "/stock", label: "Stock", icon: PackageSearch },
  { href: "/orders", label: "Orders", icon: ClipboardList },
  { href: "/statistics", label: "Statistics", icon: BarChart3 },
  { href: "/products/templates", label: "Templates", icon: ShoppingBag },
  { href: "/settings", label: "Settings", icon: UserRound },
] as const;

export function WorkspaceSidebar({
  collapsed,
  onToggle,
  companyName,
  isOnline,
  pendingQueue,
  lastSyncedAt,
}: {
  collapsed: boolean;
  onToggle: () => void;
  companyName?: string | null;
  isOnline: boolean;
  pendingQueue: number;
  lastSyncedAt: string | null;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "ds-surface partner-sidebar relative flex w-full shrink-0 flex-col gap-3 rounded-[28px] p-3 lg:h-full",
        collapsed ? "lg:w-[96px]" : "lg:w-[272px]",
      )}
    >
      <div className="partner-gradient ds-grid-glow rounded-[22px] p-3.5">
        <div className={cn("flex items-center", collapsed ? "justify-center" : "justify-between gap-3")}>
          <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-3")}>
            <div className="flex h-10 w-10 items-center justify-center rounded-[1rem] bg-[hsla(var(--card),0.78)] text-[hsl(var(--primary-strong))] shadow-[0_14px_24px_-18px_hsla(var(--shadow),0.36)]">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
            {!collapsed ? (
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">Shea Partner</p>
                <h1 className="truncate text-lg font-semibold">{companyName || "Store"}</h1>
              </div>
            ) : null}
          </div>
        </div>
        {!collapsed ? (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Badge tone={isOnline ? "success" : "danger"}>{isOnline ? "Live" : "Offline"}</Badge>
            <Badge tone={pendingQueue ? "warning" : "default"}>{pendingQueue} queued</Badge>
          </div>
        ) : null}
      </div>

      <nav className="space-y-2">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center rounded-[16px] border py-2.5 transition",
                collapsed ? "justify-center px-3" : "justify-between px-4",
                active
                  ? "border-transparent bg-[linear-gradient(180deg,hsla(var(--primary),0.54),hsla(var(--primary),0.34))] text-[hsl(var(--foreground))] shadow-[0_16px_28px_-24px_hsla(var(--primary-strong),0.16)]"
                  : "border-transparent text-[hsl(var(--muted-foreground))] hover:bg-[hsla(var(--primary),0.12)] hover:text-[hsl(var(--foreground))]",
              )}
            >
              <span className={cn("flex items-center", collapsed ? "" : "gap-3")}>
                <Icon
                  className={cn(
                    "h-4 w-4 transition-colors",
                    active ? "text-[hsl(var(--primary-strong))]" : "text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--primary-strong))]",
                  )}
                />
                {!collapsed ? <span className={cn("text-sm font-medium transition-colors", active ? "text-[hsl(var(--foreground))]" : "text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--foreground))]")}>{item.label}</span> : null}
              </span>
              {!collapsed && active ? <span className="h-2 w-2 rounded-full bg-[hsl(var(--primary-strong))]" /> : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3">
        {!collapsed ? (
          <div className="partner-hero rounded-[20px] px-3.5 py-3 text-xs text-[hsl(var(--muted-foreground))]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">Latest sync</p>
            <p className="mt-1 text-sm font-medium text-[hsl(var(--foreground))]">{lastSyncedAt ? formatDate(lastSyncedAt) : "Waiting for sync"}</p>
          </div>
        ) : null}

        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "ds-secondary-button inline-flex items-center rounded-full px-3 py-2 text-sm font-medium",
            collapsed ? "h-10 w-10 justify-center self-center" : "justify-between self-stretch",
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <span>Collapse</span>
              <ChevronLeft className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
