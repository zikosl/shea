"use client";

import { useMemo } from "react";
import { Boxes, ClipboardList, PackageX, TrendingUp } from "lucide-react";

import { usePartnerStore } from "@/store/partner-store";
import { currency, sumOrderValue } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";

export function StatisticsPage() {
  const { orders, products, posTickets } = usePartnerStore();
  const revenue = useMemo(() => orders.reduce((total, order) => total + sumOrderValue(order.items), 0), [orders]);
  const posRevenue = useMemo(() => posTickets.reduce((total, ticket) => total + ticket.total, 0), [posTickets]);
  const averageOrder = orders.length ? revenue / orders.length : 0;
  const lowStock = products.filter((product) => (product.stock ?? 0) <= 3);
  const topProducts = useMemo(() => {
    const totals = new Map<string, { name: string; quantity: number; revenue: number }>();

    for (const order of orders) {
      for (const item of order.items) {
        const name = item.product?.name || "Unnamed product";
        const current = totals.get(name) || { name, quantity: 0, revenue: 0 };
        totals.set(name, {
          name,
          quantity: current.quantity + item.quantity,
          revenue: current.revenue + item.quantity * item.price,
        });
      }
    }

    return Array.from(totals.values()).sort((a, b) => b.quantity - a.quantity).slice(0, 5);
  }, [orders]);
  const chartBars = [28, 46, 35, 64, 52, 78, 58];

  return (
    <section className="grid h-full min-h-0 gap-3 overflow-hidden lg:grid-rows-[auto_auto_1fr]">
      <PageHeader title="Statistics" back meta={<Badge tone="accent">{orders.length} orders</Badge>} />

      <div className="grid gap-3 md:grid-cols-4">
        <MetricCard label="Sales" value={currency(revenue + posRevenue)} hint="Orders and POS" tone="accent" />
        <MetricCard label="Orders" value={`${orders.length}`} hint="Active backend orders" tone="default" />
        <MetricCard label="Average" value={currency(averageOrder)} hint="Average order value" tone="success" />
        <MetricCard label="Low stock" value={`${lowStock.length}`} hint="Needs attention" tone={lowStock.length ? "warning" : "default"} />
      </div>

      <div className="grid min-h-0 gap-3 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="ds-surface rounded-[22px] p-4">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Revenue trend</h2>
              <p className="text-[13px] text-[hsl(var(--muted-foreground))]">Lightweight view until historical analytics are exposed by the API.</p>
            </div>
            <TrendingUp className="h-5 w-5 text-[hsl(var(--primary-strong))]" />
          </div>
          <div className="ds-subtle-surface flex h-[220px] items-end gap-2.5 rounded-[18px] p-3">
            {chartBars.map((value, index) => (
              <div key={index} className="flex flex-1 flex-col items-center gap-2">
                <div className="w-full rounded-t-[16px] border border-[hsla(var(--border),0.9)] bg-[linear-gradient(180deg,hsla(var(--primary-strong),0.82),hsla(var(--accent-strong),0.54))]" style={{ height: `${value}%` }} />
                <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{["M", "T", "W", "T", "F", "S", "S"][index]}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="grid min-h-0 gap-3">
          <div className="ds-surface rounded-[22px] p-4">
            <div className="mb-4 flex items-center gap-3">
              <ClipboardList className="h-5 w-5 text-[hsl(var(--primary-strong))]" />
              <h2 className="text-base font-semibold">Top products</h2>
            </div>
            <div className="space-y-2">
              {topProducts.length ? (
                topProducts.map((product) => (
                  <div key={product.name} className="ds-subtle-surface flex items-center justify-between gap-3 rounded-[16px] px-3 py-2.5">
                    <span className="truncate text-sm font-medium">{product.name}</span>
                    <Badge>{product.quantity}</Badge>
                  </div>
                ))
              ) : (
                <EmptyState title="No sales yet" />
              )}
            </div>
          </div>

          <div className="ds-surface rounded-[22px] p-4">
            <div className="mb-4 flex items-center gap-3">
              {lowStock.length ? <PackageX className="h-5 w-5 text-[hsl(var(--warning-foreground))]" /> : <Boxes className="h-5 w-5 text-[hsl(var(--success))]" />}
              <h2 className="text-base font-semibold">Stock alerts</h2>
            </div>
            <div className="space-y-2">
              {lowStock.length ? (
                lowStock.slice(0, 5).map((product) => (
                  <div key={product.id} className="ds-subtle-surface flex items-center justify-between gap-3 rounded-[16px] px-3 py-2.5">
                    <span className="truncate text-sm font-medium">{product.name}</span>
                    <Badge tone={(product.stock ?? 0) <= 0 ? "danger" : "warning"}>{product.stock ?? 0}</Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[hsl(var(--muted-foreground))]">No low-stock products.</p>
              )}
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
