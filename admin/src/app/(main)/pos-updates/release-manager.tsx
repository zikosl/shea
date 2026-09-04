"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileCheck2,
  Loader2,
  PackageCheck,
  RotateCcw,
  Upload,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { isValidReleaseVersion, normalizeReleaseVersion } from "@/lib/pos-release-version";

type Release = { name: string; size: number; modifiedAt: string };
type UploadPhase = "idle" | "uploading" | "processing" | "success" | "error";

function formatBytes(bytes: number) {
  if (!bytes) return "0 MB";
  return `${(bytes / 1024 / 1024).toFixed(bytes >= 10 * 1024 * 1024 ? 1 : 2)} MB`;
}

function readResponse(request: XMLHttpRequest) {
  try {
    return JSON.parse(request.responseText) as { error?: string; version?: string };
  } catch {
    return {};
  }
}

export function PosReleaseManager() {
  const [version, setVersion] = useState("");
  const [installer, setInstaller] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [releases, setReleases] = useState<Release[]>([]);
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [uploadedBytes, setUploadedBytes] = useState(0);
  const [publishedVersion, setPublishedVersion] = useState("");
  const [error, setError] = useState("");
  const [versionError, setVersionError] = useState("");
  const requestRef = useRef<XMLHttpRequest | null>(null);
  const versionInputRef = useRef<HTMLInputElement>(null);

  const active = phase === "uploading" || phase === "processing";

  async function load() {
    const response = await fetch("/api/pos/releases", { cache: "no-store" });
    if (response.ok) setReleases((await response.json()).releases || []);
  }

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/pos/releases", { cache: "no-store", signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((result) => {
        if (result) setReleases(result.releases || []);
      })
      .catch(() => undefined);
    return () => {
      controller.abort();
      requestRef.current?.abort();
    };
  }, []);

  function startUpload() {
    const normalizedVersion = normalizeReleaseVersion(version);
    if (!isValidReleaseVersion(normalizedVersion)) {
      setVersionError("Use a version such as 1.2.0 or 1.2.0-beta.1.");
      versionInputRef.current?.focus();
      return;
    }
    if (!installer) return;

    setVersion(normalizedVersion);
    setVersionError("");
    setError("");
    setPublishedVersion(normalizedVersion);
    setProgress(0);
    setUploadedBytes(0);
    setPhase("uploading");

    const form = new FormData();
    form.set("version", normalizedVersion);
    form.set("installer", installer);

    const request = new XMLHttpRequest();
    requestRef.current = request;
    request.open("POST", "/api/pos/releases");
    request.upload.addEventListener("progress", (uploadEvent) => {
      if (!uploadEvent.lengthComputable) return;
      setUploadedBytes(uploadEvent.loaded);
      setProgress(Math.min(100, Math.round((uploadEvent.loaded / uploadEvent.total) * 100)));
      if (uploadEvent.loaded >= uploadEvent.total) setPhase("processing");
    });
    request.addEventListener("load", () => {
      requestRef.current = null;
      const result = readResponse(request);
      if (request.status >= 200 && request.status < 300) {
        setProgress(100);
        setPhase("success");
        setVersion("");
        setInstaller(null);
        setFileInputKey((key) => key + 1);
        void load();
        return;
      }
      setError(result.error || `Publishing failed with status ${request.status}.`);
      setPhase("error");
    });
    request.addEventListener("error", () => {
      requestRef.current = null;
      setError("The upload was interrupted. Check the connection and try again.");
      setPhase("error");
    });
    request.addEventListener("abort", () => {
      requestRef.current = null;
      setPhase("idle");
    });
    request.send(form);
  }

  function publish(event: React.FormEvent) {
    event.preventDefault();
    startUpload();
  }

  function closeModal() {
    if (active) return;
    setPhase("idle");
    setError("");
  }

  const modalTitle = phase === "success"
    ? "Release published"
    : phase === "error"
      ? "Publishing was not completed"
      : phase === "processing"
        ? "Preparing the update"
        : `Uploading Shea POS ${publishedVersion}`;

  return (
    <>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,420px)]">
        <Card>
          <CardHeader>
            <CardTitle>Publish a Windows release</CardTitle>
            <CardDescription>Build with <code>yarn build && electron-builder --win nsis --x64</code>, then upload the signed installer. The update manifest is generated automatically.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={publish} className="grid gap-5" noValidate>
              <label className="grid gap-2 text-sm font-medium">
                Version
                <Input
                  ref={versionInputRef}
                  value={version}
                  onChange={(event) => {
                    setVersion(event.target.value);
                    if (versionError) setVersionError("");
                  }}
                  onBlur={() => { if (version) setVersion(normalizeReleaseVersion(version)); }}
                  placeholder="1.2.0"
                  autoComplete="off"
                  spellCheck={false}
                  aria-invalid={Boolean(versionError)}
                  aria-describedby="release-version-help"
                  required
                />
                <span id="release-version-help" className={versionError ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
                  {versionError || "Semantic version format: major.minor.patch. A leading v is accepted."}
                </span>
              </label>

              <label className="grid gap-2 text-sm font-medium">
                Signed NSIS installer
                <input
                  key={fileInputKey}
                  className="block w-full cursor-pointer rounded-xl border border-dashed border-input bg-muted/30 px-4 py-4 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:font-medium file:text-primary-foreground hover:border-primary/50"
                  type="file"
                  accept=".exe,application/vnd.microsoft.portable-executable"
                  onChange={(event) => setInstaller(event.target.files?.[0] || null)}
                  required
                />
                {installer ? (
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    <FileCheck2 className="h-4 w-4 text-emerald-500" />
                    {installer.name} · {formatBytes(installer.size)}
                  </span>
                ) : null}
              </label>

              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-muted-foreground">
                <AlertTriangle className="mr-2 inline h-4 w-4 text-amber-500" />
                Only publish installers built from a version that matches the POS <code>package.json</code>.
              </div>
              <Button type="submit" size="lg" disabled={active || !installer || !version.trim()}>
                <Upload className="mr-2 h-4 w-4" />Publish release
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Published installers</CardTitle><CardDescription>Files currently available to POS registers.</CardDescription></CardHeader>
          <CardContent className="grid gap-2">
            {releases.length ? releases.map((release) => (
              <div className="rounded-xl border p-4" key={release.name}>
                <p className="font-medium">{release.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatBytes(release.size)} · {new Date(release.modifiedAt).toLocaleString()}</p>
              </div>
            )) : <p className="text-sm text-muted-foreground">No releases published yet.</p>}
          </CardContent>
        </Card>
      </div>

      <Dialog open={phase !== "idle"} onOpenChange={(open) => { if (!open) closeModal(); }}>
        <DialogContent
          className="max-w-xl overflow-hidden rounded-2xl p-0"
          onEscapeKeyDown={(event) => { if (active) event.preventDefault(); }}
          onInteractOutside={(event) => { if (active) event.preventDefault(); }}
        >
          <div className="border-b bg-muted/30 px-7 py-6">
            <DialogHeader className="pr-8">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {phase === "success" ? <PackageCheck className="h-6 w-6" /> : phase === "error" ? <XCircle className="h-6 w-6 text-destructive" /> : <Upload className="h-6 w-6" />}
              </div>
              <DialogTitle className="text-xl">{modalTitle}</DialogTitle>
              <DialogDescription>
                {phase === "processing"
                  ? "The installer has arrived. The server is verifying it and creating the update manifest."
                  : phase === "success"
                    ? `Version ${publishedVersion} is ready. Registers will see it on their next update check.`
                    : phase === "error"
                      ? "Your previously published release remains unchanged."
                      : "Keep this window open while the Windows installer is transferred."}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="grid gap-5 px-7 py-6">
            {active ? (
              <>
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">{phase === "processing" ? "Verifying and publishing" : installer?.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {phase === "processing" ? "This usually takes only a few moments." : `${formatBytes(uploadedBytes)} of ${formatBytes(installer?.size || 0)}`}
                    </p>
                  </div>
                  <span className="text-2xl font-semibold tabular-nums">{phase === "processing" ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : `${progress}%`}</span>
                </div>
                <Progress value={phase === "processing" ? 100 : progress} className={phase === "processing" ? "h-3 animate-pulse" : "h-3"} />
                <div className="grid grid-cols-3 gap-2 text-center text-xs text-muted-foreground">
                  <span className="rounded-lg bg-primary/10 px-2 py-2 text-primary">Upload</span>
                  <span className={phase === "processing" ? "rounded-lg bg-primary/10 px-2 py-2 text-primary" : "rounded-lg bg-muted/50 px-2 py-2"}>Verify</span>
                  <span className="rounded-lg bg-muted/50 px-2 py-2">Publish</span>
                </div>
              </>
            ) : null}

            {phase === "success" ? (
              <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                <div><p className="font-medium">Update channel refreshed</p><p className="mt-1 text-muted-foreground">The installer and its SHA-512 manifest were published successfully.</p></div>
              </div>
            ) : null}

            {phase === "error" ? (
              <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                <div><p className="font-medium">Check the release details</p><p className="mt-1 text-muted-foreground">{error}</p></div>
              </div>
            ) : null}
          </div>

          <DialogFooter className="border-t bg-muted/20 px-7 py-5 sm:space-x-2">
            {phase === "uploading" ? <Button type="button" variant="outline" onClick={() => requestRef.current?.abort()}>Cancel upload</Button> : null}
            {phase === "processing" ? <p className="mr-auto self-center text-xs text-muted-foreground">The upload can no longer be cancelled safely.</p> : null}
            {phase === "error" ? <Button type="button" variant="outline" onClick={closeModal}>Review details</Button> : null}
            {phase === "error" ? <Button type="button" onClick={startUpload}><RotateCcw className="mr-2 h-4 w-4" />Try again</Button> : null}
            {phase === "success" ? <Button type="button" onClick={closeModal}>Close</Button> : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
