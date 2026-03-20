import {
  pgTable,
  serial,
  integer,
  text,
  date,
  timestamp,
  decimal,
  bigint,
  boolean,
  jsonb,
  index,
  unique,
} from "drizzle-orm/pg-core";

export const analysisRuns = pgTable("analysis_runs", {
  id: serial().primaryKey(),
  runDate: date("run_date").unique().notNull(),
  generatedAt: timestamp("generated_at", { mode: "date" }),
  marketDate: date("market_date"),
  dataStatus: jsonb("data_status"),
  status: text().default("complete"),
});

export const dailyPrices = pgTable(
  "daily_prices",
  {
    id: serial().primaryKey(),
    runId: integer("run_id").notNull().references(() => analysisRuns.id, { onDelete: "cascade" }),
    date: date().notNull(),
    ticker: text().notNull(),
    open: decimal({ precision: 10, scale: 2 }),
    high: decimal({ precision: 10, scale: 2 }),
    low: decimal({ precision: 10, scale: 2 }),
    close: decimal({ precision: 10, scale: 2 }),
    volume: bigint({ mode: "number" }),
  },
  (table) => [
    index("daily_prices_run_ticker_date_idx").on(table.runId, table.ticker, table.date),
    index("daily_prices_ticker_date_idx").on(table.ticker, table.date),
  ]
);

export const marketSummary = pgTable("market_summary", {
  id: serial().primaryKey(),
  runId: integer("run_id").notNull().references(() => analysisRuns.id, { onDelete: "cascade" }).unique(),
  marketBreadth: text("market_breadth"),
  avgChange: decimal("avg_change", { precision: 8, scale: 4 }),
  advancers: integer(),
  decliners: integer(),
  breadthRatio: decimal("breadth_ratio", { precision: 5, scale: 2 }),
  vix: decimal({ precision: 6, scale: 2 }),
  treasury10y: decimal("treasury_10y", { precision: 5, scale: 2 }),
  treasury2y: decimal("treasury_2y", { precision: 5, scale: 2 }),
  fedFunds: decimal("fed_funds", { precision: 5, scale: 2 }),
});

export const sectorPerformance = pgTable("sector_performance", {
  id: serial().primaryKey(),
  runId: integer("run_id").notNull().references(() => analysisRuns.id, { onDelete: "cascade" }),
  sector: text().notNull(),
  avgChange: decimal("avg_change", { precision: 8, scale: 4 }),
  stockCount: integer("stock_count"),
  advancers: integer(),
  color: text(),
});

export const stockScores = pgTable(
  "stock_scores",
  {
    id: serial().primaryKey(),
    runId: integer("run_id").notNull().references(() => analysisRuns.id, { onDelete: "cascade" }),
    rank: integer(),
    ticker: text().notNull(),
    name: text(),
    sector: text(),
    price: decimal({ precision: 10, scale: 2 }),
    change1d: decimal("change_1d", { precision: 8, scale: 4 }),
    change5d: decimal("change_5d", { precision: 8, scale: 4 }),
    change20d: decimal("change_20d", { precision: 8, scale: 4 }),
    targetMean: decimal("target_mean", { precision: 10, scale: 2 }),
    upsidePct: decimal("upside_pct", { precision: 8, scale: 2 }),
    compositeScore: decimal("composite_score", { precision: 5, scale: 1 }),
    scoreAnalyst: decimal("score_analyst", { precision: 5, scale: 1 }),
    scoreTechnical: decimal("score_technical", { precision: 5, scale: 1 }),
    scoreMomentum: decimal("score_momentum", { precision: 5, scale: 1 }),
    scoreVolume: decimal("score_volume", { precision: 5, scale: 1 }),
    scoreNews: decimal("score_news", { precision: 5, scale: 1 }),
    rsi: decimal({ precision: 6, scale: 2 }),
    macdHist: decimal("macd_hist", { precision: 10, scale: 4 }),
    sma50: decimal("sma_50", { precision: 10, scale: 2 }),
    sma200: decimal("sma_200", { precision: 10, scale: 2 }),
    volRatio: decimal("vol_ratio", { precision: 6, scale: 2 }),
    bbUpper: decimal("bb_upper", { precision: 10, scale: 2 }),
    bbLower: decimal("bb_lower", { precision: 10, scale: 2 }),
    peRatio: decimal("pe_ratio", { precision: 10, scale: 2 }),
    marketCap: bigint("market_cap", { mode: "number" }),
    recommendation: text(),
    sectorRank: integer("sector_rank"),
    sectorCount: integer("sector_count"),
    sectorRelativeScore: decimal("sector_relative_score", { precision: 5, scale: 1 }),
    sectorPeAvg: decimal("sector_pe_avg", { precision: 10, scale: 2 }),
    annualVolatility: decimal("annual_volatility", { precision: 6, scale: 1 }),
    sharpeRatio: decimal("sharpe_ratio", { precision: 6, scale: 2 }),
    maxDrawdownPct: decimal("max_drawdown_pct", { precision: 6, scale: 1 }),
    return1y: decimal("return_1y", { precision: 8, scale: 2 }),
    yearHigh: decimal("year_high", { precision: 10, scale: 2 }),
    yearLow: decimal("year_low", { precision: 10, scale: 2 }),
    reasons: jsonb(),
  },
  (table) => [
    index("stock_scores_run_ticker_idx").on(table.runId, table.ticker),
    index("stock_scores_run_rank_idx").on(table.runId, table.rank),
  ]
);

