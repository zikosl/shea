'use client';

import { DataTableResetFilter } from '@/components/ui/table/data-table-reset-filter';
import { DataTableSearch } from '@/components/ui/table/data-table-search';
import { DataTableFilterCombobox } from '@/components/ui/table/data-table-filter-combobox';

import { useTableFilters } from './use-table-filters';

type TableActionProps = {
  niches: Niche[];
  categories: Category[];
  productTypes: ProductType[];
  brands: Brand[];
};

export default function TableAction({
  niches,
  categories,
  productTypes,
  brands
}: TableActionProps) {
  const {
    brandFilter,
    categoryFilter,
    isAnyFilterActive,
    nicheFilter,
    productTypeFilter,
    resetFilters,
    searchQuery,
    setBrandFilter,
    setCategoryFilter,
    setNicheFilter,
    setPage,
    setProductTypeFilter,
    setSearchQuery
  } = useTableFilters();

  const filteredCategories = nicheFilter
    ? categories.filter((category) => String(category.niche_id) === nicheFilter)
    : categories;
  const filteredProductTypes = categoryFilter
    ? productTypes.filter((productType) => String(productType.category_id) === categoryFilter)
    : nicheFilter
      ? productTypes.filter((productType) => String(productType.category?.niche_id) === nicheFilter)
      : productTypes;
  const filteredBrands = nicheFilter
    ? brands.filter((brand) => !brand.niche_id || String(brand.niche_id) === nicheFilter)
    : brands;

  return (
    <div className="flex flex-wrap items-center gap-4">
      <DataTableSearch
        searchKey="product templates"
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        setPage={setPage}
      />
      <DataTableFilterCombobox
        title="Niche"
        options={niches.map((niche) => ({ value: String(niche.id), label: niche.name }))}
        value={nicheFilter}
        setValue={setNicheFilter}
        setPage={setPage}
        onAfterChange={() => {
          setCategoryFilter(null);
          setProductTypeFilter(null);
          setBrandFilter(null);
        }}
      />
      <DataTableFilterCombobox
        title="Category"
        options={filteredCategories.map((category) => ({ value: String(category.id), label: category.name }))}
        value={categoryFilter}
        setValue={setCategoryFilter}
        setPage={setPage}
        onAfterChange={() => setProductTypeFilter(null)}
      />
      <DataTableFilterCombobox
        title="Product type"
        options={filteredProductTypes.map((productType) => ({ value: String(productType.id), label: productType.name }))}
        value={productTypeFilter}
        setValue={setProductTypeFilter}
        setPage={setPage}
      />
      <DataTableFilterCombobox
        title="Brand"
        options={filteredBrands.map((brand) => ({ value: String(brand.id), label: brand.name }))}
        value={brandFilter}
        setValue={setBrandFilter}
        setPage={setPage}
      />

      <DataTableResetFilter
        isFilterActive={isAnyFilterActive}
        onReset={resetFilters}
      />
    </div>
  );
}
