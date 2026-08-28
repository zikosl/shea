

import { searchParamsCache } from '@/lib/searchparams';
import { DataTable } from '@/components/ui/table/data-table';
import { columns } from './tables/columns';
import { getSearchItem } from '../actions';
import { Item } from '../_constant';

type ListingPage = {};

export default async function ListingPage({ }: ListingPage) {
  // Showcasing the use of search params cache in nested RSCs
  const page = searchParamsCache.get('page');
  const search = searchParamsCache.get('q');
  const pageLimit = searchParamsCache.get('limit');
  const nicheId = searchParamsCache.get('niche_id');
  const categoryId = searchParamsCache.get('category_id');
  const brandId = searchParamsCache.get('brand_id');

  const filters = {
    page,
    limit: pageLimit,
    ...(search && { search }),
    ...(nicheId && { niche_id: Number(nicheId) }),
    ...(categoryId && { category_id: Number(categoryId) }),
    ...(brandId && { brand_id: Number(brandId) }),
  };

  const data = await getSearchItem(filters);
  const totalItems = data.totalItems;
  const items: Item[] = data.items;
  return (
    <DataTable
      columns={columns}
      data={items}
      totalItems={totalItems}
    />
  );
}
