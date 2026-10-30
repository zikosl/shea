"use server";

import { revalidatePath } from "next/cache";
import { ADMIN_DISCOVER_BARCODE } from "@/api/queries/barcode-entry";
import { requestServerGraphQL } from "@/lib/server-request";
import { createItem, getSearchItem, setCatalogVariantBarcode } from "../product-templates/actions";
import { createVariantItem, getVariants, updateVariantItem } from "../product-templates/[itemId]/variants/actions";

export type BarcodeDiscovery = {
  status: "EXISTING" | "PENDING" | "FOUND" | "NOT_FOUND" | "UNAVAILABLE" | "RATE_LIMITED";
  retryAfterSeconds: number;
  existing: { id: number; productId: number; name: string | null; productName: string } | null;
  external: { name: string; nameAr: string; description: string; brand: string; quantity: string; tags: string[]; imageUrl: string | null; sourceUrl: string; sourceName: string } | null;
  matches: Array<{ templateId: number; name: string; description: string; brand: string; categoryId: number; nicheId: number | null; productTypeId: number | null; brandId: number | null; score: number; reason: string; variants: Array<{ id: number; name: string | null; barcode: string | null; sizeHint: string }> }>;
};

function normalizeBarcode(barcode: string) {
  const normalized = barcode.trim().replace(/[\s-]/g, "");
  if (!/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(normalized)) throw new Error("Enter a valid 8, 12, 13, or 14 digit barcode.");
  return normalized;
}

function normalizeImageUrl(value?: string | null) {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.username || url.password) throw new Error();
    return url.toString();
  } catch { throw new Error("Use a valid HTTPS image URL."); }
}

export async function discoverAdminBarcode(barcode: string) {
  const result = await requestServerGraphQL<{ adminDiscoverBarcode: BarcodeDiscovery }>(ADMIN_DISCOVER_BARCODE, { barcode: normalizeBarcode(barcode) });
  return result.adminDiscoverBarcode;
}

export async function searchBarcodeTemplates(input: { search: string; nicheId?: number; categoryId?: number; productTypeId?: number; brandId?: number }) {
  const result = await getSearchItem({ search: input.search, page: 1, limit: 30, niche_id: input.nicheId, category_id: input.categoryId, product_type_id: input.productTypeId, brand_id: input.brandId });
  return result.items.map((item) => ({ id: Number(item.id), name: item.name, brand: item.brand?.name ?? "No brand", category: item.category?.name ?? "Uncategorized", image: item.images?.[0]?.url ?? null, variantCount: item.variantCount ?? 0 }));
}

export async function getBarcodeTemplateVariants(productId: number) {
  const result = await getVariants(productId, "", 1, 100);
  return result.variants.map((variant) => ({ id: Number(variant.id), name: variant.name ?? "Unnamed variant", barcode: variant.barcode ?? null, image: variant.images?.[0]?.url ?? null }));
}

export async function assignBarcodeToVariant(variantId: number, productId: number, barcode: string, imageUrl?: string | null) {
  const image = normalizeImageUrl(imageUrl);
  if (image) {
    const result = await getVariants(productId, "", 1, 100);
    const variant = result.variants.find((item) => Number(item.id) === variantId);
    if (variant && !variant.images?.length) await updateVariantItem(productId, variantId, {
      name: variant.name ?? "", name_ar: variant.name_ar ?? "", description: variant.description ?? "", description_ar: variant.description_ar ?? "", sku: variant.sku ?? "", tags: variant.tags?.map((tag) => tag.value) ?? [], images: [image],
    });
  }
  await setCatalogVariantBarcode(productId, variantId, normalizeBarcode(barcode));
  revalidatePath("/barcode-entry");
  return { productId, variantId };
}

export async function addBarcodeVariant(input: { productId: number; barcode: string; name: string; nameAr: string; description: string; tags: string[]; imageUrl?: string | null }) {
  const barcode = normalizeBarcode(input.barcode);
  if (!Number.isSafeInteger(input.productId) || input.productId < 1) throw new Error("Choose a valid product template.");
  if (!input.name.trim()) throw new Error("Variant name is required.");
  const imageUrl = normalizeImageUrl(input.imageUrl);
  if (!imageUrl) throw new Error("A variant image is required.");
  const variantId = await createVariantItem(input.productId, { name: input.name, name_ar: input.nameAr, description: input.description, sku: "", tags: input.tags, images: [imageUrl], barcode });
  if (!variantId) throw new Error("Variant was created, but its ID was not returned. Open the template and finish barcode assignment there.");
  revalidatePath(`/product-templates/${input.productId}/variants`);
  return { productId: input.productId, variantId };
}

export async function createBarcodeProduct(input: { barcode: string; name: string; nameAr: string; description: string; variantName?: string; brandId: number; categoryId: number; productTypeId?: number; imageUrl?: string | null; tags: string[] }) {
  const barcode = normalizeBarcode(input.barcode);
  const imageUrl = normalizeImageUrl(input.imageUrl);
  if (!input.name.trim() || !input.brandId || !input.categoryId) throw new Error("Name, category, and brand are required.");
  if (!imageUrl) throw new Error("A variant image is required.");
  const template = await createItem({
    name: input.name.trim(), name_ar: input.nameAr.trim(), description: input.description.trim(),
    category_id: String(input.categoryId), product_type_id: input.productTypeId ? String(input.productTypeId) : "",
    brand_id: String(input.brandId), images: [imageUrl],
  });
  const variants = await getVariants(Number(template.id), "", 1, 5);
  const initial = variants.variants[0];
  if (!initial?.id) throw new Error("Template was created, but its initial variant could not be retrieved.");
  await updateVariantItem(Number(template.id), Number(initial.id), {
    name: input.variantName?.trim() || input.tags.join(" / ") || input.name.trim(), name_ar: "", description: input.description.trim(), description_ar: "", sku: "", tags: input.tags, images: [imageUrl], barcode,
  });
  revalidatePath("/product-templates");
  revalidatePath("/barcode-entry");
  return { productId: Number(template.id), variantId: Number(initial.id) };
}
