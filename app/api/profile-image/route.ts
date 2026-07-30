import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
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

  const formData = await request.formData();
  const file = formData.get("file");

  if (
    !(file instanceof File) ||
    file.size <= 0 ||
    file.size > MAX_IMAGE_BYTES ||
    !ALLOWED_IMAGE_TYPES.has(file.type)
  ) {
    return NextResponse.json(
      { message: "File gambar tidak valid atau terlalu besar." },
      { status: 400 },
    );
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeName =
    file.name
      .replace(/\.[^.]+$/, "")
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9-]/g, "")
      .toLowerCase() || "profile";
  const path = `profiles/${user.id}/${Date.now()}-${safeName}.${extension}`;
  const { error: uploadError } = await supabaseAdmin.storage
    .from("images")
    .upload(path, file, {
      upsert: false,
      contentType: file.type,
    });

  if (uploadError) {
    return NextResponse.json(
      { message: uploadError.message },
      { status: 500 },
    );
  }

  const { data } = supabaseAdmin.storage.from("images").getPublicUrl(path);

  return NextResponse.json({ path, publicUrl: data.publicUrl });
}
