"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Clipboard, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { markTestFlightInvitationSent, type TestFlightRequest } from "./actions";

export function TestFlightInbox({ requests }: { requests: TestFlightRequest[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<"REQUESTED" | "INVITED">("REQUESTED");
  const [confirm, setConfirm] = useState<TestFlightRequest | null>(null);
  const [busy, setBusy] = useState(false);
  const visible = requests.filter((item) => item.status === tab);
  const waiting = requests.filter((item) => item.status === "REQUESTED").length;

  async function copy(email: string) {
    try { await navigator.clipboard.writeText(email); toast.success("Email copied. Add this tester in App Store Connect."); }
    catch { toast.error("Could not copy. Select the email address instead."); }
  }

  async function markSent() {
    if (!confirm || busy) return;
    setBusy(true);
    const result = await markTestFlightInvitationSent(confirm.id);
    setBusy(false);
    if (!result.ok) { toast.error(result.message); return; }
    setConfirm(null);
    toast.success("Marked as invited.");
    router.refresh();
  }

  return <section className="space-y-5 pt-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-base font-semibold">Invitation inbox</h2><p className="text-sm text-muted-foreground">{waiting} waiting · Copying an email does not send an invitation.</p></div>
      <Button type="button" variant="outline" size="sm" onClick={() => router.refresh()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
    </div>
    <div role="tablist" aria-label="TestFlight request status" className="flex w-fit rounded-lg bg-muted p-1">
      {(["REQUESTED", "INVITED"] as const).map((value) => <button key={value} type="button" role="tab" aria-selected={tab === value} onClick={() => setTab(value)} className={`rounded-md px-4 py-2 text-sm transition-colors ${tab === value ? "bg-background font-semibold shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{value === "REQUESTED" ? `Waiting (${waiting})` : "Invited"}</button>)}
    </div>
    {visible.length ? <div className="grid gap-3">{visible.map((item) => <article key={item.id} className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0"><p className="break-all text-sm font-semibold">{item.email}</p><p className="mt-1 text-xs text-muted-foreground">Requested {new Date(item.createdAt).toLocaleString()}{item.invitedAt ? ` · Invited ${new Date(item.invitedAt).toLocaleString()}` : ""}</p></div>
      <div className="flex shrink-0 flex-wrap gap-2"><Button type="button" size="sm" variant="outline" onClick={() => void copy(item.email)}><Clipboard className="mr-2 h-4 w-4" />Copy email</Button>{item.status === "REQUESTED" ? <Button type="button" size="sm" onClick={() => setConfirm(item)}><Check className="mr-2 h-4 w-4" />Mark invited</Button> : null}</div>
    </article>)}</div> : <p className="rounded-xl border bg-card px-5 py-8 text-center text-sm text-muted-foreground">{tab === "REQUESTED" ? "No requests are waiting for an invitation." : "No invitations marked as sent yet."}</p>}
    <Dialog open={Boolean(confirm)} onOpenChange={(open) => { if (!open && !busy) setConfirm(null); }}><DialogContent><DialogHeader><DialogTitle>Invitation sent?</DialogTitle><DialogDescription>Only mark {confirm?.email} as invited after you add this tester in App Store Connect. This button does not send an Apple invitation.</DialogDescription></DialogHeader><DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={() => setConfirm(null)}>Cancel</Button><Button type="button" disabled={busy} onClick={() => void markSent()}>{busy ? "Saving..." : "Yes, invitation sent"}</Button></DialogFooter></DialogContent></Dialog>
  </section>;
}
