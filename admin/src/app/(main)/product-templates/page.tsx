import Link from "next/link";
import { Barcode, Layers3, PlusCircle } from "lucide-react";
import { Suspense } from "react";
import { SearchParams } from "nuqs";

import ListingPage from "./_components/listing";
import TableAction from "./_components/tables/table-action";
import { ResourcePage } from "@/components/admin-panel/resource-page";
import { buttonVariants } from '@/components/ui/button';
import { DataTableSkeleton } from '@/components/ui/table/data-table-skeleton';
import { getCatalogFilterOptions } from "@/lib/catalog-filter-options";
import { searchParamsCache, serialize } from '@/lib/searchparams';
import { cn } from '@/lib/utils';
import { link, title_plural, title_singular } from "./_constant";
import { ProductTemplateSelectionProvider } from "./_components/product-template-selection";
import CatalogVariantsTable from "./_components/catalog-variants-table";
import { getCatalogVariants } from "./actions";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata = {
  title: `Dashboard: ${title_plural}`,
  description: `Manage ${title_plural.toLowerCase()} in the catalog.`,
  layout: "global",
};

type PageProps = {
  searchParams: Promise<SearchParams>;
};

export default async function Page({ searchParams: search }: PageProps) {
  const searchParams = await search;
  searchParamsCache.parse(searchParams);
  const { niches, categories, productTypes, brands } = await getCatalogFilterOptions();
  const view = searchParams.view === "variants" ? "variants" : "templates";
  const key = serialize({ ...searchParams });
  const selectionScope = JSON.stringify([
    searchParams.q ?? "",
    searchParams.niche_id ?? "",
    searchParams.category_id ?? "",
    searchParams.product_type_id ?? "",
    searchParams.brand_id ?? "",
    view,
  ]);
  const viewHref = (nextView: "templates" | "variants") => {
    const query = new URLSearchParams();
    for (const [name, value] of Object.entries(searchParams)) {
      if (typeof value === "string" && name !== "view" && name !== "page") query.set(name, value);
    }
    query.set("view", nextView);
    return `/${link}?${query.toString()}`;
  };
  const catalogVariants = view === "variants" ? await getCatalogVariants({
    search: typeof searchParams.q === "string" ? searchParams.q : undefined,
    page: Number(searchParams.page) || 1,
    limit: Number(searchParams.limit) || 10,
    niche_id: searchParams.niche_id ? Number(searchParams.niche_id) : undefined,
    category_id: searchParams.category_id ? Number(searchParams.category_id) : undefined,
    product_type_id: searchParams.product_type_id ? Number(searchParams.product_type_id) : undefined,
    brand_id: searchParams.brand_id ? Number(searchParams.brand_id) : undefined,
  }) : null;

  return (
    <ResourcePage
      title={title_plural}
      description="Manage reusable catalog templates before they become partner-specific products."
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Link href={viewHref("templates")} className={cn(buttonVariants({ variant: view === "templates" ? "secondary" : "outline" }), "text-xs md:text-sm")}>
            <Layers3 className="mr-1 h-4 w-4" /> Templates
          </Link>
          <Link href={viewHref("variants")} className={cn(buttonVariants({ variant: view === "variants" ? "secondary" : "outline" }), "text-xs md:text-sm")}>
            <Barcode className="mr-1 h-4 w-4" /> Variants
          </Link>
          {view === "templates" && <Link href={`/${link}/new`} className={cn(buttonVariants(), "text-xs md:text-sm")}>
            <PlusCircle className="mr-1 h-4 w-4" /> Add {title_singular}
          </Link>}
        </div>
      }
      filters={<TableAction niches={niches} categories={categories} productTypes={productTypes} brands={brands} />}
    >
      {view === "variants" && catalogVariants ? <CatalogVariantsTable data={catalogVariants.items} totalItems={catalogVariants.totalItems} page={Number(searchParams.page) || 1} limit={Number(searchParams.limit) || 10} searchParams={searchParams} /> : (
        <ProductTemplateSelectionProvider key={selectionScope}>
          <Suspense key={key} fallback={<DataTableSkeleton columnCount={5} rowCount={10} />}>
            <ListingPage />
          </Suspense>
        </ProductTemplateSelectionProvider>
      )}
    </ResourcePage>
  );
}
