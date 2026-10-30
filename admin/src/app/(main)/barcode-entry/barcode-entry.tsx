"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { AlertCircle, Barcode, Check, ExternalLink, Loader2, PackageSearch, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { resolvePublicAssetUrl } from "@/constant";
import type { CatalogFilterOptions } from "@/lib/catalog-filter-options";
import { addBarcodeVariant, assignBarcodeToVariant, createBarcodeProduct, discoverAdminBarcode, getBarcodeTemplateVariants, searchBarcodeTemplates, type BarcodeDiscovery } from "./actions";

type CatalogMatch = Awaited<ReturnType<typeof searchBarcodeTemplates>>[number];
type VariantRow = Awaited<ReturnType<typeof getBarcodeTemplateVariants>>[number];

export default function BarcodeEntry({ options }: { options: CatalogFilterOptions }) {
  const [barcode, setBarcode] = useState("");
  const [discovery, setDiscovery] = useState<BarcodeDiscovery | null>(null);
  const [name, setName] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [description, setDescription] = useState("");
  const [brandName, setBrandName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [searchText, setSearchText] = useState("");
  const [nicheId, setNicheId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [productTypeId, setProductTypeId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [matches, setMatches] = useState<CatalogMatch[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<CatalogMatch | null>(null);
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [variantName, setVariantName] = useState("");
  const [variantNameAr, setVariantNameAr] = useState("");
  const [variantDescription, setVariantDescription] = useState("");
  const [pending, startTransition] = useTransition();

  const categories = useMemo(() => options.categories.filter((item) => !nicheId || String(item.niche_id) === nicheId), [options.categories, nicheId]);
  const productTypes = useMemo(() => options.productTypes.filter((item) => !categoryId || String(item.category_id) === categoryId), [options.productTypes, categoryId]);
  const brands = useMemo(() => options.brands.filter((item) => !nicheId || !item.niche_id || String(item.niche_id) === nicheId), [options.brands, nicheId]);
  const tags = useMemo(() => tagsText.split(",").map((tag) => tag.trim()).filter(Boolean), [tagsText]);

  function applyExternalSuggestion(result: BarcodeDiscovery) {
    const external = result.external;
    setDiscovery(result);
    if (external) {
      setName(external.name);
      setNameAr(external.nameAr);
      setDescription(external.description);
      setBrandName(external.brand);
      setQuantity(external.quantity);
      setImageUrl(external.imageUrl ?? "");
      setTagsText(external.tags.join(", "));
      const matchedBrand = options.brands.find((brand) => brand.name.trim().toLocaleLowerCase() === external.brand.trim().toLocaleLowerCase());
      if (matchedBrand) {
        setBrandId(String(matchedBrand.id));
        if (matchedBrand.niche_id) setNicheId(String(matchedBrand.niche_id));
      }
      setSearchText(external.name);
      setVariantName(external.quantity || "Standard");
      setVariantNameAr("");
      setVariantDescription(external.description);
    }
  }

  function lookup() {
    startTransition(async () => {
      try {
        const result = await discoverAdminBarcode(barcode);
        applyExternalSuggestion(result);
        setSelectedTemplate(null);
        setVariants([]);
        if (result.status === "EXISTING") toast.info("This barcode is already assigned in Shea.");
        else if (result.status === "PENDING") toast.info("This barcode is already waiting for review.");
        else if (result.status === "RATE_LIMITED") toast.warning(`External lookup limit reached. Try again in ${result.retryAfterSeconds}s.`);
        else if (result.status === "UNAVAILABLE") toast.warning("External lookup is unavailable. You can still search Shea manually.");
        else if (result.status === "NOT_FOUND") toast.info("No external product found. Search Shea or create a new product.");
      } catch (error) { toast.error(error instanceof Error ? error.message : "Barcode lookup failed."); }
    });
  }

  function searchCatalog() {
    startTransition(async () => {
      try {
        const result = await searchBarcodeTemplates({ search: searchText, nicheId: nicheId ? Number(nicheId) : undefined, categoryId: categoryId ? Number(categoryId) : undefined, productTypeId: productTypeId ? Number(productTypeId) : undefined, brandId: brandId ? Number(brandId) : undefined });
        setMatches(result);
        setSelectedTemplate(null);
        setVariants([]);
        if (!result.length) toast.info("No matching templates. Adjust filters or create a new product.");
      } catch (error) { toast.error(error instanceof Error ? error.message : "Could not search the catalog."); }
    });
  }

  function chooseTemplate(template: CatalogMatch) {
    startTransition(async () => {
      try {
        setSelectedTemplate(template);
        setVariants(await getBarcodeTemplateVariants(template.id));
      } catch (error) { toast.error(error instanceof Error ? error.message : "Could not load template variants."); }
    });
  }

  function chooseSuggestedTemplate(match: BarcodeDiscovery["matches"][number]) {
    const item: CatalogMatch = { id: match.templateId, name: match.name, brand: match.brand || "No brand", category: options.categories.find((category) => Number(category.id) === match.categoryId)?.name ?? "Category", image: null, variantCount: match.variants.length };
    setMatches((current) => current.some((candidate) => candidate.id === item.id) ? current : [item, ...current]);
    chooseTemplate(item);
  }

  function finish(work: () => Promise<unknown>, success: string) {
    startTransition(async () => {
      try { await work(); toast.success(success); }
      catch (error) { toast.error(error instanceof Error ? error.message : "Could not save this barcode."); }
    });
  }

  const external = discovery?.external;
  const canCreate = Boolean(name.trim() && categoryId && brandId);

  return <div className="mx-auto max-w-5xl space-y-4 pb-10">
    <Card><CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
      <div className="flex-1 space-y-2"><label htmlFor="barcode" className="text-sm font-medium">Scan or enter barcode</label><div className="relative"><Barcode className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="barcode" inputMode="numeric" value={barcode} onChange={(event) => setBarcode(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") lookup(); }} placeholder="EAN / UPC" className="pl-10 font-mono tracking-wider" /></div><p className="text-xs text-muted-foreground">Existing Shea assignments are checked before any external lookup.</p></div>
      <Button type="button" disabled={pending || !barcode.trim()} onClick={lookup}>{pending ? <Loader2 className="animate-spin" /> : <Search />} Look up</Button>
    </CardContent></Card>

    {discovery?.status === "EXISTING" && discovery.existing && <Card className="border-emerald-500/30"><CardContent className="flex flex-wrap items-center justify-between gap-3 p-4"><div className="flex items-center gap-3"><Check className="h-5 w-5 text-emerald-600" /><div><p className="font-medium">Barcode already assigned</p><p className="text-sm text-muted-foreground">{discovery.existing.productName} · {discovery.existing.name ?? "Variant"}</p></div></div><Button asChild variant="outline"><Link href={`/product-templates/${discovery.existing.productId}/variants`}>Open product</Link></Button></CardContent></Card>}
    {discovery?.status === "PENDING" && <Card><CardContent className="flex items-center gap-3 p-4"><AlertCircle className="h-5 w-5 text-amber-600" /><p className="text-sm">This barcode is already in a pending contribution. Review it there instead of creating a duplicate.</p><Button asChild size="sm" variant="outline" className="ml-auto"><Link href="/sahim">Open review queue</Link></Button></CardContent></Card>}

    {discovery && !external && discovery.status !== "EXISTING" && discovery.status !== "PENDING" && <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Product details</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2"><label className="space-y-1 text-xs text-muted-foreground">Product name<Input value={name} onChange={(event) => setName(event.target.value)} /></label><label className="space-y-1 text-xs text-muted-foreground">Arabic name (optional)<Input dir="rtl" value={nameAr} onChange={(event) => setNameAr(event.target.value)} /></label><label className="space-y-1 text-xs text-muted-foreground sm:col-span-2">Description (optional)<Textarea value={description} onChange={(event) => setDescription(event.target.value)} className="min-h-20" /></label><label className="space-y-1 text-xs text-muted-foreground sm:col-span-2">Variant image URL (required)<Input type="url" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://..." /></label></CardContent></Card>}

    {discovery && !external && discovery.status !== "EXISTING" && discovery.status !== "PENDING" && <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Product details</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2"><label className="space-y-1 text-xs text-muted-foreground">Product name<Input value={name} onChange={(event) => setName(event.target.value)} /></label><label className="space-y-1 text-xs text-muted-foreground">Arabic name (optional)<Input dir="rtl" value={nameAr} onChange={(event) => setNameAr(event.target.value)} /></label><label className="space-y-1 text-xs text-muted-foreground sm:col-span-2">Description (optional)<Textarea value={description} onChange={(event) => setDescription(event.target.value)} className="min-h-20" /></label><label className="space-y-1 text-xs text-muted-foreground sm:col-span-2">Variant image URL (required)<Input type="url" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://..." /></label></CardContent></Card>}

    {external && <Card className="border-emerald-600/20 bg-emerald-600/[0.035]"><CardHeader className="pb-3"><div className="flex flex-wrap items-center justify-between gap-2"><CardTitle className="text-base">External product suggestion</CardTitle><Badge variant="outline">{external.sourceName} · verify details</Badge></div></CardHeader><CardContent className="flex flex-col gap-4 sm:flex-row">
      <div className="h-28 w-28 shrink-0 overflow-hidden rounded-lg border bg-background">{external.imageUrl ? <img src={external.imageUrl} alt={external.name} className="h-full w-full object-contain" /> : <div className="grid h-full place-items-center text-xs text-muted-foreground">No image</div>}</div>
      <div className="min-w-0 flex-1 space-y-3"><div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1 text-xs text-muted-foreground">Product name<Input value={name} onChange={(event) => setName(event.target.value)} /></label><label className="space-y-1 text-xs text-muted-foreground">Brand from lookup<Input value={brandName} onChange={(event) => setBrandName(event.target.value)} /></label><label className="space-y-1 text-xs text-muted-foreground">Package / variant<Input value={quantity} onChange={(event) => { setQuantity(event.target.value); setVariantName(event.target.value || "Standard"); }} /></label><label className="space-y-1 text-xs text-muted-foreground">Tags, comma separated<Input value={tagsText} onChange={(event) => setTagsText(event.target.value)} /></label><label className="space-y-1 text-xs text-muted-foreground sm:col-span-2">Variant image URL<Input type="url" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://..." /></label></div><label className="block space-y-1 text-xs text-muted-foreground">Description<Textarea value={description} onChange={(event) => setDescription(event.target.value)} className="min-h-20" /></label><a href={external.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary underline">View source <ExternalLink className="h-3 w-3" /></a></div>
    </CardContent></Card>}

    {discovery?.matches.length ? <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Possible Shea matches</CardTitle></CardHeader><CardContent className="space-y-2">{discovery.matches.map((match) => <div key={match.templateId} className="flex flex-wrap items-center gap-3 rounded-md border p-3"><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{match.name}</span><span className="block text-xs text-muted-foreground">{match.brand || "No brand"} · {match.reason}</span></span><Badge variant={match.score >= 80 ? "default" : "outline"}>{match.score}%</Badge><Button type="button" size="sm" variant="outline" onClick={() => chooseSuggestedTemplate(match)}>Review match</Button></div>)}</CardContent></Card> : null}

    {discovery && discovery.status !== "EXISTING" && discovery.status !== "PENDING" && <Card><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><PackageSearch className="h-4 w-4" /> Find a matching Shea product</CardTitle></CardHeader><CardContent className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4"><select aria-label="Filter by niche" className="h-9 rounded-md border bg-background px-3 text-sm" value={nicheId} onChange={(event) => { setNicheId(event.target.value); setCategoryId(""); setProductTypeId(""); setBrandId(""); }}><option value="">All niches</option>{options.niches.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select aria-label="Filter by category" className="h-9 rounded-md border bg-background px-3 text-sm" value={categoryId} onChange={(event) => { setCategoryId(event.target.value); setProductTypeId(""); }}><option value="">All categories</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select aria-label="Filter by product type" className="h-9 rounded-md border bg-background px-3 text-sm" value={productTypeId} onChange={(event) => setProductTypeId(event.target.value)}><option value="">All product types</option>{productTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select aria-label="Filter by brand" className="h-9 rounded-md border bg-background px-3 text-sm" value={brandId} onChange={(event) => setBrandId(event.target.value)}><option value="">All brands</option>{brands.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
      <div className="flex gap-2"><Input value={searchText} onChange={(event) => setSearchText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") searchCatalog(); }} placeholder="Search product or template name" /><Button type="button" variant="outline" disabled={pending} onClick={searchCatalog}><Search /> Search</Button></div>
      {matches.length > 0 && <div className="max-h-80 space-y-2 overflow-y-auto pr-1">{matches.map((item) => <button key={item.id} type="button" onClick={() => chooseTemplate(item)} className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent ${selectedTemplate?.id === item.id ? "border-primary bg-accent" : ""}`}><div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">{item.image ? <Image unoptimized fill src={resolvePublicAssetUrl(item.image)} alt="" className="object-contain" /> : null}</div><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{item.name}</span><span className="block truncate text-xs text-muted-foreground">{item.brand} · {item.category} · {item.variantCount} variants</span></span><span className="text-xs text-primary">Select</span></button>)}</div>}
      {selectedTemplate && <div className="space-y-3 rounded-lg border bg-muted/20 p-3"><div><h3 className="font-medium">{selectedTemplate.name}</h3><p className="text-xs text-muted-foreground">Choose an existing variant to assign this code, or add a new package variant.</p></div>{variants.length > 0 && <div className="divide-y rounded-md border bg-background">{variants.map((variant) => <div key={variant.id} className="flex items-center justify-between gap-3 p-3"><span className="min-w-0"><span className="block truncate text-sm">{variant.name}</span><span className="text-xs text-muted-foreground">{variant.barcode ? `Barcode: ${variant.barcode}` : "No barcode"}</span></span><Button type="button" size="sm" variant="outline" disabled={pending || Boolean(variant.barcode)} onClick={() => finish(() => assignBarcodeToVariant(variant.id, selectedTemplate.id, barcode), "Barcode assigned")}>{variant.barcode ? "Already coded" : "Assign barcode"}</Button></div>)}</div>}
        <div className="grid gap-2 sm:grid-cols-2"><label className="space-y-1 text-xs text-muted-foreground">New variant name<Input value={variantName} onChange={(event) => setVariantName(event.target.value)} /></label><label className="space-y-1 text-xs text-muted-foreground">Arabic name (optional)<Input dir="rtl" value={variantNameAr} onChange={(event) => setVariantNameAr(event.target.value)} /></label></div><label className="block space-y-1 text-xs text-muted-foreground">Variant description (optional)<Textarea value={variantDescription} onChange={(event) => setVariantDescription(event.target.value)} className="min-h-20" /></label><label className="block space-y-1 text-xs text-muted-foreground">Variant image URL (required)<Input type="url" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://..." /></label><Button type="button" disabled={pending || !variantName.trim() || !imageUrl.trim()} onClick={() => finish(() => addBarcodeVariant({ productId: selectedTemplate.id, barcode, name: variantName, nameAr: variantNameAr, description: variantDescription, tags, imageUrl }), "Variant created and barcode assigned")}>Add variant to this template</Button>
      </div>}
      {discovery.matches.length > 0 && <p className="text-xs text-muted-foreground">Suggested matches are ranked by product name, brand, and package size. Confirm the actual package before assigning.</p>}
    </CardContent></Card>}

    {discovery && discovery.status !== "EXISTING" && discovery.status !== "PENDING" && <Card><CardHeader className="pb-3"><CardTitle className="text-base">Create a new product template</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-sm text-muted-foreground">Use this only when no existing template is the right match. The barcode will be assigned to its first variant.</p><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4"><select aria-label="New product niche" className="h-9 rounded-md border bg-background px-3 text-sm" value={nicheId} onChange={(event) => { setNicheId(event.target.value); setCategoryId(""); setBrandId(""); }}><option value="">Choose niche</option>{options.niches.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select aria-label="New product category" className="h-9 rounded-md border bg-background px-3 text-sm" value={categoryId} onChange={(event) => { setCategoryId(event.target.value); setProductTypeId(""); }}><option value="">Choose category</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select aria-label="New product type" className="h-9 rounded-md border bg-background px-3 text-sm" value={productTypeId} onChange={(event) => setProductTypeId(event.target.value)}><option value="">No product type</option>{productTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select aria-label="New product brand" className="h-9 rounded-md border bg-background px-3 text-sm" value={brandId} onChange={(event) => setBrandId(event.target.value)}><option value="">Choose brand</option>{brands.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div><label className="block space-y-1 text-xs text-muted-foreground">Variant name / package (optional)<Input value={variantName} onChange={(event) => setVariantName(event.target.value)} placeholder="e.g. 400 g" /></label><label className="block space-y-1 text-xs text-muted-foreground">Variant image URL (required)<Input type="url" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://..." /></label><Button type="button" disabled={pending || !canCreate || !imageUrl.trim()} onClick={() => finish(() => createBarcodeProduct({ barcode, name, nameAr, description, variantName, brandId: Number(brandId), categoryId: Number(categoryId), productTypeId: productTypeId ? Number(productTypeId) : undefined, imageUrl, tags }), "Product created and barcode assigned")}>{pending ? <Loader2 className="animate-spin" /> : <Check />} Create product and variant</Button></CardContent></Card>}

    {discovery?.status === "NOT_FOUND" && <p className="text-xs text-muted-foreground">Open Facts did not find this code. You can still match a Shea template or create the product manually.</p>}
  </div>;
}
