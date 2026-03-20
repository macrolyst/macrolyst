import { getLatestRun, getBacktestData, getPicksAccuracy } from "@/lib/db/queries";
import { formatPercent, formatDate, formatCurrency } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";
import { DataFreshness } from "@/components/ui/data-freshness";
import { ChangeBadge } from "@/components/ui/change-badge";
import { PerformanceChart } from "@/components/charts/performance-chart";
import { BacktestTabs } from "./backtest-tabs";
import { AccuracyTracker } from "./accuracy-tracker";

export default async function BacktestPage() {
  const run = await getLatestRun();
  if (!run) return <EmptyState title="No backtest data" message="Backtest results will appear after the pipeline runs." />;

  const [backtest, accuracy] = await Promise.all([
    getBacktestData(run.id),
    getPicksAccuracy(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.15em] uppercase text-(--accent) mb-1">Analysis</p>
          <h1 className="text-2xl font-bold text-white font-(family-name:--font-source-serif)">Backtest & Accuracy</h1>
        </div>
        <DataFreshness generatedAt={run.generatedAt} runDate={run.runDate} />
      </div>

      <BacktestTabs
        backtestContent={
          backtest ? (
            <div className="space-y-6">
              {/* Disclaimer */}
              <div className="rounded-lg bg-(--surface-2)/40 border border-(--border) border-l-4 border-l-(--gold) p-4">
                <p className="text-xs font-semibold text-(--gold) uppercase tracking-wider mb-1">Why this exists</p>
                <p className="text-sm text-(--text-secondary) leading-relaxed">
                  This is a <strong className="text-(--text-primary)">hypothetical simulation</strong>, not real tracking.
                  The algorithm re-runs its scoring model on data from 30 days ago, picks the top 10 stocks,
                  and checks how they would have performed through today. It helps validate whether the scoring logic
                  itself has predictive power. For real day-by-day tracking of actual recommendations, use the
                  <strong className="text-(--text-primary)"> Accuracy Tracker</strong> tab.
                </p>
                <p className="text-[10px] text-(--text-secondary)/50 mt-2">For educational and informational purposes only. Not financial advice. Past simulated performance does not indicate future results.</p>
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
                  <p className={`text-2xl font-bold ${(backtest.outperformance ?? 0) > 0 ? "text-(--up)" : "text-(--down)"}`}>
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

            </div>
          ) : (
            <EmptyState title="No backtest data" message="Backtest has not been run yet." />
          )
        }
        accuracyContent={
          accuracy ? (
            <AccuracyTracker data={accuracy} />
          ) : (
            <div className="card-glow p-8 text-center">
              <p className="text-sm text-(--text-secondary) mb-2">No accuracy data yet</p>
              <p className="text-xs text-(--text-secondary)/60">
                The pipeline will start tracking daily picks after the next run.
                After 2+ runs, you will see next-day accuracy results here.
                After 20+ runs, the full monthly report will be available.
              </p>
            </div>
          )
        }
      />
    </div>
  );
}
