"use server";

import { db } from "@/lib/db";
import { portfolios, trades } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { auth } from "@/lib/auth/server";
import { getQuote } from "@/lib/finnhub";

async function getUserId(): Promise<string> {
  const session = await auth.getSession();
  const userId = session?.data?.user?.id;
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

export async function getPortfolio() {
  const userId = await getUserId();
  const [portfolio] = await db
    .select()
    .from(portfolios)
    .where(eq(portfolios.userId, userId))
    .limit(1);
  return portfolio ?? null;
}

export async function createPortfolio(startingBalance: number) {
  const userId = await getUserId();

  const existing = await getPortfolio();
  if (existing) throw new Error("Portfolio already exists");

  if (![10000, 50000, 100000].includes(startingBalance)) {
    throw new Error("Invalid starting balance");
  }

  const [portfolio] = await db
    .insert(portfolios)
    .values({
      userId,
      startingBalance: startingBalance.toFixed(2),
      currentCash: startingBalance.toFixed(2),
    })
    .returning();

  return portfolio;
}

export type Holding = {
  ticker: string;
  shares: number;
  avgCost: number;
  totalCost: number;
};

export async function getHoldings(portfolioId: string): Promise<Holding[]> {
  const rows = await db.execute(sql`
    SELECT
      ticker,
      SUM(CASE WHEN action = 'buy' THEN shares ELSE -shares END) AS shares,
      SUM(CASE WHEN action = 'buy' THEN total::numeric ELSE 0 END) /
        NULLIF(SUM(CASE WHEN action = 'buy' THEN shares ELSE 0 END), 0) AS avg_cost,
      SUM(CASE WHEN action = 'buy' THEN total::numeric ELSE 0 END) AS total_cost
    FROM trades
    WHERE portfolio_id = ${portfolioId}
    GROUP BY ticker
    HAVING SUM(CASE WHEN action = 'buy' THEN shares ELSE -shares END) > 0
  `);

  return (rows.rows as Array<{ ticker: string; shares: string; avg_cost: string; total_cost: string }>).map((r) => ({
    ticker: r.ticker,
    shares: Number(r.shares),
    avgCost: Number(r.avg_cost),
    totalCost: Number(r.total_cost),
  }));
}

export async function getTradeHistory(portfolioId: string) {
  const rows = await db
    .select()
    .from(trades)
    .where(eq(trades.portfolioId, portfolioId))
    .orderBy(sql`${trades.executedAt} DESC`)
    .limit(50);

  return rows.map((r) => ({
    id: r.id,
    ticker: r.ticker,
    action: r.action,
    shares: r.shares,
    price: Number(r.price),
    total: Number(r.total),
    executedAt: r.executedAt,
  }));
}

export async function executeTrade(
  portfolioId: string,
  ticker: string,
  action: "buy" | "sell",
  shares: number,
) {
  const userId = await getUserId();

  const [portfolio] = await db
    .select()
    .from(portfolios)
    .where(and(eq(portfolios.id, portfolioId), eq(portfolios.userId, userId)));
  if (!portfolio) throw new Error("Portfolio not found");

  if (shares <= 0 || !Number.isInteger(shares)) throw new Error("Invalid shares");

  const quote = await getQuote(ticker.toUpperCase());
  if (!quote || quote.price <= 0) throw new Error("Could not fetch price for " + ticker);

  const slippage = 0.0001 + Math.random() * 0.0004;
  const executedPrice = action === "buy"
    ? quote.price * (1 + slippage)
    : quote.price * (1 - slippage);
  const roundedPrice = Math.round(executedPrice * 100) / 100;
  const total = Math.round(roundedPrice * shares * 100) / 100;

  const currentCash = Number(portfolio.currentCash);

  if (action === "buy") {
    if (total > currentCash) throw new Error("Insufficient cash");
  } else {
    const holdings = await getHoldings(portfolioId);
    const holding = holdings.find((h) => h.ticker === ticker.toUpperCase());
    if (!holding || holding.shares < shares) throw new Error("Insufficient shares");
  }

  const newCash = action === "buy" ? currentCash - total : currentCash + total;

  await db.insert(trades).values({
    portfolioId,
    ticker: ticker.toUpperCase(),
    action,
    shares,
    price: roundedPrice.toFixed(2),
    total: total.toFixed(2),
  });

  await db
    .update(portfolios)
    .set({ currentCash: newCash.toFixed(2) })
    .where(eq(portfolios.id, portfolioId));

  return {
    ticker: ticker.toUpperCase(),
    action,
    shares,
    price: roundedPrice,
    total,
    newCash,
  };
}

export async function resetPortfolio(portfolioId: string) {
  const userId = await getUserId();

  const [portfolio] = await db
    .select()
    .from(portfolios)
    .where(and(eq(portfolios.id, portfolioId), eq(portfolios.userId, userId)));
  if (!portfolio) throw new Error("Portfolio not found");

  // Delete all trades
  await db.delete(trades).where(eq(trades.portfolioId, portfolioId));

  // Reset cash to starting balance
  await db
    .update(portfolios)
    .set({ currentCash: portfolio.startingBalance })
    .where(eq(portfolios.id, portfolioId));
}
