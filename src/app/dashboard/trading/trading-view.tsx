"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { executeTrade, resetPortfolio, type Holding } from "@/lib/actions/trading";
import { addToWatchlist, removeFromWatchlist } from "@/lib/actions/watchlist";
import { formatCurrency } from "@/lib/format";
import { ChangeBadge } from "@/components/ui/change-badge";
import { TickerSearch } from "./ticker-search";
import { useLivePrices } from "./use-live-prices";
import { StockChart } from "./stock-chart";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  YAxis,
  Tooltip,
} from "recharts";

type Portfolio = {
  id: string;
  startingBalance: number;
  currentCash: number;
};

type Trade = {
  id: string;
  ticker: string;
  action: string;
  shares: number;
  price: number;
  total: number;
  executedAt: Date | null;
};

type WatchlistItem = { ticker: string };

function MiniChart({ data, positive }: { data: { value: number }[]; positive: boolean }) {
  if (data.length < 2) return null;
  const color = positive ? "#34D399" : "#F87171";
  const min = Math.min(...data.map((d) => d.value));
  const max = Math.max(...data.map((d) => d.value));
  const padding = (max - min) * 0.1 || 1;

  return (
    <ResponsiveContainer width="100%" height={120}>
      <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.2} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <YAxis domain={[min - padding, max + padding]} hide />
        <Tooltip
          contentStyle={{ background: "#1a2235", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, fontSize: 12, color: "#f0ede6" }}
          formatter={(value) => [formatCurrency(Number(value)), "Portfolio"]}
          labelStyle={{ display: "none" }}
        />
        <Area type="monotone" dataKey="value" stroke={color} fill="url(#portfolioGrad)" strokeWidth={2} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function TradingView({
  portfolio,
  holdings: initialHoldings,
  trades: tradeHistory,
  watchlistItems,
}: {
  portfolio: Portfolio;
  holdings: Holding[];
  trades: Trade[];
  watchlistItems: WatchlistItem[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillTicker = searchParams.get("buy") || "";

  const [selectedTicker, setSelectedTicker] = useState<string | null>(prefillTicker || null);
  const [shares, setShares] = useState("");
  const [action, setAction] = useState<"buy" | "sell">("buy");
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTrade, setLastTrade] = useState<string | null>(null);
  const [tab, setTab] = useState<"portfolio" | "watchlist" | "history">("portfolio");
  const [resetting, setResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Track portfolio value over time for the chart
  const [valueHistory, setValueHistory] = useState<{ value: number }[]>([]);

  const allTickers = useMemo(() => {
    const set = new Set<string>();
    initialHoldings.forEach((h) => set.add(h.ticker));
    watchlistItems.forEach((w) => set.add(w.ticker));
    if (selectedTicker) set.add(selectedTicker);
    return Array.from(set);
  }, [initialHoldings, watchlistItems, selectedTicker]);

  const { prices, marketOpen } = useLivePrices(allTickers);

  // Portfolio calculations
  const holdingsValue = initialHoldings.reduce((sum, h) => {
    const price = prices.get(h.ticker)?.price ?? h.avgCost;
    return sum + h.shares * price;
  }, 0);
  const totalValue = portfolio.currentCash + holdingsValue;
  const totalGain = totalValue - portfolio.startingBalance;
  const totalGainPct = portfolio.startingBalance > 0 ? (totalGain / portfolio.startingBalance) * 100 : 0;
  const isPositive = totalGain >= 0;

  // Track value history for chart
  const prevValueRef = useRef(totalValue);
  useEffect(() => {
    if (totalValue !== prevValueRef.current || valueHistory.length === 0) {
      prevValueRef.current = totalValue;
      setValueHistory((prev) => {
        const next = [...prev, { value: totalValue }];
        return next.length > 200 ? next.slice(-200) : next;
      });
    }
  }, [totalValue, valueHistory.length]);

  // Selected stock info
  const selectedQuote = selectedTicker ? prices.get(selectedTicker) : null;
  const selectedHolding = selectedTicker ? initialHoldings.find((h) => h.ticker === selectedTicker) : null;
  const isInWatchlist = selectedTicker ? watchlistItems.some((w) => w.ticker === selectedTicker) : false;
  const estimatedTotal = selectedQuote?.price && shares ? selectedQuote.price * parseInt(shares) : 0;

  async function handleTrade() {
    if (!selectedTicker || !shares || parseInt(shares) <= 0) return;
    setExecuting(true);
    setError(null);
    setLastTrade(null);
    try {
      const result = await executeTrade(portfolio.id, selectedTicker, action, parseInt(shares));
      setLastTrade(
        `${result.action === "buy" ? "Bought" : "Sold"} ${result.shares} ${result.ticker} at ${formatCurrency(result.price)}`
      );
      setShares("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Trade failed");
    } finally {
      setExecuting(false);
    }
  }

  async function handleReset() {
    setResetting(true);
    try {
      await resetPortfolio(portfolio.id);
      closeModal();
      setShowResetConfirm(false);
      setValueHistory([]);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setResetting(false);
    }
  }

  async function handleWatchlistToggle() {
    if (!selectedTicker) return;
    if (isInWatchlist) {
      await removeFromWatchlist(selectedTicker);
    } else {
      await addToWatchlist(selectedTicker);
    }
    router.refresh();
  }

  function selectStock(ticker: string) {
    setSelectedTicker(ticker);
    setShares("");
    setError(null);
    setLastTrade(null);
    setAction("buy");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    setSelectedTicker(null);
    document.body.style.overflow = "";
  }

  return (
    <div className="space-y-4">
      {/* Hero: Portfolio value + chart */}
      <div className="card-glow p-6">
        <div className="flex items-start justify-between mb-1">
          <div>
            <p className="text-xs text-(--text-secondary) uppercase tracking-wider">Portfolio Value</p>
            <p className="text-3xl font-bold text-white mt-1 font-(family-name:--font-source-serif)">
              {formatCurrency(totalValue)}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <ChangeBadge value={totalGainPct} className="text-sm font-semibold" />
              <span className={`text-sm ${isPositive ? "text-(--up)" : "text-(--down)"}`}>
                ({isPositive ? "+" : ""}{formatCurrency(totalGain)})
              </span>
              <span className="text-xs text-(--text-secondary)">all time</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${marketOpen ? "bg-(--up) pulse-dot" : "bg-(--text-secondary)/40"}`} />
              <span className="text-[10px] text-(--text-secondary)">{marketOpen ? "Live" : "Closed"}</span>
            </div>
          </div>
        </div>

        {/* Intraday chart */}
        <div className="mt-2">
          {valueHistory.length >= 2 ? (
            <MiniChart data={valueHistory} positive={isPositive} />
          ) : (
            <div className="h-[120px] flex items-center justify-center">
              <p className="text-xs text-(--text-secondary)/40">Chart builds as prices update...</p>
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-(--border)">
          <div>
            <p className="text-[10px] text-(--text-secondary) uppercase">Cash</p>
            <p className="text-sm font-bold text-white">{formatCurrency(portfolio.currentCash)}</p>
          </div>
          <div>
            <p className="text-[10px] text-(--text-secondary) uppercase">Invested</p>
            <p className="text-sm font-bold text-white">{formatCurrency(holdingsValue)}</p>
          </div>
          <div>
            <p className="text-[10px] text-(--text-secondary) uppercase">Starting</p>
            <p className="text-sm font-bold text-(--text-secondary)">{formatCurrency(portfolio.startingBalance)}</p>
          </div>
        </div>
      </div>

      {/* Tabs + reset */}
      <div className="flex items-center justify-between border-b border-(--border)">
        <div className="flex gap-4">
          <button
            onClick={() => setTab("portfolio")}
            className={`text-sm pb-2.5 cursor-pointer transition-colors border-b-2 ${
              tab === "portfolio" ? "text-white border-(--accent)" : "text-(--text-secondary) border-transparent hover:text-white"
            }`}
          >
            Portfolio
          </button>
          <button
            onClick={() => setTab("watchlist")}
            className={`text-sm pb-2.5 cursor-pointer transition-colors border-b-2 ${
              tab === "watchlist" ? "text-white border-(--accent)" : "text-(--text-secondary) border-transparent hover:text-white"
            }`}
          >
            Watchlist
          </button>
          <button
            onClick={() => setTab("history")}
            className={`text-sm pb-2.5 cursor-pointer transition-colors border-b-2 ${
              tab === "history" ? "text-white border-(--accent)" : "text-(--text-secondary) border-transparent hover:text-white"
            }`}
          >
            History
          </button>
        </div>
        <button
          onClick={() => setShowResetConfirm(true)}
          className="text-[10px] text-(--text-secondary)/50 hover:text-(--down) cursor-pointer transition-colors pb-2.5"
        >
          Reset
        </button>
      </div>

      {/* Reset confirmation */}
      {showResetConfirm && (
        <div className="rounded-lg bg-(--down)/10 border border-(--down)/30 p-4 flex items-center justify-between">
          <p className="text-sm text-(--text-primary)">Reset? All trades deleted, cash restored to {formatCurrency(portfolio.startingBalance)}.</p>
          <div className="flex gap-2 shrink-0 ml-4">
            <button onClick={() => setShowResetConfirm(false)} className="px-3 py-1.5 text-xs text-(--text-secondary) cursor-pointer">Cancel</button>
            <button onClick={handleReset} disabled={resetting} className="px-3 py-1.5 text-xs bg-(--down) text-white rounded-lg cursor-pointer disabled:opacity-50">
              {resetting ? "..." : "Reset"}
            </button>
          </div>
        </div>
      )}

      {/* Tab content */}
      {/* Search -- always visible */}
      <TickerSearch
        onSelect={(symbol) => selectStock(symbol)}
        placeholder="Search any US stock..."
      />

      {/* Tab content */}
      {tab === "portfolio" && (
        <div className="card-glow overflow-hidden">
          {initialHoldings.length === 0 ? (
            <p className="text-sm text-(--text-secondary) py-8 text-center">No holdings yet. Search and buy your first stock.</p>
          ) : (
            initialHoldings.map((h) => {
              const quote = prices.get(h.ticker);
              const currentPrice = quote?.price ?? h.avgCost;
              const pl = (h.shares * currentPrice) - h.totalCost;
              const plPct = h.totalCost > 0 ? (pl / h.totalCost) * 100 : 0;
              return (
                <button
                  key={h.ticker}
                  onClick={() => selectStock(h.ticker)}
                  className="w-full flex items-center justify-between px-4 py-3 border-b border-(--border) last:border-0 cursor-pointer transition-colors hover:bg-white/[0.02]"
                >
                  <div className="text-left">
                    <p className="text-sm font-semibold text-white">{h.ticker}</p>
                    <p className="text-[10px] text-(--text-secondary)">{h.shares} share{h.shares > 1 ? "s" : ""}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono text-white">{formatCurrency(h.shares * currentPrice)}</p>
                    <div className="flex items-center gap-1.5 justify-end">
                      <span className={`text-[10px] font-mono ${pl >= 0 ? "text-(--up)" : "text-(--down)"}`}>
                        {pl >= 0 ? "+" : ""}{formatCurrency(pl)}
                      </span>
                      <ChangeBadge value={plPct} className="text-[10px]" />
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}

      {tab === "watchlist" && (
        <div className="card-glow overflow-hidden">
          {watchlistItems.length === 0 ? (
            <p className="text-sm text-(--text-secondary) py-8 text-center">Your watchlist is empty. Search above to find stocks.</p>
          ) : (
            watchlistItems.map((item) => {
              const quote = prices.get(item.ticker);
              return (
                <button
                  key={item.ticker}
                  onClick={() => selectStock(item.ticker)}
                  className="w-full flex items-center justify-between px-4 py-3 border-b border-(--border) last:border-0 cursor-pointer transition-colors hover:bg-white/[0.02]"
                >
                  <p className="text-sm font-semibold text-white">{item.ticker}</p>
                  <div className="text-right">
                    {quote ? (
                      <>
                        <p className="text-sm font-mono text-white">{formatCurrency(quote.price)}</p>
                        <ChangeBadge value={quote.changePercent} className="text-[10px]" />
                      </>
                    ) : (
                      <p className="text-xs text-(--text-secondary)">--</p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}

      {tab === "history" && (
        <div className="card-glow overflow-hidden">
          {tradeHistory.length === 0 ? (
            <p className="text-sm text-(--text-secondary) py-8 text-center">No trades yet.</p>
          ) : (
            <div className="divide-y divide-(--border)">
              {tradeHistory.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-3 px-4">
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                      t.action === "buy" ? "bg-(--up)/15 text-(--up)" : "bg-(--down)/15 text-(--down)"
                    }`}>
                      {t.action.toUpperCase()}
                    </span>
                    <span className="text-sm font-semibold text-white">{t.ticker}</span>
                    <span className="text-xs text-(--text-secondary)">{t.shares} @ {formatCurrency(t.price)}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-white">{formatCurrency(t.total)}</p>
                    {t.executedAt && (
                      <p className="text-[10px] text-(--text-secondary)">
                        {new Date(t.executedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Trade modal */}
      {selectedTicker && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60" onClick={() => closeModal()} />
          <div className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-(--surface-1) border-t border-(--border) lg:inset-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-2xl lg:w-[420px] lg:max-h-[80vh]">
            {/* Handle bar (mobile) */}
            <div className="flex justify-center py-2 lg:hidden">
              <div className="w-10 h-1 rounded-full bg-(--text-secondary)/20" />
            </div>

            {/* Stock header */}
            <div className="px-5 pt-2 pb-4 border-b border-(--border)">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-lg font-bold text-white">{selectedTicker}</p>
                  {selectedQuote && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-2xl font-bold text-white font-(family-name:--font-source-serif)">{formatCurrency(selectedQuote.price)}</span>
                      <ChangeBadge value={selectedQuote.changePercent} className="text-sm" />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleWatchlistToggle}
                    className={`text-[10px] px-2.5 py-1 rounded-lg cursor-pointer transition-colors ${
                      isInWatchlist
                        ? "bg-(--down)/10 text-(--down)"
                        : "bg-(--accent)/15 text-(--accent)"
                    }`}
                  >
                    {isInWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
                  </button>
                  <button
                    onClick={() => closeModal()}
                    className="text-(--text-secondary) hover:text-white cursor-pointer p-1"
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <line x1="4" y1="4" x2="14" y2="14" />
                      <line x1="14" y1="4" x2="4" y2="14" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Position info */}
              {selectedHolding && (
                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-(--border)">
                  <div>
                    <p className="text-[10px] text-(--text-secondary)">Shares</p>
                    <p className="text-sm font-bold text-white">{selectedHolding.shares}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-(--text-secondary)">Avg Cost</p>
                    <p className="text-sm font-bold text-white">{formatCurrency(selectedHolding.avgCost)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-(--text-secondary)">Value</p>
                    <p className="text-sm font-bold text-white">
                      {formatCurrency(selectedHolding.shares * (selectedQuote?.price ?? selectedHolding.avgCost))}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Stock chart */}
            <div className="px-5 py-3 border-b border-(--border)">
              <StockChart symbol={selectedTicker} />
            </div>

            {/* Trade form */}
            <div className="p-5">
              {/* Buy/Sell toggle */}
              <div className="flex gap-1 mb-4 bg-(--surface-0) rounded-lg p-1">
                <button
                  onClick={() => setAction("buy")}
                  className={`flex-1 py-2 rounded-md text-sm font-medium cursor-pointer transition-colors ${
                    action === "buy" ? "bg-(--up)/20 text-(--up)" : "text-(--text-secondary)"
                  }`}
                >
                  Buy
                </button>
                <button
                  onClick={() => setAction("sell")}
                  className={`flex-1 py-2 rounded-md text-sm font-medium cursor-pointer transition-colors ${
                    action === "sell" ? "bg-(--down)/20 text-(--down)" : "text-(--text-secondary)"
                  }`}
                >
                  Sell
                </button>
              </div>

              {/* Shares */}
              <div className="mb-4">
                <label className="text-[10px] text-(--text-secondary) uppercase tracking-wider mb-1.5 block">Shares</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={shares}
                  onChange={(e) => setShares(e.target.value.replace(/\D/g, ""))}
                  placeholder="0"
                  className="w-full bg-(--surface-0) text-(--text-primary) border border-(--border) rounded-lg px-3 py-3 text-xl font-mono text-center focus:border-(--accent)/50 focus:outline-none placeholder:text-(--text-secondary)/20"
                />
              </div>

              {/* Estimated total */}
              {estimatedTotal > 0 && (
                <div className="flex items-center justify-between mb-4 text-sm">
                  <span className="text-(--text-secondary)">Estimated Total</span>
                  <span className="text-white font-bold font-mono">{formatCurrency(estimatedTotal)}</span>
                </div>
              )}

              {/* Execute */}
              <button
                onClick={handleTrade}
                disabled={executing || !shares || parseInt(shares) <= 0}
                className={`w-full py-3.5 rounded-lg font-semibold text-sm cursor-pointer transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.98] ${
                  action === "buy"
                    ? "bg-(--up) text-(--surface-0) hover:brightness-110"
                    : "bg-(--down) text-white hover:brightness-110"
                }`}
              >
                {executing ? "Executing..." : `${action === "buy" ? "Buy" : "Sell"} ${selectedTicker}`}
              </button>

              {error && <p className="text-xs text-(--down) mt-3 text-center">{error}</p>}
              {lastTrade && <p className="text-xs text-(--up) mt-3 text-center">{lastTrade}</p>}

              <p className="text-[10px] text-(--text-secondary)/50 mt-4 text-center">
                {formatCurrency(portfolio.currentCash)} buying power
              </p>
            </div>

            {/* Per-stock trade history */}
            {(() => {
              const stockTrades = tradeHistory.filter((t) => t.ticker === selectedTicker);
              if (stockTrades.length === 0) return null;
              return (
                <div className="px-5 pb-5 border-t border-(--border)">
                  <p className="text-[10px] text-(--text-secondary) uppercase tracking-wider pt-3 mb-2">Trade History</p>
                  <div className="divide-y divide-(--border)">
                    {stockTrades.map((t) => (
                      <div key={t.id} className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                            t.action === "buy" ? "bg-(--up)/15 text-(--up)" : "bg-(--down)/15 text-(--down)"
                          }`}>
                            {t.action.toUpperCase()}
                          </span>
                          <span className="text-xs text-(--text-secondary)">{t.shares} @ {formatCurrency(t.price)}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-white">{formatCurrency(t.total)}</p>
                          {t.executedAt && (
                            <p className="text-[10px] text-(--text-secondary)/50">
                              {new Date(t.executedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </>
      )}
    </div>
  );
}
