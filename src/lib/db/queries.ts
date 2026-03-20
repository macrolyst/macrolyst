import { db } from "@/lib/db";
import { desc, eq, asc, inArray } from "drizzle-orm";
import {
  analysisRuns,
  marketSummary,
  sectorPerformance,
  stockScores,
  scannerResults,
  newsArticles,
  earningsEvents,
  catalystTimeline,
  catalystHours,
  catalystNews,
  backtestResults,
} from "@/lib/db/schema";

// Parse Drizzle decimal string to number
function num(v: string | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

// ----- Latest Run -----

export type AnalysisRun = {
  id: number;
  runDate: string;
  generatedAt: Date | null;
  marketDate: string | null;
  dataStatus: Record<string, boolean> | null;
  status: string | null;
};

export async function getLatestRun(): Promise<AnalysisRun | null> {
  const [run] = await db
    .select()
    .from(analysisRuns)
    .orderBy(desc(analysisRuns.id))
    .limit(1);
  if (!run) return null;
  return {
    ...run,
    dataStatus: run.dataStatus as Record<string, boolean> | null,
  };
}

// ----- Market Summary -----

export type MarketSummaryData = {
  marketBreadth: string | null;
  avgChange: number | null;
  advancers: number | null;
  decliners: number | null;
  breadthRatio: number | null;
  vix: number | null;
  treasury10y: number | null;
  treasury2y: number | null;
  fedFunds: number | null;
};

export async function getMarketSummary(runId: number): Promise<MarketSummaryData | null> {
  const [row] = await db
    .select()
    .from(marketSummary)
    .where(eq(marketSummary.runId, runId));
  if (!row) return null;
  return {
    marketBreadth: row.marketBreadth,
    avgChange: num(row.avgChange),
    advancers: row.advancers,
    decliners: row.decliners,
    breadthRatio: num(row.breadthRatio),
    vix: num(row.vix),
    treasury10y: num(row.treasury10y),
    treasury2y: num(row.treasury2y),
    fedFunds: num(row.fedFunds),
  };
}

// ----- Sector Performance -----

export type SectorData = {
  sector: string;
  avgChange: number | null;
  stockCount: number | null;
  advancers: number | null;
  color: string | null;
};

export async function getSectorPerformance(runId: number): Promise<SectorData[]> {
  const rows = await db
    .select()
    .from(sectorPerformance)
    .where(eq(sectorPerformance.runId, runId));
  return rows.map((r) => ({
    sector: r.sector,
    avgChange: num(r.avgChange),
    stockCount: r.stockCount,
    advancers: r.advancers,
    color: r.color,
  }));
}

// ----- Stock Scores -----

export type StockScore = {
  rank: number | null;
  ticker: string;
  name: string | null;
  sector: string | null;
  price: number | null;
  change1d: number | null;
  change5d: number | null;
  change20d: number | null;
  targetMean: number | null;
  upsidePct: number | null;
  compositeScore: number | null;
  scoreAnalyst: number | null;
  scoreTechnical: number | null;
  scoreMomentum: number | null;
  scoreVolume: number | null;
  scoreNews: number | null;
  rsi: number | null;
  macdHist: number | null;
  sma50: number | null;
  sma200: number | null;
  volRatio: number | null;
  bbUpper: number | null;
  bbLower: number | null;
  peRatio: number | null;
  marketCap: number | null;
  recommendation: string | null;
  sectorRank: number | null;
  sectorCount: number | null;
  sectorRelativeScore: number | null;
  sectorPeAvg: number | null;
  annualVolatility: number | null;
  sharpeRatio: number | null;
  maxDrawdownPct: number | null;
  return1y: number | null;
  yearHigh: number | null;
  yearLow: number | null;
  reasons: string[] | null;
};

export async function getStockScores(runId: number, limit?: number): Promise<StockScore[]> {
  const query = db
    .select()
    .from(stockScores)
    .where(eq(stockScores.runId, runId))
    .orderBy(asc(stockScores.rank));

  const rows = limit ? await query.limit(limit) : await query;

  return rows.map((r) => ({
    rank: r.rank,
    ticker: r.ticker,
    name: r.name,
    sector: r.sector,
    price: num(r.price),
    change1d: num(r.change1d),
    change5d: num(r.change5d),
    change20d: num(r.change20d),
    targetMean: num(r.targetMean),
    upsidePct: num(r.upsidePct),
    compositeScore: num(r.compositeScore),
    scoreAnalyst: num(r.scoreAnalyst),
    scoreTechnical: num(r.scoreTechnical),
    scoreMomentum: num(r.scoreMomentum),
    scoreVolume: num(r.scoreVolume),
    scoreNews: num(r.scoreNews),
    rsi: num(r.rsi),
    macdHist: num(r.macdHist),
    sma50: num(r.sma50),
    sma200: num(r.sma200),
    volRatio: num(r.volRatio),
    bbUpper: num(r.bbUpper),
    bbLower: num(r.bbLower),
    peRatio: num(r.peRatio),
    marketCap: r.marketCap,
    recommendation: r.recommendation,
    sectorRank: r.sectorRank,
    sectorCount: r.sectorCount,
    sectorRelativeScore: num(r.sectorRelativeScore),
    sectorPeAvg: num(r.sectorPeAvg),
    annualVolatility: num(r.annualVolatility),
    sharpeRatio: num(r.sharpeRatio),
    maxDrawdownPct: num(r.maxDrawdownPct),
    return1y: num(r.return1y),
    yearHigh: num(r.yearHigh),
    yearLow: num(r.yearLow),
    reasons: r.reasons as string[] | null,
  }));
}

// ----- Scanner Results -----

export type ScannerResult = {
  scannerType: string;
  ticker: string;
  name: string | null;
  sector: string | null;
  price: number | null;
  change1d: number | null;
  rsi: number | null;
  compositeScore: number | null;
};

export async function getScannerResults(runId: number): Promise<ScannerResult[]> {
  const [scannerRows, scoreRows] = await Promise.all([
    db.select().from(scannerResults).where(eq(scannerResults.runId, runId)),
    db.select().from(stockScores).where(eq(stockScores.runId, runId)),
  ]);

  const scoreMap = new Map<string, typeof scoreRows[number]>();
  for (const s of scoreRows) {
    scoreMap.set(s.ticker, s);
  }

  return scannerRows.map((r) => {
    const s = scoreMap.get(r.ticker);
    return {
      scannerType: r.scannerType,
      ticker: r.ticker,
      name: r.name,
      sector: s?.sector ?? null,
      price: s ? num(s.price) : null,
      change1d: s ? num(s.change1d) : null,
      rsi: s ? num(s.rsi) : null,
      compositeScore: s ? num(s.compositeScore) : null,
    };
  });
}

// ----- News Articles -----

export type NewsArticle = {
  type: string;
  ticker: string | null;
  headline: string | null;
  source: string | null;
  url: string | null;
  summary: string | null;
  sentiment: number | null;
  published: Date | null;
};

export async function getNewsArticles(runId: number): Promise<NewsArticle[]> {
  const rows = await db
    .select()
    .from(newsArticles)
    .where(eq(newsArticles.runId, runId));
  return rows.map((r) => ({
    type: r.type,
    ticker: r.ticker,
    headline: r.headline,
    source: r.source,
    url: r.url,
    summary: r.summary,
    sentiment: num(r.sentiment),
    published: r.published,
  }));
}

// ----- Earnings -----

export type EarningsEvent = {
  type: string;
  ticker: string;
  name: string | null;
  eventDate: string | null;
  hour: string | null;
  estimateEps: number | null;
  actualEps: number | null;
  surprisePct: number | null;
  revenueEstimate: number | null;
  actualRevenue: number | null;
};

export async function getEarningsEvents(runId: number): Promise<EarningsEvent[]> {
  const rows = await db
    .select()
    .from(earningsEvents)
    .where(eq(earningsEvents.runId, runId));
  return rows.map((r) => ({
    type: r.type,
    ticker: r.ticker,
    name: r.name,
    eventDate: r.eventDate,
    hour: r.hour,
    estimateEps: num(r.estimateEps),
    actualEps: num(r.actualEps),
    surprisePct: num(r.surprisePct),
    revenueEstimate: r.revenueEstimate,
    actualRevenue: r.actualRevenue,
  }));
}

// ----- Catalyst Timeline -----

export type CatalystTimelineData = {
  date: string;
  narrative: string | null;
  dayChangePct: number | null;
  open: number | null;
  close: number | null;
  high: number | null;
  low: number | null;
  highTime: string | null;
  lowTime: string | null;
  hours: CatalystHourData[];
};

export type CatalystHourData = {
  time: string;
  open: number | null;
  close: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
  changeFromOpen: number | null;
  hourlyChange: number | null;
  significant: boolean;
  news: CatalystNewsItem[];
};

export type CatalystNewsItem = {
  headline: string | null;
  source: string | null;
  url: string | null;
  time: string | null;
};

export async function getCatalystData(runId: number): Promise<CatalystTimelineData | null> {
  const [timeline] = await db
    .select()
    .from(catalystTimeline)
    .where(eq(catalystTimeline.runId, runId));
  if (!timeline) return null;

  const hours = await db
    .select()
    .from(catalystHours)
    .where(eq(catalystHours.timelineId, timeline.id));

  const hourIds = hours.map((h) => h.id);
  let allNews: (typeof catalystNews.$inferSelect)[] = [];
  if (hourIds.length > 0) {
    allNews = await db
      .select()
      .from(catalystNews)
      .where(inArray(catalystNews.hourId, hourIds));
  }

  const newsByHour = new Map<number, CatalystNewsItem[]>();
  for (const n of allNews) {
    const items = newsByHour.get(n.hourId) || [];
    items.push({
      headline: n.headline,
      source: n.source,
      url: n.url,
      time: n.time,
    });
    newsByHour.set(n.hourId, items);
  }

  return {
    date: timeline.date,
    narrative: timeline.narrative,
    dayChangePct: num(timeline.dayChangePct),
    open: num(timeline.open),
    close: num(timeline.close),
    high: num(timeline.high),
    low: num(timeline.low),
    highTime: timeline.highTime,
    lowTime: timeline.lowTime,
    hours: hours.map((h) => ({
      time: h.time,
      open: num(h.open),
      close: num(h.close),
      high: num(h.high),
      low: num(h.low),
      volume: h.volume,
      changeFromOpen: num(h.changeFromOpen),
      hourlyChange: num(h.hourlyChange),
      significant: h.significant ?? false,
      news: newsByHour.get(h.id) || [],
    })),
  };
}

// ----- Backtest -----

export type BacktestData = {
  simStartDate: string | null;
  simEndDate: string | null;
  lookbackDays: number | null;
  portfolioReturn: number | null;
  benchmarkReturn: number | null;
  outperformance: number | null;
  picks: BacktestPick[] | null;
};

export type BacktestPick = {
  ticker: string;
  name?: string;
  return_pct?: number;
  start_price?: number;
  end_price?: number;
};

export async function getBacktestData(runId: number): Promise<BacktestData | null> {
  const [row] = await db
    .select()
    .from(backtestResults)
    .where(eq(backtestResults.runId, runId));
  if (!row) return null;
  return {
    simStartDate: row.simStartDate,
    simEndDate: row.simEndDate,
    lookbackDays: row.lookbackDays,
    portfolioReturn: num(row.portfolioReturn),
    benchmarkReturn: num(row.benchmarkReturn),
    outperformance: num(row.outperformance),
    picks: row.picks as BacktestPick[] | null,
  };
}
