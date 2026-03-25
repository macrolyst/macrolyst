import { NextResponse } from "next/server";
import { getScreenerStocks, getTrendingTickers } from "@/lib/yahoo";
import { getBatchQuotes } from "@/lib/finnhub";

type Stock = {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  volume?: string;
  volumeRatio?: number;
};

type Section = {
  title: string;
  stocks: Stock[];
};

const cache: { data: Section[]; expires: number } = { data: [], expires: 0 };
const CACHE_TTL = 300000; // 5 min

function fmtVol(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return v.toString();
}

export async function GET() {
  if (Date.now() < cache.expires && cache.data.length > 0) {
    return NextResponse.json(cache.data);
  }

  const [trending, volume, gainers, losers, shorted, undervalued] = await Promise.all([
    getTrendingTickers().catch(() => []),
    getScreenerStocks("most_actives").catch(() => ({ stocks: [], fetchedAt: 0 })),
    getScreenerStocks("day_gainers").catch(() => ({ stocks: [], fetchedAt: 0 })),
    getScreenerStocks("day_losers").catch(() => ({ stocks: [], fetchedAt: 0 })),
    getScreenerStocks("most_shorted_stocks").catch(() => ({ stocks: [], fetchedAt: 0 })),
    getScreenerStocks("undervalued_large_caps").catch(() => ({ stocks: [], fetchedAt: 0 })),
  ]);

  const sections: Section[] = [];

  // Trending — need quotes for prices
  if (trending.length > 0) {
    const symbols = trending.slice(0, 5).map((t) => t.symbol);
    const quotes = await getBatchQuotes(symbols).catch(() => []);
    if (quotes.length > 0) {
      sections.push({
        title: "Trending",
        stocks: quotes.map((q) => ({ symbol: q.symbol, name: "", price: q.price, changePercent: q.changePercent })),
      });
    }
  }

  // Most Active
  if (volume.stocks.length > 0) {
    sections.push({
      title: "Most Active",
      stocks: volume.stocks.slice(0, 10).map((s) => ({
        symbol: s.symbol, name: s.name, price: s.price, changePercent: s.changePercent,
        volume: fmtVol(s.volume), volumeRatio: s.volumeRatio,
      })),
    });
  }

  // Gainers
  if (gainers.stocks.length > 0) {
    sections.push({
      title: "Top Gainers",
      stocks: gainers.stocks.slice(0, 5).map((s) => ({ symbol: s.symbol, name: s.name, price: s.price, changePercent: s.changePercent })),
    });
  }

  // Losers
  if (losers.stocks.length > 0) {
    sections.push({
      title: "Top Losers",
      stocks: losers.stocks.slice(0, 5).map((s) => ({ symbol: s.symbol, name: s.name, price: s.price, changePercent: s.changePercent })),
    });
  }

  // Shorted
  if (shorted.stocks.length > 0) {
    sections.push({
      title: "Most Shorted",
      stocks: shorted.stocks.slice(0, 5).map((s) => ({ symbol: s.symbol, name: s.name, price: s.price, changePercent: s.changePercent })),
    });
  }

  // Undervalued
  if (undervalued.stocks.length > 0) {
    sections.push({
      title: "Undervalued",
      stocks: undervalued.stocks.slice(0, 5).map((s) => ({ symbol: s.symbol, name: s.name, price: s.price, changePercent: s.changePercent })),
    });
  }

  cache.data = sections;
  cache.expires = Date.now() + CACHE_TTL;

  return NextResponse.json(sections);
}
