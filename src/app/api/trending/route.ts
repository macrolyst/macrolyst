import { NextResponse } from "next/server";
import { getTrendingTickers } from "@/lib/yahoo";
import { getBatchQuotes } from "@/lib/finnhub";

export async function GET() {
  const trending = await getTrendingTickers();
  if (trending.length === 0) return NextResponse.json([]);

  const symbols = trending.map((t) => t.symbol);
  const quotes = await getBatchQuotes(symbols);
  return NextResponse.json(quotes);
}
