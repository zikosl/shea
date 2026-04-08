import { SearchIcon } from "lucide-react";

import { Input } from "@/components/ui/input";

export function Search() {
  return (
    <div className="relative w-full md:w-[240px] lg:w-[320px]">
      <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Search products, brands, or partners"
        className="pl-10"
      />
    </div>
  );
}
