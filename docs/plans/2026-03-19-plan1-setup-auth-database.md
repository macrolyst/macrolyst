# Plan 1: Project Setup + Auth + Database

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the Macrolyst Next.js app with Neon Auth, full database schema, dashboard sidebar layout, and placeholder pages for all routes.

**Architecture:** Next.js 15 App Router with Turbopack, Neon Auth for authentication (email/password signup & login), Drizzle ORM managing all schema migrations against Vercel Postgres (Neon). Dark-themed dashboard layout with collapsible sidebar wrapping all `/dashboard/*` routes.

**Tech Stack:** Next.js 15, Tailwind CSS v4, Neon Auth, Drizzle ORM, Vercel Postgres (Neon), TypeScript

**Spec:** `docs/specs/2026-03-19-macrolyst-design.md`

---

## File Structure

```
macrolyst-app/
├── app/
│   ├── layout.tsx                          # Root layout (fonts, NeonAuthUIProvider)
│   ├── page.tsx                            # Landing page
│   ├── auth/
│   │   ├── sign-in/
│   │   │   └── page.tsx                    # Sign-in page
│   │   └── sign-up/
│   │       └── page.tsx                    # Sign-up page
│   ├── api/
│   │   └── auth/
│   │       └── [...path]/
│   │           └── route.ts                # Neon Auth API handler
│   └── dashboard/
│       ├── layout.tsx                      # Sidebar + protected layout
│       ├── page.tsx                        # Dashboard home
│       ├── recommendations/
│       │   └── page.tsx
│       ├── news/
│       │   └── page.tsx
│       ├── scanners/
│       │   └── page.tsx
│       ├── earnings/
│       │   └── page.tsx
│       ├── backtest/
│       │   └── page.tsx
│       ├── trading/
│       │   └── page.tsx
│       ├── challenges/
│       │   └── page.tsx
│       └── watchlist/
│           └── page.tsx
├── components/
│   ├── sidebar.tsx                         # Dashboard sidebar navigation
│   ├── sidebar-link.tsx                    # Active-aware nav link
│   └── providers.tsx                       # Client-side providers wrapper
├── lib/
│   ├── auth/
│   │   ├── client.ts                       # Neon Auth client-side SDK
│   │   └── server.ts                       # Neon Auth server-side SDK
│   └── db/
│       ├── index.ts                        # Drizzle client instance
│       └── schema/
│           ├── analysis.ts                 # Pipeline-written tables
│           ├── trading.ts                  # Paper trading + challenges tables
│           └── index.ts                    # Re-exports all schemas
├── middleware.ts                            # Neon Auth middleware (route protection)
├── drizzle.config.ts                       # Drizzle Kit configuration
├── .env.local                              # Local env vars (not committed)
├── .env.example                            # Template for env vars (committed)
├── package.json
└── .gitignore
```

Note: No auth schema files needed -- Neon Auth manages its own user/session tables automatically.

---

## Prerequisites

Before starting, the user needs:
1. A GitHub repo created (`macrolyst-app`)
2. A Vercel Neon Postgres database with Auth enabled (already done)
3. The `POSTGRES_URL` and `NEON_AUTH_BASE_URL` values from Vercel dashboard

---

### Task 1: Scaffold Next.js 15 Project

**Files:**
- Create: entire project scaffold via `create-next-app`

- [ ] **Step 1: Create the Next.js project**

```bash
cd C:\Users\vasti\OneDrive\Desktop\extra\macrolyst
npx create-next-app@latest macrolyst-app --typescript --tailwind --eslint --app --src=no --turbopack --import-alias "@/*"
```

- [ ] **Step 2: Verify dev server starts**

```bash
cd macrolyst-app
npm run dev
```

Expected: Dev server starts on `http://localhost:3000` with Turbopack. Kill with `Ctrl+C`.

- [ ] **Step 3: Clean up boilerplate**

Replace `app/page.tsx`:

```tsx
export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0B1120]">
      <h1 className="text-4xl font-bold text-white">Macrolyst</h1>
    </main>
  );
}
```

- [ ] **Step 4: Set up fonts and dark theme**

Replace `app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { DM_Sans, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
});

export const metadata: Metadata = {
  title: "Macrolyst",
  description: "Stock market analysis and paper trading platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${dmSans.variable} ${sourceSerif.variable}`}>
      <body className="bg-[#0B1120] text-[#f0ede6] antialiased font-[family-name:var(--font-dm-sans)]">
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Add CSS custom properties**

