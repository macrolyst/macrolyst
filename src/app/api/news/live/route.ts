import { NextResponse } from "next/server";
import { getMarketNews } from "@/lib/finnhub";

export async function GET() {
  const articles = await getMarketNews();
  return NextResponse.json(articles);
}
