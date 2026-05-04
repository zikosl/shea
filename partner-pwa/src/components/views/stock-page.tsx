"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Eye, EyeOff, Loader2, PackageX, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { usePartnerStore } from "@/store/partner-store";
import type { Product } from "@/types/app";
import { currency, resolveAssetUrl } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { FilterTabs } from "@/components/ui/filter-tabs";
import { PageHeader } from "@/components/ui/page-header";
import { FilterBar } from "@/components/workspace/filter-bar";

type StockFilter = "all" | "active" | "inactive" | "low" | "out";

function stockState(product: Product) {
  const stock = product.stock ?? 0;
  if (stock <= 0) {
    return { label: "Out", tone: "danger" as const };
  }
  if (stock <= 3) {
    return { label: "Low", tone: "warning" as const };
  }
  return { label: "Stocked", tone: "success" as const };
}

function StockRow({
  product,
  onSave,
  onDelete,
}: {
  product: Product;
  onSave: (id: number, input: { price?: number; stock?: number; available?: boolean }) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const [price, setPrice] = useState(product.price?.toString() || "");
  const [stock, setStock] = useState(product.stock?.toString() || "");
  const [available, setAvailable] = useState(!!product.available);
  const [loading, setLoading] = useState(false);
  const state = stockState(product);

  useEffect(() => {
    setPrice(product.price?.toString() || "");
    setStock(product.stock?.toString() || "");
    setAvailable(!!product.available);
  }, [product]);

  return (
    <article className="ds-list-row rounded-[22px] p-3.5">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)_auto] xl:items-center">
        <div className="flex min-w-0 items-center gap-3">
          {product.images[0]?.url ? (
            <Image unoptimized src={resolveAssetUrl(product.images[0].url)} alt={product.name} width={56} height={56} className="h-14 w-14 rounded-[14px] object-cover" />
          ) : (
            <div className="ds-subtle-surface flex h-14 w-14 shrink-0 items-center justify-center rounded-[14px] text-[11px] text-[hsl(var(--muted-foreground))]">
              No img
            </div>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-sm font-semibold">{product.name}</h3>
              <Badge tone={state.tone}>{state.label}</Badge>
              {available ? <Badge tone="success">POS</Badge> : <Badge>Hidden</Badge>}
            </div>
            <p className="mt-1 truncate text-[13px] text-[hsl(var(--muted-foreground))]">{product.variantName || product.sku || "Variant details unavailable"}</p>
            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Linked to template #{product.product_template_id ?? "N/A"} / variant #{product.variantId ?? "N/A"}</p>
          </div>
        </div>

        <div className="ds-subtle-surface grid gap-2.5 rounded-[18px] p-2.5 md:grid-cols-3">
          <Field label="Price">
            <input value={price} onChange={(event) => setPrice(event.target.value)} className="ds-input !min-h-10 !rounded-[14px] !px-3 !py-2 text-sm" />
          </Field>
          <Field label="Stock">
            <input value={stock} onChange={(event) => setStock(event.target.value)} className="ds-input !min-h-10 !rounded-[14px] !px-3 !py-2 text-sm" />
          </Field>
          <label className="flex items-end gap-2 pb-2 text-sm font-medium">
            <input type="checkbox" checked={available} onChange={(event) => setAvailable(event.target.checked)} className="ds-checkbox" />
            Visible
          </label>
        </div>

        <div className="flex flex-wrap gap-2 xl:justify-end">
          <Link href={`/stock/${product.id}`} className="ds-secondary-button inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold">
            {available ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            Details
          </Link>
          <button
            type="button"
            onClick={async () => {
              const nextPrice = Number(price);
              const nextStock = Number(stock);
              if (!Number.isFinite(nextPrice) || nextPrice < 0 || !Number.isInteger(nextStock) || nextStock < 0) {
                toast.error("Use a valid price and stock quantity.");
                return;
              }

              setLoading(true);
              try {
                await onSave(product.id, {
                  price: nextPrice,
                  stock: nextStock,
                  available,
                });
                toast.success(`Saved ${product.name}.`);
              } finally {
                setLoading(false);
              }
            }}
            className="ds-primary-button inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold text-[hsl(var(--foreground-on-solid))]"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Save
          </button>
          <button
            type="button"
            onClick={async () => {
              await onDelete(product.id);
              toast.success(`Removed ${product.name}.`);
            }}
            className="ds-danger-button inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold"
          >
            <Trash2 className="h-4 w-4" />
            Remove
          </button>
        </div>
      </div>
    </article>
  );
}

export function StockPage() {
  const {
    brands,
    niches,
    categories,
    productTypes,
    products,
    productFilters,
    setFilters,
    loadCategoriesForNiche,
    loadProductTypesForCategory,
    loadProducts,
    updateProductCard,
    removeProductCard,
  } = usePartnerStore();
  const [filter, setFilter] = useState<StockFilter>("all");

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      loadProducts();
    }, 180);

    return () => window.clearTimeout(timeout);
  }, [
    loadProducts,
    productFilters.search,
    productFilters.nicheId,
    productFilters.categoryId,
    productFilters.productTypeId,
    productFilters.brandId,
  ]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const stock = product.stock ?? 0;
      if (filter === "active") return product.available;
      if (filter === "inactive") return !product.available;
      if (filter === "low") return stock > 0 && stock <= 3;
      if (filter === "out") return stock <= 0;
      return true;
    });
  }, [filter, products]);

  const counts = {
    all: products.length,
    active: products.filter((product) => product.available).length,
    inactive: products.filter((product) => !product.available).length,
    low: products.filter((product) => (product.stock ?? 0) > 0 && (product.stock ?? 0) <= 3).length,
    out: products.filter((product) => (product.stock ?? 0) <= 0).length,
  };

  return (
    <section className="grid h-full min-h-0 gap-3 overflow-hidden lg:grid-rows-[auto_auto_auto_1fr]">
      <PageHeader title="Stock Management" back meta={<Badge tone={counts.out ? "danger" : counts.low ? "warning" : "success"}>{counts.low + counts.out} alerts</Badge>} />
      <FilterBar
        brands={brands}
        niches={niches}
        categories={categories}
        productTypes={productTypes}
        filters={productFilters}
        setFilters={setFilters}
        onNicheChange={loadCategoriesForNiche}
        onCategoryChange={loadProductTypesForCategory}
        onRefresh={loadProducts}
      />
      <FilterTabs<StockFilter>
        value={filter}
        onChange={setFilter}
        options={[
          { value: "all", label: "All", count: counts.all },
          { value: "active", label: "Active", count: counts.active },
          { value: "inactive", label: "Inactive", count: counts.inactive },
          { value: "low", label: "Low stock", count: counts.low },
          { value: "out", label: "Out", count: counts.out },
        ]}
      />
      <div className="workspace-scroll ds-compact-grid pr-1">
        {filteredProducts.length ? (
          filteredProducts.map((product) => <StockRow key={product.id} product={product} onSave={updateProductCard} onDelete={removeProductCard} />)
        ) : (
          <EmptyState title="No stock records" body="Activate variants from product templates to create vendor-owned stock records." />
        )}
      </div>
    </section>
  );
}
