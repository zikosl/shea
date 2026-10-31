"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { AlertCircle, Barcode, Check, ExternalLink, Loader2, PackageSearch, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileUploader } from "@/components/ui/file-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { FILE_UPLOAD } from "@/api/mutations";
import { resolvePublicAssetUrl } from "@/constant";
import { useUploadFile } from "@/hooks/use-upload-file";
import type { CatalogFilterOptions } from "@/lib/catalog-filter-options";
import { addBarcodeVariant, assignBarcodeToVariant, createBarcodeProduct, discoverAdminBarcode, getBarcodeTemplateVariants, searchBarcodeTemplates, type BarcodeDiscovery } from "./actions";

type CatalogMatch = Awaited<ReturnType<typeof searchBarcodeTemplates>>[number];
type VariantRow = Awaited<ReturnType<typeof getBarcodeTemplateVariants>>[number];

export type BarcodeEntryDraft = {
  name: string;
  nameAr: string;
  description: string;
  brandName: string;
  quantity: string;
  imageUrl: string;
  tagsText: string;
  matchSearch: string;
  matchFilters: { niche: string; category: string; productType: string; brand: string };
  matches: CatalogMatch[];
  selectedTemplate: CatalogMatch | null;
  variants: VariantRow[];
  destination: "existing" | "new";
  createFilters: { niche: string; category: string; productType: string; brand: string };
  templateSearch: string;
  templateOptions: CatalogMatch[];
  targetTemplate: CatalogMatch | null;
};

function ImagePicker({ imageUrl, externalUrl, onChange }: { imageUrl: string; externalUrl?: string | null; onChange: (url: string) => void }) {
  const { uploadFiles, progresses, isUploading } = useUploadFile(FILE_UPLOAD);
  const preview = imageUrl || externalUrl || "";
  async function upload(files: File[]) {
    const results = await uploadFiles(files);
    if (results[0]?.url) onChange(results[0].url);
  }
  return <div className="space-y-2">
    <Label>Variant image <span className="text-destructive">required</span></Label>
    {preview && <div className="flex items-center gap-3 rounded-md border p-2"><div className="relative h-20 w-20 shrink-0 overflow-hidden rounded bg-muted">{preview.startsWith("/") ? <Image unoptimized fill src={resolvePublicAssetUrl(preview)} alt="Product preview" className="object-contain" /> : <img src={preview} alt="Open Facts product preview" className="h-full w-full object-contain" />}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{imageUrl ? (imageUrl.startsWith("/uploads/") ? "Image uploaded to Shea" : "Open Facts image selected") : "Open Facts image preview"}</p><p className="text-xs text-muted-foreground">External images are copied into Shea storage when you save.</p></div>{imageUrl && <Button type="button" size="sm" variant="ghost" onClick={() => onChange("")}>Clear</Button>}</div>}
    <FileUploader accept={{ "image/jpeg": [".jpg", ".jpeg"], "image/png": [".png"], "image/webp": [".webp"] }} maxSize={8 * 1024 * 1024} maxFiles={1} disabled={isUploading} progresses={progresses} onUpload={upload} className="h-28" />
    <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-muted-foreground">Choose, drag, or paste an image into the upload area.</p>{externalUrl && <Button type="button" size="sm" variant="outline" disabled={isUploading} onClick={() => onChange(externalUrl)}>Use Open Facts image</Button>}</div>
  </div>;
}

