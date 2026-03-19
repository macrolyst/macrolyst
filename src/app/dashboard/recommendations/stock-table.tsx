"use client";

import { useState, useMemo } from "react";
import type { StockScore } from "@/lib/db/queries";
import { formatCurrency, formatPercent, formatMarketCap } from "@/lib/format";
import { ChangeBadge } from "@/components/ui/change-badge";
import { ScoreBar } from "@/components/ui/score-bar";

type SortKey = "rank" | "ticker" | "compositeScore" | "price" | "change1d" | "upsidePct";
type SortDir = "asc" | "desc";

export function StockTable({ stocks }: { stocks: StockScore[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [sectorFilter, setSectorFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const sectors = useMemo(() => {
    const set = new Set(stocks.map((s) => s.sector).filter(Boolean) as string[]);
    return ["all", ...Array.from(set).sort()];
  }, [stocks]);

  const sorted = useMemo(() => {
    const filtered = sectorFilter === "all" ? stocks : stocks.filter((s) => s.sector === sectorFilter);
    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey] ?? 0;
      const bVal = b[sortKey] ?? 0;
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
  }, [stocks, sortKey, sortDir, sectorFilter]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir(key === "rank" ? "asc" : "desc");
    }
  }

  function SortHeader({ label, field, className = "" }: { label: string; field: SortKey; className?: string }) {
    const active = sortKey === field;
    return (
      <button
        onClick={() => toggleSort(field)}
        className={`flex items-center gap-1 text-xs uppercase tracking-wider cursor-pointer hover:text-white transition-colors ${
          active ? "text-white" : "text-(--text-secondary)"
        } ${className}`}
      >
        {label}
        {active && <span>{sortDir === "asc" ? "↑" : "↓"}</span>}
      </button>
    );
  }

  return (
    <div>
      {/* Sector filter */}
      <div className="flex gap-2 mb-4 flex-wrap px-4 pt-4">
        {sectors.map((s) => (
          <button
            key={s}
            onClick={() => setSectorFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
              sectorFilter === s
                ? "bg-(--accent)/15 text-(--accent) border border-(--accent)/30"
                : "bg-(--surface-2) text-(--text-secondary) border border-transparent hover:bg-(--surface-3)"
            }`}
          >
            {s === "all" ? "All Sectors" : s}
          </button>
        ))}
      </div>

      {/* Sort controls for mobile */}
      <div className="flex gap-2 px-4 pb-3 overflow-x-auto md:hidden">
        {(["rank", "compositeScore", "price", "change1d", "upsidePct"] as SortKey[]).map((key) => {
          const labels: Record<SortKey, string> = { rank: "#", ticker: "Ticker", compositeScore: "Score", price: "Price", change1d: "1D", upsidePct: "Upside" };
          return (
            <button
              key={key}
              onClick={() => toggleSort(key)}
              className={`px-2 py-1 rounded text-[10px] uppercase tracking-wider cursor-pointer whitespace-nowrap ${
                sortKey === key ? "text-white bg-(--surface-3)" : "text-(--text-secondary) bg-(--surface-2)"
              }`}
            >
              {labels[key]} {sortKey === key && (sortDir === "asc" ? "↑" : "↓")}
            </button>
          );
        })}
      </div>

      {/* Table header - desktop only via media query */}
      <div className="hidden md:grid grid-cols-[3rem_5rem_1fr_5rem_5rem_5rem_4rem] gap-2 px-4 py-2 border-b border-(--border)">
        <SortHeader label="#" field="rank" />
        <SortHeader label="Ticker" field="ticker" />
        <span className="text-xs text-(--text-secondary) uppercase tracking-wider">Name</span>
        <SortHeader label="Price" field="price" className="justify-end" />
        <SortHeader label="1D" field="change1d" className="justify-end" />
        <SortHeader label="Upside" field="upsidePct" className="justify-end" />
        <SortHeader label="Score" field="compositeScore" className="justify-end" />
      </div>

      {/* Rows */}
      <div className="divide-y divide-(--border)">
        {sorted.map((stock) => (
          <div key={stock.ticker}>
            <button
              onClick={() => setExpanded(expanded === stock.ticker ? null : stock.ticker)}
              className="w-full text-left cursor-pointer hover:bg-(--surface-2)/50 transition-colors"
            >
              {/* Desktop row */}
              <div className="hidden md:grid grid-cols-[3rem_5rem_1fr_5rem_5rem_5rem_4rem] gap-2 px-4 py-3 items-center">
                <span className="text-xs font-mono text-(--text-secondary)">{stock.rank}</span>
                <span className="text-sm font-semibold text-white">{stock.ticker}</span>
                <span className="text-sm text-(--text-secondary) truncate">{stock.name}</span>
                <span className="text-sm text-white text-right">{formatCurrency(stock.price)}</span>
                <div className="text-right"><ChangeBadge value={stock.change1d ? stock.change1d * 100 : null} className="text-xs" /></div>
                <div className="text-right"><ChangeBadge value={stock.upsidePct} className="text-xs" /></div>
                <span className="text-sm font-bold text-(--accent) text-right">{stock.compositeScore?.toFixed(0) ?? "--"}</span>
              </div>
              {/* Mobile row */}
              <div className="flex flex-col gap-1 px-4 py-3 md:hidden">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-(--text-secondary)">{stock.rank}</span>
                    <span className="text-sm font-semibold text-white">{stock.ticker}</span>
                    <span className="text-xs text-(--text-secondary) truncate max-w-32">{stock.name}</span>
                  </div>
                  <span className="text-sm font-bold text-(--accent)">{stock.compositeScore?.toFixed(0) ?? "--"}</span>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-(--text-secondary)">{formatCurrency(stock.price)}</span>
                  <ChangeBadge value={stock.change1d ? stock.change1d * 100 : null} className="text-xs" />
                  <span className="text-(--text-secondary)">Target: {formatCurrency(stock.targetMean)}</span>
                </div>
              </div>
            </button>

            {/* Expanded detail */}
            {expanded === stock.ticker && (
              <div className="px-4 pb-4 bg-(--surface-2)/30 border-t border-(--border)">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                  <div>
                    <p className="text-xs text-(--text-secondary) uppercase tracking-wider mb-3">Score Breakdown</p>
                    <div className="space-y-2">
                      <ScoreBar label="Analyst" value={stock.scoreAnalyst} />
                      <ScoreBar label="Technical" value={stock.scoreTechnical} />
                      <ScoreBar label="Momentum" value={stock.scoreMomentum} />
                      <ScoreBar label="Volume" value={stock.scoreVolume} />
                      <ScoreBar label="News" value={stock.scoreNews} />
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-(--text-secondary) uppercase tracking-wider mb-3">Key Metrics</p>
                    <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                      <span className="text-(--text-secondary)">RSI (14)</span>
                      <span className="text-white text-right">{stock.rsi?.toFixed(1) ?? "--"}</span>
                      <span className="text-(--text-secondary)">P/E Ratio</span>
                      <span className="text-white text-right">{stock.peRatio?.toFixed(1) ?? "--"}</span>
                      <span className="text-(--text-secondary)">Market Cap</span>
                      <span className="text-white text-right">{formatMarketCap(stock.marketCap)}</span>
                      <span className="text-(--text-secondary)">Sharpe Ratio</span>
                      <span className="text-white text-right">{stock.sharpeRatio?.toFixed(2) ?? "--"}</span>
                      <span className="text-(--text-secondary)">Volatility</span>
                      <span className="text-white text-right">{stock.annualVolatility?.toFixed(1) ?? "--"}%</span>
                      <span className="text-(--text-secondary)">Max Drawdown</span>
                      <span className="text-(--down) text-right">{stock.maxDrawdownPct ? `-${stock.maxDrawdownPct.toFixed(1)}%` : "--"}</span>
                      <span className="text-(--text-secondary)">52W Range</span>
                      <span className="text-white text-right">{formatCurrency(stock.yearLow)} - {formatCurrency(stock.yearHigh)}</span>
                      <span className="text-(--text-secondary)">Sector Rank</span>
                      <span className="text-white text-right">{stock.sectorRank ?? "--"} / {stock.sectorCount ?? "--"}</span>
                    </div>
                  </div>
                </div>

                {stock.reasons && stock.reasons.length > 0 && (
                  <div className="pt-3 border-t border-(--border)">
                    <p className="text-xs text-(--text-secondary) uppercase tracking-wider mb-2">Reasons</p>
                    <ul className="space-y-1">
                      {stock.reasons.map((reason, i) => (
                        <li key={i} className="text-xs text-(--text-primary) flex gap-2">
                          <span className="text-(--accent) shrink-0">-</span>
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-(--text-secondary) mt-4 px-4 pb-4">
        Showing {sorted.length} of {stocks.length} stocks.
        Scores range 0-100 (composite of analyst upside, technical, momentum, volume, and news sentiment).
      </p>
    </div>
  );
}
