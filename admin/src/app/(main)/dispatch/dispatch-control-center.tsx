"use client";

import { startTransition, useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Bike,
  Building2,
  CheckCircle2,
  Clock3,
  ExternalLink,
  LocateFixed,
  MapPin,
  Navigation,
  Phone,
  RefreshCw,
  Search,
  Send,
  UserRound,
  UsersRound,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import {
  assignDelivery,
  getDispatchBoard,
  offerDelivery,
  unassignDelivery,
  type DispatchBoard,
  type DispatchDriver,
  type DispatchOrder,
} from "./actions";

const STATE_LABELS = {
  AVAILABLE: "Available",
  IN_DELIVERY: "In delivery",
  UNAVAILABLE: "Unavailable",
  OFFLINE: "Offline",
  STALE: "Location stale",
} as const;

const STATUS_LABELS = { READY: "Waiting for rider", ASSIGNED: "Rider assigned", PICKED: "On the way" } as const;

function money(value: number) {
  return new Intl.NumberFormat("en-DZ", { style: "currency", currency: "DZD", maximumFractionDigits: 0 }).format(value);
}

function elapsed(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function distanceKm(order: DispatchOrder, driver: DispatchDriver) {
  const toRadians = (value: number) => value * Math.PI / 180;
  const dLat = toRadians(driver.latitude - order.partnerLatitude);
  const dLng = toRadians(driver.longitude - order.partnerLongitude);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(order.partnerLatitude)) * Math.cos(toRadians(driver.latitude)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function StateDot({ state }: { state: DispatchDriver["state"] }) {
  return <span className={cn("h-2.5 w-2.5 rounded-full", state === "AVAILABLE" && "bg-emerald-500", state === "IN_DELIVERY" && "bg-blue-500", state === "UNAVAILABLE" && "bg-amber-500", state === "STALE" && "bg-orange-500", state === "OFFLINE" && "bg-muted-foreground/45")} />;
}

function OperationalMap({ order, drivers, selectedDriverId, onSelectDriver }: { order?: DispatchOrder; drivers: DispatchDriver[]; selectedDriverId?: number; onSelectDriver: (id: number) => void }) {
  const points = [
    ...(order ? [{ id: "store", latitude: order.partnerLatitude, longitude: order.partnerLongitude }] : []),
    ...(order?.destinationLatitude != null && order.destinationLongitude != null ? [{ id: "customer", latitude: order.destinationLatitude, longitude: order.destinationLongitude }] : []),
    ...drivers.filter((driver) => !(driver.latitude === 0 && driver.longitude === 0)).map((driver) => ({ id: `driver-${driver.userId}`, latitude: driver.latitude, longitude: driver.longitude })),
  ];
  const lats = points.map((point) => point.latitude);
  const lngs = points.map((point) => point.longitude);
  const minLat = Math.min(...lats, 35.5);
  const maxLat = Math.max(...lats, 37.2);
  const minLng = Math.min(...lngs, 2.3);
  const maxLng = Math.max(...lngs, 4.2);
  const position = (latitude: number, longitude: number) => ({
    left: `${10 + ((longitude - minLng) / Math.max(maxLng - minLng, 0.01)) * 80}%`,
    top: `${10 + (1 - (latitude - minLat) / Math.max(maxLat - minLat, 0.01)) * 80}%`,
  });
  const storePosition = order ? position(order.partnerLatitude, order.partnerLongitude) : undefined;
  const customerPosition = order?.destinationLatitude != null && order.destinationLongitude != null ? position(order.destinationLatitude, order.destinationLongitude) : undefined;

  return (
    <div className="relative min-h-[430px] overflow-hidden rounded-2xl border bg-[radial-gradient(circle_at_25%_18%,hsl(var(--primary)/0.1),transparent_24%),linear-gradient(135deg,hsl(var(--muted)/0.3),hsl(var(--background)))]">
      <div className="absolute inset-0 opacity-55 [background-image:linear-gradient(hsl(var(--border))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border))_1px,transparent_1px)] [background-size:46px_46px]" />
      {storePosition && customerPosition ? <svg className="pointer-events-none absolute inset-0 h-full w-full"><line x1={storePosition.left} y1={storePosition.top} x2={customerPosition.left} y2={customerPosition.top} stroke="currentColor" strokeWidth="2" strokeDasharray="7 7" className="text-primary/50" /></svg> : null}
      {!order ? <div className="absolute inset-0 flex flex-col items-center justify-center text-center"><LocateFixed className="mb-3 h-8 w-8 text-muted-foreground" /><p className="font-medium">Select an order to inspect its route</p><p className="mt-1 text-sm text-muted-foreground">Live rider positions remain visible around the active delivery.</p></div> : null}
      {order && storePosition ? <div className="absolute z-20 -translate-x-1/2 -translate-y-1/2" style={storePosition}><div className="flex h-11 w-11 items-center justify-center rounded-2xl border-4 border-background bg-foreground text-background shadow-lg"><Building2 className="h-5 w-5" /></div><span className="mt-1 block max-w-28 truncate rounded-md bg-background/90 px-2 py-1 text-center text-[10px] font-semibold shadow">{order.partnerName}</span></div> : null}
      {order && customerPosition ? <div className="absolute z-20 -translate-x-1/2 -translate-y-1/2" style={customerPosition}><div className="flex h-11 w-11 items-center justify-center rounded-full border-4 border-background bg-primary text-primary-foreground shadow-lg"><MapPin className="h-5 w-5" /></div><span className="mt-1 block max-w-28 truncate rounded-md bg-background/90 px-2 py-1 text-center text-[10px] font-semibold shadow">Customer</span></div> : null}
      {drivers.filter((driver) => !(driver.latitude === 0 && driver.longitude === 0)).map((driver) => <button key={driver.userId} type="button" onClick={() => onSelectDriver(driver.userId)} className={cn("absolute z-30 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-background p-2 shadow-md transition-transform hover:scale-110", driver.state === "AVAILABLE" ? "bg-emerald-500 text-white" : driver.state === "IN_DELIVERY" ? "bg-blue-500 text-white" : "bg-muted text-muted-foreground", selectedDriverId === driver.userId && "ring-4 ring-primary/25")} style={position(driver.latitude, driver.longitude)} title={`${driver.name} · ${STATE_LABELS[driver.state]}`}><Bike className="h-4 w-4" /></button>)}
      <div className="absolute bottom-4 left-4 z-40 flex flex-wrap gap-2 rounded-xl border bg-background/90 p-2 text-[11px] shadow-sm backdrop-blur"><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" />Available</span><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-500" />Delivering</span><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-muted-foreground" />Unavailable</span></div>
    </div>
  );
}

export function DispatchControlCenter({ initialBoard }: { initialBoard: DispatchBoard }) {
  const [board, setBoard] = useState(initialBoard);
  const [selectedOrderId, setSelectedOrderId] = useState(initialBoard.orders[0]?.orderId);
  const [selectedDriverId, setSelectedDriverId] = useState<number>();
  const [orderFilter, setOrderFilter] = useState("ALL");
  const [driverFilter, setDriverFilter] = useState("ALL");
  const [query, setQuery] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const selectedOrder = board.orders.find((order) => order.orderId === selectedOrderId) ?? board.orders[0];
  const selectedDriver = board.drivers.find((driver) => driver.userId === selectedDriverId);
  const visibleOrders = board.orders.filter((order) => (orderFilter === "ALL" || (orderFilter === "ATTENTION" ? order.needsAttention : order.status === orderFilter)) && `${order.orderId} ${order.partnerName} ${order.clientName}`.toLowerCase().includes(query.toLowerCase()));
  const rankedDrivers = board.drivers.filter((driver) => driverFilter === "ALL" || driver.state === driverFilter).sort((left, right) => selectedOrder ? distanceKm(selectedOrder, left) - distanceKm(selectedOrder, right) : left.name.localeCompare(right.name));

  const refresh = async (quiet = false) => {
    try {
      const next = await getDispatchBoard();
      setBoard(next);
      if (!quiet) toast.success("Dispatch board refreshed");
    } catch (error) {
      if (!quiet) toast.error(error instanceof Error ? error.message : "Could not refresh dispatch data");
    }
  };

  useEffect(() => {
    const timer = window.setInterval(() => startTransition(() => { void refresh(true); }), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  const run = async (operation: () => Promise<void>, success: string) => {
    setBusy(true);
    try {
      await operation();
      await refresh(true);
      toast.success(success);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Dispatch action failed");
    } finally {
      setBusy(false);
    }
  };

  const available = board.drivers.filter((driver) => driver.state === "AVAILABLE").length;
  const active = board.orders.filter((order) => order.status !== "READY").length;
  const attention = board.orders.filter((order) => order.needsAttention).length;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Waiting</p><p className="mt-1 text-2xl font-semibold">{board.orders.length - active}</p></div><Clock3 className="h-5 w-5 text-amber-500" /></CardContent></Card>
        <Card><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Needs action</p><p className="mt-1 text-2xl font-semibold">{attention}</p></div><AlertTriangle className="h-5 w-5 text-destructive" /></CardContent></Card>
        <Card><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Active routes</p><p className="mt-1 text-2xl font-semibold">{active}</p></div><Navigation className="h-5 w-5 text-blue-500" /></CardContent></Card>
        <Card><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Riders ready</p><p className="mt-1 text-2xl font-semibold">{available}</p></div><UsersRound className="h-5 w-5 text-emerald-500" /></CardContent></Card>
      </div>

      <div className="grid min-h-[720px] gap-4 xl:grid-cols-[330px_minmax(0,1fr)_370px]">
        <Card className="overflow-hidden"><CardHeader className="space-y-3 border-b p-4"><div className="flex items-center justify-between"><CardTitle className="text-base">Delivery queue</CardTitle><Button variant="ghost" size="icon" onClick={() => void refresh()} disabled={busy}><RefreshCw className="h-4 w-4" /></Button></div><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Order, customer or store" className="pl-9" /></div><Select value={orderFilter} onValueChange={setOrderFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">All active orders</SelectItem><SelectItem value="ATTENTION">Needs attention</SelectItem><SelectItem value="READY">Waiting for rider</SelectItem><SelectItem value="ASSIGNED">Assigned</SelectItem><SelectItem value="PICKED">On the way</SelectItem></SelectContent></Select></CardHeader><ScrollArea className="h-[590px]"><div className="space-y-2 p-3">{visibleOrders.map((order) => <button type="button" key={order.orderId} onClick={() => { setSelectedOrderId(order.orderId); setSelectedDriverId(order.assignedDriverId ?? undefined); }} className={cn("w-full rounded-xl border p-3 text-left transition-colors hover:bg-muted/40", selectedOrder?.orderId === order.orderId && "border-primary bg-primary/5")}><div className="flex items-center justify-between"><span className="font-semibold">Order #{order.orderId}</span><span className="text-xs text-muted-foreground">{elapsed(order.createdAt)}</span></div><p className="mt-2 truncate text-sm">{order.partnerName} <ArrowRight className="inline h-3 w-3" /> {order.clientName}</p><div className="mt-3 flex items-center justify-between"><Badge variant={order.needsAttention ? "destructive" : "secondary"}>{STATUS_LABELS[order.status]}</Badge><span className="text-sm font-medium">{money(order.total)}</span></div></button>)}{visibleOrders.length === 0 ? <div className="py-16 text-center text-sm text-muted-foreground"><CheckCircle2 className="mx-auto mb-3 h-7 w-7" />No matching deliveries</div> : null}</div></ScrollArea></Card>

        <div className="space-y-4"><Card><CardHeader className="flex flex-row items-center justify-between p-4"><div><CardTitle className="text-base">Live dispatch map</CardTitle><p className="mt-1 text-xs text-muted-foreground">Relative operational view · refreshed every 15 seconds</p></div>{selectedOrder?.destinationLatitude != null && selectedOrder.destinationLongitude != null ? <Button variant="outline" size="sm" asChild><a href={`https://www.google.com/maps/dir/?api=1&origin=${selectedOrder.partnerLatitude},${selectedOrder.partnerLongitude}&destination=${selectedOrder.destinationLatitude},${selectedOrder.destinationLongitude}`} target="_blank" rel="noreferrer">Open route <ExternalLink className="h-3.5 w-3.5" /></a></Button> : null}</CardHeader><CardContent className="p-4 pt-0"><OperationalMap order={selectedOrder} drivers={board.drivers} selectedDriverId={selectedDriverId} onSelectDriver={setSelectedDriverId} /></CardContent></Card><Card><CardHeader className="flex flex-row items-center justify-between p-4"><CardTitle className="text-base">Rider availability</CardTitle><Select value={driverFilter} onValueChange={setDriverFilter}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">All riders</SelectItem>{Object.entries(STATE_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></CardHeader><CardContent className="grid max-h-56 gap-2 overflow-y-auto p-4 pt-0 sm:grid-cols-2">{rankedDrivers.map((driver) => <button type="button" key={driver.userId} onClick={() => setSelectedDriverId(driver.userId)} className={cn("flex items-center gap-3 rounded-xl border p-3 text-left hover:bg-muted/40", selectedDriverId === driver.userId && "border-primary bg-primary/5")}><StateDot state={driver.state} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{driver.name}</p><p className="text-xs text-muted-foreground">{STATE_LABELS[driver.state]}{selectedOrder && driver.latitude !== 0 ? ` · ${distanceKm(selectedOrder, driver).toFixed(1)} km` : ""}</p></div></button>)}</CardContent></Card></div>

        <Card className="overflow-hidden"><CardHeader className="border-b p-4"><CardTitle className="text-base">Dispatch decision</CardTitle><p className="mt-1 text-xs text-muted-foreground">Review both sides before assigning a rider.</p></CardHeader><ScrollArea className="h-[645px]"><CardContent className="space-y-5 p-4">{selectedOrder ? <><div className="rounded-xl border bg-muted/25 p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Order</p><p className="text-lg font-semibold">#{selectedOrder.orderId}</p></div><Badge variant={selectedOrder.needsAttention ? "destructive" : "secondary"}>{STATUS_LABELS[selectedOrder.status]}</Badge></div><div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><p className="text-xs text-muted-foreground">Waiting</p><p className="mt-1 font-medium">{elapsed(selectedOrder.createdAt)}</p></div><div><p className="text-xs text-muted-foreground">Offers</p><p className="mt-1 font-medium">{selectedOrder.activeOfferCount} live / {selectedOrder.dispatchCount} total</p></div></div></div><div className="space-y-3"><div className="flex gap-3"><Building2 className="mt-0.5 h-4 w-4 text-muted-foreground" /><div><p className="text-sm font-medium">{selectedOrder.partnerName}</p><p className="text-xs text-muted-foreground">{selectedOrder.partnerAddress || "Store address unavailable"}</p></div></div><div className="flex gap-3"><UserRound className="mt-0.5 h-4 w-4 text-muted-foreground" /><div><p className="text-sm font-medium">{selectedOrder.clientName}</p><p className="text-xs text-muted-foreground">{selectedOrder.destinationAddress || "Delivery address unavailable"}</p>{selectedOrder.clientPhone ? <a href={`tel:${selectedOrder.clientPhone}`} className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary"><Phone className="h-3 w-3" />{selectedOrder.clientPhone}</a> : null}</div></div></div><div><p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Order contents</p><div className="space-y-2 rounded-xl border p-3">{selectedOrder.items.map((item) => <div key={item.id} className="flex items-start justify-between gap-3 text-sm"><span>{item.quantity} × {item.name}</span><span className="shrink-0 font-medium">{money(item.price * item.quantity)}</span></div>)}<div className="flex justify-between border-t pt-2 font-semibold"><span>Total</span><span>{money(selectedOrder.total)}</span></div></div></div><div><p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Selected rider</p>{selectedDriver ? <div className="rounded-xl border p-3"><div className="flex items-center gap-3"><StateDot state={selectedDriver.state} /><div className="flex-1"><p className="text-sm font-medium">{selectedDriver.name}</p><p className="text-xs text-muted-foreground">{STATE_LABELS[selectedDriver.state]} · {distanceKm(selectedOrder, selectedDriver).toFixed(1)} km from store</p></div></div>{selectedDriver.state === "STALE" ? <div className="mt-3 flex gap-2 rounded-lg bg-orange-500/10 p-2 text-xs text-orange-700 dark:text-orange-300"><WifiOff className="h-4 w-4 shrink-0" />Location is missing or older than five minutes.</div> : null}</div> : <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">Select a rider on the map or list.</p>}</div><Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Operational note or required reason for override" className="min-h-20" /><div className="grid gap-2"><Button disabled={busy || selectedOrder.status !== "READY" || !selectedDriver || selectedDriver.state !== "AVAILABLE"} onClick={() => selectedDriver && void run(() => offerDelivery(selectedOrder.deliveryId, selectedDriver.userId), "Offer sent to rider")}><Send className="h-4 w-4" />Send offer</Button><Button variant="outline" disabled={busy || selectedOrder.status === "PICKED" || !selectedDriver || (!reason.trim() && selectedDriver.state !== "AVAILABLE")} onClick={() => selectedDriver && void run(() => assignDelivery(selectedOrder.deliveryId, selectedDriver.userId, selectedDriver.state !== "AVAILABLE", reason), "Rider assigned")}>Assign directly</Button>{selectedOrder.status === "ASSIGNED" ? <Button variant="destructive" disabled={busy || !reason.trim()} onClick={() => void run(() => unassignDelivery(selectedOrder.deliveryId, reason), "Delivery returned to the queue")}>Unassign rider</Button> : null}</div></> : <div className="py-20 text-center text-sm text-muted-foreground"><CheckCircle2 className="mx-auto mb-3 h-8 w-8" />No active delivery selected</div>}</CardContent></ScrollArea></Card>
      </div>
    </div>
  );
}
