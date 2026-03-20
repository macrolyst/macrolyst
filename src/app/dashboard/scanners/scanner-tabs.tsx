"use client";

import { useState, useMemo } from "react";
import type { ScannerResult } from "@/lib/db/queries";
import { formatCurrency } from "@/lib/format";
import { ChangeBadge } from "@/components/ui/change-badge";
import Link from "next/link";

const SCANNER_INFO: Record<string, { label: string; description: string }> = {
  rsi_oversold: {
    label: "RSI Oversold",
    description: '<strong>What is RSI?</strong> The Relative Strength Index measures how aggressively a stock has been bought or sold on a scale of 0-100. <strong>What does "oversold" mean?</strong> When RSI drops below 30, it means sellers have been dumping the stock so heavily that it may have gone too far. Think of a rubber band stretched to its limit -- the further it stretches, the harder it snaps back. These stocks have the highest probability of a short-term bounce. <strong>Caution:</strong> Some stocks are oversold for good reason. Always check the fundamentals before acting.',
  },
  macd_bullish: {
    label: "MACD Bullish",
    description: '<strong>What is MACD?</strong> Moving Average Convergence Divergence tracks momentum by comparing two moving averages. <strong>What is a "bullish crossover"?</strong> It happens when the faster-moving average crosses above the slower one. Imagine two runners -- when the sprinter overtakes the jogger, it means the pace is picking up. These stocks just had that crossover, suggesting buying pressure is building. <strong>Best used:</strong> As confirmation alongside other signals like RSI or analyst targets.',
  },
  volume_breakout: {
    label: "Volume Spike",
    description: "<strong>What is a volume spike?</strong> When today's volume is 2x or more above the 20-day average. Most daily trading is routine -- small investors, algorithms, regular rebalancing. When volume suddenly doubles or triples, it means big institutional players (hedge funds, pension funds) are making moves. High volume confirms that a price move is \"real\" and not just noise. A stock rising on low volume is suspicious; a stock rising on huge volume is meaningful.",
  },
  bollinger_oversold: {
    label: "Bollinger Oversold",
    description: "<strong>What are Bollinger Bands?</strong> A channel drawn around a stock's 20-day moving average, set at 2 standard deviations. About 95% of all price action normally stays within this channel. When a stock drops below the lower band, it has moved further from its average than is statistically normal. Like a ball bouncing below the floor, this is usually temporary. <strong>Pro tip:</strong> Bollinger oversold + RSI oversold together is a stronger signal than either alone.",
  },
  near_52w_low: {
    label: "Near Period Low",
    description: '<strong>What does this mean?</strong> These stocks are within 5% of their lowest price in the past 60 days. <strong>Bull case:</strong> The stock has been beaten down so much that it represents deep value -- if the business is solid, this could be a buying opportunity while everyone else is scared. <strong>Bear case:</strong> Some stocks are near their low because the company is in real trouble. This is called "catching a falling knife." Always check the reasons and fundamentals before acting.',
  },
  biggest_gainers: {
    label: "Top Gainers",
    description: "<strong>What are these?</strong> The 20 stocks that rose the most today. Big single-day moves often happen for a reason -- earnings beats, analyst upgrades, positive news. Sometimes a big gain is the start of a multi-day trend (momentum tends to persist). <strong>What to look for:</strong> Gainers with high volume are more meaningful than gainers on low volume. Check if the move was driven by news or just random volatility.",
  },
  biggest_losers: {
    label: "Top Losers",
    description: "<strong>What are these?</strong> The 20 stocks that fell the most today. <strong>Why look at losers?</strong> To find potential bounce candidates. When a good company drops sharply on an overreaction, it can create a buying opportunity. <strong>The key question:</strong> Was the drop caused by a temporary scare or a fundamental problem? If the business is still healthy, today's biggest losers can be tomorrow's biggest gainers.",
  },
};

