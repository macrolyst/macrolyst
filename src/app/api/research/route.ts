import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { researchReports, researchLimits } from "@/lib/db/schema";
import { eq, and, gt, desc, sql } from "drizzle-orm";
import { generateResearch } from "@/lib/research";
import { auth } from "@/lib/auth/server";

const DAILY_LIMIT = 5;
const CACHE_MINUTES = 30;
const RETENTION_DAYS = 7;

async function getUserId(): Promise<string | null> {
  const session = await auth.getSession();
  return session?.data?.user?.id ?? null;
}

function todayCST(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
}

// POST /api/research — generate new research
export async function POST(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const ticker = (body.ticker || "").toUpperCase().trim();
  if (!ticker || ticker.length > 10) return NextResponse.json({ error: "Invalid ticker" }, { status: 400 });

  // Check cache: any research for this ticker within last 30 min?
  const cacheThreshold = new Date(Date.now() - CACHE_MINUTES * 60 * 1000);
  const [cached] = await db
    .select()
    .from(researchReports)
    .where(and(eq(researchReports.ticker, ticker), gt(researchReports.createdAt, cacheThreshold)))
    .orderBy(desc(researchReports.createdAt))
    .limit(1);

  if (cached) {
    return NextResponse.json({ id: cached.id, data: cached.data, cached: true });
  }

  // Check daily limit
  const today = todayCST();
  const [limitRow] = await db
    .select()
    .from(researchLimits)
    .where(and(eq(researchLimits.userId, userId), eq(researchLimits.date, today)));

  const currentCount = limitRow?.count ?? 0;
  if (currentCount >= DAILY_LIMIT) {
    return NextResponse.json({ error: "Daily research limit reached (5/day)", remaining: 0 }, { status: 429 });
  }

  // Generate research
  const data = await generateResearch(ticker);

  // Store
  const expiresAt = new Date(Date.now() + RETENTION_DAYS * 86400000);
  const [report] = await db
    .insert(researchReports)
    .values({
      userId,
      ticker,
      companyName: data.profile.name,
      data,
      expiresAt,
    })
    .returning({ id: researchReports.id });

  // Increment limit
  await db
    .insert(researchLimits)
    .values({ userId, date: today, count: 1 })
    .onConflictDoUpdate({
      target: [researchLimits.userId, researchLimits.date],
      set: { count: sql`${researchLimits.count} + 1` },
    });

  // Lazy cleanup: delete expired reports (non-blocking)
  db.delete(researchReports).where(gt(sql`now()`, researchReports.expiresAt)).catch(() => {});

  return NextResponse.json({
    id: report.id,
    data,
    cached: false,
    remaining: DAILY_LIMIT - currentCount - 1,
  });
}

// GET /api/research — user's history
export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const reports = await db
    .select({
      id: researchReports.id,
      ticker: researchReports.ticker,
      companyName: researchReports.companyName,
      createdAt: researchReports.createdAt,
    })
    .from(researchReports)
    .where(and(eq(researchReports.userId, userId), gt(researchReports.expiresAt, sql`now()`)))
    .orderBy(desc(researchReports.createdAt))
    .limit(30);

  // Get today's remaining
  const today = todayCST();
  const [limitRow] = await db
    .select()
    .from(researchLimits)
    .where(and(eq(researchLimits.userId, userId), eq(researchLimits.date, today)));

  return NextResponse.json({
    reports,
    remaining: DAILY_LIMIT - (limitRow?.count ?? 0),
  });
}
