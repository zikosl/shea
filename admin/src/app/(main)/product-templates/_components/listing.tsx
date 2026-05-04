import { DataTable } from '@/components/ui/table/data-table';
import { searchParamsCache } from '@/lib/searchparams';

import { getSearchItem } from '../actions';
import { Item } from '../_constant';
import { columns } from './tables/columns';

export default async function ListingPage() {
  const page = searchParamsCache.get('page');
  const search = searchParamsCache.get('q');
  const pageLimit = searchParamsCache.get('limit');

  const filters = {
    page,
    limit: pageLimit,
    ...(search && { search }),
  };

  const data = await getSearchItem(filters);
  const totalItems = data.totalItems;
  const items: Item[] = data.items;

  return <DataTable columns={columns} data={items} totalItems={totalItems} />;
}
