import { PanelLeftClose } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SidebarToggleProps {
  isOpen: boolean | undefined;
  setIsOpen?: () => void;
}

export function SidebarToggle({ isOpen, setIsOpen }: SidebarToggleProps) {
  return (
    <div className="invisible absolute top-[18px] -right-[14px] z-20 lg:visible">
      <Button
        onClick={() => setIsOpen?.()}
        className="h-9 w-9 rounded-full border-sidebar-border bg-white/95 shadow-lg shadow-slate-900/10 hover:bg-sidebar-accent dark:bg-[#111827]"
        variant="outline"
        size="icon"
      >
        <PanelLeftClose
          className={cn(
            "h-4 w-4 transition-transform duration-500 ease-in-out",
            isOpen === false ? "rotate-180" : "rotate-0"
          )}
        />
      </Button>
    </div>
  );
}
