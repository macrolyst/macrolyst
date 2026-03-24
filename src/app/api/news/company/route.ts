import { NextRequest, NextResponse } from "next/server";

const FINNHUB_BASE = "https://finnhub.io/api/v1";
const API_KEY = process.env.FINNHUB_API_KEY;

const cache = new Map<string, { data: unknown; expires: number }>();

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

  const key = `company-news:${symbol.toUpperCase()}`;
  const cached = cache.get(key);
  if (cached && Date.now() < cached.expires) {
    return NextResponse.json(cached.data);
  }

  try {
    const to = new Date().toISOString().split("T")[0];
    const from = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const res = await fetch(
      `${FINNHUB_BASE}/company-news?symbol=${encodeURIComponent(symbol.toUpperCase())}&from=${from}&to=${to}&token=${API_KEY}`,
      { cache: "no-store" }
    );
    if (!res.ok) return NextResponse.json([]);

    const articles = await res.json();
    const result = (articles || []).slice(0, 20).map((a: { id: number; headline: string; source: string; url: string; summary: string; image: string; datetime: number }) => ({
      id: a.id,
      headline: a.headline,
      source: a.source,
      url: a.url,
      summary: a.summary,
      image: a.image,
      datetime: a.datetime,
    }));

    cache.set(key, { data: result, expires: Date.now() + 300000 }); // 5 min cache
    if (cache.size > 200) {
      const oldest = cache.keys().next().value;
      if (oldest) cache.delete(oldest);
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json([]);
  }
}
