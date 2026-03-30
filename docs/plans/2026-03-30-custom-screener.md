# Custom Stock Screener — Implementation Plan

## Overview

User builds custom filters from dropdowns, sees matching S&P 500 stocks instantly. All data from existing `stock_scores` table — zero API calls, pure DB query.

## Available Filter Fields (from stock_scores)

### Technical
- RSI (0-100)
- MACD Histogram (negative to positive)
- Volume Ratio (0x-10x+)
- Above/Below SMA 50
- Bollinger Band position

### Fundamental
- P/E Ratio
- Market Cap
- Sector (dropdown)
- Analyst Recommendation (strong buy, buy, hold, sell)

### Performance
- 1-Day Change %
- 5-Day Change %
- 20-Day Change %

### Scoring (after tomorrow's pipeline)
- Composite Score (0-100)
- Any of the 10 factor scores

### Risk
- Annual Volatility
- Sharpe Ratio
- Max Drawdown %

## UI Design

```
┌──────────────────────────────────────────────┐
│ CUSTOM SCREENER                              │
│                                              │
│ [+ Add Filter]                               │
│                                              │
│ ┌─────────────┐ ┌────┐ ┌──────┐  [x]       │
│ │ RSI       ▼ │ │ < ▼│ │ 30   │             │
│ └─────────────┘ └────┘ └──────┘             │
│ ┌─────────────┐ ┌────┐ ┌──────┐  [x]       │
│ │ Sector    ▼ │ │ = ▼│ │ Tech │             │
│ └─────────────┘ └────┘ └──────┘             │
│ ┌─────────────┐ ┌────┐ ┌──────┐  [x]       │
│ │ Change 5D ▼ │ │ < ▼│ │ -5%  │             │
│ └─────────────┘ └────┘ └──────┘             │
│                                              │
│ [Run Screener]          Showing 12 of 503    │
├──────────────────────────────────────────────┤
│ # Ticker  Name          Price  Change  RSI   │
│ 1 AAPL    Apple         $192   +0.5%   28.3  │
│ 2 MSFT    Microsoft     $372   -1.2%   25.1  │
│ ...                                          │
└──────────────────────────────────────────────┘
```

## Filter Types

### Numeric filters (RSI, P/E, volume, changes, scores)
- Operators: `<`, `>`, `<=`, `>=`, `=`, `between`
- Input: number field(s)

### Select filters (Sector, Recommendation)
- Operator: `=` or `in`
- Input: dropdown with all values

### Boolean filters (MACD bullish, above SMA)
- Operator: `is` true/false

## Architecture

### No new tables needed
- Reads from `stock_scores` for the latest run
- Query built dynamically from user's filter selections
- Results sorted by composite score descending

### API Route: `GET /api/screener`

Query params encode the filters:
```
/api/screener?rsi_lt=30&sector=Information+Technology&change5d_lt=-5
```

Server-side:
1. Get latest run ID
2. Build Drizzle `where` clause from params
3. Query stock_scores with filters
4. Return matching stocks

Cached per unique filter combo for 5 min (data only changes once daily).

### Frontend: `/dashboard/screener`

- Client component with filter state
- Dropdowns for field + operator + value
- "Add Filter" button to add more criteria
- "Run Screener" fetches from API
- Results table with sortable columns
- Click a row to open detail (reuse existing stock detail or link to research)

## Filter Definitions

```typescript
const FILTERS = [
  // Technical
  { key: "rsi", label: "RSI", type: "number", min: 0, max: 100 },
  { key: "macdHist", label: "MACD", type: "number" },
  { key: "volRatio", label: "Volume Ratio", type: "number", min: 0 },

  // Fundamental
  { key: "peRatio", label: "P/E Ratio", type: "number" },
  { key: "marketCap", label: "Market Cap", type: "number" },
  { key: "sector", label: "Sector", type: "select", options: [...11 sectors] },
  { key: "recommendation", label: "Wall St. Rating", type: "select", options: ["strong_buy","buy","hold","sell","strong_sell"] },

  // Performance
  { key: "change1d", label: "1D Change %", type: "number" },
  { key: "change5d", label: "5D Change %", type: "number" },
  { key: "change20d", label: "20D Change %", type: "number" },

  // Score
  { key: "compositeScore", label: "Composite Score", type: "number", min: 0, max: 100 },

  // Risk
  { key: "annualVolatility", label: "Volatility %", type: "number" },
  { key: "sharpeRatio", label: "Sharpe Ratio", type: "number" },
  { key: "maxDrawdownPct", label: "Max Drawdown %", type: "number" },
];
```

## Preset Screeners (Quick Start)

Pre-built filter combos users can one-click:
- **Oversold Bargains**: RSI < 30, Change 5D < -5%
- **Momentum Plays**: Change 5D > 5%, Volume Ratio > 1.5
- **Value Picks**: P/E < 15, Composite Score > 50
- **Low Risk Quality**: Volatility < 20%, Sharpe > 1
- **Sector Leaders**: Composite Score > 60 (per sector)

## Implementation Order

1. API route `/api/screener` — dynamic query builder
2. Page `/dashboard/screener` — filter UI + results table
3. Sidebar nav link
4. Preset screeners
5. Sortable result columns

## Cost

$0. One DB query per screener run. Data refreshes daily with pipeline.
