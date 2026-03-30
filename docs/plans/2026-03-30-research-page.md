# Stock Research Page — Implementation Plan

## Overview

On-demand deep research for any ticker. User searches a stock, we pull real-time data from multiple APIs, display a comprehensive research report, and store it for 7 days. Each user gets 5 researches per day.

## Limits & Storage

- **5 researches per user per day** (resets at midnight CST)
- **Research stored for 7 days** then auto-deleted
- **Cache**: If another user (or same user) researches the same ticker within 30 min, serve from cache instead of re-fetching (doesn't count toward limit)
- **History section**: User sees their past researches with dates, can click to re-view

## Data Sources Per Research (8-10 API calls, all cached)

### 1. Company Overview (FMP + Finnhub)
- **FMP `/api/v3/profile/{symbol}`** — name, description, sector, industry, CEO, employees, IPO date, website, logo, exchange
- **Finnhub `/stock/profile2`** — fallback if FMP fails

### 2. Real-time Quote (Finnhub)
- **Finnhub `/quote`** — price, change, changePercent, high, low, open, previousClose

### 3. Key Metrics (Finnhub)
- **Finnhub `/stock/metric?metric=all`** — market cap, P/E, EPS, beta, 52-week high/low, dividend yield, avg volume, 10-day avg volume, revenue per share, ROE, ROA, book value, current ratio, debt/equity

### 4. Financial Statements (FMP)
- **FMP `/api/v3/income-statement/{symbol}?period=annual&limit=3`** — revenue, net income, gross profit, EBITDA, EPS (3 years)
- **FMP `/api/v3/income-statement/{symbol}?period=quarter&limit=4`** — same, last 4 quarters
- **FMP `/api/v3/balance-sheet-statement/{symbol}?period=annual&limit=3`** — total assets, total debt, cash, equity
- **FMP `/api/v3/cash-flow-statement/{symbol}?period=annual&limit=3`** — operating CF, free CF, capex

### 5. Financial Ratios (FMP)
- **FMP `/api/v3/ratios/{symbol}?limit=4`** — ROE, ROA, profit margin, debt/equity, current ratio, quick ratio, PE, PB, PS, EV/EBITDA

### 6. Analyst Consensus (Finnhub)
- **Finnhub `/stock/recommendation`** — monthly buy/hold/sell/strongBuy/strongSell breakdown
- **Finnhub `/stock/price-target`** — targetHigh, targetLow, targetMean, targetMedian, lastUpdated

### 7. Analyst Estimates (FMP)
- **FMP `/api/v3/analyst-estimates/{symbol}?limit=4`** — estimated revenue, EPS, EBITDA for upcoming quarters

### 8. Institutional Holders (FMP)
- **FMP `/api/v3/institutional-holder/{symbol}`** — top holders, shares held, % of total, change in shares

### 9. Company News (Finnhub)
- **Finnhub `/company-news?symbol={symbol}&from={7d ago}&to={today}`** — latest 10 articles with headline, source, url, datetime, sentiment

### 10. Peer Comparison (Finnhub + batch quotes)
- **Finnhub `/stock/peers`** — list of peer tickers
- **Finnhub batch `/quote`** — prices for top 5 peers

### 11. Pipeline Score (our DB)
- **Query `stock_scores` for latest run** — if ticker exists, show composite score + all 10 factor breakdowns

### 12. Price Chart (Yahoo)
- **Already built** — reuse existing `/api/prices/candles` endpoint

---

## Database Schema

### New table: `research_reports`

```
research_reports:
  id              uuid PK DEFAULT gen_random_uuid()
  user_id         uuid NOT NULL (from auth)
  ticker          text NOT NULL
  company_name    text
  data            jsonb NOT NULL        -- entire research payload
  created_at      timestamp DEFAULT now()
  expires_at      timestamp NOT NULL    -- created_at + 7 days
```

Index on `(user_id, created_at)` for history queries.
Index on `(ticker, created_at)` for cache lookups.
Index on `(expires_at)` for cleanup.

### New table: `research_limits`

```
research_limits:
  id              serial PK
  user_id         uuid NOT NULL UNIQUE
  date            date NOT NULL         -- CST date
  count           integer DEFAULT 0
```

Unique constraint on `(user_id, date)`.

---

## API Architecture

### `POST /api/research` — Generate Research

**Request:** `{ ticker: "AAPL" }`

**Flow:**
1. Check auth (must be logged in)
2. Check cache: any research for this ticker within last 30 min? → return cached, don't count toward limit
3. Check daily limit: `research_limits` for user + today's date
   - If count >= 5, return 429 (rate limited)
4. Fetch all data in parallel (8-10 API calls)
5. Assemble research payload (JSON)
6. Store in `research_reports` with `expires_at = now() + 7 days`
7. Increment `research_limits` count
8. Return research data

**Response:** Full research JSON payload

### `GET /api/research/history` — User's Research History

**Flow:**
1. Check auth
2. Query `research_reports` where `user_id = current AND expires_at > now()` ORDER BY created_at DESC
3. Return list: `[{ id, ticker, company_name, created_at }]`

### `GET /api/research/[id]` — View Stored Research

**Flow:**
1. Check auth
2. Query `research_reports` where `id = param AND user_id = current AND expires_at > now()`
3. Return full data

### Cleanup (daily)
- Delete from `research_reports` where `expires_at < now()`
- Delete from `research_limits` where `date < today - 1`
- Can run as a cron or on each request (lazy cleanup)

---

## Frontend

### New page: `/dashboard/research`

**Layout:**
1. **Search bar** at top — ticker input + "Research" button
2. **Daily limit indicator** — "3 of 5 researches used today"
3. **History section** — list of past researches (last 7 days), click to re-view

### Research Report View (after search)

Single scrollable page with sections:

```
┌─────────────────────────────────────────────┐
│ AAPL — Apple Inc.                           │
│ Technology · Consumer Electronics · NASDAQ   │
│ $192.50  +1.23 (+0.64%)                     │
│ [1D] [1W] [1M] [3M] chart                  │
├─────────────────────────────────────────────┤
│ KEY METRICS                                  │
│ Market Cap | P/E | EPS | Beta | Div Yield   │
│ 52-Week Range | Avg Volume | ROE            │
├─────────────────────────────────────────────┤
│ ANALYST CONSENSUS                           │
│ ██████████ 85% Buy  10% Hold  5% Sell      │
│ Price Target: $210 (Low $180 / High $250)   │
├─────────────────────────────────────────────┤
│ PIPELINE SCORE (if available)               │
│ Score: 72  [10 factor breakdown bars]       │
├─────────────────────────────────────────────┤
│ FINANCIAL STATEMENTS (tabs: Annual/Quarter) │
│ Revenue | Net Income | EPS | Gross Margin   │
│ [mini bar charts for 3yr trend]             │
├─────────────────────────────────────────────┤
│ BALANCE SHEET                               │
│ Assets | Debt | Cash | Equity               │
├─────────────────────────────────────────────┤
│ FINANCIAL RATIOS                            │
│ ROE | ROA | Debt/Equity | Current Ratio     │
│ Profit Margin | EV/EBITDA | P/B | P/S      │
├─────────────────────────────────────────────┤
│ ANALYST ESTIMATES                           │
│ Next 4 quarters: Revenue + EPS estimates    │
├─────────────────────────────────────────────┤
│ INSTITUTIONAL HOLDERS                        │
│ Top 10 holders with shares + % ownership    │
├─────────────────────────────────────────────┤
│ PEER COMPARISON                             │
│ 5 peers with price, change, P/E, market cap │
├─────────────────────────────────────────────┤
│ RECENT NEWS                                 │
│ 10 latest articles                          │
├─────────────────────────────────────────────┤
│ SEC FILINGS (if available)                  │
│ Recent 10-K, 10-Q, 8-K with links          │
└─────────────────────────────────────────────┘
```

### Mobile
- Same sections, stacked vertically
- Financial statements in horizontal scroll tables
- Key metrics in 2-column grid

---

## Implementation Order

### Step 1: Database
- Add `research_reports` and `research_limits` tables to schema
- Push to DB

### Step 2: Data Fetching Layer
- New file: `src/lib/research.ts`
- Functions to fetch from each API (Finnhub, FMP, DB)
- All parallel, all cached
- Assembles into single research payload

### Step 3: API Routes
- `POST /api/research` — generate + store
- `GET /api/research/history` — user history
- `GET /api/research/[id]` — view stored

### Step 4: Server Actions
- `getResearchHistory(userId)` — for history list
- `getResearchLimit(userId)` — remaining today
- Lazy cleanup of expired reports

### Step 5: Frontend Page
- `/dashboard/research/page.tsx` — server component
- `research-view.tsx` — client component for the report display
- `research-history.tsx` — sidebar/section for past researches

### Step 6: Sidebar Navigation
- Add "Research" link to dashboard sidebar

---

## API Call Budget

Per research: ~8-10 API calls
- Finnhub: 5 calls (quote, profile, metrics, recommendations, news) — 60/min limit, fine
- FMP: 4 calls (financials, ratios, estimates, holders) — 250/day limit
- DB: 1 query (pipeline score)

At 5 researches/user/day:
- 10 users = 50 researches = ~200 FMP calls (within 250 limit)
- 30-min cache means repeat tickers are free

If FMP limit becomes an issue, reduce to 3 researches/day or cache longer.

---

## Cost

$0. All free tier APIs. Storage in existing Vercel Postgres (JSONB, cleaned up after 7 days).
