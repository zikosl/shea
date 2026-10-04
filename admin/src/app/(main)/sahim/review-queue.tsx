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

type Payload = { name?: string; description?: string; barcode?: string; variantId?: number; image?: string; mergeTemplateId?: number; sourceUrl?: string; sourceImageUrl?: string; variants?: { name?: string; barcode?: string }[] };

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
    <div><h2 className="text-base font-semibold">Contributions awaiting review</h2><p className="text-sm text-muted-foreground">Verify package evidence and the suggested template before adding a barcode or variant to Shea.</p></div>
    {!items.length ? <div className="rounded-xl border bg-card px-5 py-8 text-center text-sm text-muted-foreground">No pending contributions.</div> : items.map((item) => {
      let payload: Payload = {};
      try { payload = JSON.parse(item.payloadJson) as Payload; } catch { /* Keep malformed data visible for rejection. */ }
      return <article key={item.id} className="space-y-3 rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-semibold">{item.kind === "PRODUCT" ? payload.name || "Unnamed product" : `Barcode ${payload.barcode || "unknown"}`}</p><p className="text-xs text-muted-foreground">{item.kind} · Contributor #{item.contributorId} · {new Date(item.createdAt).toLocaleString()}</p></div><span className="text-xs text-muted-foreground">{payload.mergeTemplateId ? `Proposed Shea template #${payload.mergeTemplateId}` : item.kind === "PRODUCT" ? "New template" : "Existing variant"}</span></div>
        {payload.description ? <p className="text-sm text-muted-foreground">{payload.description}</p> : null}
        {payload.variantId ? <p className="text-xs text-muted-foreground">Assign to Shea variant #{payload.variantId}</p> : null}
        {payload.image?.startsWith("/uploads/sahim/") ? <div className="relative h-28 w-28 overflow-hidden rounded-lg border"><Image unoptimized fill src={resolvePublicAssetUrl(payload.image)} alt="Contributor package evidence" className="object-contain" /></div> : null}
        {payload.variants?.length ? <p className="text-xs text-muted-foreground">{payload.variants.map((variant) => `${variant.name || "Variant"}${variant.barcode ? ` · ${variant.barcode}` : ""}`).join("; ")}</p> : null}
        {payload.sourceUrl ? <a className="text-xs underline" href={payload.sourceUrl} target="_blank" rel="noopener noreferrer">View external reference</a> : null}
        {payload.sourceImageUrl ? <a className="ml-3 text-xs underline" href={payload.sourceImageUrl} target="_blank" rel="noopener noreferrer">View external image</a> : null}
        <div className="flex flex-wrap gap-2">{item.kind === "PRODUCT" ? <Input className="max-w-52" inputMode="numeric" placeholder="Override template ID (optional)" value={mergeIds[item.id] || ""} onChange={(event) => setMergeIds((current) => ({ ...current, [item.id]: event.target.value }))} disabled={Boolean(busy)} /> : null}<Input className="min-w-48 flex-1" placeholder="Review note (required to reject)" value={notes[item.id] || ""} onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))} disabled={Boolean(busy)} /></div>
        <div className="flex gap-2"><Button size="sm" disabled={Boolean(busy)} onClick={() => setAction({ item, approve: true })}>Approve</Button><Button size="sm" variant="outline" disabled={Boolean(busy)} onClick={() => setAction({ item, approve: false })}>Reject</Button></div>
      </article>;
    })}
    <Dialog open={Boolean(action)} onOpenChange={(open) => { if (!open && !busy) setAction(null); }}><DialogContent><DialogHeader><DialogTitle>{action?.approve ? "Approve contribution?" : "Reject contribution?"}</DialogTitle><DialogDescription>{action?.approve ? "This will add the barcode or variant to Shea immediately. Confirm the package photo and template match first." : "The contributor will see your review note. Add a clear reason before rejecting."}</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" disabled={Boolean(busy)} onClick={() => setAction(null)}>Cancel</Button><Button variant={action?.approve ? "default" : "destructive"} disabled={Boolean(busy)} onClick={() => { if (action) void review(action.item, action.approve); }}>{busy ? "Saving..." : action?.approve ? "Approve" : "Reject"}</Button></DialogFooter></DialogContent></Dialog>
  </section>;
}
