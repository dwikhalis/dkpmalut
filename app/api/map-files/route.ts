import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";

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
    profileError ||
    (profile?.role !== "admin" && profile?.role !== "partner")
  ) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const formData = await request.formData();
  const path = formData.get("path");
  const file = formData.get("file");

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

  if (
    !hasSafePath ||
    (profile.role === "partner" && ownerId !== user.id)
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
