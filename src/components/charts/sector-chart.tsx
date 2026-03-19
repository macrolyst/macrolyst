"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import type { SectorData } from "@/lib/db/queries";

export function SectorChart({ sectors }: { sectors: SectorData[] }) {
  const sorted = [...sectors].sort((a, b) => (b.avgChange ?? 0) - (a.avgChange ?? 0));
  const data = sorted.map((s) => ({
    name: s.sector,
    change: s.avgChange ?? 0,
    count: s.stockCount,
  }));

  return (
    <ResponsiveContainer width="100%" height={sectors.length * 36 + 20}>
      <BarChart data={data} layout="vertical" margin={{ left: 0, right: 12, top: 0, bottom: 0 }}>
        <XAxis
          type="number"
          tickFormatter={(v) => `${v > 0 ? "+" : ""}${v.toFixed(2)}%`}
          tick={{ fill: "#94a3b8", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={130}
          tick={{ fill: "#f0ede6", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            background: "#1a2235",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 8,
            fontSize: 12,
            color: "#f0ede6",
          }}
          labelStyle={{ color: "#f0ede6" }}
          itemStyle={{ color: "#f0ede6" }}
          formatter={(value) => { const v = Number(value); return [`${v > 0 ? "+" : ""}${v.toFixed(3)}%`, "Avg Change"]; }}
        />
        <ReferenceLine x={0} stroke="rgba(255,255,255,0.1)" />
        <Bar dataKey="change" radius={[0, 4, 4, 0]} barSize={20}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.change >= 0 ? "#34D399" : "#F87171"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
