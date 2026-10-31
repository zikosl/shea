"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { AlertCircle, Check, Clock3, Loader2, Plus, RotateCcw, ScanBarcode, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { resolvePublicAssetUrl } from "@/constant";
import type { CatalogFilterOptions } from "@/lib/catalog-filter-options";

import { BarcodeEntry, type BarcodeEntryDraft } from "./barcode-entry";
import { discoverAdminBarcode, type BarcodeDiscovery } from "./actions";

type LookupStatus = "QUEUED" | "LOOKING_UP" | "READY" | "FAILED" | "COMPLETE";
type LookupEntry = {
  barcode: string;
  status: LookupStatus;
  discovery: BarcodeDiscovery | null;
  error?: string;
  draft?: BarcodeEntryDraft;
};

const MAX_BATCH_SIZE = 100;
const MAX_CONCURRENT_LOOKUPS = 2;

function normalizeBarcode(value: string) {
  return value.trim().replace(/[\s-]/g, "");
}

function validBarcode(value: string) {
  return /^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(value);
}

function lookupSummary(entry: LookupEntry) {
  if (entry.status === "QUEUED") return "Waiting for lookup";
  if (entry.status === "LOOKING_UP") return "Checking Shea and Open Facts…";
  if (entry.status === "FAILED") return entry.error || "Lookup failed";
  if (entry.status === "COMPLETE") return "Completed";
  switch (entry.discovery?.status) {
    case "EXISTING": return `Already in Shea · ${entry.discovery.existing?.productName ?? "Assigned"}`;
    case "PENDING": return "Already waiting for review";
    case "FOUND": return entry.discovery.external?.name || "Open Facts match found";
    case "RATE_LIMITED": return `Lookup limit reached · retry in ${entry.discovery.retryAfterSeconds}s`;
    case "UNAVAILABLE": return "External lookup unavailable · Shea results are ready";
    default: return "No external result · search Shea or enter details";
  }
}

function resultImage(entry: LookupEntry) {
  return entry.discovery?.external?.imageUrl || entry.discovery?.matches.find((match) => match.image)?.image || null;
}

