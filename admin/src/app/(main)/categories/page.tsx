import Link from "next/link";

import ListingPage from "./_components/listing";
import { ResourcePage } from "@/components/admin-panel/resource-page";
import { buttonVariants } from '@/components/ui/button';
import { DataTableSkeleton } from '@/components/ui/table/data-table-skeleton';
import { searchParamsCache, serialize } from '@/lib/searchparams';
import { cn } from '@/lib/utils';
import { PlusCircle } from 'lucide-react';
import { Suspense } from 'react';
import { SearchParams } from 'nuqs';
import TableAction from './_components/tables/table-action';
import { name_plural, title_plural, title_singular, link } from "./_constant";
import { getCatalogFilterOptions } from '@/lib/catalog-filter-options';

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata = {
  title: `Dashboard:  ${title_plural}`,
  description: `Manage ${name_plural} in the admin workspace.`,
  layout: 'global',
};

type pageProps = {
  searchParams: Promise<SearchParams>;
};

export default async function Page({ searchParams: search }: pageProps) {
  // Allow nested RSCs to access the search params (in a type-safe way)
  const searchParams = await search;
  searchParamsCache.parse(searchParams);
  const { niches } = await getCatalogFilterOptions();

  // This key is used for invoke suspense if any of the search params changed (used for filters).
  const key = serialize({ ...searchParams });
  return (
    <ResourcePage
      title={title_plural}
      description="Manage top-level categories used to organize the catalog."
      action={
        <Link
          href={`/${link}/new`}
          className={cn(buttonVariants(), 'text-xs md:text-sm')}
        >
          <PlusCircle className="mr-1 h-4 w-4" /> Add {title_singular}
        </Link>
      }
      filters={<TableAction niches={niches} />}
    >
      <Suspense
        key={key}
        fallback={<DataTableSkeleton columnCount={5} rowCount={10} />}
      >
        <ListingPage />
      </Suspense>
    </ResourcePage>
  );
}
