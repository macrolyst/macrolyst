"use client";

import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/format";
import { ChangeBadge } from "@/components/ui/change-badge";
import { StockChart } from "../trading/stock-chart";
import { useLivePrices } from "../trading/use-live-prices";
import Link from "next/link";

type CompanyNews = {
  id: number;
  headline: string;
  source: string;
  url: string;
  summary: string;
  image: string;
  datetime: number;
};

function timeAgo(timestamp: number): string {
  const diff = Date.now() / 1000 - timestamp;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function StockDetailModal({
  symbol,
  onClose,
  onBuy,
}: {
  symbol: string;
  onClose: () => void;
  onBuy?: (symbol: string) => void;
}) {
  const [news, setNews] = useState<CompanyNews[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [tab, setTab] = useState<"chart" | "news">("chart");

  const { prices, marketOpen } = useLivePrices([symbol]);
  const quote = prices.get(symbol);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/news/company?symbol=${symbol}`)
      .then((r) => r.json())
      .then((data) => { if (!cancelled) setNews(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setNewsLoading(false); });
    return () => { cancelled = true; };
  }, [symbol]);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] flex flex-col rounded-t-2xl bg-(--surface-1) border-t border-(--border) lg:inset-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-2xl lg:w-[480px] lg:max-h-[80vh]">
        {/* Handle bar (mobile) */}
        <div className="flex justify-center py-2 lg:hidden">
          <div className="w-10 h-1 rounded-full bg-(--text-secondary)/20" />
        </div>

        {/* Header */}
        <div className="px-5 pt-2 pb-4 border-b border-(--border)">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-lg font-bold text-white">{symbol}</p>
              {quote && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xl font-bold text-white font-(family-name:--font-source-serif)">{formatCurrency(quote.price)}</span>
                  <ChangeBadge value={quote.changePercent} className="text-sm" />
                  <span className={`w-1.5 h-1.5 rounded-full ${marketOpen ? "bg-(--up) pulse-dot" : "bg-(--text-secondary)/40"}`} />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {onBuy ? (
                <button
                  onClick={() => { onBuy(symbol); onClose(); }}
                  className="text-xs text-(--accent) font-semibold px-3 py-1.5 rounded-lg border border-(--accent)/30 hover:bg-(--accent)/10 cursor-pointer"
                >
                  Buy
                </button>
              ) : (
                <Link
                  href={`/dashboard/trading?buy=${symbol}`}
                  className="text-xs text-(--accent) font-semibold px-3 py-1.5 rounded-lg border border-(--accent)/30 hover:bg-(--accent)/10"
                >
                  Buy
                </Link>
              )}
              <button onClick={onClose} className="text-(--text-secondary) hover:text-white cursor-pointer p-1">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <line x1="4" y1="4" x2="14" y2="14" />
                  <line x1="14" y1="4" x2="4" y2="14" />
                </svg>
              </button>
            </div>
          </div>

          {/* Quote details */}
          {quote && (
            <div className="grid grid-cols-4 gap-3 mt-4 pt-3 border-t border-(--border)">
              <div>
                <p className="text-[10px] text-(--text-secondary)">Open</p>
                <p className="text-xs font-mono text-white">{formatCurrency(quote.open)}</p>
              </div>
              <div>
                <p className="text-[10px] text-(--text-secondary)">High</p>
                <p className="text-xs font-mono text-white">{formatCurrency(quote.high)}</p>
              </div>
              <div>
                <p className="text-[10px] text-(--text-secondary)">Low</p>
                <p className="text-xs font-mono text-white">{formatCurrency(quote.low)}</p>
              </div>
              <div>
                <p className="text-[10px] text-(--text-secondary)">Prev Close</p>
                <p className="text-xs font-mono text-white">{formatCurrency(quote.previousClose)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex justify-center gap-1 px-5 py-2 border-b border-(--border)">
          <button
            onClick={() => setTab("chart")}
            className={`px-4 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors ${
              tab === "chart" ? "bg-(--accent)/15 text-(--accent)" : "text-(--text-secondary)"
            }`}
          >
            Chart
          </button>
          <button
            onClick={() => setTab("news")}
            className={`px-4 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors ${
              tab === "news" ? "bg-(--accent)/15 text-(--accent)" : "text-(--text-secondary)"
            }`}
          >
            News {news.length > 0 ? `(${news.length})` : ""}
          </button>
        </div>

        {/* Content — scrollable */}
        <div className="flex-1 overflow-y-auto">
        {/* Chart tab */}
        {tab === "chart" && (
          <div className="px-5 py-4">
            <StockChart symbol={symbol} />
          </div>
        )}

        {/* News tab */}
        {tab === "news" && (
          <div className="px-5 py-4">
            {newsLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-5 h-5 border-2 border-(--accent)/30 border-t-(--accent) rounded-full animate-spin" />
              </div>
            ) : news.length === 0 ? (
              <p className="text-sm text-(--text-secondary) text-center py-10">No recent news for {symbol}</p>
            ) : (
              <div className="space-y-3">
                {news.map((n) => (
                  <a
                    key={n.id}
                    href={n.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block group"
                  >
                    <div className="flex gap-3">
                      {n.image && (
                        <div className="shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-(--surface-2)">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={n.image}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white group-hover:text-(--accent) transition-colors line-clamp-2">{n.headline}</p>
                        {n.summary && (
                          <p className="text-[10px] text-(--text-secondary) mt-0.5 line-clamp-1">{n.summary}</p>
                        )}
                        <div className="flex gap-2 mt-1">
                          <span className="text-[10px] text-(--accent)/70">{n.source}</span>
                          <span className="text-[10px] text-(--text-secondary)/50">{timeAgo(n.datetime)}</span>
                        </div>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    </>
  );
}
