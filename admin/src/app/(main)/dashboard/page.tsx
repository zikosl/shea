import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ArrowRight,
  Boxes,
  ChartNoAxesCombined,
  CircleDollarSign,
  PackagePlus,
  ShoppingBag,
  Truck,
  Users
} from "lucide-react";

import { ContentLayout } from "@/components/admin-panel/content-layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

import { RecentSales } from "./_components/recent-sales";
import { Search } from "./_components/search";
import { OverviewSkeleton } from "./_components/overview-skeleton";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

const Overview = dynamic(
  () => import("./_components/overview").then((module) => module.Overview),
  {
    loading: () => <OverviewSkeleton />,
  },
);

const stats = [
  {
    title: "Monthly revenue",
    value: "$45,231",
    change: "+12.8% vs last month",
    icon: CircleDollarSign,
    tone: "text-emerald-700 bg-emerald-500/10 border-emerald-500/20 dark:text-emerald-300"
  },
  {
    title: "Orders processed",
    value: "1,284",
    change: "+86 fulfilled today",
    icon: ShoppingBag,
    tone: "text-blue-700 bg-blue-500/10 border-blue-500/20 dark:text-blue-300"
  },
  {
    title: "Active partners",
    value: "48",
    change: "+6 newly onboarded",
    icon: Users,
    tone: "text-violet-700 bg-violet-500/10 border-violet-500/20 dark:text-violet-300"
  },
  {
    title: "Products in catalog",
    value: "362",
    change: "14 awaiting review",
    icon: Boxes,
    tone: "text-amber-700 bg-amber-500/10 border-amber-500/20 dark:text-amber-300"
  }
];

const quickActions = [
  {
    title: "Create product",
    description: "Add a new catalog entry with pricing and brand details.",
    href: "/products",
    icon: PackagePlus
  },
  {
    title: "Review partners",
    description: "Check partner records and update relationships quickly.",
    href: "/partners",
    icon: Users
  },
  {
    title: "Manage drivers",
    description: "Update driver availability and operational assignments.",
    href: "/drivers",
    icon: Truck
  }
];

const highlights = [
  { label: "Conversion rate", value: "24.8%" },
  { label: "Avg. basket", value: "$126" },
  { label: "Return rate", value: "2.1%" }
];

export default function DashboardPage() {
  return (
    <ContentLayout
      title="Dashboard"
      description="Track catalog health, partners, orders, and operational movement from one calm control room."
      actions={<Search />}
    >
      <div className="space-y-6">
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
          <Card className="overflow-hidden border-primary/15 bg-gradient-to-br from-primary/10 via-card to-card dark:border-sky-400/14 dark:from-sky-400/10 dark:via-white/5 dark:to-white/4">
            <CardHeader className="pb-4">
              <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-primary dark:bg-white/6 dark:text-sky-200">
                <ChartNoAxesCombined className="h-3.5 w-3.5" />
                Performance pulse
              </div>
              <CardTitle className="max-w-3xl text-2xl sm:text-3xl">
                Keep merchandising, partners, and fulfillment moving without noise.
              </CardTitle>
              <CardDescription className="max-w-2xl text-sm sm:text-base dark:text-slate-300">
                Review today&apos;s momentum and jump straight into the admin sections that need attention.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 border-t border-border/70 pt-6 dark:border-slate-400/10 sm:grid-cols-3">
              {highlights.map((item) => (
                <div key={item.label} className="rounded-2xl border border-border/70 bg-background/75 p-4 dark:border-slate-400/10 dark:bg-white/4">
                  <p className="text-sm text-muted-foreground dark:text-slate-400">{item.label}</p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight">{item.value}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/80">
            <CardHeader>
              <CardTitle>Quick actions</CardTitle>
              <CardDescription>
                Move straight into the admin sections that need the most daily attention.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {quickActions.map((action) => {
                const Icon = action.icon;

                return (
                  <Link
                    key={action.title}
                    href={action.href}
                  className="group flex items-center gap-4 rounded-2xl border border-border/70 bg-background/55 p-4 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-background/80 dark:border-slate-400/10 dark:bg-white/4 dark:hover:border-sky-400/20 dark:hover:bg-white/7"
                >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary dark:bg-sky-400/12 dark:text-sky-200">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold leading-tight">{action.title}</p>
                      <p className="text-sm text-muted-foreground dark:text-slate-400">{action.description}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary dark:text-slate-500 dark:group-hover:text-sky-200" />
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <Card key={stat.title} className="group overflow-hidden">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                  <div>
                    <CardDescription className="text-sm">{stat.title}</CardDescription>
                    <CardTitle className="mt-3 text-3xl tracking-tight">{stat.value}</CardTitle>
                  </div>
                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border transition-transform group-hover:scale-105 ${stat.tone}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-medium text-muted-foreground dark:text-slate-400">{stat.change}</p>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]">
          <Card>
            <CardHeader className="flex flex-col gap-2 border-b border-border/70 pb-5 dark:border-slate-400/10 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <CardTitle>Revenue overview</CardTitle>
                <CardDescription className="dark:text-slate-300">
                  Stable month-by-month performance to guide merchandising and partner planning.
                </CardDescription>
              </div>
              <Button variant="outline" asChild>
                <Link href="/products">View products</Link>
              </Button>
            </CardHeader>
            <CardContent className="pt-6">
              <Overview />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent sales</CardTitle>
              <CardDescription className="dark:text-slate-300">
                The latest customer payments recorded across the platform.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RecentSales />
            </CardContent>
          </Card>
        </section>
      </div>
    </ContentLayout>
  );
}
