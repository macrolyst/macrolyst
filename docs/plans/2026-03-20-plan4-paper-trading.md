# Plan 4: Paper Trading + Real-Time Prices Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fully functional paper trading platform with real-time price polling, ticker search across all US stocks, and a personal watchlist.

**Architecture:** Three API routes wrap Finnhub (quote, batch, search) with in-memory caching. Server actions handle portfolio creation and trade execution with slippage simulation. Client-side polling updates prices every 5 seconds during market hours. Holdings are computed on-read from the trades table.

**Tech Stack:** Next.js 15 App Router, Drizzle ORM, Finnhub API (REST), Server Actions

**Important notes:**
- Finnhub API key is in env var `FINNHUB_API_KEY` (already used by pipeline)
- Add it to `.env.local` for the app: `FINNHUB_API_KEY=your_key`
- DB tables `portfolios`, `trades`, `watchlist` already exist (created in Plan 1)
- Auth: use `auth.getSession()` from `@/lib/auth/server` to get current user ID
- All server actions must verify the user owns the portfolio they're operating on
- Tailwind v4 syntax: `bg-(--var)`, `text-(--var)`, `font-(family-name:--font-source-serif)`
- NO Co-Authored-By lines in commits

---

## File Structure

```
src/
  app/
    api/
      prices/
        quote/route.ts          NEW  - GET /api/prices/quote?symbol=AAPL
        batch/route.ts          NEW  - GET /api/prices/batch?symbols=AAPL,MSFT
      search/route.ts           NEW  - GET /api/search?q=apple
    dashboard/
      trading/
        page.tsx                MODIFY - Server component: fetch portfolio, holdings, trades
        portfolio-setup.tsx     NEW    - Client: balance selection + create portfolio
        trading-view.tsx        NEW    - Client: portfolio overview, buy/sell, trade history
        ticker-search.tsx       NEW    - Client: Finnhub symbol search with autocomplete
        use-live-prices.ts      NEW    - Hook: polls /api/prices/batch every 5 seconds
      watchlist/
        page.tsx                MODIFY - Server component: fetch watchlist
        watchlist-view.tsx      NEW    - Client: watchlist with live prices, add/remove
      recommendations/
        stock-detail.tsx        MODIFY - Add "Buy" button
      scanners/
        scanner-tabs.tsx        MODIFY - Add "Buy" button per row
  lib/
    finnhub.ts                  NEW  - Finnhub API client with caching
    market-hours.ts             NEW  - isMarketOpen() utility
    actions/
      trading.ts                NEW  - createPortfolio, executeTrade server actions
      watchlist.ts              NEW  - addToWatchlist, removeFromWatchlist server actions
```

---

## Task 1: Finnhub Client + Market Hours Utility

Foundation layer that all other tasks depend on.

**Files:**
- Create: `src/lib/finnhub.ts`
- Create: `src/lib/market-hours.ts`

- [ ] **Step 1: Create `src/lib/market-hours.ts`**

```typescript
export function isMarketOpen(): boolean {
  const now = new Date();
  const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = et.getDay();
  if (day === 0 || day === 6) return false;
  const hours = et.getHours();
  const mins = et.getMinutes();
  const timeInMins = hours * 60 + mins;
  return timeInMins >= 570 && timeInMins < 960; // 9:30 AM to 4:00 PM
}

export function getMarketStatus(): { open: boolean; label: string } {
  const open = isMarketOpen();
  return { open, label: open ? "Market Open" : "Market Closed" };
}
```

- [ ] **Step 2: Create `src/lib/finnhub.ts`**

```typescript
const FINNHUB_BASE = "https://finnhub.io/api/v1";
const API_KEY = process.env.FINNHUB_API_KEY;

// Simple in-memory cache
const cache = new Map<string, { data: unknown; expires: number }>();

function getCached<T>(key: string, ttlMs: number): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expires) return entry.data as T;
  return null;
}

function setCache(key: string, data: unknown, ttlMs: number) {
  cache.set(key, { data, expires: Date.now() + ttlMs });
  // Prevent unbounded growth
  if (cache.size > 500) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
}

export type Quote = {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  timestamp: number;
};

export async function getQuote(symbol: string): Promise<Quote | null> {
  const key = `quote:${symbol}`;
  const cached = getCached<Quote>(key, 5000);
  if (cached) return cached;

  try {
    const res = await fetch(
      `${FINNHUB_BASE}/quote?symbol=${encodeURIComponent(symbol)}&token=${API_KEY}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const d = await res.json();
    if (!d.c || d.c === 0) return null;

    const quote: Quote = {
      symbol,
      price: d.c,
      change: d.d,
      changePercent: d.dp,
      high: d.h,
      low: d.l,
      open: d.o,
      previousClose: d.pc,
      timestamp: d.t,
    };
    setCache(key, quote, 5000);
    return quote;
  } catch {
    return null;
  }
}

export async function getBatchQuotes(symbols: string[]): Promise<Quote[]> {
  const results = await Promise.all(symbols.map(getQuote));
  return results.filter((q): q is Quote => q !== null);
}

