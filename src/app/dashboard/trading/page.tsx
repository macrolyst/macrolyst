export const dynamic = "force-dynamic";

import { getPortfolio, getHoldings, getTradeHistory } from "@/lib/actions/trading";
import { getPendingOrders } from "@/lib/actions/orders";
import { getWatchlist } from "@/lib/actions/watchlist";
import { getLatestRun, getStockScores } from "@/lib/db/queries";
import { PortfolioSetup } from "./portfolio-setup";
import { TradingView } from "./trading-view";

export default async function PaperTradingPage() {
  const portfolio = await getPortfolio();

  if (!portfolio) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-xs tracking-[0.15em] uppercase text-(--accent) mb-1">Trading</p>
          <h1 className="text-2xl font-bold text-white font-(family-name:--font-source-serif)">Paper Trading</h1>
        </div>
        <PortfolioSetup />
      </div>
    );
  }

  const [holdings, tradesList, watchlistItems, orders, run] = await Promise.all([
    getHoldings(portfolio.id),
    getTradeHistory(portfolio.id),
    getWatchlist(),
    getPendingOrders(portfolio.id),
    getLatestRun(),
  ]);

  const topPicks = run ? await getStockScores(run.id, 10) : [];

  return (
    <div className="space-y-6">
      <TradingView
        portfolio={{
          id: portfolio.id,
          startingBalance: Number(portfolio.startingBalance),
          currentCash: Number(portfolio.currentCash),
        }}
        holdings={holdings}
        trades={tradesList}
        pendingOrders={orders}
        watchlistItems={watchlistItems.map((w) => ({ ticker: w.ticker }))}
        topPicks={topPicks.map((s) => ({ ticker: s.ticker, name: s.name ?? "", price: s.price ?? 0, score: s.compositeScore ?? 0, change: s.change1d ?? 0 }))}
      />
    </div>
  );
}
