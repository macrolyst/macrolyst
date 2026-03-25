"use client";

import { useState } from "react";
import type { PicksAccuracySummary } from "@/lib/db/queries";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import { ChangeBadge } from "@/components/ui/change-badge";

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-lg bg-(--surface-1) border border-(--border) p-3">
      <p className="text-[10px] text-(--text-secondary) uppercase tracking-wider">{label}</p>
      <p className="text-lg font-bold mt-0.5" style={{ color: color || "#f0ede6" }}>{value}</p>
      {sub && <p className="text-[10px] text-(--text-secondary) mt-0.5">{sub}</p>}
    </div>
  );
}

function getVerdict(winRate: number | null, avgReturn: number | null): { text: string; color: string; detail: string } {
  if (winRate === null || avgReturn === null) return { text: "Pending", color: "#94a3b8", detail: "Need more data to evaluate." };
  if (winRate >= 60 && avgReturn > 0) return { text: "Strong", color: "#34D399", detail: "Our picks consistently outperform. The scoring model is working well." };
  if (winRate >= 50 && avgReturn > 0) return { text: "Decent", color: "#34D399", detail: "More wins than losses with positive returns. Model has an edge." };
  if (winRate >= 40) return { text: "Mixed", color: "#FBBF24", detail: "Results are inconsistent. Model may need weight adjustments or additional signals." };
  return { text: "Weak", color: "#F87171", detail: "More picks losing than winning. Scoring weights or data sources should be reviewed." };
}

function whyItHappened(pick: { ticker: string; name: string | null; sector: string | null; return1d: number | null; rank: number | null }): string {
  if (pick.return1d === null) return "Awaiting next-day close data.";
  const r = pick.return1d;
  if (r > 3) return "Strong surge -- likely driven by positive earnings, upgrade, or sector momentum.";
  if (r > 1) return "Solid gain -- buying interest aligns with our bullish signal.";
  if (r > 0) return "Small gain -- moved in the right direction but without strong conviction.";
  if (r > -1) return "Flat/slight dip -- market noise, no clear directional catalyst.";
  if (r > -3) return "Moderate loss -- sector headwinds or broader market pullback likely contributed.";
  return "Sharp drop -- possible negative news, earnings miss, or sector rotation away from this stock.";
}

