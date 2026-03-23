"use client";

import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/format";
import { ChangeBadge } from "@/components/ui/change-badge";
import Link from "next/link";

type Stock = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  avgVolume: number;
  volumeRatio: number;
};

function formatVolume(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toString();
}

const POLL_INTERVAL = 15 * 60 * 1000;

export function MoversView() {
  const [tab, setTab] = useState<"gainers" | "losers">("gainers");
  const [gainers, setGainers] = useState<Stock[]>([]);
  const [losers, setLosers] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        const [gRes, lRes] = await Promise.all([
          fetch("/api/movers?type=day_gainers"),
          fetch("/api/movers?type=day_losers"),
        ]);
        if (!cancelled) {
          if (gRes.ok) {
            const gData = await gRes.json();
            setGainers(gData.stocks);
            setLastFetched(new Date(gData.fetchedAt));
          }
          if (lRes.ok) {
            const lData = await lRes.json();
            setLosers(lData.stocks);
          }
        }
      } catch { /* ignore */ }
      finally { if (!cancelled) setLoading(false); }
    };
    fetchData();
    const poll = setInterval(fetchData, POLL_INTERVAL);
    return () => { cancelled = true; clearInterval(poll); };
  }, []);

  const stocks = tab === "gainers" ? gainers : losers;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-(--accent)/30 border-t-(--accent) rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-(--text-secondary)">{stocks.length} stocks</span>
          {lastFetched && (
            <span className="text-[10px] text-(--text-secondary)/50">
              Updated {lastFetched.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} — refreshes every 15 min
            </span>
          )}
        </div>
        <div className="flex gap-1 bg-(--surface-2) rounded-lg p-1">
          <button
            onClick={() => setTab("gainers")}
            className={`px-4 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors ${
              tab === "gainers" ? "bg-(--up)/20 text-(--up)" : "text-(--text-secondary)"
            }`}
          >
            Gainers
          </button>
          <button
            onClick={() => setTab("losers")}
            className={`px-4 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors ${
              tab === "losers" ? "bg-(--down)/20 text-(--down)" : "text-(--text-secondary)"
            }`}
          >
            Losers
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card-glow overflow-hidden">
        {/* Header — desktop only */}
        <div className="hidden sm:grid grid-cols-12 gap-2 px-4 py-2.5 border-b border-(--border) text-[10px] text-(--text-secondary) uppercase tracking-wider">
          <div className="col-span-1">#</div>
          <div className="col-span-3">Stock</div>
          <div className="col-span-2 text-right">Price</div>
          <div className="col-span-2 text-right">Change</div>
          <div className="col-span-2 text-right">Volume</div>
          <div className="col-span-1 text-right">Vol Ratio</div>
          <div className="col-span-1 text-right"></div>
        </div>

        {/* Rows */}
        {stocks.map((stock, i) => (
          <div key={stock.symbol}>
            {/* Desktop row */}
            <div className="hidden sm:grid grid-cols-12 gap-2 px-4 py-2.5 border-b border-(--border) last:border-0 hover:bg-white/[0.02] transition-colors items-center">
              <div className="col-span-1 text-xs text-(--text-secondary)/50 font-mono">{i + 1}</div>
              <div className="col-span-3">
                <p className="text-sm font-semibold text-white">{stock.symbol}</p>
                <p className="text-[10px] text-(--text-secondary) truncate">{stock.name}</p>
              </div>
              <div className="col-span-2 text-right">
                <p className="text-sm font-mono text-white">{formatCurrency(stock.price)}</p>
              </div>
              <div className="col-span-2 text-right">
                <ChangeBadge value={stock.changePercent} className="text-xs" />
              </div>
              <div className="col-span-2 text-right">
                <p className="text-xs font-mono text-white">{formatVolume(stock.volume)}</p>
              </div>
              <div className="col-span-1 text-right">
                <span className={`text-xs font-mono font-semibold ${
                  stock.volumeRatio >= 2 ? "text-(--up)" : stock.volumeRatio >= 1.5 ? "text-(--gold)" : "text-white"
                }`}>
                  {stock.volumeRatio.toFixed(1)}x
                </span>
              </div>
              <div className="col-span-1 text-right">
                <Link href={`/dashboard/trading?buy=${stock.symbol}`} className="text-xs text-(--accent) font-semibold px-2 py-0.5 rounded border border-(--accent)/30 hover:bg-(--accent)/10">Buy</Link>
              </div>
            </div>
            {/* Mobile row */}
            <div className="sm:hidden flex items-center justify-between px-4 py-3 border-b border-(--border) last:border-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] text-(--text-secondary)/50 font-mono">{i + 1}</span>
                <div className="min-w-0">
                  <span className="text-sm font-semibold text-white">{stock.symbol}</span>
                  <p className="text-[10px] text-(--text-secondary) truncate">{stock.name}</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="flex items-center gap-2 justify-end">
                  <span className="text-sm font-mono text-white">{formatCurrency(stock.price)}</span>
                  <ChangeBadge value={stock.changePercent} className="text-[10px]" />
                </div>
                <div className="flex items-center gap-2 justify-end mt-0.5">
                  <span className="text-[10px] text-(--text-secondary)">{formatVolume(stock.volume)}</span>
                  <span className={`text-[10px] font-mono font-semibold ${
                    stock.volumeRatio >= 2 ? "text-(--up)" : stock.volumeRatio >= 1.5 ? "text-(--gold)" : "text-white"
                  }`}>
                    {stock.volumeRatio.toFixed(1)}x
                  </span>
                  <Link href={`/dashboard/trading?buy=${stock.symbol}`} className="text-xs text-(--accent) font-semibold px-2 py-0.5 rounded border border-(--accent)/30 hover:bg-(--accent)/10">Buy</Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
