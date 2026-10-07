"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChangeEvent, useState } from "react";
import { gql } from "graphql-request";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { resolvePublicAssetUrl } from "@/constant";
import { useUploadFile } from "@/hooks/use-upload-file";
import { copySahimProductImage, type SahimReviewItem, reviewSahimItem, reviewSahimItems, updateSahimItemImage } from "./actions";

type ReviewImages = { product?: string; barcode?: string; variants?: Record<string, string> };
type Payload = {
  name?: string; description?: string; barcode?: string; variantId?: number; image?: string; imageSource?: "CAMERA" | "EXTERNAL";
  mergeTemplateId?: number; sourceUrl?: string; sourceImageUrl?: string; reviewImages?: ReviewImages;
  variants?: { name?: string; barcode?: string; tags?: string[]; image?: string; imageSource?: "CAMERA" | "EXTERNAL" }[];
};
type ImageTarget = "PRODUCT" | "BARCODE" | `VARIANT:${number}`;
type ImageEditor = { item: SahimReviewItem; target: ImageTarget; title: string; current: string; original: string; overridden: boolean };

const SAHIM_REVIEW_UPLOAD = gql`mutation UploadSahimReviewPhoto($file: File!) {
  uploadSahimReviewPhoto(file: $file) { url }
}`;

