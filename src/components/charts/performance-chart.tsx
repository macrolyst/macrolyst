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

type PerformanceData = {
  portfolioReturn: number | null;
  benchmarkReturn: number | null;
  outperformance: number | null;
};

export function PerformanceChart({ data }: { data: PerformanceData }) {
  const chartData = [
    { name: "Our Picks", value: data.portfolioReturn ?? 0 },
    { name: "S&P 500", value: data.benchmarkReturn ?? 0 },
  ];

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={chartData} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
        <XAxis
          dataKey="name"
          tick={{ fill: "#f0ede6", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v) => `${v > 0 ? "+" : ""}${v.toFixed(1)}%`}
          tick={{ fill: "#94a3b8", fontSize: 11 }}
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
          formatter={(value: number) => [`${value > 0 ? "+" : ""}${value.toFixed(2)}%`, "Return"]}
          labelStyle={{ color: "#f0ede6" }}
          itemStyle={{ color: "#f0ede6" }}
        />
        <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={60}>
          {chartData.map((_, i) => (
            <Cell key={i} fill={i === 0 ? "#34D399" : "#94a3b8"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
