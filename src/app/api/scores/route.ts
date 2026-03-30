import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stockScores } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";

function num(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

export async function GET(request: NextRequest) {
  const runId = request.nextUrl.searchParams.get("runId");
  const tickers = request.nextUrl.searchParams.get("tickers");
  const ticker = request.nextUrl.searchParams.get("ticker");

  if (!runId) return NextResponse.json(null);

  const tickerList = tickers
    ? tickers.split(",").map((t) => t.trim().toUpperCase())
    : ticker
    ? [ticker.toUpperCase()]
    : [];

  if (tickerList.length === 0) return NextResponse.json(null);

  const rows = await db
    .select()
    .from(stockScores)
    .where(and(eq(stockScores.runId, parseInt(runId)), inArray(stockScores.ticker, tickerList)));

  const result: Record<string, object> = {};
  for (const row of rows) {
    result[row.ticker] = {
      compositeScore: num(row.compositeScore),
      scoreAnalyst: num(row.scoreAnalyst),
      scoreTechnical: num(row.scoreTechnical),
      scoreMomentum: num(row.scoreMomentum),
      scoreVolume: num(row.scoreVolume),
      scoreNews: num(row.scoreNews),
      rsi: num(row.rsi),
      macdHist: num(row.macdHist),
      sma50: num(row.sma50),
      volRatio: num(row.volRatio),
      bbUpper: num(row.bbUpper),
      bbLower: num(row.bbLower),
      targetMean: num(row.targetMean),
      peRatio: num(row.peRatio),
      marketCap: num(row.marketCap),
      annualVolatility: num(row.annualVolatility),
      sharpeRatio: num(row.sharpeRatio),
      maxDrawdownPct: num(row.maxDrawdownPct),
      return1y: num(row.return1y),
      yearHigh: num(row.yearHigh),
      yearLow: num(row.yearLow),
      change5d: num(row.change5d),
      change20d: num(row.change20d),
      price: num(row.price),
      sector: row.sector,
      sectorRank: row.sectorRank,
      sectorCount: row.sectorCount,
      sectorPeAvg: num(row.sectorPeAvg),
      scoreMeanReversion: num(row.scoreMeanReversion),
      scoreRelativeStrength: num(row.scoreRelativeStrength),
      scoreSectorRotation: num(row.scoreSectorRotation),
      scoreRiskQuality: num(row.scoreRiskQuality),
      scoreEarningsEdge: num(row.scoreEarningsEdge),
      reasons: row.reasons,
      recommendation: row.recommendation,
    };
  }

  return NextResponse.json(result);
}
