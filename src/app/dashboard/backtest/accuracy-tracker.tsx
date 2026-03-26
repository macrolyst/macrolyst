"use client";

import { useState, useEffect } from "react";
import type { PicksAccuracySummary } from "@/lib/db/queries";
import { formatCurrency, formatDate, formatPercent, formatMarketCap } from "@/lib/format";
import { ChangeBadge } from "@/components/ui/change-badge";
import { ScoreBar } from "@/components/ui/score-bar";

type ScoreData = {
  compositeScore: number | null;
  scoreAnalyst: number | null;
  scoreTechnical: number | null;
  scoreMomentum: number | null;
  scoreVolume: number | null;
  scoreNews: number | null;
  rsi: number | null;
  macdHist: number | null;
  sma50: number | null;
  volRatio: number | null;
  bbUpper: number | null;
  bbLower: number | null;
  targetMean: number | null;
  peRatio: number | null;
  marketCap: number | null;
  annualVolatility: number | null;
  sharpeRatio: number | null;
  maxDrawdownPct: number | null;
  return1y: number | null;
  yearHigh: number | null;
  yearLow: number | null;
  change5d: number | null;
  change20d: number | null;
  price: number | null;
  sector: string | null;
  sectorRank: number | null;
  sectorCount: number | null;
  sectorPeAvg: number | null;
  reasons: string[] | null;
  recommendation: string | null;
};

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

