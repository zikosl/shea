"use client";

import Image from "next/image";
import Link from "next/link";
import { PackageSearch } from "lucide-react";

import { usePartnerStore } from "@/store/partner-store";
import { currency, resolveAssetUrl } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export function StockDetailPage({ id }: { id: number }) {
  const product = usePartnerStore((state) => state.products.find((entry) => entry.id === id));

  if (!product) {
    return (
      <section className="grid h-full min-h-0 gap-3 overflow-hidden lg:grid-rows-[auto_1fr]">
        <PageHeader title="Stock Detail" back />
        <EmptyState title="Product not found" body="Refresh the workspace or return to stock management." />
      </section>
    );
  }

  return (
    <section className="grid h-full min-h-0 gap-3 overflow-hidden lg:grid-rows-[auto_1fr]">
      <PageHeader title={product.name} back meta={<Badge tone={product.available ? "success" : "default"}>{product.available ? "Visible in POS" : "Hidden"}</Badge>} />

      <div className="workspace-scroll grid gap-3 pr-1 xl:grid-cols-[0.75fr_1.25fr]">
        <div className="ds-surface rounded-[28px] p-5">
          {product.images[0]?.url ? (
            <Image unoptimized src={resolveAssetUrl(product.images[0].url)} alt={product.name} width={520} height={420} className="aspect-[4/3] w-full rounded-[22px] object-cover" />
          ) : (
            <div className="ds-subtle-surface flex aspect-[4/3] w-full items-center justify-center rounded-[22px] text-sm text-[hsl(var(--muted-foreground))]">No image</div>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {product.brand?.name ? <Badge>{product.brand.name}</Badge> : null}
            {product.productType?.name ? <Badge tone="accent">{product.productType.name}</Badge> : null}
            {product.category?.name ? <Badge>{product.category.name}</Badge> : null}
          </div>
        </div>

        <div className="grid gap-3">
          <section className="ds-surface rounded-[28px] p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-[hsla(var(--primary),0.18)] text-[hsl(var(--primary-strong))]">
                <PackageSearch className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Inherited from admin template</h2>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Template and variant data stay linked to the global catalog.</p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="ds-subtle-surface rounded-[20px] p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">Variant</p>
                <p className="mt-2 font-semibold">{product.variantName || "Default variant"}</p>
              </div>
              <div className="ds-subtle-surface rounded-[20px] p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">SKU</p>
                <p className="mt-2 font-semibold">{product.sku || "No SKU"}</p>
              </div>
              <div className="ds-subtle-surface rounded-[20px] p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">Template ID</p>
                <p className="mt-2 font-semibold">#{product.product_template_id ?? "N/A"}</p>
              </div>
              <div className="ds-subtle-surface rounded-[20px] p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">Variant ID</p>
                <p className="mt-2 font-semibold">#{product.variantId ?? "N/A"}</p>
              </div>
            </div>
          </section>

          <section className="ds-surface rounded-[28px] p-5">
            <h2 className="text-lg font-semibold">Vendor customization</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="ds-subtle-surface rounded-[20px] p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">Selling price</p>
                <p className="mt-2 text-xl font-semibold">{currency(product.price)}</p>
              </div>
              <div className="ds-subtle-surface rounded-[20px] p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">Stock</p>
                <p className="mt-2 text-xl font-semibold">{product.stock ?? 0}</p>
              </div>
              <div className="ds-subtle-surface rounded-[20px] p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">POS visibility</p>
                <p className="mt-2 text-xl font-semibold">{product.available ? "Visible" : "Hidden"}</p>
              </div>
            </div>
            <Link href="/stock" className="ds-primary-button mt-5 inline-flex rounded-full px-5 py-3 text-sm font-semibold text-[hsl(var(--foreground-on-solid))]">
              Edit in stock list
            </Link>
          </section>
        </div>
      </div>
    </section>
  );
}
