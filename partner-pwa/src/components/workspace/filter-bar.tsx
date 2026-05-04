"use client";

import { ChevronDown } from "lucide-react";

import { usePartnerStore } from "@/store/partner-store";
import { SearchInput } from "@/components/ui/search-input";

export function FilterBar({
  brands,
  niches,
  categories,
  productTypes,
  filters,
  setFilters,
  onNicheChange,
  onCategoryChange,
  onRefresh,
}: {
  brands: ReturnType<typeof usePartnerStore.getState>["brands"];
  niches: ReturnType<typeof usePartnerStore.getState>["niches"];
  categories: ReturnType<typeof usePartnerStore.getState>["categories"];
  productTypes: ReturnType<typeof usePartnerStore.getState>["productTypes"];
  filters: ReturnType<typeof usePartnerStore.getState>["productFilters"];
  setFilters: ReturnType<typeof usePartnerStore.getState>["setFilters"];
  onNicheChange: (nicheId: number) => Promise<void>;
  onCategoryChange: (categoryId: number) => Promise<void>;
  onRefresh: () => Promise<void>;
}) {
  return (
    <div className="ds-toolbar grid gap-2 rounded-[20px] p-2.5 lg:grid-cols-5 xl:grid-cols-[1.4fr_repeat(4,1fr)_auto]">
      <SearchInput
        value={filters.search}
        onChange={(event) => setFilters({ search: event.target.value })}
        placeholder="Search"
        inputClassName="!min-h-10"
      />
      <div className="relative">
        <select
          value={filters.nicheId || ""}
          onChange={(event) => {
            const value = Number(event.target.value);
            if (value) {
              onNicheChange(value);
            } else {
              setFilters({ nicheId: null, categoryId: null, productTypeId: null });
            }
          }}
          className="ds-select !min-h-10 !rounded-[14px] text-sm"
        >
          <option value="">All niches</option>
          {niches.map((niche) => (
            <option key={niche.id} value={niche.id}>
              {niche.name}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
      </div>
      <div className="relative">
        <select
          value={filters.categoryId || ""}
          onChange={(event) => {
            const value = Number(event.target.value);
            if (value) {
              onCategoryChange(value);
            } else {
              setFilters({ categoryId: null, productTypeId: null });
            }
          }}
          className="ds-select !min-h-10 !rounded-[14px] text-sm"
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
      </div>
      <div className="relative">
        <select
          value={filters.productTypeId || ""}
          onChange={(event) => setFilters({ productTypeId: event.target.value ? Number(event.target.value) : null })}
          className="ds-select !min-h-10 !rounded-[14px] text-sm"
        >
          <option value="">All types</option>
          {productTypes.map((productType) => (
            <option key={productType.id} value={productType.id}>
              {productType.name}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
      </div>
      <div className="relative">
        <select
          value={filters.brandId || ""}
          onChange={(event) => setFilters({ brandId: event.target.value ? Number(event.target.value) : null })}
          className="ds-select !min-h-10 !rounded-[14px] text-sm"
        >
          <option value="">All brands</option>
          {brands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
      </div>
      <button type="button" onClick={onRefresh} className="ds-secondary-button rounded-[14px] px-4 py-2.5 text-sm font-semibold">
        Reload
      </button>
    </div>
  );
}
