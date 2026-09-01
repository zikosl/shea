"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ImageIcon, Layers3, Loader2, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { FILE_UPLOAD } from "@/api/mutations";
import { resolvePublicAssetUrl } from "@/constant";
import { useUploadFile } from "@/hooks/use-upload-file";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileUploader } from "@/components/ui/file-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { createVariantCombinations, deleteVariantItem, updateVariantItem } from "./actions";

type Props = {
  productId: number;
  productName: string;
  variants: ProductVariant[];
  total: number;
  page: number;
  limit: number;
  search: string;
};

export default function VariantsManager({ productId, productName, variants, total, page, limit, search }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [dimensions, setDimensions] = useState([""]);
  const [editing, setEditing] = useState<ProductVariant | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editSku, setEditSku] = useState("");
  const [editImages, setEditImages] = useState<string[]>([]);
  const [deleting, setDeleting] = useState<ProductVariant | null>(null);
  const { uploadFiles, progresses, isUploading } = useUploadFile(FILE_UPLOAD);

  const parsedDimensions = useMemo(
    () => dimensions.map((row) => Array.from(new Set(row.split(",").map((value) => value.trim()).filter(Boolean)))),
    [dimensions],
  );
  const validDimensions = parsedDimensions.filter((row) => row.length);
  const combinationCount = validDimensions.length
    ? validDimensions.reduce((count, values) => count * values.length, 1)
    : 0;
  const pageCount = Math.max(1, Math.ceil(total / limit));

  function run(action: () => Promise<void>, success: string, close?: () => void) {
    startTransition(async () => {
      try {
        await action();
        close?.();
        router.refresh();
        toast.success(success);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "The action could not be completed");
      }
    });
  }

  function beginEdit(variant: ProductVariant) {
    setEditing(variant);
    setEditName(variant.name ?? "");
    setEditDescription(variant.description ?? "");
    setEditTags(variant.tags.map((tag) => tag.value).join(", "));
    setEditSku(variant.sku ?? "");
    setEditImages(variant.images.map((image) => image.url));
  }

  async function uploadVariantImages(files: File[]) {
    const uploaded = await uploadFiles(files);
    setEditImages((current) => Array.from(new Set([...current, ...uploaded.map((file) => file.url)])).slice(0, 6));
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-3 mb-2 text-muted-foreground">
            <Link href={`/product-templates/${productId}`}><ArrowLeft /> Back to template</Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">Variants</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage the sellable combinations for {productName}.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}><Plus /> Create combinations</Button>
      </div>

      <form className="relative max-w-md" method="get">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input name="search" defaultValue={search} placeholder="Search name or SKU..." className="pl-9" />
      </form>

      {variants.length ? (
        <div className="overflow-hidden rounded-xl border bg-card">
          {variants.map((variant, index) => (
            <div key={variant.id} className={`grid gap-4 p-4 sm:grid-cols-[56px_minmax(0,1fr)_auto] sm:items-center ${index ? "border-t" : ""}`}>
              <div className="relative h-14 w-14 overflow-hidden rounded-lg border bg-muted">
                {variant.images[0] ? (
                  <Image unoptimized fill src={resolvePublicAssetUrl(variant.images[0].url)} alt="" className="object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground"><ImageIcon className="h-5 w-5" /></div>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-medium">{variant.name || "Unnamed variant"}</p>
                  {variant.productCount > 0 ? <Badge variant="secondary">Used by {variant.productCount} partner product{variant.productCount === 1 ? "" : "s"}</Badge> : null}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{variant.sku || "No SKU"}</p>
                {variant.description ? <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{variant.description}</p> : null}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {variant.tags.map((tag) => <Badge key={tag.id} variant="outline">{tag.value}</Badge>)}
                </div>
              </div>
              <div className="flex gap-2 sm:justify-end">
                <Button type="button" variant="outline" size="sm" onClick={() => beginEdit(variant)}><Pencil /> Edit</Button>
                <Button type="button" variant="ghost" size="icon" disabled={variant.productCount > 0} onClick={() => setDeleting(variant)} aria-label="Delete variant"><Trash2 /></Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card className="border-dashed"><CardContent className="flex min-h-64 flex-col items-center justify-center text-center">
          <div className="mb-4 rounded-xl border bg-muted p-3"><Layers3 className="h-5 w-5" /></div>
          <h2 className="font-medium">{search ? "No matching variants" : "No variants yet"}</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">{search ? "Try another name or SKU." : "Create combinations from option groups such as size and color."}</p>
        </CardContent></Card>
      )}

      {total > limit ? (
        <div className="flex flex-col gap-3 border-t pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>{total} variants</span>
          <div className="flex items-center gap-2">
            {page > 1 ? <Button asChild variant="outline" size="sm"><Link href={`?search=${encodeURIComponent(search)}&page=${page - 1}`}>Previous</Link></Button> : <Button variant="outline" size="sm" disabled>Previous</Button>}
            <span>Page {page} of {pageCount}</span>
            {page < pageCount ? <Button asChild variant="outline" size="sm"><Link href={`?search=${encodeURIComponent(search)}&page=${page + 1}`}>Next</Link></Button> : <Button variant="outline" size="sm" disabled>Next</Button>}
          </div>
        </div>
      ) : null}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create variant combinations</DialogTitle><DialogDescription>Enter comma-separated values for each option group. Groups are combined automatically.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            {dimensions.map((dimension, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between"><Label htmlFor={`dimension-${index}`}>Option group {index + 1}</Label>{dimensions.length > 1 ? <Button type="button" size="icon" variant="ghost" onClick={() => setDimensions((rows) => rows.filter((_, rowIndex) => rowIndex !== index))}><X /></Button> : null}</div>
                <Input id={`dimension-${index}`} value={dimension} onChange={(event) => setDimensions((rows) => rows.map((row, rowIndex) => rowIndex === index ? event.target.value : row))} placeholder={index === 0 ? "20ml, 25ml" : "Red, Blue"} />
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setDimensions((rows) => [...rows, ""])}><Plus /> Add option group</Button>
            <div className="rounded-lg border bg-muted/40 p-3 text-sm"><strong>{combinationCount}</strong> combination{combinationCount === 1 ? "" : "s"} will be generated.</div>
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button type="button" disabled={isPending || !combinationCount || combinationCount > 100} onClick={() => run(() => createVariantCombinations(productId, validDimensions), "Variants created", () => { setCreateOpen(false); setDimensions([""]); })}>{isPending && <Loader2 className="animate-spin" />} Create {combinationCount}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Edit variant</DialogTitle><DialogDescription>Update its catalog identity and optional variant-specific images.</DialogDescription></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="variant-name">Name</Label><Input id="variant-name" value={editName} onChange={(event) => setEditName(event.target.value)} placeholder="Optional when tags are provided" /></div>
            <div className="space-y-2"><Label htmlFor="variant-sku">SKU</Label><Input id="variant-sku" value={editSku} onChange={(event) => setEditSku(event.target.value)} /></div>
          </div>
          <div className="space-y-2"><Label htmlFor="variant-tags">Tags</Label><Input id="variant-tags" value={editTags} onChange={(event) => setEditTags(event.target.value)} placeholder="20ml, Red" /><p className="text-xs text-muted-foreground">A variant must have a name or at least one comma-separated tag.</p></div>
          <div className="space-y-2"><Label htmlFor="variant-description">Description</Label><Textarea id="variant-description" value={editDescription} onChange={(event) => setEditDescription(event.target.value)} placeholder="Optional details specific to this variant" /></div>
          <div className="space-y-3"><Label>Images</Label><FileUploader multiple maxFiles={6} maxSize={10 * 1024 * 1024} progresses={progresses} onUpload={uploadVariantImages} disabled={isUploading} />
            {editImages.length ? <div className="grid grid-cols-3 gap-3">{editImages.map((url) => <div key={url} className="relative aspect-square overflow-hidden rounded-lg border"><Image unoptimized fill src={resolvePublicAssetUrl(url)} alt="" className="object-cover" /><Button type="button" variant="secondary" size="icon" className="absolute right-1 top-1 h-7 w-7" onClick={() => setEditImages((images) => images.filter((image) => image !== url))}><X /></Button></div>)}</div> : null}
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button type="button" disabled={isPending || isUploading || (!editName.trim() && !editTags.split(",").some((tag) => tag.trim()))} onClick={() => editing && run(() => updateVariantItem(productId, Number(editing.id), { name: editName, description: editDescription, sku: editSku, tags: editTags.split(","), images: editImages }), "Variant updated", () => setEditing(null))}>{(isPending || isUploading) && <Loader2 className="animate-spin" />} Save changes</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent><DialogHeader><DialogTitle>Delete this variant?</DialogTitle><DialogDescription>This removes the variant and its images. Variants already used by a partner cannot be deleted.</DialogDescription></DialogHeader><DialogFooter><Button type="button" variant="outline" onClick={() => setDeleting(null)}>Cancel</Button><Button type="button" variant="destructive" disabled={isPending} onClick={() => deleting && run(() => deleteVariantItem(productId, Number(deleting.id)), "Variant deleted", () => setDeleting(null))}>{isPending && <Loader2 className="animate-spin" />} Delete variant</Button></DialogFooter></DialogContent>
      </Dialog>
    </div>
  );
}
