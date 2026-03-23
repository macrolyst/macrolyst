# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Strict Rules

1. **Always check the docs folder first.** Before implementing any new feature or fixing anything, read the relevant files in `docs/` for remaining implementation plans and design documentation. Do not skip this step.

2. **Minimize database reads/writes and Vercel serverless usage.** Always choose the solution that uses the fewest database queries, writes, and serverless function invocations. Batch where possible, use caching, avoid redundant fetches. Every DB call and serverless execution costs money.

3. **Consider ripple effects before every fix.** Never focus only on the immediate problem. Before applying any fix, trace how it affects the rest of the app. A fix must NOT break already-working features and workflows. If a change touches shared code, verify all consumers still work correctly.

4. **Do not assume — read first.** Before making any fix or change, read ALL relevant files completely. Do not guess how something works based on naming or conventions. Open the actual code, understand the full context, then act.

5. **When the user says "explain", only explain.** Never make code changes when the user asks for an explanation. Explain the code, the behavior, or the issue — nothing more. Only modify code when the user explicitly asks for a change.

6. **Subagents are for research only.** Use subagents (Agent tool) only for searching, reading files, and gathering information. All code fixes and edits must be done inline in the main conversation, one by one. Never delegate code changes to a subagent.

## Commands

- `npm run dev` - Start dev server (Turbopack)
- `npm run build` - Production build
- `npm run lint` - ESLint (flat config, ESLint 9)
- `npx drizzle-kit generate` - Generate DB migrations from schema changes
- `npx drizzle-kit push` - Push schema changes directly to database
- `npx drizzle-kit migrate` - Run pending migrations

Environment variables are in `.env.local` (POSTGRES_URL, NEON_AUTH_BASE_URL, NEON_AUTH_COOKIE_SECRET, FINNHUB_API_KEY).

## Architecture

**Macrolyst** is a stock market analysis app with paper trading. Two-repo architecture: this Next.js app serves the UI and user-facing features; a separate Python pipeline (`macrolyst-pipeline`) writes analysis data to the same Vercel Postgres (Neon) database daily.

### Data flow

- **Analysis data** (14 tables): Written by the Python pipeline at ~6 AM CDT weekdays. All keyed by `runId` from `analysisRuns`. Read-only from this app's perspective.
- **User data** (5 tables: portfolios, trades, challenges, challengeSnapshots, watchlist): Read/write via server actions in `src/lib/actions/`.
- **Real-time prices**: Fetched from Finnhub/Yahoo Finance via API routes in `src/app/api/prices/` and `src/app/api/search/`. In-memory LRU cache (500 entries) with TTLs (quotes: 5s, candles: 5min, search: 1hr).

### Key layers

- **Database**: Drizzle ORM with Vercel Postgres. Schema in `src/lib/db/schema/` (analysis.ts for pipeline tables, trading.ts for user tables). Cached query functions in `src/lib/db/queries.ts` use `unstable_cache` with 1hr TTL.
- **Auth**: Neon Auth with custom cookie-based middleware (`src/middleware.ts`). Cookie name: `__Secure-neon-auth.session_token` (prod) / `neon-auth.session_token` (dev). Zero network calls in middleware - just checks cookie existence.
- **Server actions**: `src/lib/actions/trading.ts` (portfolio CRUD, trade execution, holdings aggregation) and `src/lib/actions/watchlist.ts`.
- **API routes**: `/api/prices/quote`, `/api/prices/batch`, `/api/prices/candles`, `/api/search` - all GET endpoints wrapping Finnhub/Yahoo with caching.

### Dashboard pages

9 pages under `/dashboard`: overview, recommendations (top 50 scored stocks), news, scanners (6 technical types), earnings, backtest, trading (paper), challenges, watchlist. Each reads from the analysis tables via cached queries.

### Styling

Tailwind CSS v4 with CSS custom properties in `globals.css`. Dark theme with emerald accent (`--accent: #34D399`). Fonts: DM Sans (body), Source Serif 4 (accent). Path alias: `@/*` maps to `./src/*`.

### Pipeline repo (`macrolyst-pipeline`)

Located at `C:\Users\vasti\OneDrive\Desktop\extra\macrolyst-pipeline`. A Python pipeline that runs via GitHub Actions cron at 6 AM CDT weekdays (11 AM UTC). Four sequential stages:

1. **`01_clean.py`** — Fetches S&P 500 tickers (Wikipedia), 60-day daily prices (yfinance), fundamentals (yfinance .info), macro indicators (FRED: VIX, Treasury yields, Fed funds), SPY hourly bars. Outputs CSVs to `data/cleaned/`. ~10-12 min (fundamentals throttled at 0.1s/ticker).
2. **`02_fetch_news.py`** — Fetches market news, company news (top 50 movers), earnings calendar from Finnhub. Optional — pipeline continues if this fails (`continue-on-error: true`). ~2-3 min.
3. **`03_transform.py`** — Calculates technicals (RSI, MACD, Bollinger, volume spikes), composite scoring (5 weighted factors: analyst 30%, technical 25%, momentum 20%, volume 10%, news 15%), builds 7 scanners, sector performance, backtesting, catalyst timeline, earnings impact. Outputs `dashboard_data.json`. ~30-60s.
4. **`04_write_db.py`** — Writes to 12+ tables via psycopg2 `execute_values()` bulk inserts. Deletes old run for same date first, then inserts. Prunes data older than 45 days. Evaluates past picks returns (1d/5d/10d/20d). ~10-20s.

Config lives in `scripts/config.py` (single source of truth for all scoring weights, thresholds, API settings). Env vars: `DATABASE_URL`, `FINNHUB_API_KEY`, `FRED_API_KEY`.

Key behaviors:
- Scoring weights auto-adjust if news data is unavailable (analyst goes to 35%, technical to 30%).
- Uses trading day counts (not calendar days) for picks evaluation.
- Catalyst timeline requires 7+ hourly bars to be considered a full trading day.
- Only top 50 movers get company news fetched (limits Finnhub API calls).

### Important patterns

- Drizzle returns strings for decimal columns — use `parseFloat()` when reading numeric values.
- The Python pipeline owns data writes to analysis tables; this app only reads them. Never write to analysis tables from the Next.js app.
- Drizzle owns all schema/migrations; the pipeline uses raw SQL (psycopg2) for writes. Schema changes must be made here, then pipeline SQL updated to match.
- Market hours helper (`src/lib/market-hours.ts`) determines 9:30 AM - 4 PM ET trading window.
- Price polling pauses on tab hidden and after 5 min inactivity.
