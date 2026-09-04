"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Release = { name: string; size: number; modifiedAt: string };

export function PosReleaseManager() {
  const [version, setVersion] = useState("");
  const [installer, setInstaller] = useState<File | null>(null);
  const [releases, setReleases] = useState<Release[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const response = await fetch("/api/pos/releases", { cache: "no-store" });
    if (response.ok) setReleases((await response.json()).releases || []);
  }
  useEffect(() => { void load(); }, []);

  async function publish(event: React.FormEvent) {
    event.preventDefault();
    if (!installer) return;
    setBusy(true); setError(""); setMessage("");
    const form = new FormData();
    form.set("version", version);
    form.set("installer", installer);
    try {
      const response = await fetch("/api/pos/releases", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Publishing failed");
      setMessage(`Version ${result.version} is live. Registers will see it on their next update check.`);
      setVersion(""); setInstaller(null); await load();
    } catch (value) { setError(value instanceof Error ? value.message : String(value)); }
    finally { setBusy(false); }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,420px)]">
      <Card>
        <CardHeader>
          <CardTitle>Publish a Windows release</CardTitle>
          <CardDescription>Build with <code>yarn build && electron-builder --win nsis --x64</code>, then upload the signed installer. The update manifest is generated automatically.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={publish} className="grid gap-4">
            <label className="grid gap-2 text-sm font-medium">Version<Input value={version} onChange={(event) => setVersion(event.target.value)} placeholder="0.2.0" required pattern="\\d+\\.\\d+\\.\\d+.*" /></label>
            <label className="grid gap-2 text-sm font-medium">Signed NSIS installer<input className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm" type="file" accept=".exe,application/vnd.microsoft.portable-executable" onChange={(event) => setInstaller(event.target.files?.[0] || null)} required /></label>
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-muted-foreground"><AlertTriangle className="mr-2 inline h-4 w-4 text-amber-500" />Only publish installers built from a version that matches the POS <code>package.json</code>.</div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {message ? <p className="text-sm text-emerald-600"><CheckCircle2 className="mr-2 inline h-4 w-4" />{message}</p> : null}
            <Button type="submit" disabled={busy || !installer}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}Publish release</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Published installers</CardTitle><CardDescription>Files currently available to POS registers.</CardDescription></CardHeader>
        <CardContent className="grid gap-2">
          {releases.length ? releases.map((release) => <div className="rounded-lg border p-3" key={release.name}><p className="font-medium">{release.name}</p><p className="text-xs text-muted-foreground">{(release.size / 1024 / 1024).toFixed(1)} MB · {new Date(release.modifiedAt).toLocaleString()}</p></div>) : <p className="text-sm text-muted-foreground">No releases published yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
