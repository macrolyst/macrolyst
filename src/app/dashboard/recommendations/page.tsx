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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-sm">
          {[
            { label: "Analyst Upside", weight: "30%", desc: "Distance to mean analyst target" },
            { label: "Technical", weight: "25%", desc: "RSI, MACD, Bollinger, moving averages" },
            { label: "Momentum", weight: "20%", desc: "1-day, 5-day, 20-day price changes" },
            { label: "News Sentiment", weight: "15%", desc: "Aggregate sentiment from recent headlines" },
            { label: "Volume", weight: "10%", desc: "Volume spike vs 20-day average" },
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
