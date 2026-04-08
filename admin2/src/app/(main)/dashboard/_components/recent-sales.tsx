import { ArrowUpRight } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const recentSales = [
  { name: "Olivia Martin", email: "olivia.martin@email.com", amount: "$1,999.00", initials: "OM" },
  { name: "Jackson Lee", email: "jackson.lee@email.com", amount: "$920.00", initials: "JL" },
  { name: "Isabella Nguyen", email: "isabella.nguyen@email.com", amount: "$640.00", initials: "IN" },
  { name: "William Kim", email: "will@email.com", amount: "$540.00", initials: "WK" },
  { name: "Sofia Davis", email: "sofia.davis@email.com", amount: "$320.00", initials: "SD" }
];

export function RecentSales() {
  return (
    <div className="space-y-4">
      {recentSales.map((sale) => (
        <div
          key={sale.email}
          className="flex items-center gap-4 rounded-2xl border border-border/70 bg-background/55 p-3 transition-colors hover:bg-background/80"
        >
          <Avatar className="h-11 w-11 border border-primary/15 bg-primary/10">
            <AvatarFallback className="bg-primary/10 font-semibold text-primary">
              {sale.initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-none">{sale.name}</p>
            <p className="mt-1 truncate text-sm text-muted-foreground">{sale.email}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold">{sale.amount}</p>
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
              <ArrowUpRight className="h-3.5 w-3.5" />
              Paid
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
