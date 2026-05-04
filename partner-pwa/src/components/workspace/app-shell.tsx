"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, WifiOff } from "lucide-react";
import { toast } from "sonner";

import { useHasMounted } from "@/hooks/use-has-mounted";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { usePartnerStore } from "@/store/partner-store";
import { LoadingStage } from "@/components/workspace/loading-stage";
import { WorkspaceSidebar } from "@/components/workspace/sidebar";
import { WorkspaceTopbar } from "@/components/workspace/topbar";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PartnerWorkspaceShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const mounted = useHasMounted();
  const isOnline = useOnlineStatus();
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const {
    session,
    profile,
    queue,
    lastSyncedAt,
    isBootstrapping,
    isSyncing,
    error,
    bootstrap,
    flushQueue,
    refreshWorkspace,
    clearError,
  } = usePartnerStore();

  useEffect(() => {
    if (error) {
      toast.error(error);
      clearError();
    }
  }, [error, clearError]);

  useEffect(() => {
    if (session && mounted) {
      bootstrap();
    }
  }, [session, mounted, bootstrap]);

  useEffect(() => {
    if (session && isOnline) {
      flushQueue();
    }
  }, [session, isOnline, flushQueue]);

  useEffect(() => {
    if (mounted && !session && !isBootstrapping) {
      router.replace("/login");
    }
  }, [mounted, session, isBootstrapping, router]);

  useEffect(() => {
    const listener = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", listener);
    return () => window.removeEventListener("beforeinstallprompt", listener);
  }, []);

  async function handleInstall() {
    if (!installPrompt) {
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;

    if (choice.outcome === "accepted") {
      toast.success("Shea Partner is now ready to live on the home screen.");
      setInstallPrompt(null);
    }
  }

  if (!mounted) {
    return <LoadingStage label="Preparing your partner workspace..." />;
  }

  if (!session) {
    return <LoadingStage label="Redirecting to sign in..." />;
  }

  const pendingQueue = queue.length;

  return (
    <main className="partner-shell">
      <div className="mx-auto flex h-full max-w-[1680px] flex-col gap-3 px-3 py-3 lg:flex-row lg:px-4 lg:py-4">
        <WorkspaceSidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((value) => !value)}
          companyName={profile?.companyName}
          isOnline={isOnline}
          pendingQueue={pendingQueue}
          lastSyncedAt={lastSyncedAt}
        />

        <section className="relative flex min-w-0 flex-1 flex-col gap-3 overflow-hidden lg:h-full">
          <div className="flex shrink-0 justify-end">
            <WorkspaceTopbar
              companyName={profile?.companyName}
              email={profile?.email}
              isSyncing={isSyncing}
              onRefresh={refreshWorkspace}
            />
          </div>

          {!isOnline || pendingQueue ? (
            <div className="glass flex flex-wrap items-center justify-between gap-3 rounded-[20px] border-[hsla(var(--warning),0.24)] bg-[hsla(var(--warning),0.08)] px-3.5 py-2.5">
              <div className="flex items-center gap-3">
                <WifiOff className="h-5 w-5 text-[hsl(var(--warning-foreground))]" />
                <div>
                  <p className="text-sm font-semibold">{isOnline ? `${pendingQueue} queued changes` : "Offline mode is active"}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">{isOnline ? "Sync them when you are ready." : "You can keep working and sync later."}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {installPrompt ? (
                  <button
                    type="button"
                    onClick={handleInstall}
                    className="ds-primary-button inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold text-[hsl(var(--foreground-on-solid))]"
                  >
                    <Download className="h-4 w-4" />
                    Install
                  </button>
                ) : null}
                {isOnline && pendingQueue ? (
                  <button
                    type="button"
                    onClick={flushQueue}
                    className="ds-primary-button rounded-full px-4 py-2 text-sm font-semibold text-[hsl(var(--foreground-on-solid))]"
                  >
                    Sync
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          <section className="grid min-h-0 flex-1 gap-3 overflow-hidden">{children}</section>
        </section>
      </div>
    </main>
  );
}
