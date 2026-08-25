import Link from "next/link";
import { Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { useStore } from "@/hooks/use-store";
import { Button } from "@/components/ui/button";
import { Menu } from "@/components/admin-panel/menu";
import { useSidebarToggle } from "@/hooks/use-sidebar-toggle";
import { SidebarToggle } from "@/components/admin-panel/sidebar-toggle";
import logo from "@/../public/mini_logo.png";
import Image from "next/image";

export function Sidebar() {
  const sidebar = useStore(useSidebarToggle, (state) => state);

  if (!sidebar) return null;

  return (
    <aside
      className={cn(
        "fixed top-0 left-0 z-20 h-screen -translate-x-full px-3 py-3 transition-[width] duration-300 ease-in-out lg:translate-x-0",
        sidebar?.isOpen === false ? "w-[90px]" : "w-72"
      )}
    >
      <SidebarToggle isOpen={sidebar?.isOpen} setIsOpen={sidebar?.setIsOpen} />
      <div className="relative flex h-full flex-col overflow-y-auto rounded-[30px] border border-sidebar-border/75 bg-white/84 px-3 py-4 shadow-[0_24px_70px_-42px_rgba(15,58,122,0.35)] backdrop-blur-2xl dark:bg-[#101827]/95">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-primary/10 to-transparent dark:from-primary/14" />
        <Button
          className={cn(
            "mb-2 h-auto justify-start px-2 py-2 text-foreground transition-transform duration-300 ease-in-out hover:no-underline",
            sidebar?.isOpen === false ? "translate-x-1" : "translate-x-0"
          )}
          variant="link"
          asChild
        >
          <Link href="/dashboard" className="flex items-center gap-3 outline-hidden" style={{ textDecoration: 0 }}>
            <Image
              src={logo}
              alt="shea"
              width={36}
              height={36}
              className="rounded-2xl ring-1 ring-primary/20"
            />
            <div
              className={cn(
                "flex min-w-0 flex-1 flex-col transition-[transform,opacity,display] duration-300 ease-in-out",
                sidebar?.isOpen === false
                  ? "-translate-x-96 opacity-0 hidden"
                  : "translate-x-0 opacity-100"
              )}
            >
              <h1 className="text-lg font-semibold uppercase tracking-[0.22em]">SHEA</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Operational workspace</p>
            </div>
          </Link>
        </Button>
        {sidebar?.isOpen !== false && (
          <div className="mb-4 rounded-[24px] border border-sidebar-border bg-sidebar-accent/70 p-4 dark:border-slate-400/12 dark:bg-white/5">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-primary dark:bg-primary/14 dark:text-sky-200">
              <Sparkles className="h-3.5 w-3.5" />
              Focus mode
            </div>
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
              A cleaner command space for catalog updates, partner management, and daily ops.
            </p>
          </div>
        )}
        <Menu isOpen={sidebar?.isOpen} />
      </div>
    </aside>
  );
}
