"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { KeyRound, Plus, UserRoundCheck, UserRoundX } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  type ContributorAccount,
  createContributorAccount,
  resetContributorAccountAccess,
  setContributorAccountActive,
} from "./actions";

type PendingAction = { account: ContributorAccount; kind: "reset" | "toggle" };

export function ContributorManager({ accounts }: { accounts: ContributorAccount[] }) {
  const router = useRouter();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [action, setAction] = useState<PendingAction | null>(null);

  async function invite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    try {
      const result = await createContributorAccount(name, email);
      if (result.ok === false) {
        toast.error(result.message);
        return;
      }
      setName("");
      setEmail("");
      setInviteOpen(false);
      toast.success("Contributor created. A Sahim access code was sent by email.");
      router.refresh();
    } catch {
      toast.error("Could not create the account. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function confirmAction() {
    if (!action || pending) return;
    setPending(true);
    try {
      const result = action.kind === "reset"
        ? await resetContributorAccountAccess(action.account.userId)
        : await setContributorAccountActive(action.account.userId, !action.account.active);
      if (result.ok === false) {
        toast.error(result.message);
        return;
      }
      toast.success(action.kind === "reset"
        ? "New access code emailed. Existing sessions were signed out."
        : action.account.active ? "Contributor disabled and signed out." : "Contributor enabled.");
      setAction(null);
      router.refresh();
    } catch {
      toast.error("Could not update access. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{accounts.length} contributor{accounts.length === 1 ? "" : "s"}</p>
        <Button size="sm" onClick={() => setInviteOpen(true)}><Plus /> Invite contributor</Button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        {accounts.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm font-medium">No contributors yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Invite someone to start collecting product and barcode contributions.</p>
          </div>
        ) : accounts.map((account) => (
          <div key={account.userId} className="flex flex-col gap-3 border-b px-4 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium">{account.name}</p>
                <Badge variant={account.active ? "secondary" : "outline"}>{account.active ? "Active" : "Disabled"}</Badge>
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{account.email || "No email address"}</p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button size="sm" variant="outline" disabled={!account.email} onClick={() => setAction({ account, kind: "reset" })}>
                <KeyRound /> Reset code
              </Button>
              <Button size="sm" variant="outline" onClick={() => setAction({ account, kind: "toggle" })}>
                {account.active ? <UserRoundX /> : <UserRoundCheck />}{account.active ? "Disable" : "Enable"}
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={inviteOpen} onOpenChange={(open) => { if (!pending) setInviteOpen(open); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Sahim contributor</DialogTitle>
            <DialogDescription>We will create the account and email a sign-in code. The code is never shown here.</DialogDescription>
          </DialogHeader>
          <form onSubmit={invite} className="space-y-4">
            <div className="space-y-1.5"><Label htmlFor="contributor-name">Name</Label><Input id="contributor-name" value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={120} autoComplete="name" required disabled={pending} /></div>
            <div className="space-y-1.5"><Label htmlFor="contributor-email">Email</Label><Input id="contributor-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required disabled={pending} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" disabled={pending} onClick={() => setInviteOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={pending}>{pending ? "Sending..." : "Create and send code"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(action)} onOpenChange={(open) => { if (!open && !pending) setAction(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{action?.kind === "reset" ? "Reset access code?" : action?.account.active ? "Disable contributor?" : "Enable contributor?"}</DialogTitle>
            <DialogDescription>
              {action?.kind === "reset"
                ? `A new code will be emailed to ${action.account.email}. All existing Sahim sessions will be signed out.`
                : action?.account.active
                  ? `${action.account.name} will lose access to Sahim on all signed-in devices.`
                  : `${action?.account.name} will be able to sign in to Sahim again.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={pending} onClick={() => setAction(null)}>Cancel</Button>
            <Button variant={action?.kind === "toggle" && action.account.active ? "destructive" : "default"} disabled={pending} onClick={() => void confirmAction()}>
              {pending ? "Working..." : action?.kind === "reset" ? "Reset and email code" : action?.account.active ? "Disable" : "Enable"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
