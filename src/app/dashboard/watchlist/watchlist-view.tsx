"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addToWatchlist, removeFromWatchlist } from "@/lib/actions/watchlist";
import { formatCurrency } from "@/lib/format";
import { ChangeBadge } from "@/components/ui/change-badge";
import { TickerSearch } from "../trading/ticker-search";
import { useLivePrices } from "../trading/use-live-prices";
import Link from "next/link";

type WatchlistItem = { ticker: string; addedAt: Date | null };

export function WatchlistView({ items }: { items: WatchlistItem[] }) {
  const router = useRouter();
  const [removing, setRemoving] = useState<string | null>(null);

  const tickers = items.map((i) => i.ticker);
  const { prices, marketOpen } = useLivePrices(tickers);

  async function handleAdd(symbol: string) {
    await addToWatchlist(symbol);
    router.refresh();
  }

  async function handleRemove(ticker: string) {
    setRemoving(ticker);
    await removeFromWatchlist(ticker);
    router.refresh();
    setRemoving(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${marketOpen ? "bg-(--up) pulse-dot" : "bg-(--text-secondary)/40"}`} />
        <span className="text-xs text-(--text-secondary)">{marketOpen ? "Market Open" : "Market Closed"}</span>
      </div>

      <div className="card-glow p-5">
        <p className="text-xs text-(--text-secondary) uppercase tracking-wider mb-3">Add to Watchlist</p>
        <TickerSearch onSelect={(symbol) => handleAdd(symbol)} placeholder="Search ticker to add..." />
      </div>

      <div className="card-glow p-5">
        <p className="text-xs text-(--text-secondary) uppercase tracking-wider mb-4">
          Your Watchlist ({items.length})
        </p>

        {items.length === 0 ? (
          <p className="text-sm text-(--text-secondary) py-8 text-center">
            Your watchlist is empty. Search for a stock above to add it.
          </p>
        ) : (
          <div className="divide-y divide-(--border)">
            {items.map((item) => {
              const quote = prices.get(item.ticker);
              return (
                <div key={item.ticker} className="flex items-center justify-between py-3 px-1">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-white">{item.ticker}</span>
                    {quote && (
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${marketOpen ? "bg-(--up) pulse-dot" : "bg-(--text-secondary)/40"}`} />
                        <span className="text-sm text-white font-mono">{formatCurrency(quote.price)}</span>
                        <ChangeBadge value={quote.changePercent} className="text-xs" />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/dashboard/trading?buy=${item.ticker}`}
                      className="text-xs text-(--accent) hover:underline"
                    >
                      Buy
                    </Link>
                    <button
                      onClick={() => handleRemove(item.ticker)}
                      disabled={removing === item.ticker}
                      className="text-xs text-(--down) hover:underline cursor-pointer disabled:opacity-50"
                    >
                      {removing === item.ticker ? "..." : "Remove"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
