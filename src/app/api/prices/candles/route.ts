import { NextRequest, NextResponse } from "next/server";
import { getCandles } from "@/lib/finnhub";

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol");
  const days = parseInt(request.nextUrl.searchParams.get("days") || "30");
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

  const candles = await getCandles(symbol.toUpperCase(), days);
  return NextResponse.json(candles);
}
