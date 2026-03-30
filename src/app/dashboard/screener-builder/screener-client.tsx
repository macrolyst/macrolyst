"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/format";
import { ChangeBadge } from "@/components/ui/change-badge";

type FilterDef = {
  key: string;
  label: string;
  type: "number" | "select";
  options?: string[];
};

const FILTERS: FilterDef[] = [
  { key: "rsi", label: "RSI", type: "number" },
  { key: "macdHist", label: "MACD", type: "number" },
  { key: "volRatio", label: "Volume Ratio", type: "number" },
  { key: "peRatio", label: "P/E Ratio", type: "number" },
  { key: "change1d", label: "1D Change %", type: "number" },
  { key: "change5d", label: "5D Change %", type: "number" },
  { key: "change20d", label: "20D Change %", type: "number" },
  { key: "compositeScore", label: "Score", type: "number" },
  { key: "annualVolatility", label: "Volatility %", type: "number" },
  { key: "sharpeRatio", label: "Sharpe Ratio", type: "number" },
  { key: "maxDrawdownPct", label: "Max Drawdown %", type: "number" },
  { key: "upsidePct", label: "Analyst Upside %", type: "number" },
  { key: "sector", label: "Sector", type: "select", options: [
    "Information Technology", "Health Care", "Financials", "Consumer Discretionary",
    "Communication Services", "Industrials", "Consumer Staples", "Energy",
    "Utilities", "Real Estate", "Materials",
  ]},
  { key: "recommendation", label: "Wall St. Rating", type: "select", options: [
    "strong_buy", "buy", "hold", "sell", "strong_sell",
  ]},
];

const NUM_OPS = [
  { value: "lt", label: "<" },
  { value: "lte", label: "≤" },
  { value: "gt", label: ">" },
  { value: "gte", label: "≥" },
  { value: "eq", label: "=" },
];

type ActiveFilter = {
  id: number;
  field: string;
  op: string;
  value: string;
};

type Stock = {
  rank: number | null;
  ticker: string;
  name: string | null;
  sector: string | null;
  price: number | null;
  change1d: number | null;
  change5d: number | null;
  rsi: number | null;
  peRatio: number | null;
  volRatio: number | null;
  compositeScore: number | null;
  marketCap: number | null;
  recommendation: string | null;
};

type Preset = { name: string; filters: { field: string; op: string; value: string }[] };

const PRESETS: Preset[] = [
  { name: "Oversold Bargains", filters: [
    { field: "rsi", op: "lt", value: "30" },
    { field: "change5d", op: "lt", value: "-5" },
  ]},
  { name: "Momentum Plays", filters: [
    { field: "change5d", op: "gt", value: "5" },
    { field: "volRatio", op: "gt", value: "1.5" },
  ]},
  { name: "Value Picks", filters: [
    { field: "peRatio", op: "lt", value: "15" },
    { field: "peRatio", op: "gt", value: "0" },
  ]},
  { name: "Low Risk", filters: [
    { field: "annualVolatility", op: "lt", value: "20" },
    { field: "sharpeRatio", op: "gt", value: "1" },
  ]},
  { name: "High Upside", filters: [
    { field: "upsidePct", op: "gt", value: "20" },
  ]},
];

function fmtCap(v: number | null): string {
  if (!v) return "--";
  if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(0)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
  return `$${v.toLocaleString()}`;
}

