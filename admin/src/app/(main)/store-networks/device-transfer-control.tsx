"use client";

import { useActionState } from "react";
import { ArrowRightLeft, Loader2, ShieldAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authorizePosDeviceTransfer, cancelPosDeviceTransfer, type StoreNetworkActionState } from "./actions";

type PartnerOption = { userId: number; companyName: string };

export function DeviceTransferControl({
  deviceId,
  currentPartnerId,
  targetPartnerId,
  targetPartnerName,
  partners,
  deviceName,
  revoked,
}: {
  deviceId: string;
  currentPartnerId: number;
  targetPartnerId?: number | null;
  targetPartnerName?: string | null;
  partners: PartnerOption[];
  deviceName: string;
  revoked: boolean;
}) {
  const [authorizeState, authorizeAction, authorizing] = useActionState<StoreNetworkActionState, FormData>(authorizePosDeviceTransfer, { status: "idle" });
  const [cancelState, cancelAction, canceling] = useActionState<StoreNetworkActionState, FormData>(cancelPosDeviceTransfer, { status: "idle" });

  if (revoked) return <p className="text-xs text-muted-foreground">This installation has already been released or revoked.</p>;

  if (targetPartnerId) {
    return (
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
        <div className="flex items-start gap-2 text-sm">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p>Transfer authorized to <strong>{targetPartnerName || `Partner #${targetPartnerId}`}</strong>. The POS must be online to finish.</p>
        </div>
        <form action={cancelAction}>
          <input type="hidden" name="deviceId" value={deviceId} />
          <Button type="submit" variant="outline" size="sm" disabled={canceling}>
            {canceling ? <Loader2 className="animate-spin" /> : <X />}
            Cancel authorization
          </Button>
          {cancelState.message ? <span className="sr-only" role="status">{cancelState.message}</span> : null}
        </form>
      </div>
    );
  }

  const availablePartners = partners.filter((partner) => partner.userId !== currentPartnerId);
  if (!availablePartners.length) return <p className="text-xs text-muted-foreground">No other partner accounts are available as a transfer destination.</p>;

  return (
    <form
      action={authorizeAction}
      className="mt-3 grid gap-2 rounded-xl border border-border bg-muted/20 p-3 sm:grid-cols-[minmax(0,1fr)_auto]"
      onSubmit={(event) => {
        if (!window.confirm(`Authorize ${deviceName} to transfer away from its current partner? The destination POS must confirm online, back up, and clear its local data.`)) event.preventDefault();
      }}
    >
      <input type="hidden" name="deviceId" value={deviceId} />
      <label className="grid gap-1 text-xs font-medium text-muted-foreground">
        Destination partner
        <select name="targetPartnerId" required defaultValue="" className="h-9 rounded-md border bg-background px-3 text-sm text-foreground">
          <option value="" disabled>Select partner</option>
          {availablePartners.map((partner) => <option key={partner.userId} value={partner.userId}>{partner.companyName} · #{partner.userId}</option>)}
        </select>
      </label>
      <Button type="submit" size="sm" disabled={authorizing} className="self-end">
        {authorizing ? <Loader2 className="animate-spin" /> : <ArrowRightLeft />}
        Authorize transfer
      </Button>
      {authorizeState.message ? <p role="status" className={`text-xs sm:col-span-2 ${authorizeState.status === "error" ? "text-destructive" : "text-emerald-600"}`}>{authorizeState.message}</p> : null}
    </form>
  );
}
