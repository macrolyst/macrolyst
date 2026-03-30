import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { researchReports } from "@/lib/db/schema";
import { eq, and, gt, sql } from "drizzle-orm";
import { auth } from "@/lib/auth/server";

async function getUserId(): Promise<string | null> {
  const session = await auth.getSession();
  return session?.data?.user?.id ?? null;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [report] = await db
    .select()
    .from(researchReports)
    .where(and(
      eq(researchReports.id, id),
      eq(researchReports.userId, userId),
      gt(researchReports.expiresAt, sql`now()`),
    ))
    .limit(1);

  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ id: report.id, data: report.data });
}
