import { NextResponse } from "next/server";

type FmpArticle = {
  title: string;
  date: string;
  tickers: string;
  image: string;
  link: string;
  author: string;
  site: string;
  content: string;
};

const cache: { data: FmpArticle[]; expires: number } = { data: [], expires: 0 };
const CACHE_TTL = 900000; // 15 min
const FMP_KEY = process.env.FMP_API_KEY || "";

export async function GET() {
  if (Date.now() < cache.expires && cache.data.length > 0) {
    return NextResponse.json(cache.data);
  }

  if (!FMP_KEY) return NextResponse.json([]);

  try {
    const res = await fetch(
      `https://financialmodelingprep.com/stable/fmp-articles?page=0&limit=50&apikey=${FMP_KEY}`,
      { cache: "no-store" }
    );
    if (!res.ok) return NextResponse.json(cache.data.length > 0 ? cache.data : []);

    const articles: FmpArticle[] = await res.json();
    const cleaned = articles.map((a) => ({
      title: a.title,
      date: a.date,
      tickers: a.tickers,
      image: a.image,
      link: a.link,
      author: a.author,
      site: a.site,
      content: "", // Strip full content to save bandwidth
    }));

    cache.data = cleaned;
    cache.expires = Date.now() + CACHE_TTL;

    return NextResponse.json(cleaned);
  } catch {
    return NextResponse.json(cache.data.length > 0 ? cache.data : []);
  }
}
