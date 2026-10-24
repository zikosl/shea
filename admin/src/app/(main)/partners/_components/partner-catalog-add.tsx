'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Grid2X2, Layers2, Loader2, Plus, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { addPartnerCatalogProducts, getPartnerCatalogFilters, searchPartnerCatalogTemplates, type CatalogTemplate, type PartnerCatalogFilters } from '../catalog-actions';

const PAGE_SIZE = 20;
type PickedVariant = { template: CatalogTemplate; variantId: number; price: string };

export default function PartnerCatalogAdd({ partnerId, partnerRouteId, partnerName }: { partnerId: number; partnerRouteId: string; partnerName: string }) {
  const router = useRouter();
  const [filters, setFilters] = useState<PartnerCatalogFilters>({ niches: [], categories: [], brands: [] });
  const [filtersLoading, setFiltersLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [nicheId, setNicheId] = useState('all');
  const [categoryId, setCategoryId] = useState('all');
  const [brandId, setBrandId] = useState('all');
  const [view, setView] = useState<'grouped' | 'flat'>('grouped');
  const [page, setPage] = useState(1);
  const [templates, setTemplates] = useState<CatalogTemplate[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<Record<number, PickedVariant>>({});
  const [step, setStep] = useState<'browse' | 'review'>('browse');
  const [bulkPrice, setBulkPrice] = useState('');
  const [busy, startTransition] = useTransition();
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const requestId = useRef(0);

  useEffect(() => {
    let active = true;
    getPartnerCatalogFilters().then((result) => { if (active) setFilters(result); })
      .catch((error) => { if (active) toast.error(error instanceof Error ? error.message : 'Could not load catalog filters.'); })
      .finally(() => { if (active) setFiltersLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const request = ++requestId.current;
    let active = true;
    const timer = window.setTimeout(async () => {
      try {
        const result = await searchPartnerCatalogTemplates(search, partnerId, page, PAGE_SIZE, {
          nicheId: nicheId === 'all' ? undefined : Number(nicheId),
          categoryId: categoryId === 'all' ? undefined : Number(categoryId),
          brandId: brandId === 'all' ? undefined : Number(brandId),
        });
        if (active && request === requestId.current) {
          setTemplates(result.productTemplates);
          setTotal(result.totalProductTemplates);
        }
      } catch (error) {
        if (active && request === requestId.current) toast.error(error instanceof Error ? error.message : 'Could not load the shared catalog.');
      } finally {
        if (active && request === requestId.current) setLoading(false);
      }
    }, 120);
    return () => { active = false; window.clearTimeout(timer); };
  }, [brandId, categoryId, nicheId, page, partnerId, search]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const selectedValues = Object.values(picked);
  const visibleCategories = useMemo(() => filters.categories.filter((item) => nicheId === 'all' || String(item.niche_id) === nicheId), [filters.categories, nicheId]);
  const visibleBrands = useMemo(() => filters.brands.filter((item) => nicheId === 'all' || String(item.niche_id) === nicheId), [filters.brands, nicheId]);
  const flatVariants = useMemo(() => templates.flatMap((template) => template.variants.map((variant) => ({ template, variant }))), [templates]);

  function updateFilters(update: () => void) { setLoading(true); update(); setPage(1); }

  function toggleVariant(template: CatalogTemplate, variantId: number, checked: boolean) {
    setPicked((current) => {
      const next = { ...current };
      if (checked) next[variantId] = { template, variantId, price: next[variantId]?.price ?? '' };
      else delete next[variantId];
      return next;
    });
  }

  function setVariantPrice(variantId: number, price: string) {
    setPicked((current) => ({ ...current, [variantId]: { ...current[variantId], price } }));
  }

  function applyBulkPrice() {
    const price = Number(bulkPrice);
    if (!bulkPrice || !Number.isFinite(price) || price < 0) return toast.error('Enter a valid non-negative price.');
    setPicked((current) => Object.fromEntries(Object.entries(current).map(([id, item]) => [id, { ...item, price: bulkPrice }])));
    setBulkPrice('');
  }

  function confirmAdd() {
    const items = selectedValues.map(({ variantId, price }) => ({ variantId, price: Number(price) }));
    if (!items.length || items.some((item) => !Number.isFinite(item.price) || item.price < 0 || picked[item.variantId].price.trim() === '')) {
      return toast.error('Enter a valid price for every selected variant.');
    }
    startTransition(async () => {
      try {
        const count = await addPartnerCatalogProducts(partnerId, items);
        toast.success(count ? `${count} product${count === 1 ? '' : 's'} added to ${partnerName}.` : 'All selected variants are already listed.');
        router.push(`/partners/${partnerRouteId}/products`);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not add products.');
      }
    });
  }

  function variantRow(template: CatalogTemplate, variant: CatalogTemplate['variants'][number]) {
    const checked = Boolean(picked[variant.id]);
    const label = [variant.name, variant.name_ar].filter(Boolean).join(' · ') || 'Standard';
    return <div key={variant.id} className="flex items-center gap-3 border-t py-2.5">
      <div className="h-11 w-11 shrink-0 rounded-md bg-muted bg-contain bg-center bg-no-repeat" style={variant.image ? { backgroundImage: `url(${JSON.stringify(variant.image).slice(1, -1)})` } : undefined} />
      <Checkbox checked={checked} disabled={variant.alreadyAdded} onCheckedChange={(value) => toggleVariant(template, variant.id, value === true)} aria-label={`Select ${template.name} ${label}`} />
      <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{label}</p><p className="truncate text-xs text-muted-foreground">{variant.sku || variant.barcode || `Variant #${variant.id}`}</p></div>
      {variant.alreadyAdded ? <Badge variant="secondary">Already added</Badge> : variant.previouslyRemoved ? <Badge variant="outline">Removed · restorable</Badge> : null}
      {checked && <span className="text-xs text-primary">Selected</span>}
    </div>;
  }

  return <main className="flex-1 space-y-5">
    <Button variant="ghost" className="-ml-3" onClick={() => router.push(`/partners/${partnerRouteId}/products`)}><ArrowLeft /> Back to products</Button>
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-sm text-muted-foreground">{partnerName}</p><h1 className="text-2xl font-semibold tracking-tight">Add products</h1><p className="mt-1 text-sm text-muted-foreground">Choose shared catalog variants, then review partner prices before adding.</p></div>
      <div className="flex items-center gap-2 text-sm"><Badge variant={step === 'browse' ? 'default' : 'secondary'}>1 Browse</Badge><span className="text-muted-foreground">→</span><Badge variant={step === 'review' ? 'default' : 'secondary'}>2 Review & confirm</Badge></div>
    </header>

    {step === 'browse' ? <>
      <section className="space-y-3 rounded-xl border bg-card p-4">
        <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={searchInput} onChange={(event) => updateFilters(() => setSearchInput(event.target.value))} placeholder="Search product or variant name" className="pl-9" /></div>
        <div className="grid gap-2 sm:grid-cols-3">
          <Select value={nicheId} onValueChange={(value) => updateFilters(() => { setNicheId(value); setCategoryId('all'); setBrandId('all'); })}>
            <SelectTrigger aria-label="Filter by niche"><SelectValue placeholder="All niches" /></SelectTrigger><SelectContent><SelectItem value="all">All niches</SelectItem>{filters.niches.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={categoryId} onValueChange={(value) => updateFilters(() => setCategoryId(value))}>
            <SelectTrigger aria-label="Filter by category"><SelectValue placeholder="All categories" /></SelectTrigger><SelectContent><SelectItem value="all">All categories</SelectItem>{visibleCategories.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={brandId} onValueChange={(value) => updateFilters(() => setBrandId(value))}>
            <SelectTrigger aria-label="Filter by brand"><SelectValue placeholder="All brands" /></SelectTrigger><SelectContent><SelectItem value="all">All brands</SelectItem>{visibleBrands.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
          <div className="flex items-center gap-2"><span className="text-sm text-muted-foreground">View</span><Button size="sm" variant={view === 'grouped' ? 'secondary' : 'ghost'} onClick={() => setView('grouped')}><Layers2 /> Grouped</Button><Button size="sm" variant={view === 'flat' ? 'secondary' : 'ghost'} onClick={() => setView('flat')}><Grid2X2 /> All variants</Button></div>
          <span className="text-sm text-muted-foreground">{total} products · {selectedValues.length} selected{filtersLoading ? ' · loading filters' : ''}</span>
        </div>
      </section>

      <section className="space-y-3">
        {loading ? <div className="flex min-h-44 items-center justify-center rounded-xl border text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading shared catalog…</div>
          : templates.length === 0 ? <div className="rounded-xl border py-14 text-center text-sm text-muted-foreground">No products match these filters.</div>
            : view === 'grouped' ? templates.map((template) => {
              const isExpanded = expanded[template.id] ?? true;
              const selectableCount = template.variants.filter((item) => !item.alreadyAdded).length;
              return <article key={template.id} className="rounded-xl border bg-card px-4">
                <div className="flex items-center gap-3 py-3">
                  <div className="h-12 w-12 shrink-0 rounded-lg bg-muted bg-contain bg-center bg-no-repeat" style={template.image ? { backgroundImage: `url(${JSON.stringify(template.image).slice(1, -1)})` } : undefined} />
                  <div className="min-w-0 flex-1"><h2 className="truncate font-medium">{template.name}</h2><p className="text-xs text-muted-foreground">{template.variants.length} variants · {selectableCount} available to add</p></div>
                  <Button variant="ghost" size="sm" onClick={() => setExpanded((current) => ({ ...current, [template.id]: !isExpanded }))}>{isExpanded ? 'Collapse' : 'Show variants'}{isExpanded ? <ChevronUp /> : <ChevronDown />}</Button>
                </div>
                {isExpanded && <div className="pb-1">{template.variants.map((variant) => variantRow(template, variant))}</div>}
              </article>;
            }) : <div className="overflow-hidden rounded-xl border bg-card px-4">{flatVariants.map(({ template, variant }) => <div key={variant.id} className="flex items-center gap-3 border-b last:border-0">
              <div className="h-11 w-11 shrink-0 rounded-md bg-muted bg-contain bg-center bg-no-repeat" style={(variant.image || template.image) ? { backgroundImage: `url(${JSON.stringify(variant.image || template.image).slice(1, -1)})` } : undefined} />
              <Checkbox checked={Boolean(picked[variant.id])} disabled={variant.alreadyAdded} onCheckedChange={(value) => toggleVariant(template, variant.id, value === true)} aria-label={`Select ${template.name} ${variant.name || ''}`} />
              <div className="min-w-0 flex-1 py-2"><p className="truncate text-sm font-medium">{template.name} <span className="font-normal text-muted-foreground">· {variant.name || variant.name_ar || 'Standard'}</span></p><p className="truncate text-xs text-muted-foreground">{variant.sku || variant.barcode || `Variant #${variant.id}`}</p></div>
              {variant.alreadyAdded ? <Badge variant="secondary">Already added</Badge> : variant.previouslyRemoved ? <Badge variant="outline">Removed · restorable</Badge> : null}
            </div>)}</div>}
        <div className="flex items-center justify-between text-sm text-muted-foreground"><span>Page {page} of {pageCount}</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={page <= 1 || loading} onClick={() => { setLoading(true); setPage((value) => value - 1); }}><ChevronLeft /> Previous</Button><Button size="sm" variant="outline" disabled={page >= pageCount || loading} onClick={() => { setLoading(true); setPage((value) => value + 1); }}>Next <ChevronRight /></Button></div></div>
      </section>
      <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur">
        <div><p className="font-medium">{selectedValues.length} variants selected</p><p className="text-xs text-muted-foreground">Selections stay with you across filters and pages.</p></div>
        <Button onClick={() => setStep('review')} disabled={selectedValues.length === 0}><Check /> Review selection</Button>
      </div>
    </> : <>
      <section className="space-y-4 rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Review partner prices</h2><p className="text-sm text-muted-foreground">Prices are specific to this partner. No shared catalog prices will change.</p></div><div className="flex items-center gap-2"><Input aria-label="Apply one price to all selected variants" type="number" min="0" step="0.01" value={bulkPrice} onChange={(event) => setBulkPrice(event.target.value)} placeholder="Bulk price" className="w-36"/><Button variant="outline" onClick={applyBulkPrice}>Apply to all</Button></div></div>
        <div className="divide-y rounded-lg border">
          {selectedValues.map(({ template, variantId, price }) => {
            const variant = template.variants.find((item) => item.id === variantId)!;
            return <div key={variantId} className="flex flex-wrap items-center gap-3 p-3">
              <div className="h-12 w-12 shrink-0 rounded-md bg-muted bg-contain bg-center bg-no-repeat" style={(variant.image || template.image) ? { backgroundImage: `url(${JSON.stringify(variant.image || template.image).slice(1, -1)})` } : undefined} />
              <div className="min-w-40 flex-1"><p className="font-medium">{template.name}</p><p className="text-sm text-muted-foreground">{variant.name || variant.name_ar || 'Standard'}</p>{variant.previouslyRemoved && <Badge variant="outline" className="mt-1">Will restore listing</Badge>}</div>
              <label className="w-full text-xs text-muted-foreground sm:w-auto">Selling price<Input aria-label={`Selling price for ${template.name} ${variant.name || ''}`} type="number" min="0" step="0.01" value={price} onChange={(event) => setVariantPrice(variantId, event.target.value)} placeholder="Required" className="mt-1 w-full sm:w-40" /></label>
              <Button variant="ghost" size="sm" onClick={() => toggleVariant(template, variantId, false)}>Remove</Button>
            </div>;
          })}
        </div>
      </section>
      <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur">
        <Button variant="outline" onClick={() => setStep('browse')}><ArrowLeft /> Back to catalog</Button>
        <div className="flex items-center gap-3"><span className="hidden text-sm text-muted-foreground sm:inline">{selectedValues.length} variants</span><Button onClick={confirmAdd} disabled={busy || selectedValues.length === 0}>{busy ? <Loader2 className="animate-spin" /> : <Plus />} Confirm and add</Button></div>
      </div>
    </>}
  </main>;
}
