"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { formatCurrency } from "@/lib/format";
import * as wsManager from "@/lib/ws-manager";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  YAxis,
  XAxis,
  Tooltip,
} from "recharts";

type Candle = { date: string; close: number };
type LiveTick = { time: string; close: number };

const RANGES = [
  { label: "Live", days: 0 },
  { label: "1W", days: 7 },
  { label: "1M", days: 30 },
  { label: "3M", days: 90 },
];

export function StockChart({ symbol }: { symbol: string }) {
  const [range, setRange] = useState(wsManager.isAvailable() ? 0 : 30);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [liveTicks, setLiveTicks] = useState<LiveTick[]>([]);
  const [fetchState, setFetchState] = useState<"idle" | "loading" | "done">(range === 0 ? "idle" : "loading");
  const registrationRef = useRef<string | null>(null);

  const isLive = range === 0;

  const handleRangeChange = useCallback((newRange: number) => {
    setRange(newRange);
    if (newRange === 0) {
      setFetchState("idle");
      setLiveTicks([]);
    } else {
      setFetchState("loading");
    }
  }, []);

  // Historical data fetch
  useEffect(() => {
    if (isLive) return;
    let cancelled = false;
    fetch(`/api/prices/candles?symbol=${symbol}&days=${range}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) { setCandles(data); setFetchState("done"); }
      })
      .catch(() => {
        if (!cancelled) { setCandles([]); setFetchState("done"); }
      });
    return () => { cancelled = true; };
  }, [symbol, range, isLive]);

  // Live WebSocket ticks
  useEffect(() => {
    if (!isLive || !wsManager.isAvailable()) return;

    registrationRef.current = wsManager.register([symbol]);

    const onPrice = (sym: string, price: number) => {
      if (sym !== symbol.toUpperCase()) return;
      const now = new Date();
      const time = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" });
      setLiveTicks((prev) => {
        const next = [...prev, { time, close: price }];
        return next.length > 500 ? next.slice(-500) : next;
      });
    };

    wsManager.addPriceListener(onPrice);

    return () => {
      wsManager.removePriceListener(onPrice);
      if (registrationRef.current) {
        wsManager.unregister(registrationRef.current);
        registrationRef.current = null;
      }
    };
  }, [symbol, isLive]);

  // Loading state
  if (!isLive && fetchState === "loading") {
    return <div className="h-[140px] flex items-center justify-center"><div className="w-5 h-5 border-2 border-(--accent)/30 border-t-(--accent) rounded-full animate-spin" /></div>;
  }

  // Determine chart data
  const chartData = isLive
    ? liveTicks.map((t) => ({ date: t.time, close: t.close }))
    : candles;

  if (chartData.length < 2) {
    return (
      <div>
        <div className="h-[140px] flex items-center justify-center">
          <p className="text-xs text-(--text-secondary)/40">
            {isLive ? "Waiting for live data..." : "No chart data"}
          </p>
        </div>
        <ChartRangeTabs range={range} setRange={handleRangeChange} wsAvailable={wsManager.isAvailable()} />
      </div>
    );
  }

  const first = chartData[0].close;
  const last = chartData[chartData.length - 1].close;
  const isUp = last >= first;
  const color = isUp ? "#34D399" : "#F87171";
  const min = Math.min(...chartData.map((c) => c.close));
  const max = Math.max(...chartData.map((c) => c.close));
  const padding = (max - min) * 0.1 || 1;

  return (
    <div>
      <ResponsiveContainer width="100%" height={140}>
        <AreaChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
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

      <ChartRangeTabs range={range} setRange={handleRangeChange} wsAvailable={wsManager.isAvailable()} />
    </div>
  );
}

function ChartRangeTabs({ range, setRange, wsAvailable }: { range: number; setRange: (r: number) => void; wsAvailable: boolean }) {
  return (
    <div className="flex justify-center gap-1 mt-2">
      {RANGES.map((r) => {
        if (r.days === 0 && !wsAvailable) return null;
        return (
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
        );
      })}
    </div>
  );
}