Add to the top of `app/globals.css` (after Tailwind imports):

```css
:root {
  --surface-0: #0B1120;
  --surface-1: #111827;
  --surface-2: #1a2235;
  --accent: #60A5FA;
  --up: #34D399;
  --down: #F87171;
  --gold: #FBBF24;
  --text-primary: #f0ede6;
  --text-secondary: #94a3b8;
}
```

- [ ] **Step 6: Verify and commit**

```bash
npm run dev
```

Visit `http://localhost:3000`. Should see "Macrolyst" centered on dark background.

```bash
git add -A
git commit -m "Scaffold Next.js 15 project with dark theme and fonts"
```

---

### Task 2: Install Dependencies

- [ ] **Step 1: Install Drizzle ORM + Vercel Postgres**

```bash
npm install drizzle-orm @vercel/postgres
npm install -D drizzle-kit dotenv
```

- [ ] **Step 2: Install Neon Auth**

```bash
npm install @neondatabase/auth@latest
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "Install Drizzle ORM and Neon Auth"
```

---

### Task 3: Environment Variables

- [ ] **Step 1: Create `.env.example`**

```env
# Database (from Vercel dashboard > Storage > macrolyst-db)
POSTGRES_URL=

# Neon Auth
NEON_AUTH_BASE_URL=
NEON_AUTH_COOKIE_SECRET=
```

- [ ] **Step 2: Create `.env.local` with actual values**

```env
POSTGRES_URL=your-postgres-url-from-vercel
NEON_AUTH_BASE_URL=your-neon-auth-url-from-vercel
NEON_AUTH_COOKIE_SECRET=generate-with-command-below
```

Generate the cookie secret:

```bash
openssl rand -base64 32
```

Copy the output and paste it as `NEON_AUTH_COOKIE_SECRET`.

- [ ] **Step 3: Verify `.env.local` is in `.gitignore`**

Next.js scaffold includes this by default. Confirm `.env*.local` is listed.

- [ ] **Step 4: Commit**

```bash
git add .env.example
git commit -m "Add environment variable template"
```

---

### Task 4: Neon Auth Setup

**Files:**
- Create: `lib/auth/client.ts`
- Create: `lib/auth/server.ts`
- Create: `app/api/auth/[...path]/route.ts`
- Create: `middleware.ts`
- Create: `components/providers.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Create auth client**

Create `lib/auth/client.ts`:

```typescript
"use client";

import { createAuthClient } from "@neondatabase/auth/next";

export const authClient = createAuthClient();
```

- [ ] **Step 2: Create auth server**

Create `lib/auth/server.ts`:

```typescript
import { createNeonAuth } from "@neondatabase/auth/next/server";

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET!,
  },
});
```

- [ ] **Step 3: Create API route handler**

Create `app/api/auth/[...path]/route.ts`:

```typescript
import { auth } from "@/lib/auth/server";

export const { GET, POST } = auth.handler();
```

- [ ] **Step 4: Create middleware for route protection**

Create `middleware.ts` at project root:

```typescript
import { auth } from "@/lib/auth/server";

export default auth.middleware({
  loginUrl: "/auth/sign-in",
});

export const config = {
  matcher: ["/dashboard/:path*"],
};
```

- [ ] **Step 5: Create providers wrapper**

Create `components/providers.tsx`:

```tsx
"use client";

import { NeonAuthUIProvider } from "@neondatabase/auth/react";
import "@neondatabase/auth/ui/css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <NeonAuthUIProvider
      authClient={authClient}
      navigate={router.push}
      replace={router.replace}
      onSessionChange={router.refresh}
      Link={Link}
    >
      {children}
    </NeonAuthUIProvider>
  );
}
```

- [ ] **Step 6: Wrap root layout with providers**

Update `app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { DM_Sans, Source_Serif_4 } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
});

