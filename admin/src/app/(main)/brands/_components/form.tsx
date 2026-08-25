'use client';

import { Button } from '@/components/ui/button';
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
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createItem, updateItem } from '../actions';
import { Item, name_plural, title_singular } from '../_constant';
import { useRouter } from 'next/navigation';
import { FileUploader } from '@/components/ui/file-upload';
import { useUploadFile } from '@/hooks/use-upload-file';
import { FILE_UPLOAD } from '@/api/mutations';
import Image from 'next/image';
import { resolvePublicAssetUrl } from '@/constant';

const formSchema = z.object({
  name: z.string().min(2, {
    message: "name must be at least 2 characters.",
  }),
  image: z.string().min(2, {
    message: "image must be uploaded.",
  }),
})

export default function ItemForm({
  initialData,
  pageTitle
}: {
  initialData: Item | null;
  pageTitle: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      image: initialData?.image ?? "",
    },
  })
  const [image, setImage] = useState(() => resolvePublicAssetUrl(initialData?.image))

  async function onSubmit(values: z.infer<typeof formSchema>) {
    // Do something with the form values.
    // ✅ This will be type-safe and validated.
    setLoading(true)
    if (initialData) {
      await updateItem(initialData.id, values)
    }
    else {
      await createItem(values)
      form.reset()
    }
    router.replace(`/${name_plural}`)
    toast.success(`${title_singular} saved successfully.`)
    setLoading(false)
  }

  const { uploadFiles, progresses, isUploading } = useUploadFile(FILE_UPLOAD)

  async function handleUpload(files: File[]) {
    const uploadedFiles = await uploadFiles(files);
    const latestFile = uploadedFiles[uploadedFiles.length - 1];

    if (latestFile) {
      form.setValue("image", latestFile.url);
      setImage(resolvePublicAssetUrl(latestFile.url));
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="admin-surface mx-auto max-w-5xl p-5 sm:p-6">
        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="admin-muted-surface flex min-h-[280px] items-center justify-center p-6">
            {image ? (
              <Image
                unoptimized
                width={450}
                height={450}
                src={image}
                alt="Brand preview"
                className="max-h-56 w-auto rounded-2xl object-contain"
              />
            ) : (
              <div className="text-center">
                <p className="text-sm font-semibold">No image selected</p>
                <p className="mt-1 text-sm text-muted-foreground">Upload a clean brand mark or product logo.</p>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-5">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="" {...field} />
                  </FormControl>
                  <FormDescription>This name appears across catalog filters and product pages.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="image"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Brand Image</FormLabel>
                  <FormControl>

                    <FileUploader
                      maxSize={25 * 1024 * 1024}
                      onValueChange={(file) =>
                        field.onChange(file)
                      }
                      progresses={progresses}
                      onUpload={handleUpload}
                      disabled={isUploading}
                    />
                  </FormControl>
                  <FormDescription>
                    Upload a square or horizontal logo. Local files are served from /uploads.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button className="w-full sm:w-fit" disabled={!image || loading} type="submit">
              {loading && <Loader2 className="animate-spin" />}
              {loading ? "Saving..." : `Save ${title_singular}`}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
