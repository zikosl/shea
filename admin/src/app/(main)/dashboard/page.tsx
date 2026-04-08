import Link from "next/link";
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

import { Overview } from "./_components/overview";
import { RecentSales } from "./_components/recent-sales";
import { Search } from "./_components/search";

const stats = [
  {
    title: "Monthly revenue",
    value: "$45,231",
    change: "+12.8% vs last month",
    icon: CircleDollarSign
  },
  {
    title: "Orders processed",
    value: "1,284",
    change: "+86 fulfilled today",
    icon: ShoppingBag
  },
  {
    title: "Active partners",
    value: "48",
    change: "+6 newly onboarded",
    icon: Users
  },
  {
    title: "Products in catalog",
    value: "362",
    change: "14 awaiting review",
    icon: Boxes
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
      description="A cleaner operational snapshot for tracking revenue, orders, and team activity across the Shea admin workspace."
      actions={<Search />}
    >
      <div className="space-y-6">
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
          <Card className="overflow-hidden border-primary/10 bg-gradient-to-br from-primary/12 via-background to-background">
            <CardHeader className="pb-4">
              <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full bg-background/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                <ChartNoAxesCombined className="h-3.5 w-3.5" />
                Performance pulse
              </div>
              <CardTitle className="text-2xl sm:text-3xl">
                Keep merchandising and operations aligned from one polished workspace.
              </CardTitle>
              <CardDescription className="max-w-2xl text-sm sm:text-base">
                Review today&apos;s momentum, jump into the busiest sections, and keep the catalog moving without hunting through scattered screens.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 border-t border-border/70 pt-6 sm:grid-cols-3">
              {highlights.map((item) => (
                <div key={item.label} className="rounded-2xl border border-border/70 bg-background/75 p-4">
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight">{item.value}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
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
                    className="group flex items-center gap-4 rounded-2xl border border-border/70 bg-background/55 p-4 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-background/80"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{action.title}</p>
                      <p className="text-sm text-muted-foreground">{action.description}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
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
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                  <div>
                    <CardDescription className="text-sm">{stat.title}</CardDescription>
                    <CardTitle className="mt-3 text-3xl tracking-tight">{stat.value}</CardTitle>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-medium text-muted-foreground">{stat.change}</p>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]">
          <Card>
            <CardHeader className="flex flex-col gap-2 border-b border-border/70 pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <CardTitle>Revenue overview</CardTitle>
                <CardDescription>
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
              <CardDescription>
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