export const metadata: Metadata = {
  title: "Macrolyst",
  description: "Stock market analysis and paper trading platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${dmSans.variable} ${sourceSerif.variable}`}>
      <body className="bg-[#0B1120] text-[#f0ede6] antialiased font-[family-name:var(--font-dm-sans)]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add lib/auth/ app/api/auth/ middleware.ts components/providers.tsx app/layout.tsx
git commit -m "Configure Neon Auth with middleware and providers"
```

---

### Task 5: Auth Pages (Sign In + Sign Up)

**Files:**
- Create: `app/auth/sign-in/page.tsx`
- Create: `app/auth/sign-up/page.tsx`

- [ ] **Step 1: Create sign-in page**

Create `app/auth/sign-in/page.tsx`:

```tsx
import { AuthView } from "@neondatabase/auth/react";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-0)]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white font-[family-name:var(--font-source-serif)]">
            Macrolyst
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-2">
            Sign in to your account
          </p>
        </div>
        <AuthView pathname="sign-in" />
        <p className="text-xs text-center text-[var(--text-secondary)] mt-6">
          Not financial advice. For educational purposes only.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create sign-up page**

Create `app/auth/sign-up/page.tsx`:

```tsx
import { AuthView } from "@neondatabase/auth/react";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-0)]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white font-[family-name:var(--font-source-serif)]">
            Macrolyst
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-2">
            Create your account
          </p>
        </div>
        <AuthView pathname="sign-up" />
        <p className="text-xs text-center text-[var(--text-secondary)] mt-6">
          Not financial advice. For educational purposes only.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify**

```bash
npm run dev
```

Visit `http://localhost:3000/auth/sign-up`. Should see a signup form. Create a test account. Then visit `http://localhost:3000/auth/sign-in` and log in.

- [ ] **Step 4: Commit**

```bash
git add app/auth/
git commit -m "Add sign-in and sign-up pages"
```

---

### Task 6: Database Schema -- Analysis Tables

**Files:**
- Create: `lib/db/schema/analysis.ts`

- [ ] **Step 1: Create analysis schema**

Create `lib/db/schema/analysis.ts`:

```typescript
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
    runId: integer("run_id")
      .notNull()
      .references(() => analysisRuns.id, { onDelete: "cascade" }),
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
  runId: integer("run_id")
    .notNull()
    .references(() => analysisRuns.id, { onDelete: "cascade" })
    .unique(),
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
  runId: integer("run_id")
    .notNull()
    .references(() => analysisRuns.id, { onDelete: "cascade" }),
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
    runId: integer("run_id")
      .notNull()
      .references(() => analysisRuns.id, { onDelete: "cascade" }),
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
    runId: integer("run_id")
      .notNull()
      .references(() => analysisRuns.id, { onDelete: "cascade" }),
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
    runId: integer("run_id")
      .notNull()
      .references(() => analysisRuns.id, { onDelete: "cascade" }),
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
  runId: integer("run_id")
    .notNull()
    .references(() => analysisRuns.id, { onDelete: "cascade" }),
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
  runId: integer("run_id")
    .notNull()
    .references(() => analysisRuns.id, { onDelete: "cascade" })
    .unique(),
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
  timelineId: integer("timeline_id")
    .notNull()
    .references(() => catalystTimeline.id, { onDelete: "cascade" }),
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
  hourId: integer("hour_id")
    .notNull()
    .references(() => catalystHours.id, { onDelete: "cascade" }),
  headline: text(),
  source: text(),
  url: text(),
  time: text(),
});

export const backtestResults = pgTable("backtest_results", {
  id: serial().primaryKey(),
  runId: integer("run_id")
    .notNull()
    .references(() => analysisRuns.id, { onDelete: "cascade" })
    .unique(),
  simStartDate: date("sim_start_date"),
  simEndDate: date("sim_end_date"),
  lookbackDays: integer("lookback_days"),
  portfolioReturn: decimal("portfolio_return", { precision: 8, scale: 2 }),
  benchmarkReturn: decimal("benchmark_return", { precision: 8, scale: 2 }),
  outperformance: decimal({ precision: 8, scale: 2 }),
  picks: jsonb(),
});
```

- [ ] **Step 2: Commit**

```bash
git add lib/db/schema/analysis.ts
git commit -m "Add analysis tables schema"
```

---

### Task 7: Database Schema -- Trading Tables + Drizzle Client

**Files:**
- Create: `lib/db/schema/trading.ts`
- Create: `lib/db/schema/index.ts`
- Create: `lib/db/index.ts`

- [ ] **Step 1: Create trading schema**

Create `lib/db/schema/trading.ts`:

