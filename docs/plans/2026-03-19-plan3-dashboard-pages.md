# Plan 3: Dashboard + Analysis Pages

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build all 6 read-only dashboard pages that display pipeline analysis data from the database, replacing the current placeholder pages.

**Architecture:** Async server components fetch data from Vercel Postgres via Drizzle ORM, then pass plain objects to client components for interactive elements (charts, sort, filter, tabs). Every page queries against the latest `analysis_runs` row. If no data exists, pages show a styled empty state. Drizzle returns `decimal` columns as strings -- the query layer parses them to numbers.

**Tech Stack:** Next.js 15 App Router, Drizzle ORM, Recharts (charts), Tailwind v4

**Important Tailwind v4 syntax reminders:**
- `bg-(--var)` not `bg-[var(--var)]`
- `font-(family-name:--font-source-serif)` for serif headings
- `!` goes at end: `!mb-0` not `!mb-0`
- Use `.show-desktop` / `.show-mobile` CSS classes instead of `hidden md:flex` (Tailwind v4 bug #16586)

**Theme reference (from globals.css):**
- Backgrounds: `--surface-0` (#0B1120), `--surface-1` (#111827), `--surface-2` (#1a2235), `--surface-3` (#232d42)
- Accent: `--accent` (#34D399), `--accent-dim` (#10B981)
- Text: `--text-primary` (#f0ede6), `--text-secondary` (#94a3b8)
- Gains/losses: `--up` (#34D399), `--down` (#F87171)
- Gold: `--gold` (#FBBF24)
- Border: `--border` (rgba(255,255,255,0.06))
- Cards use `.card-glow` class (bg surface-1, rounded-xl, hover glow effect)
- Headings use Source Serif 4 via `font-(family-name:--font-source-serif)`
- Body text uses DM Sans (default)

**Design reference:** Match the existing dashboard placeholder page pattern -- section label + h1 header at top, card-glow containers, same color palette throughout.

---

## File Structure

```
src/
  lib/
    db/
      queries.ts              NEW  - All database query functions
    format.ts                 NEW  - Number/date/currency formatting
  components/
    ui/
      change-badge.tsx        NEW  - Green/red percent change pill
      empty-state.tsx         NEW  - No-data placeholder with icon + message
      data-freshness.tsx      NEW  - "Updated Mar 19, 2026" indicator
      score-bar.tsx           NEW  - Horizontal colored bar for score breakdown
    charts/
      sector-chart.tsx        NEW  - Sector performance horizontal bar chart
      catalyst-chart.tsx      NEW  - SPY intraday area chart
      performance-chart.tsx   NEW  - Backtest cumulative line chart
  app/
    dashboard/
      page.tsx                MODIFY - Replace placeholder with real dashboard
      recommendations/
        page.tsx              MODIFY - Server component with data
        stock-table.tsx       NEW    - Client component: sortable/filterable table
      news/
        page.tsx              MODIFY - Server component with data
        news-feed.tsx         NEW    - Client component: news list with filters
        catalyst-detail.tsx   NEW    - Client component: hourly timeline with chart
      scanners/
        page.tsx              MODIFY - Server component with data
        scanner-tabs.tsx      NEW    - Client component: tabbed scanner view
      earnings/
        page.tsx              MODIFY - Server component with data
        earnings-view.tsx     NEW    - Client component: upcoming/past toggle
      backtest/
        page.tsx              MODIFY - Server component with data
```

---

## Task 1: Install Recharts + Create Query Layer + Format Utils

**Files:**
- Modify: `package.json` (add recharts)
- Create: `src/lib/db/queries.ts`
- Create: `src/lib/format.ts`

- [ ] **Step 1: Install Recharts**

```bash
cd C:\Users\vasti\OneDrive\Desktop\extra\macrolyst
npm install recharts
```

- [ ] **Step 2: Create `src/lib/format.ts`**

```typescript
export function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return "--";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number | null, decimals = 2): string {
  if (value === null || value === undefined) return "--";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
}

export function formatNumber(value: number | null, decimals = 2): string {
  if (value === null || value === undefined) return "--";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatMarketCap(value: number | null): string {
  if (value === null || value === undefined) return "--";
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return `$${value.toLocaleString()}`;
}

export function formatDate(date: string | Date | null): string {
  if (!date) return "--";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(date: string | Date | null): string {
  if (!date) return "--";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatCompactNumber(value: number | null): string {
  if (value === null || value === undefined) return "--";
  return new Intl.NumberFormat("en-US", { notation: "compact" }).format(value);
}
```

- [ ] **Step 3: Create `src/lib/db/queries.ts`**

This is the core data layer. All queries fetch from the latest analysis_run. Decimal strings are parsed to numbers.

```typescript
import { db } from "@/lib/db";
import { desc, eq, asc } from "drizzle-orm";
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
  let query = db
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
  value: number | null;
};

export async function getScannerResults(runId: number): Promise<ScannerResult[]> {
  const rows = await db
    .select()
    .from(scannerResults)
    .where(eq(scannerResults.runId, runId));
  return rows.map((r) => ({
    scannerType: r.scannerType,
    ticker: r.ticker,
    name: r.name,
    value: num(r.value),
  }));
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
    // Fetch all news for all hours in one query
    const { inArray } = await import("drizzle-orm");
    allNews = await db
      .select()
      .from(catalystNews)
      .where(inArray(catalystNews.hourId, hourIds));
  }

  // Group news by hourId
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
```

- [ ] **Step 4: Verify build**

```bash
cd C:\Users\vasti\OneDrive\Desktop\extra\macrolyst
npm run build
```

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/format.ts src/lib/db/queries.ts package.json package-lock.json
git commit -m "feat: add query layer, format utils, and recharts dependency"
```

---

## Task 2: Shared UI Components

**Files:**
- Create: `src/components/ui/change-badge.tsx`
- Create: `src/components/ui/empty-state.tsx`
- Create: `src/components/ui/data-freshness.tsx`
- Create: `src/components/ui/score-bar.tsx`

- [ ] **Step 1: Create `src/components/ui/change-badge.tsx`**

A small pill that shows a percent change in green (positive) or red (negative).

```tsx
import { formatPercent } from "@/lib/format";

export function ChangeBadge({ value, className = "" }: { value: number | null; className?: string }) {
  if (value === null || value === undefined) return <span className="text-(--text-secondary)">--</span>;
  const isPositive = value >= 0;
  return (
    <span
      className={`inline-flex items-center text-sm font-medium ${
        isPositive ? "text-(--up)" : "text-(--down)"
      } ${className}`}
    >
      {formatPercent(value)}
    </span>
  );
}
```

- [ ] **Step 2: Create `src/components/ui/empty-state.tsx`**

Shown when no analysis data is available (no pipeline run yet).

```tsx
export function EmptyState({
  title = "No data available",
  message = "Market analysis will appear here once the pipeline runs.",
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div className="card-glow p-12 flex flex-col items-center justify-center text-center">
      <div className="w-12 h-12 rounded-xl bg-(--surface-2) flex items-center justify-center mb-4">
        <svg
          className="w-6 h-6 text-(--text-secondary)/40"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
          />
        </svg>
      </div>
      <p className="text-sm font-medium text-(--text-secondary) mb-1">{title}</p>
      <p className="text-xs text-(--text-secondary)/50">{message}</p>
    </div>
  );
}
```

- [ ] **Step 3: Create `src/components/ui/data-freshness.tsx`**

Shows when data was last updated, appearing in the page header area.

```tsx
import { formatDateTime } from "@/lib/format";

export function DataFreshness({
  generatedAt,
  runDate,
}: {
  generatedAt: Date | null;
  runDate: string;
}) {
  return (
    <div className="flex items-center gap-2 text-xs text-(--text-secondary)">
      <span className="w-1.5 h-1.5 rounded-full bg-(--accent) pulse-dot" />
      <span>
        Updated {generatedAt ? formatDateTime(generatedAt) : runDate}
      </span>
    </div>
  );
}
```

- [ ] **Step 4: Create `src/components/ui/score-bar.tsx`**

A horizontal bar for displaying score breakdowns (0-100 scale). Used on the recommendations page.

```tsx
export function ScoreBar({
  label,
  value,
  max = 100,
  color = "#34D399",
}: {
  label: string;
  value: number | null;
  max?: number;
  color?: string;
}) {
  const pct = value !== null ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-(--text-secondary) w-20 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-(--surface-2)">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-mono text-(--text-primary) w-8 text-right">
        {value !== null ? value.toFixed(0) : "--"}
      </span>
    </div>
  );
}
```

- [ ] **Step 5: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/
git commit -m "feat: add shared UI components (change badge, empty state, data freshness, score bar)"
```

---

## Task 3: Dashboard Home Page

The main dashboard shows: market pulse cards, sector performance chart, catalyst timeline summary, and top 5 picks.

**Files:**
- Create: `src/components/charts/sector-chart.tsx`
- Create: `src/components/charts/catalyst-chart.tsx`
- Modify: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Create `src/components/charts/sector-chart.tsx`**

Horizontal bar chart showing sector performance. Client component because Recharts needs the DOM.

```tsx
"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import type { SectorData } from "@/lib/db/queries";

export function SectorChart({ sectors }: { sectors: SectorData[] }) {
  const sorted = [...sectors].sort((a, b) => (b.avgChange ?? 0) - (a.avgChange ?? 0));
  const data = sorted.map((s) => ({
    name: s.sector,
    change: s.avgChange ?? 0,
    count: s.stockCount,
  }));

  return (
    <ResponsiveContainer width="100%" height={sectors.length * 36 + 20}>
      <BarChart data={data} layout="vertical" margin={{ left: 0, right: 12, top: 0, bottom: 0 }}>
        <XAxis
          type="number"
          tickFormatter={(v) => `${v > 0 ? "+" : ""}${v.toFixed(2)}%`}
          tick={{ fill: "#94a3b8", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={130}
          tick={{ fill: "#f0ede6", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            background: "#1a2235",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: "#f0ede6" }}
          formatter={(value: number) => [`${value > 0 ? "+" : ""}${value.toFixed(3)}%`, "Avg Change"]}
        />
        <ReferenceLine x={0} stroke="rgba(255,255,255,0.1)" />
        <Bar dataKey="change" radius={[0, 4, 4, 0]} barSize={20}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.change >= 0 ? "#34D399" : "#F87171"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 2: Create `src/components/charts/catalyst-chart.tsx`**

SPY intraday area chart showing hourly price action with significant hour markers.

```tsx
"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from "recharts";
import type { CatalystHourData } from "@/lib/db/queries";

export function CatalystChart({ hours }: { hours: CatalystHourData[] }) {
  const data = hours.map((h) => ({
    time: h.time,
    price: h.close,
    change: h.changeFromOpen,
    significant: h.significant,
    newsCount: h.news.length,
  }));

  const prices = data.map((d) => d.price).filter((p): p is number => p !== null);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const padding = (max - min) * 0.1;
  const isUp = data.length > 0 && (data[data.length - 1]?.price ?? 0) >= (data[0]?.price ?? 0);

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="catalystGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isUp ? "#34D399" : "#F87171"} stopOpacity={0.3} />
            <stop offset="100%" stopColor={isUp ? "#34D399" : "#F87171"} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="time"
          tick={{ fill: "#94a3b8", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[min - padding, max + padding]}
          tick={{ fill: "#94a3b8", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `$${v.toFixed(0)}`}
          width={50}
        />
        <Tooltip
          contentStyle={{
            background: "#1a2235",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(value: number) => [`$${value.toFixed(2)}`, "SPY"]}
          labelStyle={{ color: "#f0ede6" }}
        />
        <Area
          type="monotone"
          dataKey="price"
          stroke={isUp ? "#34D399" : "#F87171"}
          fill="url(#catalystGrad)"
          strokeWidth={2}
        />
        {data
          .filter((d) => d.significant)
          .map((d, i) => (
            <ReferenceDot
              key={i}
              x={d.time}
              y={d.price!}
              r={4}
              fill={isUp ? "#34D399" : "#F87171"}
              stroke="#0B1120"
              strokeWidth={2}
            />
          ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 3: Replace `src/app/dashboard/page.tsx`**

Full dashboard with real data. Server component that queries DB and composes the page.

```tsx
import { getLatestRun, getMarketSummary, getSectorPerformance, getStockScores, getCatalystData } from "@/lib/db/queries";
import { formatPercent, formatNumber, formatCurrency, formatDate } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";
import { DataFreshness } from "@/components/ui/data-freshness";
import { ChangeBadge } from "@/components/ui/change-badge";
import { SectorChart } from "@/components/charts/sector-chart";
import { CatalystChart } from "@/components/charts/catalyst-chart";
import Link from "next/link";

export default async function DashboardPage() {
  const run = await getLatestRun();
  if (!run) return <EmptyState />;

  const [summary, sectors, topPicks, catalyst] = await Promise.all([
    getMarketSummary(run.id),
    getSectorPerformance(run.id),
    getStockScores(run.id, 5),
    getCatalystData(run.id),
  ]);

  const pulseCards = [
    {
      label: "Market Breadth",
      value: summary?.marketBreadth ?? "--",
      detail: summary ? `${summary.advancers ?? 0} up / ${summary.decliners ?? 0} down` : null,
      change: summary?.avgChange ? summary.avgChange * 100 : null,
    },
    {
      label: "VIX",
      value: summary?.vix !== null ? formatNumber(summary!.vix, 2) : "--",
      detail: "Volatility Index",
      change: null,
    },
    {
      label: "10Y Treasury",
      value: summary?.treasury10y !== null ? `${formatNumber(summary!.treasury10y, 2)}%` : "--",
      detail: summary?.treasury2y !== null ? `2Y: ${formatNumber(summary!.treasury2y, 2)}%` : null,
      change: null,
    },
    {
      label: "Fed Funds",
      value: summary?.fedFunds !== null ? `${formatNumber(summary!.fedFunds, 2)}%` : "--",
      detail: "Target Rate",
      change: null,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.15em] uppercase text-(--accent) mb-1">Overview</p>
          <h1 className="text-2xl font-bold text-white font-(family-name:--font-source-serif)">Dashboard</h1>
        </div>
        <DataFreshness generatedAt={run.generatedAt} runDate={run.runDate} />
      </div>

      {/* Market Pulse Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {pulseCards.map((card) => (
          <div key={card.label} className="card-glow p-5">
            <p className="text-xs text-(--text-secondary) uppercase tracking-wider mb-2">{card.label}</p>
            <div className="flex items-end justify-between">
              <p className="text-2xl font-bold text-white font-(family-name:--font-source-serif)">{card.value}</p>
              {card.change !== null && <ChangeBadge value={card.change} />}
            </div>
            {card.detail && (
              <p className="text-xs text-(--text-secondary) mt-1">{card.detail}</p>
            )}
          </div>
        ))}
      </div>

      {/* Main content: Sector Chart + Top 5 Picks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sector Performance */}
        <div className="lg:col-span-2 card-glow p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-(--text-secondary) uppercase tracking-wider">Sector Performance</p>
            <p className="text-xs text-(--text-secondary)">{formatDate(run.runDate)}</p>
          </div>
          {sectors.length > 0 ? (
            <SectorChart sectors={sectors} />
          ) : (
            <p className="text-sm text-(--text-secondary) py-8 text-center">No sector data available</p>
          )}
        </div>

        {/* Top 5 Picks */}
        <div className="card-glow p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-(--text-secondary) uppercase tracking-wider">Top 5 Picks</p>
            <Link href="/dashboard/recommendations" className="text-xs text-(--accent) hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {topPicks.map((stock, i) => (
              <div key={stock.ticker} className="flex items-center gap-3 py-2">
                <span className="text-xs font-mono text-(--text-secondary)/50 w-4">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{stock.ticker}</span>
                    <span className="text-xs text-(--text-secondary) truncate">{stock.name}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-(--text-secondary)">{formatCurrency(stock.price)}</span>
                    <ChangeBadge value={stock.change1d ? stock.change1d * 100 : null} className="text-xs" />
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-(--accent)">{stock.compositeScore?.toFixed(0) ?? "--"}</span>
                  <p className="text-[10px] text-(--text-secondary)">score</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Catalyst Timeline */}
      {catalyst && (
        <div className="card-glow p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-(--text-secondary) uppercase tracking-wider mb-1">What Happened Yesterday</p>
              <p className="text-sm text-white font-(family-name:--font-source-serif)">
                SPY {formatDate(catalyst.date)}
              </p>
            </div>
            <div className="text-right">
              <ChangeBadge value={catalyst.dayChangePct} className="text-lg font-bold" />
              <p className="text-xs text-(--text-secondary) mt-0.5">
                {formatCurrency(catalyst.open)} → {formatCurrency(catalyst.close)}
              </p>
            </div>
          </div>

          {catalyst.hours.length > 0 && <CatalystChart hours={catalyst.hours} />}

          {catalyst.narrative && (
            <p className="text-sm text-(--text-secondary) mt-4 leading-relaxed">{catalyst.narrative}</p>
          )}

          {/* Significant hour news highlights */}
          {catalyst.hours.filter((h) => h.news.length > 0).length > 0 && (
            <div className="mt-4 space-y-2">
              {catalyst.hours
                .filter((h) => h.news.length > 0)
                .slice(0, 3)
                .map((h, i) => (
                  <div key={i} className="flex gap-3 py-2 border-t border-(--border)">
                    <span className="text-xs font-mono text-(--text-secondary) shrink-0 w-12">{h.time}</span>
                    <div className="flex-1 min-w-0">
                      {h.news.map((n, j) => (
                        <p key={j} className="text-xs text-(--text-primary) truncate">
                          {n.headline}
                          {n.source && <span className="text-(--text-secondary) ml-1">({n.source})</span>}
                        </p>
                      ))}
                    </div>
                    <ChangeBadge value={h.hourlyChange} className="text-xs shrink-0" />
                  </div>
                ))}
              <Link href="/dashboard/news" className="text-xs text-(--accent) hover:underline block pt-2">
                View full catalyst timeline
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verify**

```bash
npm run build
```

Then run `npm run dev` and navigate to `/dashboard`. Confirm:
- Market pulse cards show real data (VIX, yields, breadth)
- Sector chart renders with colored bars
- Top 5 picks show tickers, prices, scores
- Catalyst section shows SPY chart and news highlights
- Responsive: cards stack on mobile, side-by-side on desktop

- [ ] **Step 5: Commit**

```bash
git add src/components/charts/ src/app/dashboard/page.tsx
git commit -m "feat: build dashboard home with market pulse, sector chart, catalyst timeline, and top picks"
```

---

## Task 4: Recommendations Page

Top 50 stocks in a sortable, filterable table with expandable detail cards showing score breakdowns.

**Files:**
- Modify: `src/app/dashboard/recommendations/page.tsx`
- Create: `src/app/dashboard/recommendations/stock-table.tsx`

- [ ] **Step 1: Create `src/app/dashboard/recommendations/stock-table.tsx`**

Client component with sorting, sector filter, and expandable rows.

```tsx
"use client";

import { useState, useMemo } from "react";
import type { StockScore } from "@/lib/db/queries";
import { formatCurrency, formatPercent, formatMarketCap } from "@/lib/format";
import { ChangeBadge } from "@/components/ui/change-badge";
import { ScoreBar } from "@/components/ui/score-bar";

type SortKey = "rank" | "ticker" | "compositeScore" | "price" | "change1d" | "upsidePct";
type SortDir = "asc" | "desc";

export function StockTable({ stocks }: { stocks: StockScore[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [sectorFilter, setSectorFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const sectors = useMemo(() => {
    const set = new Set(stocks.map((s) => s.sector).filter(Boolean) as string[]);
    return ["all", ...Array.from(set).sort()];
  }, [stocks]);

  const sorted = useMemo(() => {
    let filtered = sectorFilter === "all" ? stocks : stocks.filter((s) => s.sector === sectorFilter);
    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey] ?? 0;
      const bVal = b[sortKey] ?? 0;
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
  }, [stocks, sortKey, sortDir, sectorFilter]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir(key === "rank" ? "asc" : "desc");
    }
  }

  function SortHeader({ label, field, className = "" }: { label: string; field: SortKey; className?: string }) {
    const active = sortKey === field;
    return (
      <button
        onClick={() => toggleSort(field)}
        className={`flex items-center gap-1 text-xs uppercase tracking-wider cursor-pointer hover:text-white transition-colors ${
          active ? "text-white" : "text-(--text-secondary)"
        } ${className}`}
      >
        {label}
        {active && <span>{sortDir === "asc" ? "↑" : "↓"}</span>}
      </button>
    );
  }

  return (
    <div>
      {/* Sector filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {sectors.map((s) => (
          <button
            key={s}
            onClick={() => setSectorFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
              sectorFilter === s
                ? "bg-(--accent)/15 text-(--accent) border border-(--accent)/30"
                : "bg-(--surface-2) text-(--text-secondary) border border-transparent hover:bg-(--surface-3)"
            }`}
          >
            {s === "all" ? "All Sectors" : s}
          </button>
        ))}
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[3rem_5rem_1fr_5rem_5rem_5rem_4rem] gap-2 px-4 py-2 border-b border-(--border) show-desktop">
        <SortHeader label="#" field="rank" />
        <SortHeader label="Ticker" field="ticker" />
        <span className="text-xs text-(--text-secondary) uppercase tracking-wider">Name</span>
        <SortHeader label="Price" field="price" className="justify-end" />
        <SortHeader label="1D" field="change1d" className="justify-end" />
        <SortHeader label="Upside" field="upsidePct" className="justify-end" />
        <SortHeader label="Score" field="compositeScore" className="justify-end" />
      </div>

      {/* Rows */}
      <div className="divide-y divide-(--border)">
        {sorted.map((stock) => (
          <div key={stock.ticker}>
            <button
              onClick={() => setExpanded(expanded === stock.ticker ? null : stock.ticker)}
              className="w-full text-left cursor-pointer hover:bg-(--surface-2)/50 transition-colors"
            >
              {/* Desktop row */}
              <div className="grid grid-cols-[3rem_5rem_1fr_5rem_5rem_5rem_4rem] gap-2 px-4 py-3 items-center show-desktop">
                <span className="text-xs font-mono text-(--text-secondary)">{stock.rank}</span>
                <span className="text-sm font-semibold text-white">{stock.ticker}</span>
                <span className="text-sm text-(--text-secondary) truncate">{stock.name}</span>
                <span className="text-sm text-white text-right">{formatCurrency(stock.price)}</span>
                <div className="text-right"><ChangeBadge value={stock.change1d ? stock.change1d * 100 : null} className="text-xs" /></div>
                <div className="text-right"><ChangeBadge value={stock.upsidePct} className="text-xs" /></div>
                <span className="text-sm font-bold text-(--accent) text-right">{stock.compositeScore?.toFixed(0) ?? "--"}</span>
              </div>
              {/* Mobile row */}
              <div className="show-mobile flex-col gap-1 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-(--text-secondary)">{stock.rank}</span>
                    <span className="text-sm font-semibold text-white">{stock.ticker}</span>
                    <span className="text-xs text-(--text-secondary) truncate max-w-32">{stock.name}</span>
                  </div>
                  <span className="text-sm font-bold text-(--accent)">{stock.compositeScore?.toFixed(0) ?? "--"}</span>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-(--text-secondary)">{formatCurrency(stock.price)}</span>
                  <ChangeBadge value={stock.change1d ? stock.change1d * 100 : null} className="text-xs" />
                  <span className="text-(--text-secondary)">Target: {formatCurrency(stock.targetMean)}</span>
                </div>
              </div>
            </button>

            {/* Expanded detail */}
            {expanded === stock.ticker && (
              <div className="px-4 pb-4 bg-(--surface-2)/30 border-t border-(--border)">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                  {/* Score breakdown */}
                  <div>
                    <p className="text-xs text-(--text-secondary) uppercase tracking-wider mb-3">Score Breakdown</p>
                    <div className="space-y-2">
                      <ScoreBar label="Analyst" value={stock.scoreAnalyst} />
                      <ScoreBar label="Technical" value={stock.scoreTechnical} />
                      <ScoreBar label="Momentum" value={stock.scoreMomentum} />
                      <ScoreBar label="Volume" value={stock.scoreVolume} />
                      <ScoreBar label="News" value={stock.scoreNews} />
                    </div>
                  </div>

                  {/* Key metrics */}
                  <div>
                    <p className="text-xs text-(--text-secondary) uppercase tracking-wider mb-3">Key Metrics</p>
                    <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                      <span className="text-(--text-secondary)">RSI (14)</span>
                      <span className="text-white text-right">{stock.rsi?.toFixed(1) ?? "--"}</span>
                      <span className="text-(--text-secondary)">P/E Ratio</span>
                      <span className="text-white text-right">{stock.peRatio?.toFixed(1) ?? "--"}</span>
                      <span className="text-(--text-secondary)">Market Cap</span>
                      <span className="text-white text-right">{formatMarketCap(stock.marketCap)}</span>
                      <span className="text-(--text-secondary)">Sharpe Ratio</span>
                      <span className="text-white text-right">{stock.sharpeRatio?.toFixed(2) ?? "--"}</span>
                      <span className="text-(--text-secondary)">Volatility</span>
                      <span className="text-white text-right">{stock.annualVolatility?.toFixed(1) ?? "--"}%</span>
                      <span className="text-(--text-secondary)">Max Drawdown</span>
                      <span className="text-(--down) text-right">{stock.maxDrawdownPct ? `-${stock.maxDrawdownPct.toFixed(1)}%` : "--"}</span>
                      <span className="text-(--text-secondary)">52W Range</span>
                      <span className="text-white text-right">{formatCurrency(stock.yearLow)} - {formatCurrency(stock.yearHigh)}</span>
                      <span className="text-(--text-secondary)">Sector Rank</span>
                      <span className="text-white text-right">{stock.sectorRank ?? "--"} / {stock.sectorCount ?? "--"}</span>
                    </div>
                  </div>
                </div>

                {/* Reasons */}
                {stock.reasons && stock.reasons.length > 0 && (
                  <div className="pt-3 border-t border-(--border)">
                    <p className="text-xs text-(--text-secondary) uppercase tracking-wider mb-2">Reasons</p>
                    <ul className="space-y-1">
                      {stock.reasons.map((reason, i) => (
                        <li key={i} className="text-xs text-(--text-primary) flex gap-2">
                          <span className="text-(--accent) shrink-0">-</span>
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-(--text-secondary) mt-4 px-4">
        Showing {sorted.length} of {stocks.length} stocks.
        Scores range 0-100 (composite of analyst upside, technical, momentum, volume, and news sentiment).
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Replace `src/app/dashboard/recommendations/page.tsx`**

```tsx
import { getLatestRun, getStockScores } from "@/lib/db/queries";
import { EmptyState } from "@/components/ui/empty-state";
import { DataFreshness } from "@/components/ui/data-freshness";
import { StockTable } from "./stock-table";

export default async function RecommendationsPage() {
  const run = await getLatestRun();
  if (!run) return <EmptyState title="No recommendations yet" message="Stock scores will appear after the pipeline runs." />;

  const stocks = await getStockScores(run.id, 50);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.15em] uppercase text-(--accent) mb-1">Analysis</p>
          <h1 className="text-2xl font-bold text-white font-(family-name:--font-source-serif)">Recommendations</h1>
        </div>
        <DataFreshness generatedAt={run.generatedAt} runDate={run.runDate} />
      </div>

      <div className="card-glow overflow-hidden">
        <StockTable stocks={stocks} />
      </div>

      {/* Methodology */}
      <div className="card-glow p-6">
        <p className="text-xs text-(--text-secondary) uppercase tracking-wider mb-3">Methodology</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-sm">
          {[
            { label: "Analyst Upside", weight: "30%", desc: "Distance to mean analyst target" },
            { label: "Technical", weight: "25%", desc: "RSI, MACD, Bollinger, moving averages" },
            { label: "Momentum", weight: "20%", desc: "1-day, 5-day, 20-day price changes" },
            { label: "News Sentiment", weight: "15%", desc: "Aggregate sentiment from recent headlines" },
            { label: "Volume", weight: "10%", desc: "Volume spike vs 20-day average" },
          ].map((item) => (
            <div key={item.label}>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-(--text-primary) font-medium">{item.label}</span>
                <span className="text-(--accent) text-xs font-mono">{item.weight}</span>
              </div>
              <p className="text-xs text-(--text-secondary)">{item.desc}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-(--text-secondary)/60 mt-4">
          Not financial advice. For educational and informational purposes only.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify**

```bash
npm run build
```

Run `npm run dev`, navigate to `/dashboard/recommendations`. Confirm:
- Table shows 50 stocks with rank, ticker, name, price, change, upside, score
- Sector filter pills work
- Column sorting works (click headers)
- Click a row to expand: score bars, key metrics, and reasons appear
- Mobile layout stacks properly
- Methodology section at bottom

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/recommendations/
git commit -m "feat: build recommendations page with sortable stock table and score breakdowns"
```

---

## Task 5: News & Catalysts Page

Market news feed with sentiment indicators, company news grouped by ticker, and full catalyst timeline with hourly chart.

**Files:**
- Modify: `src/app/dashboard/news/page.tsx`
- Create: `src/app/dashboard/news/news-feed.tsx`
- Create: `src/app/dashboard/news/catalyst-detail.tsx`

- [ ] **Step 1: Create `src/app/dashboard/news/news-feed.tsx`**

Client component with tabs (Market News / Company News) and sentiment filter.

```tsx
"use client";

import { useState, useMemo } from "react";
import type { NewsArticle } from "@/lib/db/queries";

function SentimentDot({ value }: { value: number | null }) {
  if (value === null) return null;
  const color = value > 0.2 ? "#34D399" : value < -0.2 ? "#F87171" : "#94a3b8";
  return (
    <span
      className="inline-block w-2 h-2 rounded-full shrink-0"
      style={{ backgroundColor: color }}
      title={`Sentiment: ${value.toFixed(2)}`}
    />
  );
}

export function NewsFeed({ articles }: { articles: NewsArticle[] }) {
  const [tab, setTab] = useState<"market" | "company">("market");
  const [sentimentFilter, setSentimentFilter] = useState<"all" | "positive" | "negative" | "neutral">("all");

  const filtered = useMemo(() => {
    let list = articles.filter((a) => a.type === tab);
    if (sentimentFilter === "positive") list = list.filter((a) => (a.sentiment ?? 0) > 0.2);
    else if (sentimentFilter === "negative") list = list.filter((a) => (a.sentiment ?? 0) < -0.2);
    else if (sentimentFilter === "neutral") list = list.filter((a) => {
      const s = a.sentiment ?? 0;
      return s >= -0.2 && s <= 0.2;
    });
    return list.sort((a, b) => {
      if (!a.published || !b.published) return 0;
      return b.published.getTime() - a.published.getTime();
    });
  }, [articles, tab, sentimentFilter]);

  // Group company news by ticker
  const grouped = useMemo(() => {
    if (tab !== "company") return null;
    const map = new Map<string, NewsArticle[]>();
    filtered.forEach((a) => {
      if (a.ticker) {
        const list = map.get(a.ticker) || [];
        list.push(a);
        map.set(a.ticker, list);
      }
    });
    return map;
  }, [filtered, tab]);

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-4 mb-4">
        {(["market", "company"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-sm pb-2 cursor-pointer transition-colors border-b-2 ${
              tab === t ? "text-white border-(--accent)" : "text-(--text-secondary) border-transparent hover:text-white"
            }`}
          >
            {t === "market" ? "Market News" : "Company News"}
          </button>
        ))}
      </div>

      {/* Sentiment filter */}
      <div className="flex gap-2 mb-4">
        {(["all", "positive", "negative", "neutral"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setSentimentFilter(f)}
            className={`px-3 py-1 rounded-lg text-xs cursor-pointer transition-colors ${
              sentimentFilter === f
                ? "bg-(--accent)/15 text-(--accent) border border-(--accent)/30"
                : "bg-(--surface-2) text-(--text-secondary) border border-transparent hover:bg-(--surface-3)"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* News list */}
      {tab === "market" ? (
        <div className="space-y-1">
          {filtered.map((article, i) => (
            <a
              key={i}
              href={article.url ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 py-3 px-3 rounded-lg hover:bg-(--surface-2)/50 transition-colors border-b border-(--border) last:border-0"
            >
              <SentimentDot value={article.sentiment} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-(--text-primary) leading-snug">{article.headline}</p>
                <div className="flex items-center gap-2 mt-1">
                  {article.source && <span className="text-xs text-(--text-secondary)">{article.source}</span>}
                  {article.published && (
                    <span className="text-xs text-(--text-secondary)/50">
                      {article.published.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  )}
                </div>
                {article.summary && (
                  <p className="text-xs text-(--text-secondary) mt-1 line-clamp-2">{article.summary}</p>
                )}
              </div>
            </a>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-(--text-secondary) py-8 text-center">No articles match the current filters.</p>
          )}
        </div>
      ) : (
        // Company news grouped by ticker
        <div className="space-y-4">
          {grouped && Array.from(grouped.entries()).map(([ticker, articles]) => (
            <div key={ticker} className="border-b border-(--border) pb-4 last:border-0">
              <p className="text-sm font-semibold text-white mb-2">{ticker}</p>
              <div className="space-y-2">
                {articles.map((article, i) => (
                  <a
                    key={i}
                    href={article.url ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-2 py-1 hover:bg-(--surface-2)/30 rounded px-2 transition-colors"
                  >
                    <SentimentDot value={article.sentiment} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-(--text-primary)">{article.headline}</p>
                      <span className="text-xs text-(--text-secondary)/50">{article.source}</span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          ))}
          {(!grouped || grouped.size === 0) && (
            <p className="text-sm text-(--text-secondary) py-8 text-center">No company news available.</p>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create `src/app/dashboard/news/catalyst-detail.tsx`**

Full catalyst timeline with hour-by-hour breakdown and matched news.

```tsx
"use client";

import type { CatalystTimelineData } from "@/lib/db/queries";
import { CatalystChart } from "@/components/charts/catalyst-chart";
import { ChangeBadge } from "@/components/ui/change-badge";
import { formatCurrency } from "@/lib/format";

export function CatalystDetail({ catalyst }: { catalyst: CatalystTimelineData }) {
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-white font-(family-name:--font-source-serif)">
          SPY Intraday - {catalyst.date}
        </p>
        <div className="text-right">
          <ChangeBadge value={catalyst.dayChangePct} className="text-lg font-bold" />
          <p className="text-xs text-(--text-secondary)">
            {formatCurrency(catalyst.open)} → {formatCurrency(catalyst.close)}
          </p>
        </div>
      </div>

      {/* Chart */}
      {catalyst.hours.length > 0 && <CatalystChart hours={catalyst.hours} />}

      {/* Narrative */}
      {catalyst.narrative && (
        <p className="text-sm text-(--text-secondary) mt-4 leading-relaxed">{catalyst.narrative}</p>
      )}

      {/* Hour-by-hour breakdown */}
      <div className="mt-6 space-y-0">
        {catalyst.hours.map((hour, i) => (
          <div
            key={i}
            className={`flex gap-4 py-3 border-t border-(--border) ${
              hour.significant ? "bg-(--surface-2)/20" : ""
            }`}
          >
            <div className="shrink-0 w-14">
              <span className="text-xs font-mono text-(--text-secondary)">{hour.time}</span>
              {hour.significant && (
                <span className="block w-1.5 h-1.5 rounded-full bg-(--gold) mt-1" title="Significant move" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-4 text-xs">
                <span className="text-(--text-secondary)">
                  {formatCurrency(hour.open)} → {formatCurrency(hour.close)}
                </span>
                <ChangeBadge value={hour.hourlyChange} className="text-xs" />
                {hour.volume && (
                  <span className="text-(--text-secondary)/50">{(hour.volume / 1e6).toFixed(1)}M vol</span>
                )}
              </div>
              {hour.news.length > 0 && (
                <div className="mt-1 space-y-1">
                  {hour.news.map((n, j) => (
                    <a
                      key={j}
                      href={n.url ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs text-(--text-primary) hover:text-(--accent) transition-colors"
                    >
                      <span className="w-1 h-1 rounded-full bg-(--accent) shrink-0" />
                      <span className="truncate">{n.headline}</span>
                      {n.source && <span className="text-(--text-secondary) shrink-0">({n.source})</span>}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Replace `src/app/dashboard/news/page.tsx`**

```tsx
import { getLatestRun, getNewsArticles, getCatalystData } from "@/lib/db/queries";
import { EmptyState } from "@/components/ui/empty-state";
import { DataFreshness } from "@/components/ui/data-freshness";
import { NewsFeed } from "./news-feed";
import { CatalystDetail } from "./catalyst-detail";

export default async function NewsCatalystsPage() {
  const run = await getLatestRun();
  if (!run) return <EmptyState title="No news yet" message="News and catalysts will appear after the pipeline runs." />;

  const [articles, catalyst] = await Promise.all([
    getNewsArticles(run.id),
    getCatalystData(run.id),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.15em] uppercase text-(--accent) mb-1">Analysis</p>
          <h1 className="text-2xl font-bold text-white font-(family-name:--font-source-serif)">News & Catalysts</h1>
        </div>
        <DataFreshness generatedAt={run.generatedAt} runDate={run.runDate} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* News Feed (wider) */}
        <div className="lg:col-span-3 card-glow p-6">
          <NewsFeed articles={articles} />
        </div>

        {/* Catalyst Timeline (narrower) */}
        <div className="lg:col-span-2 card-glow p-6">
          <p className="text-xs text-(--text-secondary) uppercase tracking-wider mb-4">Catalyst Timeline</p>
          {catalyst ? (
            <CatalystDetail catalyst={catalyst} />
          ) : (
            <p className="text-sm text-(--text-secondary) py-8 text-center">No catalyst data available.</p>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify**

```bash
npm run build
```

Run `npm run dev`, navigate to `/dashboard/news`. Confirm:
- Market news tab shows articles with sentiment dots (green/red/gray)
- Company news tab groups articles by ticker
- Sentiment filter buttons work
- Catalyst timeline shows SPY chart + hour-by-hour breakdown
- News items are clickable (open in new tab)
- Responsive layout

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/news/
git commit -m "feat: build news page with market/company feeds, sentiment filters, and catalyst timeline"
```

---

## Task 6: Scanners Page

Tabbed view showing 6 scanner types with stocks matching each pattern.

**Files:**
- Modify: `src/app/dashboard/scanners/page.tsx`
- Create: `src/app/dashboard/scanners/scanner-tabs.tsx`

- [ ] **Step 1: Create `src/app/dashboard/scanners/scanner-tabs.tsx`**

Client component with tab switching and scanner result display.

```tsx
"use client";

import { useState, useMemo } from "react";
import type { ScannerResult } from "@/lib/db/queries";
import { formatNumber } from "@/lib/format";

const SCANNER_LABELS: Record<string, { label: string; metric: string; description: string }> = {
  rsi_oversold: {
    label: "RSI Oversold",
    metric: "RSI",
    description: "Stocks with RSI below 30, potentially oversold and due for a bounce.",
  },
  golden_cross: {
    label: "Golden Cross",
    metric: "SMA Diff",
    description: "50-day SMA crossing above 200-day SMA, a bullish long-term signal.",
  },
  macd_bullish: {
    label: "MACD Bullish",
    metric: "MACD Hist",
    description: "MACD histogram turning positive, indicating bullish momentum.",
  },
  volume_breakout: {
    label: "Volume Breakout",
    metric: "Vol Ratio",
    description: "Volume exceeding 2x the 20-day average, signaling unusual interest.",
  },
  bollinger_oversold: {
    label: "Bollinger Oversold",
    metric: "BB Position",
    description: "Price touching or below the lower Bollinger Band.",
  },
  near_52w_low: {
    label: "Near 52W Low",
    metric: "% From Low",
    description: "Trading within 5% of the 52-week low.",
  },
};

export function ScannerTabs({ results }: { results: ScannerResult[] }) {
  const scannerTypes = useMemo(() => {
    const types = new Set(results.map((r) => r.scannerType));
    return Array.from(types);
  }, [results]);

  const [activeTab, setActiveTab] = useState(scannerTypes[0] ?? "rsi_oversold");

  const activeResults = useMemo(
    () => results.filter((r) => r.scannerType === activeTab),
    [results, activeTab]
  );

  const info = SCANNER_LABELS[activeTab] ?? { label: activeTab, metric: "Value", description: "" };

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-2">
        {scannerTypes.map((type) => {
          const label = SCANNER_LABELS[type]?.label ?? type;
          const count = results.filter((r) => r.scannerType === type).length;
          return (
            <button
              key={type}
              onClick={() => setActiveTab(type)}
              className={`px-3 py-2 rounded-lg text-xs whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === type
                  ? "bg-(--accent)/15 text-(--accent) border border-(--accent)/30"
                  : "bg-(--surface-2) text-(--text-secondary) border border-transparent hover:bg-(--surface-3)"
              }`}
            >
              {label}
              <span className="ml-1.5 text-(--text-secondary)/60">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Description */}
      <p className="text-xs text-(--text-secondary) mb-4">{info.description}</p>

      {/* Results table */}
      {activeResults.length > 0 ? (
        <>
          <div className="grid grid-cols-[3rem_5rem_1fr_5rem] gap-2 px-4 py-2 border-b border-(--border)">
            <span className="text-xs text-(--text-secondary) uppercase tracking-wider">#</span>
            <span className="text-xs text-(--text-secondary) uppercase tracking-wider">Ticker</span>
            <span className="text-xs text-(--text-secondary) uppercase tracking-wider">Name</span>
            <span className="text-xs text-(--text-secondary) uppercase tracking-wider text-right">{info.metric}</span>
          </div>
          <div className="divide-y divide-(--border)">
            {activeResults.map((result, i) => (
              <div key={`${result.ticker}-${i}`} className="grid grid-cols-[3rem_5rem_1fr_5rem] gap-2 px-4 py-3 items-center hover:bg-(--surface-2)/30 transition-colors">
                <span className="text-xs font-mono text-(--text-secondary)">{i + 1}</span>
                <span className="text-sm font-semibold text-white">{result.ticker}</span>
                <span className="text-sm text-(--text-secondary) truncate">{result.name}</span>
                <span className="text-sm font-mono text-(--accent) text-right">{formatNumber(result.value)}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="text-sm text-(--text-secondary) py-8 text-center">No stocks match this scanner.</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Replace `src/app/dashboard/scanners/page.tsx`**

```tsx
import { getLatestRun, getScannerResults } from "@/lib/db/queries";
import { EmptyState } from "@/components/ui/empty-state";
import { DataFreshness } from "@/components/ui/data-freshness";
import { ScannerTabs } from "./scanner-tabs";

export default async function ScannersPage() {
  const run = await getLatestRun();
  if (!run) return <EmptyState title="No scanner data" message="Scanner results will appear after the pipeline runs." />;

  const results = await getScannerResults(run.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.15em] uppercase text-(--accent) mb-1">Analysis</p>
          <h1 className="text-2xl font-bold text-white font-(family-name:--font-source-serif)">Scanners</h1>
        </div>
        <DataFreshness generatedAt={run.generatedAt} runDate={run.runDate} />
      </div>

      <div className="card-glow p-6">
        {results.length > 0 ? (
          <ScannerTabs results={results} />
        ) : (
          <p className="text-sm text-(--text-secondary) py-8 text-center">No scanner results available.</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify**

```bash
npm run build
```

Run `npm run dev`, navigate to `/dashboard/scanners`. Confirm:
- Tab pills show all scanner types with counts
- Clicking tabs switches the displayed results
- Each tab shows a table of matching stocks with the relevant metric
- Description text updates with tab
- Empty tabs show "No stocks match" message

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/scanners/
git commit -m "feat: build scanners page with tabbed view for 6 scanner types"
```

---

## Task 7: Earnings Page

Upcoming earnings calendar and past earnings with beat/miss indicators.

**Files:**
- Modify: `src/app/dashboard/earnings/page.tsx`
- Create: `src/app/dashboard/earnings/earnings-view.tsx`

- [ ] **Step 1: Create `src/app/dashboard/earnings/earnings-view.tsx`**

Client component with upcoming/past toggle and earnings display.

```tsx
"use client";

import { useState, useMemo } from "react";
import type { EarningsEvent } from "@/lib/db/queries";
import { formatCurrency, formatPercent, formatDate, formatCompactNumber } from "@/lib/format";
import { ChangeBadge } from "@/components/ui/change-badge";

export function EarningsView({ events }: { events: EarningsEvent[] }) {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  const upcoming = useMemo(
    () => events
      .filter((e) => e.type === "upcoming")
      .sort((a, b) => (a.eventDate ?? "").localeCompare(b.eventDate ?? "")),
    [events]
  );

  const past = useMemo(
    () => events
      .filter((e) => e.type === "past")
      .sort((a, b) => (b.eventDate ?? "").localeCompare(a.eventDate ?? "")),
    [events]
  );

  const active = tab === "upcoming" ? upcoming : past;

  // Earnings impact stats
  const stats = useMemo(() => {
    const withSurprise = past.filter((e) => e.surprisePct !== null);
    const beats = withSurprise.filter((e) => (e.surprisePct ?? 0) > 0);
    const misses = withSurprise.filter((e) => (e.surprisePct ?? 0) < 0);
    return {
      total: withSurprise.length,
      beats: beats.length,
      misses: misses.length,
      beatRate: withSurprise.length > 0 ? (beats.length / withSurprise.length) * 100 : null,
      avgBeatSurprise: beats.length > 0
        ? beats.reduce((sum, e) => sum + (e.surprisePct ?? 0), 0) / beats.length
        : null,
      avgMissSurprise: misses.length > 0
        ? misses.reduce((sum, e) => sum + (e.surprisePct ?? 0), 0) / misses.length
        : null,
    };
  }, [past]);

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        {(["upcoming", "past"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-sm pb-2 cursor-pointer transition-colors border-b-2 ${
              tab === t ? "text-white border-(--accent)" : "text-(--text-secondary) border-transparent hover:text-white"
            }`}
          >
            {t === "upcoming" ? `Upcoming (${upcoming.length})` : `Past Results (${past.length})`}
          </button>
        ))}
      </div>

      {/* Impact stats (only when past tab) */}
      {tab === "past" && stats.total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-(--surface-2)/50 rounded-lg p-3">
            <p className="text-xs text-(--text-secondary)">Beat Rate</p>
            <p className="text-lg font-bold text-(--accent)">{stats.beatRate?.toFixed(0)}%</p>
          </div>
          <div className="bg-(--surface-2)/50 rounded-lg p-3">
            <p className="text-xs text-(--text-secondary)">Beats</p>
            <p className="text-lg font-bold text-(--up)">{stats.beats}</p>
          </div>
          <div className="bg-(--surface-2)/50 rounded-lg p-3">
            <p className="text-xs text-(--text-secondary)">Misses</p>
            <p className="text-lg font-bold text-(--down)">{stats.misses}</p>
          </div>
          <div className="bg-(--surface-2)/50 rounded-lg p-3">
            <p className="text-xs text-(--text-secondary)">Avg Beat Surprise</p>
            <p className="text-lg font-bold text-(--up)">{stats.avgBeatSurprise ? `+${stats.avgBeatSurprise.toFixed(1)}%` : "--"}</p>
          </div>
        </div>
      )}

      {/* Events list */}
      {active.length > 0 ? (
        <div className="divide-y divide-(--border)">
          {/* Group by date */}
          {Array.from(
            active.reduce((map, event) => {
              const date = event.eventDate ?? "Unknown";
              const list = map.get(date) || [];
              list.push(event);
              map.set(date, list);
              return map;
            }, new Map<string, EarningsEvent[]>())
          ).map(([date, events]) => (
            <div key={date} className="py-4">
              <p className="text-xs font-semibold text-(--text-secondary) uppercase tracking-wider mb-3">
                {formatDate(date)}
              </p>
              <div className="space-y-2">
                {events.map((event, i) => (
                  <div
                    key={`${event.ticker}-${i}`}
                    className="flex items-center gap-4 px-3 py-2 rounded-lg hover:bg-(--surface-2)/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{event.ticker}</span>
                        <span className="text-xs text-(--text-secondary) truncate">{event.name}</span>
                        {event.hour && (
                          <span className="text-[10px] text-(--text-secondary)/60 px-1.5 py-0.5 rounded bg-(--surface-2)">
                            {event.hour === "bmo" ? "Before Open" : event.hour === "amc" ? "After Close" : event.hour}
                          </span>
                        )}
                      </div>
                    </div>
                    {tab === "upcoming" ? (
                      <div className="text-right shrink-0">
                        {event.estimateEps !== null && (
                          <p className="text-xs text-(--text-secondary)">Est: ${event.estimateEps.toFixed(2)}</p>
                        )}
                        {event.revenueEstimate !== null && (
                          <p className="text-[10px] text-(--text-secondary)/60">Rev est: {formatCompactNumber(event.revenueEstimate)}</p>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            {event.estimateEps !== null && (
                              <span className="text-xs text-(--text-secondary)">Est: ${event.estimateEps.toFixed(2)}</span>
                            )}
                            {event.actualEps !== null && (
                              <span className="text-xs text-white">Act: ${event.actualEps.toFixed(2)}</span>
                            )}
                          </div>
                        </div>
                        {event.surprisePct !== null && (
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${
                              event.surprisePct > 0
                                ? "bg-(--up)/15 text-(--up)"
                                : event.surprisePct < 0
                                ? "bg-(--down)/15 text-(--down)"
                                : "bg-(--surface-2) text-(--text-secondary)"
                            }`}
                          >
                            {event.surprisePct > 0 ? "Beat" : event.surprisePct < 0 ? "Miss" : "Meet"}{" "}
                            {formatPercent(event.surprisePct)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-(--text-secondary) py-8 text-center">
          {tab === "upcoming" ? "No upcoming earnings in the next 7 days." : "No past earnings data."}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Replace `src/app/dashboard/earnings/page.tsx`**

```tsx
import { getLatestRun, getEarningsEvents } from "@/lib/db/queries";
import { EmptyState } from "@/components/ui/empty-state";
import { DataFreshness } from "@/components/ui/data-freshness";
import { EarningsView } from "./earnings-view";

export default async function EarningsPage() {
  const run = await getLatestRun();
  if (!run) return <EmptyState title="No earnings data" message="Earnings calendar will appear after the pipeline runs." />;

  const events = await getEarningsEvents(run.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.15em] uppercase text-(--accent) mb-1">Analysis</p>
          <h1 className="text-2xl font-bold text-white font-(family-name:--font-source-serif)">Earnings</h1>
        </div>
        <DataFreshness generatedAt={run.generatedAt} runDate={run.runDate} />
      </div>

      <div className="card-glow p-6">
        {events.length > 0 ? (
          <EarningsView events={events} />
        ) : (
          <p className="text-sm text-(--text-secondary) py-8 text-center">No earnings data available.</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify**

```bash
npm run build
```

Run `npm run dev`, navigate to `/dashboard/earnings`. Confirm:
- Upcoming tab shows earnings grouped by date
- Each event shows ticker, name, timing (BMO/AMC), and EPS estimate
- Past tab shows actual vs estimate with beat/miss badges
- Impact stats cards appear on past tab (beat rate, counts, avg surprise)
- Toggle between tabs works

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/earnings/
git commit -m "feat: build earnings page with upcoming calendar, past results, and impact stats"
```

---

## Task 8: Backtest Page

Performance comparison chart (algorithm picks vs S&P 500 benchmark) and detailed picks table.

**Files:**
- Create: `src/components/charts/performance-chart.tsx`
- Modify: `src/app/dashboard/backtest/page.tsx`

- [ ] **Step 1: Create `src/components/charts/performance-chart.tsx`**

Bar chart comparing portfolio return vs benchmark return.

```tsx
"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
  ReferenceLine,
} from "recharts";

type PerformanceData = {
  portfolioReturn: number | null;
  benchmarkReturn: number | null;
  outperformance: number | null;
};

export function PerformanceChart({ data }: { data: PerformanceData }) {
  const chartData = [
    { name: "Our Picks", value: data.portfolioReturn ?? 0 },
    { name: "S&P 500", value: data.benchmarkReturn ?? 0 },
  ];

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={chartData} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
        <XAxis
          dataKey="name"
          tick={{ fill: "#f0ede6", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v) => `${v > 0 ? "+" : ""}${v.toFixed(1)}%`}
          tick={{ fill: "#94a3b8", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            background: "#1a2235",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(value: number) => [`${value > 0 ? "+" : ""}${value.toFixed(2)}%`, "Return"]}
          labelStyle={{ color: "#f0ede6" }}
        />
        <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={60}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={i === 0 ? "#34D399" : "#94a3b8"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 2: Replace `src/app/dashboard/backtest/page.tsx`**

```tsx
import { getLatestRun, getBacktestData } from "@/lib/db/queries";
import { formatPercent, formatDate, formatCurrency } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";
import { DataFreshness } from "@/components/ui/data-freshness";
import { ChangeBadge } from "@/components/ui/change-badge";
import { PerformanceChart } from "@/components/charts/performance-chart";

export default async function BacktestPage() {
  const run = await getLatestRun();
  if (!run) return <EmptyState title="No backtest data" message="Backtest results will appear after the pipeline runs." />;

  const backtest = await getBacktestData(run.id);
  if (!backtest) return <EmptyState title="No backtest data" message="Backtest has not been run yet." />;

  const didOutperform = (backtest.outperformance ?? 0) > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.15em] uppercase text-(--accent) mb-1">Analysis</p>
          <h1 className="text-2xl font-bold text-white font-(family-name:--font-source-serif)">Backtest</h1>
        </div>
        <DataFreshness generatedAt={run.generatedAt} runDate={run.runDate} />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-glow p-5">
          <p className="text-xs text-(--text-secondary) uppercase tracking-wider mb-2">Our Picks</p>
          <ChangeBadge value={backtest.portfolioReturn} className="text-2xl font-bold" />
        </div>
        <div className="card-glow p-5">
          <p className="text-xs text-(--text-secondary) uppercase tracking-wider mb-2">S&P 500 Benchmark</p>
          <ChangeBadge value={backtest.benchmarkReturn} className="text-2xl font-bold" />
        </div>
        <div className="card-glow p-5">
          <p className="text-xs text-(--text-secondary) uppercase tracking-wider mb-2">Outperformance</p>
          <p className={`text-2xl font-bold ${didOutperform ? "text-(--up)" : "text-(--down)"}`}>
            {formatPercent(backtest.outperformance)}
          </p>
        </div>
      </div>

      {/* Period info + chart */}
      <div className="card-glow p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-(--text-secondary) uppercase tracking-wider">Performance Comparison</p>
          <p className="text-xs text-(--text-secondary)">
            {formatDate(backtest.simStartDate)} - {formatDate(backtest.simEndDate)}
            {backtest.lookbackDays && <span className="ml-1">({backtest.lookbackDays} trading days)</span>}
          </p>
        </div>
        <PerformanceChart data={backtest} />
      </div>

      {/* Picks detail */}
      {backtest.picks && backtest.picks.length > 0 && (
        <div className="card-glow p-6">
          <p className="text-xs text-(--text-secondary) uppercase tracking-wider mb-4">Individual Pick Performance</p>
          <div className="grid grid-cols-[4rem_1fr_5rem_5rem_5rem] gap-2 px-4 py-2 border-b border-(--border) show-desktop">
            <span className="text-xs text-(--text-secondary) uppercase tracking-wider">#</span>
            <span className="text-xs text-(--text-secondary) uppercase tracking-wider">Ticker</span>
            <span className="text-xs text-(--text-secondary) uppercase tracking-wider text-right">Start</span>
            <span className="text-xs text-(--text-secondary) uppercase tracking-wider text-right">End</span>
            <span className="text-xs text-(--text-secondary) uppercase tracking-wider text-right">Return</span>
          </div>
          <div className="divide-y divide-(--border)">
            {backtest.picks.map((pick, i) => (
              <div key={pick.ticker} className="grid grid-cols-[4rem_1fr_5rem_5rem_5rem] gap-2 px-4 py-3 items-center">
                <span className="text-xs font-mono text-(--text-secondary)">{i + 1}</span>
                <div>
                  <span className="text-sm font-semibold text-white">{pick.ticker}</span>
                  {pick.name && <span className="text-xs text-(--text-secondary) ml-2">{pick.name}</span>}
                </div>
                <span className="text-xs text-(--text-secondary) text-right">
                  {pick.start_price ? formatCurrency(pick.start_price) : "--"}
                </span>
                <span className="text-xs text-(--text-secondary) text-right">
                  {pick.end_price ? formatCurrency(pick.end_price) : "--"}
                </span>
                <div className="text-right">
                  <ChangeBadge value={pick.return_pct ?? null} className="text-xs" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-(--text-secondary)/60">
        Past performance does not indicate future results. Backtest uses a {backtest.lookbackDays ?? 20}-day lookback window.
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Verify**

```bash
npm run build
```

Run `npm run dev`, navigate to `/dashboard/backtest`. Confirm:
- Summary cards show our picks return, benchmark return, and outperformance
- Bar chart renders with two bars (green for picks, gray for benchmark)
- Individual picks table shows each stock with start/end price and return
- Disclaimer text at bottom

- [ ] **Step 4: Commit**

```bash
git add src/components/charts/performance-chart.tsx src/app/dashboard/backtest/page.tsx
git commit -m "feat: build backtest page with performance chart and picks breakdown"
```

---

## Task 9: Final Verification + Cleanup

- [ ] **Step 1: Full build check**

```bash
cd C:\Users\vasti\OneDrive\Desktop\extra\macrolyst
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 2: Manual verification checklist**

Run `npm run dev` and verify each page:

1. `/dashboard` - Market pulse cards, sector chart, top 5, catalyst section
2. `/dashboard/recommendations` - 50 stocks, sort works, filter works, expand works
3. `/dashboard/news` - Market/company tabs, sentiment filter, catalyst detail
4. `/dashboard/scanners` - All scanner tabs, correct counts, stock lists
5. `/dashboard/earnings` - Upcoming/past toggle, beat/miss badges, impact stats
6. `/dashboard/backtest` - Summary cards, bar chart, picks table

Verify responsive on mobile viewport (375px width):
- Cards stack vertically
- Tables scroll horizontally or adapt
- Sidebar hamburger still works
- No horizontal overflow

- [ ] **Step 3: Final commit (if any cleanup needed)**

```bash
git add -A
git commit -m "chore: cleanup after Plan 3 dashboard pages build"
```
