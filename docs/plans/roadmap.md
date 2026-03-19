# Macrolyst Implementation Roadmap

Build in this order. Each plan depends on the previous one.

## Plan 1: Project Setup + Auth + Database (WRITTEN)
File: `2026-03-19-plan1-setup-auth-database.md`
- Next.js 15 scaffold with Turbopack + Tailwind v4
- Neon Auth (email/password signup/login)
- Drizzle ORM with full database schema (17 tables)
- Dashboard sidebar layout with mobile hamburger
- Placeholder pages for all 9 routes
- Landing page with sign-up/sign-in CTAs
- Deploy to Vercel

## Plan 2: Pipeline Repo (NOT WRITTEN YET)
- Create private repo `macrolyst-pipeline`
- Adapt Python scripts from `stock-market-analyzer` to write to Vercel Postgres via psycopg2
- Scripts: 01_clean.py, 02_fetch_news.py, 03_transform.py
- Instead of writing JSON, pipeline writes to database tables: analysis_runs, daily_prices, market_summary, sector_performance, stock_scores, scanner_results, news_articles, earnings_events, catalyst_timeline, catalyst_hours, catalyst_news, backtest_results
- GitHub Actions cron (6 AM CDT weekdays)
- Upsert logic: delete existing rows for same run_date, then insert
- Data retention: prune daily_prices older than 90 days, analysis_runs older than 30 runs
- Error handling: each step independent, data_status JSONB tracks what succeeded

## Plan 3: Dashboard + Analysis Pages (NOT WRITTEN YET)
- Dashboard home: market pulse cards (breadth, VIX, yields), sector performance chart, catalyst timeline (what happened yesterday), top 5 picks quick glance
- Recommendations page: top 50 stocks, sortable/filterable, expandable cards with scoring breakdown + reasons, methodology section
- News page: market news feed with sentiment, company news by ticker, full catalyst timeline, filters
- Scanners page: tabbed view (RSI Oversold, Golden Cross, MACD Bullish, Volume Breakout, Bollinger Oversold, Near 52-Week Low)
- Earnings page: upcoming calendar, past results with beat/miss, earnings impact analysis
- Backtest page: our picks vs benchmark, accuracy tracking, cumulative performance chart
- All pages read from database (latest analysis_run)
- Charts: use Chart.js or Recharts

## Plan 4: Paper Trading (NOT WRITTEN YET)
- Trading page: portfolio overview (total value, cash, holdings with prices)
- Buy/sell form: ticker search, shares input, executes at current price
- Server action: executeTrade() -- validates cash/shares, creates trade record, updates portfolio cash, runs in DB transaction
- Holdings computed on-read from trades table (aggregate query)
- Trade history log with date, ticker, action, shares, price
- Performance chart over time
- One-click "Buy" buttons on recommendations and scanners pages

## Plan 5: Challenges (NOT WRITTEN YET)
- Challenge creation: pick duration (7, 14, 30 days), creates portfolio + challenge record
- Algo picks snapshot: top 10 stocks at current prices, equal-weight $10k each, stored as JSONB
- Active challenge view: side-by-side line chart (user portfolio vs algo picks)
- GitHub Actions cron at 5 PM ET weekdays: compute daily snapshots for all active challenges using closing prices from daily_prices table
- Challenge completion: mark as win/loss/tie at end date
- Past challenges: win/loss record history
- Optional public leaderboard (opt-in)

## Plan 6: Real-Time Prices (NOT WRITTEN YET)
- Finnhub websocket connection for live prices during market hours (9:30 AM - 4 PM ET)
- Single shared server-side connection, max 50 symbols
- Prioritize: holdings first, then watchlist tickers
- Push to clients via Server-Sent Events (SSE) endpoint: GET /api/prices/stream
- Fallback: periodic polling via yfinance every 15 seconds if websocket is impractical on Vercel serverless
- Off-hours: show last closing price from daily_prices table
- Paper trades execute at real-time price during market hours, last close otherwise
- Live updates on: trading page, watchlist, active challenge

## Plan 7: Landing Page (NOT WRITTEN YET)
- Full marketing landing page at /
- Product description, feature highlights with screenshots
- How it works section
- Disclaimers: not financial advice, educational only, paper trading uses simulated money
- CTA buttons to sign up
- Can be built at any point (independent of other plans)

---

## Key References
- **Design spec:** `docs/specs/2026-03-19-macrolyst-design.md`
- **Original pipeline (inspiration):** `C:\Users\vasti\OneDrive\Desktop\extra\Data Analysis\stock-market-analyzer`
- **Repo:** https://github.com/macrolyst/macrolyst.git
- **Database:** Vercel Postgres (Neon) with Auth enabled, named `macrolyst-db`
- **Tech stack:** Next.js 15, Tailwind v4, Neon Auth, Drizzle ORM, Vercel Postgres, Python pipeline on GitHub Actions
- **Data sources:** yfinance, Finnhub (free tier), FRED, Wikipedia
- **Domain:** macrolyst.com
