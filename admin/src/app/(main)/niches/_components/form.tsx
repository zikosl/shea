'use client';

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { FILE_UPLOAD } from "@/api/mutations";
import { resolvePublicAssetUrl } from "@/constant";
import { useUploadFile } from "@/hooks/use-upload-file";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { FileUploader } from "@/components/ui/file-upload";

import { createItem, saveNicheCapabilities, updateItem } from "../actions";
import { Item, name_plural, title_singular } from "../_constant";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  name_ar: z.string().min(2, {
    message: "Arabic name must be at least 2 characters.",
  }),
  image: z.string().min(1, {
    message: "Image must be uploaded.",
  }),
});

export default function ItemForm({
  initialData,
  capabilityConfig,
  pageTitle,
}: {
  initialData: Item | null;
  capabilityConfig: { catalog: CapabilityCode[]; enabled: CapabilityCode[] } | null;
  pageTitle: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState(() => resolvePublicAssetUrl(initialData?.image));
  const [enabledCapabilities, setEnabledCapabilities] = useState<CapabilityCode[]>(capabilityConfig?.enabled ?? []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      name_ar: initialData?.name_ar ?? "",
      image: initialData?.image ?? "",
    },
  });

  const { uploadFiles, progresses, isUploading } = useUploadFile(FILE_UPLOAD);

  async function handleUpload(files: File[]) {
    const uploadedFiles = await uploadFiles(files);
    const latestFile = uploadedFiles[uploadedFiles.length - 1];

    if (latestFile) {
      form.setValue("image", latestFile.url, {
        shouldDirty: true,
        shouldValidate: true,
      });
      setImage(resolvePublicAssetUrl(latestFile.url));
    }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);

    try {
      if (initialData) {
        await updateItem(initialData.id, values);
        await saveNicheCapabilities(initialData.id, enabledCapabilities);
      } else {
        const niche = await createItem(values);
        if (niche?.id && enabledCapabilities.length) {
          await saveNicheCapabilities(niche.id, enabledCapabilities);
        }
        form.reset();
      }

      router.replace(`/${name_plural}`);
      toast.success(`${title_singular} saved successfully.`);
    } catch {
      toast.error(`${title_singular} could not be saved.`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-1 space-y-8 mx-auto">
        <div className="flex flex-row">
          <div className="w-[300px] h-[300px] p-4">
            {image ? (
              <Image
                unoptimized
                width={450}
                height={450}
                src={image}
                alt={`${title_singular} preview`}
                className="rounded-md object-cover"
              />
            ) : null}
          </div>
          <div className="flex-1 gap-4 flex flex-col">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">{pageTitle}</h2>
              <p className="text-sm text-muted-foreground">
                Add a niche with both display languages and a representative image.
              </p>
            </div>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Hair care" {...field} />
                  </FormControl>
                  <FormDescription>
                    This label is used across the default admin language.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            {capabilityConfig?.catalog.length ? (
              <section className="space-y-3 rounded-2xl border bg-muted/20 p-4">
                <div>
                  <FormLabel>Default capabilities</FormLabel>
                  <FormDescription>
                    Partners assigned to this niche inherit these modules unless explicitly overridden.
                  </FormDescription>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {capabilityConfig.catalog.map((code) => {
                    const selected = enabledCapabilities.includes(code);
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() => setEnabledCapabilities((current) => selected
                          ? current.filter((item) => item !== code)
                          : [...current, code])}
                        className="flex items-center justify-between rounded-xl border bg-background px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                      >
                        <span className="capitalize">{code.replaceAll("_", " ").toLowerCase()}</span>
                        <span className={`flex h-5 w-5 items-center justify-center rounded border ${selected ? "border-foreground bg-foreground text-background" : "text-transparent"}`}>
                          <Check className="h-3 w-3" />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ) : null}
            <FormField
              control={form.control}
              name="name_ar"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Arabic Name</FormLabel>
                  <FormControl>
                    <Input placeholder="العناية بالشعر" {...field} />
                  </FormControl>
                  <FormDescription>
                    This is shown in Arabic-facing experiences and translations.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="image"
              render={() => (
                <FormItem>
                  <FormLabel>Niche Image</FormLabel>
                  <FormControl>
                    <FileUploader
                      maxSize={25 * 1024 * 1024}
                      accept={{ "image/*": [".png", ".jpeg", ".jpg", ".webp", ".svg"] }}
                      progresses={progresses}
                      onUpload={handleUpload}
                      disabled={isUploading}
                    />
                  </FormControl>
                  <FormDescription>
                    Upload a square or portrait visual that represents this niche.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button disabled={!image || loading || isUploading} type="submit">
              {loading && <Loader2 className="animate-spin" />}
              {loading ? "Saving..." : "Save niche"}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
