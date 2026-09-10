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
import { toast } from 'sonner';
import { saveDriverAccount } from '../actions';
import { Item, name_plural, title_singular } from '../_constant';
import { useRouter } from 'next/navigation';
import {
  EMAIL_ALREADY_IN_USE_MESSAGE,
} from '@/lib/form-errors';
import { ResetAccessCode } from '@/components/accounts/reset-access-code';


const formSchema = z.object({
  firstname: z.string().min(2, {
    message: "name must be at least 2 characters.",
  }),
  lastname: z.string().min(2, {
    message: "name must be at least 2 characters.",
  }),
  email: z.string().trim().email({
    message: "Email must be valid."
  }).transform((value) => value.toLowerCase()),
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
      firstname: initialData?.firstname ?? "",
      lastname: initialData?.lastname ?? "",
      email: initialData?.email ?? "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true)
    form.clearErrors('email')
    try {
      const result = await saveDriverAccount(initialData?.id, values)
      if (result.ok === false) {
        if (result.code === 'EMAIL_ALREADY_IN_USE') {
          form.setError('email', { type: 'server', message: EMAIL_ALREADY_IN_USE_MESSAGE }, { shouldFocus: true })
          toast.error(EMAIL_ALREADY_IN_USE_MESSAGE)
        } else {
          toast.error(`Failed to save ${title_singular.toLowerCase()}. Please try again.`)
        }
        return
      }

      if (!initialData) form.reset()
      router.replace(`/${name_plural}`)
      toast.success(`${title_singular} saved successfully.`)
    } finally {
      setLoading(false)
    }
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
                name="firstname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
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
                name="lastname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="" {...field} />
                    </FormControl>
                    <FormDescription>
                      This is your public display last name.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
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
            {initialData ? (
              <div className="mt-6">
                <ResetAccessCode
                  account="driver"
                  accountId={initialData.id}
                  email={initialData.email}
                />
              </div>
            ) : null}
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
