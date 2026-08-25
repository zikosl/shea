import { CalendarDays } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { UserNav } from "@/components/admin-panel/user-nav";
import { SheetMenu } from "@/components/admin-panel/sheet-menu";
import { NavbarDate } from "@/components/admin-panel/navbar-date";

interface NavbarProps {
  title: string;
}

export function Navbar({ title }: NavbarProps) {
  return (
    <header className="sticky top-0 z-10 w-full border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <SheetMenu />
          <div className="min-w-0">
            <h1 className="truncate text-sm font-medium text-foreground">{title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-xs text-muted-foreground md:flex">
            <CalendarDays className="h-4 w-4" />
            <NavbarDate />
          </div>
          <ModeToggle />
          <UserNav />
        </div>
      </div>
    </header>
  );
}
