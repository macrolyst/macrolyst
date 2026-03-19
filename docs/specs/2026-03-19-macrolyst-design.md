# Macrolyst -- Product Design Spec

## Overview

Macrolyst is a stock market analysis web application that provides daily S&P 500 analysis, real-time price data, and paper trading with a challenge mode where users test their picks against the algorithm's recommendations. It is a data platform, not financial advice.

**Domain:** macrolyst.com

---

## Architecture

Two repositories, one database.

### Pipeline Repo (Private): `macrolyst-pipeline`

- **Language:** Python
- **Runs on:** GitHub Actions (cron, 6 AM CDT weekdays)
- **Data sources:**
  - yfinance -- historical prices, fundamentals, analyst targets
  - Finnhub (free tier) -- news, sentiment, earnings calendar, company news
  - FRED -- macro indicators (VIX, treasury yields, fed funds rate)
  - Wikipedia -- S&P 500 constituent list
- **Output:** Writes analysis results directly to Vercel Postgres via psycopg2
- **Pipeline steps:**
  1. Fetch S&P 500 tickers + daily prices (1 year)
  2. Fetch fundamentals (analyst targets, P/E, market cap)
  3. Fetch macro indicators
  4. Fetch SPY hourly data (5 days, for catalyst timeline)
  5. Fetch market + company news, sentiment scoring
  6. Fetch earnings calendar + past earnings
  7. Calculate technicals (RSI, MACD, Bollinger, MAs, volume signals)
  8. Score all stocks (analyst upside, technical, momentum, volume, news sentiment)
  9. Build sector-relative rankings + risk metrics
  10. Run backtest (20-day lookback)
  11. Analyze earnings impact
  12. Build catalyst timeline (hourly SPY + matched news)
  13. Write all results to Vercel Postgres (upsert: delete existing rows for the same run_date, then insert)
- **Error handling:** Each step runs independently. If a step fails (API timeout, rate limit), it logs the error and continues. The `analysis_runs.status` column records which data sources succeeded. The app checks `data_status` to show/hide sections accordingly. If step 1 (prices) fails, the pipeline aborts entirely since all analysis depends on it.

### App Repo (Public or Private): `macrolyst-app`

- **Framework:** Next.js 15 (App Router, Turbopack for dev)
- **Styling:** Tailwind CSS v4
- **Auth:** Auth.js v5 (Google, GitHub, email/password)
- **Database:** Vercel Postgres
- **ORM:** Drizzle ORM (owns all schema migrations)
- **Real-time:** Finnhub websocket for live prices during market hours
- **Hosting:** Vercel
- **Dark theme** inherited from current design sensibility

### Schema Ownership

The app repo (`macrolyst-app`) owns all database migrations via Drizzle ORM. The pipeline repo uses raw SQL (psycopg2) to write to the analysis tables, but never creates or alters tables. When the schema needs to change, the migration is created in the app repo and deployed first, then the pipeline code is updated to match.

---

## Database Schema

### Auth (managed by Auth.js v5)

```
users
  id              UUID PRIMARY KEY
  name            TEXT
  email           TEXT UNIQUE
  email_verified  TIMESTAMP
  image           TEXT
  password        TEXT  -- hashed, for email/password auth (NULL for OAuth users)
  created_at      TIMESTAMP DEFAULT NOW()

verification_tokens
  identifier  TEXT NOT NULL
  token       TEXT NOT NULL UNIQUE
  expires     TIMESTAMP NOT NULL

accounts
  id                  UUID PRIMARY KEY
  user_id             UUID REFERENCES users
  type                TEXT
  provider            TEXT
  provider_account_id TEXT
  refresh_token       TEXT
  access_token        TEXT
  expires_at          INTEGER
  token_type          TEXT
  scope               TEXT
  id_token            TEXT

sessions
  id            UUID PRIMARY KEY
  session_token TEXT UNIQUE
  user_id       UUID REFERENCES users
  expires       TIMESTAMP
```

