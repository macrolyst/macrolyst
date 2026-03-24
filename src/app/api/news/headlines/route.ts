import { NextResponse } from "next/server";

type Headline = {
  title: string;
  link: string;
  source: string;
  pubDate: string;
  timestamp: number;
};

const cache: { data: Headline[]; expires: number } = { data: [], expires: 0 };
const CACHE_TTL = 300000; // 5 min

function extractSource(title: string): { headline: string; source: string } {
  // Google News format: "Headline - Source Name"
  const lastDash = title.lastIndexOf(" - ");
  if (lastDash > 0) {
    return {
      headline: title.substring(0, lastDash),
      source: title.substring(lastDash + 3),
    };
  }
  return { headline: title, source: "Google News" };
}

function parseXml(xml: string): Headline[] {
  const items: Headline[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];

    const titleMatch = itemXml.match(/<title>([\s\S]*?)<\/title>/);
    const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/);
    const pubDateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/);

    if (titleMatch && linkMatch) {
      const rawTitle = titleMatch[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
      const { headline, source } = extractSource(rawTitle);
      const pubDate = pubDateMatch ? pubDateMatch[1] : "";
      const timestamp = pubDate ? new Date(pubDate).getTime() / 1000 : Date.now() / 1000;

      items.push({
        title: headline,
        link: linkMatch[1],
        source,
        pubDate,
        timestamp,
      });
    }
  }

  return items.sort((a, b) => b.timestamp - a.timestamp).slice(0, 100);
}

export async function GET() {
  if (Date.now() < cache.expires && cache.data.length > 0) {
    return NextResponse.json(cache.data);
  }

  try {
    const res = await fetch(
      "https://news.google.com/rss/search?q=stock+market+when:1d&hl=en-US&gl=US&ceid=US:en",
      { cache: "no-store", headers: { "User-Agent": "Mozilla/5.0" } }
    );
    if (!res.ok) return NextResponse.json(cache.data.length > 0 ? cache.data : []);

    const xml = await res.text();
    const headlines = parseXml(xml);

    cache.data = headlines;
    cache.expires = Date.now() + CACHE_TTL;

    return NextResponse.json(headlines);
  } catch {
    return NextResponse.json(cache.data.length > 0 ? cache.data : []);
  }
}
