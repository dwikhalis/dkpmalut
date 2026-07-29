import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");

  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { data: authData, error: authError } =
    await supabaseAdmin.auth.getUser(token);
  const userId = authData.user?.id;

  if (authError || !userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("users")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (profileError || profile?.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { data: logs, error } = await supabaseAdmin
    .from("activity_logs")
    .select(
      "id, actor_id, action, entity_type, entity_id, metadata, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  const actorIds = [
    ...new Set((logs ?? []).map((log) => log.actor_id).filter(Boolean)),
  ];
  const relatedUserIds = [
    ...new Set(
      (logs ?? [])
        .map((log) => log.metadata?.granted_user_id)
        .filter((id): id is string => typeof id === "string"),
    ),
  ];
  const userIds = [...new Set([...actorIds, ...relatedUserIds])];
  const { data: actors } = userIds.length
    ? await supabaseAdmin
        .from("users")
        .select("id, username, email, organization, role")
        .in("id", userIds)
    : { data: [] };
  const actorMap = new Map((actors ?? []).map((actor) => [actor.id, actor]));
  return NextResponse.json(
    {
      logs: (logs ?? []).map((log) => ({
        ...log,
        actor: actorMap.get(log.actor_id) ?? null,
        metadata: {
          ...(log.metadata ?? {}),
          ...(typeof log.metadata?.granted_user_id === "string"
            ? {
                granted_user_name:
                  actorMap.get(log.metadata.granted_user_id)?.username ||
                  actorMap.get(log.metadata.granted_user_id)?.organization ||
                  actorMap.get(log.metadata.granted_user_id)?.email ||
                  log.metadata.granted_user_id,
              }
            : {}),
        },
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
