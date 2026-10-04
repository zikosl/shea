"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { resolvePublicAssetUrl } from "@/constant";
import { type SahimReviewItem, reviewSahimItem } from "./actions";

type Payload = { name?: string; description?: string; barcode?: string; variantId?: number; image?: string; imageSource?: "CAMERA" | "EXTERNAL"; mergeTemplateId?: number; sourceUrl?: string; sourceImageUrl?: string; variants?: { name?: string; barcode?: string; tags?: string[]; image?: string; imageSource?: "CAMERA" | "EXTERNAL" }[] };

function reviewBarcode(item: SahimReviewItem): string {
  try { return (JSON.parse(item.payloadJson) as Payload).barcode || "unknown"; }
  catch { return "unknown"; }
}

export function SahimReviewQueue({ items }: { items: SahimReviewItem[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [mergeIds, setMergeIds] = useState<Record<string, string>>({});
  const [action, setAction] = useState<{ item: SahimReviewItem; approve: boolean } | null>(null);

  async function review(item: SahimReviewItem, approve: boolean) {
    if (busy) return;
    const rawMerge = mergeIds[item.id]?.trim();
    const mergeTemplateId = rawMerge ? Number(rawMerge) : undefined;
    if (rawMerge && (!Number.isSafeInteger(mergeTemplateId) || mergeTemplateId! < 1)) { toast.error("Enter a valid template ID."); return; }
    setBusy(item.id);
    try {
      const result = await reviewSahimItem(item.id, approve, notes[item.id] || "", mergeTemplateId);
      if (result.ok === false) { toast.error(result.message); return; }
      toast.success(approve ? "Contribution approved." : "Contribution rejected.");
      setAction(null);
      router.refresh();
    } catch { toast.error("Review failed. Try again."); }
    finally { setBusy(null); }
  }

  return <section className="space-y-3 pt-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-base font-semibold">Contributions awaiting review</h2><p className="text-sm text-muted-foreground">Only requests synced from Sahim appear here. Verify package evidence and the suggested template before approval.</p></div><Button size="sm" variant="outline" onClick={() => router.refresh()}>Refresh queue</Button></div>
    {!items.length ? <div className="rounded-xl border bg-card px-5 py-8 text-center text-sm text-muted-foreground">No pending contributions.</div> : items.map((item) => {
      let payload: Payload = {};
      try { payload = JSON.parse(item.payloadJson) as Payload; } catch { /* Keep malformed data visible for rejection. */ }
      return <article key={item.id} className="space-y-3 rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-semibold">{item.kind === "PRODUCT" ? payload.name || "Unnamed product" : `Barcode ${payload.barcode || "unknown"}`}</p><p className="text-xs text-muted-foreground">{item.kind} · Contributor #{item.contributorId} · {new Date(item.createdAt).toLocaleString()}</p></div><span className="text-xs text-muted-foreground">{payload.mergeTemplateId ? `Proposed Shea template #${payload.mergeTemplateId}` : item.kind === "PRODUCT" ? "New template" : "Existing variant"}</span></div>
        {payload.description ? <p className="text-sm text-muted-foreground">{payload.description}</p> : null}
        {payload.variantId ? <p className="text-sm">Assign to {item.targetProductName || "Unknown Shea product"} / {item.targetVariantName || "Default variant"} <span className="text-xs text-muted-foreground">(variant #{payload.variantId})</span></p> : null}
        {payload.image?.startsWith("/uploads/sahim/") ? <div className="space-y-1"><div className="relative h-28 w-28 overflow-hidden rounded-lg border"><Image unoptimized fill src={resolvePublicAssetUrl(payload.image)} alt="Proposed product image" className="object-contain" /></div><p className="text-xs text-muted-foreground">{payload.imageSource === "EXTERNAL" ? "Imported external image; verify the product match" : "Contributor photo"}</p></div> : null}
        {item.kind === "BARCODE" && !payload.image ? <p className="text-xs text-muted-foreground">No package photo was submitted. Verify the scanned code against the Shea variant before approving.</p> : null}
        {payload.variants?.length ? <div className="space-y-2">{payload.variants.map((variant, index) => <div key={`${variant.barcode || variant.name}-${index}`} className="flex items-center gap-3 rounded-lg border p-2">{variant.image?.startsWith("/uploads/sahim/") ? <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md"><Image unoptimized fill src={resolvePublicAssetUrl(variant.image)} alt={`${variant.name || "Variant"} image`} className="object-contain" /></div> : null}<div><p className="text-sm">{variant.name || "Variant"}{variant.barcode ? ` · ${variant.barcode}` : ""}</p>{variant.tags?.length ? <p className="text-xs text-muted-foreground">Tags: {variant.tags.join(", ")}</p> : null}{variant.image ? <p className="text-xs text-muted-foreground">{variant.imageSource === "EXTERNAL" ? "Imported external image" : "Contributor photo"}</p> : null}</div></div>)}</div> : null}
        {payload.sourceUrl ? <a className="text-xs underline" href={payload.sourceUrl} target="_blank" rel="noopener noreferrer">View external reference</a> : null}
        {payload.sourceImageUrl ? <a className="ml-3 text-xs underline" href={payload.sourceImageUrl} target="_blank" rel="noopener noreferrer">View external image</a> : null}
        <div className="flex flex-wrap gap-2">{item.kind === "PRODUCT" ? <Input className="max-w-52" inputMode="numeric" placeholder="Override template ID (optional)" value={mergeIds[item.id] || ""} onChange={(event) => setMergeIds((current) => ({ ...current, [item.id]: event.target.value }))} disabled={Boolean(busy)} /> : null}<Input className="min-w-48 flex-1" placeholder="Review note (required to reject)" value={notes[item.id] || ""} onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))} disabled={Boolean(busy)} /></div>
        <div className="flex gap-2"><Button size="sm" disabled={Boolean(busy)} onClick={() => setAction({ item, approve: true })}>Approve</Button><Button size="sm" variant="outline" disabled={Boolean(busy)} onClick={() => setAction({ item, approve: false })}>Reject</Button></div>
      </article>;
    })}
    <Dialog open={Boolean(action)} onOpenChange={(open) => { if (!open && !busy) setAction(null); }}><DialogContent><DialogHeader><DialogTitle>{action?.approve ? "Approve contribution?" : "Reject contribution?"}</DialogTitle><DialogDescription>{action?.approve ? action.item.kind === "BARCODE" ? `Assign barcode ${reviewBarcode(action.item)} to ${action.item.targetProductName || "the selected Shea product"} / ${action.item.targetVariantName || "Default variant"}? Verify this match before approving.` : "This will add a product or variant to Shea. Verify any image source, tags, and template match first." : "The contributor will see your review note. Add a clear reason before rejecting."}</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" disabled={Boolean(busy)} onClick={() => setAction(null)}>Cancel</Button><Button variant={action?.approve ? "default" : "destructive"} disabled={Boolean(busy)} onClick={() => { if (action) void review(action.item, action.approve); }}>{busy ? "Saving..." : action?.approve ? "Approve" : "Reject"}</Button></DialogFooter></DialogContent></Dialog>
  </section>;
}
