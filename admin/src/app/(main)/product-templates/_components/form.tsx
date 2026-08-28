'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { BadgeCheck, ImageIcon, Loader2, Package, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';

import { FILE_UPLOAD } from '@/api/mutations';
import { resolvePublicAssetUrl } from '@/constant';
import { useUploadFile } from '@/hooks/use-upload-file';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FileUploader } from '@/components/ui/file-upload';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { createItem, updateItem } from '../actions';
import { Item, link, title_singular } from '../_constant';

const formSchema = z.object({
  name: z.string().min(2, {
    message: "name must be at least 2 characters.",
  }),
  description: z.string().optional(),
  product_type_id: z.string({
    required_error: "Product type is required",
  }),
  brand_id: z.string({
    required_error: "Brand is required",
  }),
});

type References = {
  productTypes: Array<{ id: string; name: string; category?: { niche_id?: string | number | null } | null }>;
  brands: Array<{ id: string; name: string; niche_id?: string | number | null }>;
};

export default function ItemForm({
  initialData,
  references,
  pageTitle
}: {
  initialData: Item | null;
  pageTitle: string;
  references: References;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>(() => initialData?.images?.map((image) => image.url) ?? []);
  const { uploadFiles, progresses, isUploading } = useUploadFile(FILE_UPLOAD);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      description: initialData?.description ?? "",
      product_type_id: initialData?.product_type_id ?? "",
      brand_id: initialData?.brand_id ?? "",
    },
  });
  const watchedName = form.watch("name");
  const watchedDescription = form.watch("description");
  const watchedBrandId = form.watch("brand_id");
  const watchedProductTypeId = form.watch("product_type_id");
  const selectedProductType = references.productTypes.find((productType) => String(productType.id) === String(watchedProductTypeId));
  const selectedNicheId = selectedProductType?.category?.niche_id ? String(selectedProductType.category.niche_id) : undefined;
  const filteredBrands = useMemo(() => {
    if (!selectedNicheId) return references.brands;
    return references.brands.filter((brand) => !brand.niche_id || String(brand.niche_id) === selectedNicheId);
  }, [references.brands, selectedNicheId]);
  const selectedBrand = references.brands.find((brand) => String(brand.id) === String(watchedBrandId));

  async function handleUpload(files: File[]) {
    const uploadedFiles = await uploadFiles(files);
    setImageUrls((currentImages) => {
      const nextUrls = uploadedFiles.map((file) => file.url);
      return Array.from(new Set([...currentImages, ...nextUrls]));
    });
  }

  const previewImages = useMemo(
    () => imageUrls.map((url) => resolvePublicAssetUrl(url)),
    [imageUrls],
  );

  useEffect(() => {
    if (!watchedBrandId || !selectedNicheId) return;
    const stillValid = filteredBrands.some((brand) => String(brand.id) === String(watchedBrandId));
    if (!stillValid) {
      form.setValue("brand_id", "");
    }
  }, [filteredBrands, form, selectedNicheId, watchedBrandId]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);

    try {
      const payload = {
        name: values.name,
        description: values.description,
        product_type_id: values.product_type_id,
        brand_id: values.brand_id,
        images: imageUrls,
      };

      if (initialData) {
        await updateItem(initialData.id, payload);
      } else {
        await createItem(payload);
        form.reset();
        setImageUrls([]);
      }

      router.replace(`/${link}`);
      toast.success(`${title_singular} saved successfully.`);
    } catch (_error) {
      toast.error(`${title_singular} could not be saved.`);
    } finally {
      setLoading(false);
    }
  }

  function removeImage(url: string) {
    setImageUrls((currentImages) => currentImages.filter((image) => image !== url));
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 mx-auto">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>{pageTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="" {...field} />
                    </FormControl>
                    <FormDescription>
                      This is the template name shown across the catalog.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="brand_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a brand" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredBrands.map((brand) => (
                          <SelectItem key={brand.id} value={brand.id.toString()}>
                            {brand.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose the brand this template belongs to.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="product_type_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a product type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {references.productTypes.map((productType) => (
                          <SelectItem key={productType.id} value={productType.id.toString()}>
                            {productType.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      This groups the template within the product catalog.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe this product template..." className="min-h-32" {...field} />
                  </FormControl>
                  <FormDescription>
                    Add the core product description used across template-based listings.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <FormLabel>Template Images</FormLabel>
              <FileUploader
                maxSize={25 * 1024 * 1024}
                maxFiles={6}
                multiple
                progresses={progresses}
                onUpload={handleUpload}
                disabled={isUploading}
              />
              <FormDescription>
                Upload up to 6 catalog images for this template.
              </FormDescription>
            </div>

            {previewImages.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {previewImages.map((image, index) => (
                  <div key={`${image}-${index}`} className="relative overflow-hidden rounded-2xl border border-border/70 bg-background/60 p-2">
                    <button
                      type="button"
                      onClick={() => removeImage(imageUrls[index])}
                      className="absolute right-3 top-3 z-10 rounded-full bg-background/90 p-1 text-foreground shadow-sm"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <div className="relative aspect-square overflow-hidden rounded-xl">
                      <Image
                        unoptimized
                        fill
                        src={image}
                        alt="Template image"
                        className="object-cover"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button disabled={loading || isUploading} type="submit">
              {loading && <Loader2 className="animate-spin" />}
              {loading ? "Saving..." : "Submit"}
            </Button>
          </CardFooter>
        </Card>
        <Card className="h-fit overflow-hidden xl:sticky xl:top-24">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BadgeCheck className="h-4 w-4" />
              Live preview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative aspect-square overflow-hidden rounded-2xl border bg-muted">
              {previewImages[0] ? (
                <Image
                  unoptimized
                  fill
                  src={previewImages[0]}
                  alt="Product template preview"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                  <ImageIcon className="h-8 w-8" />
                  <span className="text-sm">No image yet</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Package className="h-3.5 w-3.5" />
                {selectedProductType?.name ?? "Product type"}
              </div>
              <h3 className="text-xl font-semibold tracking-tight">
                {watchedName || "Product template name"}
              </h3>
              <p className="line-clamp-4 text-sm text-muted-foreground">
                {watchedDescription || "Add a clear product description so partners understand what they are activating."}
              </p>
            </div>
            <div className="rounded-2xl border bg-muted/40 p-4 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Brand</span>
                <span className="font-medium">{selectedBrand?.name ?? "Not selected"}</span>
              </div>
              <div className="mt-3 flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Images</span>
                <span className="font-medium">{imageUrls.length}/6</span>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      </form>
    </Form>
  );
}
