import { NextRequest, NextResponse } from "next/server";
import { searchSymbol } from "@/lib/finnhub";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");
  if (!q) return NextResponse.json([]);

  const results = await searchSymbol(q);
  return NextResponse.json(results);
}
