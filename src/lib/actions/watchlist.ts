"use server";

import { db } from "@/lib/db";
import { watchlist } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth/server";

async function getUserId(): Promise<string> {
  const session = await auth.getSession();
  const userId = session?.data?.user?.id;
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

export async function getWatchlist() {
  const userId = await getUserId();
  const rows = await db
    .select()
    .from(watchlist)
    .where(eq(watchlist.userId, userId))
    .orderBy(watchlist.addedAt);
  return rows.map((r) => ({ ticker: r.ticker, addedAt: r.addedAt }));
}

export async function addToWatchlist(ticker: string) {
  const userId = await getUserId();
  try {
    await db.insert(watchlist).values({
      userId,
      ticker: ticker.toUpperCase(),
    });
  } catch {
    // Unique constraint violation = already in watchlist
  }
}

export async function removeFromWatchlist(ticker: string) {
  const userId = await getUserId();
  await db
    .delete(watchlist)
    .where(and(eq(watchlist.userId, userId), eq(watchlist.ticker, ticker.toUpperCase())));
}
