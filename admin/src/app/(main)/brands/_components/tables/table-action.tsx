'use client';

import { DataTableResetFilter } from '@/components/ui/table/data-table-reset-filter';
import { DataTableSearch } from '@/components/ui/table/data-table-search';
import { DataTableFilterCombobox } from '@/components/ui/table/data-table-filter-combobox';
import {
  useTableFilters
} from './use-table-filters';

type TableActionProps = {
  niches: Niche[];
};

export default function TableAction({ niches }: TableActionProps) {
  const {
    isAnyFilterActive,
    nicheFilter,
    resetFilters,
    searchQuery,
    setNicheFilter,
    setPage,
    setSearchQuery
  } = useTableFilters();

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
      />

      <DataTableResetFilter
        isFilterActive={isAnyFilterActive}
        onReset={resetFilters}
      />
    </div>
  );
}
