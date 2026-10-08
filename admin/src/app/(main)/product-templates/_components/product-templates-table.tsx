"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { ArrowRight, Check, Combine, Loader2, TriangleAlert, X } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/table/data-table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { getTemplateForMerge, mergeProductTemplates, type MergeTemplate } from "../actions";
import { Item } from "../_constant";
import { columns } from "./tables/columns";

type Props = { data: Item[]; totalItems: number };
type Step = "choose" | "confirm";

function variantName(variant: MergeTemplate["variants"][number]) {
  return (variant.name?.trim() || variant.name_ar?.trim() || "Standard").toLocaleLowerCase();
}

function summary(template: MergeTemplate) {
  return {
    variants: template.variants.length,
    partnerListings: template.variants.reduce((count, variant) => count + variant.products.length, 0),
  };
}

export default function ProductTemplatesTable({ data, totalItems }: Props) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [merging, setMerging] = useState(false);
  const [step, setStep] = useState<Step>("choose");
  const [templates, setTemplates] = useState<MergeTemplate[]>([]);
  const [targetId, setTargetId] = useState<number | null>(null);

  const pageKey = data.map((item) => item.id).join(",");
  useEffect(() => setSelectedIds([]), [pageKey]);

  const selectedItems = useMemo(() => data.filter((item) => selectedIds.includes(item.id)), [data, selectedIds]);
  const selectedCategoryIds = new Set(selectedItems.map((item) => item.category_id ?? ""));
  const mixedCategories = selectedCategoryIds.size > 1;
  const selectedOnPage = data.filter((item) => selectedIds.includes(item.id)).length;
  const allVisibleSelected = data.length > 0 && data.every((item) => selectedIds.includes(item.id));
  const mergeTarget = templates.find((template) => template.id === targetId) ?? null;
  const sourceTemplates = templates.filter((template) => template.id !== targetId);
  const combined = templates.reduce((total, template) => {
    const counts = summary(template);
    return { variants: total.variants + counts.variants, listings: total.listings + counts.partnerListings };
  }, { variants: 0, listings: 0 });
  const brands = [...new Set(templates.map((template) => template.brand?.name).filter((name): name is string => Boolean(name)))];
  const variantNames = templates.flatMap((template) => template.variants.map(variantName));
  const nameCounts = variantNames.reduce((counts, name) => counts.set(name, (counts.get(name) ?? 0) + 1), new Map<string, number>());
  const duplicateVariantNames = [...nameCounts.values()].reduce((count, occurrences) => count + Math.max(0, occurrences - 1), 0);

  const toggleRow = (id: string, checked: boolean) => {
    setSelectedIds((current) => checked
      ? current.includes(id) ? current : [...current, id]
      : current.filter((selectedId) => selectedId !== id));
  };

  const togglePage = (checked: boolean) => {
    setSelectedIds((current) => checked
      ? [...new Set([...current, ...data.map((item) => item.id)])]
      : current.filter((id) => !data.some((item) => item.id === id)));
  };

  const closeMerge = () => {
    if (merging || loadingDetails) return;
    setMergeOpen(false);
    setStep("choose");
    setTargetId(null);
    setTemplates([]);
  };

  const beginMerge = async () => {
    if (selectedItems.length < 2 || mixedCategories) return;
    setTargetId(null);
    setStep("choose");
    setTemplates([]);
    setMergeOpen(true);
    setLoadingDetails(true);
    try {
      const details = await Promise.all(selectedItems.map((item) => getTemplateForMerge(Number(item.id))));
      if (details.some((template) => !template)) throw new Error("One or more selected templates no longer exist. Refresh the page.");
      const selectedTemplates = details as MergeTemplate[];
      if (new Set(selectedTemplates.map((template) => template.category_id)).size > 1) {
        throw new Error("The selection spans categories. Select templates from one category only.");
      }
      setTemplates(selectedTemplates);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load the merge preview.");
      setMergeOpen(false);
    } finally {
      setLoadingDetails(false);
    }
  };

  const confirmMerge = async () => {
    if (!targetId) return;
    setMerging(true);
    const result = await mergeProductTemplates(targetId, sourceTemplates.map((template) => template.id));
    setMerging(false);
    if (!result.ok) {
      toast.error(result.message);
      setStep("choose");
      return;
    }
    toast.success(`${sourceTemplates.length} template${sourceTemplates.length === 1 ? "" : "s"} merged into ${result.name}.`);
    setSelectedIds([]);
    setMergeOpen(false);
    router.refresh();
  };

  const selectionColumn: ColumnDef<Item> = {
    id: "select",
    header: () => <Checkbox checked={selectedOnPage > 0 && !allVisibleSelected ? "indeterminate" : allVisibleSelected} onCheckedChange={(checked) => togglePage(checked === true)} aria-label="Select all templates on this page" />,
    cell: ({ row }) => <Checkbox checked={selectedIds.includes(row.original.id)} onCheckedChange={(checked) => toggleRow(row.original.id, checked === true)} aria-label={`Select ${row.original.name}`} />,
    size: 44,
    minSize: 44,
    maxSize: 44,
    enableResizing: false,
  };

  return <div className="space-y-4">
    {selectedIds.length > 0 && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2 text-sm"><Badge variant="secondary" className="rounded-full">{selectedIds.length} selected</Badge><span className="text-muted-foreground">Selection applies to this page only.</span></div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedIds([])} className="gap-1.5"><X className="h-4 w-4" /> Clear</Button>
        <Button type="button" disabled={selectedItems.length < 2 || mixedCategories} onClick={() => void beginMerge()} className="gap-2"><Combine className="h-4 w-4" /> Merge templates</Button>
      </div>
      {mixedCategories && <p className="basis-full text-xs text-amber-700">Choose templates from one category to merge them.</p>}
      {selectedItems.length === 1 && <p className="basis-full text-xs text-muted-foreground">Select at least one more template to enable merging.</p>}
    </div>}

    <DataTable columns={[selectionColumn, ...columns]} data={data} totalItems={totalItems} />

    <Dialog open={mergeOpen} onOpenChange={(open) => !open && closeMerge()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        {loadingDetails ? <div className="flex min-h-52 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Preparing merge preview…</div> : <>
          <DialogHeader>
            <DialogTitle>{step === "choose" ? "Choose the template to keep" : "Review template merge"}</DialogTitle>
            <DialogDescription>{step === "choose" ? "All other selected templates will be removed after their variants and references are moved." : "Confirm which template remains and what will be preserved."}</DialogDescription>
          </DialogHeader>

          {step === "choose" ? <div className="space-y-2">
            {templates.map((template) => {
              const counts = summary(template);
              const chosen = targetId === template.id;
              return <button key={template.id} type="button" aria-pressed={chosen} onClick={() => setTargetId(template.id)} className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 ${chosen ? "border-primary bg-primary/5" : ""}`}>
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${chosen ? "border-primary bg-primary text-primary-foreground" : "border-input"}`}>{chosen && <Check className="h-3 w-3" />}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{template.name}</span><span className="mt-0.5 block text-xs text-muted-foreground">{template.category?.name ?? "Category"} · {template.brand?.name ?? "No brand"} · {counts.variants} variants · {counts.partnerListings} partner listings</span></span>
                {chosen && <Badge variant="secondary">Keep</Badge>}
              </button>;
            })}
          </div> : mergeTarget ? <div className="space-y-4">
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">Template that will remain</p>
              <p className="mt-1 font-medium">{mergeTarget.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{mergeTarget.category?.name ?? "Category"} · {mergeTarget.brand?.name ?? "No brand"}</p>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Templates being merged</p>
              <div className="divide-y rounded-lg border">{sourceTemplates.map((template) => <div key={template.id} className="flex items-center justify-between gap-3 p-3 text-sm"><span className="truncate">{template.name}</span><span className="shrink-0 text-xs text-muted-foreground">{summary(template).variants} variants · {summary(template).partnerListings} listings</span></div>)}</div>
            </div>
            <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/50 p-3 sm:grid-cols-3">
              <Summary label="Variants preserved" value={combined.variants} />
              <Summary label="Partner listings preserved" value={combined.listings} />
              <Summary label="Source templates removed" value={sourceTemplates.length} />
            </div>
            {brands.length > 1 && <Warning>{`Selected templates have different brands (${brands.join(", ")}). The kept template's brand will remain.`}</Warning>}
            {duplicateVariantNames > 0 && <Warning>{`${duplicateVariantNames} variant name overlap${duplicateVariantNames === 1 ? "" : "s"}. These variants remain separate; stock and history will not be combined.`}</Warning>}
            <p className="text-xs text-muted-foreground">Template images are combined. Variant IDs, barcodes, SKUs, images, tags, stock and order history stay with their existing variants. The operation is recorded in the audit log.</p>
          </div> : null}

          <DialogFooter>
            <Button type="button" variant="outline" disabled={merging} onClick={step === "choose" ? closeMerge : () => setStep("choose")}>{step === "choose" ? "Cancel" : "Back"}</Button>
            {step === "choose" ? <Button type="button" disabled={!targetId || loadingDetails} onClick={() => setStep("confirm")} className="gap-2">Review merge <ArrowRight className="h-4 w-4" /></Button> : <Button type="button" disabled={merging || !targetId} onClick={() => void confirmMerge()}>{merging && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{merging ? "Merging…" : "Confirm merge"}</Button>}
          </DialogFooter>
        </>}
      </DialogContent>
    </Dialog>
  </div>;
}

function Summary({ label, value }: { label: string; value: number }) {
  return <div><p className="text-lg font-semibold tabular-nums">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>;
}

function Warning({ children }: { children: React.ReactNode }) {
  return <p className="flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs leading-relaxed"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />{children}</p>;
}
