"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from "recharts";
import type { CatalystHourData } from "@/lib/db/queries";
import { useIsMobile } from "./use-is-mobile";

export function CatalystChart({ hours }: { hours: CatalystHourData[] }) {
  const isMobile = useIsMobile();
  const data = hours.map((h) => ({
    time: h.time,
    price: h.close,
    change: h.changeFromOpen,
    significant: h.significant,
    newsCount: h.news.length,
  }));

  const prices = data.map((d) => d.price).filter((p): p is number => p !== null);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const padding = (max - min) * 0.1 || 1;
  const isUp = data.length > 0 && (data[data.length - 1]?.price ?? 0) >= (data[0]?.price ?? 0);

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="catalystGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isUp ? "#34D399" : "#F87171"} stopOpacity={0.3} />
            <stop offset="100%" stopColor={isUp ? "#34D399" : "#F87171"} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="time"
          tick={{ fill: "#94a3b8", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[min - padding, max + padding]}
          tick={{ fill: "#94a3b8", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `$${v.toFixed(0)}`}
          width={50}
        />
        <Tooltip
          trigger={isMobile ? "click" : "hover"}
          contentStyle={{
            background: "#1a2235",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 8,
            fontSize: 12,
            color: "#f0ede6",
          }}
          formatter={(value) => [`$${Number(value).toFixed(2)}`, "SPY"]}
          labelStyle={{ color: "#f0ede6" }}
          itemStyle={{ color: "#f0ede6" }}
        />
        <Area
          type="monotone"
          dataKey="price"
          stroke={isUp ? "#34D399" : "#F87171"}
          fill="url(#catalystGrad)"
          strokeWidth={2}
        />
        {data
          .filter((d) => d.significant)
          .map((d, i) => (
            <ReferenceDot
              key={i}
              x={d.time}
              y={d.price!}
              r={4}
              fill={isUp ? "#34D399" : "#F87171"}
              stroke="#0B1120"
              strokeWidth={2}
            />
          ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
