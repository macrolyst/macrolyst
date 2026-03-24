"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { executeTrade, resetPortfolio, type Holding } from "@/lib/actions/trading";
import { createOrder, cancelOrder, updateOrder, type PendingOrder } from "@/lib/actions/orders";
import { useOrderExecutor } from "./use-order-executor";
import { addToWatchlist, removeFromWatchlist } from "@/lib/actions/watchlist";
import { formatCurrency } from "@/lib/format";
import { ChangeBadge } from "@/components/ui/change-badge";
import { TickerSearch } from "./ticker-search";
import { useLivePrices } from "./use-live-prices";
import { StockChart } from "./stock-chart";
import { RecommendationsDrawer } from "./recommendations-drawer";
import { StockDetailModal } from "../watchlist/stock-detail-modal";
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
  pendingOrders: initialOrders,
  watchlistItems,
  topPicks = [],
}: {
  portfolio: Portfolio;
  holdings: Holding[];
  trades: Trade[];
  pendingOrders: PendingOrder[];
  watchlistItems: WatchlistItem[];
  topPicks?: { ticker: string; name: string; price: number; score: number; change: number }[];
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
  const [tab, setTab] = useState<"portfolio" | "watchlist" | "history" | "orders">("portfolio");
  const [orderType, setOrderType] = useState<"market" | "limit" | "stop_loss">("market");
  const [targetPrice, setTargetPrice] = useState("");
  const [resetting, setResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [detailTicker, setDetailTicker] = useState<string | null>(null);

  // Track portfolio value over time for the chart
  const [valueHistory, setValueHistory] = useState<{ value: number }[]>([]);

  const allTickers = useMemo(() => {
    const set = new Set<string>();
    initialHoldings.forEach((h) => set.add(h.ticker));
    watchlistItems.forEach((w) => set.add(w.ticker));
    initialOrders.forEach((o) => set.add(o.ticker));
    if (selectedTicker) set.add(selectedTicker);
    return Array.from(set);
  }, [initialHoldings, watchlistItems, initialOrders, selectedTicker]);

  const { prices, marketOpen } = useLivePrices(allTickers);

  // Order executor — checks pending orders against live prices
  useOrderExecutor(initialOrders, prices, () => router.refresh());

  // Portfolio calculations
  const reservedCash = initialOrders
    .filter((o) => o.orderType === "limit_buy" && o.status === "pending")
    .reduce((sum, o) => sum + o.targetPrice * o.shares, 0);
  const holdingsValue = initialHoldings.reduce((sum, h) => {
    const price = prices.get(h.ticker)?.price ?? h.avgCost;
    return sum + h.shares * price;
  }, 0);
  const totalValue = portfolio.currentCash + reservedCash + holdingsValue;
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
  const priceForEstimate = orderType === "market" ? selectedQuote?.price : (parseFloat(targetPrice) || 0);
  const estimatedTotal = priceForEstimate && shares ? priceForEstimate * parseInt(shares) : 0;
  const sharesNum = parseInt(shares) || 0;
  const insufficientCash = action === "buy" && estimatedTotal > portfolio.currentCash;
  const insufficientShares = action === "sell" && selectedHolding ? sharesNum > selectedHolding.shares : false;

  async function handleTrade() {
    if (!selectedTicker || !shares || parseInt(shares) <= 0) return;
    setExecuting(true);
    setError(null);
    setLastTrade(null);
    try {
      if (orderType === "market") {
        const result = await executeTrade(portfolio.id, selectedTicker, action, parseInt(shares));
        setLastTrade(
          `${result.action === "buy" ? "Bought" : "Sold"} ${result.shares} ${result.ticker} at ${formatCurrency(result.price)}`
        );
      } else {
        const tp = parseFloat(targetPrice);
        if (!tp || tp <= 0) throw new Error("Enter a valid target price");
        const ot = orderType === "limit"
          ? (action === "buy" ? "limit_buy" : "limit_sell")
          : "stop_loss";
        await createOrder(portfolio.id, selectedTicker, ot as "limit_buy" | "limit_sell" | "stop_loss", tp, parseInt(shares));
        setLastTrade(
          `${orderType === "limit" ? "Limit" : "Stop-loss"} order placed: ${action} ${shares} ${selectedTicker} at ${formatCurrency(tp)}`
        );
      }
      setShares("");
      setTargetPrice("");
      setOrderType("market");
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
    setTargetPrice("");
    setOrderType("market");
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
      {/* Page header with Recommendations button */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs tracking-[0.15em] uppercase text-(--accent) mb-1">Trading</p>
          <h1 className="text-2xl font-bold text-white font-(family-name:--font-source-serif)">Paper Trading</h1>
        </div>
        <button
          onClick={() => setShowDrawer(true)}
          className="group inline-flex items-center gap-1.5 text-xs text-(--accent) font-semibold px-3 py-1.5 rounded-lg border border-(--accent)/30 hover:bg-(--accent)/10 cursor-pointer transition-colors"
        >
          Recommendations
          <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
        </button>
      </div>

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
            <button
              onClick={() => setShowResetConfirm(true)}
              className="text-[10px] text-(--text-secondary)/50 hover:text-(--down) cursor-pointer transition-colors px-2 py-1 rounded"
            >
              Reset
            </button>
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
            {reservedCash > 0 && (
              <p className="text-[10px] text-(--gold)">{formatCurrency(reservedCash)} reserved</p>
            )}
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

      {/* Tabs */}
      <div className="flex items-center justify-center border-b border-(--border)">
        <div className="flex gap-4">
          <button
            onClick={() => setTab("portfolio")}
            className={`text-sm pb-2.5 cursor-pointer transition-colors border-b-2 ${
              tab === "portfolio" ? "text-white border-(--accent)" : "text-(--text-secondary) border-transparent hover:text-white"
            }`}
          >
            Portfolio{initialHoldings.length > 0 ? ` (${initialHoldings.length})` : ""}
          </button>
          <button
            onClick={() => setTab("watchlist")}
            className={`text-sm pb-2.5 cursor-pointer transition-colors border-b-2 ${
              tab === "watchlist" ? "text-white border-(--accent)" : "text-(--text-secondary) border-transparent hover:text-white"
            }`}
          >
            Watchlist{watchlistItems.length > 0 ? ` (${watchlistItems.length})` : ""}
          </button>
          <button
            onClick={() => setTab("orders")}
            className={`text-sm pb-2.5 cursor-pointer transition-colors border-b-2 ${
              tab === "orders" ? "text-white border-(--accent)" : "text-(--text-secondary) border-transparent hover:text-white"
            }`}
          >
            Orders{initialOrders.length > 0 ? ` (${initialOrders.length})` : ""}
          </button>
          <button
            onClick={() => setTab("history")}
            className={`text-sm pb-2.5 cursor-pointer transition-colors border-b-2 ${
              tab === "history" ? "text-white border-(--accent)" : "text-(--text-secondary) border-transparent hover:text-white"
            }`}
          >
            History{tradeHistory.length > 0 ? ` (${tradeHistory.length})` : ""}
          </button>
        </div>
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
                <div
                  key={h.ticker}
                  className="flex items-center justify-between px-4 py-3 border-b border-(--border) last:border-0 hover:bg-white/[0.02] transition-colors"
                >
                  <button onClick={() => selectStock(h.ticker)} className="text-left cursor-pointer">
                    <p className="text-sm font-semibold text-white hover:text-(--accent) transition-colors">{h.ticker}</p>
                    <p className="text-[10px] text-(--text-secondary)">{h.shares} share{h.shares > 1 ? "s" : ""} @ {formatCurrency(h.avgCost)}</p>
                  </button>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="flex items-center gap-1.5 justify-end">
                        {quote && <span className={`w-1.5 h-1.5 rounded-full ${marketOpen ? "bg-(--up) pulse-dot" : "bg-(--text-secondary)/40"}`} />}
                        <p className="text-sm font-mono text-white">{formatCurrency(currentPrice)}</p>
                        {quote && <ChangeBadge value={quote.changePercent} className="text-[10px]" />}
                      </div>
                      <p className="text-[10px] font-mono text-(--text-secondary)">{formatCurrency(h.shares * currentPrice)} total</p>
                      <span className={`text-[10px] font-mono ${pl >= 0 ? "text-(--up)" : "text-(--down)"}`}>
                        {pl >= 0 ? "+" : ""}{formatCurrency(pl)} ({plPct >= 0 ? "+" : ""}{plPct.toFixed(2)}%)
                      </span>
                    </div>
                    <button
                      onClick={() => setDetailTicker(h.ticker)}
                      className="text-[10px] text-(--text-secondary) hover:text-white cursor-pointer px-2 py-1 rounded border border-(--border) hover:border-(--text-secondary) transition-colors"
                    >
                      Details
                    </button>
                  </div>
                </div>
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
                <div
                  key={item.ticker}
                  className="flex items-center justify-between px-4 py-3 border-b border-(--border) last:border-0 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <button onClick={() => selectStock(item.ticker)} className="text-sm font-semibold text-white hover:text-(--accent) cursor-pointer transition-colors w-14 shrink-0 text-left">
                      {item.ticker}
                    </button>
                    {quote && (
                      <>
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${marketOpen ? "bg-(--up) pulse-dot" : "bg-(--text-secondary)/40"}`} />
                          <span className="text-sm font-mono text-white">{formatCurrency(quote.price)}</span>
                          <ChangeBadge value={quote.changePercent} className="text-xs" />
                        </div>
                        <div className="hidden sm:flex items-center gap-6 ml-auto mr-auto text-xs text-(--text-secondary)">
                          <span>Open <span className="text-white font-mono ml-1">{formatCurrency(quote.open)}</span></span>
                          <span>High <span className="text-white font-mono ml-1">{formatCurrency(quote.high)}</span></span>
                          <span>Low <span className="text-white font-mono ml-1">{formatCurrency(quote.low)}</span></span>
                        </div>
                      </>
                    )}
                    {!quote && <p className="text-xs text-(--text-secondary)">--</p>}
                  </div>
                  <button
                    onClick={() => setDetailTicker(item.ticker)}
                    className="text-[10px] text-(--text-secondary) hover:text-white cursor-pointer px-2 py-1 rounded border border-(--border) hover:border-(--text-secondary) transition-colors shrink-0"
                  >
                    Details
                  </button>
                </div>
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

      {tab === "orders" && (
        <>
          <OrdersTab orders={initialOrders} prices={prices} onRefresh={() => router.refresh()} />
          <p className="text-xs text-white text-center mt-3">
            Pending orders execute automatically when the target price is reached. Keep this page open and active during market hours for orders to trigger.
          </p>
        </>
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
                  onClick={() => { setAction("buy"); setOrderType("market"); }}
                  className={`flex-1 py-2 rounded-md text-sm font-medium cursor-pointer transition-colors ${
                    action === "buy" ? "bg-(--up)/20 text-(--up)" : "text-(--text-secondary)"
                  }`}
                >
                  Buy
                </button>
                {selectedHolding && selectedHolding.shares > 0 && (
                  <button
                    onClick={() => { setAction("sell"); setOrderType("market"); }}
                    className={`flex-1 py-2 rounded-md text-sm font-medium cursor-pointer transition-colors ${
                      action === "sell" ? "bg-(--down)/20 text-(--down)" : "text-(--text-secondary)"
                    }`}
                  >
                    Sell
                  </button>
                )}
              </div>

              {/* Order Type */}
              <div className="flex gap-1 mb-4 bg-(--surface-0) rounded-lg p-1">
                {(action === "buy"
                  ? (["market", "limit"] as const)
                  : (["market", "limit", "stop_loss"] as const)
                ).map((ot) => (
                  <button
                    key={ot}
                    onClick={() => setOrderType(ot)}
                    className={`flex-1 py-1.5 rounded-md text-[11px] font-medium cursor-pointer transition-colors ${
                      orderType === ot ? "bg-(--surface-3) text-white" : "text-(--text-secondary)"
                    }`}
                  >
                    {ot === "market" ? "Market" : ot === "limit" ? "Limit" : "Stop-Loss"}
                  </button>
                ))}
              </div>

              {/* Order type description */}
              {orderType !== "market" && (
                <div className="mb-3 px-3 py-2 rounded-lg bg-(--surface-2)/40 border-l-2 border-(--accent)/40">
                  <p className="text-[11px] text-(--text-secondary)">
                    {orderType === "limit" && action === "buy" && "Limit Buy — buy when price drops to your target (buy cheaper)"}
                    {orderType === "limit" && action === "sell" && "Limit Sell — sell when price rises to your target (sell higher)"}
                    {orderType === "stop_loss" && "Stop-Loss — sell when price drops below your target (protect from losses)"}
                  </p>
                </div>
              )}

              {/* Target Price (for limit/stop-loss) */}
              {orderType !== "market" && (
                <div className="mb-4">
                  <label className="text-[10px] text-(--text-secondary) uppercase tracking-wider mb-1.5 block">
                    {orderType === "limit" ? "Limit Price" : "Stop Price"}
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    placeholder={selectedQuote ? selectedQuote.price.toFixed(2) : "0.00"}
                    className="w-full bg-(--surface-0) text-(--text-primary) border border-(--border) rounded-lg px-3 py-3 text-xl font-mono text-center focus:border-(--accent)/50 focus:outline-none placeholder:text-(--text-secondary)/20"
                  />
                </div>
              )}

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
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-(--text-secondary)">Estimated Total</span>
                    <span className="text-white font-bold font-mono">{formatCurrency(estimatedTotal)}</span>
                  </div>
                  {insufficientCash && (
                    <p className="text-[10px] text-(--down) mt-1">Insufficient cash ({formatCurrency(portfolio.currentCash)} available)</p>
                  )}
                  {insufficientShares && (
                    <p className="text-[10px] text-(--down) mt-1">Insufficient shares (you hold {selectedHolding?.shares ?? 0})</p>
                  )}
                </div>
              )}

              {/* Execute */}
              <button
                onClick={handleTrade}
                disabled={executing || !shares || sharesNum <= 0 || insufficientCash || insufficientShares || (orderType !== "market" && (!targetPrice || parseFloat(targetPrice) <= 0))}
                className={`w-full py-3.5 rounded-lg font-semibold text-sm cursor-pointer transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.98] ${
                  action === "buy"
                    ? "bg-(--up) text-(--surface-0) hover:brightness-110"
                    : "bg-(--down) text-white hover:brightness-110"
                }`}
              >
                {executing ? "Executing..." : orderType === "market"
                  ? `${action === "buy" ? "Buy" : "Sell"} ${selectedTicker}`
                  : `Place ${orderType === "limit" ? "Limit" : "Stop-Loss"} Order`}
              </button>

              {error && <p className="text-xs text-(--down) mt-3 text-center">{error}</p>}
              {lastTrade && <p className="text-xs text-(--up) mt-3 text-center">{lastTrade}</p>}

              <p className="text-[10px] text-(--text-secondary)/50 mt-4 text-center">
                {formatCurrency(portfolio.currentCash)} available{reservedCash > 0 ? ` (${formatCurrency(reservedCash)} reserved)` : ""}
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

      {/* Stock Detail Modal */}
      {detailTicker && (
        <StockDetailModal
          symbol={detailTicker}
          onClose={() => setDetailTicker(null)}
          onBuy={(s) => { setDetailTicker(null); selectStock(s); }}
        />
      )}

      {/* Recommendations Drawer */}
      <RecommendationsDrawer
        open={showDrawer}
        onClose={() => setShowDrawer(false)}
        onBuy={(symbol) => selectStock(symbol)}
        topPicks={topPicks}
      />
    </div>
  );
}

function OrdersTab({ orders, prices, onRefresh }: { orders: PendingOrder[]; prices: Map<string, { price: number }>; onRefresh: () => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editShares, setEditShares] = useState("");
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function startEdit(o: PendingOrder) {
    setEditingId(o.id);
    setEditPrice(o.targetPrice.toFixed(2));
    setEditShares(o.shares.toString());
  }

  async function handleUpdate(orderId: string) {
    const price = parseFloat(editPrice);
    const shares = parseInt(editShares);
    if (!price || price <= 0 || !shares || shares <= 0) return;
    setBusy(true);
    try {
      await updateOrder(orderId, price, shares);
      setEditingId(null);
      onRefresh();
    } catch { /* ignore */ }
    finally { setBusy(false); }
  }

  async function handleCancel(orderId: string) {
    setBusy(true);
    try {
      await cancelOrder(orderId);
      setConfirmCancelId(null);
      onRefresh();
    } catch { /* ignore */ }
    finally { setBusy(false); }
  }

  if (orders.length === 0) {
    return (
      <div className="card-glow overflow-hidden">
        <p className="text-sm text-(--text-secondary) py-8 text-center">No pending orders. Use the Limit or Stop-Loss order type when trading.</p>
      </div>
    );
  }

  return (
    <div className="card-glow overflow-hidden">
      <div className="divide-y divide-(--border)">
        {orders.map((o) => {
          const quote = prices.get(o.ticker);
          const diff = quote ? ((quote.price - o.targetPrice) / o.targetPrice) * 100 : null;
          const isEditing = editingId === o.id;
          const isConfirmingCancel = confirmCancelId === o.id;

          return (
            <div key={o.id} className="py-3 px-4">
              {/* Order info row */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                      o.orderType === "limit_buy" ? "bg-(--up)/15 text-(--up)"
                        : o.orderType === "limit_sell" ? "bg-(--accent)/15 text-(--accent)"
                        : "bg-(--down)/15 text-(--down)"
                    }`}>
                      {o.orderType === "limit_buy" ? "LIMIT BUY" : o.orderType === "limit_sell" ? "LIMIT SELL" : "STOP-LOSS"}
                    </span>
                    <span className="text-sm font-semibold text-white">{o.ticker}</span>
                    <span className="text-xs text-(--text-secondary)">{o.shares} shares</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 ml-0.5">
                    <span className="text-xs text-(--text-secondary)">Target: <span className="text-white font-mono">{formatCurrency(o.targetPrice)}</span></span>
                    {quote && (
                      <>
                        <span className="text-xs text-(--text-secondary)">Now: <span className="text-white font-mono">{formatCurrency(quote.price)}</span></span>
                        {diff !== null && (
                          <span className={`text-xs font-mono ${diff >= 0 ? "text-(--up)" : "text-(--down)"}`}>
                            {Math.abs(diff).toFixed(2)}% {diff >= 0 ? "above" : "below"} target
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-2 shrink-0">
                  <button
                    onClick={() => startEdit(o)}
                    className="text-xs text-(--accent) hover:underline cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setConfirmCancelId(o.id)}
                    className="text-xs text-(--down) hover:underline cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>

              {/* Edit form */}
              {isEditing && (
                <div className="mt-3 pt-3 border-t border-(--border) flex items-end gap-3">
                  <div className="flex-1">
                    <label className="text-[10px] text-(--text-secondary) uppercase block mb-1">Price</label>
                    <input
                      type="number" min="0.01" step="0.01" value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      className="w-full bg-(--surface-0) text-(--text-primary) border border-(--border) rounded-lg px-2 py-1.5 text-sm font-mono focus:border-(--accent)/50 focus:outline-none"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-(--text-secondary) uppercase block mb-1">Shares</label>
                    <input
                      type="number" min="1" step="1" value={editShares}
                      onChange={(e) => setEditShares(e.target.value.replace(/\D/g, ""))}
                      className="w-full bg-(--surface-0) text-(--text-primary) border border-(--border) rounded-lg px-2 py-1.5 text-sm font-mono focus:border-(--accent)/50 focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={() => handleUpdate(o.id)}
                    disabled={busy}
                    className="px-3 py-1.5 rounded-lg bg-(--accent) text-(--surface-0) text-xs font-semibold cursor-pointer disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-3 py-1.5 text-xs text-(--text-secondary) cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Cancel confirmation */}
              {isConfirmingCancel && (
                <div className="mt-3 pt-3 border-t border-(--border) flex items-center justify-between">
                  <p className="text-xs text-(--text-primary)">Cancel this order?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmCancelId(null)}
                      className="px-3 py-1.5 text-xs text-(--text-secondary) cursor-pointer"
                    >
                      No
                    </button>
                    <button
                      onClick={() => handleCancel(o.id)}
                      disabled={busy}
                      className="px-3 py-1.5 text-xs bg-(--down) text-white rounded-lg cursor-pointer disabled:opacity-50"
                    >
                      {busy ? "..." : "Yes, Cancel"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
