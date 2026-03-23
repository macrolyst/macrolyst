import { NextRequest, NextResponse } from "next/server";
import { getScreenerStocks } from "@/lib/yahoo";

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type") || "day_gainers";
  if (!["day_gainers", "day_losers", "most_shorted_stocks", "undervalued_large_caps"].includes(type)) {
    return NextResponse.json({ error: "invalid type" }, { status: 400 });
  }
  const stocks = await getScreenerStocks(type);
  return NextResponse.json(stocks);
}
