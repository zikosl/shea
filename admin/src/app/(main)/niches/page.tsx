import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { Suspense } from "react";
import { SearchParams } from "nuqs";

import ListingPage from "./_components/listing";
import TableAction from "./_components/tables/table-action";
import { ResourcePage } from "@/components/admin-panel/resource-page";
import { buttonVariants } from "@/components/ui/button";
import { DataTableSkeleton } from "@/components/ui/table/data-table-skeleton";
import { searchParamsCache, serialize } from "@/lib/searchparams";
import { cn } from "@/lib/utils";
import { link, name_plural, title_plural, title_singular } from "./_constant";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata = {
  title: `Dashboard: ${title_plural}`,
  description: `Manage ${name_plural} in the catalog.`,
  layout: "global",
};

type PageProps = {
  searchParams: Promise<SearchParams>;
};

export default async function Page({ searchParams: search }: PageProps) {
  const searchParams = await search;
  searchParamsCache.parse(searchParams);
  const key = serialize({ ...searchParams });

  return (
    <ResourcePage
      title={title_plural}
      description="Manage curated niches used to classify products and templates more precisely."
      action={
        <Link
          href={`/${link}/new`}
          className={cn(buttonVariants(), "text-xs md:text-sm")}
        >
          <PlusCircle className="mr-1 h-4 w-4" /> Add {title_singular}
        </Link>
      }
      filters={<TableAction />}
    >
      <Suspense key={key} fallback={<DataTableSkeleton columnCount={5} rowCount={10} />}>
        <ListingPage />
      </Suspense>
    </ResourcePage>
  );
}
