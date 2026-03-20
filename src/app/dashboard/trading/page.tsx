import { getPortfolio, getHoldings, getTradeHistory } from "@/lib/actions/trading";
import { getWatchlist } from "@/lib/actions/watchlist";
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

  const [holdings, tradesList, watchlistItems] = await Promise.all([
    getHoldings(portfolio.id),
    getTradeHistory(portfolio.id),
    getWatchlist(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs tracking-[0.15em] uppercase text-(--accent) mb-1">Trading</p>
        <h1 className="text-2xl font-bold text-white font-(family-name:--font-source-serif)">Paper Trading</h1>
      </div>
      <TradingView
        portfolio={{
          id: portfolio.id,
          startingBalance: Number(portfolio.startingBalance),
          currentCash: Number(portfolio.currentCash),
        }}
        holdings={holdings}
        trades={tradesList}
        watchlistItems={watchlistItems.map((w) => ({ ticker: w.ticker }))}
      />
    </div>
  );
}
