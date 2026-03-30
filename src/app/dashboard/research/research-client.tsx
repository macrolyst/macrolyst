"use client";

import { useState, useEffect } from "react";
import type { ResearchPayload } from "@/lib/research";
import { formatCurrency } from "@/lib/format";
import { ChangeBadge } from "@/components/ui/change-badge";
import { TickerSearch } from "../trading/ticker-search";
import { useLivePrices } from "../trading/use-live-prices";
import { AreaChart, Area, ResponsiveContainer, YAxis, Tooltip } from "recharts";

type HistoryItem = { id: string; ticker: string; companyName: string | null; createdAt: string };

function fmtNum(v: number | null | undefined, decimals = 2): string {
  if (v === null || v === undefined) return "--";
  if (Math.abs(v) >= 1e12) return `${(v / 1e12).toFixed(decimals)}T`;
  if (Math.abs(v) >= 1e9) return `${(v / 1e9).toFixed(decimals)}B`;
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(decimals)}M`;
  return v.toLocaleString("en-US", { maximumFractionDigits: decimals });
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-(--surface-2) border border-(--border) p-2.5">
      <p className="text-[9px] text-(--text-secondary) uppercase">{label}</p>
      <p className="text-sm font-semibold text-white mt-0.5">{value}</p>
    </div>
  );
}

export function ResearchClient() {
  const [loading, setLoading] = useState(false);
  const [loadingType, setLoadingType] = useState<"generate" | "history">("generate");
  const [report, setReport] = useState<ResearchPayload | null>(null);
  const [, setReportId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load history on mount
  useEffect(() => {
    fetch("/api/research")
      .then((r) => r.json())
      .then((d) => {
        setHistory(d.reports || []);
        setRemaining(d.remaining ?? null);
      })
      .catch(() => {});
  }, []);

  async function doResearch(ticker: string) {
    setLoading(true);
    setLoadingType("generate");
    setError(null);
    setReport(null);
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error || "Failed to generate research");
        return;
      }
      setReport(d.data as ResearchPayload);
      setReportId(d.id);
      if (d.remaining !== undefined) setRemaining(d.remaining);
      // Refresh history
      if (!d.cached) {
        setHistory((prev) => [{ id: d.id, ticker: d.data.ticker, companyName: d.data.profile.name, createdAt: new Date().toISOString() }, ...prev]);
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function loadReport(id: string) {
    setLoading(true);
    setLoadingType("history");
    setError(null);
    try {
      const res = await fetch(`/api/research/${id}`);
      const d = await res.json();
      if (!res.ok) { setError(d.error); return; }
      setReport(d.data as ResearchPayload);
      setReportId(d.id);
    } catch {
      setError("Failed to load report");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Search + Info */}
      {!report && !loading && (
        <>
          <div className="card-glow p-6">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-4">
              <div className="flex-1">
                <p className="text-sm text-white font-medium mb-1">Deep dive into any stock</p>
                <p className="text-xs text-(--text-secondary) leading-relaxed">
                  Enter a ticker to get a full research report — financials, analyst ratings, key metrics, institutional holders, peer comparison, and more. All pulled from live data.
                </p>
              </div>
              {remaining !== null && (
                <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-(--surface-2) border border-(--border)">
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className={`w-2 h-2 rounded-full ${i < (5 - remaining) ? "bg-(--accent)" : "bg-(--surface-3)"}`} />
                    ))}
                  </div>
                  <span className="text-[10px] text-(--text-secondary)">{remaining}/5 today</span>
                </div>
              )}
            </div>
            <div className="flex gap-3 items-center">
              <div className="flex-1">
                <TickerSearch
                  onSelect={(symbol) => doResearch(symbol)}
                  placeholder="Search ticker or company name..."
                />
              </div>
            </div>
            {error && <p className="text-xs text-(--down) mt-3">{error}</p>}
            {remaining === 0 && !error && <p className="text-xs text-(--down) mt-3">Daily limit reached. Resets at midnight CST.</p>}
          </div>

          {/* What you get */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: "Key Metrics", desc: "P/E, EPS, beta, margins, 52-week range" },
              { label: "Financials", desc: "SEC-filed income, balance sheet, cash flow" },
              { label: "Analyst Ratings", desc: "Buy/hold/sell consensus breakdown" },
              { label: "Earnings History", desc: "EPS beat/miss history per quarter" },
              { label: "Insider Trades", desc: "Recent insider buys and sells" },
              { label: "SEC Filings", desc: "10-K, 10-Q, 8-K filing links" },
              { label: "Peer Comparison", desc: "Side-by-side with competitors" },
              { label: "Company News", desc: "Latest headlines from the past week" },
            ].map((item) => (
              <div key={item.label} className="rounded-lg bg-(--surface-1) border border-(--border) p-3">
                <p className="text-[10px] text-(--accent) uppercase tracking-wider">{item.label}</p>
                <p className="text-[10px] text-(--text-secondary) mt-0.5">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="card-glow p-5">
              <p className="text-xs text-(--text-secondary) uppercase tracking-wider mb-3">Recent Research (last 7 days)</p>
              <div className="space-y-1">
                {history.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => loadReport(h.id)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-(--surface-2) transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-white">{h.ticker}</span>
                      <span className="text-xs text-(--text-secondary)">{h.companyName}</span>
                    </div>
                    <span className="text-[10px] text-(--text-secondary)">
                      {new Date(h.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Chicago" })}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Loading */}
      {loading && (
        <div className="card-glow p-16 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-(--accent)/30 border-t-(--accent) rounded-full animate-spin" />
            <div className="text-center">
              {loadingType === "generate" ? (
                <>
                  <p className="text-sm text-white font-medium">Generating research report...</p>
                  <p className="text-xs text-(--text-secondary) mt-1">Pulling real-time data from multiple sources</p>
                </>
              ) : (
                <p className="text-sm text-white font-medium">Loading report...</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Report */}
      {report && !loading && <ResearchReport data={report} onBack={() => { setReport(null); setReportId(null); }} />}
    </div>
  );
}

function ResearchReport({ data, onBack }: { data: ResearchPayload; onBack: () => void }) {
  const { profile, quote, metrics, analyst, news, peers, financials, insiders, earnings, filings } = data;
  const [financialTab, setFinancialTab] = useState<"annual" | "quarterly">("annual");
  const [chartRange, setChartRange] = useState(1);
  const [candles, setCandles] = useState<{ date: string; close: number }[]>([]);
  const { prices, marketOpen } = useLivePrices([data.ticker]);

  useEffect(() => {
    fetch(`/api/prices/candles?symbol=${data.ticker}&days=${chartRange}`)
      .then((r) => r.json())
      .then((d) => setCandles(d))
      .catch(() => {});
  }, [data.ticker, chartRange]);
  const liveQuote = prices.get(data.ticker);
  const price = liveQuote?.price ?? quote?.price ?? 0;
  const changePercent = liveQuote?.changePercent ?? quote?.changePercent ?? 0;
  const high = liveQuote?.high ?? quote?.high ?? 0;
  const low = liveQuote?.low ?? quote?.low ?? 0;

  return (
    <div className="space-y-4">
      {/* Back button */}
      <button onClick={onBack} className="text-xs text-(--accent) hover:underline cursor-pointer">&larr; Back to search</button>

      {/* Header */}
      <div className="card-glow p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              {profile.logo && <img src={profile.logo} alt="" className="w-8 h-8 rounded-lg" />}
              <div>
                <h2 className="text-xl font-bold text-white">{data.ticker} — {profile.name}</h2>
                <p className="text-xs text-(--text-secondary)">{profile.sector}{profile.industry ? ` · ${profile.industry}` : ""}{profile.exchange ? ` · ${profile.exchange}` : ""}</p>
              </div>
            </div>
            {profile.description && (
              <p className="text-xs text-(--text-secondary) mt-3 leading-relaxed line-clamp-3">{profile.description}</p>
            )}
          </div>
          <div className="text-right shrink-0 ml-4">
            <div className="flex items-center gap-2 justify-end">
              {liveQuote && <span className={`w-1.5 h-1.5 rounded-full ${marketOpen ? "bg-(--up) pulse-dot" : "bg-(--text-secondary)/40"}`} />}
              <p className="text-2xl font-bold text-white font-mono">{formatCurrency(price)}</p>
            </div>
            <ChangeBadge value={changePercent} className="text-sm font-bold" />
            <div className="flex gap-3 mt-1 text-[10px] text-(--text-secondary)">
              <span>H {formatCurrency(high)}</span>
              <span>L {formatCurrency(low)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Price Chart */}
      <div className="card-glow p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-(--text-secondary) uppercase tracking-wider">Price Chart</p>
          <div className="flex gap-1">
            {[{ l: "1D", d: 1 }, { l: "1W", d: 7 }, { l: "1M", d: 30 }, { l: "3M", d: 90 }].map((r) => (
              <button key={r.d} onClick={() => setChartRange(r.d)} className={`text-[10px] px-3 py-1 rounded-md font-medium cursor-pointer transition-colors ${chartRange === r.d ? "bg-(--accent)/15 text-(--accent)" : "text-(--text-secondary) hover:text-white"}`}>{r.l}</button>
            ))}
          </div>
        </div>
        {candles.length > 1 ? (() => {
          const first = candles[0].close;
          const last = candles[candles.length - 1].close;
          const isUp = last >= first;
          const color = isUp ? "#34D399" : "#F87171";
          const min = Math.min(...candles.map((c) => c.close));
          const max = Math.max(...candles.map((c) => c.close));
          const pad = (max - min) * 0.1 || 1;
          return (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={candles} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id={`researchGrad-${data.ticker}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <YAxis domain={[min - pad, max + pad]} hide />
                <Tooltip
                  position={{ y: -10 }}
                  wrapperStyle={{ zIndex: 100 }}
                  contentStyle={{ background: "#1a2235", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, fontSize: 12, color: "#f0ede6", pointerEvents: "none" }}
                  formatter={(value) => [formatCurrency(Number(value)), "Price"]}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ""}
                  labelStyle={{ color: "#94a3b8", fontSize: 10 }}
                  isAnimationActive={false}
                />
                <Area type="monotone" dataKey="close" stroke={color} fill={`url(#researchGrad-${data.ticker})`} strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          );
        })() : (
          <div className="flex items-center justify-center h-[200px]">
            <div className="w-4 h-4 border-2 border-(--accent)/30 border-t-(--accent) rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Key Metrics */}
      <div className="card-glow p-5">
        <p className="text-xs text-(--text-secondary) uppercase tracking-wider mb-3">Key Metrics</p>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          <MetricCard label="Market Cap" value={fmtNum(profile.marketCap)} />
          <MetricCard label="P/E Ratio" value={metrics.peRatio?.toFixed(1) ?? "--"} />
          <MetricCard label="EPS" value={metrics.eps?.toFixed(2) ?? "--"} />
          <MetricCard label="Beta" value={metrics.beta?.toFixed(2) ?? "--"} />
          <MetricCard label="52W High" value={formatCurrency(metrics.high52w)} />
          <MetricCard label="52W Low" value={formatCurrency(metrics.low52w)} />
          <MetricCard label="Div. Yield" value={metrics.dividendYield ? `${metrics.dividendYield.toFixed(2)}%` : "--"} />
          <MetricCard label="ROE" value={metrics.roe ? `${metrics.roe.toFixed(1)}%` : "--"} />
          <MetricCard label="ROA" value={metrics.roa ? `${metrics.roa.toFixed(1)}%` : "--"} />
          <MetricCard label="Gross Margin" value={metrics.grossMargin ? `${(metrics.grossMargin * 100).toFixed(1)}%` : "--"} />
          <MetricCard label="Net Margin" value={metrics.netMargin ? `${(metrics.netMargin * 100).toFixed(1)}%` : "--"} />
          <MetricCard label="Debt/Equity" value={metrics.debtEquity?.toFixed(2) ?? "--"} />
        </div>
      </div>

      {/* Two column layout: Left (Analyst + Financials + Peers) | Right (Insiders) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="space-y-4">

      {/* Analyst Consensus */}
      {analyst.recommendations && (
        <div className="card-glow p-5">
          <p className="text-xs text-(--text-secondary) uppercase tracking-wider mb-3">Analyst Consensus</p>
          <div className="space-y-3">
            {(() => {
              const r = analyst.recommendations;
              const total = r.strongBuy + r.buy + r.hold + r.sell + r.strongSell;
              if (total === 0) return <p className="text-xs text-(--text-secondary)">No data</p>;
              const buyPct = Math.round(((r.strongBuy + r.buy) / total) * 100);
              const holdPct = Math.round((r.hold / total) * 100);
              const sellPct = Math.round(((r.sell + r.strongSell) / total) * 100);
              return (
                <>
                  <div className="flex h-3 rounded-full overflow-hidden">
                    <div className="bg-(--up)" style={{ width: `${buyPct}%` }} />
                    <div className="bg-(--gold)" style={{ width: `${holdPct}%` }} />
                    <div className="bg-(--down)" style={{ width: `${sellPct}%` }} />
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-(--up)">{buyPct}% Buy ({r.strongBuy + r.buy})</span>
                    <span className="text-(--gold)">{holdPct}% Hold ({r.hold})</span>
                    <span className="text-(--down)">{sellPct}% Sell ({r.sell + r.strongSell})</span>
                  </div>
                </>
              );
            })()}
            {analyst.priceTarget && (
              <div className="grid grid-cols-3 gap-2 mt-2">
                <MetricCard label="Target Low" value={formatCurrency(analyst.priceTarget.low)} />
                <MetricCard label="Target Mean" value={formatCurrency(analyst.priceTarget.mean)} />
                <MetricCard label="Target High" value={formatCurrency(analyst.priceTarget.high)} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Financial Statements (SEC filings via Finnhub) */}
      {(financials?.annual?.length || financials?.quarterly?.length) && (
        <div className="card-glow p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-(--text-secondary) uppercase tracking-wider">Financials (SEC Filed)</p>
            <div className="flex gap-1">
              {(["annual", "quarterly"] as const).map((t) => (
                <button key={t} onClick={() => setFinancialTab(t)} className={`text-[10px] px-2 py-1 rounded cursor-pointer ${financialTab === t ? "bg-(--accent)/15 text-(--accent)" : "text-(--text-secondary) hover:text-white"}`}>
                  {t === "annual" ? "Annual" : "Quarterly"}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-(--border)">
                  <th className="text-left text-(--text-secondary) py-2 pr-4">Period</th>
                  <th className="text-right text-(--text-secondary) py-2 px-2">Revenue</th>
                  <th className="text-right text-(--text-secondary) py-2 px-2">Net Income</th>
                  <th className="text-right text-(--text-secondary) py-2 px-2">EPS</th>
                  <th className="text-right text-(--text-secondary) py-2 px-2">Assets</th>
                  <th className="text-right text-(--text-secondary) py-2 px-2">Equity</th>
                  <th className="text-right text-(--text-secondary) py-2 px-2">Cash</th>
                </tr>
              </thead>
              <tbody>
                {(financialTab === "annual" ? financials?.annual || [] : financials?.quarterly || []).map((row) => (
                  <tr key={row.period} className="border-b border-(--border)/30">
                    <td className="py-2 pr-4 text-white">{row.period}</td>
                    <td className="py-2 px-2 text-right text-white font-mono">{fmtNum(row.revenue)}</td>
                    <td className="py-2 px-2 text-right font-mono" style={{ color: (row.netIncome ?? 0) >= 0 ? "#34D399" : "#F87171" }}>{fmtNum(row.netIncome)}</td>
                    <td className="py-2 px-2 text-right text-white font-mono">{row.eps?.toFixed(2) ?? "--"}</td>
                    <td className="py-2 px-2 text-right text-white font-mono">{fmtNum(row.totalAssets)}</td>
                    <td className="py-2 px-2 text-right text-white font-mono">{fmtNum(row.totalEquity)}</td>
                    <td className="py-2 px-2 text-right text-(--up) font-mono">{fmtNum(row.cash)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Earnings History */}
      {Array.isArray(earnings) && earnings.length > 0 && (
        <div className="card-glow p-5">
          <p className="text-xs text-(--text-secondary) uppercase tracking-wider mb-3">Earnings History</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-(--border)">
                  <th className="text-left text-(--text-secondary) py-2 pr-4">Period</th>
                  <th className="text-right text-(--text-secondary) py-2 px-2">Actual</th>
                  <th className="text-right text-(--text-secondary) py-2 px-2">Estimate</th>
                  <th className="text-right text-(--text-secondary) py-2 px-2">Surprise</th>
                  <th className="text-right text-(--text-secondary) py-2 px-2">Result</th>
                </tr>
              </thead>
              <tbody>
                {earnings.map((e, i) => (
                  <tr key={i} className="border-b border-(--border)/30">
                    <td className="py-2 pr-4 text-white">{e.period}</td>
                    <td className="py-2 px-2 text-right text-white font-mono">{e.actual?.toFixed(2) ?? "--"}</td>
                    <td className="py-2 px-2 text-right text-(--text-secondary) font-mono">{e.estimate?.toFixed(2) ?? "--"}</td>
                    <td className="py-2 px-2 text-right font-mono" style={{ color: (e.surprisePercent ?? 0) >= 0 ? "#34D399" : "#F87171" }}>
                      {e.surprisePercent != null ? `${e.surprisePercent >= 0 ? "+" : ""}${e.surprisePercent.toFixed(2)}%` : "--"}
                    </td>
                    <td className="py-2 px-2 text-right">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${e.beat ? "bg-(--up)/15 text-(--up)" : "bg-(--down)/15 text-(--down)"}`}>
                        {e.beat ? "Beat" : "Miss"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Peers */}
      {peers.length > 0 && (
        <div className="card-glow p-5">
          <p className="text-xs text-(--text-secondary) uppercase tracking-wider mb-3">Peer Comparison</p>
          <div className="space-y-1.5 sm:space-y-0 sm:flex sm:flex-wrap sm:gap-2">
            {peers.filter(Boolean).map((p: { ticker: string; price: number; changePercent: number }) => (
              <div key={p.ticker} className="rounded-lg bg-(--surface-2) border border-(--border) px-3 py-2 flex items-center justify-between sm:justify-start gap-3">
                <span className="text-sm font-semibold text-white">{p.ticker}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white font-mono">{formatCurrency(p.price)}</span>
                  <ChangeBadge value={p.changePercent} className="text-xs" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      </div>{/* end left column */}

      {/* Right column: Insider Transactions + SEC Filings */}
      <div className="space-y-4">
      {Array.isArray(insiders) && insiders.length > 0 && (
        <div className="card-glow p-5">
          <p className="text-xs text-(--text-secondary) uppercase tracking-wider mb-3">Insider Transactions</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-(--border)">
                  <th className="text-left text-(--text-secondary) py-2 pr-4">Name</th>
                  <th className="text-right text-(--text-secondary) py-2 px-2">Type</th>
                  <th className="text-right text-(--text-secondary) py-2 px-2">Shares</th>
                  <th className="text-right text-(--text-secondary) py-2 px-2">Price</th>
                  <th className="text-right text-(--text-secondary) py-2 px-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {insiders.map((t, i) => (
                  <tr key={i} className="border-b border-(--border)/30">
                    <td className="py-2 pr-4 text-white">{t.name}</td>
                    <td className="py-2 px-2 text-right" style={{ color: t.type === "Buy" ? "#34D399" : t.type === "Sell" ? "#F87171" : "#94a3b8" }}>{t.type}</td>
                    <td className="py-2 px-2 text-right text-white font-mono">{fmtNum(Math.abs(t.shares), 0)}</td>
                    <td className="py-2 px-2 text-right text-white font-mono">{t.price ? formatCurrency(t.price) : "--"}</td>
                    <td className="py-2 px-2 text-right text-(--text-secondary)">{t.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* SEC Filings */}
      {Array.isArray(filings) && filings.length > 0 && (
        <div className="card-glow p-5">
          <p className="text-xs text-(--text-secondary) uppercase tracking-wider mb-3">SEC Filings</p>
          <div className="space-y-1.5">
            {filings.map((f, i) => (
              <a key={i} href={f.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between py-1.5 hover:bg-(--surface-2) rounded px-2 -mx-2 transition-colors group">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-(--surface-3) text-white font-mono">{f.form}</span>
                  <span className="text-[10px] text-(--text-secondary) group-hover:text-(--accent) transition-colors">View filing</span>
                </div>
                <span className="text-[10px] text-(--text-secondary)">{f.date}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      </div>{/* end right column */}
      </div>{/* end two-column grid */}

      {/* News */}
      {news.length > 0 && (
        <div className="card-glow p-5">
          <p className="text-xs text-(--text-secondary) uppercase tracking-wider mb-4">Recent News</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {news.map((n, i) => (
              <a key={i} href={n.url} target="_blank" rel="noopener noreferrer" className="group flex gap-3 rounded-lg bg-(--surface-2) border border-(--border) p-3 hover:border-(--accent)/30 transition-colors">
                {n.image && (
                  <img src={n.image} alt="" className="w-20 h-14 rounded object-cover shrink-0 bg-(--surface-3)" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white group-hover:text-(--accent) transition-colors line-clamp-2 leading-relaxed">{n.headline}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-(--accent)/10 text-(--accent)">{n.source}</span>
                    <span className="text-[10px] text-(--text-secondary)">{new Date(n.datetime * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Chicago" })}</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <p className="text-[10px] text-(--text-secondary)/50 text-center">
        Research generated {new Date(data.fetchedAt).toLocaleString("en-US", { timeZone: "America/Chicago" })} CST. Not financial advice.
      </p>
    </div>
  );
}
