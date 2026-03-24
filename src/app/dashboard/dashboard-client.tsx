"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCurrency } from "@/lib/format";
import { ChangeBadge } from "@/components/ui/change-badge";
import { useLivePrices } from "./trading/use-live-prices";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  YAxis,
  XAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import Link from "next/link";

type Holding = {
  ticker: string;
  shares: number;
  avgCost: number;
  totalCost: number;
};

type Portfolio = {
  id: string;
  startingBalance: number;
  currentCash: number;
};

type NewsArticle = {
  id: number;
  headline: string;
  source: string;
  url: string;
  datetime: number;
  related: string;
};

type Candle = { date: string; close: number };

type ScannerPreview = {
  type: string;
  label: string;
  count: number;
  tickers: string[];
};

type EarningsPreview = {
  ticker: string;
  name: string;
  eventDate: string;
  timing: string;
};

const CHART_TICKERS = ["SPY", "QQQ", "DIA"];
const CHART_LABELS: Record<string, string> = { SPY: "S&P 500", QQQ: "Nasdaq 100", DIA: "Dow Jones" };
const DONUT_COLORS = ["#34D399", "#60A5FA", "#FBBF24", "#F87171", "#A78BFA", "#FB923C", "#94A3B8"];

function timeAgo(timestamp: number): string {
  const diff = Date.now() / 1000 - timestamp;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// --- Market Chart ---
function MarketCharts() {
  const [activeTicker, setActiveTicker] = useState("SPY");
  const [range, setRange] = useState(30);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [fetchState, setFetchState] = useState<"loading" | "done">("loading");

  const { prices } = useLivePrices(CHART_TICKERS);
  const quote = prices.get(activeTicker);

  const handleTickerChange = useCallback((t: string) => {
    setActiveTicker(t);
    setFetchState("loading");
  }, []);

  const handleRangeChange = useCallback((r: number) => {
    setRange(r);
    setFetchState("loading");
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/prices/candles?symbol=${activeTicker}&days=${range}`)
      .then((r) => r.json())
      .then((data) => { if (!cancelled) { setCandles(data); setFetchState("done"); } })
      .catch(() => { if (!cancelled) { setCandles([]); setFetchState("done"); } });
    return () => { cancelled = true; };
  }, [activeTicker, range]);

  const chartData = candles;
  const hasData = chartData.length >= 2;
  const first = hasData ? chartData[0].close : 0;
  const last = hasData ? chartData[chartData.length - 1].close : 0;
  const isUp = last >= first;
  const color = isUp ? "#34D399" : "#F87171";
  const min = hasData ? Math.min(...chartData.map((c) => c.close)) : 0;
  const max = hasData ? Math.max(...chartData.map((c) => c.close)) : 0;
  const padding = (max - min) * 0.1 || 1;

  return (
    <div className="card-glow p-5">
      {/* Ticker tabs */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-1">
          {CHART_TICKERS.map((t) => (
            <button
              key={t}
              onClick={() => handleTickerChange(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                activeTicker === t ? "bg-(--accent)/15 text-(--accent)" : "text-(--text-secondary) hover:text-white"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {[{ l: "1W", d: 7 }, { l: "1M", d: 30 }, { l: "3M", d: 90 }].map((r) => (
            <button
              key={r.d}
              onClick={() => handleRangeChange(r.d)}
              className={`px-2 py-1 rounded-md text-[10px] font-medium cursor-pointer transition-colors ${
                range === r.d ? "bg-(--accent)/15 text-(--accent)" : "text-(--text-secondary) hover:text-white"
              }`}
            >
              {r.l}
            </button>
          ))}
        </div>
      </div>

      {/* Price header */}
      <div className="flex items-end gap-3 mb-3">
        <div>
          <p className="text-[10px] text-(--text-secondary) uppercase">{CHART_LABELS[activeTicker]}</p>
          <p className="text-2xl font-bold text-white font-(family-name:--font-source-serif)">
            {quote ? formatCurrency(quote.price) : "..."}
          </p>
        </div>
        {quote && <ChangeBadge value={quote.changePercent} className="text-sm mb-0.5" />}
      </div>

      {/* Chart */}
      {fetchState === "loading" ? (
        <div className="h-40 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-(--accent)/30 border-t-(--accent) rounded-full animate-spin" />
        </div>
      ) : hasData ? (
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="dashGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.2} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <YAxis domain={[min - padding, max + padding]} hide />
            <XAxis dataKey="date" hide />
            <Tooltip
              contentStyle={{ background: "#1a2235", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, fontSize: 12, color: "#f0ede6" }}
              formatter={(value) => [formatCurrency(Number(value)), "Price"]}
              labelStyle={{ color: "#94a3b8", fontSize: 10 }}
              isAnimationActive={false}
            />
            <Area type="monotone" dataKey="close" stroke={color} fill="url(#dashGrad)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-40 flex items-center justify-center">
          <p className="text-xs text-(--text-secondary)/40">No chart data</p>
        </div>
      )}
    </div>
  );
}

// --- Portfolio Snapshot ---
function PortfolioSnapshot({ portfolio, holdings, reservedCash = 0 }: { portfolio: Portfolio | null; holdings: Holding[]; reservedCash?: number }) {
  const tickers = holdings.map((h) => h.ticker);
  const { prices } = useLivePrices(tickers);

  if (!portfolio) {
    return (
      <div className="card-glow p-6 text-center h-full flex flex-col items-center justify-center">
        <p className="text-xs text-(--text-secondary) uppercase tracking-wider mb-3">Paper Trading</p>
        <p className="text-sm text-(--text-secondary) mb-4">Start paper trading to track your performance here.</p>
        <Link href="/dashboard/trading" className="inline-block px-4 py-2 rounded-lg bg-(--accent) text-(--surface-0) text-sm font-semibold hover:brightness-110 transition-all">
          Start Paper Trading
        </Link>
      </div>
    );
  }

  const holdingsValue = holdings.reduce((sum, h) => {
    const price = prices.get(h.ticker)?.price ?? h.avgCost;
    return sum + h.shares * price;
  }, 0);
  const totalValue = portfolio.currentCash + reservedCash + holdingsValue;
  const totalGain = totalValue - portfolio.startingBalance;
  const totalGainPct = portfolio.startingBalance > 0 ? (totalGain / portfolio.startingBalance) * 100 : 0;

  // Donut data
  const donutData = [
    ...holdings.slice(0, 6).map((h) => ({
      name: h.ticker,
      value: h.shares * (prices.get(h.ticker)?.price ?? h.avgCost),
    })),
    { name: "Cash", value: portfolio.currentCash },
  ].filter((d) => d.value > 0);

  const top5 = holdings.slice(0, 5);

  return (
    <div className="card-glow p-5 h-full">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-(--text-secondary) uppercase tracking-wider">Portfolio</p>
        <Link href="/dashboard/trading" className="text-[10px] text-(--accent) hover:underline">View all</Link>
      </div>

      <div className="flex items-start gap-4">
        {/* Value + P/L */}
        <div className="flex-1">
          <p className="text-2xl font-bold text-white font-(family-name:--font-source-serif)">{formatCurrency(totalValue)}</p>
          <div className="flex items-center gap-2 mt-1">
            <ChangeBadge value={totalGainPct} className="text-xs" />
            <span className={`text-xs ${totalGain >= 0 ? "text-(--up)" : "text-(--down)"}`}>
              {totalGain >= 0 ? "+" : ""}{formatCurrency(totalGain)}
            </span>
          </div>
          <p className="text-[10px] text-(--text-secondary) mt-2">{formatCurrency(portfolio.currentCash)} cash</p>
          {reservedCash > 0 && (
            <p className="text-[10px] text-(--accent)">{formatCurrency(reservedCash)} reserved</p>
          )}
        </div>

        {/* Donut chart */}
        {donutData.length > 1 && (
          <div className="shrink-0" style={{ width: 96, height: 96 }}>
            <ResponsiveContainer width={96} height={96}>
              <PieChart>
                <Pie data={donutData} dataKey="value" cx="50%" cy="50%" innerRadius={25} outerRadius={40} paddingAngle={2} strokeWidth={0}>
                  {donutData.map((_, i) => (
                    <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#1a2235", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, fontSize: 11, color: "#f0ede6" }}
                  formatter={(value, _name, props) => [formatCurrency(Number(value)), props.payload.name]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Top 3 holdings */}
      {top5.length > 0 && (
        <div className="mt-3 pt-3 border-t border-(--border) space-y-2">
          {top5.map((h) => {
            const quote = prices.get(h.ticker);
            const price = quote?.price ?? h.avgCost;
            return (
              <div key={h.ticker} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white">{h.ticker}</span>
                  <span className="text-[10px] text-(--text-secondary)">{h.shares} shares</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono text-white">{formatCurrency(price)}</span>
                  {quote && <ChangeBadge value={quote.changePercent} className="text-[10px]" />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// --- Trending Tickers ---
type TrendingQuote = {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
};

function TrendingTickers() {
  const [tickers, setTickers] = useState<TrendingQuote[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/trending")
      .then((r) => r.json())
      .then((data) => { if (!cancelled) setTickers(data); })
      .catch(() => {});
    const poll = setInterval(() => {
      fetch("/api/trending")
        .then((r) => r.json())
        .then((data) => { if (!cancelled) setTickers(data); })
        .catch(() => {});
    }, 5 * 60 * 1000);
    return () => { cancelled = true; clearInterval(poll); };
  }, []);

  if (tickers.length === 0) return null;

  // Duplicate the list for seamless loop
  const doubled = [...tickers, ...tickers];

  return (
    <div className="card-glow py-3 overflow-hidden">
      <p className="text-xs text-(--text-secondary) uppercase tracking-wider mb-2 px-4">Trending Now</p>
      <div className="flex ticker-tape">
        {doubled.map((t, i) => (
          <div key={`${t.symbol}-${i}`} className="flex items-center gap-2 px-4 shrink-0">
            <span className="text-xs font-semibold text-white">{t.symbol}</span>
            <span className="text-xs font-mono text-white">{formatCurrency(t.price)}</span>
            <ChangeBadge value={t.changePercent} className="text-[10px]" />
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Current News ---
function CurrentNews() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const fetchNews = async () => {
      try {
        const res = await fetch("/api/news/live");
        if (res.ok && !cancelled) setArticles(await res.json());
      } catch { /* ignore */ }
    };
    fetchNews();
    const poll = setInterval(fetchNews, 5 * 60 * 1000);
    const tick = setInterval(() => setTick((t) => t + 1), 60000);
    return () => { cancelled = true; clearInterval(poll); clearInterval(tick); };
  }, []);

  return (
    <div className="card-glow p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-(--text-secondary) uppercase tracking-wider">Current News</p>
        <Link href="/dashboard/live" className="text-[10px] text-(--accent) hover:underline">View all</Link>
      </div>
      <div className="space-y-3">
        {articles.slice(0, 4).map((a) => (
          <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer" className="block group">
            <p className="text-xs font-medium text-white group-hover:text-(--accent) transition-colors line-clamp-2">{a.headline}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-(--accent)/70">{a.source}</span>
              <span className="text-[10px] text-(--text-secondary)/50">{timeAgo(a.datetime)}</span>
            </div>
          </a>
        ))}
        {articles.length === 0 && (
          <p className="text-xs text-(--text-secondary) py-4 text-center">Loading news...</p>
        )}
      </div>
    </div>
  );
}

// --- Main Dashboard Client ---
export function DashboardClient({
  portfolio,
  holdings,
  reservedCash = 0,
  marketMood,
  scannerPreviews,
  earningsPreviews,
}: {
  portfolio: Portfolio | null;
  holdings: Holding[];
  reservedCash?: number;
  marketMood: { breadth: string; vix: number | null; avgChange: number | null } | null;
  scannerPreviews: ScannerPreview[];
  earningsPreviews: EarningsPreview[];
}) {
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <div className="space-y-4">
      {/* TOP ROW: Portfolio + Market Charts side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        <PortfolioSnapshot portfolio={portfolio} holdings={holdings} reservedCash={reservedCash} />
        <MarketCharts />
      </div>

      {/* Trending Tickers */}
      <TrendingTickers />

      {/* BOTTOM: Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* LEFT COLUMN */}
      <div className="space-y-4">
        <CurrentNews />

        {/* Upcoming Earnings */}
        {earningsPreviews.length > 0 && (
          <div className="card-glow p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-(--text-secondary) uppercase tracking-wider">Upcoming Earnings</p>
              <Link href="/dashboard/earnings" className="text-[10px] text-(--accent) hover:underline">View all</Link>
            </div>
            <div className="space-y-2">
              {earningsPreviews.map((e) => (
                <div key={e.ticker} className="flex items-center justify-between py-1.5">
                  <div>
                    <span className="text-xs font-semibold text-white">{e.ticker}</span>
                    <span className="text-[10px] text-(--text-secondary) ml-2">{e.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-(--text-secondary)">{e.eventDate}</span>
                    {e.timing && <span className="text-[10px] text-(--text-secondary)/50 ml-1">({e.timing})</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT COLUMN */}
      <div className="space-y-4">
        {/* Market Mood */}
        {marketMood && (
          <div className="card-glow p-5">
            <p className="text-xs text-(--text-secondary) uppercase tracking-wider mb-2">Market Mood</p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${
                  marketMood.breadth === "bullish" ? "bg-(--up)" : marketMood.breadth === "bearish" ? "bg-(--down)" : "bg-(--gold)"
                }`} />
                <span className="text-lg font-bold text-white">{capitalize(marketMood.breadth)}</span>
              </div>
              {marketMood.avgChange !== null && <ChangeBadge value={marketMood.avgChange} className="text-sm" />}
              {marketMood.vix !== null && (
                <div className="ml-auto text-right">
                  <p className="text-xs text-(--text-secondary)">VIX</p>
                  <p className="text-sm font-bold text-white">{marketMood.vix.toFixed(2)}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Scanner Alerts */}
        {scannerPreviews.length > 0 && (
          <div className="card-glow p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-(--text-secondary) uppercase tracking-wider">Scanner Alerts</p>
              <Link href="/dashboard/scanners" className="text-[10px] text-(--accent) hover:underline">View all</Link>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {scannerPreviews.map((s) => (
                <div key={s.type} className="rounded-lg bg-(--surface-2) p-3">
                  <p className="text-[10px] text-(--text-secondary) uppercase">{s.label}</p>
                  <p className="text-lg font-bold text-white mt-0.5">{s.count}</p>
                  <p className="text-[10px] text-(--accent)/70 mt-1 truncate">{s.tickers.slice(0, 3).join(", ")}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {/* close bottom grid */}
      </div>
    </div>
  );
}
