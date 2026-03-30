import { Redis } from "@upstash/redis";

const FINNHUB_BASE = "https://finnhub.io/api/v1";
const API_KEY = process.env.FINNHUB_API_KEY;

// Shared Redis cache — works across all Vercel serverless instances
const redis = process.env.UPSTASH_REDIS_REST_URL
  ? new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN! })
  : null;

// Fallback in-memory cache for local dev without Redis
const memCache = new Map<string, { data: unknown; expires: number }>();

async function getCached<T>(key: string): Promise<T | null> {
  if (redis) {
    const val = await redis.get<T>(key);
    return val ?? null;
  }
  const entry = memCache.get(key);
  if (entry && Date.now() < entry.expires) return entry.data as T;
  return null;
}

async function setCache(key: string, data: unknown, ttlMs: number) {
  if (redis) {
    await redis.set(key, data, { ex: Math.ceil(ttlMs / 1000) });
  } else {
    memCache.set(key, { data, expires: Date.now() + ttlMs });
    if (memCache.size > 500) {
      const oldest = memCache.keys().next().value;
      if (oldest) memCache.delete(oldest);
    }
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
  const cached = await getCached<Quote>(key);
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
    await setCache(key, quote, 15000);
    return quote;
  } catch {
    return null;
  }
}

export type Candle = {
  date: string;
  close: number;
};

export async function getCandles(symbol: string, days = 30): Promise<Candle[]> {
  const key = `candles:${symbol}:${days}`;
  const cached = await getCached<Candle[]>(key);
  if (cached) return cached;

  try {
    // Yahoo Finance chart API (free, no key needed)
    const range = days <= 1 ? "1d" : days <= 7 ? "5d" : days <= 30 ? "1mo" : "3mo";
    const interval = days <= 1 ? "5m" : "1d";
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`;
    const res = await fetch(url, {
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) return [];
    const d = await res.json();
    const result = d.chart?.result?.[0];
    if (!result?.timestamp || !result?.indicators?.quote?.[0]?.close) return [];

    const timestamps: number[] = result.timestamp;
    const closes: (number | null)[] = result.indicators.quote[0].close;

    const candles: Candle[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (closes[i] != null) {
        candles.push({
          date: days <= 1
            ? new Date(timestamps[i] * 1000).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Chicago" })
            : new Date(timestamps[i] * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          close: Math.round(closes[i]! * 100) / 100,
        });
      }
    }

    await setCache(key, candles, 300000); // 5 min cache
    return candles;
  } catch {
    return [];
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
  const cached = await getCached<SearchResult[]>(key);
  if (cached) return cached;

  try {
    const res = await fetch(
      `${FINNHUB_BASE}/search?q=${encodeURIComponent(query)}&token=${API_KEY}`,
      { cache: "no-store" }
    );
    if (!res.ok) return [];
    const d = await res.json();
    const results: SearchResult[] = (d.result || [])
      .filter((r: { type: string }) => ["Common Stock", "ETF", "ETP"].includes(r.type))
      .slice(0, 10)
      .map((r: { symbol: string; description: string; type: string }) => ({
        symbol: r.symbol,
        description: r.description,
        type: r.type,
      }));
    await setCache(key, results, 3600000);
    return results;
  } catch {
    return [];
  }
}

export type NewsArticle = {
  id: number;
  headline: string;
  source: string;
  url: string;
  summary: string;
  image: string;
  datetime: number;
  category: string;
  related: string;
};

export async function getMarketNews(): Promise<NewsArticle[]> {
  const key = "market-news";
  const cached = await getCached<NewsArticle[]>(key);
  if (cached) return cached;

  try {
    const res = await fetch(
      `${FINNHUB_BASE}/news?category=general&token=${API_KEY}`,
      { cache: "no-store" }
    );
    if (!res.ok) return [];
    const articles: NewsArticle[] = await res.json();
    const result = articles.slice(0, 50);
    await setCache(key, result, 300000); // 5 min cache
    return result;
  } catch {
    return [];
  }
}
