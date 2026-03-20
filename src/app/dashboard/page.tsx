import { getLatestRun, getMarketSummary, getSectorPerformance, getStockScores, getCatalystData } from "@/lib/db/queries";
import { formatNumber, formatCurrency, formatDate } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";
import { DataFreshness } from "@/components/ui/data-freshness";
import { ChangeBadge } from "@/components/ui/change-badge";
import { SectorChart } from "@/components/charts/sector-chart";
import { CatalystChart } from "@/components/charts/catalyst-chart";
import Link from "next/link";

export default async function DashboardPage() {
  const run = await getLatestRun();
  if (!run) return <EmptyState />;

  const [summary, sectors, topPicks, catalyst] = await Promise.all([
    getMarketSummary(run.id),
    getSectorPerformance(run.id),
    getStockScores(run.id, 5),
    getCatalystData(run.id),
  ]);

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  const pulseCards = [
    {
      label: "Market Breadth",
      value: summary?.marketBreadth ? capitalize(summary.marketBreadth) : "--",
      detail: summary ? `${summary.advancers ?? 0} up / ${summary.decliners ?? 0} down` : null,
      change: summary?.avgChange ?? null,
    },
    {
      label: "VIX",
      value: summary?.vix != null ? formatNumber(summary.vix, 2) : "--",
      detail: "Volatility Index",
      change: null,
    },
    {
      label: "10Y Treasury",
      value: summary?.treasury10y != null ? `${formatNumber(summary.treasury10y, 2)}%` : "--",
      detail: summary?.treasury2y != null ? `2Y: ${formatNumber(summary.treasury2y, 2)}%` : null,
      change: null,
    },
    {
      label: "Fed Funds",
      value: summary?.fedFunds != null ? `${formatNumber(summary.fedFunds, 2)}%` : "--",
      detail: "Target Rate",
      change: null,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.15em] uppercase text-(--accent) mb-1">Overview</p>
          <h1 className="text-2xl font-bold text-white font-(family-name:--font-source-serif)">Dashboard</h1>
        </div>
        <DataFreshness generatedAt={run.generatedAt} runDate={run.runDate} />
      </div>

      {/* Market Pulse Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {pulseCards.map((card) => (
          <div key={card.label} className="card-glow p-5">
            <p className="text-xs text-(--text-secondary) uppercase tracking-wider mb-2">{card.label}</p>
            <div className="flex items-end justify-between">
              <p className="text-2xl font-bold text-white font-(family-name:--font-source-serif)">{card.value}</p>
              {card.change !== null && <ChangeBadge value={card.change} />}
            </div>
            {card.detail && (
              <p className="text-xs text-(--text-secondary) mt-1">{card.detail}</p>
            )}
          </div>
        ))}
      </div>

      {/* Main content: Sector Chart + Top 5 Picks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sector Performance */}
        <div className="lg:col-span-2 card-glow p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-(--text-secondary) uppercase tracking-wider">Sector Performance</p>
            <p className="text-xs text-(--text-secondary)">{formatDate(run.runDate)}</p>
          </div>
          {sectors.length > 0 ? (
            <SectorChart sectors={sectors} />
          ) : (
            <p className="text-sm text-(--text-secondary) py-8 text-center">No sector data available</p>
          )}
        </div>

        {/* Top 5 Picks */}
        <div className="card-glow p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-(--text-secondary) uppercase tracking-wider">Top 5 Picks</p>
            <Link href="/dashboard/recommendations" className="text-xs text-(--accent) hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {topPicks.map((stock, i) => (
              <div key={stock.ticker} className="flex items-center gap-3 py-2">
                <span className="text-xs font-mono text-(--text-secondary)/50 w-4">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{stock.ticker}</span>
                    <span className="text-xs text-(--text-secondary) truncate">{stock.name}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-(--text-secondary)">{formatCurrency(stock.price)}</span>
                    <ChangeBadge value={stock.change1d} className="text-xs" />
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-(--accent)">{stock.compositeScore?.toFixed(0) ?? "--"}</span>
                  <p className="text-[10px] text-(--text-secondary)">score</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* What Happened Yesterday */}
      {catalyst && (
        <div className="card-glow overflow-hidden">
          {/* Header bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-(--border)">
            <div>
              <p className="text-xs tracking-[0.15em] uppercase text-(--accent) mb-1">What Happened Yesterday</p>
              <h2 className="text-lg font-bold text-white font-(family-name:--font-source-serif)">
                SPY {formatDate(catalyst.date)}
              </h2>
            </div>
            <div className="text-right">
              <ChangeBadge value={catalyst.dayChangePct} className="text-2xl font-bold" />
              <p className="text-xs text-(--text-secondary) mt-1 font-mono">
                {formatCurrency(catalyst.open)} → {formatCurrency(catalyst.close)}
              </p>
            </div>
          </div>

          {/* Chart */}
          {catalyst.hours.length > 0 && (
            <div className="px-6 pt-4 pb-2">
              <CatalystChart hours={catalyst.hours} />
            </div>
          )}

          {/* Narrative summary */}
          {catalyst.narrative && (
            <div className="px-6 py-3 mx-6 mb-2 rounded-lg bg-(--surface-2)/40 border-l-2 border-(--accent)/40">
              <p className="text-sm text-(--text-secondary) leading-relaxed">{catalyst.narrative}</p>
            </div>
          )}

          {/* Hour-by-hour timeline -- scrollable */}
          {catalyst.hours.filter((h) => h.news.length > 0).length > 0 && (
            <div className="px-6 pb-4">
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[5.25rem] top-0 bottom-0 w-px bg-(--border)" />

                {catalyst.hours
                  .filter((h) => h.news.length > 0)
                  .slice(0, 3)
                  .map((h, i) => {
                    const changeVal = h.hourlyChange ?? 0;
                    const isUp = changeVal >= 0;
                    return (
                      <div key={i} className="relative flex gap-4 py-3">
                        {/* Time + change */}
                        <div className="shrink-0 w-20 flex flex-col items-end pt-0.5">
                          <span className="text-[11px] font-mono font-semibold text-(--text-secondary)">{h.time}</span>
                          <ChangeBadge value={h.hourlyChange} className="text-[10px] mt-0.5" />
                        </div>
                        {/* Dot on the line */}
                        <div className="shrink-0 relative">
                          <div
                            className={`w-2.5 h-2.5 rounded-full mt-1 ring-2 ring-(--surface-1) ${
                              h.significant ? "bg-(--gold)" : isUp ? "bg-(--up)/60" : "bg-(--down)/60"
                            }`}
                          />
                        </div>
                        {/* Top headlines */}
                        <div className="flex-1 min-w-0 space-y-1.5 -mt-0.5">
                          {h.news.slice(0, 3).map((n, j) => (
                            <a
                              key={j}
                              href={n.url ?? "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block group"
                            >
                              <p className="text-[13px] text-(--text-primary) leading-snug group-hover:text-(--accent) transition-colors">
                                {n.headline}
                              </p>
                              {n.source && (
                                <span className="text-[10px] text-(--text-secondary)/50">{n.source}</span>
                              )}
                            </a>
                          ))}
                          {h.news.length > 3 && (
                            <span className="text-[10px] text-(--text-secondary)/50">+{h.news.length - 3} more</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>

              <Link
                href="/dashboard/news"
                className="flex items-center gap-1 text-xs text-(--accent) hover:underline mt-3 ml-[6.5rem]"
              >
                View full catalyst timeline
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
