import { getLatestRun, getBacktestData } from "@/lib/db/queries";
import { formatPercent, formatDate, formatCurrency } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";
import { DataFreshness } from "@/components/ui/data-freshness";
import { ChangeBadge } from "@/components/ui/change-badge";
import { PerformanceChart } from "@/components/charts/performance-chart";

export default async function BacktestPage() {
  const run = await getLatestRun();
  if (!run) return <EmptyState title="No backtest data" message="Backtest results will appear after the pipeline runs." />;

  const backtest = await getBacktestData(run.id);
  if (!backtest) return <EmptyState title="No backtest data" message="Backtest has not been run yet." />;

  const didOutperform = (backtest.outperformance ?? 0) > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.15em] uppercase text-(--accent) mb-1">Analysis</p>
          <h1 className="text-2xl font-bold text-white font-(family-name:--font-source-serif)">Backtest</h1>
        </div>
        <DataFreshness generatedAt={run.generatedAt} runDate={run.runDate} />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-glow p-5">
          <p className="text-xs text-(--text-secondary) uppercase tracking-wider mb-2">Our Picks</p>
          <ChangeBadge value={backtest.portfolioReturn} className="text-2xl font-bold" />
        </div>
        <div className="card-glow p-5">
          <p className="text-xs text-(--text-secondary) uppercase tracking-wider mb-2">S&P 500 Benchmark</p>
          <ChangeBadge value={backtest.benchmarkReturn} className="text-2xl font-bold" />
        </div>
        <div className="card-glow p-5">
          <p className="text-xs text-(--text-secondary) uppercase tracking-wider mb-2">Outperformance</p>
          <p className={`text-2xl font-bold ${didOutperform ? "text-(--up)" : "text-(--down)"}`}>
            {formatPercent(backtest.outperformance)}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="card-glow p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-(--text-secondary) uppercase tracking-wider">Performance Comparison</p>
          <p className="text-xs text-(--text-secondary)">
            {formatDate(backtest.simStartDate)} - {formatDate(backtest.simEndDate)}
            {backtest.lookbackDays && <span className="ml-1">({backtest.lookbackDays} trading days)</span>}
          </p>
        </div>
        <PerformanceChart data={backtest} />
      </div>

      {/* Picks detail */}
      {backtest.picks && backtest.picks.length > 0 && (
        <div className="card-glow p-6">
          <p className="text-xs text-(--text-secondary) uppercase tracking-wider mb-4">Individual Pick Performance</p>
          <div className="hidden md:grid grid-cols-[3rem_1fr_5rem_5rem_5rem] gap-2 px-4 py-2 border-b border-(--border)">
            <span className="text-xs text-(--text-secondary) uppercase tracking-wider">#</span>
            <span className="text-xs text-(--text-secondary) uppercase tracking-wider">Ticker</span>
            <span className="text-xs text-(--text-secondary) uppercase tracking-wider text-right">Start</span>
            <span className="text-xs text-(--text-secondary) uppercase tracking-wider text-right">End</span>
            <span className="text-xs text-(--text-secondary) uppercase tracking-wider text-right">Return</span>
          </div>
          <div className="divide-y divide-(--border)">
            {backtest.picks.map((pick, i) => (
              <div key={pick.ticker}>
                {/* Desktop */}
                <div className="hidden md:grid grid-cols-[3rem_1fr_5rem_5rem_5rem] gap-2 px-4 py-3 items-center">
                  <span className="text-xs font-mono text-(--text-secondary)">{i + 1}</span>
                  <div>
                    <span className="text-sm font-semibold text-white">{pick.ticker}</span>
                    {pick.name && <span className="text-xs text-(--text-secondary) ml-2">{pick.name}</span>}
                  </div>
                  <span className="text-xs text-(--text-secondary) text-right">
                    {pick.start_price ? formatCurrency(pick.start_price) : "--"}
                  </span>
                  <span className="text-xs text-(--text-secondary) text-right">
                    {pick.end_price ? formatCurrency(pick.end_price) : "--"}
                  </span>
                  <div className="text-right">
                    <ChangeBadge value={pick.return_pct ?? null} className="text-xs" />
                  </div>
                </div>
                {/* Mobile */}
                <div className="flex items-center justify-between px-4 py-3 md:hidden">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-(--text-secondary)">{i + 1}</span>
                    <span className="text-sm font-semibold text-white">{pick.ticker}</span>
                  </div>
                  <ChangeBadge value={pick.return_pct ?? null} className="text-xs" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-(--text-secondary)/60">
        Past performance does not indicate future results. Backtest uses a {backtest.lookbackDays ?? 20}-day lookback window.
      </p>
    </div>
  );
}
