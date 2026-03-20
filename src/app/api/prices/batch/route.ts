import { NextRequest, NextResponse } from "next/server";
import { getBatchQuotes } from "@/lib/finnhub";

export async function GET(request: NextRequest) {
  const symbols = request.nextUrl.searchParams.get("symbols");
  if (!symbols) return NextResponse.json({ error: "symbols required" }, { status: 400 });

  const list = symbols.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
  if (list.length === 0) return NextResponse.json({ error: "no valid symbols" }, { status: 400 });
  if (list.length > 50) return NextResponse.json({ error: "max 50 symbols" }, { status: 400 });

  const quotes = await getBatchQuotes(list);
  return NextResponse.json(quotes);
}
