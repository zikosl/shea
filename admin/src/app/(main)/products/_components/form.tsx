'use client';

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

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { redirect } from 'next/navigation';
import { toast } from 'sonner';
import { createItem, updateItem } from '../actions';
import { Item, link, name_plural, title_singular } from '../_constant';
import { useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"


const formSchema = z.object({
  name: z.string().min(2, {
    message: "name must be at least 2 characters.",
  }),
  name_ar: z.string().min(2, {
    message: "name must be at least 2 characters.",
  }),
  category_id: z.string({
    required_error: 'category must be specified'
  })
})

export default function ItemForm({
  initialData,
  data,
  pageTitle
}: {
  initialData: Item | null;
  pageTitle: string;
  data: { id: string; name: string }[]
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      name_ar: initialData?.name_ar ?? "",
      category_id: initialData?.category_id ?? "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    // Do something with the form values.
    // ✅ This will be type-safe and validated.
    setLoading(true)
    const data: any = {
      ...values
    }
    if (!isNaN(Number(values.category_id))) {
      data.category_id = parseInt(values.category_id)
    }
    if (initialData) {
      await updateItem(initialData.id, data)
    }
    else {
      await createItem(data)
      form.reset()
    }
    router.replace(`/${link}`)
    toast.success(`${title_singular} saved successfully.`)
    setLoading(false)
  }
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 mx-auto">
        <Card className="w-[300px] md:w-[600px] mx-auto">
          <CardHeader>
            <CardTitle>{pageTitle}</CardTitle>
          </CardHeader>
          <CardContent>
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
              name="name_ar"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Arabic Name</FormLabel>
                  <FormControl>
                    <Input placeholder="" {...field} />
                  </FormControl>
                  <FormDescription>
                    This is your public display arabic name.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {
                        data.map(v => <SelectItem key={v.id} value={v.id.toString()}>{v.name}</SelectItem>)
                      }
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select A category related to this product
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button disabled={loading} type="submit">
              {loading && <Loader2 className="animate-spin" />}
              {loading ? "Loading..." : "Submit"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
