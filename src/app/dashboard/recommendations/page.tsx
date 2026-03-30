import { getLatestRun, getStockScores } from "@/lib/db/queries";
import { EmptyState } from "@/components/ui/empty-state";
import { DataFreshness } from "@/components/ui/data-freshness";
import { StockTable } from "./stock-table";

export default async function RecommendationsPage() {
  const run = await getLatestRun();
  if (!run) return <EmptyState title="No recommendations yet" message="Stock scores will appear after the pipeline runs." />;

  const stocks = await getStockScores(run.id, 50);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.15em] uppercase text-(--accent) mb-1">Analysis</p>
          <h1 className="text-2xl font-bold text-white font-(family-name:--font-source-serif)">Recommendations</h1>
        </div>
        <DataFreshness generatedAt={run.generatedAt} runDate={run.runDate} />
      </div>

      <div className="card-glow overflow-hidden">
        <StockTable stocks={stocks} />
      </div>

      {/* Methodology */}
      <div className="card-glow p-6">
        <p className="text-xs text-(--text-secondary) uppercase tracking-wider mb-3">Methodology</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-sm">
          {[
            { label: "Technical", weight: "20%", desc: "RSI, MACD, dual MA, Bollinger, 52-week range" },
            { label: "Mean Reversion", weight: "15%", desc: "Oversold bounce detection with fundamental support" },
            { label: "Relative Strength", weight: "12%", desc: "Performance vs SPY benchmark" },
            { label: "Momentum", weight: "10%", desc: "5d/20d price momentum with chase penalty" },
            { label: "Volume Confirmed", weight: "10%", desc: "Volume confirming price direction" },
            { label: "Sector Rotation", weight: "8%", desc: "Favor outperforming sectors" },
            { label: "Analyst Upside", weight: "8%", desc: "Analyst targets with confidence weighting" },
            { label: "Risk Quality", weight: "7%", desc: "Volatility, Sharpe, drawdown, dividends" },
            { label: "News Sentiment", weight: "5%", desc: "Recency-weighted headline sentiment" },
            { label: "Earnings Edge", weight: "5%", desc: "Beat history and earnings proximity risk" },
          ].map((item) => (
            <div key={item.label}>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-(--text-primary) font-medium">{item.label}</span>
                <span className="text-(--accent) text-xs font-mono">{item.weight}</span>
              </div>
              <p className="text-xs text-(--text-secondary)">{item.desc}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-(--text-secondary)/60 mt-4">
          Not financial advice. For educational and informational purposes only.
        </p>
      </div>
    </div>
  );
}