```typescript
import {
  pgTable,
  uuid,
  serial,
  integer,
  text,
  date,
  timestamp,
  decimal,
  jsonb,
  index,
  unique,
} from "drizzle-orm/pg-core";

export const portfolios = pgTable("portfolios", {
  id: uuid().defaultRandom().primaryKey(),
  userId: text("user_id").notNull(), // references Neon Auth user ID
  name: text().default("My Portfolio"),
  startingBalance: decimal("starting_balance", { precision: 12, scale: 2 }).default("100000.00"),
  currentCash: decimal("current_cash", { precision: 12, scale: 2 }).default("100000.00"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

export const trades = pgTable(
  "trades",
  {
    id: uuid().defaultRandom().primaryKey(),
    portfolioId: uuid("portfolio_id")
      .notNull()
      .references(() => portfolios.id, { onDelete: "cascade" }),
    ticker: text().notNull(),
    action: text().notNull(),
    shares: integer().notNull(),
    price: decimal({ precision: 10, scale: 2 }).notNull(),
    total: decimal({ precision: 12, scale: 2 }).notNull(),
    executedAt: timestamp("executed_at", { mode: "date" }).defaultNow(),
  },
  (table) => [
    index("trades_portfolio_executed_idx").on(table.portfolioId, table.executedAt),
  ]
);

export const challenges = pgTable("challenges", {
  id: uuid().defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  portfolioId: uuid("portfolio_id")
    .notNull()
    .references(() => portfolios.id, { onDelete: "cascade" }),
  durationDays: integer("duration_days").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  startingBalance: decimal("starting_balance", { precision: 12, scale: 2 }).default("100000.00"),
  algoPicks: jsonb("algo_picks"),
  status: text().default("active"),
  result: text(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

export const challengeSnapshots = pgTable(
  "challenge_snapshots",
  {
    id: serial().primaryKey(),
    challengeId: uuid("challenge_id")
      .notNull()
      .references(() => challenges.id, { onDelete: "cascade" }),
    date: date().notNull(),
    userPortfolioValue: decimal("user_portfolio_value", { precision: 12, scale: 2 }),
    algoPortfolioValue: decimal("algo_portfolio_value", { precision: 12, scale: 2 }),
  },
  (table) => [
    unique("challenge_snapshots_challenge_date_uniq").on(table.challengeId, table.date),
  ]
);

export const watchlist = pgTable(
  "watchlist",
  {
    id: serial().primaryKey(),
    userId: text("user_id").notNull(),
    ticker: text().notNull(),
    addedAt: timestamp("added_at", { mode: "date" }).defaultNow(),
  },
  (table) => [
    unique("watchlist_user_ticker_uniq").on(table.userId, table.ticker),
    index("watchlist_user_idx").on(table.userId),
  ]
);
```

Note: `userId` is `text` (not UUID) because Neon Auth manages its own user table. We store the Neon Auth user ID as a string reference.

- [ ] **Step 2: Create schema index**

Create `lib/db/schema/index.ts`:

```typescript
export * from "./analysis";
export * from "./trading";
```

- [ ] **Step 3: Create Drizzle client**

Create `lib/db/index.ts`:

```typescript
import { sql } from "@vercel/postgres";
import { drizzle } from "drizzle-orm/vercel-postgres";
import * as schema from "./schema";

export const db = drizzle({ client: sql, schema });
```

- [ ] **Step 4: Commit**

```bash
git add lib/db/
git commit -m "Add trading schema and Drizzle client"
```

---

### Task 8: Drizzle Config + Push Schema

**Files:**
- Create: `drizzle.config.ts`

- [ ] **Step 1: Create Drizzle config**

Create `drizzle.config.ts`:

```typescript
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });

export default defineConfig({
  schema: "./lib/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.POSTGRES_URL!,
  },
});
```

- [ ] **Step 2: Generate migration**

```bash
npx drizzle-kit generate
```

Expected: Creates migration SQL files in `drizzle/` directory.

- [ ] **Step 3: Push schema to database**

```bash
npx drizzle-kit push
```

Expected: All tables created in Neon Postgres.

- [ ] **Step 4: Verify tables exist**

```bash
npx drizzle-kit studio
```

Opens Drizzle Studio in browser. Verify tables are visible: `analysis_runs`, `daily_prices`, `market_summary`, `sector_performance`, `stock_scores`, `scanner_results`, `news_articles`, `earnings_events`, `catalyst_timeline`, `catalyst_hours`, `catalyst_news`, `backtest_results`, `portfolios`, `trades`, `challenges`, `challenge_snapshots`, `watchlist`.

You'll also see Neon Auth's own tables (users, sessions, etc.) which it manages automatically.