export function AccuracyTracker({ data }: { data: PicksAccuracySummary }) {
  const [tab, setTab] = useState<"daily" | "monthly" | "sectors">("daily");
  const verdict1d = getVerdict(data.winRate1d, data.avgReturn1d);

  // Group picks by date for daily view
  const byDate = new Map<string, typeof data.recentPicks>();
  for (const pick of data.recentPicks) {
    const list = byDate.get(pick.pickDate) || [];
    list.push(pick);
    byDate.set(pick.pickDate, list);
  }
  const dates = Array.from(byDate.keys()).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-6">

      {/* Verdict banner */}
      <div className="rounded-lg border-l-4 p-4 bg-(--surface-2)/40" style={{ borderColor: verdict1d.color }}>
        <div className="flex items-center gap-3 mb-1">
          <span className="text-sm font-bold" style={{ color: verdict1d.color }}>Verdict: {verdict1d.text}</span>
          {data.winRate1d !== null && (
            <span className="text-xs text-(--text-secondary)">
              ({data.evaluated1d} picks evaluated)
            </span>
          )}
        </div>
        <p className="text-sm text-(--text-secondary) leading-relaxed">{verdict1d.detail}</p>
      </div>

      {/* Scorecard */}
      <div>
        <p className="text-xs text-(--text-secondary) uppercase tracking-wider mb-3">Performance Scorecard</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="Next-Day Win Rate"
            value={data.winRate1d !== null ? `${data.winRate1d}%` : "Pending"}
            sub={data.evaluated1d > 0 ? `${data.wins1d} of ${data.evaluated1d} picks` : undefined}
            color={data.winRate1d !== null ? (data.winRate1d >= 50 ? "#34D399" : "#F87171") : undefined}
          />
          <StatCard
            label="Avg Next-Day Return"
            value={data.avgReturn1d !== null ? formatPercent(data.avgReturn1d) : "Pending"}
            color={data.avgReturn1d !== null ? (data.avgReturn1d >= 0 ? "#34D399" : "#F87171") : undefined}
          />
          <StatCard
            label="5-Day Win Rate"
            value={data.winRate5d !== null ? `${data.winRate5d}%` : "Pending"}
            sub={data.evaluated5d > 0 ? `${data.wins5d} of ${data.evaluated5d}` : "Need 5+ days"}
            color={data.winRate5d !== null ? (data.winRate5d >= 50 ? "#34D399" : "#F87171") : undefined}
          />
          <StatCard
            label="20-Day Win Rate"
            value={data.winRate20d !== null ? `${data.winRate20d}%` : "Pending"}
            sub={data.evaluated20d > 0 ? `${data.wins20d} of ${data.evaluated20d}` : "Need 20+ days"}
            color={data.winRate20d !== null ? (data.winRate20d >= 50 ? "#34D399" : "#F87171") : undefined}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-(--border)">
        {(["daily", "monthly", "sectors"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-sm pb-2 cursor-pointer transition-colors border-b-2 ${
              tab === t ? "text-white border-(--accent)" : "text-(--text-secondary) border-transparent hover:text-white"
            }`}
          >
            {t === "daily" ? "Daily Breakdown" : t === "monthly" ? "Monthly Report" : "By Sector"}
          </button>
        ))}
      </div>

      {/* Daily tab */}
      {tab === "daily" && (
        <div className="space-y-4">
          {dates.length === 0 && (
            <p className="text-sm text-(--text-secondary) py-8 text-center">No picks recorded yet. Data will appear after the pipeline runs.</p>
          )}
          {dates.map((date) => {
            const picks = byDate.get(date) || [];
            const evaluated = picks.filter((p) => p.return1d !== null);
            const wins = evaluated.filter((p) => p.return1d! > 0).length;
            const avgRet = evaluated.length > 0
              ? evaluated.reduce((sum, p) => sum + p.return1d!, 0) / evaluated.length
              : null;

            return (
              <CollapsibleDay key={date} date={date} picks={picks} evaluated={evaluated} wins={wins} avgRet={avgRet} />
            );
          })}
        </div>
      )}

      {/* Monthly report tab */}
      {tab === "monthly" && (
        <div className="space-y-5">
          <div className="rounded-lg bg-(--surface-2)/40 border border-(--border) p-4">
            <p className="text-xs text-(--text-secondary) uppercase tracking-wider mb-3">30-Day Summary</p>
            {data.evaluated1d === 0 ? (
              <p className="text-sm text-(--text-secondary)">No evaluated picks yet. After the pipeline runs for a few days, this report will show cumulative accuracy.</p>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-(--text-secondary)">Total Suggestions</p>
                    <p className="text-xl font-bold text-white">{data.totalPicks}</p>
                  </div>
                  <div>
                    <p className="text-xs text-(--text-secondary)">Evaluated (1d)</p>
                    <p className="text-xl font-bold text-white">{data.evaluated1d}</p>
                  </div>
                  <div>
                    <p className="text-xs text-(--text-secondary)">Days Tracked</p>
                    <p className="text-xl font-bold text-white">{data.dailySummaries.length}</p>
                  </div>
                </div>

                {/* Win/loss breakdown */}
                <div>
                  <p className="text-xs text-(--text-secondary) mb-2">Win/Loss Across Timeframes</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-(--border)">
                          <th className="text-left text-xs text-(--text-secondary) uppercase py-2 pr-4">Period</th>
                          <th className="text-right text-xs text-(--text-secondary) uppercase py-2 px-3">Evaluated</th>
                          <th className="text-right text-xs text-(--text-secondary) uppercase py-2 px-3">Wins</th>
                          <th className="text-right text-xs text-(--text-secondary) uppercase py-2 px-3">Win Rate</th>
                          <th className="text-right text-xs text-(--text-secondary) uppercase py-2 pl-3">Avg Return</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { label: "Next Day", eval: data.evaluated1d, wins: data.wins1d, rate: data.winRate1d, ret: data.avgReturn1d },
                          { label: "5 Days", eval: data.evaluated5d, wins: data.wins5d, rate: data.winRate5d, ret: data.avgReturn5d },
                          { label: "10 Days", eval: data.evaluated10d, wins: data.wins10d, rate: data.winRate10d, ret: data.avgReturn10d },
                          { label: "20 Days", eval: data.evaluated20d, wins: data.wins20d, rate: data.winRate20d, ret: data.avgReturn20d },
                        ].map((row) => (
                          <tr key={row.label} className="border-b border-(--border)/50">
                            <td className="py-2 pr-4 text-white">{row.label}</td>
                            <td className="py-2 px-3 text-right text-(--text-secondary)">{row.eval || "--"}</td>
                            <td className="py-2 px-3 text-right text-(--up)">{row.eval > 0 ? row.wins : "--"}</td>
                            <td className="py-2 px-3 text-right font-semibold" style={{
                              color: row.rate !== null ? (row.rate >= 50 ? "#34D399" : "#F87171") : "#94a3b8"
                            }}>
                              {row.rate !== null ? `${row.rate}%` : "--"}
                            </td>
                            <td className="py-2 pl-3 text-right">
                              <ChangeBadge value={row.ret} className="text-xs" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Daily win rate history */}
                {data.dailySummaries.filter((d) => d.winRate1d !== null).length > 0 && (
                  <div>
                    <p className="text-xs text-(--text-secondary) mb-2">Daily Win Rate History</p>
                    <div className="flex gap-1 items-end h-20">
                      {data.dailySummaries.map((day, i) => {
                        if (day.winRate1d === null) return null;
                        const h = Math.max(8, (day.winRate1d / 100) * 80);
                        const isGood = day.winRate1d >= 50;
                        return (
                          <div
                            key={i}
                            className="flex-1 rounded-t-sm min-w-[4px] max-w-[20px] transition-all"
                            style={{
                              height: `${h}px`,
                              backgroundColor: isGood ? "#34D39950" : "#F8717150",
                              border: `1px solid ${isGood ? "#34D399" : "#F87171"}`,
                            }}
                            title={`${day.date}: ${day.winRate1d}% win rate, avg ${day.avgReturn1d?.toFixed(2)}%`}
                          />
                        );
                      })}
                    </div>
                    <div className="flex justify-between text-[10px] text-(--text-secondary) mt-1">
                      <span>{data.dailySummaries[0]?.date}</span>
                      <span>{data.dailySummaries[data.dailySummaries.length - 1]?.date}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sector tab */}
      {tab === "sectors" && (
        <div>
          {data.sectorBreakdown.length === 0 ? (
            <p className="text-sm text-(--text-secondary) py-8 text-center">No sector data yet. Will populate after picks are evaluated.</p>
          ) : (
            <>
              <p className="text-xs text-(--text-secondary) mb-3">Which sectors do our picks perform best in? Based on next-day returns.</p>
              <div className="space-y-2">
                {data.sectorBreakdown.map((s) => (
                  <div key={s.sector} className="flex items-center gap-3 px-4 py-3 rounded-lg bg-(--surface-1) border border-(--border)">
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-white font-medium">{s.sector}</span>
                      <span className="text-xs text-(--text-secondary) ml-2">{s.picks} picks</span>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className={`text-xs font-medium ${s.winRate >= 50 ? "text-(--up)" : "text-(--down)"}`}>
                        {s.winRate.toFixed(0)}% win rate
                      </span>
                      <ChangeBadge value={s.avgReturn} className="text-xs font-semibold min-w-[3.5rem] text-right" />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-(--text-secondary)/60 mt-4">
                Sectors where our model consistently underperforms may indicate the scoring weights need adjustment for those industries.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function CollapsibleDay({ date, picks, evaluated, wins, avgRet }: {
  date: string;
  picks: PicksAccuracySummary["recentPicks"];
  evaluated: PicksAccuracySummary["recentPicks"];
  wins: number;
  avgRet: number | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg bg-(--surface-1) border border-(--border) overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-(--surface-2)/30 cursor-pointer hover:bg-(--surface-2)/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg className={`w-3.5 h-3.5 text-(--text-secondary) transition-transform ${open ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-sm font-semibold text-white">{formatDate(date)}</span>
          <span className="text-xs text-(--text-secondary)">{picks.length} picks</span>
        </div>
        {evaluated.length > 0 && (
          <div className="flex items-center gap-3">
            <span className={`text-xs font-medium ${wins >= evaluated.length / 2 ? "text-(--up)" : "text-(--down)"}`}>
              {wins}/{evaluated.length} won
            </span>
            <ChangeBadge value={avgRet} className="text-sm font-bold" />
          </div>
        )}
        {evaluated.length === 0 && (
          <span className="text-xs text-(--text-secondary)">Awaiting evaluation</span>
        )}
      </button>

      {open && (
        <div className="divide-y divide-(--border)">
          {picks.map((pick, i) => {
            const closePrice = pick.priceAtPick && pick.return1d != null
              ? pick.priceAtPick * (1 + pick.return1d / 100)
              : null;
            return (
              <div key={`${pick.ticker}-${i}`} className="px-4 py-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-(--text-secondary) w-4">#{pick.rank}</span>
                    <span className="text-sm font-semibold text-white">{pick.ticker}</span>
                    <span className="text-xs text-(--text-secondary) truncate max-w-40">{pick.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-[10px] text-(--text-secondary)">Picked at</p>
                      <span className="text-xs text-white font-mono">{formatCurrency(pick.priceAtPick)}</span>
                    </div>
                    {closePrice != null && (
                      <div className="text-right">
                        <p className="text-[10px] text-(--text-secondary)">Closed at</p>
                        <span className="text-xs text-white font-mono">{formatCurrency(closePrice)}</span>
                      </div>
                    )}
                    {closePrice != null && pick.priceAtPick && (
                      <div className="text-right">
                        <p className="text-[10px] text-(--text-secondary)">Change</p>
                        <span className={`text-xs font-mono ${(closePrice - pick.priceAtPick) >= 0 ? "text-(--up)" : "text-(--down)"}`}>
                          {(closePrice - pick.priceAtPick) >= 0 ? "+" : ""}{formatCurrency(closePrice - pick.priceAtPick)}
                        </span>
                      </div>
                    )}
                    <div className="text-right min-w-[3.5rem]">
                      <p className="text-[10px] text-(--text-secondary)">Return</p>
                      <ChangeBadge value={pick.return1d} className="text-xs font-semibold" />
                    </div>
                  </div>
                </div>
                {pick.return1d != null && (
                  <p className="text-xs text-(--text-secondary)/70 mt-1 ml-6">{whyItHappened(pick)}</p>
                )}
                {pick.return1d == null && (
                  <p className="text-xs text-(--text-secondary)/50 mt-1 ml-6">Awaiting next-day close data.</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