function CatalogFilters({ options, nicheId, categoryId, productTypeId, brandId, setNicheId, setCategoryId, setProductTypeId, setBrandId }: {
  options: CatalogFilterOptions; nicheId: string; categoryId: string; productTypeId: string; brandId: string;
  setNicheId: (value: string) => void; setCategoryId: (value: string) => void; setProductTypeId: (value: string) => void; setBrandId: (value: string) => void;
}) {
  const categories = options.categories.filter((item) => !nicheId || String(item.niche_id) === nicheId);
  const productTypes = options.productTypes.filter((item) => !categoryId || String(item.category_id) === categoryId);
  const brands = options.brands.filter((item) => !nicheId || !item.niche_id || String(item.niche_id) === nicheId);
  return <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
    <select aria-label="Niche" className="h-9 rounded-md border bg-background px-3 text-sm" value={nicheId} onChange={(event) => { setNicheId(event.target.value); setCategoryId(""); setProductTypeId(""); setBrandId(""); }}><option value="">All niches</option>{options.niches.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
    <select aria-label="Category" className="h-9 rounded-md border bg-background px-3 text-sm" value={categoryId} onChange={(event) => { setCategoryId(event.target.value); setProductTypeId(""); }}><option value="">All categories</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
    <select aria-label="Product type" className="h-9 rounded-md border bg-background px-3 text-sm" value={productTypeId} onChange={(event) => setProductTypeId(event.target.value)}><option value="">All product types</option>{productTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
    <select aria-label="Brand" className="h-9 rounded-md border bg-background px-3 text-sm" value={brandId} onChange={(event) => setBrandId(event.target.value)}><option value="">All brands</option>{brands.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
  </div>;
}

export function BarcodeEntry({ options, initialBarcode = "", initialDiscovery = null, draft, onDraftChange, onBack, onCompleted }: {
  options: CatalogFilterOptions;
  initialBarcode?: string;
  initialDiscovery?: BarcodeDiscovery | null;
  draft?: BarcodeEntryDraft;
  onDraftChange?: (barcode: string, draft: BarcodeEntryDraft) => void;
  onBack?: () => void;
  onCompleted?: (barcode: string) => void;
}) {
  const [barcode, setBarcode] = useState(initialBarcode);
  const [discovery, setDiscovery] = useState<BarcodeDiscovery | null>(initialDiscovery);
  const [name, setName] = useState(draft?.name ?? initialDiscovery?.external?.name ?? "");
  const [nameAr, setNameAr] = useState(draft?.nameAr ?? initialDiscovery?.external?.nameAr ?? "");
  const [description, setDescription] = useState(draft?.description ?? initialDiscovery?.external?.description ?? "");
  const [brandName, setBrandName] = useState(draft?.brandName ?? initialDiscovery?.external?.brand ?? "");
  const [quantity, setQuantity] = useState(draft?.quantity ?? initialDiscovery?.external?.quantity ?? "");
  const [imageUrl, setImageUrl] = useState(draft?.imageUrl ?? "");
  const [tagsText, setTagsText] = useState(draft?.tagsText ?? initialDiscovery?.external?.tags.join(", ") ?? "");
  const [matchSearch, setMatchSearch] = useState(draft?.matchSearch ?? initialDiscovery?.external?.name ?? "");
  const [matchFilters, setMatchFilters] = useState(draft?.matchFilters ?? { niche: "", category: "", productType: "", brand: "" });
  const [matches, setMatches] = useState<CatalogMatch[]>(draft?.matches ?? []);
  const [selectedTemplate, setSelectedTemplate] = useState<CatalogMatch | null>(draft?.selectedTemplate ?? null);
  const [variants, setVariants] = useState<VariantRow[]>(draft?.variants ?? []);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [destination, setDestination] = useState<"existing" | "new">(draft?.destination ?? "new");
  const [createFilters, setCreateFilters] = useState(draft?.createFilters ?? { niche: "", category: "", productType: "", brand: "" });
  const [templateSearch, setTemplateSearch] = useState(draft?.templateSearch ?? "");
  const [templateOptions, setTemplateOptions] = useState<CatalogMatch[]>(draft?.templateOptions ?? []);
  const [targetTemplate, setTargetTemplate] = useState<CatalogMatch | null>(draft?.targetTemplate ?? null);
  const [pending, startTransition] = useTransition();

  const external = discovery?.external;
  const tags = useMemo(() => tagsText.split(",").map((tag) => tag.trim()).filter(Boolean), [tagsText]);
  const setMatchFilter = (key: keyof typeof matchFilters, value: string) => setMatchFilters((current) => ({ ...current, [key]: value }));
  const setCreateFilter = (key: keyof typeof createFilters, value: string) => setCreateFilters((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    onDraftChange?.(barcode, { name, nameAr, description, brandName, quantity, imageUrl, tagsText, matchSearch, matchFilters, matches, selectedTemplate, variants, destination, createFilters, templateSearch, templateOptions, targetTemplate });
  }, [barcode, brandName, createFilters, description, destination, imageUrl, matchFilters, matchSearch, matches, name, nameAr, onDraftChange, quantity, selectedTemplate, tagsText, targetTemplate, templateOptions, templateSearch, variants]);

  function setDetails(result: BarcodeDiscovery) {
    setDiscovery(result);
    const item = result.external;
    setName(item?.name ?? "");
    setNameAr(item?.nameAr ?? "");
    setDescription(item?.description ?? "");
    setBrandName(item?.brand ?? "");
    setQuantity(item?.quantity ?? "");
    setImageUrl("");
    setTagsText(item?.tags.join(", ") ?? "");
    setMatchSearch(item?.name ?? "");
    setTargetTemplate(null);
    setTemplateOptions([]);
    setSelectedTemplate(null);
    setVariants([]);
  }

  function lookup() {
    startTransition(async () => {
      try {
        const result = await discoverAdminBarcode(barcode);
        setDetails(result);
        if (result.status === "EXISTING") toast.info("This barcode is already assigned in Shea.");
        else if (result.status === "PENDING") toast.info("This barcode is already waiting for review.");
        else if (result.status === "RATE_LIMITED") toast.warning(`External lookup limit reached. Try again in ${result.retryAfterSeconds}s.`);
        else if (result.status === "UNAVAILABLE") toast.warning("External lookup is unavailable. You can still match or create in Shea.");
        else if (result.status === "NOT_FOUND") toast.info("Open Facts has no result. You can enter product details or search Shea.");
      } catch (error) { toast.error(error instanceof Error ? error.message : "Barcode lookup failed."); }
    });
  }

  function searchTemplates(search: string, filters: typeof matchFilters, destinationList: "match" | "create") {
    startTransition(async () => {
      try {
        const result = await searchBarcodeTemplates({ search, nicheId: filters.niche ? Number(filters.niche) : undefined, categoryId: filters.category ? Number(filters.category) : undefined, productTypeId: filters.productType ? Number(filters.productType) : undefined, brandId: filters.brand ? Number(filters.brand) : undefined });
        if (destinationList === "match") {
          setMatches(result);
          setSelectedTemplate(null);
          setVariants([]);
        } else setTemplateOptions(result);
        if (!result.length) toast.info("No templates found. Adjust the search or filters.");
      } catch (error) { toast.error(error instanceof Error ? error.message : "Could not search templates."); }
    });
  }

  function chooseTemplate(item: CatalogMatch) {
    startTransition(async () => {
      try {
        setSelectedTemplate(item);
        setVariants(await getBarcodeTemplateVariants(item.id));
      } catch (error) { toast.error(error instanceof Error ? error.message : "Could not load variants."); }
    });
  }

  function finish(work: () => Promise<unknown>, success: string, closeDialog = false, completed = false) {
    startTransition(async () => {
      try {
        await work();
        toast.success(success);
        if (closeDialog) setDialogOpen(false);
        if (completed) onCompleted?.(barcode);
      } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save this barcode."); }
    });
  }

  const openAddDialog = () => {
    const matchedBrand = options.brands.find((item) => item.name.trim().toLocaleLowerCase() === brandName.trim().toLocaleLowerCase());
    setCreateFilters({ niche: matchedBrand?.niche_id ? String(matchedBrand.niche_id) : "", category: "", productType: "", brand: matchedBrand ? String(matchedBrand.id) : "" });
    setTemplateOptions([]);
    setTargetTemplate(null);
    setDialogOpen(true);
  };
  const canSaveNewProduct = Boolean(name.trim() && createFilters.category && createFilters.brand && imageUrl);
  const matchCard = (item: CatalogMatch, onSelect: () => void, selected = false) => <button key={item.id} type="button" onClick={onSelect} className={`flex w-full items-center gap-3 rounded-md border p-3 text-left transition-colors hover:bg-accent ${selected ? "border-primary bg-accent" : ""}`}><div className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-muted">{item.image ? <Image unoptimized fill src={resolvePublicAssetUrl(item.image)} alt="" className="object-contain" /> : null}</div><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{item.name}</span><span className="block truncate text-xs text-muted-foreground">{item.brand} · {item.category} · {item.variantCount} variants</span></span><span className="text-xs text-primary">Select</span></button>;

  return <div className="mx-auto max-w-5xl space-y-4 pb-10">
    {onBack && <div className="flex items-center justify-between"><Button type="button" variant="ghost" onClick={onBack}>← Back to batch list</Button><Badge variant="outline">Batch lookup</Badge></div>}
    <Card><CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end"><div className="flex-1 space-y-2"><Label htmlFor="barcode">Scan or enter barcode</Label><div className="relative"><Barcode className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="barcode" inputMode="numeric" value={barcode} readOnly={Boolean(onBack)} onChange={(event) => setBarcode(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") lookup(); }} placeholder="EAN / UPC" className="pl-10 font-mono tracking-wider" /><p className="pt-1 text-xs text-muted-foreground">{onBack ? "This barcode is fixed for the current batch item." : "Shea is checked first. External data is only a suggestion until you confirm."}</p></div></div><Button type="button" disabled={pending || !barcode.trim()} onClick={lookup}>{pending ? <Loader2 className="animate-spin" /> : <Search />} Look up</Button></CardContent></Card>

    {discovery?.status === "EXISTING" && discovery.existing && <Card className="border-emerald-500/30"><CardContent className="flex flex-wrap items-center justify-between gap-3 p-4"><div className="flex items-center gap-3"><Check className="h-5 w-5 text-emerald-600" /><div><p className="font-medium">Barcode already assigned</p><p className="text-sm text-muted-foreground">{discovery.existing.productName} · {discovery.existing.name ?? "Variant"}</p></div></div><Button asChild variant="outline"><Link href={`/product-templates/${discovery.existing.productId}/variants`}>Open product</Link></Button></CardContent></Card>}
    {discovery?.status === "PENDING" && <Card><CardContent className="flex items-center gap-3 p-4"><AlertCircle className="h-5 w-5 text-amber-600" /><p className="text-sm">This barcode is already in a pending contribution. Review it there instead of creating a duplicate.</p><Button asChild size="sm" variant="outline" className="ml-auto"><Link href="/sahim">Open review queue</Link></Button></CardContent></Card>}

    {discovery && discovery.status !== "EXISTING" && discovery.status !== "PENDING" && <Tabs defaultValue="external" className="space-y-4">
      <TabsList className="grid h-auto w-full grid-cols-2"><TabsTrigger value="external">Open Facts / add product</TabsTrigger><TabsTrigger value="match">Match in Shea</TabsTrigger></TabsList>

      <TabsContent value="external" className="space-y-4">
        {external ? <Card><CardHeader className="pb-3"><div className="flex flex-wrap items-center justify-between gap-2"><CardTitle className="text-base">External product suggestion</CardTitle><Badge variant="outline">{external.sourceName} · verify before adding</Badge></div></CardHeader><CardContent className="space-y-4"><div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]"><div className="space-y-2"><div className="h-44 overflow-hidden rounded-lg border bg-muted/30">{external.imageUrl ? <img src={external.imageUrl} alt={external.name} className="h-full w-full object-contain" /> : <div className="grid h-full place-items-center text-sm text-muted-foreground">No external image</div>}</div><p className="text-xs text-muted-foreground">Image is copied to Shea storage only when you choose to add the product.</p></div><div className="grid gap-3 sm:grid-cols-2"><div className="space-y-1"><Label>Product name</Label><Input value={name} onChange={(event) => setName(event.target.value)} /></div><div className="space-y-1"><Label>Brand from lookup</Label><Input value={brandName} onChange={(event) => setBrandName(event.target.value)} /></div><div className="space-y-1"><Label>Variant / package</Label><Input value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="Package size or variant" /></div><div className="space-y-1"><Label>Tags</Label><Input value={tagsText} onChange={(event) => setTagsText(event.target.value)} placeholder="Comma-separated" /></div><div className="space-y-1 sm:col-span-2"><Label>Arabic name (optional)</Label><Input dir="rtl" value={nameAr} onChange={(event) => setNameAr(event.target.value)} /></div><div className="space-y-1 sm:col-span-2"><Label>Description</Label><Textarea className="min-h-20" value={description} onChange={(event) => setDescription(event.target.value)} /></div></div></div>
          <ImagePicker imageUrl={imageUrl} externalUrl={external.imageUrl} onChange={setImageUrl} />
          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4"><a href={external.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-primary underline">View Open Facts source <ExternalLink className="h-3 w-3" /></a><Button type="button" disabled={pending || !name.trim() || !imageUrl} onClick={openAddDialog}>Add product…</Button></div>
        </CardContent></Card> : <Card><CardContent className="space-y-3 p-5"><div><h2 className="font-medium">No Open Facts product found</h2><p className="text-sm text-muted-foreground">You can still enter the product details and add it to Shea, or use the matching tab to find an existing item.</p></div><div className="grid gap-3 sm:grid-cols-2"><div className="space-y-1"><Label>Product name</Label><Input value={name} onChange={(event) => setName(event.target.value)} /></div><div className="space-y-1"><Label>Arabic name (optional)</Label><Input dir="rtl" value={nameAr} onChange={(event) => setNameAr(event.target.value)} /></div><div className="space-y-1 sm:col-span-2"><Label>Description (optional)</Label><Textarea className="min-h-20" value={description} onChange={(event) => setDescription(event.target.value)} /></div></div><ImagePicker imageUrl={imageUrl} onChange={setImageUrl} /><Button type="button" disabled={pending || !name.trim() || !imageUrl} onClick={openAddDialog}>Add product…</Button></CardContent></Card>}
      </TabsContent>

      <TabsContent value="match" className="space-y-4">
        {discovery.matches.length > 0 && <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Suggested matches</CardTitle></CardHeader><CardContent className="space-y-2">{discovery.matches.map((match) => {
          const item: CatalogMatch = { id: match.templateId, name: match.name, brand: match.brand || "No brand", category: options.categories.find((category) => Number(category.id) === match.categoryId)?.name ?? "Category", image: match.image, variantCount: match.variants.length };
          return <div key={match.templateId} className="flex flex-wrap items-center gap-3 rounded-md border p-3"><div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border bg-muted">{match.image ? <Image unoptimized fill sizes="48px" src={resolvePublicAssetUrl(match.image)} alt={`${match.name} catalog image`} className="object-contain" /> : <PackageSearch className="absolute inset-0 m-auto h-5 w-5 text-muted-foreground" />}</div><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{match.name}</span><span className="block text-xs text-muted-foreground">{match.brand || "No brand"} · {match.reason}</span></span><Badge variant={match.score >= 80 ? "default" : "outline"}>{match.score}%</Badge><Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => chooseTemplate(item)}>Review match</Button></div>;
        })}</CardContent></Card>}
        <Card><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><PackageSearch className="h-4 w-4" /> Search Shea catalog</CardTitle></CardHeader><CardContent className="space-y-3"><CatalogFilters options={options} nicheId={matchFilters.niche} categoryId={matchFilters.category} productTypeId={matchFilters.productType} brandId={matchFilters.brand} setNicheId={(value) => { setMatchFilter("niche", value); setMatchFilter("category", ""); setMatchFilter("productType", ""); setMatchFilter("brand", ""); }} setCategoryId={(value) => { setMatchFilter("category", value); setMatchFilter("productType", ""); }} setProductTypeId={(value) => setMatchFilter("productType", value)} setBrandId={(value) => setMatchFilter("brand", value)} /><div className="flex gap-2"><Input value={matchSearch} onChange={(event) => setMatchSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") searchTemplates(matchSearch, matchFilters, "match"); }} placeholder="Search by product or template name" /><Button type="button" variant="outline" disabled={pending} onClick={() => searchTemplates(matchSearch, matchFilters, "match")}><Search /> Search</Button></div>
          {matches.length > 0 && <div className="max-h-72 space-y-2 overflow-y-auto pr-1">{matches.map((item) => matchCard(item, () => chooseTemplate(item), selectedTemplate?.id === item.id))}</div>}
          {selectedTemplate && <div className="space-y-2 rounded-lg border bg-muted/20 p-3"><div><h3 className="font-medium">{selectedTemplate.name}</h3><p className="text-xs text-muted-foreground">Select the exact existing variant. No new variant will be created in this tab.</p></div>{variants.length ? <div className="divide-y rounded-md border bg-background">{variants.map((variant) => <div key={variant.id} className="flex flex-wrap items-center justify-between gap-3 p-3"><span className="min-w-0"><span className="block truncate text-sm font-medium">{variant.name}</span><span className="text-xs text-muted-foreground">{variant.barcode ? `Barcode: ${variant.barcode}` : "No barcode"}</span></span><Button type="button" size="sm" variant="outline" disabled={pending || Boolean(variant.barcode)} onClick={() => finish(() => assignBarcodeToVariant(variant.id, selectedTemplate.id, barcode, imageUrl), "Barcode assigned", false, true)}>{variant.barcode ? "Already coded" : "Assign to this variant"}</Button></div>)}</div> : <p className="text-sm text-muted-foreground">This template has no variants to select.</p>}</div>}
        </CardContent></Card>
      </TabsContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle>Add product to Shea</DialogTitle><DialogDescription>Choose catalog placement and whether to extend an existing template or create a new one.</DialogDescription></DialogHeader>
        <div className="space-y-4"><div className="grid grid-cols-2 gap-2"><Button type="button" variant={destination === "existing" ? "secondary" : "outline"} onClick={() => setDestination("existing")}>Add as a variant</Button><Button type="button" variant={destination === "new" ? "secondary" : "outline"} onClick={() => setDestination("new")}>New template + variant</Button></div><CatalogFilters options={options} nicheId={createFilters.niche} categoryId={createFilters.category} productTypeId={createFilters.productType} brandId={createFilters.brand} setNicheId={(value) => { setCreateFilter("niche", value); setCreateFilter("category", ""); setCreateFilter("productType", ""); setCreateFilter("brand", ""); }} setCategoryId={(value) => { setCreateFilter("category", value); setCreateFilter("productType", ""); }} setProductTypeId={(value) => setCreateFilter("productType", value)} setBrandId={(value) => setCreateFilter("brand", value)} />
          {destination === "existing" ? <div className="space-y-2"><p className="text-sm text-muted-foreground">Search within the selected filters, then add this package as a new variant.</p><div className="flex gap-2"><Input value={templateSearch} onChange={(event) => setTemplateSearch(event.target.value)} placeholder="Template name" onKeyDown={(event) => { if (event.key === "Enter") searchTemplates(templateSearch, createFilters, "create"); }} /><Button type="button" variant="outline" disabled={pending} onClick={() => searchTemplates(templateSearch, createFilters, "create")}><Search /></Button></div><div className="max-h-48 space-y-2 overflow-y-auto">{templateOptions.map((item) => matchCard(item, () => setTargetTemplate(item), targetTemplate?.id === item.id))}</div>{targetTemplate && <p className="text-sm">Selected: <strong>{targetTemplate.name}</strong></p>}</div> : <p className="text-sm text-muted-foreground">A new template and its first variant will be created with the selected niche, category, optional product type, and brand.</p>}
        </div>
        <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>{destination === "existing" ? <Button type="button" disabled={pending || !targetTemplate || !quantity.trim() || !imageUrl} onClick={() => finish(() => addBarcodeVariant({ productId: targetTemplate!.id, barcode, name: quantity || name, nameAr, description, tags, imageUrl }), "Variant created and barcode assigned", true, true)}>{pending && <Loader2 className="animate-spin" />} Add variant</Button> : <Button type="button" disabled={pending || !canSaveNewProduct} onClick={() => finish(() => createBarcodeProduct({ barcode, name, nameAr, description, variantName: quantity, brandId: Number(createFilters.brand), categoryId: Number(createFilters.category), productTypeId: createFilters.productType ? Number(createFilters.productType) : undefined, imageUrl, tags }), "Product and variant created", true, true)}>{pending && <Loader2 className="animate-spin" />} Create product</Button>}</DialogFooter>
      </DialogContent></Dialog>
    </Tabs>}
  </div>;
}
