"use client";

import { cn } from "@/lib/utils";
import { useStore } from "@/hooks/use-store";
import { Sidebar } from "@/components/admin-panel/sidebar";
import { useSidebarToggle } from "@/hooks/use-sidebar-toggle";

export default function AdminPanelLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const sidebar = useStore(useSidebarToggle, (state) => state);

  if (!sidebar) return null;

  return (
    <div className="admin-shell-bg min-h-screen text-foreground">
      <Sidebar />
      <main
        className={cn(
          "min-h-screen transition-[margin-left] duration-300 ease-in-out",
          sidebar?.isOpen === false ? "lg:ml-[72px]" : "lg:ml-64"
        )}
      >
        <div className="min-h-screen bg-background">{children}</div>
      </main>
    </div>
  );
}
