import { CalendarDays, PanelLeftDashed } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { UserNav } from "@/components/admin-panel/user-nav";
import { SheetMenu } from "@/components/admin-panel/sheet-menu";

interface NavbarProps {
  title: string;
}

export function Navbar({ title }: NavbarProps) {
  const today = new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(new Date());

  return (
    <header className="sticky top-0 z-10 w-full border-b border-slate-200/70 bg-white/68 backdrop-blur-xl supports-backdrop-filter:bg-white/55 dark:border-slate-400/10 dark:bg-[#131d2e]/78 dark:supports-backdrop-filter:bg-[#131d2e]/72">
      <div className="flex min-h-[4.5rem] items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <SheetMenu />
          <div className="hidden h-10 w-px bg-slate-200/80 dark:bg-slate-400/12 lg:block" />
          <div className="min-w-0">
            <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-sky-700 dark:bg-sky-400/12 dark:text-sky-200">
              <PanelLeftDashed className="h-3.5 w-3.5" />
              Workspace
            </div>
            <h1 className="truncate text-xl font-semibold tracking-tight">{title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-3 py-2 text-sm text-slate-500 dark:border-slate-400/10 dark:bg-white/5 dark:text-slate-300 md:flex">
            <CalendarDays className="h-4 w-4 text-sky-600" />
            <span>{today}</span>
          </div>
          <ModeToggle />
          <UserNav />
        </div>
      </div>
    </header>
  );
}
