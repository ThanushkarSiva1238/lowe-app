"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { RecentShipmentRow } from "@/app/dashboard/analyticsData";

interface ShipmentProfitBarProps {
  data: RecentShipmentRow[];
}

export function ShipmentProfitBar({ data }: ShipmentProfitBarProps) {
  if (!data.length) {
    return (
      <p className="text-xs text-slate-500">
        No recent shipments available.
      </p>
    );
  }

  const chartData = data.map((s) => ({
    awb: s.awb_no,
    profit_lkr: Math.round(s.profit_lkr),
  }));

  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
          <XAxis
            dataKey="awb"
            tick={{ fontSize: 9 }}
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
              "Profit",
            ]}
          />
          <Bar dataKey="profit_lkr" fill="#22c55e" radius={2} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

