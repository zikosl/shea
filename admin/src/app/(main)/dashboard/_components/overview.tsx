"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

const data = [
  { name: "Jan", revenue: 9200, orders: 180 },
  { name: "Feb", revenue: 10800, orders: 205 },
  { name: "Mar", revenue: 12450, orders: 228 },
  { name: "Apr", revenue: 11800, orders: 214 },
  { name: "May", revenue: 13750, orders: 251 },
  { name: "Jun", revenue: 14900, orders: 268 },
  { name: "Jul", revenue: 16100, orders: 289 },
  { name: "Aug", revenue: 15650, orders: 276 },
  { name: "Sep", revenue: 16820, orders: 301 },
  { name: "Oct", revenue: 17900, orders: 320 },
  { name: "Nov", revenue: 19150, orders: 344 },
  { name: "Dec", revenue: 20840, orders: 372 }
];

export function Overview() {
  return (
    <ResponsiveContainer width="100%" height={330}>
      <AreaChart data={data} margin={{ left: 8, right: 8, top: 10, bottom: 0 }}>
        <defs>
          <linearGradient id="overviewGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.03} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="4 4" />
        <XAxis
          dataKey="name"
          axisLine={false}
          tickLine={false}
          tickMargin={12}
          fontSize={12}
          stroke="hsl(var(--muted-foreground))"
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tickMargin={12}
          fontSize={12}
          stroke="hsl(var(--muted-foreground))"
          tickFormatter={(value) => `$${value / 1000}k`}
        />
        <Tooltip
          cursor={{ stroke: "hsl(var(--primary))", strokeDasharray: "4 4" }}
          contentStyle={{
            borderRadius: "16px",
            border: "1px solid hsl(var(--border))",
            background: "hsl(var(--card))",
            boxShadow: "0 20px 40px -28px rgba(33,24,18,0.4)"
          }}
          formatter={(value: number, name: string) => [
            name === "revenue" ? `$${value.toLocaleString()}` : value.toLocaleString(),
            name === "revenue" ? "Revenue" : "Orders"
          ]}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="hsl(var(--primary))"
          strokeWidth={3}
          fill="url(#overviewGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
