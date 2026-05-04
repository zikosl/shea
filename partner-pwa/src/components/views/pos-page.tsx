"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { CheckCircle2, ChevronDown, Minus, Plus, ReceiptText, ShoppingBag, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { usePartnerStore } from "@/store/partner-store";
import type { PosPaymentMethod } from "@/types/app";
import { currency, resolveAssetUrl } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";

export function PosPage() {
  const { products, posCart, posTickets, addToPosCart, updatePosLineQuantity, removeFromPosCart, clearPosCart, completePosTicket } = usePartnerStore();
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<number | "all">("all");
  const [paymentMethod, setPaymentMethod] = useState<PosPaymentMethod>("cash");
  const catalog = products;
  const categories = useMemo(() => {
    const entries = new Map<number, string>();
    for (const product of products) {
      if (product.category_id && product.category?.name) {
        entries.set(product.category_id, product.category.name);
      }
    }
    return Array.from(entries.entries()).map(([id, name]) => ({ id, name }));
  }, [products]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return catalog.filter((product) => {
      const matchesCategory = categoryId === "all" || product.category_id === categoryId;
      const haystack = [product.name, product.sku, product.variantName, product.brand?.name, product.category?.name].filter(Boolean).join(" ").toLowerCase();
      const matchesQuery = !query || haystack.includes(query);
      return matchesCategory && matchesQuery;
    });
  }, [catalog, categoryId, search]);

  const total = useMemo(() => posCart.reduce((sum, line) => sum + line.price * line.quantity, 0), [posCart]);
  const cartQuantity = useMemo(() => posCart.reduce((sum, line) => sum + line.quantity, 0), [posCart]);
  const lastTicket = posTickets[0];

  return (
    <section className="grid h-full min-h-0 gap-3 overflow-hidden lg:grid-rows-[auto_1fr]">
      <PageHeader title="POS" back />

      <div className="grid min-h-0 gap-3 overflow-hidden xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.45fr)] xl:items-start">
        <div className="grid min-h-0 gap-3 lg:grid-rows-[auto_auto_1fr]">
          <div className="ds-toolbar rounded-[20px] p-2.5">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center">
              <SearchInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search products or SKU"
                inputClassName="!min-h-10"
              />
              <div className="ds-toolbar-stat">
                <ShoppingBag className="h-3.5 w-3.5 text-[hsl(var(--primary-strong))]" />
                {filteredProducts.length} results
              </div>
              <div className="ds-toolbar-stat">
                {cartQuantity} in cart
              </div>
            </div>
          </div>

          <div className="ds-toolbar flex gap-1 overflow-x-auto rounded-[18px] p-1">
            <button
              type="button"
              onClick={() => setCategoryId("all")}
              className={`min-h-9 shrink-0 rounded-[14px] px-3 text-[13px] font-semibold transition ${categoryId === "all" ? "bg-[hsl(var(--solid))] text-[hsl(var(--solid-foreground))]" : "text-[hsl(var(--muted-foreground))] hover:bg-[hsla(var(--primary),0.12)]"}`}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setCategoryId(category.id)}
                className={`min-h-9 shrink-0 rounded-[14px] px-3 text-[13px] font-semibold transition ${categoryId === category.id ? "bg-[hsl(var(--solid))] text-[hsl(var(--solid-foreground))]" : "text-[hsl(var(--muted-foreground))] hover:bg-[hsla(var(--primary),0.12)]"}`}
              >
                {category.name}
              </button>
            ))}
          </div>

          <div className="workspace-scroll grid auto-rows-max gap-2 pr-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filteredProducts.length ? (
              filteredProducts.map((product) => {
                const disabled = !product.available || (product.stock ?? 0) <= 0;
                return (
                  <button
                    type="button"
                    key={product.id}
                    disabled={disabled}
                    onClick={() => {
                      if (disabled) {
                        toast.error("This product is unavailable or out of stock.");
                        return;
                      }
                      addToPosCart(product);
                    }}
                    className="ds-list-row group rounded-[18px] p-2.5 text-left transition hover:-translate-y-[1px] hover:shadow-[0_16px_24px_-22px_hsla(var(--shadow),0.22)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-sm font-semibold leading-tight">{product.name}</h3>
                        {product.brand?.name ? <Badge className="px-2 py-0.5 text-[9px]">{product.brand.name}</Badge> : null}
                      </div>
                      <p className="mt-1 truncate text-[11px] text-[hsl(var(--muted-foreground))]">{product.sku || product.variantName || "No SKU"}</p>
                    </div>
                    {product.images[0]?.url ? (
                      <Image unoptimized src={resolveAssetUrl(product.images[0].url)} alt={product.name} width={48} height={48} className="h-12 w-12 rounded-[0.85rem] object-cover" />
                    ) : (
                      <div className="ds-subtle-surface flex h-12 w-12 shrink-0 items-center justify-center rounded-[0.85rem] text-[10px] text-[hsl(var(--muted-foreground))]">
                        No img
                      </div>
                    )}
                  </div>
                  <div className="mt-2.5 flex items-end justify-between gap-3">
                    <div>
                      <span className="text-base font-semibold tracking-[-0.03em]">{currency(product.price)}</span>
                      <p className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))]">{product.stock ?? 0} in stock</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] transition ${disabled ? "bg-[hsla(var(--danger),0.12)] text-[hsl(var(--danger))]" : "bg-[hsla(var(--primary),0.34)] text-[hsl(var(--primary-strong))] group-hover:bg-[hsla(var(--primary),0.48)]"}`}>
                      {disabled ? "Blocked" : "Add"}
                    </span>
                  </div>
                  </button>
                );
              })
            ) : (
              <EmptyState title="No sellable products" body="Activate template variants and keep them visible in POS to start selling." />
            )}
          </div>
        </div>

        <div className="ds-surface grid min-h-0 gap-2.5 rounded-[22px] p-3 lg:grid-rows-[auto_minmax(0,1fr)_auto] xl:sticky xl:top-0 xl:self-start xl:max-h-full">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[1.05rem] font-semibold tracking-[-0.04em]">{posCart.length ? `${posCart.length} item${posCart.length === 1 ? "" : "s"}` : "Ready to sell"}</h2>
              <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))]">{cartQuantity} total units selected</p>
            </div>
            {posCart.length ? (
              <button type="button" onClick={clearPosCart} className="ds-danger-button rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]">
                Clear
              </button>
            ) : null}
          </div>

          <div className="workspace-scroll space-y-1.5 pr-1 scrollbar-thin">
            {posCart.length ? (
              posCart.map((line) => (
                <div key={line.productId} className="ds-subtle-surface rounded-[16px] p-2.5">
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{line.name}</p>
                      <p className="mt-0.5 truncate text-[11px] text-[hsl(var(--muted-foreground))]">{line.sku || "No SKU"}</p>
                    </div>
                    <button type="button" onClick={() => removeFromPosCart(line.productId)} className="ds-danger-button rounded-full p-1.5">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between gap-2">
                    <div className="ds-surface flex items-center gap-1.5 rounded-full px-1.5 py-0.5">
                      <button type="button" onClick={() => updatePosLineQuantity(line.productId, line.quantity - 1)} className="ds-secondary-button rounded-full p-1">
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="min-w-6 text-center text-sm font-semibold">{line.quantity}</span>
                      <button type="button" onClick={() => updatePosLineQuantity(line.productId, line.quantity + 1)} className="ds-secondary-button rounded-full p-1">
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <span className="text-sm font-semibold tracking-[-0.02em]">{currency(line.price * line.quantity)}</span>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState title="Add products to start" />
            )}
          </div>

          <div className="ds-pos-checkout sticky bottom-0 rounded-[18px] p-3">
            <div className="mb-3 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">
              <span>Payment</span>
              <span>{paymentMethod}</span>
            </div>
            <div className="relative mb-2.5">
              <select
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value as PosPaymentMethod)}
                className="ds-select ds-pos-checkout-field w-full !min-h-10 !rounded-[14px] !py-2 pr-11 text-sm"
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="transfer">Transfer</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
            </div>
            <div className="ds-pos-checkout-total rounded-[14px] px-3.5 py-2.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[hsl(var(--muted-foreground))]">Total</span>
                <span className="text-xl font-semibold tracking-[-0.03em]">{currency(total)}</span>
              </div>
            </div>
            <button
              type="button"
              disabled={!posCart.length}
              onClick={async () => {
                await completePosTicket({ customerName: undefined, note: undefined, discount: 0, paymentMethod });
                setPaymentMethod("cash");
                toast.success(navigator.onLine ? "POS sale saved." : "POS sale queued.");
              }}
              className="ds-primary-button mt-2.5 inline-flex w-full items-center justify-center gap-2 rounded-[14px] px-4 py-2.5 text-sm font-semibold text-[hsl(var(--foreground-on-solid))] disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              Complete sale
            </button>
            {lastTicket ? (
              <div className="mt-3 rounded-[14px] border border-[hsla(var(--border),0.9)] bg-[hsla(var(--card),0.26)] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <ReceiptText className="h-4 w-4 text-[hsl(var(--primary-strong))]" />
                    <span className="text-sm font-semibold">Last receipt</span>
                  </div>
                  <Badge tone={lastTicket.syncStatus === "local" ? "warning" : "success"}>{lastTicket.syncStatus || "synced"}</Badge>
                </div>
                <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{lastTicket.lines.length} items / {currency(lastTicket.total)}</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
