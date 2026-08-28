import { DataTable } from '@/components/ui/table/data-table';
import { searchParamsCache } from '@/lib/searchparams';

import { getSearchItem } from '../actions';
import { Item } from '../_constant';
import { columns } from './tables/columns';

export default async function ListingPage() {
  const page = searchParamsCache.get('page');
  const search = searchParamsCache.get('q');
  const pageLimit = searchParamsCache.get('limit');
  const nicheId = searchParamsCache.get('niche_id');
  const categoryId = searchParamsCache.get('category_id');
  const productTypeId = searchParamsCache.get('product_type_id');
  const brandId = searchParamsCache.get('brand_id');

  const filters = {
    page,
    limit: pageLimit,
    ...(search && { search }),
    ...(nicheId && { niche_id: Number(nicheId) }),
    ...(categoryId && { category_id: Number(categoryId) }),
    ...(productTypeId && { product_type_id: Number(productTypeId) }),
    ...(brandId && { brand_id: Number(brandId) }),
  };

  const data = await getSearchItem(filters);
  const totalItems = data.totalItems;
  const items: Item[] = data.items;

  return <DataTable columns={columns} data={items} totalItems={totalItems} />;
}
