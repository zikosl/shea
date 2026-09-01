import { CheckCircle2, GitMerge, PackagePlus, XCircle } from "lucide-react";
import { ResourcePage } from "@/components/admin-panel/resource-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCatalogFilterOptions } from "@/lib/catalog-filter-options";
import { approveCatalogProposal, getCatalogProposals, mergeCatalogProposal, rejectCatalogProposal } from "./actions";

export const metadata = { title: "Dashboard: Catalog Requests" };
type Params = { search?: string; status?: string; entityType?: string; page?: string };

export default async function CatalogRequestsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const [{ proposals, total }, options] = await Promise.all([
    getCatalogProposals({ search: params.search?.trim(), status: params.status || "PENDING", entityType: params.entityType, page: Number(params.page) || 1 }),
    getCatalogFilterOptions(),
  ]);
  const nicheName = (id: number) => options.niches.find((item) => Number(item.id) === id)?.name ?? `Niche #${id}`;

  return <ResourcePage title="Catalog Requests" description="Review categories and product types proposed from partner POS devices.">
    <div className="space-y-4">
      <form className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-[1fr_220px_220px_auto]">
        <input name="search" defaultValue={params.search} placeholder="Search name or Arabic name..." className="h-10 rounded-md border bg-background px-3 text-sm" />
        <select name="entityType" defaultValue={params.entityType ?? ""} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">All record types</option><option value="CATEGORY">Categories</option><option value="PRODUCT_TYPE">Product types</option></select>
        <select name="status" defaultValue={params.status ?? "PENDING"} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="MERGED">Merged</option><option value="REJECTED">Rejected</option><option value="">All statuses</option></select>
        <Button type="submit">Apply filters</Button>
      </form>
      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="p-4"><p className="text-2xl font-semibold">{total}</p><p className="text-sm text-muted-foreground">Matching requests</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-semibold">{proposals.filter((item) => item.entityType === "CATEGORY").length}</p><p className="text-sm text-muted-foreground">Categories on this page</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-semibold">{proposals.filter((item) => item.entityType === "PRODUCT_TYPE").length}</p><p className="text-sm text-muted-foreground">Product types on this page</p></CardContent></Card>
      </div>
      {proposals.length === 0 ? <Card className="border-dashed"><CardContent className="flex min-h-56 flex-col items-center justify-center gap-3"><PackagePlus className="h-6 w-6 text-muted-foreground" /><p className="font-medium">No catalog requests match these filters</p></CardContent></Card> : <div className="grid gap-3">
        {proposals.map((proposal) => {
          const targets = proposal.entityType === "CATEGORY"
            ? options.categories.filter((item) => Number(item.niche_id) === proposal.nicheId)
            : options.productTypes.filter((item) => Number(item.category_id) === proposal.categoryId || Number(item.category?.id) === proposal.categoryId);
          return <Card key={proposal.id}><CardContent className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="space-y-3"><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-semibold">{proposal.name}</h2>{proposal.name_ar ? <span className="text-muted-foreground" dir="rtl">{proposal.name_ar}</span> : null}<Badge variant="outline">{proposal.entityType.replace("_", " ")}</Badge><Badge variant={proposal.status === "PENDING" ? "secondary" : "outline"}>{proposal.status}</Badge></div><div className="grid gap-2 text-sm sm:grid-cols-3"><div><span className="text-muted-foreground">Niche</span><p className="font-medium">{nicheName(proposal.nicheId)}</p></div><div><span className="text-muted-foreground">Partner</span><p className="font-medium">{proposal.partner?.companyName ?? "Unknown"}</p></div><div><span className="text-muted-foreground">Submitted</span><p className="font-medium">{new Date(proposal.createdAt).toLocaleDateString()}</p></div></div>{proposal.description ? <p className="text-sm text-muted-foreground">{proposal.description}</p> : null}{proposal.rejectionReason ? <p className="text-sm text-destructive">Reason: {proposal.rejectionReason}</p> : null}</div>
            {proposal.status === "PENDING" ? <div className="space-y-2 rounded-xl border bg-muted/30 p-3">
              <form action={approveCatalogProposal}><input type="hidden" name="id" value={proposal.id} /><Button className="w-full gap-2"><CheckCircle2 className="h-4 w-4" />Approve as new</Button></form>
              <form action={mergeCatalogProposal} className="flex gap-2"><input type="hidden" name="id" value={proposal.id} /><select name="targetId" required className="h-10 min-w-0 flex-1 rounded-md border bg-background px-2 text-sm"><option value="">Merge with existing...</option>{targets.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><Button variant="outline" size="icon" title="Merge"><GitMerge className="h-4 w-4" /></Button></form>
              <form action={rejectCatalogProposal} className="flex gap-2"><input type="hidden" name="id" value={proposal.id} /><input name="rejectionReason" required minLength={3} placeholder="Rejection reason" className="h-10 min-w-0 flex-1 rounded-md border bg-background px-2 text-sm" /><Button variant="outline" size="icon" title="Reject"><XCircle className="h-4 w-4" /></Button></form>
            </div> : <div className="flex items-center justify-center rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">Review completed</div>}
          </CardContent></Card>;
        })}
      </div>}
    </div>
  </ResourcePage>;
}
