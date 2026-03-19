# Plan 2: Pipeline Repo

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a private Python pipeline that fetches market data, runs analysis, and writes results to Vercel Postgres (the same database the Macrolyst web app reads from).

**Architecture:** Adapt the existing `stock-market-analyzer` scripts. Instead of writing JSON files, the pipeline writes directly to Postgres via psycopg2. Runs on GitHub Actions cron (6 AM CDT weekdays).

**Tech Stack:** Python 3.11, pandas, yfinance, ta, requests, psycopg2, GitHub Actions

**Repo:** https://github.com/macrolyst/macrolyst-pipeline.git (private)

**Source reference:** `C:\Users\vasti\OneDrive\Desktop\extra\Data Analysis\stock-market-analyzer\scripts\`

---

## File Structure

```
macrolyst-pipeline/
├── scripts/
│   ├── config.py               # Database URL, API keys, parameters
│   ├── db.py                   # Postgres connection + write helpers
│   ├── 01_clean.py             # Fetch prices, fundamentals, macro, SPY hourly
│   ├── 02_fetch_news.py        # Fetch news, earnings (optional, graceful fail)
│   ├── 03_transform.py         # Technicals, scoring, scanners, backtest
│   └── 04_write_db.py          # Write all results to Postgres
├── .github/
│   └── workflows/
│       └── pipeline.yml        # Cron schedule + manual trigger
├── requirements.txt
├── .env.example
├── .gitignore
└── README.md
```

Key change from original: added `db.py` (database helpers) and `04_write_db.py` (writes everything to Postgres). The original 01/02/03 scripts stay mostly the same -- they still output CSVs locally. Step 04 reads those CSVs and writes to the database.

---

## Tasks

### Task 1: Scaffold repo and copy scripts

- Clone the empty repo
- Copy scripts from stock-market-analyzer, adjusting config
- Create requirements.txt with psycopg2-binary added
- Create .env.example and .gitignore

### Task 2: Create db.py -- database connection and helpers

- Connect to Postgres using DATABASE_URL from env
- Helper functions: `get_or_create_run()`, `clear_run_data()`, `bulk_insert()`
- Upsert logic: delete existing data for same run_date, then insert fresh

### Task 3: Create 04_write_db.py -- write results to Postgres

- Read all CSVs and JSON output from steps 01-03
- Write to all 12 analysis tables: analysis_runs, daily_prices, market_summary, sector_performance, stock_scores, scanner_results, news_articles, earnings_events, catalyst_timeline, catalyst_hours, catalyst_news, backtest_results
- Data retention: prune daily_prices older than 90 days, analysis_runs older than 30 runs
- Track data_status (which sources succeeded)

### Task 4: Update config.py

- Add DATABASE_URL
- Remove JSON output paths (no longer needed for DB pipeline)
- Keep CSV paths for intermediate storage

### Task 5: GitHub Actions workflow

- Cron: 6 AM CDT weekdays (11 AM UTC)
- Manual trigger with force_refresh option
- Steps: install deps, run 01, run 02 (continue-on-error), run 03, run 04
- Secrets: DATABASE_URL, FINNHUB_API_KEY, FRED_API_KEY

### Task 6: Test locally

- Run full pipeline against Vercel Postgres
- Verify data appears in database
- Verify Macrolyst web app reads the data

---

## Database Tables (reference)

The pipeline writes to these tables (defined in macrolyst-app schema):

- `analysis_runs` -- one row per pipeline run
- `daily_prices` -- ~500 tickers x 252 trading days
- `market_summary` -- breadth, VIX, yields
- `sector_performance` -- 11 GICS sectors
- `stock_scores` -- 500 stocks with all scores, technicals, risk metrics
- `scanner_results` -- RSI oversold, golden cross, MACD bullish, etc.
- `news_articles` -- market + company news with sentiment
- `earnings_events` -- upcoming + past earnings
- `catalyst_timeline` -- one row with narrative + day stats
- `catalyst_hours` -- 7 hourly SPY bars
- `catalyst_news` -- news matched to hourly bars
- `backtest_results` -- portfolio vs benchmark returns
