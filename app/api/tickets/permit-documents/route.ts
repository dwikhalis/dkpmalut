import crypto from "node:crypto";
import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";

export const runtime = "nodejs";

const BUCKET = "documents";
const MAX_FILES = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_REQUEST_SIZE = MAX_FILES * MAX_FILE_SIZE + 1024 * 1024;

async function requireAdmin(request: Request) {
  const accessToken = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  if (!accessToken) return null;

  const {
    data: { user },
  } = await supabaseAdmin.auth.getUser(accessToken);
  if (!user) return null;

  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return profile?.role === "admin" ? user : null;
}

function safeFilename(value: string) {
  const base = value
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  return base.toLowerCase().endsWith(".pdf") ? base : `${base || "permit"}.pdf`;
}

function isOwnedPath(path: string, userId: string) {
  return path.startsWith(`ticket-permits/${userId}/`) && !path.includes("..");
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_REQUEST_SIZE) {
    return NextResponse.json(
      { message: "Total unggahan terlalu besar." },
      { status: 413 },
    );
  }

  const formData = await request.formData();
  const files = formData
    .getAll("files")
    .filter((value): value is File => value instanceof File);

  if (files.length === 0 || files.length > MAX_FILES) {
    return NextResponse.json(
      { message: `Pilih 1 sampai ${MAX_FILES} dokumen PDF.` },
      { status: 400 },
    );
  }

  const validated: Array<{ file: File; bytes: Uint8Array }> = [];
  for (const file of files) {
    if (
      file.type !== "application/pdf" ||
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      return NextResponse.json(
        { message: `${file.name} bukan dokumen PDF.` },
        { status: 400 },
      );
    }
    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { message: `${file.name} melebihi batas 10 MB.` },
        { status: 400 },
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const signature = new TextDecoder("ascii").decode(bytes.slice(0, 5));
    if (signature !== "%PDF-") {
      return NextResponse.json(
        { message: `${file.name} tidak memiliki isi PDF yang valid.` },
        { status: 400 },
      );
    }
    validated.push({ file, bytes });
  }

  const uploadedPaths: string[] = [];
  try {
    const documents = [];
    for (const { file, bytes } of validated) {
      const path = `ticket-permits/${admin.id}/${new Date()
        .toISOString()
        .slice(0, 10)}/${crypto.randomUUID()}-${safeFilename(file.name)}`;
      const { error } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(path, bytes, {
          contentType: "application/pdf",
          upsert: false,
        });
      if (error) throw error;
      uploadedPaths.push(path);

      const { data: signed } = await supabaseAdmin.storage
        .from(BUCKET)
        .createSignedUrl(path, 600);
      documents.push({
        name: file.name.slice(0, 200),
        path,
        size: file.size,
        previewUrl: signed?.signedUrl ?? null,
      });
    }

    return NextResponse.json({ documents }, { status: 201 });
  } catch (error) {
    if (uploadedPaths.length) {
      await supabaseAdmin.storage.from(BUCKET).remove(uploadedPaths);
    }
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Dokumen gagal diunggah.",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const path = new URL(request.url).searchParams.get("path")?.trim() || "";
  if (!isOwnedPath(path, admin.id)) {
    return NextResponse.json({ message: "Invalid path" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(path, 600);
  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { message: "Dokumen tidak ditemukan." },
      { status: 404 },
    );
  }

  return NextResponse.json({ url: data.signedUrl });
}

export async function DELETE(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as { path?: unknown };
  const path = typeof body.path === "string" ? body.path.trim() : "";
  if (!isOwnedPath(path, admin.id)) {
    return NextResponse.json({ message: "Invalid path" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.storage.from(BUCKET).remove([path]);
  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
  return NextResponse.json({ deleted: true });
}
