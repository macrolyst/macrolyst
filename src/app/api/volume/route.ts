import { NextResponse } from "next/server";
import { getMostActiveStocks } from "@/lib/yahoo";

export async function GET() {
  const stocks = await getMostActiveStocks();
  return NextResponse.json(stocks);
}
