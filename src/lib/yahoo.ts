const cache = new Map<string, { data: unknown; expires: number }>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expires) return entry.data as T;
  return null;
}

function setCache(key: string, data: unknown, ttlMs: number) {
  cache.set(key, { data, expires: Date.now() + ttlMs });
  if (cache.size > 100) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
}

export type TrendingTicker = {
  symbol: string;
};

export async function getTrendingTickers(): Promise<TrendingTicker[]> {
  const key = "trending-tickers";
  const cached = getCached<TrendingTicker[]>(key);
  if (cached) return cached;

  try {
    const res = await fetch(
      "https://query1.finance.yahoo.com/v1/finance/trending/US?count=20",
      { cache: "no-store", headers: { "User-Agent": "Mozilla/5.0" } }
    );
    if (!res.ok) return [];
    const d = await res.json();
    const quotes = d.finance?.result?.[0]?.quotes;
    if (!Array.isArray(quotes)) return [];
    const tickers: TrendingTicker[] = quotes
      .filter((q: { symbol: string }) => q.symbol && !q.symbol.includes("=") && !q.symbol.includes("^"))
      .slice(0, 15)
      .map((q: { symbol: string }) => ({ symbol: q.symbol }));
    setCache(key, tickers, 300000); // 5 min cache
    return tickers;
  } catch {
    return [];
  }
}
