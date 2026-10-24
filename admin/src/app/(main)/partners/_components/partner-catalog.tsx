'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Check, ChevronLeft, ChevronRight, Loader2, Plus, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  getPartnerCatalog,
  removePartnerCatalogProducts,
  updatePartnerCatalogProducts,
  type PartnerCatalogProduct,
} from '../catalog-actions';

const PAGE_SIZE = 20;

export default function PartnerCatalog({ partnerId, partnerRouteId }: { partnerId: number; partnerRouteId: string }) {
  const [rows, setRows] = useState<PartnerCatalogProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selected, setSelected] = useState<number[]>([]);
  const [draftPrices, setDraftPrices] = useState<Record<number, string>>({});
  const [busy, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [bulkPrice, setBulkPrice] = useState('');
  const requestVersion = useRef(0);

  const refresh = useCallback(async (nextPage = page, nextSearch = search) => {
    const version = ++requestVersion.current;
    setLoading(true);
    try {
      const result = await getPartnerCatalog(partnerId, nextSearch, nextPage, PAGE_SIZE);
      if (version !== requestVersion.current) return;
      setRows(result.products);
      setTotal(result.totalProducts);
      setDraftPrices(Object.fromEntries(result.products.map((product) => [product.id, String(product.price)])));
    } catch (error) {
      if (version === requestVersion.current) toast.error(error instanceof Error ? error.message : 'Could not load this partner catalog.');
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [partnerId, page, search]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh(page, search); }, 180);
    return () => window.clearTimeout(timer);
  }, [refresh, page, search]);

  useEffect(() => {
    const timer = window.setTimeout(() => { setSearch(searchInput); setPage(1); }, 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const pageIds = useMemo(() => rows.map((row) => row.id), [rows]);
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function togglePage(checked: boolean) {
    setSelected((current) => checked
      ? [...new Set([...current, ...pageIds])]
      : current.filter((id) => !pageIds.includes(id)));
  }

  function toggleRow(id: number, checked: boolean) {
    setSelected((current) => checked ? [...new Set([...current, id])] : current.filter((item) => item !== id));
  }

  function saveUpdates(updates: Array<{ id: number; price?: number; available?: boolean }>, success: string, clearSelection = false) {
    startTransition(async () => {
      try {
        await updatePartnerCatalogProducts(partnerId, updates);
        toast.success(success);
        if (clearSelection) setSelected([]);
        await refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not update products.');
      }
    });
  }

  function saveRowPrice(row: PartnerCatalogProduct) {
    const price = Number(draftPrices[row.id]);
    if (!Number.isFinite(price) || price < 0) return toast.error('Enter a valid non-negative price.');
    saveUpdates([{ id: row.id, price }], 'Price updated.');
  }

  function applyBulkPrice() {
    const price = Number(bulkPrice);
    if (!Number.isFinite(price) || price < 0) return toast.error('Enter a valid non-negative price.');
    saveUpdates(selected.map((id) => ({ id, price })), `Price updated for ${selected.length} products.`, true);
    setBulkPrice('');
  }

  function bulkAvailability(available: boolean) {
    saveUpdates(selected.map((id) => ({ id, available })), `Availability updated for ${selected.length} products.`, true);
  }

  function confirmRemove() {
    startTransition(async () => {
      try {
        const count = await removePartnerCatalogProducts(partnerId, selected);
        toast.success(`${count} product${count === 1 ? '' : 's'} removed from this partner catalog.`);
        setRemoveOpen(false);
        await refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not remove products.');
      }
    });
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Partner catalog</h2>
          <p className="text-sm text-muted-foreground">Manage this partner’s listings and selling prices. Changes do not affect the shared catalog.</p>
        </div>
        <Button asChild><Link href={`/partners/${partnerRouteId}/products/add`}><Plus /> Add products</Link></Button>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={searchInput} onChange={(event) => { setSearchInput(event.target.value); setPage(1); setSelected([]); }} placeholder="Search partner products" className="pl-9" />
        </div>
        <span className="text-sm text-muted-foreground">{total} listed</span>
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/25 bg-primary/5 p-3">
          <Badge variant="secondary">{selected.length} selected</Badge>
          <Input aria-label="Set price for selected products" type="number" min="0" step="0.01" value={bulkPrice} onChange={(event) => setBulkPrice(event.target.value)} placeholder="Set price" className="w-36" />
          <Button size="sm" variant="outline" onClick={applyBulkPrice} disabled={busy || !bulkPrice}>Set price</Button>
          <Button size="sm" variant="outline" onClick={() => bulkAvailability(true)} disabled={busy}>Set available</Button>
          <Button size="sm" variant="outline" onClick={() => bulkAvailability(false)} disabled={busy}>Set unavailable</Button>
          <Button size="sm" variant="destructive" onClick={() => setRemoveOpen(true)} disabled={busy}><Trash2 /> Remove</Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected([])}>Clear</Button>
        </div>
      )}

      <Table>
        <TableHeader><TableRow>
          <TableHead className="w-10"><Checkbox checked={allOnPageSelected} onCheckedChange={(checked) => togglePage(checked === true)} aria-label="Select all products on this page" /></TableHead>
          <TableHead>Product</TableHead><TableHead>Category</TableHead><TableHead>Stock</TableHead><TableHead>Price</TableHead><TableHead>Availability</TableHead><TableHead className="text-right">Action</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {loading ? <TableRow><TableCell colSpan={7} className="h-28 text-center text-muted-foreground"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Loading catalog…</TableCell></TableRow>
            : rows.length === 0 ? <TableRow><TableCell colSpan={7} className="h-28 text-center text-muted-foreground">No products found for this partner.</TableCell></TableRow>
              : rows.map((row) => (
                <TableRow key={row.id} data-state={selected.includes(row.id) ? 'selected' : undefined}>
                  <TableCell><Checkbox checked={selected.includes(row.id)} onCheckedChange={(checked) => toggleRow(row.id, checked === true)} aria-label={`Select ${row.name} ${row.variantName ?? ''}`} /></TableCell>
                  <TableCell><div className="flex min-w-56 items-center gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted text-[10px] text-muted-foreground" aria-label={row.name}>
                      {row.images[0]?.url ? <div className="h-full w-full bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(${JSON.stringify(row.images[0].url).slice(1, -1)})` }} /> : 'No image'}
                    </div>
                    <div className="min-w-0"><p className="truncate font-medium">{row.name}</p><p className="truncate text-xs text-muted-foreground">{row.variantName || row.variantNameAr || 'Standard'}</p></div>
                  </div></TableCell>
                  <TableCell>{row.category?.name ?? '—'}</TableCell>
                  <TableCell>{row.trackInventory ? row.stock : 'Unlimited'}</TableCell>
                  <TableCell><Input aria-label={`Price for ${row.name}`} type="number" min="0" step="0.01" value={draftPrices[row.id] ?? ''} onChange={(event) => setDraftPrices((draft) => ({ ...draft, [row.id]: event.target.value }))} className="w-32" /></TableCell>
                  <TableCell><label className="flex items-center gap-2 text-sm"><Checkbox checked={row.available} onCheckedChange={(checked) => saveUpdates([{ id: row.id, available: checked === true }], 'Availability updated.')} disabled={busy} aria-label={`Set availability for ${row.name}`} /><span>{row.available ? 'Available' : 'Unavailable'}</span></label></TableCell>
                  <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => saveRowPrice(row)} disabled={busy || Number(draftPrices[row.id]) === row.price}><Check /> Save</Button></TableCell>
                </TableRow>
              ))}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Page {page} of {pageCount}</span>
        <div className="flex gap-2"><Button size="icon" variant="outline" aria-label="Previous page" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}><ChevronLeft /></Button><Button size="icon" variant="outline" aria-label="Next page" disabled={page >= pageCount || loading} onClick={() => setPage((value) => value + 1)}><ChevronRight /></Button></div>
      </div>

      <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <DialogContent><DialogHeader><DialogTitle>Remove selected products?</DialogTitle><DialogDescription>This hides the listings from this partner’s catalog. Sales history and stock records are preserved.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setRemoveOpen(false)}>Cancel</Button><Button variant="destructive" onClick={confirmRemove} disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <Trash2 />} Remove {selected.length}</Button></DialogFooter></DialogContent>
      </Dialog>
    </section>
  );
}
