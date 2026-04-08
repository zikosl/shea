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
      <div className="glass relative flex h-full flex-col overflow-y-auto rounded-[28px] border border-sidebar-border/70 px-3 py-4 shadow-[0_24px_60px_-32px_rgba(33,24,18,0.28)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/10 to-transparent" />
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
              className="rounded-2xl ring-1 ring-primary/15"
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
              <p className="text-xs text-muted-foreground">Admin command center</p>
            </div>
          </Link>
        </Button>
        {sidebar?.isOpen !== false && (
          <div className="mb-4 rounded-2xl border border-border/80 bg-background/65 p-3">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Refined workspace
            </div>
            <p className="text-sm text-muted-foreground">
              Manage catalog, partners, and operations from one calmer, more focused layout.
            </p>
          </div>
        )}
        <Menu isOpen={sidebar?.isOpen} />
      </div>
    </aside>
  );
}
