import { ContentLayout } from "@/components/admin-panel/content-layout";
import { Badge } from "@/components/ui/badge";
import { requestServerGraphQL } from "@/lib/server-request";
import { Clock3, Database, MonitorSmartphone, Network, ServerOff, Wifi } from "lucide-react";
import { NetworkConfigForm } from "./network-config-form";

export const metadata = { title: "Store Networks | Shea Admin" };
export const instant = false;

type Terminal = {
  id: string;
  name: string;
  status: "ACTIVE" | "REVOKED";
  lastSeenAt?: string;
};

type Store = {
  id: string;
  code: string;
  name: string;
  partnerName: string;
  timezone: string;
  deploymentMode: "SOLO" | "MULTI_POS";
  status: "ACTIVE" | "SUSPENDED";
  gatewayLastSeenAt?: string;
  cloudSyncEnabled: boolean;
  cloudGatewayUrl?: string;
  localGatewayUrl?: string;
  terminals: Terminal[];
};

const QUERY = `query AdminStoreNetworks {
  adminStoreNetworks {
    id code name partnerName timezone deploymentMode status gatewayLastSeenAt
    cloudSyncEnabled cloudGatewayUrl localGatewayUrl
    terminals { id name status lastSeenAt }
  }
}`;

function isFresh(value?: string) {
  return Boolean(value && Date.now() - new Date(value).getTime() < 2 * 60_000);
}

function relativeTime(value?: string) {
  if (!value) return "Never connected";
  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default async function StoreNetworksPage() {
  const response = await requestServerGraphQL<{ adminStoreNetworks: Store[] }>(QUERY);
  const stores = response.adminStoreNetworks;
  const multi = stores.filter((store) => store.deploymentMode === "MULTI_POS");
  const online = multi.filter((store) => isFresh(store.gatewayLastSeenAt));
  const terminals = stores.flatMap((store) => store.terminals);

  return (
    <ContentLayout
      title="Store Networks"
      description="Monitor local gateways, shared PostgreSQL stores, and every paired POS terminal."
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Metric icon={Network} label="Multi-POS stores" value={multi.length} detail={`${stores.length - multi.length} solo stores`} />
          <Metric icon={Wifi} label="Gateways online" value={online.length} detail={`${multi.length - online.length} need attention`} />
          <Metric icon={MonitorSmartphone} label="Registered terminals" value={terminals.length} detail={`${terminals.filter((item) => item.status === "ACTIVE").length} active`} />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {stores.map((store) => {
            const gatewayOnline = store.deploymentMode === "MULTI_POS" && isFresh(store.gatewayLastSeenAt);
            return (
              <article key={store.id} className="rounded-2xl border bg-card p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{store.partnerName}</p>
                    <h2 className="mt-1 text-xl font-semibold">{store.name}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{store.code} · {store.timezone}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={store.status === "ACTIVE" ? "outline" : "destructive"}>{store.status}</Badge>
                    <Badge variant={store.deploymentMode === "MULTI_POS" ? "default" : "secondary"}>
                      {store.deploymentMode === "MULTI_POS" ? "Multi-POS" : "Solo"}
                    </Badge>
                  </div>
                </div>

                <div className={`mt-5 flex items-center gap-3 rounded-xl border p-3 ${gatewayOnline ? "border-emerald-500/30 bg-emerald-500/5" : "border-border bg-muted/30"}`}>
                  {store.deploymentMode === "SOLO" ? <Database className="h-5 w-5 text-muted-foreground" /> : gatewayOnline ? <Wifi className="h-5 w-5 text-emerald-500" /> : <ServerOff className="h-5 w-5 text-destructive" />}
                  <div>
                    <p className="text-sm font-medium">{store.deploymentMode === "SOLO" ? "Local SQLite" : gatewayOnline ? "Gateway healthy" : "Gateway offline"}</p>
                    <p className="text-xs text-muted-foreground">{store.deploymentMode === "SOLO" ? "No store server required" : `Last heartbeat ${relativeTime(store.gatewayLastSeenAt)}`}</p>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {store.terminals.length ? store.terminals.map((terminal) => (
                    <div key={terminal.id} className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5">
                      <div className="flex min-w-0 items-center gap-2">
                        <MonitorSmartphone className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="truncate text-sm font-medium">{terminal.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock3 className="h-3.5 w-3.5" />
                        {relativeTime(terminal.lastSeenAt)}
                        <span className={`h-2 w-2 rounded-full ${terminal.status === "ACTIVE" && isFresh(terminal.lastSeenAt) ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
                      </div>
                    </div>
                  )) : <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">No terminals registered</p>}
                </div>
                <NetworkConfigForm
                  storeId={store.id}
                  cloudSyncEnabled={store.cloudSyncEnabled}
                  cloudGatewayUrl={store.cloudGatewayUrl}
                  localGatewayUrl={store.localGatewayUrl}
                />
              </article>
            );
          })}
        </div>
      </div>
    </ContentLayout>
  );
}

function Metric({ icon: Icon, label, value, detail }: { icon: typeof Network; label: string; value: number; detail: string }) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">{label}</span><Icon className="h-5 w-5 text-primary" /></div>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}
