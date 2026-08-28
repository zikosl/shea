'use client';

import { DataTableResetFilter } from '@/components/ui/table/data-table-reset-filter';
import { DataTableSearch } from '@/components/ui/table/data-table-search';
import { DataTableFilterCombobox } from '@/components/ui/table/data-table-filter-combobox';
import {
  useTableFilters
} from './use-table-filters';

type TableActionProps = {
  niches: Niche[];
  categories: Category[];
  brands: Brand[];
};

export default function TableAction({ niches, categories, brands }: TableActionProps) {
  const {
    brandFilter,
    categoriesFilter,
    isAnyFilterActive,
    nicheFilter,
    resetFilters,
    searchQuery,
    setBrandFilter,
    setCategoriesFilter,
    setNicheFilter,
    setPage,
    setSearchQuery
  } = useTableFilters();

  const filteredCategories = nicheFilter
    ? categories.filter((category) => String(category.niche_id) === nicheFilter)
    : categories;
  const filteredBrands = nicheFilter
    ? brands.filter((brand) => !brand.niche_id || String(brand.niche_id) === nicheFilter)
    : brands;

  return (
    <div className="flex flex-wrap items-center gap-4">
      <DataTableSearch
        searchKey="name"
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
          setCategoriesFilter(null);
          setBrandFilter(null);
        }}
      />
      <DataTableFilterCombobox
        title="Category"
        options={filteredCategories.map((category) => ({ value: String(category.id), label: category.name }))}
        value={categoriesFilter}
        setValue={setCategoriesFilter}
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