### Analysis (written by Python pipeline)

```
analysis_runs
  id            SERIAL PRIMARY KEY
  run_date      DATE UNIQUE  -- one run per day; re-runs replace previous
  generated_at  TIMESTAMP
  market_date   DATE
  data_status   JSONB  -- { prices: true, news: true, macro: true, earnings: false }
  status        TEXT DEFAULT 'complete'  -- 'complete', 'partial'

daily_prices
  id        SERIAL PRIMARY KEY
  run_id    INTEGER REFERENCES analysis_runs
  date      DATE
  ticker    TEXT
  open      DECIMAL(10,2)
  high      DECIMAL(10,2)
  low       DECIMAL(10,2)
  close     DECIMAL(10,2)
  volume    BIGINT
  INDEX(run_id, ticker, date)
  INDEX(ticker, date)

market_summary
  id              SERIAL PRIMARY KEY
  run_id          INTEGER REFERENCES analysis_runs UNIQUE
  market_breadth  TEXT
  avg_change      DECIMAL(8,4)
  advancers       INTEGER
  decliners       INTEGER
  breadth_ratio   DECIMAL(5,2)
  vix             DECIMAL(6,2)
  treasury_10y    DECIMAL(5,2)
  treasury_2y     DECIMAL(5,2)
  fed_funds       DECIMAL(5,2)

sector_performance
  id          SERIAL PRIMARY KEY
  run_id      INTEGER REFERENCES analysis_runs
  sector      TEXT
  avg_change  DECIMAL(8,4)
  stock_count INTEGER
  advancers   INTEGER
  color       TEXT

stock_scores
  id                    SERIAL PRIMARY KEY
  run_id                INTEGER REFERENCES analysis_runs
  rank                  INTEGER
  ticker                TEXT
  name                  TEXT
  sector                TEXT
  price                 DECIMAL(10,2)
  change_1d             DECIMAL(8,4)
  change_5d             DECIMAL(8,4)
  change_20d            DECIMAL(8,4)
  target_mean           DECIMAL(10,2)
  upside_pct            DECIMAL(8,2)
  composite_score       DECIMAL(5,1)
  score_analyst         DECIMAL(5,1)
  score_technical       DECIMAL(5,1)
  score_momentum        DECIMAL(5,1)
  score_volume          DECIMAL(5,1)
  score_news            DECIMAL(5,1)
  rsi                   DECIMAL(6,2)
  macd_hist             DECIMAL(10,4)
  sma_50                DECIMAL(10,2)
  sma_200               DECIMAL(10,2)
  vol_ratio             DECIMAL(6,2)
  bb_upper              DECIMAL(10,2)
  bb_lower              DECIMAL(10,2)
  pe_ratio              DECIMAL(10,2)
  market_cap            BIGINT
  recommendation        TEXT
  sector_rank           INTEGER
  sector_count          INTEGER
  sector_relative_score DECIMAL(5,1)
  sector_pe_avg         DECIMAL(10,2)
  annual_volatility     DECIMAL(6,1)
  sharpe_ratio          DECIMAL(6,2)
  max_drawdown_pct      DECIMAL(6,1)
  return_1y             DECIMAL(8,2)
  year_high             DECIMAL(10,2)
  year_low              DECIMAL(10,2)
  reasons               JSONB
  INDEX(run_id, ticker)
  INDEX(run_id, rank)

scanner_results
  id            SERIAL PRIMARY KEY
  run_id        INTEGER REFERENCES analysis_runs
  scanner_type  TEXT
  ticker        TEXT
  name          TEXT
  value         DECIMAL(10,4)
  INDEX(run_id, scanner_type)

news_articles
  id          SERIAL PRIMARY KEY
  run_id      INTEGER REFERENCES analysis_runs
  type        TEXT  -- 'market' or 'company'
  ticker      TEXT  -- NULL for market news
  headline    TEXT
  source      TEXT
  url         TEXT
  summary     TEXT
  sentiment   DECIMAL(4,2)
  published   TIMESTAMP
  INDEX(run_id, type)
  INDEX(run_id, ticker)

earnings_events
  id              SERIAL PRIMARY KEY
  run_id          INTEGER REFERENCES analysis_runs
  type            TEXT  -- 'upcoming' or 'past'
  ticker          TEXT
  name            TEXT
  event_date      DATE
  hour            TEXT
  estimate_eps    DECIMAL(10,4)
  actual_eps      DECIMAL(10,4)
  surprise_pct    DECIMAL(8,2)
  revenue_estimate BIGINT
  actual_revenue   BIGINT

catalyst_timeline
  id              SERIAL PRIMARY KEY
  run_id          INTEGER REFERENCES analysis_runs UNIQUE
  date            DATE
  narrative       TEXT  -- generated by Python code from price moves + matched news, not AI/LLM
  day_change_pct  DECIMAL(6,2)
  open            DECIMAL(10,2)
  close           DECIMAL(10,2)
  high            DECIMAL(10,2)
  low             DECIMAL(10,2)
  high_time       TEXT
  low_time        TEXT

catalyst_hours
  id              SERIAL PRIMARY KEY
  timeline_id     INTEGER REFERENCES catalyst_timeline
  time            TEXT
  open            DECIMAL(10,2)
  close           DECIMAL(10,2)
  high            DECIMAL(10,2)
  low             DECIMAL(10,2)
  volume          BIGINT
  change_from_open DECIMAL(6,2)
  hourly_change   DECIMAL(6,2)
  significant     BOOLEAN

catalyst_news
  id          SERIAL PRIMARY KEY
  hour_id     INTEGER REFERENCES catalyst_hours
  headline    TEXT
  source      TEXT
  url         TEXT
  time        TEXT

backtest_results
  id                  SERIAL PRIMARY KEY
  run_id              INTEGER REFERENCES analysis_runs UNIQUE
  sim_start_date      DATE
  sim_end_date        DATE
  lookback_days       INTEGER
  portfolio_return    DECIMAL(8,2)
  benchmark_return    DECIMAL(8,2)
  outperformance      DECIMAL(8,2)
  picks               JSONB
```