export function AccuracyTracker({ data }: { data: PicksAccuracySummary }) {
  const [tab, setTab] = useState<"daily" | "monthly" | "sectors">("daily");
  const verdict1d = getVerdict(data.winRate1d, data.avgReturn1d);

  const byDate = new Map<string, typeof data.recentPicks>();
  for (const pick of data.recentPicks) {
    const list = byDate.get(pick.pickDate) || [];
    list.push(pick);
    byDate.set(pick.pickDate, list);
  }
  const dates = Array.from(byDate.keys()).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-6">
      <div className="rounded-lg border-l-4 p-4 bg-(--surface-2)/40" style={{ borderColor: verdict1d.color }}>
        <div className="flex items-center gap-3 mb-1">
          <span className="text-sm font-bold" style={{ color: verdict1d.color }}>Verdict: {verdict1d.text}</span>
          {data.winRate1d !== null && <span className="text-xs text-(--text-secondary)">({data.evaluated1d} picks evaluated)</span>}
        </div>
        <p className="text-sm text-(--text-secondary) leading-relaxed">{verdict1d.detail}</p>
      </div>

      <div>
        <p className="text-xs text-(--text-secondary) uppercase tracking-wider mb-3">Performance Scorecard</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Next-Day Win Rate" value={data.winRate1d !== null ? `${data.winRate1d}%` : "Pending"} sub={data.evaluated1d > 0 ? `${data.wins1d} of ${data.evaluated1d} picks` : undefined} color={data.winRate1d !== null ? (data.winRate1d >= 50 ? "#34D399" : "#F87171") : undefined} />
          <StatCard label="Avg Next-Day Return" value={data.avgReturn1d !== null ? formatPercent(data.avgReturn1d) : "Pending"} color={data.avgReturn1d !== null ? (data.avgReturn1d >= 0 ? "#34D399" : "#F87171") : undefined} />
          <StatCard label="5-Day Win Rate" value={data.winRate5d !== null ? `${data.winRate5d}%` : "Pending"} sub={data.evaluated5d > 0 ? `${data.wins5d} of ${data.evaluated5d}` : "Need 5+ days"} color={data.winRate5d !== null ? (data.winRate5d >= 50 ? "#34D399" : "#F87171") : undefined} />
          <StatCard label="20-Day Win Rate" value={data.winRate20d !== null ? `${data.winRate20d}%` : "Pending"} sub={data.evaluated20d > 0 ? `${data.wins20d} of ${data.evaluated20d}` : "Need 20+ days"} color={data.winRate20d !== null ? (data.winRate20d >= 50 ? "#34D399" : "#F87171") : undefined} />
        </div>
      </div>

      <div className="flex gap-4 border-b border-(--border)">
        {(["daily", "monthly", "sectors"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`text-sm pb-2 cursor-pointer transition-colors border-b-2 ${tab === t ? "text-white border-(--accent)" : "text-(--text-secondary) border-transparent hover:text-white"}`}>
            {t === "daily" ? "Daily Breakdown" : t === "monthly" ? "Monthly Report" : "By Sector"}
          </button>
        ))}
      </div>

      {tab === "daily" && (
        <div className="space-y-4">
          {dates.length === 0 && <p className="text-sm text-(--text-secondary) py-8 text-center">No picks recorded yet.</p>}
          {dates.map((date) => {
            const picks = byDate.get(date) || [];
            const evaluated = picks.filter((p) => p.return1d !== null);
            const wins = evaluated.filter((p) => p.return1d! > 0).length;
            const avgRet = evaluated.length > 0 ? evaluated.reduce((sum, p) => sum + p.return1d!, 0) / evaluated.length : null;
            return <CollapsibleDay key={date} date={date} picks={picks} evaluated={evaluated} wins={wins} avgRet={avgRet} />;
          })}
        </div>
      )}

      {tab === "monthly" && (
        <div className="space-y-5">
          <div className="rounded-lg bg-(--surface-2)/40 border border-(--border) p-4">
            <p className="text-xs text-(--text-secondary) uppercase tracking-wider mb-3">30-Day Summary</p>
            {data.evaluated1d === 0 ? (
              <p className="text-sm text-(--text-secondary)">No evaluated picks yet.</p>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div><p className="text-xs text-(--text-secondary)">Total Suggestions</p><p className="text-xl font-bold text-white">{data.totalPicks}</p></div>
                  <div><p className="text-xs text-(--text-secondary)">Evaluated (1d)</p><p className="text-xl font-bold text-white">{data.evaluated1d}</p></div>
                  <div><p className="text-xs text-(--text-secondary)">Days Tracked</p><p className="text-xl font-bold text-white">{data.dailySummaries.length}</p></div>
                </div>
                <div>
                  <p className="text-xs text-(--text-secondary) mb-2">Win/Loss Across Timeframes</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-(--border)">
                        <th className="text-left text-xs text-(--text-secondary) uppercase py-2 pr-4">Period</th>
                        <th className="text-right text-xs text-(--text-secondary) uppercase py-2 px-3">Evaluated</th>
                        <th className="text-right text-xs text-(--text-secondary) uppercase py-2 px-3">Wins</th>
                        <th className="text-right text-xs text-(--text-secondary) uppercase py-2 px-3">Win Rate</th>
                        <th className="text-right text-xs text-(--text-secondary) uppercase py-2 pl-3">Avg Return</th>
                      </tr></thead>
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
                            <td className="py-2 px-3 text-right font-semibold" style={{ color: row.rate !== null ? (row.rate >= 50 ? "#34D399" : "#F87171") : "#94a3b8" }}>{row.rate !== null ? `${row.rate}%` : "--"}</td>
                            <td className="py-2 pl-3 text-right"><ChangeBadge value={row.ret} className="text-xs" /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                {data.dailySummaries.filter((d) => d.winRate1d !== null).length > 0 && (
                  <div>
                    <p className="text-xs text-(--text-secondary) mb-2">Daily Win Rate History</p>
                    <div className="flex gap-1 items-end h-20">
                      {data.dailySummaries.map((day, i) => {
                        if (day.winRate1d === null) return null;
                        const h = Math.max(8, (day.winRate1d / 100) * 80);
                        const isGood = day.winRate1d >= 50;
                        return <div key={i} className="flex-1 rounded-t-sm min-w-[4px] max-w-[20px]" style={{ height: `${h}px`, backgroundColor: isGood ? "#34D39950" : "#F8717150", border: `1px solid ${isGood ? "#34D399" : "#F87171"}` }} title={`${day.date}: ${day.winRate1d}% win rate`} />;
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

      {tab === "sectors" && (
        <div>
          {data.sectorBreakdown.length === 0 ? (
            <p className="text-sm text-(--text-secondary) py-8 text-center">No sector data yet.</p>
          ) : (
            <>
              <p className="text-xs text-(--text-secondary) mb-3">Which sectors do our picks perform best in?</p>
              <div className="space-y-2">
                {data.sectorBreakdown.map((s) => (
                  <div key={s.sector} className="flex items-center gap-3 px-4 py-3 rounded-lg bg-(--surface-1) border border-(--border)">
                    <div className="flex-1 min-w-0"><span className="text-sm text-white font-medium">{s.sector}</span><span className="text-xs text-(--text-secondary) ml-2">{s.picks} picks</span></div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className={`text-xs font-medium ${s.winRate >= 50 ? "text-(--up)" : "text-(--down)"}`}>{s.winRate.toFixed(0)}% win rate</span>
                      <ChangeBadge value={s.avgReturn} className="text-xs font-semibold min-w-[3.5rem] text-right" />
                    </div>
                  </div>
                ))}
              </div>
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
  const runId = picks[0]?.runId;
  const cacheKey = `scores-${runId}`;
  const [scoresMap, setScoresMap] = useState<Record<string, ScoreData> | null>(() => {
    if (typeof window === "undefined") return null;
    const cached = localStorage.getItem(cacheKey);
    return cached ? JSON.parse(cached) : null;
  });

  useEffect(() => {
    if (!open || scoresMap || !runId) return;
    const tickers = picks.map((p) => p.ticker).join(",");
    let cancelled = false;
    fetch(`/api/scores?runId=${runId}&tickers=${tickers}`)
      .then((r) => r.json())
      .then((data) => {
        if (data && !cancelled) {
          setScoresMap(data);
          localStorage.setItem(cacheKey, JSON.stringify(data));
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [open, scoresMap, picks, runId, cacheKey]);

  return (
    <div className="rounded-lg bg-(--surface-1) border border-(--border) overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-3 bg-(--surface-2)/30 cursor-pointer hover:bg-(--surface-2)/50 transition-colors">
        <div className="flex items-center gap-2">
          <svg className={`w-3.5 h-3.5 text-(--text-secondary) transition-transform ${open ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          <span className="text-sm font-semibold text-white">{formatDate(date)}</span>
          <span className="text-xs text-(--text-secondary)">{picks.length} picks</span>
        </div>
        {evaluated.length > 0 ? (
          <div className="flex items-center gap-3">
            <span className={`text-xs font-medium ${wins >= evaluated.length / 2 ? "text-(--up)" : "text-(--down)"}`}>{wins}/{evaluated.length} won</span>
            <ChangeBadge value={avgRet} className="text-sm font-bold" />
          </div>
        ) : (
          <span className="text-xs text-(--text-secondary)">Awaiting evaluation</span>
        )}
      </button>
      {open && (
        <div className="divide-y divide-(--border)">
          {picks.map((pick, i) => (
            <ExpandablePick key={`${pick.ticker}-${i}`} pick={pick} scores={scoresMap?.[pick.ticker] ?? null} />
          ))}
        </div>
      )}
    </div>
  );
}

function ExpandablePick({ pick, scores }: { pick: PicksAccuracySummary["recentPicks"][0]; scores: ScoreData | null }) {
  const [expanded, setExpanded] = useState(false);
  const closePrice = pick.priceAtPick && pick.return1d != null ? pick.priceAtPick * (1 + pick.return1d / 100) : null;

  return (
    <div>
      <button onClick={() => setExpanded(!expanded)} className="w-full px-4 py-2.5 cursor-pointer hover:bg-white/[0.02] transition-colors text-left">
        {/* Desktop row */}
        <div className="hidden sm:flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className={`w-3 h-3 text-(--text-secondary) transition-transform ${expanded ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            <span className="text-xs font-mono text-(--text-secondary) w-4">#{pick.rank}</span>
            <span className="text-sm font-semibold text-white">{pick.ticker}</span>
            <span className="text-xs text-(--text-secondary) truncate max-w-40">{pick.name}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right"><p className="text-[10px] text-(--text-secondary)">Picked at</p><span className="text-xs text-white font-mono">{formatCurrency(pick.priceAtPick)}</span></div>
            {closePrice != null && <div className="text-right"><p className="text-[10px] text-(--text-secondary)">Closed at</p><span className="text-xs text-white font-mono">{formatCurrency(closePrice)}</span></div>}
            {closePrice != null && pick.priceAtPick && (
              <div className="text-right"><p className="text-[10px] text-(--text-secondary)">Change</p><span className={`text-xs font-mono ${(closePrice - pick.priceAtPick) >= 0 ? "text-(--up)" : "text-(--down)"}`}>{(closePrice - pick.priceAtPick) >= 0 ? "+" : ""}{formatCurrency(closePrice - pick.priceAtPick)}</span></div>
            )}
            <div className="text-right min-w-[3.5rem]"><p className="text-[10px] text-(--text-secondary)">Return</p><ChangeBadge value={pick.return1d} className="text-xs font-semibold" /></div>
          </div>
        </div>
        {/* Mobile stacked layout */}
        <div className="sm:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className={`w-3 h-3 text-(--text-secondary) transition-transform ${expanded ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              <span className="text-xs font-mono text-(--text-secondary)">#{pick.rank}</span>
              <span className="text-sm font-semibold text-white">{pick.ticker}</span>
            </div>
            <ChangeBadge value={pick.return1d} className="text-xs font-semibold" />
          </div>
          <p className="text-[10px] text-(--text-secondary) ml-5 mt-0.5">{pick.name}</p>
          {closePrice != null && pick.priceAtPick && (
            <div className="flex items-center gap-3 ml-5 mt-1.5">
              <span className="text-[10px] text-(--text-secondary)">{formatCurrency(pick.priceAtPick)}</span>
              <span className="text-[10px] text-(--text-secondary)">&#x2192;</span>
              <span className="text-[10px] text-white">{formatCurrency(closePrice)}</span>
              <span className={`text-[10px] font-mono ${(closePrice - pick.priceAtPick) >= 0 ? "text-(--up)" : "text-(--down)"}`}>({(closePrice - pick.priceAtPick) >= 0 ? "+" : ""}{formatCurrency(closePrice - pick.priceAtPick)})</span>
            </div>
          )}
        </div>
        {pick.return1d == null && <p className="text-xs text-(--text-secondary)/50 mt-1 ml-6 sm:ml-6">Awaiting next-day close data.</p>}
      </button>

      {expanded && scores && (
        <div className="mx-2 sm:mx-4 mb-3 rounded-lg bg-(--surface-2)/50 border border-(--border) border-l-3 border-l-(--accent)/40 px-3 sm:px-4 pb-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-5">
            {/* LEFT COLUMN */}
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-(--text-secondary) uppercase tracking-wider">Score Breakdown</p>
                  <span className="text-sm font-bold text-(--accent)">{scores.compositeScore?.toFixed(0) ?? "--"}</span>
                </div>
                <div className="space-y-1.5">
                  <ScoreBar label="Analyst" value={scores.scoreAnalyst} color="#60A5FA" />
                  <ScoreBar label="Technical" value={scores.scoreTechnical} color="#A78BFA" />
                  <ScoreBar label="Momentum" value={scores.scoreMomentum} color="#34D399" />
                  <ScoreBar label="Volume" value={scores.scoreVolume} color="#FBBF24" />
                  <ScoreBar label="News" value={scores.scoreNews} color="#F472B6" />
                </div>
              </div>

              {scores.sectorRank && scores.sectorCount && (
                <div>
                  <p className="text-xs text-(--text-secondary) uppercase tracking-wider mb-2">Sector Position</p>
                  <p className="text-sm text-white">#{scores.sectorRank} of {scores.sectorCount} in <span className="text-(--accent)">{scores.sector}</span></p>
                  {scores.peRatio && scores.sectorPeAvg && (
                    <p className="text-xs text-(--text-secondary) mt-1">
                      P/E {scores.peRatio.toFixed(1)} vs sector median {scores.sectorPeAvg.toFixed(1)}
                      {scores.peRatio < scores.sectorPeAvg ? <span className="text-(--up) ml-1">-- discount</span> : <span className="text-(--down) ml-1">-- premium</span>}
                    </p>
                  )}
                </div>
              )}

              <div>
                <p className="text-xs text-(--text-secondary) uppercase tracking-wider mb-2">Risk Profile</p>
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                  <div className="rounded-lg bg-(--surface-1) border border-(--border) p-1.5 sm:p-2 text-center"><p className="text-[8px] sm:text-[9px] text-(--text-secondary) uppercase">Volatility</p><p className="text-xs sm:text-sm font-semibold text-white">{scores.annualVolatility?.toFixed(1) ?? "--"}%</p></div>
                  <div className="rounded-lg bg-(--surface-1) border border-(--border) p-1.5 sm:p-2 text-center"><p className="text-[8px] sm:text-[9px] text-(--text-secondary) uppercase">Sharpe</p><p className="text-xs sm:text-sm font-semibold text-white">{scores.sharpeRatio?.toFixed(2) ?? "--"}</p></div>
                  <div className="rounded-lg bg-(--surface-1) border border-(--border) p-1.5 sm:p-2 text-center"><p className="text-[8px] sm:text-[9px] text-(--text-secondary) uppercase">Max Drop</p><p className="text-xs sm:text-sm font-semibold text-(--down)">{scores.maxDrawdownPct ? `-${scores.maxDrawdownPct.toFixed(1)}%` : "--"}</p></div>
                </div>
              </div>

              {scores.reasons && scores.reasons.length > 0 && (
                <div>
                  <p className="text-xs text-(--text-secondary) uppercase tracking-wider mb-2">Why This Was Picked</p>
                  <ul className="space-y-1.5">
                    {scores.reasons.map((reason, i) => (
                      <li key={i} className="text-xs text-(--text-primary) flex gap-2"><span className="text-(--accent) shrink-0">&#x2192;</span>{reason}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <p className="text-xs text-(--text-secondary) uppercase tracking-wider mb-2">Key Fundamentals</p>
                <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                  <div className="rounded-lg bg-(--surface-1) border border-(--border) p-1.5 sm:p-2"><p className="text-[8px] sm:text-[9px] text-(--text-secondary) uppercase">Target Price</p><p className="text-xs sm:text-sm font-semibold text-white">{formatCurrency(scores.targetMean)}</p></div>
                  <div className="rounded-lg bg-(--surface-1) border border-(--border) p-1.5 sm:p-2"><p className="text-[8px] sm:text-[9px] text-(--text-secondary) uppercase">Market Cap</p><p className="text-xs sm:text-sm font-semibold text-white">{formatMarketCap(scores.marketCap)}</p></div>
                  <div className="rounded-lg bg-(--surface-1) border border-(--border) p-1.5 sm:p-2"><p className="text-[8px] sm:text-[9px] text-(--text-secondary) uppercase">P/E Ratio</p><p className="text-xs sm:text-sm font-semibold text-white">{scores.peRatio?.toFixed(1) ?? "--"}</p></div>
                  <div className="rounded-lg bg-(--surface-1) border border-(--border) p-1.5 sm:p-2"><p className="text-[8px] sm:text-[9px] text-(--text-secondary) uppercase">Wall St.</p><p className="text-xs sm:text-sm font-semibold text-white capitalize">{scores.recommendation?.replace("_", " ") ?? "--"}</p></div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-3">
              <p className="text-xs text-(--text-secondary) uppercase tracking-wider mb-1">Technical Indicators</p>
              <div className="rounded-lg bg-(--surface-1) border border-(--border) p-3">
                <div className="flex items-center justify-between mb-1"><span className="text-xs text-(--text-secondary) uppercase">RSI</span><span className="text-sm font-mono font-semibold" style={{ color: scores.rsi && scores.rsi < 30 ? "#F87171" : scores.rsi && scores.rsi > 70 ? "#F87171" : "#f0ede6" }}>{scores.rsi?.toFixed(1) ?? "--"}</span></div>
                <p className="text-xs text-(--text-secondary)">{scores.rsi ? (scores.rsi < 30 ? "Oversold — bounce potential" : scores.rsi > 70 ? "Overbought — pullback risk" : "Neutral zone") : "No data"}</p>
              </div>
              <div className="rounded-lg bg-(--surface-1) border border-(--border) p-3">
                <div className="flex items-center justify-between mb-1"><span className="text-xs text-(--text-secondary) uppercase">MACD</span><span className="text-sm font-mono font-semibold" style={{ color: scores.macdHist && scores.macdHist > 0 ? "#34D399" : "#F87171" }}>{scores.macdHist?.toFixed(3) ?? "--"}</span></div>
                <p className="text-xs text-(--text-secondary)">{scores.macdHist ? (scores.macdHist > 0 ? "Bullish momentum" : "Bearish pressure") : "No data"}</p>
              </div>
              <div className="rounded-lg bg-(--surface-1) border border-(--border) p-3">
                <div className="flex items-center justify-between mb-1"><span className="text-xs text-(--text-secondary) uppercase">50-Day MA</span><span className="text-sm font-mono font-semibold">{scores.sma50 ? `$${scores.sma50.toFixed(0)}` : "--"}</span></div>
                <p className="text-xs text-(--text-secondary)">{scores.price && scores.sma50 ? (scores.price > scores.sma50 ? "Price above MA — bullish trend" : "Price below MA — bearish trend") : "No data"}</p>
              </div>
              <div className="rounded-lg bg-(--surface-1) border border-(--border) p-3">
                <div className="flex items-center justify-between mb-1"><span className="text-xs text-(--text-secondary) uppercase">Volume</span><span className="text-sm font-mono font-semibold" style={{ color: scores.volRatio && scores.volRatio >= 2 ? "#FBBF24" : "#f0ede6" }}>{scores.volRatio ? `${scores.volRatio.toFixed(2)}x avg` : "--"}</span></div>
                <p className="text-xs text-(--text-secondary)">{scores.volRatio ? (scores.volRatio >= 2 ? "Significantly above average" : scores.volRatio >= 1.5 ? "Elevated interest" : "Normal levels") : "No data"}</p>
              </div>
              <div className="rounded-lg bg-(--surface-1) border border-(--border) p-3">
                <span className="text-xs text-(--text-secondary) uppercase">Recent Performance</span>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div><p className="text-[10px] text-(--text-secondary)">5-Day</p><ChangeBadge value={scores.change5d} className="text-sm font-semibold" /></div>
                  <div><p className="text-[10px] text-(--text-secondary)">20-Day</p><ChangeBadge value={scores.change20d} className="text-sm font-semibold" /></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {expanded && !scores && (
        <div className="mx-4 mb-3 flex items-center justify-center py-6">
          <div className="w-4 h-4 border-2 border-(--accent)/30 border-t-(--accent) rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