export type SearchResult = {
  symbol: string;
  description: string;
  type: string;
};

export async function searchSymbol(query: string): Promise<SearchResult[]> {
  if (!query || query.length < 1) return [];

  const key = `search:${query.toLowerCase()}`;
  const cached = getCached<SearchResult[]>(key, 3600000); // 1 hour
  if (cached) return cached;

  try {
    const res = await fetch(
      `${FINNHUB_BASE}/search?q=${encodeURIComponent(query)}&token=${API_KEY}`,
      { cache: "no-store" }
    );
    if (!res.ok) return [];
    const d = await res.json();
    const results: SearchResult[] = (d.result || [])
      .filter((r: { type: string }) => r.type === "Common Stock")
      .slice(0, 10)
      .map((r: { symbol: string; description: string; type: string }) => ({
        symbol: r.symbol,
        description: r.description,
        type: r.type,
      }));
    setCache(key, results, 3600000);
    return results;
  } catch {
    return [];
  }
}
```

- [ ] **Step 3: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/finnhub.ts src/lib/market-hours.ts
git commit -m "feat: add Finnhub client with caching and market hours utility"
```

---

## Task 2: Price + Search API Routes

**Files:**
- Create: `src/app/api/prices/quote/route.ts`
- Create: `src/app/api/prices/batch/route.ts`
- Create: `src/app/api/search/route.ts`

- [ ] **Step 1: Create `src/app/api/prices/quote/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getQuote } from "@/lib/finnhub";

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

  const quote = await getQuote(symbol.toUpperCase());
  if (!quote) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json(quote);
}
```

- [ ] **Step 2: Create `src/app/api/prices/batch/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getBatchQuotes } from "@/lib/finnhub";

export async function GET(request: NextRequest) {
  const symbols = request.nextUrl.searchParams.get("symbols");
  if (!symbols) return NextResponse.json({ error: "symbols required" }, { status: 400 });

  const list = symbols.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
  if (list.length === 0) return NextResponse.json({ error: "no valid symbols" }, { status: 400 });
  if (list.length > 50) return NextResponse.json({ error: "max 50 symbols" }, { status: 400 });

  const quotes = await getBatchQuotes(list);
  return NextResponse.json(quotes);
}
```

- [ ] **Step 3: Create `src/app/api/search/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { searchSymbol } from "@/lib/finnhub";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");
  if (!q) return NextResponse.json([]);

  const results = await searchSymbol(q);
  return NextResponse.json(results);
}
```

- [ ] **Step 4: Verify -- test the endpoints manually**

Start dev server, then in browser or curl:
- `http://localhost:3000/api/prices/quote?symbol=AAPL` -- should return price data
- `http://localhost:3000/api/prices/batch?symbols=AAPL,MSFT` -- should return array
- `http://localhost:3000/api/search?q=apple` -- should return search results

- [ ] **Step 5: Commit**

```bash
git add src/app/api/prices/ src/app/api/search/
git commit -m "feat: add price quote, batch, and search API routes"
```

---

## Task 3: Server Actions (Portfolio + Trading)

**Files:**
- Create: `src/lib/actions/trading.ts`
- Create: `src/lib/actions/watchlist.ts`

- [ ] **Step 1: Create `src/lib/actions/trading.ts`**

