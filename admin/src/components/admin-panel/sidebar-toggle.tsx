import { PanelLeftClose } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SidebarToggleProps {
  isOpen: boolean | undefined;
  setIsOpen?: () => void;
}

export function SidebarToggle({ isOpen, setIsOpen }: SidebarToggleProps) {
  return (
    <div className="invisible absolute top-4 -right-3 z-20 lg:visible">
      <Button
        onClick={() => setIsOpen?.()}
        className="h-6 w-6 rounded-md border-sidebar-border bg-background p-0 shadow-none hover:bg-sidebar-accent"
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