function ScorePill({ value }: { value: number | null }) {
  if (value === null) return <span className="text-(--text-secondary)">--</span>;
  const color = value >= 70 ? "#34D399" : value >= 50 ? "#FBBF24" : "#F87171";
  return (
    <span
      className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold min-w-[2.5rem]"
      style={{ backgroundColor: `${color}20`, color }}
    >
      {value.toFixed(0)}
    </span>
  );
}

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

  const info = SCANNER_INFO[activeTab] ?? { label: activeTab, description: "" };

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1.5 mb-5 overflow-x-auto pb-2">
        {scannerTypes.map((type) => {
          const label = SCANNER_INFO[type]?.label ?? type;
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
              <span className="ml-1.5 opacity-50">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Educational description */}
      {info.description && (
        <div className="rounded-lg bg-(--surface-2)/40 border border-(--border) p-4 mb-5">
          <p
            className="text-sm text-(--text-secondary) leading-relaxed [&_strong]:text-(--text-primary) [&_strong]:font-semibold"
            dangerouslySetInnerHTML={{ __html: info.description }}
          />
        </div>
      )}

      {/* Results table */}
      {activeResults.length > 0 ? (
        <div className="overflow-x-auto">
          {/* Desktop table */}
          <table className="w-full text-sm hidden md:table">
            <thead>
              <tr className="bg-(--surface-2)/50">
                <th className="px-3 py-2.5 text-left text-xs uppercase tracking-wider text-(--text-secondary)">Stock</th>
                <th className="px-3 py-2.5 text-left text-xs uppercase tracking-wider text-(--text-secondary)">Sector</th>
                <th className="px-3 py-2.5 text-right text-xs uppercase tracking-wider text-(--text-secondary)">Price</th>
                <th className="px-3 py-2.5 text-right text-xs uppercase tracking-wider text-(--text-secondary)">Today</th>
                <th className="px-3 py-2.5 text-right text-xs uppercase tracking-wider text-(--text-secondary)">RSI</th>
                <th className="px-3 py-2.5 text-right text-xs uppercase tracking-wider text-(--text-secondary)">Score</th>
                <th className="px-3 py-2.5 text-right text-xs uppercase tracking-wider text-(--text-secondary)"></th>
              </tr>
            </thead>
            <tbody>
              {activeResults.map((result, i) => (
                <tr key={`${result.ticker}-${i}`} className="border-t border-(--border) hover:bg-white/[0.02] transition-colors">
                  <td className="px-3 py-2.5">
                    <span className="font-semibold text-white">{result.ticker}</span>
                    <span className="text-xs text-(--text-secondary) ml-1.5">{result.name}</span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-(--text-secondary)">{result.sector ?? "--"}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs text-(--text-primary)">{formatCurrency(result.price)}</td>
                  <td className="px-3 py-2.5 text-right">
                    <ChangeBadge value={result.change1d} className="text-xs" />
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs" style={{
                    color: result.rsi !== null ? (result.rsi < 30 ? "#34D399" : result.rsi > 70 ? "#F87171" : "#f0ede6") : "#94a3b8"
                  }}>
                    {result.rsi?.toFixed(1) ?? "--"}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <ScorePill value={result.compositeScore} />
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <Link href={`/dashboard/trading?buy=${result.ticker}`} className="text-xs text-(--accent) hover:underline">Buy</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile cards */}
          <div className="space-y-2 md:hidden">
            {activeResults.map((result, i) => (
              <div key={`${result.ticker}-${i}`} className="rounded-lg bg-(--surface-1) border border-(--border) p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div>
                    <span className="font-semibold text-white">{result.ticker}</span>
                    <span className="text-xs text-(--text-secondary) ml-1.5">{result.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ScorePill value={result.compositeScore} />
                    <Link href={`/dashboard/trading?buy=${result.ticker}`} className="text-xs text-(--accent) hover:underline">Buy</Link>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-(--text-secondary)">{result.sector}</span>
                  <span className="text-(--text-primary) font-mono">{formatCurrency(result.price)}</span>
                  <ChangeBadge value={result.change1d} className="text-xs" />
                  {result.rsi !== null && (
                    <span className="font-mono" style={{
                      color: result.rsi < 30 ? "#34D399" : result.rsi > 70 ? "#F87171" : "#94a3b8"
                    }}>
                      RSI {result.rsi.toFixed(0)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-(--text-secondary) py-8 text-center">No stocks match this pattern today.</p>
      )}
    </div>
  );
}
