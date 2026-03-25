import { NextResponse } from "next/server";
import { getMarketNews } from "@/lib/finnhub";

const FMP_KEY = process.env.FMP_API_KEY || "";

type MixedItem = {
  id: string;
  headline: string;
  source: string;
  url: string;
  timestamp: number;
  tag: "market" | "headline" | "analysis";
};

const cache: { data: MixedItem[]; expires: number } = { data: [], expires: 0 };
const CACHE_TTL = 300000; // 5 min

function parseGoogleRss(xml: string): MixedItem[] {
  const items: MixedItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  let idx = 0;
  while ((match = itemRegex.exec(xml)) !== null && idx < 3) {
    const itemXml = match[1];
    const titleMatch = itemXml.match(/<title>([\s\S]*?)<\/title>/);
    const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/);
    const pubDateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
    if (titleMatch && linkMatch) {
      const rawTitle = titleMatch[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
      const lastDash = rawTitle.lastIndexOf(" - ");
      const headline = lastDash > 0 ? rawTitle.substring(0, lastDash) : rawTitle;
      const source = lastDash > 0 ? rawTitle.substring(lastDash + 3) : "Google News";
      const timestamp = pubDateMatch ? new Date(pubDateMatch[1]).getTime() / 1000 : Date.now() / 1000;
      items.push({ id: `h-${idx}`, headline, source, url: linkMatch[1], timestamp, tag: "headline" });
      idx++;
    }
  }
  return items;
}

export async function GET() {
  if (Date.now() < cache.expires && cache.data.length > 0) {
    return NextResponse.json(cache.data);
  }

  const mixed: MixedItem[] = [];

  // Fetch all 3 sources in parallel
  const [finnhubData, googleXml, fmpData] = await Promise.all([
    getMarketNews().catch(() => []),
    fetch("https://news.google.com/rss/search?q=stock+market+when:1d&hl=en-US&gl=US&ceid=US:en", {
      cache: "no-store", headers: { "User-Agent": "Mozilla/5.0" },
    }).then((r) => r.ok ? r.text() : "").catch(() => ""),
    FMP_KEY
      ? fetch(`https://financialmodelingprep.com/stable/fmp-articles?page=0&limit=3&apikey=${FMP_KEY}`, { cache: "no-store" })
          .then((r) => r.ok ? r.json() : []).catch(() => [])
      : Promise.resolve([]),
  ]);

  // Finnhub — top 3
  for (const a of finnhubData.slice(0, 3)) {
    mixed.push({ id: `m-${a.id}`, headline: a.headline, source: a.source, url: a.url, timestamp: a.datetime, tag: "market" });
  }

  // Google RSS — top 3
  mixed.push(...parseGoogleRss(googleXml));

  // FMP — top 3
  for (let i = 0; i < Math.min(3, fmpData.length); i++) {
    const a = fmpData[i];
    mixed.push({ id: `a-${i}`, headline: a.title, source: a.author || "FMP", url: a.link, timestamp: new Date(a.date).getTime() / 1000, tag: "analysis" });
  }

  // Sort newest first
  mixed.sort((a, b) => b.timestamp - a.timestamp);

  cache.data = mixed;
  cache.expires = Date.now() + CACHE_TTL;

  return NextResponse.json(mixed);
}
