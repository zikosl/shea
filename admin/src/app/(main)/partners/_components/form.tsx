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
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useState } from 'react';
import { Check, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { createItem, updateItem } from '../actions';
import { Item, name_plural, title_singular } from '../_constant';
import { useRouter } from 'next/navigation';


const formSchema = z.object({
  companyName: z.string().min(2, {
    message: "Company name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Email must be valid.",
  }),
  feeType: z.enum(["NONE", "PERCENTAGE", "FIXED", "MIXED"]).default("NONE"),
  feeRate: z.coerce.number().min(0).max(100).default(0),
  fixedFee: z.coerce.number().min(0).default(0),
  niches: z.array(z.number()).default([]),
})

export default function ItemForm({
  initialData,
  niches,
  pageTitle
}: {
  initialData: Item | null;
  niches: Niche[];
  pageTitle: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: initialData?.companyName ?? "",
      email: initialData?.email ?? "",
      feeType: initialData?.feeType ?? "NONE",
      feeRate: initialData?.feeRate ?? 0,
      fixedFee: initialData?.fixedFee ?? 0,
      niches: initialData?.niches ?? [],
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true)
    try {
      if (initialData) {
        await updateItem(initialData.id, values)
      }
      else {
        await createItem(values)
        form.reset()
      }
      router.replace(`/${name_plural}`)
      toast.success(`${title_singular} saved successfully.`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to save ${title_singular.toLowerCase()}.`)
    } finally {
      setLoading(false)
    }
  }
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="mx-auto flex w-full max-w-3xl flex-1">
        <Card className="w-full">
          <CardHeader className="space-y-2">
            <Badge variant="outline" className="w-fit gap-1.5 rounded-full px-3 py-1">
              <Sparkles className="h-3.5 w-3.5" />
              Partner access
            </Badge>
            <CardTitle>{pageTitle}</CardTitle>
            <p className="text-sm text-muted-foreground">
              Manage the partner identity and assign the niches they can operate in.
            </p>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="grid w-full items-start gap-4 md:grid-cols-2">
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
                      The company name shown across partner workflows.
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
                      Used for login and invite delivery.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="rounded-2xl border bg-muted/30 p-4">
              <div className="mb-4">
                <FormLabel>Partner fees</FormLabel>
                <FormDescription>
                  Snapshot these fees on every order to calculate Shea benefit and partner net revenue.
                </FormDescription>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="feeType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fee type</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        >
                          <option value="NONE">No fee</option>
                          <option value="PERCENTAGE">Percentage</option>
                          <option value="FIXED">Fixed</option>
                          <option value="MIXED">Mixed</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="feeRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rate %</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" min="0" max="100" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fixedFee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fixed fee DZD</FormLabel>
                      <FormControl>
                        <Input type="number" step="1" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="niches"
              render={({ field }) => {
                const selected = new Set(field.value ?? []);

                const toggleNiche = (nicheId: number) => {
                  const next = new Set(selected);
                  if (next.has(nicheId)) {
                    next.delete(nicheId);
                  } else {
                    next.add(nicheId);
                  }
                  field.onChange(Array.from(next));
                };

                return (
                  <FormItem>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <FormLabel>Assigned niches</FormLabel>
                        <FormDescription>
                          Select the catalog niches this partner can manage and sell from.
                        </FormDescription>
                      </div>
                      <Badge variant="secondary" className="rounded-full">
                        {selected.size} selected
                      </Badge>
                    </div>
                    <FormControl>
                      {niches.length > 0 ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                          {niches.map((niche) => {
                            const nicheId = Number(niche.id);
                            const isSelected = selected.has(nicheId);

                            return (
                              <button
                                key={niche.id}
                                type="button"
                                onClick={() => toggleNiche(nicheId)}
                                className={cn(
                                  "group flex min-h-20 items-start justify-between gap-4 rounded-2xl border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-foreground/30 hover:shadow-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/35",
                                  isSelected && "border-foreground bg-muted shadow-sm"
                                )}
                              >
                                <span>
                                  <span className="block text-sm font-medium text-foreground">
                                    {niche.name}
                                  </span>
                                  <span className="mt-1 block text-xs text-muted-foreground">
                                    {niche.name_ar || "No Arabic label"}
                                  </span>
                                </span>
                                <span
                                  className={cn(
                                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-transparent transition-colors",
                                    isSelected
                                      ? "border-foreground bg-foreground text-background"
                                      : "border-border bg-background group-hover:border-foreground/40"
                                  )}
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                          No niches found. Create a niche first, then assign it to this partner.
                        </div>
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button disabled={loading} type="submit">
              {loading && <Loader2 className="animate-spin" />}
              {loading ? "Saving..." : "Save partner"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
