import Link from "next/link";
import type { ComponentType } from "react";
import {
  ArrowRight,
  Boxes,
  CircleDollarSign,
  ClipboardCheck,
  PackageSearch,
  ShoppingBag,
  Sparkles,
  Truck,
  Users,
  WalletCards,
} from "lucide-react";

import { ADMIN_DASHBOARD_STATS } from "@/api/queries";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requestServerGraphQL } from "@/lib/server-request";

import { Search } from "./_components/search";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

type DashboardWindow = {
  orders: number;
  grossRevenue: number;
  partnerFees: number;
  netRevenue: number;
  averageOrderValue: number;
};

type TrendPoint = {
  label: string;
  orders: number;
  revenue: number;
};

type NamedMetric = {
  id: string;
  name: string;
  count: number;
  value?: number | null;
};

type RecentOrder = {
  id: number;
  date: string;
  total: number;
  source: string;
  partnerName?: string | null;
  clientName?: string | null;
};

type AdminDashboardStats = {
  today: DashboardWindow;
  week: DashboardWindow;
  month: DashboardWindow;
  totalOrders: number;
  pendingDeliveries: number;
  completedDeliveries: number;
  canceledDeliveries: number;
  clientsCount: number;
  partnersCount: number;
  activePartners: number;
  driversCount: number;
  activeDrivers: number;
  nichesCount: number;
  categoriesCount: number;
  productTemplatesCount: number;
  productsCount: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  pendingProductRequests: number;
  ordersTrend: TrendPoint[];
  topPartners: NamedMetric[];
  topNiches: NamedMetric[];
  recentOrders: RecentOrder[];
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "DZD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

async function getDashboardStats() {
  const response = await requestServerGraphQL<{ adminDashboardStats: AdminDashboardStats }>(
    ADMIN_DASHBOARD_STATS,
  );

  return response.adminDashboardStats;
}

function KpiCard({
  title,
  value,
  description,
  icon: Icon,
  href,
}: {
  title: string;
  value: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  href?: string;
}) {
  const content = (
    <Card className="group h-full transition-colors hover:bg-muted/25">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div>
          <CardDescription>{title}</CardDescription>
          <CardTitle className="mt-2 text-2xl tracking-tight">{value}</CardTitle>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border bg-muted/40 text-muted-foreground transition-colors group-hover:text-foreground">
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );

  if (!href) return content;

  return (
    <Link href={href} className="block h-full">
      {content}
    </Link>
  );
}

export default async function DashboardPage() {
  const stats = await getDashboardStats();
  const maxTrendRevenue = Math.max(...stats.ordersTrend.map((point) => point.revenue), 1);
  const maxPartnerValue = Math.max(...stats.topPartners.map((partner) => partner.value ?? 0), 1);
  const alerts = [
    { label: "Pending product requests", value: stats.pendingProductRequests, href: "/product-requests" },
    { label: "Low-stock products", value: stats.lowStockProducts, href: "/products" },
    { label: "Out of stock", value: stats.outOfStockProducts, href: "/products" },
    { label: "Pending deliveries", value: stats.pendingDeliveries, href: "/dispatch" },
  ];

  return (
    <ContentLayout
      title="Dashboard"
      description="Real operational health across revenue, orders, catalog, partners, clients, and delivery."
      actions={<Search />}
    >
      <div className="space-y-5">
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
          <Card className="overflow-hidden">
            <CardHeader className="border-b">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-muted/35 px-3 py-1 text-xs font-medium text-muted-foreground">
                    <Sparkles className="h-3.5 w-3.5" />
                    Live business overview
                  </div>
                  <CardTitle className="max-w-3xl text-2xl">
                    Today: {formatMoney(stats.today.grossRevenue)} from {formatNumber(stats.today.orders)} orders.
                  </CardTitle>
                  <CardDescription className="mt-2 max-w-2xl">
                    Net benefit after partner fees is {formatMoney(stats.today.netRevenue)} with an average order of{" "}
                    {formatMoney(stats.today.averageOrderValue)}.
                  </CardDescription>
                </div>
                <Button asChild variant="outline">
                  <Link href="/product-requests">
                    Review requests
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 p-4 md:grid-cols-3">
              <div className="rounded-2xl border bg-background p-4">
                <p className="text-sm text-muted-foreground">This week</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight">{formatMoney(stats.week.grossRevenue)}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatNumber(stats.week.orders)} orders · net {formatMoney(stats.week.netRevenue)}
                </p>
              </div>
              <div className="rounded-2xl border bg-background p-4">
                <p className="text-sm text-muted-foreground">This month</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight">{formatMoney(stats.month.grossRevenue)}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatNumber(stats.month.orders)} orders · net {formatMoney(stats.month.netRevenue)}
                </p>
              </div>
              <div className="rounded-2xl border bg-background p-4">
                <p className="text-sm text-muted-foreground">Fees collected</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight">{formatMoney(stats.month.partnerFees)}</p>
                <p className="mt-1 text-sm text-muted-foreground">Current month platform benefit</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Needs attention</CardTitle>
              <CardDescription>Fast links to operational items that can block the day.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {alerts.map((alert) => (
                <Link
                  key={alert.label}
                  href={alert.href}
                  className="group flex items-center justify-between rounded-xl border p-3 transition-colors hover:bg-muted/35"
                >
                  <span className="text-sm font-medium">{alert.label}</span>
                  <Badge variant={alert.value > 0 ? "default" : "secondary"}>{formatNumber(alert.value)}</Badge>
                </Link>
              ))}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard title="Total orders" value={formatNumber(stats.totalOrders)} description={`${formatNumber(stats.completedDeliveries)} completed deliveries`} icon={ShoppingBag} />
          <KpiCard title="Clients" value={formatNumber(stats.clientsCount)} description="Registered shopping accounts" icon={Users} href="/users" />
          <KpiCard title="Partners" value={`${formatNumber(stats.activePartners)}/${formatNumber(stats.partnersCount)}`} description="Online partners out of total" icon={WalletCards} href="/partners" />
          <KpiCard title="Drivers" value={`${formatNumber(stats.activeDrivers)}/${formatNumber(stats.driversCount)}`} description="Online and available drivers" icon={Truck} href="/drivers" />
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard title="Niches" value={formatNumber(stats.nichesCount)} description={`${formatNumber(stats.categoriesCount)} categories configured`} icon={PackageSearch} href="/niches" />
          <KpiCard title="Templates" value={formatNumber(stats.productTemplatesCount)} description="Global catalog templates" icon={Boxes} href="/product-templates" />
          <KpiCard title="Partner products" value={formatNumber(stats.productsCount)} description="Vendor inventory records" icon={ClipboardCheck} href="/products" />
          <KpiCard title="Monthly net" value={formatMoney(stats.month.netRevenue)} description={`${formatMoney(stats.month.partnerFees)} partner fees`} icon={CircleDollarSign} />
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.9fr)]">
          <Card>
            <CardHeader>
              <CardTitle>Orders and revenue trend</CardTitle>
              <CardDescription>Last 7 days based on real order records.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex h-64 items-end gap-3 rounded-2xl border bg-muted/20 p-4">
                {stats.ordersTrend.map((point) => {
                  const height = Math.max(8, (point.revenue / maxTrendRevenue) * 100);

                  return (
                    <div key={point.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                      <div className="flex h-44 w-full items-end rounded-full bg-background">
                        <div
                          className="w-full rounded-full bg-foreground transition-all"
                          style={{ height: `${height}%` }}
                          title={`${point.orders} orders · ${formatMoney(point.revenue)}`}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">{point.label}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent orders</CardTitle>
              <CardDescription>Latest activity across online and POS flows.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats.recentOrders.length ? (
                stats.recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between gap-4 rounded-xl border p-3">
                    <div className="min-w-0">
                      <p className="font-medium">Order #{order.id}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {order.partnerName ?? "Unknown partner"} · {order.clientName ?? order.source}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-medium">{formatMoney(order.total)}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(order.date)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No orders yet.</div>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Top partners</CardTitle>
              <CardDescription>Partners ranked by order volume and revenue.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats.topPartners.length ? (
                stats.topPartners.map((partner) => {
                  const width = Math.max(4, ((partner.value ?? 0) / maxPartnerValue) * 100);
                  return (
                    <div key={partner.id} className="space-y-2">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-medium">{partner.name}</span>
                        <span className="text-muted-foreground">{partner.count} orders</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-foreground" style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No partner order data yet.</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Catalog distribution</CardTitle>
              <CardDescription>Top niches by global product templates.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats.topNiches.length ? (
                stats.topNiches.map((niche) => (
                  <div key={niche.id} className="flex items-center justify-between rounded-xl border p-3">
                    <span className="font-medium">{niche.name}</span>
                    <Badge variant="secondary">{niche.count} templates</Badge>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No niche data yet.</div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </ContentLayout>
  );
}