- [ ] **Step 5: Commit**

```bash
git add drizzle.config.ts drizzle/
git commit -m "Add Drizzle config and initial migration"
```

---

### Task 9: Sidebar Component

**Files:**
- Create: `components/sidebar-link.tsx`
- Create: `components/sidebar.tsx`

- [ ] **Step 1: Create sidebar link**

Create `components/sidebar-link.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SidebarLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={`flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
        isActive
          ? "bg-[var(--accent)]/10 text-[var(--accent)]"
          : "text-[var(--text-secondary)] hover:text-white hover:bg-white/5"
      }`}
    >
      {label}
    </Link>
  );
}
```

- [ ] **Step 2: Create sidebar**

Create `components/sidebar.tsx`:

```tsx
"use client";

import { useState } from "react";
import { UserButton } from "@neondatabase/auth/react";
import { SidebarLink } from "./sidebar-link";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/recommendations", label: "Recommendations" },
  { href: "/dashboard/news", label: "News & Catalysts" },
  { href: "/dashboard/scanners", label: "Scanners" },
  { href: "/dashboard/earnings", label: "Earnings" },
  { href: "/dashboard/backtest", label: "Backtest" },
  { href: "/dashboard/trading", label: "Paper Trading" },
  { href: "/dashboard/challenges", label: "Challenges" },
  { href: "/dashboard/watchlist", label: "Watchlist" },
];

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden rounded-lg bg-[var(--surface-1)] border border-white/10 p-2 text-white cursor-pointer"
        aria-label="Open menu"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <rect y="3" width="20" height="2" rx="1" />
          <rect y="9" width="20" height="2" rx="1" />
          <rect y="15" width="20" height="2" rx="1" />
        </svg>
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-[var(--surface-1)] border-r border-white/10 flex flex-col transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 lg:static lg:z-auto`}
      >
        <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
          <span className="text-lg font-bold text-white font-[family-name:var(--font-source-serif)]">
            Macrolyst
          </span>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden text-[var(--text-secondary)] hover:text-white cursor-pointer"
            aria-label="Close menu"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <div key={item.href} onClick={() => setMobileOpen(false)}>
              <SidebarLink {...item} />
            </div>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-white/10">
          <UserButton />
        </div>
      </aside>
    </>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/sidebar.tsx components/sidebar-link.tsx
git commit -m "Add sidebar with Neon Auth UserButton"
```

---

### Task 10: Dashboard Layout + Placeholder Pages

**Files:**
- Create: `app/dashboard/layout.tsx`
- Create: `app/dashboard/page.tsx` + 8 placeholder pages

- [ ] **Step 1: Create dashboard layout**

Create `app/dashboard/layout.tsx`:

```tsx
import { Sidebar } from "@/components/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 lg:ml-0 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
```

Note: Route protection is handled by `middleware.ts` -- no need to check session here.

- [ ] **Step 2: Create dashboard home**

Create `app/dashboard/page.tsx`:

```tsx
export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-source-serif)] mb-2">
        Dashboard
      </h1>
      <p className="text-[var(--text-secondary)]">
        Market pulse, sectors, and what happened yesterday.
      </p>
      <div className="mt-8 rounded-lg border border-white/10 bg-[var(--surface-1)] p-8 text-center text-[var(--text-secondary)]">
        Analysis data will appear here once the pipeline runs.
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create all placeholder pages**

Create each with this pattern (change title and description for each):

`app/dashboard/recommendations/page.tsx`:
```tsx
export default function RecommendationsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-source-serif)] mb-2">Recommendations</h1>
      <p className="text-[var(--text-secondary)]">Top 50 scored stocks with analysis breakdown.</p>
    </div>
  );
}
```

`app/dashboard/news/page.tsx`:
```tsx
export default function NewsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-source-serif)] mb-2">News & Catalysts</h1>
      <p className="text-[var(--text-secondary)]">Market news, company headlines, and catalyst timeline.</p>
    </div>
  );
}
```

`app/dashboard/scanners/page.tsx`:
```tsx
export default function ScannersPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-source-serif)] mb-2">Scanners</h1>
      <p className="text-[var(--text-secondary)]">RSI, MACD, volume, and technical pattern scanners.</p>
    </div>
  );
}
```

`app/dashboard/earnings/page.tsx`:
```tsx
export default function EarningsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-source-serif)] mb-2">Earnings</h1>
      <p className="text-[var(--text-secondary)]">Upcoming calendar, past results, and impact analysis.</p>
    </div>
  );
}
```

