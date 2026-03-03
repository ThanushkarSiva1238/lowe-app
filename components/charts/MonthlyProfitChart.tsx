"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import type { MonthlyProfitRow } from "@/app/dashboard/analyticsData";

interface MonthlyProfitChartProps {
  data: MonthlyProfitRow[];
}

export function MonthlyProfitChart({ data }: MonthlyProfitChartProps) {
  if (!data.length) {
    return (
      <p className="text-xs text-slate-500">
        No shipments available yet. Profit trend will appear here once data is
        recorded.
      </p>
    );
  }

  const chartData = data.map((m) => ({
    month: m.month ? m.month.slice(0, 7) : "Unknown",
    net_profit_lkr: Math.round(m.net_profit),
  }));

  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: "#cbd5f5" }}
          />
          <YAxis
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: "#cbd5f5" }}
          />
          <Tooltip
            contentStyle={{
              fontSize: 11,
              borderRadius: 6,
              borderColor: "#e5e7eb",
            }}
            formatter={(value?: number) => [
              `${(value ?? 0).toLocaleString()} LKR`,
              "Net profit",
            ]}
          />
          <Line
            type="monotone"
            dataKey="net_profit_lkr"
            stroke="#0284c7"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