export function ScreenerClient() {
  const [filters, setFilters] = useState<ActiveFilter[]>([]);
  const [results, setResults] = useState<Stock[] | null>(null);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState("compositeScore");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  let nextId = filters.length > 0 ? Math.max(...filters.map((f) => f.id)) + 1 : 1;

  function addFilter() {
    setFilters([...filters, { id: nextId++, field: "rsi", op: "lt", value: "30" }]);
  }

  function removeFilter(id: number) {
    setFilters(filters.filter((f) => f.id !== id));
  }

  function updateFilter(id: number, key: string, value: string) {
    setFilters(filters.map((f) => f.id === id ? { ...f, [key]: value } : f));
  }

  function applyPreset(preset: Preset) {
    const newFilters = preset.filters.map((f, i) => ({ id: i + 1, ...f }));
    setFilters(newFilters);
    runScreener(newFilters, sortBy, sortDir);
  }

  async function runScreener(activeFilters?: ActiveFilter[], sort?: string, dir?: string) {
    setLoading(true);
    const f = activeFilters || filters;
    const s = sort || sortBy;
    const d = dir || sortDir;

    const params = new URLSearchParams();
    for (const filter of f) {
      if (!filter.value) continue;
      const def = FILTERS.find((fd) => fd.key === filter.field);
      if (!def) continue;
      if (def.type === "select") {
        params.set(`${filter.field}_eq`, filter.value);
      } else {
        params.set(`${filter.field}_${filter.op}`, filter.value);
      }
    }
    params.set("sort", s);
    params.set("dir", d);

    try {
      const res = await fetch(`/api/screener?${params.toString()}`);
      const data = await res.json();
      setResults(data.stocks);
      setCount(data.count);
    } catch {
      setResults([]);
      setCount(0);
    } finally {
      setLoading(false);
    }
  }

  function handleSort(col: string) {
    const newDir = sortBy === col && sortDir === "desc" ? "asc" : "desc";
    setSortBy(col);
    setSortDir(newDir);
    if (results) runScreener(filters, col, newDir);
  }

  function SortHeader({ col, label, className = "" }: { col: string; label: string; className?: string }) {
    const active = sortBy === col;
    return (
      <th
        className={`py-2 px-2 cursor-pointer hover:text-white transition-colors select-none ${active ? "text-(--accent)" : "text-(--text-secondary)"} ${className}`}
        onClick={() => handleSort(col)}
      >
        {label} {active && (sortDir === "desc" ? "↓" : "↑")}
      </th>
    );
  }

  return (
    <div className="space-y-4">
      {/* Presets */}
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.name}
            onClick={() => applyPreset(p)}
            className="text-[10px] px-3 py-1.5 rounded-lg bg-(--surface-2) border border-(--border) text-(--text-secondary) hover:text-white hover:border-(--accent)/30 transition-colors cursor-pointer"
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Filter builder */}
      <div className="card-glow p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-(--text-secondary) uppercase tracking-wider">Filters</p>
          <button
            onClick={addFilter}
            className="text-[10px] px-3 py-1 rounded-lg bg-(--accent)/15 text-(--accent) hover:bg-(--accent)/25 transition-colors cursor-pointer"
          >
            + Add Filter
          </button>
        </div>

        {filters.length === 0 && (
          <p className="text-xs text-(--text-secondary) py-6 text-center">No filters added. Click &quot;+ Add Filter&quot; or pick a preset above to get started.</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filters.map((f) => {
            const def = FILTERS.find((fd) => fd.key === f.field);
            const isSelect = def?.type === "select";

            return (
              <div key={f.id} className="rounded-lg bg-(--surface-2) border border-(--border) p-3">
                {/* Field selector */}
                <select
                  value={f.field}
                  onChange={(e) => {
                    const newDef = FILTERS.find((fd) => fd.key === e.target.value);
                    updateFilter(f.id, "field", e.target.value);
                    if (newDef?.type === "select") updateFilter(f.id, "op", "eq");
                  }}
                  className="w-full bg-(--surface-3) border border-(--border) rounded-lg px-3 py-2 text-sm text-white outline-none mb-2"
                >
                  {FILTERS.map((fd) => (
                    <option key={fd.key} value={fd.key}>{fd.label}</option>
                  ))}
                </select>

                {/* Operator + Value + Remove */}
                {isSelect ? (
                  <div className="flex gap-2">
                    <select
                      value={f.value}
                      onChange={(e) => updateFilter(f.id, "value", e.target.value)}
                      className="flex-1 bg-(--surface-3) border border-(--border) rounded-lg px-3 py-2 text-sm text-white outline-none"
                    >
                      <option value="">Select...</option>
                      {def?.options?.map((o) => (
                        <option key={o} value={o}>{o.replace(/_/g, " ")}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => removeFilter(f.id)}
                      className="shrink-0 px-3 flex items-center justify-center rounded-lg bg-(--surface-3) border border-(--border) text-[10px] text-(--text-secondary) hover:text-(--down) hover:border-(--down)/30 cursor-pointer transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <select
                      value={f.op}
                      onChange={(e) => updateFilter(f.id, "op", e.target.value)}
                      className="bg-(--surface-3) border border-(--border) rounded-lg px-3 py-2 text-sm text-white outline-none w-14 text-center shrink-0"
                    >
                      {NUM_OPS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={f.value}
                      onChange={(e) => updateFilter(f.id, "value", e.target.value)}
                      placeholder="Value"
                      className="flex-1 bg-(--surface-3) border border-(--border) rounded-lg px-3 py-2 text-sm text-white outline-none"
                      step="any"
                    />
                    <button
                      onClick={() => removeFilter(f.id)}
                      className="shrink-0 px-3 flex items-center justify-center rounded-lg bg-(--surface-3) border border-(--border) text-[10px] text-(--text-secondary) hover:text-(--down) hover:border-(--down)/30 cursor-pointer transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filters.length > 0 && (
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-(--border)">
            <button
              onClick={() => { setFilters([]); setResults(null); }}
              className="text-xs text-(--text-secondary) hover:text-white cursor-pointer"
            >
              Clear all
            </button>
            <button
              onClick={() => runScreener()}
              disabled={loading}
              className="px-6 py-2.5 rounded-lg bg-(--accent)/15 text-(--accent) text-sm font-medium hover:bg-(--accent)/25 transition-colors disabled:opacity-40 cursor-pointer"
            >
              {loading ? "Scanning..." : "Run Screener"}
            </button>
          </div>
        )}
      </div>

      {/* Results */}
      {results !== null && (
        <div className="card-glow p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-(--text-secondary) uppercase tracking-wider">Results</p>
            <span className="text-xs text-(--text-secondary)">{count} stocks found</span>
          </div>

          {results.length === 0 ? (
            <p className="text-xs text-(--text-secondary) py-8 text-center">No stocks match your criteria. Try adjusting filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-(--border) text-[10px] uppercase">
                    <th className="text-left text-(--text-secondary) py-2 pr-2 w-8">#</th>
                    <SortHeader col="ticker" label="Ticker" className="text-left" />
                    <th className="text-left text-(--text-secondary) py-2 px-2 hidden sm:table-cell">Sector</th>
                    <SortHeader col="price" label="Price" className="text-right" />
                    <SortHeader col="change1d" label="1D" className="text-right" />
                    <SortHeader col="change5d" label="5D" className="text-right hidden sm:table-cell" />
                    <SortHeader col="rsi" label="RSI" className="text-right" />
                    <SortHeader col="peRatio" label="P/E" className="text-right hidden sm:table-cell" />
                    <SortHeader col="volRatio" label="Vol" className="text-right hidden lg:table-cell" />
                    <SortHeader col="compositeScore" label="Score" className="text-right" />
                    <th className="text-right text-(--text-secondary) py-2 pl-2 hidden lg:table-cell">Mkt Cap</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((s, i) => (
                    <tr key={s.ticker} className="border-b border-(--border)/30 hover:bg-white/[0.02] transition-colors">
                      <td className="py-2 pr-2 text-(--text-secondary)">{i + 1}</td>
                      <td className="py-2 px-2">
                        <span className="font-semibold text-white">{s.ticker}</span>
                        <span className="text-[10px] text-(--text-secondary) ml-1.5 hidden sm:inline">{s.name}</span>
                      </td>
                      <td className="py-2 px-2 text-(--text-secondary) hidden sm:table-cell">{s.sector?.replace("Information Technology", "Tech").replace("Communication Services", "Comms").replace("Consumer Discretionary", "Cons. Disc.").replace("Consumer Staples", "Cons. Stpls")}</td>
                      <td className="py-2 px-2 text-right text-white font-mono">{formatCurrency(s.price)}</td>
                      <td className="py-2 px-2 text-right"><ChangeBadge value={s.change1d} className="text-[10px]" /></td>
                      <td className="py-2 px-2 text-right hidden sm:table-cell"><ChangeBadge value={s.change5d} className="text-[10px]" /></td>
                      <td className="py-2 px-2 text-right font-mono" style={{ color: s.rsi && s.rsi < 30 ? "#F87171" : s.rsi && s.rsi > 70 ? "#FBBF24" : "#f0ede6" }}>{s.rsi?.toFixed(1) ?? "--"}</td>
                      <td className="py-2 px-2 text-right font-mono text-white hidden sm:table-cell">{s.peRatio?.toFixed(1) ?? "--"}</td>
                      <td className="py-2 px-2 text-right font-mono hidden lg:table-cell" style={{ color: s.volRatio && s.volRatio >= 2 ? "#FBBF24" : "#f0ede6" }}>{s.volRatio?.toFixed(1) ?? "--"}x</td>
                      <td className="py-2 px-2 text-right font-mono text-(--accent) font-semibold">{s.compositeScore?.toFixed(0) ?? "--"}</td>
                      <td className="py-2 pl-2 text-right text-(--text-secondary) font-mono hidden lg:table-cell">{fmtCap(s.marketCap)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
