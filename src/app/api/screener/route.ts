import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stockScores, analysisRuns } from "@/lib/db/schema";
import { eq, and, gte, lte, gt, lt, desc, sql } from "drizzle-orm";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const NUM_COLS: Record<string, any> = {
  rsi: stockScores.rsi,
  macdHist: stockScores.macdHist,
  volRatio: stockScores.volRatio,
  peRatio: stockScores.peRatio,
  marketCap: stockScores.marketCap,
  change1d: stockScores.change1d,
  change5d: stockScores.change5d,
  change20d: stockScores.change20d,
  compositeScore: stockScores.compositeScore,
  annualVolatility: stockScores.annualVolatility,
  sharpeRatio: stockScores.sharpeRatio,
  maxDrawdownPct: stockScores.maxDrawdownPct,
  scoreAnalyst: stockScores.scoreAnalyst,
  scoreTechnical: stockScores.scoreTechnical,
  scoreMomentum: stockScores.scoreMomentum,
  scoreVolume: stockScores.scoreVolume,
  upsidePct: stockScores.upsidePct,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TEXT_COLS: Record<string, any> = {
  sector: stockScores.sector,
  recommendation: stockScores.recommendation,
};

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  // Get latest run
  const [latestRun] = await db.select().from(analysisRuns).orderBy(desc(analysisRuns.id)).limit(1);
  if (!latestRun) return NextResponse.json([]);

  // Build where conditions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conditions: any[] = [eq(stockScores.runId, latestRun.id)];

  for (const [key, value] of params.entries()) {
    // Parse: key format is "field_op" e.g. "rsi_lt", "sector_eq", "change5d_gte"
    const lastUnderscore = key.lastIndexOf("_");
    if (lastUnderscore === -1) continue;
    const field = key.substring(0, lastUnderscore);
    const op = key.substring(lastUnderscore + 1);

    // Numeric filters
    if (NUM_COLS[field]) {
      const col = NUM_COLS[field];
      const num = parseFloat(value);
      if (isNaN(num)) continue;
      if (op === "lt") conditions.push(lt(col, String(num)));
      else if (op === "gt") conditions.push(gt(col, String(num)));
      else if (op === "lte") conditions.push(lte(col, String(num)));
      else if (op === "gte") conditions.push(gte(col, String(num)));
      else if (op === "eq") conditions.push(eq(col, String(num)));
    }

    // Text filters
    if (TEXT_COLS[field] && op === "eq") {
      conditions.push(eq(TEXT_COLS[field], value));
    }
  }

  // Sort
  const sortBy = params.get("sort") || "compositeScore";
  const sortDir = params.get("dir") || "desc";
  const sortCol = NUM_COLS[sortBy] || TEXT_COLS[sortBy] || stockScores.compositeScore;
  const orderFn = sortDir === "asc" ? sql`${sortCol} ASC NULLS LAST` : sql`${sortCol} DESC NULLS LAST`;

  const rows = await db
    .select()
    .from(stockScores)
    .where(and(...conditions))
    .orderBy(orderFn)
    .limit(100);

  const num = (v: string | number | null | undefined) => {
    if (v === null || v === undefined) return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
  };

  return NextResponse.json({
    count: rows.length,
    total: 503,
    stocks: rows.map((r) => ({
      rank: r.rank,
      ticker: r.ticker,
      name: r.name,
      sector: r.sector,
      price: num(r.price),
      change1d: num(r.change1d),
      change5d: num(r.change5d),
      change20d: num(r.change20d),
      rsi: num(r.rsi),
      macdHist: num(r.macdHist),
      volRatio: num(r.volRatio),
      peRatio: num(r.peRatio),
      marketCap: num(r.marketCap),
      compositeScore: num(r.compositeScore),
      recommendation: r.recommendation,
      annualVolatility: num(r.annualVolatility),
      sharpeRatio: num(r.sharpeRatio),
      maxDrawdownPct: num(r.maxDrawdownPct),
      upsidePct: num(r.upsidePct),
    })),
  });
}
