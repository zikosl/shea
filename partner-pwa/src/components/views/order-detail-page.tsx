"use client";

import { Printer } from "lucide-react";

import { usePartnerStore } from "@/store/partner-store";
import { currency, formatDate, sumOrderValue } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export function OrderDetailPage({ id }: { id: number }) {
  const order = usePartnerStore((state) => state.orders.find((entry) => entry.id === id));

  if (!order) {
    return (
      <section className="grid h-full min-h-0 gap-3 overflow-hidden lg:grid-rows-[auto_1fr]">
        <PageHeader title="Order Detail" back />
        <EmptyState title="Order not found" body="Refresh the workspace or return to order management." />
      </section>
    );
  }

  const total = sumOrderValue(order.items) - (order.discount || 0);

  return (
    <section className="grid h-full min-h-0 gap-3 overflow-hidden lg:grid-rows-[auto_1fr]">
      <PageHeader title={`Order #${order.id}`} back meta={<Badge tone={order.delivery?.status === "CANCELED" ? "danger" : "success"}>{order.delivery?.status || "Unknown"}</Badge>} />
      <div className="workspace-scroll grid gap-3 pr-1 xl:grid-cols-[1fr_0.7fr]">
        <section className="ds-surface rounded-[28px] p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Items</h2>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">{formatDate(order.date)}</p>
            </div>
            <button type="button" onClick={() => window.print()} className="ds-secondary-button inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold">
              <Printer className="h-4 w-4" />
              Receipt
            </button>
          </div>
          <div className="space-y-2">
            {order.items.map((item, index) => (
              <div key={`${order.id}-${index}`} className="ds-subtle-surface flex items-center justify-between gap-3 rounded-[18px] p-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{item.product?.name || "Unnamed product"}</p>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">Qty {item.quantity} / {currency(item.price)}</p>
                </div>
                <p className="font-semibold">{currency(item.quantity * item.price)}</p>
              </div>
            ))}
          </div>
        </section>

        <aside className="grid gap-3">
          <div className="ds-surface rounded-[28px] p-5">
            <h2 className="text-lg font-semibold">Payment</h2>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[hsl(var(--muted-foreground))]">Subtotal</span>
                <span>{currency(sumOrderValue(order.items))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[hsl(var(--muted-foreground))]">Discount</span>
                <span>{currency(order.discount || 0)}</span>
              </div>
              <div className="border-t border-[hsla(var(--border),1)] pt-3">
                <div className="flex justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="text-xl font-semibold">{currency(total)}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="ds-surface rounded-[28px] p-5">
            <h2 className="text-lg font-semibold">Customer</h2>
            <p className="mt-3 font-medium">{order.walkInCustomerName || `${order.client?.firstname || ""} ${order.client?.lastname || ""}`.trim() || "Walk-in customer"}</p>
            <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{order.client?.user?.email || order.client?.user?.phone || "No contact"}</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
