"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Check, Combine, Loader2, Plus, Search, Store, TriangleAlert, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import { MergeTemplate, mergeProductTemplates, searchTemplateMergeCandidates } from "../../actions";

type Props = { target: MergeTemplate };

function variantLabel(variant: MergeTemplate["variants"][number]) {
  return variant.name?.trim() || variant.name_ar?.trim() || "Standard";
}

function templateCounts(template: MergeTemplate) {
  return {
    variants: template.variants.length,
    listings: template.variants.reduce((total, variant) => total + variant.products.length, 0),
  };
}

export default function MergeTemplatesManager({ target }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<MergeTemplate[]>([]);
  const [selected, setSelected] = useState<MergeTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [merging, setMerging] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    const query = search.trim();
    const currentRequest = ++requestId.current;
    if (query.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const matches = await searchTemplateMergeCandidates(target.id, target.category_id ?? null, query);
        if (currentRequest === requestId.current) setResults(matches);
      } catch {
        if (currentRequest === requestId.current) {
          setResults([]);
          toast.error("Could not search templates. Try again.");
        }
      } finally {
        if (currentRequest === requestId.current) setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [search, target.category_id, target.id]);

  const selectedIds = useMemo(() => new Set(selected.map((template) => template.id)), [selected]);
  const allTemplates = [target, ...selected];
  const totals = allTemplates.reduce((sum, template) => {
    const count = templateCounts(template);
    return { variants: sum.variants + count.variants, listings: sum.listings + count.listings };
  }, { variants: 0, listings: 0 });
  const brandNames = [...new Set(allTemplates.map((template) => template.brand?.name).filter(Boolean))];
  const variantNameCounts = allTemplates.flatMap((template) => template.variants)
    .reduce((counts, variant) => counts.set(variantLabel(variant).toLocaleLowerCase(), (counts.get(variantLabel(variant).toLocaleLowerCase()) ?? 0) + 1), new Map<string, number>());
  const duplicateVariantCount = [...variantNameCounts.values()].reduce((count, occurrences) => count + Math.max(0, occurrences - 1), 0);

  const toggleTemplate = (template: MergeTemplate) => {
    if (!selectedIds.has(template.id) && selected.length >= 50) {
      toast.error("You can merge up to 50 templates at a time.");
      return;
    }
    setSelected((current) => current.some((item) => item.id === template.id)
      ? current.filter((item) => item.id !== template.id)
      : [...current, template]);
  };

  const confirmMerge = async () => {
    setMerging(true);
    const result = await mergeProductTemplates(target.id, selected.map((template) => template.id));
    setMerging(false);
    if (!result.ok) {
      toast.error(result.message);
      setConfirmOpen(false);
      return;
    }
    toast.success(`${selected.length} duplicate template${selected.length === 1 ? "" : "s"} merged.`);
    router.replace(`/product-templates/${target.id}/variants`);
    router.refresh();
  };

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Button variant="ghost" size="sm" className="mb-2 -ml-2 gap-2" onClick={() => router.push("/product-templates")}>
            <ArrowLeft className="h-4 w-4" /> Product templates
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">Merge duplicate templates</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Keep one template as the canonical product and move the other templates&apos; variants into it.
          </p>
        </div>
        <Badge variant="outline" className="gap-1.5 rounded-full px-3 py-1">
          <Combine className="h-3.5 w-3.5" /> {selected.length} selected
        </Badge>
      </div>

      <section className="rounded-xl border bg-card p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">1</span>
          <h2 className="font-medium">Template to keep</h2>
          <span className="text-xs text-muted-foreground">Canonical name, category and brand remain unchanged</span>
        </div>
        <TemplateCard template={target} isTarget />
      </section>

      <section className="rounded-xl border bg-card p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold">2</span>
          <h2 className="font-medium">Find duplicate templates</h2>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by product name..." className="h-11 pl-9 pr-10" />
          {search && <button type="button" aria-label="Clear search" onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Only templates in {target.category?.name ?? "the same category"} can be merged. Existing variants and partner listings stay attached to their IDs.</p>

        {loading && <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Searching catalog…</div>}
        {!loading && search.trim().length >= 2 && results.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No other templates found in this category.</p>}
        {!loading && results.length > 0 && <div className="mt-3 divide-y rounded-lg border">
          {results.map((template) => {
            const isSelected = selectedIds.has(template.id);
            return (
              <button key={template.id} type="button" aria-pressed={isSelected} onClick={() => toggleTemplate(template)} className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted/50">
                <span aria-hidden="true" className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border ${isSelected ? "border-primary bg-primary text-primary-foreground" : "border-input"}`}>
                  {isSelected && <Check className="h-3 w-3" />}
                </span>
                <TemplateThumb template={template} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{template.name}</span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">{template.brand?.name ?? "No brand"} · {template.variants.length} variants · {templateCounts(template).listings} partner listings</span>
                </span>
                <span className="text-muted-foreground">{isSelected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}</span>
              </button>
            );
          })}
        </div>}
        {search.trim().length < 2 && <p className="py-6 text-center text-sm text-muted-foreground">Enter at least 2 characters to search.</p>}
      </section>

      {selected.length > 0 && <section className="rounded-xl border bg-card p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-medium">Review merge</h2>
            <p className="text-xs text-muted-foreground">Selected templates become variants under the kept template.</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setSelected([])}>Clear selection</Button>
        </div>
        <div className="space-y-2">
          {selected.map((template) => <div key={template.id} className="flex items-center gap-3 rounded-lg border p-3">
            <TemplateThumb template={template} />
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{template.name}</p><p className="text-xs text-muted-foreground">{template.variants.length} variants · {templateCounts(template).listings} partner listings</p></div>
            <Button variant="ghost" size="icon" aria-label={`Remove ${template.name}`} onClick={() => toggleTemplate(template)}><X className="h-4 w-4" /></Button>
          </div>)}
        </div>

        <div className="mt-4 grid gap-2 rounded-lg bg-muted/50 p-3 text-sm sm:grid-cols-3">
          <Summary label="Combined variants" value={totals.variants} />
          <Summary label="Partner listings kept" value={totals.listings} />
          <Summary label="Templates removed" value={selected.length} />
        </div>
        {brandNames.length > 1 && <Notice>{`Brand differs across selected templates (${brandNames.join(", ")}). The kept template's brand will remain canonical.`}</Notice>}
        {duplicateVariantCount > 0 && <Notice>{`${duplicateVariantCount} variant name overlap${duplicateVariantCount === 1 ? "" : "s"} found. Overlapping variants will remain separate so stock, barcodes and sales history are not combined.`}</Notice>}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p className="max-w-xl text-xs text-muted-foreground">Source template records are removed after their variants, images, and request references are safely moved.</p>
          <Button disabled={selected.length === 0} onClick={() => setConfirmOpen(true)} className="gap-2"><Combine className="h-4 w-4" /> Review and merge</Button>
        </div>
      </section>}

      <Dialog open={confirmOpen} onOpenChange={(open) => !merging && setConfirmOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Merge {selected.length} template{selected.length === 1 ? "" : "s"} into “{target.name}”?</DialogTitle>
            <DialogDescription>This cannot be undone from the catalog. The duplicate template records will be removed, but all {totals.variants} variant records and their partner listings, barcodes, stock and order history will be preserved.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p>Only the kept template&apos;s name, category and brand remain. Variant names and variant images stay with their existing variants.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={merging} onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button disabled={merging} onClick={() => void confirmMerge()}>{merging && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{merging ? "Merging…" : "Confirm merge"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function TemplateThumb({ template }: { template: MergeTemplate }) {
  const image = template.images[0]?.url;
  return image
    ? <img src={image} alt="" className="h-11 w-11 shrink-0 rounded-md border object-cover" />
    : <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border bg-muted text-xs text-muted-foreground">No image</span>;
}

function TemplateCard({ template, isTarget = false }: { template: MergeTemplate; isTarget?: boolean }) {
  const counts = templateCounts(template);
  return <div className="flex items-start gap-3 rounded-lg border p-3 sm:items-center">
    <TemplateThumb template={template} />
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2"><p className="truncate font-medium">{template.name}</p>{isTarget && <Badge variant="secondary" className="rounded-full">Kept</Badge>}</div>
      <p className="mt-1 text-xs text-muted-foreground">{template.category?.name ?? "Uncategorized"} · {template.brand?.name ?? "No brand"}</p>
      <p className="mt-1 text-xs text-muted-foreground">{counts.variants} variants · {counts.listings} partner listings</p>
    </div>
    {isTarget && <Store className="mr-1 mt-1 h-4 w-4 text-muted-foreground" />}
  </div>;
}

function Summary({ label, value }: { label: string; value: number }) {
  return <div><p className="text-lg font-semibold tabular-nums">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>;
}

function Notice({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs leading-relaxed"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />{children}</p>;
}
