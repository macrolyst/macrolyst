import { getLatestRun, getMarketSummary, getScannerResults, getEarningsEvents } from "@/lib/db/queries";
import { getPortfolio, getHoldings } from "@/lib/actions/trading";
import { getPendingOrders } from "@/lib/actions/orders";
import { DashboardClient } from "./dashboard-client";

const SCANNER_LABELS: Record<string, string> = {
  rsi_oversold: "RSI Oversold",
  macd_bullish: "MACD Bullish",
  volume_breakout: "Volume Breakout",
  bollinger_oversold: "Bollinger Oversold",
  near_52w_low: "52W Low",
  golden_cross: "Golden Cross",
};

export default async function DashboardPage() {
  const [portfolio, run] = await Promise.all([
    getPortfolio(),
    getLatestRun(),
  ]);

  const [holdings, pendingOrders] = portfolio
    ? await Promise.all([getHoldings(portfolio.id), getPendingOrders(portfolio.id)])
    : [[], []];

  // Fetch analysis data if available
  let marketMood = null;
  let scannerPreviews: { type: string; label: string; count: number; tickers: string[] }[] = [];
  let earningsPreviews: { ticker: string; name: string; eventDate: string; timing: string }[] = [];

  if (run) {
    const [summary, scanners, earnings] = await Promise.all([
      getMarketSummary(run.id),
      getScannerResults(run.id),
      getEarningsEvents(run.id),
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
      />
    </div>
  );
}
