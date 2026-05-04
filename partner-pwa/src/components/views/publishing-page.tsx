"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Loader2, Rocket } from "lucide-react";
import { toast } from "sonner";

import { usePartnerStore } from "@/store/partner-store";
import { resolveAssetUrl } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { FilterBar } from "@/components/workspace/filter-bar";

export function PublishingPage() {
  const {
    brands,
    niches,
    categories,
    productTypes,
    templates,
    productFilters,
    isPublishing,
    setFilters,
    loadCategoriesForNiche,
    loadProductTypesForCategory,
    loadTemplates,
    publishSelectedVariants,
  } = usePartnerStore();

  const [selectedVariants, setSelectedVariants] = useState<Record<number, boolean>>({});
  const [prices, setPrices] = useState<Record<number, string>>({});
  const [stocks, setStocks] = useState<Record<number, string>>({});
  const [visibility, setVisibility] = useState<Record<number, boolean>>({});
  const totalSelected = Object.values(selectedVariants).filter(Boolean).length;

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      loadTemplates();
    }, 180);

    return () => window.clearTimeout(timeout);
  }, [
    loadTemplates,
    productFilters.search,
    productFilters.nicheId,
    productFilters.categoryId,
    productFilters.productTypeId,
    productFilters.brandId,
  ]);

  function toggleVariant(variantId: number) {
    setSelectedVariants((current) => ({ ...current, [variantId]: !current[variantId] }));
  }

  async function handlePublish() {
    const payload = Object.entries(selectedVariants)
      .filter(([, selected]) => selected)
      .map(([variantId]) => ({
        variantId: Number(variantId),
        price: Number(prices[Number(variantId)] || 0),
        stock: Number(stocks[Number(variantId)] || 0),
        available: visibility[Number(variantId)] ?? true,
      }))
      .filter((item) => item.price > 0 && Number.isInteger(item.stock) && item.stock >= 0);

    if (!payload.length) {
      toast.error("Choose at least one variant with a valid price and stock.");
      return;
    }

    await publishSelectedVariants(payload);
    setSelectedVariants({});
    setPrices({});
    setStocks({});
    setVisibility({});
    toast.success("Selected variants were published.");
  }

  return (
    <section className="grid h-full min-h-0 gap-3 overflow-hidden lg:grid-rows-[auto_auto_auto_1fr]">
      <PageHeader title="Template Activation" back meta={<Badge tone={totalSelected ? "warning" : "default"}>{totalSelected} selected</Badge>} />
      <FilterBar
        brands={brands}
        niches={niches}
        categories={categories}
        productTypes={productTypes}
        filters={productFilters}
        setFilters={setFilters}
        onNicheChange={loadCategoriesForNiche}
        onCategoryChange={loadProductTypesForCategory}
        onRefresh={loadTemplates}
      />
      <div className="ds-toolbar partner-gradient flex flex-wrap items-center justify-between gap-3 rounded-[22px] px-4 py-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">Admin templates</p>
          <p className="mt-1 text-base font-semibold">{templates.length} available templates</p>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">Activate variants as vendor-owned POS products.</p>
        </div>
        <button
          type="button"
          disabled={isPublishing}
          onClick={handlePublish}
          className="ds-primary-button inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-[hsl(var(--foreground-on-solid))] disabled:opacity-60"
        >
          {isPublishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
          Activate
        </button>
      </div>
      <div className="workspace-scroll grid gap-3 pr-1 xl:grid-cols-2">
        {templates.length ? (
          templates.map((template) => (
            <article key={template.id} className="ds-surface ds-status-card ds-status-card-accent rounded-[22px] p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold">{template.name}</h3>
                    {template.brand?.name ? <Badge>{template.brand.name}</Badge> : null}
                    {template.productType?.name ? <Badge>{template.productType.name}</Badge> : null}
                  </div>
                  {template.description ? <p className="mt-2 text-[13px] text-[hsl(var(--muted-foreground))]">{template.description}</p> : null}
                </div>
                {template.images[0]?.url ? <Image unoptimized src={resolveAssetUrl(template.images[0].url)} alt={template.name} width={72} height={72} className="h-[72px] w-[72px] rounded-[1rem] object-cover" /> : null}
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="ds-subtle-surface rounded-[18px] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">Inherited from admin template</p>
                  <p className="mt-2 text-sm">{template.brand?.name || "No brand"} / {template.productType?.name || "No type"}</p>
                </div>
                <div className="ds-subtle-surface rounded-[18px] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">Vendor customization</p>
                  <p className="mt-2 text-sm">Set selling price, stock, and POS visibility per variant.</p>
                </div>
              </div>

              <div className="mt-4 space-y-2.5">
                {template.variants.length ? (
                  template.variants.map((variant) => (
                    <div key={variant.id} className="ds-subtle-surface grid gap-3 rounded-[18px] p-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                      <label className="flex min-w-0 items-center gap-3">
                        <input type="checkbox" checked={!!selectedVariants[variant.id]} onChange={() => toggleVariant(variant.id)} className="ds-checkbox" />
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{variant.name || "Default variant"}</span>
                          <span className="block truncate text-sm text-[hsl(var(--muted-foreground))]">{variant.sku || "No SKU"}</span>
                        </span>
                      </label>
                      <div className="grid gap-2 sm:grid-cols-[112px_96px_auto] sm:items-center">
                        <input
                          value={prices[variant.id] || ""}
                          onChange={(event) => setPrices((current) => ({ ...current, [variant.id]: event.target.value }))}
                          className="ds-input !min-h-10 !rounded-[14px] !px-3 !py-2 text-sm"
                          placeholder="Price"
                          aria-label={`Price for ${variant.name || "variant"}`}
                        />
                        <input
                          value={stocks[variant.id] || ""}
                          onChange={(event) => setStocks((current) => ({ ...current, [variant.id]: event.target.value }))}
                          className="ds-input !min-h-10 !rounded-[14px] !px-3 !py-2 text-sm"
                          placeholder="Stock"
                          aria-label={`Stock for ${variant.name || "variant"}`}
                        />
                        <label className="flex items-center gap-2 text-xs font-medium">
                          <input
                            type="checkbox"
                            checked={visibility[variant.id] ?? true}
                            onChange={(event) => setVisibility((current) => ({ ...current, [variant.id]: event.target.checked }))}
                            className="ds-checkbox"
                          />
                          POS
                        </label>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="ds-outline-surface rounded-[18px] p-3 text-sm text-[hsl(var(--muted-foreground))]">
                    All variants already have vendor instances.
                  </div>
                )}
              </div>
            </article>
          ))
        ) : (
          <EmptyState title="No templates found" body="Admin product templates that match your filters will appear here." />
        )}
      </div>
    </section>
  );
}
