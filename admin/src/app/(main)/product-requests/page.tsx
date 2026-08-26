import Image from "next/image";
import { CheckCircle2, XCircle } from "lucide-react";

import { ResourcePage } from "@/components/admin-panel/resource-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { resolvePublicAssetUrl } from "@/constant";

import { approveRequest, getProductTemplateRequests, rejectRequest } from "./actions";

export const metadata = {
  title: "Dashboard: Product Requests",
  description: "Review partner-submitted product templates.",
};

export default async function ProductRequestsPage() {
  const { requests, totalRequests } = await getProductTemplateRequests();

  return (
    <ResourcePage
      title="Product Requests"
      description="Review partner-submitted templates before they enter the global catalog."
    >
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">{totalRequests} pending requests</div>
        {requests.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No pending product requests.
            </CardContent>
          </Card>
        ) : (
          requests.map((request) => {
            const image = resolvePublicAssetUrl(request.images?.[0] || request.variants?.find((variant) => variant.image)?.image);

            return (
              <Card key={request.id} className="overflow-hidden">
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle>{request.name}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {request.partner?.companyName ?? "Unknown partner"} · {request.partner?.user?.email ?? "No email"}
                    </p>
                  </div>
                  <Badge variant="outline">{request.status}</Badge>
                </CardHeader>
                <CardContent className="grid gap-5 md:grid-cols-[140px_minmax(0,1fr)_auto]">
                  <div className="relative aspect-square overflow-hidden rounded-2xl border bg-muted">
                    {image ? (
                      <Image unoptimized fill src={image} alt={request.name} className="object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No image</div>
                    )}
                  </div>
                  <div className="space-y-3">
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
                        <p className="font-medium">{request.productType?.category?.name ?? "No category"}</p>
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
                      <Button className="w-full" type="submit">
                        <CheckCircle2 className="h-4 w-4" />
                        Approve
                      </Button>
                    </form>
                    <form action={rejectRequest}>
                      <input type="hidden" name="id" value={request.id} />
                      <Button className="w-full" variant="outline" type="submit">
                        <XCircle className="h-4 w-4" />
                        Reject
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </ResourcePage>
  );
}
