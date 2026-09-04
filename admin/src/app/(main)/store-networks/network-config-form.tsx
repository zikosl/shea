"use client";

import { useActionState } from "react";
import { Loader2, Save, ServerCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveStoreNetwork, type StoreNetworkActionState } from "./actions";

const initialState: StoreNetworkActionState = { status: "idle" };

export function NetworkConfigForm({
  storeId,
  cloudSyncEnabled,
  cloudGatewayUrl,
  localGatewayUrl,
}: {
  storeId: string;
  cloudSyncEnabled: boolean;
  cloudGatewayUrl?: string;
  localGatewayUrl?: string;
}) {
  const [state, action, pending] = useActionState(saveStoreNetwork, initialState);
  return (
    <form action={action} className="mt-5 grid gap-3 rounded-xl border bg-muted/20 p-4">
      <input type="hidden" name="storeId" value={storeId} />
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-2"><ServerCog className="mt-0.5 h-4 w-4 text-primary" /><div><p className="text-sm font-medium">Cloud data plane</p><p className="text-xs text-muted-foreground">Enable independent cloud synchronization for this store.</p></div></div>
        <input name="cloudSyncEnabled" type="checkbox" defaultChecked={cloudSyncEnabled} className="mt-1 h-4 w-4 accent-primary" />
      </div>
      <label className="grid gap-1.5 text-xs font-medium">Cloud Gateway API
        <Input name="cloudGatewayUrl" type="url" defaultValue={cloudGatewayUrl} placeholder="https://pos-sync.example.com" />
      </label>
      <label className="grid gap-1.5 text-xs font-medium">Suggested local gateway address
        <Input name="localGatewayUrl" defaultValue={localGatewayUrl} placeholder="http://192.168.1.10:3510" />
      </label>
      {state.message ? <p className={state.status === "error" ? "text-xs text-destructive" : "text-xs text-emerald-600"}>{state.message}</p> : null}
      <Button type="submit" size="sm" disabled={pending}>{pending ? <Loader2 className="animate-spin" /> : <Save />}Save network</Button>
    </form>
  );
}