const storedImage = (value?: string) => Boolean(value && /^\/uploads\/sahim(?:-review)?\//.test(value));

function imageFor(payload: Payload, target: ImageTarget) {
  if (target === "PRODUCT") return payload.reviewImages?.product || payload.image || "";
  if (target === "BARCODE") return payload.reviewImages?.barcode || payload.image || "";
  const index = Number(target.slice("VARIANT:".length));
  return payload.reviewImages?.variants?.[String(index)] || payload.variants?.[index]?.image || "";
}

function originalImageFor(payload: Payload, target: ImageTarget) {
  if (target === "PRODUCT" || target === "BARCODE") return payload.image || "";
  const index = Number(target.slice("VARIANT:".length));
  return payload.variants?.[index]?.image || "";
}

function Preview({ source, alt }: { source: string; alt: string }) {
  if (!storedImage(source)) return <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border bg-muted text-center text-xs text-muted-foreground">No image</div>;
  return <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border bg-muted"><Image unoptimized fill src={resolvePublicAssetUrl(source)} alt={alt} className="object-contain" /></div>;
}

function barcodeOf(item: SahimReviewItem) {
  try { return (JSON.parse(item.payloadJson) as Payload).barcode || "unknown"; }
  catch { return "unknown"; }
}

export function SahimReviewQueue({ items }: { items: SahimReviewItem[] }) {
  const router = useRouter();
  const { uploadFiles, isUploading } = useUploadFile(SAHIM_REVIEW_UPLOAD, "uploadSahimReviewPhoto");
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [mergeIds, setMergeIds] = useState<Record<string, string>>({});
  const [action, setAction] = useState<{ item: SahimReviewItem; approve: boolean } | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [batchAction, setBatchAction] = useState<{ approve: boolean; ids: string[] } | null>(null);
  const [batchNote, setBatchNote] = useState("");
  const [editor, setEditor] = useState<ImageEditor | null>(null);
  const [url, setUrl] = useState("");

  async function review(item: SahimReviewItem, approve: boolean) {
    if (busy || isUploading) return;
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

  function openEditor(item: SahimReviewItem, target: ImageTarget, title: string, payload: Payload) {
    setUrl("");
    const original = originalImageFor(payload, target);
    setEditor({ item, target, title, current: imageFor(payload, target), original, overridden: imageFor(payload, target) !== original });
  }

  async function saveImage(source: string) {
    if (!editor || busy || !source.trim()) return;
    setBusy(editor.item.id);
    try {
      const result = await updateSahimItemImage(editor.item.id, editor.target, source);
      if (result.ok === false) { toast.error(result.message); return; }
      toast.success(source === "__ORIGINAL__" ? "Contributor image restored." : "Review image updated.");
      setEditor(null);
      router.refresh();
    } catch { toast.error("Image update failed. Try again."); }
    finally { setBusy(null); }
  }

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !editor) return;
    const [uploaded] = await uploadFiles([file]);
    if (uploaded?.url) await saveImage(uploaded.url);
  }

  async function copyProductImage(item: SahimReviewItem, variantIndex?: number) {
    if (busy || isUploading) return;
    setBusy(item.id);
    try {
      const result = await copySahimProductImage(item.id, variantIndex);
      if (result.ok === false) { toast.error(result.message); return; }
      toast.success(variantIndex === undefined ? "Product image applied to all variants." : "Product image applied to this variant.");
      router.refresh();
    } catch { toast.error("Could not copy the product image. Try again."); }
    finally { setBusy(null); }
  }

  function toggleSelected(id: string, checked: boolean) {
    setSelected((current) => checked ? [...new Set([...current, id])] : current.filter((item) => item !== id));
  }

  function openBatch(approve: boolean, ids: string[]) {
    if (!ids.length) return;
    setBatchNote("");
    setBatchAction({ approve, ids });
  }

  async function reviewBatch() {
    if (!batchAction || busy) return;
    setBusy("batch");
    try {
      const result = await reviewSahimItems(batchAction.ids, batchAction.approve, batchNote);
      if (!result.ok && result.completed === 0) { toast.error(result.message || "No contributions were reviewed."); return; }
      toast.success(`${result.completed} contribution${result.completed === 1 ? "" : "s"} ${batchAction.approve ? "approved" : "rejected"}.`);
      if (result.message) toast.error(result.message);
      setSelected((current) => current.filter((id) => !batchAction.ids.includes(id)));
      setBatchAction(null);
      router.refresh();
    } catch { toast.error("Batch review failed. Try again."); }
    finally { setBusy(null); }
  }

  return <section className="space-y-3 pt-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-base font-semibold">Contributions awaiting review</h2><p className="text-sm text-muted-foreground">Replace a submitted image when needed. The original submission is preserved as evidence; approval uses the reviewed image.</p></div><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={!items.length || Boolean(busy)} onClick={() => openBatch(true, items.map((item) => item.id))}>Approve all</Button><Button size="sm" variant="outline" disabled={!items.length || Boolean(busy)} onClick={() => openBatch(false, items.map((item) => item.id))}>Reject all</Button><Button size="sm" variant="outline" onClick={() => router.refresh()}>Refresh queue</Button></div></div>
    {items.length ? <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2"><Checkbox id="sahim-select-all" checked={selected.length === items.length} onCheckedChange={(checked) => setSelected(checked ? items.map((item) => item.id) : [])} /><label htmlFor="sahim-select-all" className="text-sm">Select all</label>{selected.length ? <><span className="text-sm text-muted-foreground">{selected.length} selected</span><Button size="sm" onClick={() => openBatch(true, selected)} disabled={Boolean(busy)}>Approve selected</Button><Button size="sm" variant="outline" onClick={() => openBatch(false, selected)} disabled={Boolean(busy)}>Reject selected</Button><Button size="sm" variant="ghost" onClick={() => setSelected([])} disabled={Boolean(busy)}>Clear</Button></> : null}</div> : null}
    {!items.length ? <div className="rounded-xl border bg-card px-5 py-8 text-center text-sm text-muted-foreground">No pending contributions.</div> : items.map((item) => {
      let payload: Payload = {};
      try { payload = JSON.parse(item.payloadJson) as Payload; } catch { /* Keep malformed data visible for rejection. */ }
      const primaryTarget: ImageTarget = item.kind === "BARCODE" ? "BARCODE" : "PRODUCT";
      const primary = imageFor(payload, primaryTarget);
      const overridden = Boolean(item.kind === "BARCODE" ? payload.reviewImages?.barcode : payload.reviewImages?.product);
      return <article key={item.id} className="space-y-3 rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-2"><div className="flex items-start gap-3"><Checkbox aria-label={`Select ${item.kind === "PRODUCT" ? payload.name || "product" : `barcode ${payload.barcode || "unknown"}`}`} checked={selected.includes(item.id)} disabled={Boolean(busy)} onCheckedChange={(checked) => toggleSelected(item.id, checked === true)} /><div><p className="text-sm font-semibold">{item.kind === "PRODUCT" ? payload.name || "Unnamed product" : `Barcode ${payload.barcode || "unknown"}`}</p><p className="text-xs text-muted-foreground">{item.kind} · Contributor #{item.contributorId} · {new Date(item.createdAt).toLocaleString()}</p></div></div><span className="text-xs text-muted-foreground">{payload.mergeTemplateId ? `Proposed Shea template #${payload.mergeTemplateId}` : item.kind === "PRODUCT" ? "New template" : "Existing variant"}</span></div>
        {payload.description ? <p className="text-sm text-muted-foreground">{payload.description}</p> : null}
        {payload.variantId ? <p className="text-sm">Assign to {item.targetProductName || "Unknown Shea product"} / {item.targetVariantName || "Default variant"}</p> : null}
        <div className="flex items-center gap-3 rounded-lg bg-muted/40 p-2.5"><Preview source={primary} alt="Reviewed product image" /><div className="min-w-0 flex-1"><p className="text-sm font-medium">{item.kind === "BARCODE" ? "Package evidence" : "Product image"}</p><p className="mt-1 text-xs text-muted-foreground">{overridden ? "Admin replacement selected" : primary ? payload.imageSource === "EXTERNAL" ? "Imported external image" : "Contributor photo" : "No image selected"}</p></div>{item.kind === "PRODUCT" && payload.variants?.length && primary ? <Button size="sm" variant="ghost" disabled={Boolean(busy) || isUploading} onClick={() => void copyProductImage(item)}>Use for all variants</Button> : null}<Button size="sm" variant="outline" disabled={Boolean(busy) || isUploading} onClick={() => openEditor(item, primaryTarget, item.kind === "BARCODE" ? "Package evidence" : "Product image", payload)}>Edit image</Button></div>
        {payload.variants?.length ? <div className="space-y-2">{payload.variants.map((variant, index) => { const target = `VARIANT:${index}` as ImageTarget; const variantImage = imageFor(payload, target); const showImage = payload.variants!.length > 1 || Boolean(variantImage); return <div key={`${variant.barcode || variant.name}-${index}`} className="flex items-center gap-3 rounded-lg border p-2">{showImage ? <Preview source={variantImage} alt={`${variant.name || "Variant"} image`} /> : null}<div className="min-w-0 flex-1"><p className="text-sm">{variant.name || "Variant"}{variant.barcode ? ` · ${variant.barcode}` : ""}</p>{variant.tags?.length ? <p className="text-xs text-muted-foreground">Tags: {variant.tags.join(", ")}</p> : null}<p className="text-xs text-muted-foreground">{payload.reviewImages?.variants?.[String(index)] ? "Using admin replacement" : variant.image ? "Contributor image" : primary ? "Uses the product image when approved" : "No image selected"}</p></div>{item.kind === "PRODUCT" && primary ? <Button size="sm" variant="ghost" disabled={Boolean(busy) || isUploading} onClick={() => void copyProductImage(item, index)}>Use product image</Button> : null}<Button size="sm" variant="ghost" disabled={Boolean(busy) || isUploading} onClick={() => openEditor(item, target, `${variant.name || "Variant"} image`, payload)}>{showImage ? "Edit" : "Add image"}</Button></div>; })}</div> : null}
        {payload.sourceUrl ? <a className="text-xs underline" href={payload.sourceUrl} target="_blank" rel="noopener noreferrer">View external reference</a> : null}{payload.sourceImageUrl ? <a className="ml-3 text-xs underline" href={payload.sourceImageUrl} target="_blank" rel="noopener noreferrer">View external image</a> : null}
        {item.kind === "PRODUCT" ? <Input className="max-w-52" inputMode="numeric" placeholder="Override template ID (optional)" value={mergeIds[item.id] || ""} onChange={(event) => setMergeIds((current) => ({ ...current, [item.id]: event.target.value }))} disabled={Boolean(busy)} /> : null}
        <div className="flex gap-2"><Button size="sm" disabled={Boolean(busy) || isUploading} onClick={() => setAction({ item, approve: true })}>Approve</Button><Button size="sm" variant="outline" disabled={Boolean(busy) || isUploading} onClick={() => setAction({ item, approve: false })}>Reject</Button></div>
      </article>;
    })}
    <Dialog open={Boolean(action)} onOpenChange={(open) => { if (!open && !busy) setAction(null); }}><DialogContent><DialogHeader><DialogTitle>{action?.approve ? "Approve contribution?" : "Reject contribution?"}</DialogTitle><DialogDescription>{action?.approve ? action.item.kind === "BARCODE" ? `Assign barcode ${barcodeOf(action.item)} to ${action.item.targetProductName || "the selected Shea product"} / ${action.item.targetVariantName || "Default variant"}?` : "This will add a product or variant to Shea. Verify its image, tags, and template match first." : "The contributor will receive this reason in Sahim."}</DialogDescription></DialogHeader>{action && !action.approve ? <div className="space-y-2"><label className="text-sm font-medium" htmlFor="sahim-review-note">Reason for rejection</label><Input id="sahim-review-note" autoFocus placeholder="Explain what needs to be corrected" value={notes[action.item.id] || ""} disabled={Boolean(busy)} onChange={(event) => setNotes((current) => ({ ...current, [action.item.id]: event.target.value }))} /></div> : null}<DialogFooter><Button variant="outline" disabled={Boolean(busy)} onClick={() => setAction(null)}>Cancel</Button><Button variant={action?.approve ? "default" : "destructive"} disabled={Boolean(busy) || (!action?.approve && !notes[action?.item.id || ""]?.trim())} onClick={() => { if (action) void review(action.item, action.approve); }}>{busy ? "Saving..." : action?.approve ? "Approve" : "Reject"}</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={Boolean(batchAction)} onOpenChange={(open) => { if (!open && !busy) setBatchAction(null); }}><DialogContent><DialogHeader><DialogTitle>{batchAction?.approve ? "Approve contributions?" : "Reject contributions?"}</DialogTitle><DialogDescription>{batchAction?.approve ? `${batchAction.ids.length} selected contribution${batchAction.ids.length === 1 ? "" : "s"} will be approved one by one. Any conflict stays pending for individual review.` : `Reject ${batchAction?.ids.length || 0} selected contribution${batchAction?.ids.length === 1 ? "" : "s"}. Contributors will receive the same reason.`}</DialogDescription></DialogHeader>{batchAction && !batchAction.approve ? <Input placeholder="Reason for rejection" value={batchNote} onChange={(event) => setBatchNote(event.target.value)} disabled={Boolean(busy)} /> : null}<DialogFooter><Button variant="outline" disabled={Boolean(busy)} onClick={() => setBatchAction(null)}>Cancel</Button><Button variant={batchAction?.approve ? "default" : "destructive"} disabled={Boolean(busy) || (!batchAction?.approve && !batchNote.trim())} onClick={() => void reviewBatch()}>{busy ? "Reviewing..." : batchAction?.approve ? "Approve all selected" : "Reject all selected"}</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={Boolean(editor)} onOpenChange={(open) => { if (!open && !busy && !isUploading) setEditor(null); }}><DialogContent><DialogHeader><DialogTitle>Replace {editor?.title || "image"}</DialogTitle><DialogDescription>Upload a JPEG, PNG, or WebP file, or paste a direct HTTPS image URL. Shea copies URL images into its own storage before approval.</DialogDescription></DialogHeader>{editor ? <div className="space-y-4"><div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3"><div className="space-y-2"><Preview source={editor.original} alt="Contributor image" /><p className="text-xs font-medium">Contributor evidence</p></div><div className="space-y-2"><Preview source={editor.current} alt="Current review image" /><p className="text-xs font-medium">Used at approval</p>{editor.overridden ? <span className="text-xs text-primary">Admin replacement</span> : null}</div></div><div className="space-y-2"><label className="text-sm font-medium" htmlFor="sahim-review-upload">Upload a replacement</label><Input id="sahim-review-upload" type="file" accept="image/jpeg,image/png,image/webp" disabled={Boolean(busy) || isUploading} onChange={(event) => void upload(event)} /></div><div className="space-y-2"><label className="text-sm font-medium" htmlFor="sahim-review-url">Or paste an image URL</label><div className="flex gap-2"><Input id="sahim-review-url" type="url" placeholder="https://example.com/product.jpg" value={url} disabled={Boolean(busy) || isUploading} onChange={(event) => setUrl(event.target.value)} /><Button type="button" variant="outline" disabled={!url.trim() || Boolean(busy) || isUploading} onClick={() => void saveImage(url)}>Import</Button></div></div>{editor.overridden ? <Button type="button" variant="ghost" className="px-0 text-muted-foreground" disabled={Boolean(busy) || isUploading} onClick={() => void saveImage("__ORIGINAL__")}>Use contributor image instead</Button> : null}</div> : null}<DialogFooter><Button variant="outline" disabled={Boolean(busy) || isUploading} onClick={() => setEditor(null)}>Close</Button></DialogFooter></DialogContent></Dialog>
  </section>;
}
