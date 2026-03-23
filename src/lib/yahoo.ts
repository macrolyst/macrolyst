const cache = new Map<string, { data: unknown; expires: number; createdAt: number }>();

function getCached<T>(key: string): { data: T; createdAt: number } | null {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expires) return { data: entry.data as T, createdAt: entry.createdAt };
  return null;
}

function setCache(key: string, data: unknown, ttlMs: number) {
  cache.set(key, { data, expires: Date.now() + ttlMs, createdAt: Date.now() });
  if (cache.size > 100) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
}

export type MostActiveStock = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  avgVolume: number;
  volumeRatio: number;
  marketCap: number;
  peRatio: number | null;
  shortPercent: number | null;
};

export type ScreenerResponse = { stocks: MostActiveStock[]; fetchedAt: number };

export async function getMostActiveStocks(): Promise<ScreenerResponse> {
  const key = "most-active";
  const cached = getCached<MostActiveStock[]>(key);
  if (cached) return { stocks: cached.data, fetchedAt: cached.createdAt };

  try {
    const res = await fetch(
      "https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?scrIds=most_actives&count=100",
      { cache: "no-store", headers: { "User-Agent": "Mozilla/5.0" } }
    );
    if (!res.ok) return { stocks: [], fetchedAt: Date.now() };
    const d = await res.json();
    const quotes = d.finance?.result?.[0]?.quotes;
    if (!Array.isArray(quotes)) return { stocks: [], fetchedAt: Date.now() };

    const stocks: MostActiveStock[] = quotes
      .filter((q: Record<string, unknown>) => q.regularMarketVolume && q.symbol)
      .map((q: Record<string, unknown>) => {
        const vol = Number(q.regularMarketVolume) || 0;
        const avgVol = Number(q.averageDailyVolume3Month) || 1;
        return {
          symbol: String(q.symbol),
          name: String(q.shortName || q.longName || ""),
          price: Number(q.regularMarketPrice) || 0,
          change: Number(q.regularMarketChange) || 0,
          changePercent: Number(q.regularMarketChangePercent) || 0,
          volume: vol,
          avgVolume: avgVol,
          volumeRatio: Math.round((vol / avgVol) * 100) / 100,
          marketCap: Number(q.marketCap) || 0,
          peRatio: q.trailingPE ? Number(q.trailingPE) : null,
          shortPercent: q.shortPercentOfFloat ? Number(q.shortPercentOfFloat) : null,
        };
      });

    setCache(key, stocks, 900000); // 15 min cache
    return { stocks, fetchedAt: Date.now() };
  } catch {
    return { stocks: [], fetchedAt: Date.now() };
  }
}

export async function getScreenerStocks(scrId: string): Promise<ScreenerResponse> {
  const key = `screener-${scrId}`;
  const cached = getCached<MostActiveStock[]>(key);
  if (cached) return { stocks: cached.data, fetchedAt: cached.createdAt };

  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?scrIds=${scrId}&count=100`,
      { cache: "no-store", headers: { "User-Agent": "Mozilla/5.0" } }
    );
    if (!res.ok) return { stocks: [], fetchedAt: Date.now() };
    const d = await res.json();
    const quotes = d.finance?.result?.[0]?.quotes;
    if (!Array.isArray(quotes)) return { stocks: [], fetchedAt: Date.now() };

    const stocks: MostActiveStock[] = quotes
      .filter((q: Record<string, unknown>) => q.symbol)
      .map((q: Record<string, unknown>) => {
        const vol = Number(q.regularMarketVolume) || 0;
        const avgVol = Number(q.averageDailyVolume3Month) || 1;
        return {
          symbol: String(q.symbol),
          name: String(q.shortName || q.longName || ""),
          price: Number(q.regularMarketPrice) || 0,
          change: Number(q.regularMarketChange) || 0,
          changePercent: Number(q.regularMarketChangePercent) || 0,
          volume: vol,
          avgVolume: avgVol,
          volumeRatio: Math.round((vol / avgVol) * 100) / 100,
          marketCap: Number(q.marketCap) || 0,
          peRatio: q.trailingPE ? Number(q.trailingPE) : null,
          shortPercent: q.shortPercentOfFloat ? Number(q.shortPercentOfFloat) : null,
        };
      });

    setCache(key, stocks, 900000); // 15 min cache
    return { stocks, fetchedAt: Date.now() };
  } catch {
    return { stocks: [], fetchedAt: Date.now() };
  }
}

export type TrendingTicker = {
  symbol: string;
};

export async function getTrendingTickers(): Promise<TrendingTicker[]> {
  const key = "trending-tickers";
  const cached = getCached<TrendingTicker[]>(key);
  if (cached) return cached.data;

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
