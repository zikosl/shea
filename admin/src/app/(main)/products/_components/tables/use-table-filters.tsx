'use client';

import { searchParams } from '@/lib/searchparams';
import { useQueryState } from 'nuqs';
import { useCallback, useMemo } from 'react';


export function useTableFilters() {
  const [searchQuery, setSearchQuery] = useQueryState(
    'q',
    searchParams.q
      .withOptions({ shallow: false, throttleMs: 1000 })
      .withDefault('')
  );

  const [categoriesFilter, setCategoriesFilter] = useQueryState(
    'category_id',
    searchParams.category_id.withOptions({ shallow: false }).withDefault('')
  );
  const [nicheFilter, setNicheFilter] = useQueryState(
    'niche_id',
    searchParams.niche_id.withOptions({ shallow: false }).withDefault('')
  );
  const [brandFilter, setBrandFilter] = useQueryState(
    'brand_id',
    searchParams.brand_id.withOptions({ shallow: false }).withDefault('')
  );

  const [page, setPage] = useQueryState(
    'page',
    searchParams.page.withDefault(1)
  );

  const resetFilters = useCallback(() => {
    setSearchQuery(null);
    setCategoriesFilter(null);
    setNicheFilter(null);
    setBrandFilter(null);

    setPage(1);
  }, [setSearchQuery, setCategoriesFilter, setNicheFilter, setBrandFilter, setPage]);

  const isAnyFilterActive = useMemo(() => {
    return !!searchQuery || !!categoriesFilter || !!nicheFilter || !!brandFilter;
  }, [searchQuery, categoriesFilter, nicheFilter, brandFilter]);

  return {
    searchQuery,
    setSearchQuery,
    page,
    setPage,
    resetFilters,
    isAnyFilterActive,
    categoriesFilter,
    setCategoriesFilter,
    nicheFilter,
    setNicheFilter,
    brandFilter,
    setBrandFilter
  };
}
