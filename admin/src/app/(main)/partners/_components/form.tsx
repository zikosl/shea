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
import { Item, name_plural, title_singular } from '../_constant';
import { useRouter } from 'next/navigation';


const formSchema = z.object({
  companyName: z.string().min(2, {
    message: "name must be at least 2 characters.",
  }),
  email: z.union([z.string().email({
    message: "email must be a valid."
  }), z.string().optional()]),
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
      companyName: initialData?.companyName ?? "",
      email: initialData?.email ?? "",
    },
  })

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
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-1 space-y-8 mx-auto">
        <Card className="w-[300px] md:w-[600px] mx-auto">
          <CardHeader>
            <CardTitle>{pageTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 w-full items-center gap-4">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                      <Input placeholder="" {...field} />
                    </FormControl>
                    <FormDescription>
                      This is your public display first name.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="" {...field} />
                    </FormControl>
                    <FormDescription>
                      This is your public display email.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
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
