"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCurrency } from "@/lib/format";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  YAxis,
  XAxis,
  Tooltip,
} from "recharts";

type Candle = { date: string; close: number };

const RANGES = [
  { label: "1D", days: 1 },
  { label: "1W", days: 7 },
  { label: "1M", days: 30 },
  { label: "3M", days: 90 },
];

export function StockChart({ symbol }: { symbol: string }) {
  const [range, setRange] = useState(1);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [fetchState, setFetchState] = useState<"loading" | "done">("loading");

  const handleRangeChange = useCallback((newRange: number) => {
    setRange(newRange);
    setFetchState("loading");
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/prices/candles?symbol=${symbol}&days=${range}`)
      .then((r) => r.json())
      .then((data) => { if (!cancelled) { setCandles(data); setFetchState("done"); } })
      .catch(() => { if (!cancelled) { setCandles([]); setFetchState("done"); } });
    return () => { cancelled = true; };
  }, [symbol, range]);

  if (fetchState === "loading") {
    return <div className="h-35 flex items-center justify-center"><div className="w-5 h-5 border-2 border-(--accent)/30 border-t-(--accent) rounded-full animate-spin" /></div>;
  }

  if (candles.length < 2) {
    return (
      <div>
        <div className="h-35 flex items-center justify-center">
          <p className="text-xs text-(--text-secondary)/40">No chart data</p>
        </div>
        <ChartRangeTabs range={range} setRange={handleRangeChange} />
      </div>
    );
  }

  const first = candles[0].close;
  const last = candles[candles.length - 1].close;
  const isUp = last >= first;
  const color = isUp ? "#34D399" : "#F87171";
  const min = Math.min(...candles.map((c) => c.close));
  const max = Math.max(...candles.map((c) => c.close));
  const padding = (max - min) * 0.1 || 1;

  return (
    <div>
      <ResponsiveContainer width="100%" height={140}>
        <AreaChart data={candles} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`stockGrad-${symbol}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.2} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis domain={[min - padding, max + padding]} hide />
          <XAxis dataKey="date" hide />
          <Tooltip
            position={{ y: -10 }}
            wrapperStyle={{ zIndex: 100 }}
            contentStyle={{ background: "#1a2235", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, fontSize: 12, color: "#f0ede6", pointerEvents: "none" }}
            formatter={(value) => [formatCurrency(Number(value)), "Price"]}
            labelStyle={{ color: "#94a3b8", fontSize: 10 }}
            isAnimationActive={false}
          />
          <Area type="monotone" dataKey="close" stroke={color} fill={`url(#stockGrad-${symbol})`} strokeWidth={2} dot={false} />
        </AreaChart>
      </ResponsiveContainer>

      <ChartRangeTabs range={range} setRange={handleRangeChange} />
    </div>
  );
}

function ChartRangeTabs({ range, setRange }: { range: number; setRange: (r: number) => void }) {
  return (
    <div className="flex justify-center gap-1 mt-2">
      {RANGES.map((r) => (
        <button
          key={r.days}
          onClick={() => setRange(r.days)}
          className={`px-3 py-1 rounded-md text-[10px] font-medium cursor-pointer transition-colors ${
            range === r.days
              ? "bg-(--accent)/15 text-(--accent)"
              : "text-(--text-secondary) hover:text-white"
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
