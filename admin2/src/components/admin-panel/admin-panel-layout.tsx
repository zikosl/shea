"use client";

import { cn } from "@/lib/utils";
import { useStore } from "@/hooks/use-store";
import { Footer } from "@/components/admin-panel/footer";
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
    <div className="admin-shell-bg min-h-screen">
      <Sidebar />
      <main
        className={cn(
          "min-h-screen px-3 pb-3 pt-3 transition-[margin-left] duration-300 ease-in-out md:px-4 md:pb-4 md:pt-4",
          sidebar?.isOpen === false ? "lg:ml-[90px]" : "lg:ml-72"
        )}
      >
        <div className="admin-panel relative min-h-[calc(100vh-1.5rem)] overflow-hidden">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/40 to-transparent dark:from-white/5" />
          {children}
        </div>
      </main>
      <footer
        className={cn(
          "px-3 pb-3 transition-[margin-left] duration-300 ease-in-out md:px-4 md:pb-4",
          sidebar?.isOpen === false ? "lg:ml-[90px]" : "lg:ml-72"
        )}
      >
        <Footer />
      </footer>
    </div>
  );
}
