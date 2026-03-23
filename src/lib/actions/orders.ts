"use server";

import { db } from "@/lib/db";
import { pendingOrders, portfolios, trades } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { auth } from "@/lib/auth/server";
import { getHoldings } from "./trading";

async function getUserId(): Promise<string> {
  const session = await auth.getSession();
  const userId = session?.data?.user?.id;
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

export type PendingOrder = {
  id: string;
  ticker: string;
  orderType: string;
  targetPrice: number;
  shares: number;
  status: string;
  createdAt: Date | null;
};

export async function getPendingOrders(portfolioId: string): Promise<PendingOrder[]> {
  const userId = await getUserId();

  // Verify ownership
  const [portfolio] = await db
    .select()
    .from(portfolios)
    .where(and(eq(portfolios.id, portfolioId), eq(portfolios.userId, userId)));
  if (!portfolio) throw new Error("Portfolio not found");

  const rows = await db
    .select()
    .from(pendingOrders)
    .where(and(eq(pendingOrders.portfolioId, portfolioId), eq(pendingOrders.status, "pending")))
    .orderBy(sql`${pendingOrders.createdAt} DESC`);

  return rows.map((r) => ({
    id: r.id,
    ticker: r.ticker,
    orderType: r.orderType,
    targetPrice: Number(r.targetPrice),
    shares: r.shares,
    status: r.status ?? "pending",
    createdAt: r.createdAt,
  }));
}

export async function createOrder(
  portfolioId: string,
  ticker: string,
  orderType: "limit_buy" | "limit_sell" | "stop_loss",
  targetPrice: number,
  shares: number,
): Promise<PendingOrder> {
  const userId = await getUserId();

  const [portfolio] = await db
    .select()
    .from(portfolios)
    .where(and(eq(portfolios.id, portfolioId), eq(portfolios.userId, userId)));
  if (!portfolio) throw new Error("Portfolio not found");

  if (shares <= 0 || !Number.isInteger(shares)) throw new Error("Invalid shares");
  if (targetPrice <= 0) throw new Error("Invalid target price");

  // Validate based on order type
  const currentCash = Number(portfolio.currentCash);
  if (orderType === "limit_buy") {
    const estimatedTotal = targetPrice * shares;
    if (estimatedTotal > currentCash) throw new Error("Insufficient cash for this order");
  } else if (orderType === "limit_sell" || orderType === "stop_loss") {
    const holdings = await getHoldings(portfolioId);
    const holding = holdings.find((h) => h.ticker === ticker.toUpperCase());
    if (!holding || holding.shares < shares) throw new Error("Insufficient shares for this order");
  }

  const [order] = await db
    .insert(pendingOrders)
    .values({
      portfolioId,
      ticker: ticker.toUpperCase(),
      orderType,
      targetPrice: targetPrice.toFixed(2),
      shares,
      status: "pending",
    })
    .returning();

  // Reserve cash for limit buy orders
  if (orderType === "limit_buy") {
    const reserved = targetPrice * shares;
    await db
      .update(portfolios)
      .set({ currentCash: (currentCash - reserved).toFixed(2) })
      .where(eq(portfolios.id, portfolioId));
  }

  return {
    id: order.id,
    ticker: order.ticker,
    orderType: order.orderType,
    targetPrice: Number(order.targetPrice),
    shares: order.shares,
    status: order.status ?? "pending",
    createdAt: order.createdAt,
  };
}

export async function cancelOrder(orderId: string) {
  const userId = await getUserId();

  const [order] = await db
    .select()
    .from(pendingOrders)
    .where(eq(pendingOrders.id, orderId));
  if (!order) throw new Error("Order not found");

  // Verify ownership through portfolio
  const [portfolio] = await db
    .select()
    .from(portfolios)
    .where(and(eq(portfolios.id, order.portfolioId), eq(portfolios.userId, userId)));
  if (!portfolio) throw new Error("Not authorized");

  // Return reserved cash for limit buy orders
  if (order.orderType === "limit_buy") {
    const reserved = Number(order.targetPrice) * order.shares;
    const currentCash = Number(portfolio.currentCash);
    await db
      .update(portfolios)
      .set({ currentCash: (currentCash + reserved).toFixed(2) })
      .where(eq(portfolios.id, order.portfolioId));
  }

  await db
    .delete(pendingOrders)
    .where(eq(pendingOrders.id, orderId));
}

export async function updateOrder(orderId: string, newTargetPrice: number, newShares: number) {
  const userId = await getUserId();

  if (newTargetPrice <= 0) throw new Error("Invalid target price");
  if (newShares <= 0 || !Number.isInteger(newShares)) throw new Error("Invalid shares");

  const [order] = await db
    .select()
    .from(pendingOrders)
    .where(and(eq(pendingOrders.id, orderId), eq(pendingOrders.status, "pending")));
  if (!order) throw new Error("Order not found");

  const [portfolio] = await db
    .select()
    .from(portfolios)
    .where(and(eq(portfolios.id, order.portfolioId), eq(portfolios.userId, userId)));
  if (!portfolio) throw new Error("Not authorized");

  // For limit buys, adjust reserved cash
  if (order.orderType === "limit_buy") {
    const oldReserved = Number(order.targetPrice) * order.shares;
    const newReserved = newTargetPrice * newShares;
    const currentCash = Number(portfolio.currentCash);
    const availableCash = currentCash + oldReserved;

    if (newReserved > availableCash) throw new Error("Insufficient cash for updated order");

    await db
      .update(portfolios)
      .set({ currentCash: (availableCash - newReserved).toFixed(2) })
      .where(eq(portfolios.id, order.portfolioId));
  }

  await db
    .update(pendingOrders)
    .set({
      targetPrice: newTargetPrice.toFixed(2),
      shares: newShares,
    })
    .where(eq(pendingOrders.id, orderId));
}

export async function fillOrder(orderId: string, executedPrice: number) {
  const [order] = await db
    .select()
    .from(pendingOrders)
    .where(and(eq(pendingOrders.id, orderId), eq(pendingOrders.status, "pending")));
  if (!order) return;

  const [portfolio] = await db
    .select()
    .from(portfolios)
    .where(eq(portfolios.id, order.portfolioId));
  if (!portfolio) return;

  const slippage = 0.0001 + Math.random() * 0.0004;
  const action = order.orderType === "limit_buy" ? "buy" : "sell";
  const finalPrice = action === "buy"
    ? executedPrice * (1 + slippage)
    : executedPrice * (1 - slippage);
  const roundedPrice = Math.round(finalPrice * 100) / 100;
  const total = Math.round(roundedPrice * order.shares * 100) / 100;

  const currentCash = Number(portfolio.currentCash);

  // Final validation
  if (action === "buy") {
    // Cash was already reserved for limit buys — add back reserved, check against actual
    const reserved = Number(order.targetPrice) * order.shares;
    const availableCash = currentCash + reserved;
    if (total > availableCash) return;
  }
  if (action === "sell") {
    const holdingsRows = await db.execute(sql`
      SELECT SUM(CASE WHEN action = 'buy' THEN shares ELSE -shares END) AS shares
      FROM trades WHERE portfolio_id = ${order.portfolioId} AND ticker = ${order.ticker}
    `);
    const held = Number((holdingsRows.rows[0] as { shares: string })?.shares ?? 0);
    if (held < order.shares) return;
  }

  // For limit buys: cash was reserved at targetPrice, actual execution may differ slightly
  // newCash = currentCash + reserved - actual_total
  const newCash = action === "buy"
    ? currentCash + (Number(order.targetPrice) * order.shares) - total
    : currentCash + total;

  // Execute trade
  await db.insert(trades).values({
    portfolioId: order.portfolioId,
    ticker: order.ticker,
    action,
    shares: order.shares,
    price: roundedPrice.toFixed(2),
    total: total.toFixed(2),
  });

  await db
    .update(portfolios)
    .set({ currentCash: newCash.toFixed(2) })
    .where(eq(portfolios.id, order.portfolioId));

  // Delete the filled order — the trade record is the proof of execution
  await db
    .delete(pendingOrders)
    .where(eq(pendingOrders.id, orderId));
}