```typescript
"use server";

import { db } from "@/lib/db";
import { portfolios, trades } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { auth } from "@/lib/auth/server";
import { getQuote } from "@/lib/finnhub";

async function getUserId(): Promise<string> {
  const session = await auth.getSession();
  const userId = session?.data?.user?.id;
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

export async function getPortfolio() {
  const userId = await getUserId();
  const [portfolio] = await db
    .select()
    .from(portfolios)
    .where(eq(portfolios.userId, userId))
    .limit(1);
  return portfolio ?? null;
}

export async function createPortfolio(startingBalance: number) {
  const userId = await getUserId();

  // Check if user already has a portfolio
  const existing = await getPortfolio();
  if (existing) throw new Error("Portfolio already exists");

  if (![10000, 50000, 100000].includes(startingBalance)) {
    throw new Error("Invalid starting balance");
  }

  const [portfolio] = await db
    .insert(portfolios)
    .values({
      userId,
      startingBalance: startingBalance.toFixed(2),
      currentCash: startingBalance.toFixed(2),
    })
    .returning();

  return portfolio;
}

export type Holding = {
  ticker: string;
  shares: number;
  avgCost: number;
  totalCost: number;
};

export async function getHoldings(portfolioId: string): Promise<Holding[]> {
  const rows = await db.execute(sql`
    SELECT
      ticker,
      SUM(CASE WHEN action = 'buy' THEN shares ELSE -shares END) AS shares,
      SUM(CASE WHEN action = 'buy' THEN ${trades.total} ELSE 0 END) /
        NULLIF(SUM(CASE WHEN action = 'buy' THEN shares ELSE 0 END), 0) AS avg_cost,
      SUM(CASE WHEN action = 'buy' THEN ${trades.total} ELSE 0 END) AS total_cost
    FROM ${trades}
    WHERE ${trades.portfolioId} = ${portfolioId}
    GROUP BY ticker
    HAVING SUM(CASE WHEN action = 'buy' THEN shares ELSE -shares END) > 0
  `);

  return (rows.rows as Array<{ ticker: string; shares: string; avg_cost: string; total_cost: string }>).map((r) => ({
    ticker: r.ticker,
    shares: Number(r.shares),
    avgCost: Number(r.avg_cost),
    totalCost: Number(r.total_cost),
  }));
}

export async function getTradeHistory(portfolioId: string) {
  const rows = await db
    .select()
    .from(trades)
    .where(eq(trades.portfolioId, portfolioId))
    .orderBy(sql`${trades.executedAt} DESC`)
    .limit(50);

  return rows.map((r) => ({
    id: r.id,
    ticker: r.ticker,
    action: r.action,
    shares: r.shares,
    price: Number(r.price),
    total: Number(r.total),
    executedAt: r.executedAt,
  }));
}

export async function executeTrade(
  portfolioId: string,
  ticker: string,
  action: "buy" | "sell",
  shares: number,
) {
  const userId = await getUserId();

  // Verify ownership
  const [portfolio] = await db
    .select()
    .from(portfolios)
    .where(and(eq(portfolios.id, portfolioId), eq(portfolios.userId, userId)));
  if (!portfolio) throw new Error("Portfolio not found");

  if (shares <= 0 || !Number.isInteger(shares)) throw new Error("Invalid shares");

  // Fetch fresh price from Finnhub
  const quote = await getQuote(ticker.toUpperCase());
  if (!quote || quote.price <= 0) throw new Error("Could not fetch price for " + ticker);

  // Apply slippage (0.01% - 0.05%)
  const slippage = 0.0001 + Math.random() * 0.0004;
  const executedPrice = action === "buy"
    ? quote.price * (1 + slippage)
    : quote.price * (1 - slippage);
  const roundedPrice = Math.round(executedPrice * 100) / 100;
  const total = Math.round(roundedPrice * shares * 100) / 100;

  const currentCash = Number(portfolio.currentCash);

  if (action === "buy") {
    if (total > currentCash) throw new Error("Insufficient cash");
  } else {
    // Check holdings
    const holdings = await getHoldings(portfolioId);
    const holding = holdings.find((h) => h.ticker === ticker.toUpperCase());
    if (!holding || holding.shares < shares) throw new Error("Insufficient shares");
  }

  // Execute in transaction
  const newCash = action === "buy" ? currentCash - total : currentCash + total;

  await db.insert(trades).values({
    portfolioId,
    ticker: ticker.toUpperCase(),
    action,
    shares,
    price: roundedPrice.toFixed(2),
    total: total.toFixed(2),
  });

  await db
    .update(portfolios)
    .set({ currentCash: newCash.toFixed(2) })
    .where(eq(portfolios.id, portfolioId));

  return {
    ticker: ticker.toUpperCase(),
    action,
    shares,
    price: roundedPrice,
    total,
    newCash,
  };
}
```

- [ ] **Step 2: Create `src/lib/actions/watchlist.ts`**

```typescript
"use server";

import { db } from "@/lib/db";
import { watchlist } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth/server";

async function getUserId(): Promise<string> {
  const session = await auth.getSession();
  const userId = session?.data?.user?.id;
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

export async function getWatchlist() {
  const userId = await getUserId();
  const rows = await db
    .select()
    .from(watchlist)
    .where(eq(watchlist.userId, userId))
    .orderBy(watchlist.addedAt);
  return rows.map((r) => ({ ticker: r.ticker, addedAt: r.addedAt }));
}

export async function addToWatchlist(ticker: string) {
  const userId = await getUserId();
  try {
    await db.insert(watchlist).values({
      userId,
      ticker: ticker.toUpperCase(),
    });
  } catch {
    // Unique constraint violation = already in watchlist, ignore
  }
}

export async function removeFromWatchlist(ticker: string) {
  const userId = await getUserId();
  await db
    .delete(watchlist)
    .where(and(eq(watchlist.userId, userId), eq(watchlist.ticker, ticker.toUpperCase())));
}
```

- [ ] **Step 3: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/actions/
git commit -m "feat: add trading and watchlist server actions"
```

---

## Task 4: Live Prices Hook + Ticker Search Component

Shared client-side utilities used by both trading and watchlist pages.

**Files:**
- Create: `src/app/dashboard/trading/use-live-prices.ts`
- Create: `src/app/dashboard/trading/ticker-search.tsx`

- [ ] **Step 1: Create `src/app/dashboard/trading/use-live-prices.ts`**

```typescript
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Quote } from "@/lib/finnhub";

const POLL_INTERVAL = 5000;

