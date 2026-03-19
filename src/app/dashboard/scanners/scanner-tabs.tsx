"use client";

import { useState, useMemo } from "react";
import type { ScannerResult } from "@/lib/db/queries";

const SCANNER_LABELS: Record<string, { label: string; description: string }> = {
  rsi_oversold: {
    label: "RSI Oversold",
    description: "Stocks with RSI below 30, potentially oversold and due for a bounce.",
  },
  golden_cross: {
    label: "Golden Cross",
    description: "50-day SMA crossing above 200-day SMA, a bullish long-term signal.",
  },
  macd_bullish: {
    label: "MACD Bullish",
    description: "MACD histogram turning positive, indicating bullish momentum.",
  },
  volume_breakout: {
    label: "Volume Breakout",
    description: "Volume exceeding 2x the 20-day average, signaling unusual interest.",
  },
  bollinger_oversold: {
    label: "Bollinger Oversold",
    description: "Price touching or below the lower Bollinger Band.",
  },
  near_52w_low: {
    label: "Near 52W Low",
    description: "Trading within 5% of the 52-week low.",
  },
  biggest_gainers: {
    label: "Biggest Gainers",
    description: "Top 20 stocks by daily price increase.",
  },
  biggest_losers: {
    label: "Biggest Losers",
    description: "Top 20 stocks by daily price decline.",
  },
};

export function ScannerTabs({ results }: { results: ScannerResult[] }) {
  const scannerTypes = useMemo(() => {
    const types = new Set(results.map((r) => r.scannerType));
    return Array.from(types);
  }, [results]);

  const [activeTab, setActiveTab] = useState(scannerTypes[0] ?? "rsi_oversold");

  const activeResults = useMemo(
    () => results.filter((r) => r.scannerType === activeTab),
    [results, activeTab]
  );

  const info = SCANNER_LABELS[activeTab] ?? { label: activeTab, description: "" };

  return (
    <div>
      <div className="flex gap-1 mb-6 overflow-x-auto pb-2">
        {scannerTypes.map((type) => {
          const label = SCANNER_LABELS[type]?.label ?? type;
          const count = results.filter((r) => r.scannerType === type).length;
          return (
            <button
              key={type}
              onClick={() => setActiveTab(type)}
              className={`px-3 py-2 rounded-lg text-xs whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === type
                  ? "bg-(--accent)/15 text-(--accent) border border-(--accent)/30"
                  : "bg-(--surface-2) text-(--text-secondary) border border-transparent hover:bg-(--surface-3)"
              }`}
            >
              {label}
              <span className="ml-1.5 text-(--text-secondary)/60">{count}</span>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-(--text-secondary) mb-4">{info.description}</p>

      {activeResults.length > 0 ? (
        <>
          <div className="grid grid-cols-[3rem_5rem_1fr] gap-2 px-4 py-2 border-b border-(--border)">
            <span className="text-xs text-(--text-secondary) uppercase tracking-wider">#</span>
            <span className="text-xs text-(--text-secondary) uppercase tracking-wider">Ticker</span>
            <span className="text-xs text-(--text-secondary) uppercase tracking-wider">Name</span>
          </div>
          <div className="divide-y divide-(--border)">
            {activeResults.map((result, i) => (
              <div key={`${result.ticker}-${i}`} className="grid grid-cols-[3rem_5rem_1fr] gap-2 px-4 py-3 items-center hover:bg-(--surface-2)/30 transition-colors">
                <span className="text-xs font-mono text-(--text-secondary)">{i + 1}</span>
                <span className="text-sm font-semibold text-white">{result.ticker}</span>
                <span className="text-sm text-(--text-secondary) truncate">{result.name}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="text-sm text-(--text-secondary) py-8 text-center">No stocks match this scanner.</p>
      )}
    </div>
  );
}
