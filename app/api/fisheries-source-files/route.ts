import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";

export const runtime = "nodejs";

const BUCKET = "fisheries-source-files";
const MAX_FILE_BYTES = 50 * 1024 * 1024;
const ALLOWED_ROLES = new Set(["trips", "catches", "effort", "lengths"]);

type UploadDescriptor = {
  role: string;
  name: string;
  size: number;
  type?: string;
};

function safeName(value: string) {
  const base = value
    .replace(/\.[^.]+$/, "")
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
  return `${base || "source"}.csv`;
}

async function actor(request: Request) {
  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;
  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();
  return { user: data.user, admin: profile?.role === "admin" };
}

async function editableDashboard(
  dashboardId: string,
  auth: Awaited<ReturnType<typeof actor>>,
) {
  if (!auth) return null;
  const { data } = await supabaseAdmin
    .from("datasets")
    .select("id,user_id,kind,published")
    .eq("id", dashboardId)
    .maybeSingle();
  return data?.kind === "dashboard" &&
    !["requested", "approved"].includes(data.published ?? "") &&
    (data.user_id === auth.user.id || auth.admin)
    ? data
    : null;
}

function validFiles(files: UploadDescriptor[]) {
  if (!files.length || files.length > ALLOWED_ROLES.size) return false;
  if (new Set(files.map((file) => file.role)).size !== files.length)
    return false;
  return files.every(
    (file) =>
      ALLOWED_ROLES.has(file.role) &&
      /\.csv$/i.test(file.name) &&
      Number.isSafeInteger(file.size) &&
      file.size > 0 &&
      file.size <= MAX_FILE_BYTES,
  );
}

