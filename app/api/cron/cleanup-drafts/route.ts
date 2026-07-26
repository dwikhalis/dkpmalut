import crypto from "crypto";

import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const expected = process.env.CRON_SECRET?.trim();
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!expected || !supplied) return false;

  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  return (
    expectedBuffer.length === suppliedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, suppliedBuffer)
  );
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const now = new Date().toISOString();
  const [datasets, maps] = await Promise.all([
    supabaseAdmin
      .from("datasets")
      .delete({ count: "exact" })
      .eq("import_status", "draft")
      .lt("draft_expires_at", now),
    supabaseAdmin
      .from("map_datasets")
      .delete({ count: "exact" })
      .eq("import_status", "draft")
      .lt("draft_expires_at", now),
  ]);

  if (datasets.error || maps.error) {
    console.error("Scheduled draft cleanup failed:", {
      datasets: datasets.error?.code,
      maps: maps.error?.code,
    });
    return NextResponse.json({ message: "Cleanup failed" }, { status: 500 });
  }

  return NextResponse.json({
    cleaned: { datasets: datasets.count ?? 0, maps: maps.count ?? 0 },
  });
}

export const GET = POST;
