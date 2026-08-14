import crypto from "crypto";

import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DeletedDraft = {
  id: string;
  label: string | null;
  user_id: string | null;
};

function formatDeletedDrafts(
  datasets: DeletedDraft[],
  maps: DeletedDraft[],
) {
  const deleted = [
    ...datasets.map((draft) => ({ ...draft, type: "Dataset" })),
    ...maps.map((draft) => ({ ...draft, type: "Dataset peta" })),
  ];
  const displayed = deleted.slice(0, 25);
  const details = displayed.map(
    (draft, index) =>
      `${index + 1}. ${draft.type}: ${draft.label?.trim() || "Tanpa judul"} (ID: ${draft.id}, pemilik: ${draft.user_id ?? "tidak diketahui"})`,
  );

  if (deleted.length > displayed.length) {
    details.push(`...dan ${deleted.length - displayed.length} draf lainnya.`);
  }

  return [
    `Sistem telah menghapus ${deleted.length} draf kedaluwarsa secara otomatis (${datasets.length} dataset dan ${maps.length} dataset peta).`,
    "",
    ...details,
  ].join("\n");
}

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
      .delete()
      .eq("import_status", "draft")
      .lt("draft_expires_at", now)
      .select("id, label, user_id"),
    supabaseAdmin
      .from("map_datasets")
      .delete()
      .eq("import_status", "draft")
      .lt("draft_expires_at", now)
      .select("id, label, user_id"),
  ]);

  if (datasets.error || maps.error) {
    console.error("Scheduled draft cleanup failed:", {
      datasets: datasets.error?.code,
      maps: maps.error?.code,
    });
    return NextResponse.json({ message: "Cleanup failed" }, { status: 500 });
  }

  const deletedDatasets = (datasets.data ?? []) as DeletedDraft[];
  const deletedMaps = (maps.data ?? []) as DeletedDraft[];
  const deletedCount = deletedDatasets.length + deletedMaps.length;

  if (deletedCount > 0) {
    const { error: notificationError } = await supabaseAdmin
      .from("messages")
      .insert({
        name: "System",
        email: "system@dkpmalut.local",
        phone: null,
        message: formatDeletedDrafts(deletedDatasets, deletedMaps),
        status: "unread",
        email_delivery_status: "not_attempted",
        email_sent_at: null,
        email_delivery_error: null,
      });

    if (notificationError) {
      console.error("Draft cleanup admin notification failed:", {
        code: notificationError.code,
        deletedCount,
      });
      return NextResponse.json(
        {
          message: "Drafts were cleaned, but the admin notification failed",
          cleaned: {
            datasets: deletedDatasets.length,
            maps: deletedMaps.length,
          },
        },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({
    cleaned: { datasets: deletedDatasets.length, maps: deletedMaps.length },
    notified: deletedCount > 0,
  });
}

export const GET = POST;
