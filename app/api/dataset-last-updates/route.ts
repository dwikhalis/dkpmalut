import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import { canManageData } from "@/lib/utils/roles";

type Resource = { id: string; kind: "dataset" | "map" };

export async function POST(request: Request) {
  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");

  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const {
    data: { user },
    error: authError,
  } = await supabaseAdmin.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!canManageData(profile?.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    resources?: Resource[];
  } | null;
  const resources = (body?.resources ?? []).filter(
    (item) =>
      typeof item?.id === "string" &&
      (item.kind === "dataset" || item.kind === "map"),
  );

  if (resources.length === 0 || resources.length > 500) {
    return NextResponse.json({ updates: [] });
  }

  const datasetIds = resources
    .filter((item) => item.kind === "dataset")
    .map((item) => item.id);
  const mapIds = resources
    .filter((item) => item.kind === "map")
    .map((item) => item.id);
  const allowed = new Set<string>();

  if (profile.role === "admin") {
    resources.forEach((item) => allowed.add(`${item.kind}:${item.id}`));
  } else {
    const [{ data: ownedDatasets }, { data: grants }, { data: ownedMaps }] =
      await Promise.all([
        datasetIds.length
          ? supabaseAdmin
              .from("datasets")
              .select("id")
              .in("id", datasetIds)
              .eq("user_id", user.id)
          : Promise.resolve({ data: [] }),
        datasetIds.length
          ? supabaseAdmin
              .from("dataset_access_grants")
              .select("dataset_id")
              .in("dataset_id", datasetIds)
              .eq("user_id", user.id)
          : Promise.resolve({ data: [] }),
        mapIds.length
          ? supabaseAdmin
              .from("map_datasets")
              .select("id")
              .in("id", mapIds)
              .eq("user_id", user.id)
          : Promise.resolve({ data: [] }),
      ]);

    ownedDatasets?.forEach((item) => allowed.add(`dataset:${item.id}`));
    grants?.forEach((item) => allowed.add(`dataset:${item.dataset_id}`));
    ownedMaps?.forEach((item) => allowed.add(`map:${item.id}`));
  }

  const allowedIds = Array.from(
    new Set(
      resources
        .filter((item) => allowed.has(`${item.kind}:${item.id}`))
        .map((item) => item.id),
    ),
  );

  if (allowedIds.length === 0) {
    return NextResponse.json({ updates: [] });
  }

  const { data: logs, error: logsError } = await supabaseAdmin
    .from("activity_logs")
    .select("entity_id, entity_type, actor_id, created_at, metadata")
    .in("entity_id", allowedIds)
    .in("entity_type", ["datasets", "map_datasets"])
    .not("actor_id", "is", null)
    .order("created_at", { ascending: false });

  if (logsError) {
    return NextResponse.json({ message: logsError.message }, { status: 500 });
  }

  const actorIds = Array.from(
    new Set((logs ?? []).flatMap((log) => (log.actor_id ? [log.actor_id] : []))),
  );
  const { data: actors } = actorIds.length
    ? await supabaseAdmin.from("users").select("id, username").in("id", actorIds)
    : { data: [] };
  const actorMap = new Map(
    (actors ?? [])
      .filter((actor) => actor.username?.trim())
      .map((actor) => [actor.id, actor.username.trim()]),
  );
  const updates = new Map<
    string,
    {
      resource_kind: string;
      resource_id: string;
      updated_by: string;
      updated_at: string;
      publication_changed_at: string | null;
    }
  >();

  for (const log of logs ?? []) {
    const kind = log.entity_type === "map_datasets" ? "map" : "dataset";
    const key = `${kind}:${log.entity_id}`;
    const username = log.actor_id ? actorMap.get(log.actor_id) : null;

    if (!allowed.has(key) || !username) continue;

    const existing = updates.get(key);
    const changedFields = Array.isArray(log.metadata?.changed_fields)
      ? log.metadata.changed_fields
      : [];
    const publicationChanged = changedFields.includes("published");

    if (!existing) {
      updates.set(key, {
        resource_kind: kind,
        resource_id: log.entity_id,
        updated_by: username,
        updated_at: log.created_at,
        publication_changed_at: publicationChanged ? log.created_at : null,
      });
    } else if (!existing.publication_changed_at && publicationChanged) {
      existing.publication_changed_at = log.created_at;
    }
  }

  return NextResponse.json({ updates: Array.from(updates.values()) });
}
