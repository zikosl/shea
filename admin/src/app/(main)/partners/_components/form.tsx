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
import { savePartnerAccount, savePartnerCapabilities } from '../actions';
import { Item, name_plural, title_singular } from '../_constant';
import { useRouter } from 'next/navigation';
import {
  EMAIL_ALREADY_IN_USE_MESSAGE,
} from '@/lib/form-errors';
import { ResetAccessCode } from '@/components/accounts/reset-access-code';
import { CapabilityInfo } from '@/components/capabilities/capability-info';


const formSchema = z.object({
  companyName: z.string().min(2, {
    message: "Company name must be at least 2 characters.",
  }),
  email: z.string().trim().email({
    message: "Email must be valid.",
  }).transform((value) => value.toLowerCase()),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, {
    message: "Use a valid hex color such as #CC6F98.",
  }).transform((value) => value.toUpperCase()),
  feeType: z.enum(["NONE", "PERCENTAGE", "FIXED", "MIXED"]).default("NONE"),
  feeRate: z.coerce.number().min(0).max(100).default(0),
  fixedFee: z.coerce.number().min(0).default(0),
  driverRequestFee: z.number().min(0).nullable(),
  niches: z.array(z.number()).default([]),
})

export default function ItemForm({
  initialData,
  niches,
  capabilities,
  pageTitle
}: {
  initialData: Item | null;
  niches: Niche[];
  capabilities: PartnerCapabilityConfig | null;
  pageTitle: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const inherited = new Map(capabilities?.effective.map((item) => [item.code, item.enabled]) ?? []);
  const initialOverrides = Object.fromEntries(
    (capabilities?.catalog ?? []).map((code) => [
      code,
      capabilities?.overrides.find((item) => item.capability === code)?.effect ?? null,
    ]),
  ) as Record<CapabilityCode, CapabilityOverrideEffect | null>;
  const [capabilityOverrides, setCapabilityOverrides] = useState(initialOverrides);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: initialData?.companyName ?? "",
      email: initialData?.email ?? "",
      primaryColor: initialData?.primaryColor ?? "#CC6F98",
      feeType: initialData?.feeType ?? "NONE",
      feeRate: initialData?.feeRate ?? 0,
      fixedFee: initialData?.fixedFee ?? 0,
      driverRequestFee: initialData?.driverRequestFee ?? null,
      niches: initialData?.niches ?? [],
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true)
    form.clearErrors('email')
    try {
      const result = await savePartnerAccount(initialData?.id, values)
      if (result.ok === false) {
        if (result.code === 'EMAIL_ALREADY_IN_USE') {
          form.setError('email', { type: 'server', message: EMAIL_ALREADY_IN_USE_MESSAGE }, { shouldFocus: true })
          toast.error(EMAIL_ALREADY_IN_USE_MESSAGE)
        } else {
          toast.error(`Failed to save ${title_singular.toLowerCase()}. Please try again.`)
        }
        return
      }

      if (initialData) {
        await savePartnerCapabilities(initialData.id, capabilityOverrides)
      }
      else {
        if (result.item?.id && Object.keys(capabilityOverrides).length) {
          await savePartnerCapabilities(result.item.id, capabilityOverrides)
        }
        form.reset()
      }
      router.replace(`/${name_plural}`)
      toast.success(`${title_singular} saved successfully.`)
    } catch {
      toast.error(`The ${title_singular.toLowerCase()} was saved, but its access settings could not be updated.`)
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

            <FormField
              control={form.control}
              name="primaryColor"
              render={({ field }) => (
                <FormItem className="rounded-2xl border bg-muted/20 p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <FormLabel>Partner app color</FormLabel>
                      <FormDescription>
                        Controls the primary actions and highlights in the partner application.
                      </FormDescription>
                    </div>
                    <div className="flex items-center gap-3">
                      <FormControl>
                        <input
                          type="color"
                          aria-label="Choose partner app color"
                          className="h-11 w-14 cursor-pointer rounded-lg border bg-background p-1"
                          value={field.value}
                          onChange={(event) => field.onChange(event.target.value.toUpperCase())}
                        />
                      </FormControl>
                      <div
                        className="h-11 w-24 rounded-xl border shadow-sm"
                        style={{ backgroundColor: field.value }}
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                  <FormControl>
                    <Input
                      {...field}
                      className="max-w-48 font-mono uppercase"
                      maxLength={7}
                      spellCheck={false}
                      onChange={(event) => field.onChange(event.target.value.toUpperCase())}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
              <FormField
                control={form.control}
                name="driverRequestFee"
                render={({ field }) => {
                  const inheritsGlobalFee = field.value === null;
                  return (
                    <FormItem className="mt-5 rounded-xl border bg-background p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <FormLabel>Driver request fee</FormLabel>
                          <FormDescription>
                            Inherit the global price or set a custom fee for this partner.
                          </FormDescription>
                        </div>
                        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                          <input
                            type="checkbox"
                            checked={inheritsGlobalFee}
                            onChange={(event) => field.onChange(event.target.checked ? null : 0)}
                            className="h-4 w-4 accent-primary"
                          />
                          Use global fee
                        </label>
                      </div>
                      {!inheritsGlobalFee && (
                        <FormControl>
                          <Input
                            type="number"
                            step="1"
                            min="0"
                            value={field.value ?? 0}
                            onChange={(event) => field.onChange(Number(event.target.value))}
                            className="mt-3 max-w-xs"
                          />
                        </FormControl>
                      )}
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
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

            {capabilities?.catalog.length ? (
              <section className="space-y-4 rounded-2xl border bg-muted/20 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <FormLabel>Business capabilities</FormLabel>
                    <FormDescription>
                      Inherit niche defaults or override individual modules for this partner.
                    </FormDescription>
                  </div>
                  <Badge variant="secondary" className="rounded-full">
                    {capabilities.catalog.filter((code) => {
                      const override = capabilityOverrides[code];
                      return override ? override === "ENABLE" : inherited.get(code);
                    }).length} enabled
                  </Badge>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {capabilities.catalog.map((code) => {
                    const override = capabilityOverrides[code];
                    const isEnabled = override ? override === "ENABLE" : Boolean(inherited.get(code));
                    return (
                      <div key={code} className="flex items-center justify-between gap-4 rounded-xl border bg-background p-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate text-sm font-medium">{code.replaceAll("_", " ").toLowerCase()}</p>
                            <CapabilityInfo
                              code={code}
                              enabled={isEnabled}
                              source={override ? "override" : "inherited"}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {override ? `Forced ${override.toLowerCase()}` : `Inherited ${isEnabled ? "on" : "off"}`}
                          </p>
                        </div>
                        <select
                          aria-label={`${code} capability`}
                          value={override ?? "INHERIT"}
                          onChange={(event) => setCapabilityOverrides((current) => ({
                            ...current,
                            [code]: event.target.value === "INHERIT"
                              ? null
                              : event.target.value as CapabilityOverrideEffect,
                          }))}
                          className="h-9 rounded-md border border-input bg-background px-2 text-xs capitalize"
                        >
                          <option value="INHERIT">Inherit</option>
                          <option value="ENABLE">Enabled</option>
                          <option value="DISABLE">Disabled</option>
                        </select>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}
            {initialData ? (
              <ResetAccessCode
                account="partner"
                accountId={initialData.id}
                email={initialData.email}
              />
            ) : null}
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
