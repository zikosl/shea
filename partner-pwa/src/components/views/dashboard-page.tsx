"use client";

import { BarChart3, ClipboardList, PackageSearch, ScanLine, Settings, ShoppingBag, UsersRound, WalletCards } from "lucide-react";

import { usePartnerStore } from "@/store/partner-store";
import { PageHeader } from "@/components/ui/page-header";
import { ModuleCard } from "@/components/ui/module-card";
import { Badge } from "@/components/ui/badge";
import { currency, sumOrderValue } from "@/lib/utils";

const futureModules = [
  { label: "Customers", icon: UsersRound },
  { label: "Invoices", icon: WalletCards },
  { label: "Reports", icon: BarChart3 },
  { label: "Settings", icon: Settings },
] as const;

export function DashboardPage() {
  const { orders, products, templates, queue } = usePartnerStore();
  const revenue = orders.reduce((total, order) => total + sumOrderValue(order.items), 0);
  const lowStock = products.filter((product) => (product.stock ?? 0) <= 3).length;
  const activeOrders = orders.filter((order) => !["DELIVERED", "CANCELED"].includes(order.delivery?.status || "")).length;

  return (
    <section className="grid h-full min-h-0 gap-4 overflow-hidden lg:grid-rows-[auto_auto_1fr]">
      <PageHeader title="Modules" meta={<Badge tone={queue.length ? "warning" : "success"}>{queue.length ? `${queue.length} queued` : "Synced"}</Badge>} />

      <div className="grid gap-3 md:grid-cols-4">
        <div className="ds-surface rounded-[20px] p-3.5">
          <p className="text-[13px] text-[hsl(var(--muted-foreground))]">Today revenue</p>
          <p className="mt-1.5 text-[1.65rem] font-semibold">{currency(revenue)}</p>
        </div>
        <div className="ds-surface rounded-[20px] p-3.5">
          <p className="text-[13px] text-[hsl(var(--muted-foreground))]">Active orders</p>
          <p className="mt-1.5 text-[1.65rem] font-semibold">{activeOrders}</p>
        </div>
        <div className="ds-surface rounded-[20px] p-3.5">
          <p className="text-[13px] text-[hsl(var(--muted-foreground))]">Low stock</p>
          <p className="mt-1.5 text-[1.65rem] font-semibold">{lowStock}</p>
        </div>
        <div className="ds-surface rounded-[20px] p-3.5">
          <p className="text-[13px] text-[hsl(var(--muted-foreground))]">Templates</p>
          <p className="mt-1.5 text-[1.65rem] font-semibold">{templates.length}</p>
        </div>
      </div>

      <div className="workspace-scroll space-y-4 pr-1">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ModuleCard
            href="/pos"
            title="POS"
            description="Open the selling workspace, add items, and complete in-store tickets."
            icon={ScanLine}
            tone="rose"
            meta={<Badge>{products.length}</Badge>}
          />
          <ModuleCard
            href="/stock"
            title="Stock Management"
            description="Review vendor product instances, stock levels, and POS visibility."
            icon={PackageSearch}
            tone="green"
            meta={<Badge tone={lowStock ? "warning" : "success"}>{lowStock} low</Badge>}
          />
          <ModuleCard
            href="/orders"
            title="Order Management"
            description="Track customer orders, preparation status, and delivery handoff."
            icon={ClipboardList}
            tone="violet"
            meta={<Badge tone={activeOrders ? "warning" : "default"}>{activeOrders}</Badge>}
          />
          <ModuleCard
            href="/statistics"
            title="Statistics"
            description="Read sales, order volume, top products, and low-stock signals."
            icon={BarChart3}
            tone="blue"
            meta={<Badge tone="accent">{currency(revenue)}</Badge>}
          />
        </div>

        <div className="ds-surface rounded-[22px] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Catalog setup</h2>
              <p className="text-[13px] text-[hsl(var(--muted-foreground))]">Activate admin templates into vendor-owned products.</p>
            </div>
            <Badge tone="accent">Extensible</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ModuleCard
              href="/products/templates"
              title="Templates"
              description="Select variants from admin-created product templates."
              icon={ShoppingBag}
              tone="amber"
              meta={<Badge>{templates.length}</Badge>}
            />
            {futureModules.map((module) => {
              const Icon = module.icon;
              return (
                <div key={module.label} className="ds-subtle-surface flex min-h-[132px] flex-col justify-between rounded-[22px] p-3.5 opacity-80">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-[hsla(var(--border),0.86)] text-[hsl(var(--muted-foreground))]">
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold">{module.label}</h3>
                    <p className="mt-1.5 text-[13px] text-[hsl(var(--muted-foreground))]">Ready for a future module.</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
