import { CalendarDays, Sparkles } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { UserNav } from "@/components/admin-panel/user-nav";
import { SheetMenu } from "@/components/admin-panel/sheet-menu";
import { NavbarDate } from "@/components/admin-panel/navbar-date";

interface NavbarProps {
  title: string;
}

export function Navbar({ title }: NavbarProps) {
  return (
    <header className="sticky top-0 z-10 w-full border-b border-border/70 bg-card/72 backdrop-blur-xl supports-backdrop-filter:bg-card/65 dark:border-slate-400/10 dark:bg-[#131d2e]/78 dark:supports-backdrop-filter:bg-[#131d2e]/72">
      <div className="flex min-h-[4.25rem] items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <SheetMenu />
          <div className="hidden h-10 w-px bg-slate-200/80 dark:bg-slate-400/12 lg:block" />
          <div className="min-w-0">
            <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-primary dark:border-slate-400/10 dark:bg-white/5 dark:text-sky-200">
              <Sparkles className="h-3.5 w-3.5" />
              Admin
            </div>
            <h1 className="truncate text-xl font-semibold tracking-tight">{title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-full border border-border/80 bg-background/80 px-3 py-2 text-sm text-muted-foreground dark:border-slate-400/10 dark:bg-white/5 md:flex">
            <CalendarDays className="h-4 w-4 text-sky-600" />
            <NavbarDate />
          </div>
          <ModeToggle />
          <UserNav />
        </div>
      </div>
    </header>
  );
}