`app/dashboard/backtest/page.tsx`:
```tsx
export default function BacktestPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-source-serif)] mb-2">Backtest</h1>
      <p className="text-[var(--text-secondary)]">Historical pick performance vs benchmark.</p>
    </div>
  );
}
```

`app/dashboard/trading/page.tsx`:
```tsx
export default function TradingPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-source-serif)] mb-2">Paper Trading</h1>
      <p className="text-[var(--text-secondary)]">Portfolio, buy/sell stocks, and trade history.</p>
    </div>
  );
}
```

`app/dashboard/challenges/page.tsx`:
```tsx
export default function ChallengesPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-source-serif)] mb-2">Challenges</h1>
      <p className="text-[var(--text-secondary)]">Test your picks against our algorithm.</p>
    </div>
  );
}
```

`app/dashboard/watchlist/page.tsx`:
```tsx
export default function WatchlistPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-source-serif)] mb-2">Watchlist</h1>
      <p className="text-[var(--text-secondary)]">Your personal stock watchlist.</p>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/
git commit -m "Add dashboard layout with sidebar and placeholder pages"
```

---

### Task 11: Landing Page

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Update landing page**

Replace `app/page.tsx`:

```tsx
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--surface-0)] px-4">
      <h1 className="text-5xl sm:text-6xl font-bold text-white font-[family-name:var(--font-source-serif)] text-center">
        Macrolyst
      </h1>
      <p className="mt-4 text-lg text-[var(--text-secondary)] text-center max-w-md">
        S&P 500 analysis, paper trading, and challenge mode.
        Prove the data works -- or beat it yourself.
      </p>
      <div className="mt-8 flex gap-4">
        <Link
          href="/auth/sign-up"
          className="rounded-lg bg-[var(--accent)] px-6 py-3 text-sm font-medium text-[var(--surface-0)] hover:opacity-90 transition-opacity"
        >
          Get Started
        </Link>
        <Link
          href="/auth/sign-in"
          className="rounded-lg bg-[var(--surface-1)] border border-white/10 px-6 py-3 text-sm font-medium text-white hover:bg-[var(--surface-2)] transition-colors"
        >
          Sign In
        </Link>
      </div>
      <p className="mt-12 text-xs text-[var(--text-secondary)]">
        Not financial advice. For educational and informational purposes only.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Verify and commit**

```bash
npm run dev
```

Visit `http://localhost:3000`. See landing page with "Get Started" and "Sign In" buttons.

```bash
git add app/page.tsx
git commit -m "Add landing page with auth links"
```

---

### Task 12: End-to-End Verification

- [ ] **Step 1: Full flow test**

```bash
npm run dev
```

1. Visit `/` -- see landing page
2. Click "Get Started" -- go to `/auth/sign-up`
3. Create an account with email/password
4. Redirected to `/dashboard` -- see sidebar + dashboard page
5. Click each sidebar link -- each page loads
6. On mobile viewport: hamburger menu works
7. Click UserButton in sidebar -- sign out
8. Visit `/dashboard` directly -- redirected to `/auth/sign-in`

- [ ] **Step 2: Build check**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Push to GitHub and deploy**

```bash
git remote add origin https://github.com/ParashDev/macrolyst-app.git
git push -u origin main
```

Then connect the repo to Vercel:
1. Go to Vercel dashboard
2. Click "Add New Project"
3. Import `macrolyst-app` repo
4. Connect it to the `macrolyst-db` storage (Vercel auto-injects env vars)
5. Add `NEON_AUTH_COOKIE_SECRET` to the project env vars manually
6. Deploy

- [ ] **Step 4: Verify production**

Visit the deployed URL. Full flow should work: landing page, signup, dashboard, all pages, sign out.

---

## What This Plan Produces

- Deployable Next.js 15 app with dark theme, DM Sans + Source Serif 4 fonts
- Neon Auth with email/password signup and login (no OAuth setup needed)
- Full database schema (17 app tables + Neon Auth tables) in Vercel Postgres
- Protected `/dashboard/*` routes via middleware
- Sidebar with UserButton (sign out, profile)
- Mobile-responsive hamburger menu
- Placeholder pages for all 9 dashboard routes
- Landing page with sign-up/sign-in CTAs
- Ready for Plan 2 (pipeline) to start writing data to the database
