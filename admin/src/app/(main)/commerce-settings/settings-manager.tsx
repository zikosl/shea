"use client";

import { useState, useTransition } from "react";
import { Clock3, Coins, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { addSchedule, PricingItem, PricingName, removeSchedule, savePricing, ScheduleItem } from "./actions";

const pricingDefinitions: Array<{ name: PricingName; label: string; description: string }> = [
  { name: "APP_TAX", label: "Platform fee", description: "Application fee added to an order." },
  { name: "STORE_TAX", label: "Store fee", description: "Store-side service amount added at checkout." },
  { name: "NORMAL_DELIVERY_TAX", label: "Standard delivery", description: "Default fee for a regular delivery." },
  { name: "GROUP_DELIVERY_TAX", label: "Grouped delivery", description: "Fee used when deliveries are grouped." },
  { name: "PICKUP_TAX", label: "Pickup", description: "Fee applied when the customer collects an order." },
];

export default function SettingsManager({ pricing, schedules }: { pricing: PricingItem[]; schedules: ScheduleItem[] }) {
  const [isPending, startTransition] = useTransition();
  const [editingPrice, setEditingPrice] = useState<(typeof pricingDefinitions)[number] | null>(null);
  const [price, setPrice] = useState("");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [time, setTime] = useState("");
  const [deletingSchedule, setDeletingSchedule] = useState<ScheduleItem | null>(null);

  function run(action: () => Promise<void>, success: string, close?: () => void) {
    startTransition(async () => {
      try {
        await action();
        close?.();
        toast.success(success);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "The setting could not be saved");
      }
    });
  }

  function openPrice(definition: (typeof pricingDefinitions)[number]) {
    setEditingPrice(definition);
    setPrice(String(pricing.find((item) => item.name === definition.name)?.price ?? 0));
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,.65fr)]">
      <Card>
        <CardHeader className="border-b"><div className="flex items-start gap-3"><div className="rounded-lg border bg-muted p-2"><Coins className="h-4 w-4" /></div><div><CardTitle className="text-base">Order pricing</CardTitle><CardDescription className="mt-1">Flat amounts used by checkout and order calculations.</CardDescription></div></div></CardHeader>
        <CardContent className="p-0">
          {pricingDefinitions.map((definition, index) => {
            const item = pricing.find((candidate) => candidate.name === definition.name);
            return <div key={definition.name} className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between ${index ? "border-t" : ""}`}><div><div className="flex items-center gap-2"><p className="font-medium">{definition.label}</p>{!item ? <Badge variant="outline">Not configured</Badge> : null}</div><p className="mt-1 text-sm text-muted-foreground">{definition.description}</p></div><div className="flex items-center gap-3"><span className="min-w-24 text-right text-lg font-semibold tabular-nums">{item?.price ?? 0} DZD</span><Button type="button" variant="outline" size="icon" onClick={() => openPrice(definition)} aria-label={`Edit ${definition.label}`}><Pencil /></Button></div></div>;
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b"><div className="flex items-start justify-between gap-3"><div className="flex items-start gap-3"><div className="rounded-lg border bg-muted p-2"><Clock3 className="h-4 w-4" /></div><div><CardTitle className="text-base">Delivery times</CardTitle><CardDescription className="mt-1">Times customers can choose for delivery.</CardDescription></div></div><Button type="button" size="icon" onClick={() => setScheduleOpen(true)} aria-label="Add delivery time"><Plus /></Button></div></CardHeader>
        <CardContent className="p-0">
          {schedules.length ? schedules.map((schedule, index) => <div key={schedule.id} className={`flex items-center justify-between p-4 ${index ? "border-t" : ""}`}><div><p className="font-medium tabular-nums">{schedule.time}</p><p className="text-xs text-muted-foreground">Available to customers</p></div><Button type="button" variant="ghost" size="icon" disabled={isPending} onClick={() => setDeletingSchedule(schedule)} aria-label={`Remove ${schedule.time}`}><Trash2 /></Button></div>) : <div className="p-8 text-center"><Clock3 className="mx-auto h-5 w-5 text-muted-foreground" /><p className="mt-3 font-medium">No delivery times</p><p className="mt-1 text-sm text-muted-foreground">Add the first selectable time.</p></div>}
        </CardContent>
      </Card>

      <Dialog open={Boolean(editingPrice)} onOpenChange={(open) => !open && setEditingPrice(null)}>
        <DialogContent><DialogHeader><DialogTitle>Edit {editingPrice?.label}</DialogTitle><DialogDescription>{editingPrice?.description} Enter a flat amount in DZD.</DialogDescription></DialogHeader><div className="space-y-2"><Label htmlFor="price">Amount</Label><div className="relative"><Input id="price" inputMode="numeric" type="number" min="0" step="1" value={price} onChange={(event) => setPrice(event.target.value)} className="pr-14" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">DZD</span></div></div><DialogFooter><Button type="button" variant="outline" onClick={() => setEditingPrice(null)}>Cancel</Button><Button type="button" disabled={isPending || price === ""} onClick={() => editingPrice && run(() => savePricing(editingPrice.name, Number(price)), "Pricing updated", () => setEditingPrice(null))}>{isPending && <Loader2 className="animate-spin" />} Save amount</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent><DialogHeader><DialogTitle>Add delivery time</DialogTitle><DialogDescription>Add a 24-hour time customers can select during checkout.</DialogDescription></DialogHeader><div className="space-y-2"><Label htmlFor="time">Time</Label><Input id="time" type="time" value={time} onChange={(event) => setTime(event.target.value)} /></div><DialogFooter><Button type="button" variant="outline" onClick={() => setScheduleOpen(false)}>Cancel</Button><Button type="button" disabled={isPending || !time} onClick={() => run(() => addSchedule(time), "Delivery time added", () => { setScheduleOpen(false); setTime(""); })}>{isPending && <Loader2 className="animate-spin" />} Add time</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={Boolean(deletingSchedule)} onOpenChange={(open) => !open && setDeletingSchedule(null)}>
        <DialogContent><DialogHeader><DialogTitle>Remove {deletingSchedule?.time}?</DialogTitle><DialogDescription>Customers will no longer be able to select this delivery time.</DialogDescription></DialogHeader><DialogFooter><Button type="button" variant="outline" onClick={() => setDeletingSchedule(null)}>Cancel</Button><Button type="button" variant="destructive" disabled={isPending} onClick={() => deletingSchedule && run(() => removeSchedule(deletingSchedule.id), "Delivery time removed", () => setDeletingSchedule(null))}>{isPending && <Loader2 className="animate-spin" />} Remove time</Button></DialogFooter></DialogContent>
      </Dialog>
    </div>
  );
}
