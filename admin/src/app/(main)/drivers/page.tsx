import Link from "next/link";

import ListingPage from "./_components/listing";
import { buttonVariants } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { Separator } from '@/components/ui/separator';
import { DataTableSkeleton } from '@/components/ui/table/data-table-skeleton';
import { searchParamsCache, serialize } from '@/lib/searchparams';
import { cn } from '@/lib/utils';
import { PlusCircle } from 'lucide-react';
import { Suspense } from 'react';
import { SearchParams } from 'nuqs';
import TableAction from './_components/tables/table-action';
import { name_plural, name_singular, title_plural, title_singular, link } from "./_constant";

export const metadata = {
  title: `Dashboard:  ${title_plural}`,
  description: `Manage ${name_plural} (Server side table functionalities.)`,
  layout: 'global',
};

type pageProps = {
  searchParams: Promise<SearchParams>;
};

export default async function Page({ searchParams: search }: pageProps) {
  // Allow nested RSCs to access the search params (in a type-safe way)
  const searchParams = await search;
  searchParamsCache.parse(searchParams);

  // This key is used for invoke suspense if any of the search params changed (used for filters).
  const key = serialize({ ...searchParams });
  return (
    <div className="space-y-4 flex-1">
      <div className="flex items-start justify-between">
        <Heading
          title={title_plural}
          description={`Manage ${name_plural} (Server side table functionaities.)`}
        />
        <Link
          href={`/${link}/new`}
          className={cn(buttonVariants(), 'text-xs md:text-sm')}
        >
          <PlusCircle className="mr-1 h-4 w-4" /> Add {title_singular}
        </Link>
      </div>
      <Separator />
      <TableAction />
      <Suspense
        key={key}
        fallback={<DataTableSkeleton columnCount={5} rowCount={10} />}
      >
        <ListingPage />
      </Suspense>
    </div >
  );
}
