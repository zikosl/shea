import Image from "next/image";
import Link from "next/link";
import { ResourcePage } from "@/components/admin-panel/resource-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { resolvePublicAssetUrl } from "@/constant";
import { getBarcodeCandidates, reviewBarcodeCandidate } from "./actions";

export const metadata = { title: "Dashboard: Barcode Review" };

export default async function BarcodeReviewPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  const params = await searchParams;
  const status = ["PENDING", "APPROVED", "REJECTED"].includes(params.status ?? "") ? params.status! : "PENDING";
  const page = Math.max(1, Number(params.page) || 1);
  const { candidates, total } = await getBarcodeCandidates(status, page);
  const pages = Math.ceil(total / 25);

  return <ResourcePage title="Barcode Review" description="Confirm the package and variant before using a manufacturer barcode in Shea POS.">
    <div className="space-y-4">
      <form className="flex items-center gap-3" method="get">
        <label htmlFor="status" className="text-sm text-muted-foreground">Status</label>
        <select id="status" name="status" defaultValue={status} className="h-9 rounded-md border bg-background px-3 text-sm">
          <option value="PENDING">Needs review</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <Button type="submit" size="sm" variant="outline">Show</Button>
        <span className="ml-auto text-sm text-muted-foreground">{total} candidates</span>
      </form>
      {candidates.length ? candidates.map((candidate) => {
        const variant = candidate.variant;
        const product = variant.product;
        const image = variant.images[0]?.url ?? product.images[0]?.url;
        return <Card key={candidate.id}><CardContent className="grid gap-4 p-4 sm:grid-cols-[64px_minmax(0,1fr)_auto]">
          <div className="relative h-16 w-16 overflow-hidden rounded-md bg-muted">
            {image ? <Image unoptimized fill src={resolvePublicAssetUrl(image)} alt="" className="object-contain" /> : null}
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/product-templates/${product.id}/variants`} className="font-medium hover:underline">{product.name} {variant.name ? `/ ${variant.name}` : ""}</Link>
              <Badge variant="outline">{candidate.status}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{product.brand?.name ?? "No brand"} · SKU {variant.sku ?? "none"}</p>
            <p className="font-mono text-lg tracking-wide" dir="ltr">{candidate.barcode}</p>
            {candidate.sourceName ? <p className="text-xs text-muted-foreground">Source name: {candidate.sourceName}</p> : null}
            {candidate.sourceUrl.startsWith("https://")
              ? <a href={candidate.sourceUrl} target="_blank" rel="noreferrer" className="block break-all text-xs text-primary underline">{candidate.sourceUrl}</a>
              : <p className="break-all text-xs text-muted-foreground">{candidate.sourceUrl}</p>}
            <p className="text-xs text-muted-foreground">Match score {candidate.matchScore}/100. Check size, scent, shade, and packaging.</p>
          </div>
          {candidate.status === "PENDING" ? <div className="flex items-start gap-2 sm:flex-col">
            <form action={reviewBarcodeCandidate}><input type="hidden" name="id" value={candidate.id} /><input type="hidden" name="decision" value="approve" /><Button type="submit" size="sm" className="w-full">Approve</Button></form>
            <form action={reviewBarcodeCandidate}><input type="hidden" name="id" value={candidate.id} /><input type="hidden" name="decision" value="reject" /><Button type="submit" size="sm" variant="outline" className="w-full">Reject</Button></form>
          </div> : null}
        </CardContent></Card>;
      }) : <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No {status.toLowerCase()} barcode candidates.</CardContent></Card>}
      {pages > 1 ? <div className="flex items-center justify-end gap-3 text-sm">
        {page > 1 ? <Button asChild size="sm" variant="outline"><Link href={`?status=${status}&page=${page - 1}`}>Previous</Link></Button> : null}
        <span>Page {page} of {pages}</span>
        {page < pages ? <Button asChild size="sm" variant="outline"><Link href={`?status=${status}&page=${page + 1}`}>Next</Link></Button> : null}
      </div> : null}
    </div>
  </ResourcePage>;
}
