'use client';

import { useCallback, useMemo } from 'react';
import { useQueryState } from 'nuqs';

import { searchParams } from '@/lib/searchparams';

export function useTableFilters() {
  const [searchQuery, setSearchQuery] = useQueryState(
    'q',
    searchParams.q
      .withOptions({ shallow: false, throttleMs: 1000 })
      .withDefault('')
  );

  const [page, setPage] = useQueryState(
    'page',
    searchParams.page.withDefault(1)
  );
  const [nicheFilter, setNicheFilter] = useQueryState(
    'niche_id',
    searchParams.niche_id.withOptions({ shallow: false }).withDefault('')
  );
  const [categoryFilter, setCategoryFilter] = useQueryState(
    'category_id',
    searchParams.category_id.withOptions({ shallow: false }).withDefault('')
  );
  const [productTypeFilter, setProductTypeFilter] = useQueryState(
    'product_type_id',
    searchParams.product_type_id.withOptions({ shallow: false }).withDefault('')
  );
  const [brandFilter, setBrandFilter] = useQueryState(
    'brand_id',
    searchParams.brand_id.withOptions({ shallow: false }).withDefault('')
  );

  const resetFilters = useCallback(() => {
    setSearchQuery(null);
    setNicheFilter(null);
    setCategoryFilter(null);
    setProductTypeFilter(null);
    setBrandFilter(null);
    setPage(1);
  }, [setSearchQuery, setNicheFilter, setCategoryFilter, setProductTypeFilter, setBrandFilter, setPage]);

  const isAnyFilterActive = useMemo(
    () => !!searchQuery || !!nicheFilter || !!categoryFilter || !!productTypeFilter || !!brandFilter,
    [searchQuery, nicheFilter, categoryFilter, productTypeFilter, brandFilter]
  );

  return {
    searchQuery,
    setSearchQuery,
    page,
    setPage,
    resetFilters,
    isAnyFilterActive,
    nicheFilter,
    setNicheFilter,
    categoryFilter,
    setCategoryFilter,
    productTypeFilter,
    setProductTypeFilter,
    brandFilter,
    setBrandFilter,
  };
}
