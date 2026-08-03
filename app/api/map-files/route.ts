import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import { canManageData, isPartnerRole } from "@/lib/utils/roles";

export const dynamic = "force-dynamic";

const MAX_GEOJSON_BYTES = 50 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = new Set([
  "application/json",
  "application/geo+json",
]);

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

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError || !canManageData(profile?.role)
  ) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const formData = await request.formData();
  const path = formData.get("path");
  const file = formData.get("file");
  const mapDatasetId = formData.get("mapDatasetId");
  const requiredPermission = formData.get("permission");

  if (typeof path !== "string" || !(file instanceof File)) {
    return NextResponse.json(
      { message: "Path dan file peta wajib diisi." },
      { status: 400 },
    );
  }

  const ownerId = path.split("/")[0];
  const hasSafePath =
    Boolean(ownerId) &&
    !path.startsWith("/") &&
    !path.includes("\\") &&
    !path.split("/").includes("..");

  let sharedMapAllowed = false;

  if (
    hasSafePath &&
    isPartnerRole(profile.role) &&
    ownerId !== user.id &&
    typeof mapDatasetId === "string"
  ) {
    const [{ data: mapDataset }, { data: grant }] = await Promise.all([
      supabaseAdmin
        .from("map_datasets")
        .select("user_id")
        .eq("id", mapDatasetId)
        .maybeSingle(),
      supabaseAdmin
        .from("map_dataset_access_grants")
        .select("can_add, can_edit")
        .eq("map_dataset_id", mapDatasetId)
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);
    const hasPermission =
      requiredPermission === "add" ? grant?.can_add : grant?.can_edit;

    sharedMapAllowed =
      mapDataset?.user_id === ownerId && Boolean(hasPermission);
  }

  if (
    !hasSafePath ||
    (isPartnerRole(profile.role) &&
      ownerId !== user.id &&
      !sharedMapAllowed)
  ) {
    return NextResponse.json(
      { message: "Lokasi file peta tidak diizinkan." },
      { status: 403 },
    );
  }

  if (
    file.size <= 0 ||
    file.size > MAX_GEOJSON_BYTES ||
    !ALLOWED_CONTENT_TYPES.has(file.type)
  ) {
    return NextResponse.json(
      { message: "File GeoJSON tidak valid atau terlalu besar." },
      { status: 400 },
    );
  }

  const { error: uploadError } = await supabaseAdmin.storage
    .from("geojsons")
    .upload(path, file, {
      upsert: true,
      contentType: file.type,
    });

  if (uploadError) {
    return NextResponse.json(
      { message: uploadError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ path });
}
