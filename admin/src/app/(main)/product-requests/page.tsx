import Image from "next/image";
import { CheckCircle2, ClipboardCheck, PackagePlus, Sparkles, XCircle } from "lucide-react";

import { ResourcePage } from "@/components/admin-panel/resource-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { resolvePublicAssetUrl } from "@/constant";
import { getCatalogFilterOptions } from "@/lib/catalog-filter-options";

import { approveRequest, getProductTemplateRequests, mergeRequest, rejectRequest } from "./actions";

export const metadata = {
  title: "Dashboard: Product Requests",
  description: "Review partner-submitted product templates.",
};

type SearchParams = { search?: string; niche_id?: string; category_id?: string; product_type_id?: string };

export default async function ProductRequestsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const numberParam = (value?: string) => value && Number.isInteger(Number(value)) ? Number(value) : undefined;
  const [result, options] = await Promise.all([
    getProductTemplateRequests({
      search: params.search?.trim() || undefined,
      niche_id: numberParam(params.niche_id),
      category_id: numberParam(params.category_id),
      product_type_id: numberParam(params.product_type_id),
    }),
    getCatalogFilterOptions(),
  ]);
  const { requests, totalRequests } = result;

  return (
    <ResourcePage
      title="Product Requests"
      description="Review partner-submitted templates before they enter the global catalog."
    >
      <div className="space-y-5">
        <form className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-4 xl:grid-cols-5">
          <input name="search" defaultValue={params.search} placeholder="Search request, brand..." className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          <select name="niche_id" defaultValue={params.niche_id ?? ""} className="h-10 rounded-md border bg-background px-3 text-sm">
            <option value="">All niches</option>{options.niches.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <select name="category_id" defaultValue={params.category_id ?? ""} className="h-10 rounded-md border bg-background px-3 text-sm">
            <option value="">All categories</option>{options.categories.filter((item) => !params.niche_id || String(item.niche_id) === params.niche_id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <select name="product_type_id" defaultValue={params.product_type_id ?? ""} className="h-10 rounded-md border bg-background px-3 text-sm">
            <option value="">All product types</option>{options.productTypes.filter((item) => !params.category_id || String(item.category_id || item.category?.id) === params.category_id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <Button type="submit">Apply filters</Button>
        </form>
        <div className="grid gap-3 md:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border bg-muted">
                <ClipboardCheck className="h-4 w-4" />
              </div>
              <div>
                <p className="text-2xl font-semibold tracking-tight">{totalRequests}</p>
                <p className="text-sm text-muted-foreground">Pending reviews</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border bg-muted">
                <PackagePlus className="h-4 w-4" />
              </div>
              <div>
                <p className="text-2xl font-semibold tracking-tight">{requests.length}</p>
                <p className="text-sm text-muted-foreground">Loaded on this page</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border bg-muted">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="text-2xl font-semibold tracking-tight">Admin</p>
                <p className="text-sm text-muted-foreground">Approve or reject safely</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {requests.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex min-h-56 flex-col items-center justify-center gap-3 p-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border bg-muted">
                <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="font-medium">No pending product requests</p>
                <p className="text-sm text-muted-foreground">
                  Partner submissions that need catalog approval will appear here.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {requests.map((request) => {
            const image = resolvePublicAssetUrl(request.images?.[0] || request.variants?.find((variant) => variant.image)?.image);

            return (
              <Card key={request.id} className="overflow-hidden">
                <CardHeader className="flex flex-row items-start justify-between gap-4 border-b">
                  <div>
                    <CardTitle className="text-lg">{request.name}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {request.partner?.companyName ?? "Unknown partner"} · {request.partner?.user?.email ?? "No email"}
                    </p>
                  </div>
                  <Badge variant="outline">{request.status}</Badge>
                </CardHeader>
                <CardContent className="grid gap-5 p-5 md:grid-cols-[128px_minmax(0,1fr)_140px]">
                  <div className="relative aspect-square overflow-hidden rounded-2xl border bg-muted">
                    {image ? (
                      <Image unoptimized fill src={image} alt={request.name} className="object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No image</div>
                    )}
                  </div>
                  <div className="min-w-0 space-y-3">
                    <div className="grid gap-2 text-sm sm:grid-cols-3">
                      <div>
                        <span className="text-muted-foreground">Brand</span>
                        <p className="font-medium">{request.brand?.name ?? "No brand"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Type</span>
                        <p className="font-medium">{request.productType?.name ?? "No type"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Category</span>
                        <p className="font-medium">{request.category?.name ?? request.productType?.category?.name ?? "No category"}</p>
                      </div>
                    </div>
                    {request.description ? (
                      <p className="text-sm text-muted-foreground">{request.description}</p>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      {(request.variants ?? []).map((variant) => (
                        <Badge key={variant.id} variant="secondary" className="rounded-full">
                          {variant.name || "Default"} {variant.price ? `· ${variant.price} DZD` : ""}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex min-w-36 flex-col gap-2">
                    <form action={approveRequest}>
                      <input type="hidden" name="id" value={request.id} />
                      <Button className="w-full gap-2" type="submit">
                        <CheckCircle2 className="h-4 w-4" />
                        Approve
                      </Button>
                    </form>
                    <form action={rejectRequest}>
                      <input type="hidden" name="id" value={request.id} />
                      <Button className="w-full gap-2" variant="outline" type="submit">
                        <XCircle className="h-4 w-4" />
                        Reject
                      </Button>
                    </form>
                    <form action={mergeRequest} className="flex gap-2">
                      <input type="hidden" name="id" value={request.id} />
                      <input name="targetTemplateId" type="number" min="1" required placeholder="Template ID" className="h-10 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm" />
                      <Button variant="outline" type="submit">Merge</Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          </div>
        )}
      </div>
    </ResourcePage>
  );
}
