"use client";

import { useState } from "react";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { resetAccessCode, type ResettableAccount } from "@/lib/actions/account-security";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ResetAccessCodeProps = {
  account: ResettableAccount;
  accountId: string;
  email: string;
};

export function ResetAccessCode({ account, accountId, email }: ResetAccessCodeProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleReset() {
    setLoading(true);
    const result = await resetAccessCode(account, accountId);
    setLoading(false);

    if ("code" in result) {
      const message = result.code === "EMAIL_FAILED"
        ? "The email could not be delivered. The existing access code was not changed."
        : result.code === "ACCOUNT_NOT_FOUND"
          ? "This account no longer exists. Refresh the page and try again."
          : "The access code could not be reset. Please try again.";
      toast.error(message);
      return;
    }

    setOpen(false);
    toast.success("A new access code was emailed and saved refresh sessions were revoked.");
  }

  return (
    <section className="rounded-2xl bg-muted/35 p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background text-foreground shadow-sm">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <p className="font-medium">Account access</p>
            <p className="mt-1 max-w-lg text-sm text-muted-foreground">
              Email a new secure code to {email}. The current code and saved refresh sessions will stop working.
            </p>
          </div>
        </div>
        <Button type="button" variant="outline" className="shrink-0 gap-2" onClick={() => setOpen(true)}>
          <KeyRound className="h-4 w-4" />
          Reset access code
        </Button>
      </div>

      <Dialog open={open} onOpenChange={(nextOpen) => !loading && setOpen(nextOpen)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset this account&apos;s access code?</DialogTitle>
            <DialogDescription>
              Shea will email a new code to {email}. The current code and all existing refresh sessions will be revoked after delivery succeeds.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" disabled={loading} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={loading} onClick={handleReset} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              {loading ? "Sending..." : "Send new code"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
