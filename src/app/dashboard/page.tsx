export const dynamic = "force-dynamic";

import { getLatestRun, getMarketSummary, getScannerResults, getEarningsEvents, getSectorPerformance, getStockScores } from "@/lib/db/queries";
import { getPortfolio, getHoldings } from "@/lib/actions/trading";
import { getPendingOrders } from "@/lib/actions/orders";
import { DashboardClient } from "./dashboard-client";

const SCANNER_LABELS: Record<string, string> = {
  rsi_oversold: "RSI Oversold",
  macd_bullish: "MACD Bullish",
  volume_breakout: "Volume Spike",
  bollinger_oversold: "Bollinger Oversold",
  near_52w_low: "Near Period Low",
  golden_cross: "Golden Cross",
  biggest_losers: "Top Losers",
  biggest_gainers: "Top Gainers",
};

export default async function DashboardPage() {
  // Fetch auth-independent data alongside auth-dependent data
  // Auth failures should NOT block analysis data from loading
  const [portfolioResult, run] = await Promise.all([
    getPortfolio().catch(() => null),
    getLatestRun(),
  ]);
  const portfolio = portfolioResult;

  const [holdings, pendingOrders] = portfolio
    ? await Promise.all([
        getHoldings(portfolio.id).catch(() => []),
        getPendingOrders(portfolio.id).catch(() => []),
      ])
    : [[], []];

  // Fetch analysis data if available
  let marketMood = null;
  let scannerPreviews: { type: string; label: string; count: number; tickers: string[] }[] = [];
  let earningsPreviews: { ticker: string; name: string; eventDate: string; timing: string }[] = [];
  let sectorHeatmap: { sector: string; avgChange: number; stockCount: number; advancers: number; color: string; topStocks: { ticker: string; name: string | null; change1d: number | null; compositeScore: number | null }[] }[] = [];

  if (run) {
    const [summary, scanners, earnings, sectors, allStocks] = await Promise.all([
      getMarketSummary(run.id),
      getScannerResults(run.id),
      getEarningsEvents(run.id),
      getSectorPerformance(run.id),
      getStockScores(run.id),
    ]);

    if (summary) {
      marketMood = {
        breadth: summary.marketBreadth ?? "neutral",
        vix: summary.vix,
        avgChange: summary.avgChange,
      };
    }

    // Group scanners by type
    const scannerMap = new Map<string, string[]>();
    for (const s of scanners) {
      const list = scannerMap.get(s.scannerType) || [];
      list.push(s.ticker);
      scannerMap.set(s.scannerType, list);
    }
    scannerPreviews = [...scannerMap.entries()]
      .map(([type, tickers]) => ({
        type,
        label: SCANNER_LABELS[type] || type,
        count: tickers.length,
        tickers,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // Upcoming earnings (next 5)
    const upcoming = earnings
      .filter((e) => e.type === "upcoming")
      .slice(0, 5);
    earningsPreviews = upcoming.map((e) => ({
      ticker: e.ticker,
      name: e.name ?? "",
      eventDate: e.eventDate ? new Date(e.eventDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "",
      timing: "",
    }));

    // Sector heatmap — top 5 stocks per sector by composite score
    if (sectors.length > 0) {
      const stocksBySector = new Map<string, typeof allStocks>();
      for (const s of allStocks) {
        if (!s.sector) continue;
        const list = stocksBySector.get(s.sector) || [];
        list.push(s);
        stocksBySector.set(s.sector, list);
      }
      sectorHeatmap = sectors
        .filter((s) => s.sector && s.avgChange !== null)
        .map((s) => ({
          sector: s.sector,
          avgChange: s.avgChange ?? 0,
          stockCount: s.stockCount ?? 0,
          advancers: s.advancers ?? 0,
          color: s.color ?? "#6B7280",
          topStocks: (stocksBySector.get(s.sector) || [])
            .sort((a, b) => (b.compositeScore ?? 0) - (a.compositeScore ?? 0))
            .slice(0, 5)
            .map((st) => ({ ticker: st.ticker, name: st.name, change1d: st.change1d, compositeScore: st.compositeScore })),
        }))
        .sort((a, b) => b.avgChange - a.avgChange);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs tracking-[0.15em] uppercase text-(--accent) mb-1">Overview</p>
        <h1 className="text-2xl font-bold text-white font-(family-name:--font-source-serif)">Dashboard</h1>
      </div>
      <DashboardClient
        portfolio={portfolio ? {
          id: portfolio.id,
          startingBalance: Number(portfolio.startingBalance),
          currentCash: Number(portfolio.currentCash),
        } : null}
        holdings={holdings}
        reservedCash={pendingOrders
          .filter((o) => o.orderType === "limit_buy" && o.status === "pending")
          .reduce((sum, o) => sum + o.targetPrice * o.shares, 0)}
        marketMood={marketMood}
        scannerPreviews={scannerPreviews}
        earningsPreviews={earningsPreviews}
        sectorHeatmap={sectorHeatmap}
      />
    </div>
  );
}
