"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Barcode, ChevronLeft, ChevronRight, Combine, ImageIcon, Loader2, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { resolvePublicAssetUrl } from "@/constant";
import { deleteCatalogVariants, mergeCatalogVariants, setCatalogVariantBarcode, type CatalogVariantRow } from "../actions";

type Props = {
  data: CatalogVariantRow[];
  totalItems: number;
  page: number;
  limit: number;
  searchParams: Record<string, string | string[] | undefined>;
};

function pageUrl(searchParams: Props["searchParams"], page: number) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string" && key !== "page" && key !== "view") query.set(key, value);
  }
  query.set("view", "variants");
  query.set("page", String(page));
  return `/product-templates?${query.toString()}`;
}

export default function CatalogVariantsTable({ data, totalItems, page, limit, searchParams }: Props) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [editing, setEditing] = useState<CatalogVariantRow | null>(null);
  const [barcode, setBarcode] = useState("");
  const [details, setDetails] = useState<CatalogVariantRow | null>(null);
  const [selection, setSelection] = useState<{ scope: string; rows: Record<number, CatalogVariantRow> }>({ scope: "", rows: {} });
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeTargetId, setMergeTargetId] = useState<number | null>(null);
  const [mergeStep, setMergeStep] = useState<"choose" | "confirm">("choose");
  const pageCount = Math.max(1, Math.ceil(totalItems / limit));
  const selectionScope = useMemo(() => JSON.stringify(Object.entries(searchParams).filter(([key]) => key !== "page").sort(([left], [right]) => left.localeCompare(right))), [searchParams]);
  const selectedById = selection.scope === selectionScope ? selection.rows : {};
  const selectedVariants = Object.values(selectedById);
  const selectableOnPage = data;
  const selectedOnPage = selectableOnPage.filter((variant) => Boolean(selectedById[variant.id])).length;
  const allSelectableOnPage = selectableOnPage.length > 0 && selectedOnPage === selectableOnPage.length;
  const sameTemplateSelected = selectedVariants.length > 1 && new Set(selectedVariants.map((variant) => variant.productId)).size === 1;
  const selectedPartnerUsed = selectedVariants.some((variant) => variant.partnerProductCount > 0);
  const mergeTarget = selectedVariants.find((variant) => variant.id === mergeTargetId) ?? null;
  const mergeSources = selectedVariants.filter((variant) => variant.id !== mergeTargetId);

  function toggleVariant(variant: CatalogVariantRow, checked: boolean) {
    setSelection((current) => {
      const next = current.scope === selectionScope ? { ...current.rows } : {};
      if (checked) next[variant.id] = variant;
      else delete next[variant.id];
      return { scope: selectionScope, rows: next };
    });
  }

  function toggleCurrentPage(checked: boolean) {
    setSelection((current) => {
      const next = current.scope === selectionScope ? { ...current.rows } : {};
      for (const variant of selectableOnPage) {
        if (checked) next[variant.id] = variant;
        else delete next[variant.id];
      }
      return { scope: selectionScope, rows: next };
    });
  }

  function confirmDelete() {
    startTransition(async () => {
      try {
        const count = await deleteCatalogVariants(selectedVariants.map(({ id, productId }) => ({ id, productId })));
        toast.success(`${count} variant${count === 1 ? "" : "s"} deleted.`);
        setSelection({ scope: selectionScope, rows: {} });
        setDeleteOpen(false);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not delete selected variants.");
      }
    });
  }

  function openMergeDialog() {
    if (!sameTemplateSelected || selectedVariants.length > 26) return;
    setMergeTargetId(selectedVariants[0].id);
    setMergeStep("choose");
    setMergeOpen(true);
  }

  function confirmMerge() {
    if (!mergeTarget || !mergeSources.length) return;
    startTransition(async () => {
      try {
        await mergeCatalogVariants(mergeTarget.id, mergeSources.map((variant) => variant.id), mergeTarget.productId);
        toast.success(`${mergeSources.length} duplicate variant${mergeSources.length === 1 ? "" : "s"} merged into ${mergeTarget.name || "the selected variant"}.`);
        setSelection({ scope: selectionScope, rows: {} });
        setMergeOpen(false);
        setMergeStep("choose");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not merge selected variants.");
      }
    });
  }

  function saveBarcode() {
    if (!editing) return;
    startTransition(async () => {
      try {
        await setCatalogVariantBarcode(editing.productId, editing.id, barcode);
        toast.success("Barcode added to the shared catalog variant.");
        setEditing(null);
        setBarcode("");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not add this barcode.");
      }
    });
  }

  return <div className="space-y-4">
    {selectedVariants.length > 0 && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3">
      <div className="flex items-center gap-2 text-sm"><Badge variant="secondary">{selectedVariants.length} selected</Badge><span className="text-muted-foreground">Selection is kept while paging through this filtered list.</span></div>
      <div className="flex flex-wrap items-center gap-2"><Button type="button" size="sm" variant="ghost" onClick={() => setSelection({ scope: selectionScope, rows: {} })}><X className="mr-1 h-4 w-4" />Clear</Button><Button type="button" size="sm" variant="outline" disabled={busy || !sameTemplateSelected || selectedVariants.length > 26} onClick={openMergeDialog}><Combine className="mr-1 h-4 w-4" />Merge duplicates</Button><Button type="button" size="sm" variant="destructive" disabled={busy || selectedVariants.length > 100 || selectedPartnerUsed} onClick={() => setDeleteOpen(true)}><Trash2 className="mr-1 h-4 w-4" />Delete selected</Button></div>
      {!sameTemplateSelected && selectedVariants.length > 1 && <p className="basis-full text-xs text-muted-foreground">To merge variants, select them from one product template.</p>}
      {selectedPartnerUsed && <p className="basis-full text-xs text-amber-700">Some selected variants have partner listings. They can be merged if safe, but cannot be deleted.</p>}
      {selectedVariants.length > 100 && <p className="basis-full text-xs text-amber-700">Bulk deletion supports up to 100 variants per operation.</p>}
      {selectedVariants.length > 26 && <p className="basis-full text-xs text-amber-700">Merging supports up to 26 variants at a time.</p>}
    </div>}
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
      <span>{totalItems} variants · page {page} of {pageCount}</span>
      <span>Barcodes belong to the shared variant and are unique across the catalog.</span>
    </div>
    <Table>
      <TableHeader><TableRow>
        <TableHead className="w-10"><Checkbox checked={allSelectableOnPage ? true : selectedOnPage ? "indeterminate" : false} disabled={!selectableOnPage.length || busy} onCheckedChange={(checked) => toggleCurrentPage(checked === true)} aria-label="Select variants on this page" /></TableHead><TableHead>Variant</TableHead><TableHead>Product template</TableHead><TableHead>Category</TableHead><TableHead>SKU</TableHead><TableHead>Barcode</TableHead>
      </TableRow></TableHeader>
      <TableBody>
        {data.length === 0 ? <TableRow><TableCell colSpan={6} className="h-28 text-center text-muted-foreground">No variants match these filters.</TableCell></TableRow> : data.map((variant) => (
          <TableRow key={variant.id}>
            <TableCell><Checkbox checked={Boolean(selectedById[variant.id])} disabled={busy} onCheckedChange={(checked) => toggleVariant(variant, checked === true)} aria-label={`Select ${variant.name || variant.name_ar || "variant"}`} /></TableCell>
            <TableCell><div className="flex min-w-44 items-center gap-3">
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border bg-muted">{variant.images?.[0]?.url ? <Image unoptimized fill sizes="40px" src={resolvePublicAssetUrl(variant.images[0].url)} alt="" className="object-contain" /> : <ImageIcon className="absolute inset-0 m-auto h-4 w-4 text-muted-foreground" />}</div>
              <div className="min-w-0"><button type="button" className="block max-w-full truncate text-left font-medium hover:underline" onClick={() => setDetails(variant)}>{variant.name || variant.name_ar || "Standard"}</button><p className="text-xs text-muted-foreground">Variant #{variant.id}</p></div>
            </div></TableCell>
            <TableCell><Link className="font-medium hover:underline" href={`/product-templates/${variant.productId}`}>{variant.product.name || variant.product.name_ar || `Template #${variant.productId}`}</Link></TableCell>
            <TableCell>{variant.product.category?.name || variant.product.category?.name_ar || "—"}</TableCell>
            <TableCell>{variant.sku ? <code className="rounded bg-muted px-2 py-1 text-xs">{variant.sku}</code> : <span className="text-muted-foreground">—</span>}</TableCell>
            <TableCell>{variant.barcode ? <div className="flex items-center gap-2"><code className="rounded bg-muted px-2 py-1 text-xs">{variant.barcode}</code><Badge variant="secondary">Assigned</Badge></div> : <Button size="sm" variant="outline" onClick={() => { setEditing(variant); setBarcode(""); }}><Barcode /> Add barcode</Button>}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    <div className="flex items-center justify-between text-sm text-muted-foreground">
      <span>Showing {totalItems === 0 ? 0 : (page - 1) * limit + 1}–{Math.min(page * limit, totalItems)} of {totalItems}</span>
      <div className="flex gap-2">
        <Button asChild size="sm" variant="outline" disabled={page <= 1}><Link href={pageUrl(searchParams, Math.max(1, page - 1))}><ChevronLeft /> Previous</Link></Button>
        <Button asChild size="sm" variant="outline" disabled={page >= pageCount}><Link href={pageUrl(searchParams, Math.min(pageCount, page + 1))}>Next <ChevronRight /></Link></Button>
      </div>
    </div>
    <Dialog open={deleteOpen} onOpenChange={(open) => !busy && setDeleteOpen(open)}>
      <DialogContent>
        <DialogHeader><DialogTitle>Delete {selectedVariants.length} selected variant{selectedVariants.length === 1 ? "" : "s"}?</DialogTitle><DialogDescription>Unused variants and their images/tags will be removed. Variants listed by partners cannot be deleted, and each template must retain at least one variant. The operation is atomic: if any selected variant is protected, none are deleted.</DialogDescription></DialogHeader>
        <div className="max-h-56 divide-y overflow-y-auto rounded-lg border">{selectedVariants.map((variant) => <div key={variant.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm"><span className="min-w-0"><span className="block truncate">{variant.product.name || variant.product.name_ar || `Template #${variant.productId}`}</span><span className="block truncate text-xs text-muted-foreground">{variant.name || variant.name_ar || "Standard"}</span></span><span className="shrink-0 text-xs text-muted-foreground">#{variant.id}</span></div>)}</div>
        <DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={() => setDeleteOpen(false)}>Cancel</Button><Button type="button" variant="destructive" disabled={busy || !selectedVariants.length || selectedVariants.length > 100 || selectedPartnerUsed} onClick={confirmDelete}>{busy ? <Loader2 className="animate-spin" /> : <Trash2 />}Delete variants</Button></DialogFooter>
      </DialogContent>
    </Dialog>
    <Dialog open={Boolean(details)} onOpenChange={(open) => !open && setDetails(null)}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Variant details</DialogTitle><DialogDescription>Catalog information for this exact variant.</DialogDescription></DialogHeader>
        {details && <div className="space-y-4">
          <div className="flex items-start gap-4"><div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-lg border bg-muted">{details.images?.[0]?.url ? <Image unoptimized fill sizes="112px" src={resolvePublicAssetUrl(details.images[0].url)} alt={`${details.name || "Variant"} image`} className="object-contain" /> : <ImageIcon className="absolute inset-0 m-auto h-7 w-7 text-muted-foreground" />}</div><div className="min-w-0"><h3 className="font-semibold">{details.name || details.name_ar || "Standard"}</h3>{details.name_ar && details.name ? <p dir="rtl" className="mt-1 text-sm text-muted-foreground">{details.name_ar}</p> : null}<p className="mt-2 text-xs text-muted-foreground">{details.product.name || details.product.name_ar || `Template #${details.productId}`}</p><Link className="mt-2 inline-block text-sm text-primary underline-offset-4 hover:underline" href={`/product-templates/${details.productId}/variants`}>Open template variants</Link></div></div>
          {details.description && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{details.description}</p>}
          {details.description_ar && <p dir="rtl" className="whitespace-pre-wrap text-sm text-muted-foreground">{details.description_ar}</p>}
          <div className="grid gap-3 rounded-lg border p-3 text-sm sm:grid-cols-2"><div><p className="text-xs text-muted-foreground">SKU</p><p className="mt-1 break-all">{details.sku || "—"}</p></div><div><p className="text-xs text-muted-foreground">Barcode</p><p className="mt-1 font-mono">{details.barcode || "—"}</p></div><div><p className="text-xs text-muted-foreground">Partner listings</p><p className="mt-1">{details.partnerProductCount}</p></div></div>
          {details.tags?.length ? <div><p className="mb-2 text-xs text-muted-foreground">Tags</p><div className="flex flex-wrap gap-1.5">{details.tags.map((tag) => <Badge key={tag.id} variant="outline">{tag.value}</Badge>)}</div></div> : null}
        </div>}
      </DialogContent>
    </Dialog>
    <Dialog open={mergeOpen} onOpenChange={(open) => { if (!busy) { setMergeOpen(open); if (!open) setMergeStep("choose"); } }}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>{mergeStep === "choose" ? "Choose the variant to keep" : "Review variant merge"}</DialogTitle><DialogDescription>{mergeStep === "choose" ? "Other selected variants will be merged into this one. Their partner listings, tags, images, and barcode review records are preserved." : "Confirm the selected variants and the records that will be kept together."}</DialogDescription></DialogHeader>
        {mergeStep === "choose" ? <div className="max-h-72 space-y-2 overflow-y-auto">{selectedVariants.map((variant) => <button key={variant.id} type="button" aria-pressed={mergeTargetId === variant.id} onClick={() => setMergeTargetId(variant.id)} className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left ${mergeTargetId === variant.id ? "border-primary bg-primary/5" : "hover:bg-muted/40"}`}><div className="relative h-11 w-11 shrink-0 overflow-hidden rounded border bg-muted">{variant.images?.[0]?.url ? <Image unoptimized fill sizes="44px" src={resolvePublicAssetUrl(variant.images[0].url)} alt="" className="object-contain" /> : <ImageIcon className="absolute inset-0 m-auto h-4 w-4 text-muted-foreground" />}</div><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{variant.name || variant.name_ar || "Standard"}</span><span className="block truncate text-xs text-muted-foreground">SKU {variant.sku || "—"} · Barcode {variant.barcode || "—"} · {variant.partnerProductCount} partner listings</span></span>{mergeTargetId === variant.id && <Badge>Keep</Badge>}</button>)}</div> : mergeTarget ? <div className="space-y-3"><div className="rounded-lg border bg-muted/30 p-3"><p className="text-xs text-muted-foreground">Canonical variant</p><p className="font-medium">{mergeTarget.name || mergeTarget.name_ar || "Standard"}</p><p className="text-xs text-muted-foreground">{mergeTarget.product.name} · SKU {mergeTarget.sku || "—"} · Barcode {mergeTarget.barcode || "—"}</p></div><div><p className="mb-2 text-sm font-medium">Variants being merged</p><div className="max-h-36 divide-y overflow-y-auto rounded-lg border">{mergeSources.map((variant) => <div key={variant.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm"><span className="min-w-0"><span className="block truncate">{variant.name || variant.name_ar || "Standard"}</span><span className="block truncate text-xs text-muted-foreground">SKU {variant.sku || "—"} · Barcode {variant.barcode || "—"}</span></span><span className="shrink-0 text-xs text-muted-foreground">{variant.partnerProductCount} listings</span></div>)}</div></div><p className="text-xs text-muted-foreground">Partner product records keep their IDs, stock, and order history. Tags and images are combined. Empty canonical details are filled from a source variant. The merge stops without changes if a partner has duplicate listings or assigned barcodes/SKUs conflict.</p></div> : null}
        <DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={() => mergeStep === "confirm" ? setMergeStep("choose") : setMergeOpen(false)}>{mergeStep === "choose" ? "Cancel" : "Back"}</Button>{mergeStep === "choose" ? <Button type="button" disabled={!mergeTarget} onClick={() => setMergeStep("confirm")}>Review merge</Button> : <Button type="button" disabled={busy || !mergeTarget} onClick={confirmMerge}>{busy && <Loader2 className="animate-spin" />}Confirm merge</Button>}</DialogFooter>
      </DialogContent>
    </Dialog>
    <Dialog open={Boolean(editing)} onOpenChange={(open) => { if (!open && !busy) { setEditing(null); setBarcode(""); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add variant barcode</DialogTitle>
          <DialogDescription>{editing ? `${editing.product.name || "Product"} · ${editing.name || editing.name_ar || "Standard"}. ` : ""}The code is saved to the shared variant, validated, and cannot already belong to another variant.</DialogDescription>
        </DialogHeader>
        <label className="space-y-2 text-sm font-medium">Barcode
          <Input autoFocus inputMode="numeric" value={barcode} onChange={(event) => setBarcode(event.target.value)} placeholder="Enter or scan barcode" />
          <span className="block text-xs font-normal text-muted-foreground">Enter an 8, 12, 13, or 14 digit GTIN/EAN/UPC. The check digit is verified when saved.</span>
        </label>
        <DialogFooter>
          <Button variant="outline" onClick={() => setEditing(null)} disabled={busy}>Cancel</Button>
          <Button onClick={saveBarcode} disabled={busy || !barcode.trim()}>{busy ? <Loader2 className="animate-spin" /> : <Barcode />} Save barcode</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}