export default function BarcodeLookupWorkspace({ options }: { options: CatalogFilterOptions }) {
  const [entries, setEntries] = useState<LookupEntry[]>([]);
  const [scanValue, setScanValue] = useState("");
  const [pasteValue, setPasteValue] = useState("");
  const [activeBarcode, setActiveBarcode] = useState<string | null>(null);
  const activeRequests = useRef(new Set<string>());
  const entriesRef = useRef<LookupEntry[]>([]);
  const returnScrollY = useRef<number | null>(null);

  const commitEntries = useCallback((update: (current: LookupEntry[]) => LookupEntry[]) => {
    const next = update(entriesRef.current);
    entriesRef.current = next;
    setEntries(next);
  }, []);

  const completedCount = useMemo(() => entries.filter((entry) => entry.status === "COMPLETE").length, [entries]);
  const activeEntry = entries.find((entry) => entry.barcode === activeBarcode) ?? null;

  const enqueueCodes = useCallback((rawCodes: string[]) => {
    const valid: string[] = [];
    const invalid: string[] = [];
    for (const rawCode of rawCodes) {
      const code = normalizeBarcode(rawCode);
      if (!code) continue;
      if (!validBarcode(code)) invalid.push(rawCode.trim());
      else valid.push(code);
    }

    const uniqueCodes = [...new Set(valid)];
    const current = entriesRef.current;
    const existing = new Set(current.map((entry) => entry.barcode));
    const fresh = uniqueCodes.filter((code) => !existing.has(code));
    const capacity = Math.max(0, MAX_BATCH_SIZE - current.length);
    const accepted = fresh.slice(0, capacity);
    const next = [...current, ...accepted.map((barcode) => ({ barcode, status: "QUEUED" as const, discovery: null }))];
    commitEntries(() => next);
    const added = accepted.length;
    if (invalid.length) toast.warning(`${invalid.length} invalid barcode${invalid.length === 1 ? "" : "s"} skipped. Enter 8, 12, 13, or 14 digits.`);
    if (added) toast.success(`${added} barcode${added === 1 ? "" : "s"} added. Lookups will start automatically.`);
    else if (uniqueCodes.length && !invalid.length) toast.info("Those barcodes are already in this batch.");
    if (fresh.length > added) toast.warning(`A batch can contain up to ${MAX_BATCH_SIZE} barcodes.`);
  }, [commitEntries]);

  useEffect(() => {
    let available = MAX_CONCURRENT_LOOKUPS - activeRequests.current.size;
    if (available <= 0) return;
    const queued = entries.filter((entry) => entry.status === "QUEUED" && !activeRequests.current.has(entry.barcode)).slice(0, available);
    if (!queued.length) return;

    for (const entry of queued) {
      activeRequests.current.add(entry.barcode);
      void Promise.resolve().then(() => {
        commitEntries((current) => current.map((item) => item.barcode === entry.barcode ? { ...item, status: "LOOKING_UP", error: undefined } : item));
        return discoverAdminBarcode(entry.barcode);
      })
        .then((discovery) => {
          commitEntries((current) => current.map((item) => item.barcode === entry.barcode ? { ...item, discovery, status: "READY", error: undefined } : item));
        })
        .catch((error) => {
          commitEntries((current) => current.map((item) => item.barcode === entry.barcode ? { ...item, status: "FAILED", error: error instanceof Error ? error.message : "Lookup failed" } : item));
        })
        .finally(() => {
          activeRequests.current.delete(entry.barcode);
        });
    }
  }, [commitEntries, entries]);

  useEffect(() => {
    if (activeEntry || returnScrollY.current === null) return;
    const scrollY = returnScrollY.current;
    returnScrollY.current = null;
    requestAnimationFrame(() => window.scrollTo({ top: scrollY, behavior: "auto" }));
  }, [activeEntry]);

  const saveDraft = useCallback((barcode: string, draft: BarcodeEntryDraft) => {
    commitEntries((current) => current.map((entry) => entry.barcode === barcode ? { ...entry, draft } : entry));
  }, [commitEntries]);

  const openEntry = useCallback((barcode: string) => {
    returnScrollY.current = window.scrollY;
    setActiveBarcode(barcode);
  }, []);
  const returnToQueue = useCallback(() => setActiveBarcode(null), []);
  const markComplete = useCallback((barcode: string) => {
    commitEntries((current) => current.map((entry) => entry.barcode === barcode ? { ...entry, status: "COMPLETE" } : entry));
    setActiveBarcode(null);
  }, [commitEntries]);

  const retryLookup = (barcode: string) => {
    commitEntries((current) => current.map((entry) => entry.barcode === barcode ? { ...entry, status: "QUEUED", discovery: null, error: undefined } : entry));
  };

  const removeEntry = (barcode: string) => {
    commitEntries((current) => current.filter((entry) => entry.barcode !== barcode));
  };

  return <div className="mx-auto max-w-5xl space-y-4 pb-10">
    <div hidden={Boolean(activeEntry)} className="space-y-4">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><ScanBarcode className="h-4 w-4" />Batch barcode lookup</CardTitle><p className="text-sm text-muted-foreground">Scan codes one at a time or paste a list. Shea is checked first; external lookups run automatically, two at a time.</p></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="batch-scan">Scan a barcode</Label>
            <div className="flex gap-2"><Input id="batch-scan" inputMode="numeric" autoComplete="off" value={scanValue} onChange={(event) => setScanValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); enqueueCodes([scanValue]); setScanValue(""); } }} placeholder="Scan, then press Enter" /><Button type="button" disabled={!scanValue.trim()} onClick={() => { enqueueCodes([scanValue]); setScanValue(""); }}><Plus className="mr-1 h-4 w-4" />Add</Button></div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="batch-paste">Paste multiple barcodes</Label>
            <Textarea id="batch-paste" value={pasteValue} onChange={(event) => setPasteValue(event.target.value)} placeholder="One barcode per line, or separated by spaces or commas" className="min-h-24 font-mono" />
            <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-muted-foreground">Duplicates are ignored. Maximum {MAX_BATCH_SIZE} codes per batch.</p><Button type="button" variant="outline" disabled={!pasteValue.trim()} onClick={() => { enqueueCodes(pasteValue.split(/[\s,;]+/)); setPasteValue(""); }}>Add pasted barcodes</Button></div>
          </div>
        </CardContent>
      </Card>

      {entries.length > 0 && <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3"><div><CardTitle className="text-base">Lookup queue</CardTitle><p className="mt-1 text-sm text-muted-foreground">{completedCount} of {entries.length} completed · selection and scroll position are preserved while reviewing</p></div><Button type="button" size="sm" variant="ghost" disabled={!completedCount} onClick={() => commitEntries((current) => current.filter((entry) => entry.status !== "COMPLETE"))}><Trash2 className="mr-1 h-4 w-4" />Clear completed</Button></CardHeader>
        <CardContent className="p-0"><div className="max-h-[min(58vh,620px)] divide-y overflow-y-auto">
          {entries.map((entry) => {
            const image = resultImage(entry);
            const canReview = entry.status === "READY" || entry.status === "COMPLETE";
            const externalName = entry.discovery?.external?.name;
            return <div key={entry.barcode} className="flex items-center gap-3 px-4 py-3">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border bg-muted">{image ? <Image unoptimized fill sizes="48px" src={resolvePublicAssetUrl(image)} alt="" className="object-contain" /> : <ScanBarcode className="absolute inset-0 m-auto h-5 w-5 text-muted-foreground" />}</div>
              <div className="min-w-0 flex-1"><p className="font-mono text-sm font-medium">{entry.barcode}</p><p className="truncate text-sm text-muted-foreground">{externalName || lookupSummary(entry)}</p></div>
              {entry.status === "LOOKING_UP" || entry.status === "QUEUED" ? <Badge variant="outline" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" />{entry.status === "QUEUED" ? "Queued" : "Looking up"}</Badge> : entry.status === "COMPLETE" ? <Badge className="gap-1"><Check className="h-3 w-3" />Done</Badge> : entry.status === "FAILED" ? <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" />Failed</Badge> : entry.discovery?.status === "RATE_LIMITED" ? <Badge variant="outline" className="gap-1"><Clock3 className="h-3 w-3" />Limited</Badge> : <Badge variant="secondary">Ready</Badge>}
              {entry.status === "FAILED" || entry.discovery?.status === "RATE_LIMITED" ? <Button type="button" size="icon" variant="ghost" aria-label="Retry lookup" onClick={() => retryLookup(entry.barcode)}><RotateCcw className="h-4 w-4" /></Button> : null}
              <Button type="button" size="sm" variant={canReview ? "outline" : "ghost"} disabled={!canReview} onClick={() => openEntry(entry.barcode)}>{entry.status === "COMPLETE" ? "View" : canReview ? "Review" : "Wait"}</Button>
              {entry.status !== "COMPLETE" && <Button type="button" size="icon" variant="ghost" aria-label={`Remove ${entry.barcode}`} disabled={entry.status === "LOOKING_UP"} onClick={() => removeEntry(entry.barcode)}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>}
            </div>;
          })}
        </div></CardContent>
      </Card>}
    </div>

    {activeEntry && <BarcodeEntry key={activeEntry.barcode} options={options} initialBarcode={activeEntry.barcode} initialDiscovery={activeEntry.discovery} draft={activeEntry.draft} onDraftChange={saveDraft} onBack={returnToQueue} onCompleted={markComplete} />}
  </div>;
}
