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
import { AspectRatio } from "@/components/ui/aspect-ratio"

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createItem, updateItem } from '../actions';
import { Item, name_plural, title_singular } from '../_constant';
import { useRouter } from 'next/navigation';
import { FileUploader } from '@/components/ui/file-upload';
import { useUploadFile } from '@/hooks/use-upload-file';
import { FILE_UPLOAD } from '@/api/mutations';
import Image from 'next/image';

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

  const loaderProp = ({ src }) => {
    return src;
  }

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      image: initialData?.image ?? "",
    },
  })
  const [image, setImage] = useState(initialData?.image ? process.env.NEXT_PUBLIC_PUBLIC_URL + initialData?.image : "")

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

  const { uploadFiles, progresses, isUploading, uploadedFiles } = useUploadFile(FILE_UPLOAD)

  useEffect(() => {
    if (uploadedFiles.length > 0) {
      form.setValue("image", uploadedFiles[uploadedFiles.length - 1].url)
      setImage(process.env.NEXT_PUBLIC_PUBLIC_URL + uploadedFiles[uploadedFiles.length - 1].url)
    }
  }
    , [uploadedFiles, form])
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-1 space-y-8 mx-auto">
        <div className="flex flex-row">
          <div className="w-[300px] h-[300px] p-4">
            {image && <Image loader={loaderProp} width="450" height="450" src={image} alt="Image" className="rounded-md object-cover" />}
          </div>
          <div className="flex-1 gap-4 flex flex-col">
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
                    This is your public display name.
                  </FormDescription>
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
                      onUpload={uploadFiles}
                      disabled={isUploading}
                    />
                  </FormControl>
                  <FormDescription>
                    This is your public display Image.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button disabled={!image || loading} type="submit">
              {loading && <Loader2 className="animate-spin" />}
              {loading ? "Loading..." : "Submit"}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