### Paper Trading

```
portfolios
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid()
  user_id           UUID REFERENCES users
  name              TEXT DEFAULT 'My Portfolio'
  starting_balance  DECIMAL(12,2) DEFAULT 100000.00
  current_cash      DECIMAL(12,2) DEFAULT 100000.00
  created_at        TIMESTAMP DEFAULT NOW()

trades
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
  portfolio_id  UUID REFERENCES portfolios
  ticker        TEXT
  action        TEXT  -- 'buy' or 'sell'
  shares        INTEGER  -- whole shares only, no fractional shares
  price         DECIMAL(10,2)
  total         DECIMAL(12,2)
  executed_at   TIMESTAMP DEFAULT NOW()
  INDEX(portfolio_id, executed_at)
```

Holdings are computed on-read, not stored. Query: `SELECT ticker, SUM(CASE WHEN action='buy' THEN shares ELSE -shares END) AS shares, SUM(CASE WHEN action='buy' THEN total ELSE 0 END) / NULLIF(SUM(CASE WHEN action='buy' THEN shares ELSE 0 END), 0) AS avg_cost FROM trades WHERE portfolio_id = ? GROUP BY ticker HAVING SUM(CASE WHEN action='buy' THEN shares ELSE -shares END) > 0`. This is fast enough for individual portfolios (paper traders won't have thousands of trades).

### Challenges

```
challenges
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid()
  user_id           UUID REFERENCES users
  portfolio_id      UUID REFERENCES portfolios
  duration_days     INTEGER  -- 7, 14, or 30
  start_date        DATE
  end_date          DATE
  starting_balance  DECIMAL(12,2) DEFAULT 100000.00
  algo_picks        JSONB  -- snapshot: [{ ticker, shares, price_at_start }]
  status            TEXT DEFAULT 'active'  -- active, completed
  result            TEXT  -- 'win', 'loss', 'tie' (set on completion)
  created_at        TIMESTAMP DEFAULT NOW()

challenge_snapshots
  id                    SERIAL PRIMARY KEY
  challenge_id          UUID REFERENCES challenges
  date                  DATE
  user_portfolio_value  DECIMAL(12,2)
  algo_portfolio_value  DECIMAL(12,2)
  UNIQUE(challenge_id, date)
```

Challenge daily snapshot logic: The pipeline already writes `daily_prices` to the database. A GitHub Actions job runs at 5 PM ET (after market close) on weekdays to compute snapshots for all active challenges. For each challenge:
- User portfolio value = current_cash + SUM(holdings.shares * latest close price from `daily_prices`)
- Algo portfolio value = SUM(pick.shares * latest close price from `daily_prices`) for each pick in `algo_picks`

Weekend days are skipped (no market activity). Charts display only trading days.

### Personal

```
watchlist
  id        SERIAL PRIMARY KEY
  user_id   UUID REFERENCES users
  ticker    TEXT
  added_at  TIMESTAMP DEFAULT NOW()
  UNIQUE(user_id, ticker)
  INDEX(user_id)
```

---

## Data Retention

- `daily_prices`: keep last 90 days of data (pipeline prunes rows older than 90 days on each run). Backtest uses the latest run's 20-day window, not historical runs.
- `analysis_runs` and child tables: keep last 30 runs (~6 weeks). Pipeline deletes older runs on each write.
- `trades`, `portfolios`, `challenges`, `challenge_snapshots`: kept indefinitely (user data).
- `watchlist`: kept indefinitely.

At 90 days of daily_prices (~500 tickers * 90 days = 45,000 rows) and 30 analysis runs (~15,000 stock_scores rows), total storage stays well under Vercel Postgres free tier limits.

---

## Routes & Pages

### Public

- `/` -- Landing page. Product description, feature highlights, screenshots, CTA to sign up/login.
- `/login` -- Auth.js sign-in page (Google, GitHub, email/password)

### Protected (require authentication)

All protected routes share a sidebar layout. Sidebar collapses to a hamburger menu on mobile.

Global search bar in the sidebar: search by ticker or company name across all pages.

- `/dashboard` -- Default after login. Market pulse (breadth, VIX, yields), sector performance chart, what happened yesterday (catalyst timeline with SPY hourly chart + matched news), quick glance top 5 picks, active challenge card if applicable.

- `/dashboard/recommendations` -- Top 50 scored stocks. Sortable/filterable by sector, score, price. Expandable cards with scoring breakdown, reasons, sector rank, risk metrics. One-click "Buy" button pre-fills paper trading. Methodology section.

- `/dashboard/news` -- Market news feed with sentiment indicators. Company-specific news grouped by ticker. Full catalyst timeline (hour-by-hour). Filterable by sentiment, sector, date.

- `/dashboard/scanners` -- Tabbed view: RSI Oversold, Golden Cross, MACD Bullish, Volume Breakout, Bollinger Oversold, Near 52-Week Low. Each tab shows matching stocks with relevant metric highlighted. One-click add to watchlist or buy.

- `/dashboard/earnings` -- Upcoming earnings calendar (next 7 days). Past earnings with beat/miss indicators and price impact. Earnings impact analysis: average move on beats vs misses.

- `/dashboard/backtest` -- Our picks vs S&P 500 benchmark over rolling periods. Historical accuracy tracking with win rate over time. Cumulative performance chart.

- `/dashboard/trading` -- Portfolio overview: total value, cash, holdings with current prices (real-time via Finnhub websocket during market hours). Buy/sell form: ticker, shares, executes at current market price. Trade history log. Performance chart over time.

- `/dashboard/challenges` -- Start new challenge: pick duration (7, 14, 30 days), $100k starting balance. Active challenge: side-by-side line chart of user portfolio vs algorithm picks, updated daily. Past challenges: win/loss record. Optional public leaderboard (opt-in).

- `/dashboard/watchlist` -- Personal list of tickers with current price, daily change, our score. Real-time price updates during market hours. Add/remove from anywhere in the app.

### Key Server Actions / API Routes

All mutations use Next.js Server Actions (no separate API routes needed):

- `executeTrade(portfolioId, ticker, action, shares)` -- validates sufficient cash (buy) or sufficient shares (sell), fetches current price, creates trade record, updates portfolio cash. Runs in a database transaction.
- `addToWatchlist(ticker)` / `removeFromWatchlist(ticker)`
- `startChallenge(durationDays)` -- creates portfolio + challenge, snapshots algo's current top 10 picks
- `GET /api/prices/stream` -- SSE endpoint for real-time price updates

---

## Real-Time Price Flow

Finnhub free tier allows 1 websocket connection with up to 50 symbol subscriptions. To handle this:

- A single shared Finnhub websocket connection on the server, managed by a Next.js API route
- Server tracks all tickers needed across all currently connected users (holdings + watchlist)
- If total unique tickers exceed 50, prioritize: user's holdings first, then watchlist, then drop least-requested tickers
- Pushes updates to connected clients via Server-Sent Events (SSE)
- During off-hours (before 9:30 AM / after 4 PM ET): shows last closing price from `daily_prices` table, no websocket connection
- Paper trades execute at latest available price (real-time during market, last close otherwise)
- All executions are instant market orders (no limit orders, no queuing)

Note: On Vercel serverless, long-lived websocket connections require Edge Runtime or a separate process. Initial implementation can use periodic polling (every 15 seconds via yfinance) as a simpler alternative, upgrading to true websocket streaming later if needed.

---

## Challenge Mechanics

1. User starts a challenge, picks duration (7, 14, or 30 days)
2. System creates a new portfolio with $100k cash
3. System snapshots the algorithm's current top 10 picks at current prices (equal-weight $10k per stock, stored as `[{ ticker, shares, price_at_start }]` in `algo_picks` JSONB)
4. User trades freely within that portfolio during the challenge period
5. Daily at 5 PM ET (weekdays), a GitHub Actions cron job computes portfolio values for all active challenges using closing prices from `daily_prices`, writes to `challenge_snapshots`
6. User sees a diverging line chart: their portfolio vs algorithm picks (weekday data points only, weekends skipped)
7. At end date, challenge is marked complete. Result: win (user beat algo), loss, or tie
8. User's challenge history shows cumulative win/loss record
9. Algorithm's portfolio is buy-and-hold of top 10 picks from start date, no rebalancing

---

## Scoring Model (from existing pipeline)

Weights when news is available:
- Analyst Upside: 30%
- Technical: 25%
- Momentum: 20%
- News Sentiment: 15%
- Volume Signal: 10%

Weights without news:
- Analyst Upside: 35%
- Technical: 30%
- Momentum: 20%
- Volume Signal: 15%

Technical indicators: RSI (14-period), MACD (12/26/9), 50-day and 200-day MAs, Bollinger Bands (20-period, 2 std dev), volume spike detection (2x 20-day avg).

---

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router, Turbopack), Tailwind CSS v4 |
| Auth | Auth.js v5 (email/password, OAuth can be added later) |
| Database | Vercel Postgres |
| ORM / Migrations | Drizzle ORM (app repo owns all migrations) |
| Real-time prices | Finnhub websocket + SSE (or polling fallback) |
| Data pipeline | Python (pandas, yfinance, ta, requests, psycopg2) |
| Pipeline runner | GitHub Actions (cron schedule) |
| Hosting | Vercel |
| Domain | macrolyst.com |

---

## Disclaimers

The app must display clearly on the landing page, dashboard, and recommendations page:
- "Not financial advice. For educational and informational purposes only."
- "Paper trading uses simulated money. Past performance does not indicate future results."
- "Data may be delayed up to 15 minutes during market hours."