export const scannerResults = pgTable(
  "scanner_results",
  {
    id: serial().primaryKey(),
    runId: integer("run_id").notNull().references(() => analysisRuns.id, { onDelete: "cascade" }),
    scannerType: text("scanner_type").notNull(),
    ticker: text().notNull(),
    name: text(),
    value: decimal({ precision: 10, scale: 4 }),
  },
  (table) => [
    index("scanner_results_run_type_idx").on(table.runId, table.scannerType),
  ]
);

export const newsArticles = pgTable(
  "news_articles",
  {
    id: serial().primaryKey(),
    runId: integer("run_id").notNull().references(() => analysisRuns.id, { onDelete: "cascade" }),
    type: text().notNull(),
    ticker: text(),
    headline: text(),
    source: text(),
    url: text(),
    summary: text(),
    sentiment: decimal({ precision: 4, scale: 2 }),
    published: timestamp({ mode: "date" }),
  },
  (table) => [
    index("news_articles_run_type_idx").on(table.runId, table.type),
    index("news_articles_run_ticker_idx").on(table.runId, table.ticker),
  ]
);

export const earningsEvents = pgTable("earnings_events", {
  id: serial().primaryKey(),
  runId: integer("run_id").notNull().references(() => analysisRuns.id, { onDelete: "cascade" }),
  type: text().notNull(),
  ticker: text().notNull(),
  name: text(),
  eventDate: date("event_date"),
  hour: text(),
  estimateEps: decimal("estimate_eps", { precision: 10, scale: 4 }),
  actualEps: decimal("actual_eps", { precision: 10, scale: 4 }),
  surprisePct: decimal("surprise_pct", { precision: 8, scale: 2 }),
  revenueEstimate: bigint("revenue_estimate", { mode: "number" }),
  actualRevenue: bigint("actual_revenue", { mode: "number" }),
});

export const catalystTimeline = pgTable("catalyst_timeline", {
  id: serial().primaryKey(),
  runId: integer("run_id").notNull().references(() => analysisRuns.id, { onDelete: "cascade" }).unique(),
  date: date().notNull(),
  narrative: text(),
  dayChangePct: decimal("day_change_pct", { precision: 6, scale: 2 }),
  open: decimal({ precision: 10, scale: 2 }),
  close: decimal({ precision: 10, scale: 2 }),
  high: decimal({ precision: 10, scale: 2 }),
  low: decimal({ precision: 10, scale: 2 }),
  highTime: text("high_time"),
  lowTime: text("low_time"),
});

export const catalystHours = pgTable("catalyst_hours", {
  id: serial().primaryKey(),
  timelineId: integer("timeline_id").notNull().references(() => catalystTimeline.id, { onDelete: "cascade" }),
  time: text().notNull(),
  open: decimal({ precision: 10, scale: 2 }),
  close: decimal({ precision: 10, scale: 2 }),
  high: decimal({ precision: 10, scale: 2 }),
  low: decimal({ precision: 10, scale: 2 }),
  volume: bigint({ mode: "number" }),
  changeFromOpen: decimal("change_from_open", { precision: 6, scale: 2 }),
  hourlyChange: decimal("hourly_change", { precision: 6, scale: 2 }),
  significant: boolean().default(false),
});

export const catalystNews = pgTable("catalyst_news", {
  id: serial().primaryKey(),
  hourId: integer("hour_id").notNull().references(() => catalystHours.id, { onDelete: "cascade" }),
  headline: text(),
  source: text(),
  url: text(),
  time: text(),
});

export const backtestResults = pgTable("backtest_results", {
  id: serial().primaryKey(),
  runId: integer("run_id").notNull().references(() => analysisRuns.id, { onDelete: "cascade" }).unique(),
  simStartDate: date("sim_start_date"),
  simEndDate: date("sim_end_date"),
  lookbackDays: integer("lookback_days"),
  portfolioReturn: decimal("portfolio_return", { precision: 8, scale: 2 }),
  benchmarkReturn: decimal("benchmark_return", { precision: 8, scale: 2 }),
  outperformance: decimal({ precision: 8, scale: 2 }),
  picks: jsonb(),
});

export const picksHistory = pgTable(
  "picks_history",
  {
    id: serial().primaryKey(),
    runId: integer("run_id").notNull().references(() => analysisRuns.id, { onDelete: "cascade" }),
    pickDate: date("pick_date").notNull(),
    ticker: text().notNull(),
    name: text(),
    sector: text(),
    rank: integer(),
    priceAtPick: decimal("price_at_pick", { precision: 10, scale: 2 }),
    return1d: decimal("return_1d", { precision: 8, scale: 2 }),
    return5d: decimal("return_5d", { precision: 8, scale: 2 }),
    return10d: decimal("return_10d", { precision: 8, scale: 2 }),
    return20d: decimal("return_20d", { precision: 8, scale: 2 }),
  },
  (table) => [
    unique("picks_history_date_ticker_uniq").on(table.pickDate, table.ticker),
    index("picks_history_pick_date_idx").on(table.pickDate),
  ]
);
