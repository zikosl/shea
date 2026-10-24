"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Barcode, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { setCatalogVariantBarcode, type CatalogVariantRow } from "../actions";

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
  const pageCount = Math.max(1, Math.ceil(totalItems / limit));

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
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
      <span>{totalItems} variants · page {page} of {pageCount}</span>
      <span>Barcodes belong to the shared variant and are unique across the catalog.</span>
    </div>
    <Table>
      <TableHeader><TableRow>
        <TableHead>Variant</TableHead><TableHead>Product template</TableHead><TableHead>Category</TableHead><TableHead>SKU</TableHead><TableHead>Barcode</TableHead>
      </TableRow></TableHeader>
      <TableBody>
        {data.length === 0 ? <TableRow><TableCell colSpan={5} className="h-28 text-center text-muted-foreground">No variants match these filters.</TableCell></TableRow> : data.map((variant) => (
          <TableRow key={variant.id}>
            <TableCell><div className="flex min-w-44 items-center gap-3">
              <div className="h-10 w-10 shrink-0 rounded-md bg-muted bg-contain bg-center bg-no-repeat" style={(variant.image || variant.product.images?.[0]?.url) ? { backgroundImage: `url(${JSON.stringify(variant.image || variant.product.images?.[0]?.url).slice(1, -1)})` } : undefined} />
              <div className="min-w-0"><p className="truncate font-medium">{variant.name || variant.name_ar || "Standard"}</p><p className="text-xs text-muted-foreground">Variant #{variant.id}</p></div>
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