export async function POST(request: Request) {
  const auth = await actor(request);
  if (!auth)
    return NextResponse.json({ message: "Tidak diizinkan." }, { status: 401 });
  const body = (await request.json()) as {
    action?: "initiate" | "complete";
    dashboardId?: string;
    batchId?: string;
    files?: UploadDescriptor[];
  };

  if (body.action === "initiate") {
    const dashboard = await editableDashboard(body.dashboardId ?? "", auth);
    const files = body.files ?? [];
    if (!dashboard)
      return NextResponse.json(
        { message: "Dashboard tidak dapat diubah." },
        { status: 403 },
      );
    if (!validFiles(files))
      return NextResponse.json(
        {
          message:
            "Pilih file CSV unik untuk setiap jenis, maksimal 50 MB per file.",
        },
        { status: 400 },
      );
    const { data: batch, error: batchError } = await supabaseAdmin
      .from("fisheries_import_batches")
      .insert({
        dashboard_id: dashboard.id,
        owner_id: dashboard.user_id,
        created_by: auth.user.id,
        status: "uploading",
        source_manifest: files,
      })
      .select("id")
      .single();
    if (batchError || !batch)
      return NextResponse.json(
        { message: "Sesi unggah tidak dapat dibuat." },
        { status: 500 },
      );
    const signed = [];
    try {
      for (const file of files) {
        const path = `${dashboard.user_id}/${batch.id}/${file.role}-${randomUUID()}-${safeName(file.name)}`;
        const { data, error } = await supabaseAdmin.storage
          .from(BUCKET)
          .createSignedUploadUrl(path);
        if (error || !data) throw error ?? new Error("Signed URL unavailable");
        signed.push({
          role: file.role,
          path,
          token: data.token,
          originalName: file.name.slice(0, 255),
          size: file.size,
          type: file.type || "text/csv",
        });
      }
      await supabaseAdmin
        .from("fisheries_import_batches")
        .update({
          source_manifest: signed.map(
            ({ role, path, originalName, size, type }) => ({
              role,
              path,
              name: originalName,
              size,
              type,
            }),
          ),
        })
        .eq("id", batch.id);
      return NextResponse.json({ batchId: batch.id, uploads: signed });
    } catch (cause) {
      console.error("Signed fisheries upload initialization failed:", cause);
      await supabaseAdmin
        .from("fisheries_import_batches")
        .delete()
        .eq("id", batch.id);
      return NextResponse.json(
        { message: "Tautan unggah tidak dapat dibuat." },
        { status: 500 },
      );
    }
  }

  if (body.action === "complete") {
    const files = body.files ?? [];
    const { data: batch } = await supabaseAdmin
      .from("fisheries_import_batches")
      .select("id,dashboard_id,owner_id,status,source_manifest")
      .eq("id", body.batchId ?? "")
      .maybeSingle();
    const dashboard = batch
      ? await editableDashboard(batch.dashboard_id ?? "", auth)
      : null;
    if (
      !batch ||
      !dashboard ||
      batch.status !== "uploading" ||
      batch.owner_id !== dashboard.user_id ||
      !validFiles(files) ||
      JSON.stringify(
        files.map(({ role, name, size, type }) => ({ role, name, size, type })),
      ) !==
        JSON.stringify(
          (batch.source_manifest as UploadDescriptor[]).map(
            ({ role, name, size, type }) => ({ role, name, size, type }),
          ),
        )
    )
      return NextResponse.json(
        { message: "Sesi unggah tidak valid atau sudah selesai." },
        { status: 400 },
      );

    const prefix = `${batch.owner_id}/${batch.id}/`;
    const records = [];
    const manifest = [];
    try {
      for (const file of batch.source_manifest as Array<
        UploadDescriptor & { path: string }
      >) {
        const path = file.path;
        if (!path.startsWith(prefix) || path.includes(".."))
          throw new Error("Invalid storage path");
        const { data: blob, error } = await supabaseAdmin.storage
          .from(BUCKET)
          .download(path);
        if (error || !blob || blob.size !== file.size)
          throw error ?? new Error("Stored file size mismatch");
        const hash = createHash("sha256")
          .update(Buffer.from(await blob.arrayBuffer()))
          .digest("hex");
        records.push({
          import_batch_id: batch.id,
          owner_id: batch.owner_id,
          file_role: file.role,
          original_file_name: file.name.slice(0, 255),
          storage_path: path,
          content_type: file.type || "text/csv",
          size_bytes: file.size,
          sha256: hash,
        });
        manifest.push({
          role: file.role,
          name: file.name.slice(0, 255),
          size: file.size,
          sha256: hash,
        });
      }
      const { error: insertError } = await supabaseAdmin
        .from("fisheries_source_files")
        .upsert(records, { onConflict: "storage_path" });
      if (insertError) throw insertError;
      const { error: batchError } = await supabaseAdmin
        .from("fisheries_import_batches")
        .update({ status: "pending", source_manifest: manifest })
        .eq("id", batch.id)
        .eq("status", "uploading");
      if (batchError) throw batchError;
      return NextResponse.json({ batchId: batch.id, files: manifest });
    } catch (cause) {
      console.error("Fisheries upload registration failed:", cause);
      return NextResponse.json(
        {
          message:
            "Unggahan belum dapat diverifikasi. Coba selesaikan kembali tanpa mengunggah ulang.",
        },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ message: "Aksi tidak valid." }, { status: 400 });
}

export async function GET(request: Request) {
  const auth = await actor(request);
  if (!auth)
    return NextResponse.json({ message: "Tidak diizinkan." }, { status: 401 });
  const datasetId = new URL(request.url).searchParams.get("dataset_id");
  if (!datasetId)
    return NextResponse.json(
      { message: "Dataset tidak tersedia." },
      { status: 400 },
    );
  const { data: dataset } = await supabaseAdmin
    .from("fisheries_datasets")
    .select("id,partner_id")
    .eq("id", datasetId)
    .maybeSingle();
  if (!dataset || (dataset.partner_id !== auth.user.id && !auth.admin))
    return NextResponse.json(
      {
        message:
          "Hanya pemilik data dan admin yang dapat mengekspor file asli.",
      },
      { status: 403 },
    );
  const { data: files, error } = await supabaseAdmin
    .from("fisheries_source_files")
    .select("original_file_name,storage_path,file_role")
    .eq("fisheries_dataset_id", datasetId)
    .order("created_at");
  if (error)
    return NextResponse.json(
      { message: "File asli tidak dapat dibaca." },
      { status: 500 },
    );
  const downloads = [];
  for (const file of files ?? []) {
    const { data, error: signedError } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(file.storage_path, 60, {
        download: file.original_file_name,
      });
    if (signedError || !data) continue;
    downloads.push({
      name: file.original_file_name,
      role: file.file_role,
      url: data.signedUrl,
    });
  }
  return NextResponse.json({ downloads, expiresIn: 60 });
}