export function useLivePrices(symbols: string[]) {
  const [prices, setPrices] = useState<Map<string, Quote>>(new Map());
  const [loading, setLoading] = useState(true);
  const [marketOpen, setMarketOpen] = useState(true);
  const symbolsRef = useRef(symbols);
  symbolsRef.current = symbols;

  const fetchPrices = useCallback(async () => {
    const syms = symbolsRef.current;
    if (syms.length === 0) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/prices/batch?symbols=${syms.join(",")}`);
      if (!res.ok) return;
      const quotes: Quote[] = await res.json();
      setPrices((prev) => {
        const next = new Map(prev);
        for (const q of quotes) {
          next.set(q.symbol, q);
        }
        return next;
      });
    } catch {
      // Silently fail, will retry
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (symbols.length === 0) {
      setLoading(false);
      return;
    }

    // Check market hours
    const checkMarket = () => {
      const now = new Date();
      const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
      const day = et.getDay();
      const mins = et.getHours() * 60 + et.getMinutes();
      setMarketOpen(day > 0 && day < 6 && mins >= 570 && mins < 960);
    };
    checkMarket();

    // Fetch immediately
    fetchPrices();

    // Poll
    const interval = setInterval(() => {
      checkMarket();
      fetchPrices();
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [symbols.join(","), fetchPrices]);

  return { prices, loading, marketOpen };
}
```

- [ ] **Step 2: Create `src/app/dashboard/trading/ticker-search.tsx`**

```typescript
"use client";

import { useState, useEffect, useRef } from "react";

type SearchResult = { symbol: string; description: string };

export function TickerSearch({
  onSelect,
  placeholder = "Search ticker or company...",
}: {
  onSelect: (symbol: string, name: string) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 1) {
      setResults([]);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
          setOpen(true);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }, 300); // debounce

    return () => clearTimeout(timer);
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder={placeholder}
        className="w-full bg-(--surface-2) text-(--text-primary) border border-(--border) rounded-lg px-3 py-2.5 text-sm focus:border-(--accent)/50 focus:outline-none transition-colors placeholder:text-(--text-secondary)/50"
      />
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-(--accent)/30 border-t-(--accent) rounded-full animate-spin" />
        </div>
      )}

      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-(--surface-2) border border-(--border) rounded-lg shadow-xl shadow-black/30 z-50 max-h-60 overflow-y-auto">
          {results.map((r) => (
            <button
              key={r.symbol}
              onClick={() => {
                onSelect(r.symbol, r.description);
                setQuery(r.symbol);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2.5 hover:bg-(--surface-3) transition-colors cursor-pointer flex items-center gap-2"
            >
              <span className="text-sm font-semibold text-white min-w-[4rem]">{r.symbol}</span>
              <span className="text-xs text-(--text-secondary) truncate">{r.description}</span>
            </button>
          ))}
        </div>
      )}

      {open && results.length === 0 && query.length >= 1 && !loading && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-(--surface-2) border border-(--border) rounded-lg shadow-xl shadow-black/30 z-50 p-3">
          <p className="text-xs text-(--text-secondary) text-center">No results found</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/trading/use-live-prices.ts src/app/dashboard/trading/ticker-search.tsx
git commit -m "feat: add live prices hook and ticker search component"
```

---

## Task 5: Trading Page

The main trading page with portfolio setup, overview, buy/sell form, and trade history.

**Files:**
- Create: `src/app/dashboard/trading/portfolio-setup.tsx`
- Create: `src/app/dashboard/trading/trading-view.tsx`
- Modify: `src/app/dashboard/trading/page.tsx`

- [ ] **Step 1: Create `src/app/dashboard/trading/portfolio-setup.tsx`**

Client component shown when user has no portfolio. Lets them pick a starting balance and create one.

```typescript
"use client";

import { useState } from "react";
import { createPortfolio } from "@/lib/actions/trading";
import { useRouter } from "next/navigation";

const BALANCES = [
  { value: 10000, label: "$10,000", desc: "Conservative start" },
  { value: 50000, label: "$50,000", desc: "Moderate portfolio" },
  { value: 100000, label: "$100,000", desc: "Full trading experience" },
];

export function PortfolioSetup() {
  const [selected, setSelected] = useState(100000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleCreate() {
    setLoading(true);
    setError(null);
    try {
      await createPortfolio(selected);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create portfolio");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto py-12">
      <div className="text-center mb-8">
        <h2 className="text-xl font-bold text-white font-(family-name:--font-source-serif) mb-2">
          Start Paper Trading
        </h2>
        <p className="text-sm text-(--text-secondary)">
          Practice trading with simulated money. No real money involved.
          Pick your starting balance and start building your portfolio.
        </p>
      </div>

      <div className="space-y-3 mb-6">
        {BALANCES.map((b) => (
          <button
            key={b.value}
            onClick={() => setSelected(b.value)}
            className={`w-full flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors ${
              selected === b.value
                ? "bg-(--accent)/10 border-(--accent)/40 text-(--accent)"
                : "bg-(--surface-2) border-(--border) text-(--text-secondary) hover:border-(--accent)/20"
            }`}
          >
            <div>
              <p className="text-lg font-bold text-white">{b.label}</p>
              <p className="text-xs text-(--text-secondary)">{b.desc}</p>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              selected === b.value ? "border-(--accent)" : "border-(--text-secondary)/30"
            }`}>
              {selected === b.value && <div className="w-2.5 h-2.5 rounded-full bg-(--accent)" />}
            </div>
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-(--down) mb-4 text-center">{error}</p>}

      <button
        onClick={handleCreate}
        disabled={loading}
        className="w-full py-3 rounded-lg bg-(--accent) text-(--surface-0) font-semibold text-sm cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {loading ? "Creating..." : "Start Trading"}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/app/dashboard/trading/trading-view.tsx`**

This is the main trading UI -- portfolio summary, holdings with live prices, buy/sell form, trade history. Large file but it's a single cohesive view.

```typescript
"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { executeTrade, type Holding } from "@/lib/actions/trading";
import { formatCurrency, formatPercent } from "@/lib/format";
import { ChangeBadge } from "@/components/ui/change-badge";
import { TickerSearch } from "./ticker-search";
import { useLivePrices } from "./use-live-prices";

type Portfolio = {
  id: string;
  startingBalance: number;
  currentCash: number;
};

type Trade = {
  id: string;
  ticker: string;
  action: string;
  shares: number;
  price: number;
  total: number;
  executedAt: Date | null;
};

export function TradingView({
  portfolio,
  holdings: initialHoldings,
  trades: tradeHistory,
}: {
  portfolio: Portfolio;
  holdings: Holding[];
  trades: Trade[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillTicker = searchParams.get("buy") || "";

  const [selectedTicker, setSelectedTicker] = useState(prefillTicker);
  const [selectedName, setSelectedName] = useState("");
  const [shares, setShares] = useState("");
  const [action, setAction] = useState<"buy" | "sell">("buy");
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTrade, setLastTrade] = useState<string | null>(null);

  // Live prices for holdings
  const holdingTickers = useMemo(() => initialHoldings.map((h) => h.ticker), [initialHoldings]);
  const allTickers = useMemo(() => {
    const set = new Set(holdingTickers);
    if (selectedTicker) set.add(selectedTicker);
    return Array.from(set);
  }, [holdingTickers, selectedTicker]);

  const { prices, marketOpen } = useLivePrices(allTickers);

  // Compute portfolio value
  const holdingsValue = initialHoldings.reduce((sum, h) => {
    const price = prices.get(h.ticker)?.price ?? h.avgCost;
    return sum + h.shares * price;
  }, 0);
  const totalValue = portfolio.currentCash + holdingsValue;
  const totalGain = totalValue - portfolio.startingBalance;
  const totalGainPct = (totalGain / portfolio.startingBalance) * 100;

  const selectedPrice = selectedTicker ? prices.get(selectedTicker)?.price ?? null : null;
  const selectedChange = selectedTicker ? prices.get(selectedTicker)?.changePercent ?? null : null;
  const estimatedTotal = selectedPrice && shares ? selectedPrice * parseInt(shares) : 0;

  async function handleTrade() {
    if (!selectedTicker || !shares || parseInt(shares) <= 0) return;
    setExecuting(true);
    setError(null);
    setLastTrade(null);
    try {
      const result = await executeTrade(portfolio.id, selectedTicker, action, parseInt(shares));
      setLastTrade(
        `${result.action === "buy" ? "Bought" : "Sold"} ${result.shares} ${result.ticker} at ${formatCurrency(result.price)}`
      );
      setShares("");
      setSelectedTicker("");
      setSelectedName("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Trade failed");
    } finally {
      setExecuting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Market status */}
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${marketOpen ? "bg-(--up) pulse-dot" : "bg-(--text-secondary)/40"}`} />
        <span className="text-xs text-(--text-secondary)">{marketOpen ? "Market Open" : "Market Closed"}</span>
      </div>

      {/* Portfolio summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-glow p-4">
          <p className="text-[10px] text-(--text-secondary) uppercase tracking-wider">Total Value</p>
          <p className="text-xl font-bold text-white mt-1">{formatCurrency(totalValue)}</p>
        </div>
        <div className="card-glow p-4">
          <p className="text-[10px] text-(--text-secondary) uppercase tracking-wider">Cash</p>
          <p className="text-xl font-bold text-white mt-1">{formatCurrency(portfolio.currentCash)}</p>
        </div>
        <div className="card-glow p-4">
          <p className="text-[10px] text-(--text-secondary) uppercase tracking-wider">Total Gain/Loss</p>
          <p className={`text-xl font-bold mt-1 ${totalGain >= 0 ? "text-(--up)" : "text-(--down)"}`}>
            {formatCurrency(totalGain)}
          </p>
        </div>
        <div className="card-glow p-4">
          <p className="text-[10px] text-(--text-secondary) uppercase tracking-wider">Return</p>
          <ChangeBadge value={totalGainPct} className="text-xl font-bold mt-1" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Buy/Sell form */}
        <div className="card-glow p-5">
          <p className="text-xs text-(--text-secondary) uppercase tracking-wider mb-4">Trade</p>

          {/* Action toggle */}
          <div className="flex gap-1 mb-4 bg-(--surface-2) rounded-lg p-1">
            <button
              onClick={() => setAction("buy")}
              className={`flex-1 py-2 rounded-md text-sm font-medium cursor-pointer transition-colors ${
                action === "buy" ? "bg-(--up)/20 text-(--up)" : "text-(--text-secondary)"
              }`}
            >
              Buy
            </button>
            <button
              onClick={() => setAction("sell")}
              className={`flex-1 py-2 rounded-md text-sm font-medium cursor-pointer transition-colors ${
                action === "sell" ? "bg-(--down)/20 text-(--down)" : "text-(--text-secondary)"
              }`}
            >
              Sell
            </button>
          </div>

          {/* Ticker search */}
          <div className="mb-3">
            <TickerSearch
              onSelect={(symbol, name) => {
                setSelectedTicker(symbol);
                setSelectedName(name);
              }}
            />
          </div>

          {/* Price display */}
          {selectedTicker && (
            <div className="flex items-center justify-between mb-3 px-1">
              <div>
                <span className="text-sm font-semibold text-white">{selectedTicker}</span>
                <span className="text-xs text-(--text-secondary) ml-1.5">{selectedName}</span>
              </div>
              <div className="text-right">
                {selectedPrice ? (
                  <>
                    <span className="text-sm font-bold text-white">{formatCurrency(selectedPrice)}</span>
                    <ChangeBadge value={selectedChange} className="text-xs ml-1.5" />
                  </>
                ) : (
                  <span className="text-xs text-(--text-secondary)">Loading...</span>
                )}
              </div>
            </div>
          )}

          {/* Shares input */}
          <input
            type="number"
            min="1"
            step="1"
            value={shares}
            onChange={(e) => setShares(e.target.value.replace(/\D/g, ""))}
            placeholder="Number of shares"
            className="w-full bg-(--surface-2) text-(--text-primary) border border-(--border) rounded-lg px-3 py-2.5 text-sm mb-3 focus:border-(--accent)/50 focus:outline-none placeholder:text-(--text-secondary)/50"
          />

          {/* Estimated total */}
          {estimatedTotal > 0 && (
            <div className="flex items-center justify-between mb-3 px-1 text-xs">
              <span className="text-(--text-secondary)">Estimated Total</span>
              <span className="text-white font-semibold">{formatCurrency(estimatedTotal)}</span>
            </div>
          )}

          {/* Execute button */}
          <button
            onClick={handleTrade}
            disabled={executing || !selectedTicker || !shares || parseInt(shares) <= 0}
            className={`w-full py-3 rounded-lg font-semibold text-sm cursor-pointer transition-opacity disabled:opacity-30 disabled:cursor-not-allowed ${
              action === "buy"
                ? "bg-(--up) text-(--surface-0)"
                : "bg-(--down) text-white"
            }`}
          >
            {executing ? "Executing..." : `${action === "buy" ? "Buy" : "Sell"} ${selectedTicker || "..."}`}
          </button>

          {error && <p className="text-xs text-(--down) mt-2">{error}</p>}
          {lastTrade && <p className="text-xs text-(--up) mt-2">{lastTrade}</p>}

          <p className="text-[10px] text-(--text-secondary)/50 mt-3">
            Simulated trading with spread. Not real money.
          </p>
        </div>

        {/* Holdings */}
        <div className="lg:col-span-2 card-glow p-5">
          <p className="text-xs text-(--text-secondary) uppercase tracking-wider mb-4">Holdings</p>
          {initialHoldings.length === 0 ? (
            <p className="text-sm text-(--text-secondary) py-8 text-center">No holdings yet. Make your first trade.</p>
          ) : (
            <div>
              <div className="hidden md:grid grid-cols-[5rem_1fr_4rem_5rem_5rem_5rem_5rem] gap-2 px-3 py-2 border-b border-(--border) text-xs text-(--text-secondary) uppercase tracking-wider">
                <span>Ticker</span>
                <span></span>
                <span className="text-right">Shares</span>
                <span className="text-right">Avg Cost</span>
                <span className="text-right">Price</span>
                <span className="text-right">Value</span>
                <span className="text-right">P/L</span>
              </div>
              <div className="divide-y divide-(--border)">
                {initialHoldings.map((h) => {
                  const quote = prices.get(h.ticker);
                  const currentPrice = quote?.price ?? h.avgCost;
                  const value = h.shares * currentPrice;
                  const pl = value - h.totalCost;
                  const plPct = (pl / h.totalCost) * 100;

                  return (
                    <div key={h.ticker}>
                      {/* Desktop */}
                      <div className="hidden md:grid grid-cols-[5rem_1fr_4rem_5rem_5rem_5rem_5rem] gap-2 px-3 py-3 items-center">
                        <span className="text-sm font-semibold text-white">{h.ticker}</span>
                        <span></span>
                        <span className="text-sm text-white text-right">{h.shares}</span>
                        <span className="text-xs text-(--text-secondary) text-right font-mono">{formatCurrency(h.avgCost)}</span>
                        <span className="text-xs text-white text-right font-mono">{formatCurrency(currentPrice)}</span>
                        <span className="text-xs text-white text-right font-mono">{formatCurrency(value)}</span>
                        <div className="text-right">
                          <ChangeBadge value={plPct} className="text-xs" />
                        </div>
                      </div>
                      {/* Mobile */}
                      <div className="flex items-center justify-between px-3 py-3 md:hidden">
                        <div>
                          <span className="text-sm font-semibold text-white">{h.ticker}</span>
                          <span className="text-xs text-(--text-secondary) ml-1">{h.shares} shares</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-white">{formatCurrency(value)}</p>
                          <ChangeBadge value={plPct} className="text-xs" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Trade history */}
      <div className="card-glow p-5">
        <p className="text-xs text-(--text-secondary) uppercase tracking-wider mb-4">Trade History</p>
        {tradeHistory.length === 0 ? (
          <p className="text-sm text-(--text-secondary) py-4 text-center">No trades yet.</p>
        ) : (
          <div className="divide-y divide-(--border)">
            {tradeHistory.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2.5 px-1">
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                    t.action === "buy" ? "bg-(--up)/15 text-(--up)" : "bg-(--down)/15 text-(--down)"
                  }`}>
                    {t.action.toUpperCase()}
                  </span>
                  <span className="text-sm font-semibold text-white">{t.ticker}</span>
                  <span className="text-xs text-(--text-secondary)">{t.shares} shares @ {formatCurrency(t.price)}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm text-white">{formatCurrency(t.total)}</p>
                  {t.executedAt && (
                    <p className="text-[10px] text-(--text-secondary)">
                      {new Date(t.executedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Modify `src/app/dashboard/trading/page.tsx`**

Server component that fetches portfolio data and renders either setup or trading view.

```typescript
import { getPortfolio, getHoldings, getTradeHistory } from "@/lib/actions/trading";
import { DataFreshness } from "@/components/ui/data-freshness";
import { PortfolioSetup } from "./portfolio-setup";
import { TradingView } from "./trading-view";

export default async function PaperTradingPage() {
  const portfolio = await getPortfolio();

  if (!portfolio) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-xs tracking-[0.15em] uppercase text-(--accent) mb-1">Trading</p>
          <h1 className="text-2xl font-bold text-white font-(family-name:--font-source-serif)">Paper Trading</h1>
        </div>
        <PortfolioSetup />
      </div>
    );
  }

  const [holdings, trades] = await Promise.all([
    getHoldings(portfolio.id),
    getTradeHistory(portfolio.id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs tracking-[0.15em] uppercase text-(--accent) mb-1">Trading</p>
        <h1 className="text-2xl font-bold text-white font-(family-name:--font-source-serif)">Paper Trading</h1>
      </div>
      <TradingView
        portfolio={{
          id: portfolio.id,
          startingBalance: Number(portfolio.startingBalance),
          currentCash: Number(portfolio.currentCash),
        }}
        holdings={holdings}
        trades={trades}
      />
    </div>
  );
}
```

- [ ] **Step 4: Verify build and test**

```bash
npx tsc --noEmit && npx next lint
```

Run dev server, navigate to `/dashboard/trading`:
- Should see portfolio setup page
- Select balance, click "Start Trading"
- Should see trading view with empty holdings
- Search for "AAPL", select it, enter shares, click Buy
- Verify trade appears in history, cash decreases, holding appears

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/trading/
git commit -m "feat: build trading page with portfolio setup, live prices, buy/sell, and trade history"
```

---

## Task 6: Watchlist Page

**Files:**
- Create: `src/app/dashboard/watchlist/watchlist-view.tsx`
- Modify: `src/app/dashboard/watchlist/page.tsx`

- [ ] **Step 1: Create `src/app/dashboard/watchlist/watchlist-view.tsx`**

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { removeFromWatchlist } from "@/lib/actions/watchlist";
import { formatCurrency } from "@/lib/format";
import { ChangeBadge } from "@/components/ui/change-badge";
import { TickerSearch } from "../trading/ticker-search";
import { useLivePrices } from "../trading/use-live-prices";
import { addToWatchlist } from "@/lib/actions/watchlist";
import Link from "next/link";

type WatchlistItem = { ticker: string; addedAt: Date | null };

export function WatchlistView({ items }: { items: WatchlistItem[] }) {
  const router = useRouter();
  const [removing, setRemoving] = useState<string | null>(null);

  const tickers = items.map((i) => i.ticker);
  const { prices, marketOpen } = useLivePrices(tickers);

  async function handleAdd(symbol: string) {
    await addToWatchlist(symbol);
    router.refresh();
  }

  async function handleRemove(ticker: string) {
    setRemoving(ticker);
    await removeFromWatchlist(ticker);
    router.refresh();
    setRemoving(null);
  }

  return (
    <div className="space-y-6">
      {/* Market status */}
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${marketOpen ? "bg-(--up) pulse-dot" : "bg-(--text-secondary)/40"}`} />
        <span className="text-xs text-(--text-secondary)">{marketOpen ? "Market Open" : "Market Closed"}</span>
      </div>

      {/* Add ticker */}
      <div className="card-glow p-5">
        <p className="text-xs text-(--text-secondary) uppercase tracking-wider mb-3">Add to Watchlist</p>
        <TickerSearch onSelect={(symbol) => handleAdd(symbol)} placeholder="Search ticker to add..." />
      </div>

      {/* Watchlist */}
      <div className="card-glow p-5">
        <p className="text-xs text-(--text-secondary) uppercase tracking-wider mb-4">
          Your Watchlist ({items.length})
        </p>

        {items.length === 0 ? (
          <p className="text-sm text-(--text-secondary) py-8 text-center">
            Your watchlist is empty. Search for a stock above to add it.
          </p>
        ) : (
          <div className="divide-y divide-(--border)">
            {items.map((item) => {
              const quote = prices.get(item.ticker);
              return (
                <div key={item.ticker} className="flex items-center justify-between py-3 px-1">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-white">{item.ticker}</span>
                    {quote && (
                      <>
                        <span className="text-sm text-white font-mono">{formatCurrency(quote.price)}</span>
                        <ChangeBadge value={quote.changePercent} className="text-xs" />
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/dashboard/trading?buy=${item.ticker}`}
                      className="text-xs text-(--accent) hover:underline"
                    >
                      Buy
                    </Link>
                    <button
                      onClick={() => handleRemove(item.ticker)}
                      disabled={removing === item.ticker}
                      className="text-xs text-(--down) hover:underline cursor-pointer disabled:opacity-50"
                    >
                      {removing === item.ticker ? "..." : "Remove"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Modify `src/app/dashboard/watchlist/page.tsx`**

```typescript
import { getWatchlist } from "@/lib/actions/watchlist";
import { WatchlistView } from "./watchlist-view";

export default async function WatchlistPage() {
  const items = await getWatchlist();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs tracking-[0.15em] uppercase text-(--accent) mb-1">Trading</p>
        <h1 className="text-2xl font-bold text-white font-(family-name:--font-source-serif)">Watchlist</h1>
      </div>
      <WatchlistView items={items} />
    </div>
  );
}
```

- [ ] **Step 3: Verify build and test**

```bash
npx tsc --noEmit && npx next lint
```

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/watchlist/
git commit -m "feat: build watchlist page with live prices, add/remove, and buy links"
```

---

## Task 7: Buy Buttons on Recommendations + Scanners

Add "Buy" buttons that link to the trading page with the ticker pre-filled.

**Files:**
- Modify: `src/app/dashboard/recommendations/stock-detail.tsx`
- Modify: `src/app/dashboard/scanners/scanner-tabs.tsx`

- [ ] **Step 1: Add Buy button to stock detail**

In `stock-detail.tsx`, add a "Buy" link at the top of the left column, after the component's opening div:

Find the "Score Breakdown" section and add before it:

```typescript
// Add import at top
import Link from "next/link";

// Add before Score Breakdown section:
<Link
  href={`/dashboard/trading?buy=${stock.ticker}`}
  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-(--up)/15 text-(--up) text-sm font-medium hover:bg-(--up)/25 transition-colors mb-4"
>
  Buy {stock.ticker}
</Link>
```

- [ ] **Step 2: Add Buy button to scanner rows**

In `scanner-tabs.tsx`, add a "Buy" link in each table row. Add import for `Link` from `next/link` at the top, then add a column to the desktop table and a button in the mobile card.

Desktop: add a `<td>` with a Buy link after the Score column.
Mobile: add a Buy link next to the ScorePill.

- [ ] **Step 3: Verify build**

```bash
npx tsc --noEmit && npx next lint
```

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/recommendations/stock-detail.tsx src/app/dashboard/scanners/scanner-tabs.tsx
git commit -m "feat: add Buy buttons on recommendations and scanner pages"
```

---

## Task 8: Final Verification

- [ ] **Step 1: Type check and lint**

```bash
npx tsc --noEmit && npx next lint
```

- [ ] **Step 2: Manual testing checklist**

Trading page:
- [ ] First visit shows portfolio setup with 3 balance options
- [ ] Creating portfolio works, redirects to trading view
- [ ] Ticker search finds US stocks (not just S&P 500)
- [ ] Buy executes, cash decreases, holding appears
- [ ] Sell executes, cash increases, shares decrease
- [ ] Insufficient cash shows error
- [ ] Insufficient shares shows error
- [ ] Trade history shows recent trades
- [ ] Prices update every 5 seconds (check network tab)
- [ ] Market Closed/Open indicator works

Watchlist page:
- [ ] Search and add ticker works
- [ ] Remove ticker works
- [ ] Live prices update
- [ ] "Buy" link navigates to trading with ticker pre-filled

Recommendations page:
- [ ] "Buy" button in expanded stock detail links to trading

Scanners page:
- [ ] "Buy" button links to trading

Mobile:
- [ ] Trading page responsive
- [ ] Watchlist responsive
- [ ] Ticker search dropdown works on mobile

- [ ] **Step 3: Commit if any cleanup needed**

```bash
git add -A
git commit -m "chore: Plan 4 paper trading cleanup"
```
