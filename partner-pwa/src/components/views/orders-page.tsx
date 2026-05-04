"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarClock } from "lucide-react";

import { usePartnerStore } from "@/store/partner-store";
import type { DeliveryStatus, Order } from "@/types/app";
import { currency, formatDate, sumOrderValue } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterTabs } from "@/components/ui/filter-tabs";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";

type OrderFilter = "all" | "pending" | "progress" | "delivered" | "canceled";

function orderActions(status?: DeliveryStatus | null, type?: string | null) {
  if (status === "PENDING") {
    return [
      { status: "ACCEPTED" as DeliveryStatus, label: "Accept", variant: "primary" },
      { status: "CANCELED" as DeliveryStatus, label: "Reject", variant: "danger" },
    ];
  }

  if (status === "ACCEPTED") {
    return [
      { status: "READY" as DeliveryStatus, label: "Ready", variant: "primary" },
      { status: "CANCELED" as DeliveryStatus, label: "Cancel", variant: "danger" },
    ];
  }

  if (status === "READY" && type === "PICKUP") {
    return [{ status: "DELIVERED" as DeliveryStatus, label: "Collected", variant: "primary" }];
  }

  return [];
}

function customerName(order: Order) {
  const name = `${order.client?.firstname || ""} ${order.client?.lastname || ""}`.trim();
  return order.walkInCustomerName || name || order.client?.user?.email || "Walk-in customer";
}

export function OrdersPage() {
  const { orders, updateOrder } = usePartnerStore();
  const [filter, setFilter] = useState<OrderFilter>("all");
  const [search, setSearch] = useState("");
  const pendingOrders = orders.filter((order) => order.delivery?.status === "PENDING").length;
  const inProgressOrders = orders.filter((order) =>
    ["ACCEPTED", "READY", "ASSIGNED", "PICKED"].includes(order.delivery?.status || ""),
  ).length;
  const deliveredOrders = orders.filter((order) => order.delivery?.status === "DELIVERED").length;
  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    return orders.filter((order) => {
      const status = order.delivery?.status;
      const matchesFilter =
        filter === "all" ||
        (filter === "pending" && status === "PENDING") ||
        (filter === "progress" && ["ACCEPTED", "READY", "ASSIGNED", "PICKED"].includes(status || "")) ||
        (filter === "delivered" && status === "DELIVERED") ||
        (filter === "canceled" && status === "CANCELED");
      const haystack = [
        `#${order.id}`,
        customerName(order),
        order.paymentMethod,
        order.source,
        ...order.items.map((item) => item.product?.name),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesFilter && (!query || haystack.includes(query));
    });
  }, [filter, orders, search]);

  return (
    <section className="grid h-full min-h-0 gap-3 overflow-hidden lg:grid-rows-[auto_auto_auto_auto_1fr]">
      <PageHeader title="Order Management" back meta={<Badge tone={pendingOrders ? "warning" : "success"}>{pendingOrders} pending</Badge>} />
      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard label="Total" value={`${orders.length}`} hint="Visible orders" tone="accent" />
        <MetricCard label="In progress" value={`${inProgressOrders}`} hint="Being prepared" tone={inProgressOrders ? "success" : "default"} />
        <MetricCard label="Delivered" value={`${deliveredOrders}`} hint="Completed orders" tone="default" />
      </div>
      <div className="ds-toolbar rounded-[18px] p-2.5">
        <SearchInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search order, customer, payment, product" />
      </div>
      <FilterTabs<OrderFilter>
        value={filter}
        onChange={setFilter}
        options={[
          { value: "all", label: "All", count: orders.length },
          { value: "pending", label: "Pending", count: pendingOrders },
          { value: "progress", label: "In progress", count: inProgressOrders },
          { value: "delivered", label: "Delivered", count: deliveredOrders },
          { value: "canceled", label: "Canceled", count: orders.filter((order) => order.delivery?.status === "CANCELED").length },
        ]}
      />
      <div className="workspace-scroll grid gap-3 pr-1">
        {filteredOrders.length ? (
          filteredOrders.map((order) => {
            const total = sumOrderValue(order.items) - (order.discount || 0);
            return (
              <article
                key={order.id}
                className={`ds-surface ds-status-card rounded-[22px] p-3.5 ${
                  order.delivery?.status === "PENDING"
                    ? "ds-status-card-warning"
                    : order.delivery?.status === "CANCELED"
                      ? "ds-status-card-danger"
                      : "ds-status-card-success"
                }`}
              >
                <div className="grid gap-3 xl:grid-cols-[minmax(0,1.1fr)_auto_auto] xl:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold">Order #{order.id}</h3>
                      <Badge tone={order.delivery?.status === "PENDING" ? "warning" : order.delivery?.status === "CANCELED" ? "danger" : "success"}>
                        {order.delivery?.status || "Unknown"}
                      </Badge>
                      <Badge>{order.source || order.delivery?.type || "Order"}</Badge>
                    </div>
                    <p className="mt-1 truncate text-[13px] text-[hsl(var(--muted-foreground))]">{customerName(order)}</p>
                    <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]">
                      <CalendarClock className="h-3.5 w-3.5" />
                      {formatDate(order.date)}
                    </p>
                  </div>
                  <div className="ds-subtle-surface rounded-[16px] px-3 py-2.5 text-right">
                    <p className="text-xs uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">Total</p>
                    <p className="mt-1 text-base font-semibold">{currency(total)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 xl:justify-end">
                    <Link href={`/orders/${order.id}`} className="ds-secondary-button inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold">
                      Details
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                    {orderActions(order.delivery?.status, order.delivery?.type).map((action) => (
                      <button
                        key={action.status}
                        type="button"
                        onClick={() => updateOrder(order.id, action.status)}
                        className={
                          action.variant === "primary"
                            ? "ds-primary-button rounded-full px-3 py-1.5 text-xs font-semibold text-[hsl(var(--foreground-on-solid))]"
                            : "ds-danger-button rounded-full px-3 py-1.5 text-xs font-semibold"
                        }
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <EmptyState title="No orders found" body="Orders matching the current filters will appear here." />
        )}
      </div>
    </section>
  );
}
