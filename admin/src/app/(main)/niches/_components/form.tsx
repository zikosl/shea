'use client';

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
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
import { BusinessModuleSelector } from "@/components/capabilities/business-module-selector";
import { businessModuleCapabilities, businessModuleOrder, modulesFromCapabilities } from "@/lib/business-modules";

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
  capabilityConfig: {
    catalog: CapabilityCode[];
    inherited: CapabilityCode[];
    overrides: Array<{ capability: CapabilityCode; enabledByDefault: boolean }>;
  } | null;
  pageTitle: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState(() => resolvePublicAssetUrl(initialData?.image));
  const inheritedModules = modulesFromCapabilities(capabilityConfig?.inherited ?? []);
  const overrideMap = new Map(capabilityConfig?.overrides.map((item) => [item.capability, item.enabledByDefault]) ?? []);
  const [moduleChoices, setModuleChoices] = useState(() => Object.fromEntries(
    businessModuleOrder.map((module) => {
      const values = businessModuleCapabilities[module]
        .map((capability) => overrideMap.get(capability))
        .filter((value) => value !== undefined);
      return [module, values.some(Boolean) ? "ENABLE" : values.length ? "DISABLE" : "INHERIT"];
    }),
  ) as Record<BusinessModuleCode, BusinessModuleChoice>);

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
        await saveNicheCapabilities(initialData.id, moduleChoices);
      } else {
        const niche = await createItem(values);
        if (niche?.id) {
          await saveNicheCapabilities(niche.id, moduleChoices);
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
              <BusinessModuleSelector
                values={moduleChoices}
                onChange={setModuleChoices}
                allowInheritance
                inherited={Object.fromEntries(businessModuleOrder.map((module) => [module, inheritedModules.has(module)]))}
              />
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
