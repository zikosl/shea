"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, ChevronDown, Loader2, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { resolvePublicAssetUrl } from "@/constant";

import { mergeRequest, searchProductTemplateMergeCandidates, type ProductTemplateMergeCandidate } from "./actions";

type RequestVariant = { id: number; name?: string | null; sku?: string | null; image?: string | null; tags?: string[] | null };

export function MergeRequestDialog({ requestId, requestName, categoryId, variants }: {
  requestId: number;
  requestName: string;
  categoryId?: number | null;
  variants: RequestVariant[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [candidates, setCandidates] = useState<ProductTemplateMergeCandidate[]>([]);
  const [selected, setSelected] = useState<ProductTemplateMergeCandidate | null>(null);
  const [mapping, setMapping] = useState<Record<number, string>>({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const requestSequence = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 280);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!open || !categoryId) return;
    const sequence = ++requestSequence.current;
    setLoading(true);
    setError("");
    setPage(1);
    searchProductTemplateMergeCandidates(debouncedSearch, categoryId, 1)
      .then((result) => {
        if (sequence !== requestSequence.current) return;
        setCandidates(result.productTemplates);
        setTotal(result.totalProductTemplates);
      })
      .catch(() => {
        if (sequence === requestSequence.current) setError("Could not load templates. Try searching again.");
      })
      .finally(() => {
        if (sequence === requestSequence.current) setLoading(false);
      });
    return () => { requestSequence.current += 1; };
  }, [categoryId, debouncedSearch, open]);

  const chooseCandidate = (candidate: ProductTemplateMergeCandidate) => {
    setSelected(candidate);
    const next: Record<number, string> = {};
    for (const requestVariant of variants) {
      const bySku = candidate.variants?.find((variant) => requestVariant.sku && variant.sku === requestVariant.sku);
      const byName = candidate.variants?.find((variant) => variant.name?.trim().toLocaleLowerCase() === requestVariant.name?.trim().toLocaleLowerCase());
      const matched = bySku ?? byName ?? (candidate.variants?.length === 1 ? candidate.variants[0] : null);
      if (matched) next[requestVariant.id] = String(matched.id);
    }
    setMapping(next);
  };

  const allMapped = variants.length > 0 && variants.every((variant) => mapping[variant.id]);

  const loadMore = async () => {
    if (!categoryId || loadingMore || candidates.length >= total) return;
    const nextPage = page + 1;
    setLoadingMore(true);
    setError("");
    try {
      const result = await searchProductTemplateMergeCandidates(debouncedSearch, categoryId, nextPage);
      setCandidates((current) => {
        const ids = new Set(current.map((candidate) => candidate.id));
        return [...current, ...result.productTemplates.filter((candidate) => !ids.has(candidate.id))];
      });
      setPage(nextPage);
      setTotal(result.totalProductTemplates);
    } catch {
      setError("Could not load more templates. Try again.");
    } finally {
      setLoadingMore(false);
    }
  };

  const handleMerge = async () => {
    if (!selected || !allMapped) return;
    setSubmitting(true);
    setError("");
    try {
      await mergeRequest(requestId, selected.id, variants.map((variant) => ({ requestVariantId: variant.id, targetVariantId: Number(mapping[variant.id]) })));
      toast.success(`“${requestName}” merged into “${selected.name}”.`);
      setOpen(false);
      router.refresh();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "The product request could not be merged.";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const currentTargetVariants = useMemo(() => selected?.variants ?? [], [selected]);

  return (
    <Dialog open={open} onOpenChange={(value) => {
      setOpen(value);
      if (!value) { setSelected(null); setMapping({}); setError(""); }
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" type="button" className="w-full gap-2" disabled={!categoryId}>
          <Search className="h-4 w-4" /> Merge into existing
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl gap-5">
        <DialogHeader>
          <DialogTitle>Find a matching Shea template</DialogTitle>
          <DialogDescription>Search within this request’s category, choose a template, then map each submitted variant before merging.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search template name..." className="ps-9" />
        </div>
        <div className="max-h-[38vh] min-h-36 space-y-2 overflow-y-auto rounded-lg border p-2" aria-live="polite">
          {loading ? <div className="flex h-32 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Searching catalog…</div> : null}
          {!loading && candidates.length === 0 ? <div className="flex h-32 items-center justify-center text-center text-sm text-muted-foreground">{error || "No approved templates found in this category."}</div> : null}
          {!loading ? candidates.map((candidate) => {
            const imageUrl = resolvePublicAssetUrl(candidate.images?.[0]?.url || candidate.variants?.find((variant) => variant.images?.length)?.images?.[0]?.url);
            const active = selected?.id === candidate.id;
            return (
              <button key={candidate.id} type="button" onClick={() => chooseCandidate(candidate)} className={`flex w-full items-center gap-3 rounded-lg border p-2.5 text-start transition-colors ${active ? "border-primary bg-primary/5" : "border-transparent hover:bg-muted"}`}>
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border bg-muted">
                  {imageUrl ? <Image unoptimized fill src={imageUrl} alt="" className="object-cover" /> : <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">No image</div>}
                </div>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{candidate.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{candidate.name_ar || candidate.brand?.name || candidate.category?.name}</span>
                  <span className="mt-1 flex flex-wrap gap-1">{candidate.variants?.slice(0, 3).map((variant) => <Badge key={variant.id} variant="secondary" className="max-w-36 truncate text-[10px]">{variant.name || variant.sku || `Variant ${variant.id}`}</Badge>)}{(candidate.variants?.length ?? 0) > 3 ? <Badge variant="outline" className="text-[10px]">+{candidate.variants!.length - 3}</Badge> : null}</span>
                </span>
                {active ? <Check className="h-4 w-4 shrink-0 text-primary" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
              </button>
            );
          }) : null}
          {!loading && candidates.length < total ? <Button type="button" variant="ghost" className="w-full" onClick={loadMore} disabled={loadingMore}>{loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Load more</Button> : null}
        </div>
        {selected ? <section className="space-y-3 rounded-lg border p-3">
          <div><p className="text-sm font-semibold">Map variants to {selected.name}</p><p className="text-xs text-muted-foreground">This keeps each request connected to the right existing variant.</p></div>
          <div className="max-h-48 space-y-2 overflow-y-auto">
            {variants.map((variant) => <label key={variant.id} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] sm:items-center">
              <span className="min-w-0 truncate text-sm">{variant.name || "Unnamed variant"}<span className="block truncate text-xs text-muted-foreground">{variant.tags?.join(" · ") || variant.sku || "No tags"}</span></span>
              <select value={mapping[variant.id] ?? ""} onChange={(event) => setMapping((current) => ({ ...current, [variant.id]: event.target.value }))} className="h-10 min-w-0 rounded-md border bg-background px-3 text-sm" aria-label={`Map ${variant.name || "variant"}`}>
                <option value="">Choose a variant…</option>
                {currentTargetVariants.map((targetVariant) => <option key={targetVariant.id} value={targetVariant.id}>{targetVariant.name || targetVariant.sku || `Variant ${targetVariant.id}`}</option>)}
              </select>
            </label>)}
          </div>
        </section> : null}
        {error && candidates.length > 0 ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
          <Button type="button" onClick={handleMerge} disabled={!selected || !allMapped || submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Merge request
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
