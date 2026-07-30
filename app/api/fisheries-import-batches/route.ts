import { NextResponse } from "next/server";
import Papa from "papaparse";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import {
  CAPTURE_FIELDS,
  duplicateMappedTargets,
  suggestCaptureMapping,
  type CaptureFileRole,
} from "@/lib/fisheries/captureMapping";
import { validateCaptureImport } from "@/lib/fisheries/validateCaptureImport";

export const runtime = "nodejs";

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
  return { user: data.user, admin: profile?.role === "admin", token };
}

export async function POST(request: Request) {
  const auth = await actor(request);
  if (!auth)
    return NextResponse.json({ message: "Tidak diizinkan." }, { status: 401 });
  const body = (await request.json()) as {
    batchId?: string;
    mappings?: Partial<Record<CaptureFileRole, Record<string, string>>>;
    action?: "save" | "validate" | "confirm_species" | "import";
    speciesMappings?: Record<string, string>;
    warningAcknowledged?: boolean;
  };
  if (!body.batchId || (!body.mappings && body.action !== "confirm_species"))
    return NextResponse.json(
      { message: "Konfigurasi pemetaan tidak lengkap." },
      { status: 400 },
    );
  const { data: batch } = await supabaseAdmin
    .from("fisheries_import_batches")
    .select("owner_id,status,dashboard_id")
    .eq("id", body.batchId)
    .maybeSingle();
  if (!batch || (batch.owner_id !== auth.user.id && !auth.admin))
    return NextResponse.json(
      { message: "Batch tidak dapat diubah." },
      { status: 403 },
    );
  const { data: dashboard } = batch.dashboard_id
    ? await supabaseAdmin
        .from("datasets")
        .select("dashboard_config")
        .eq("id", batch.dashboard_id)
        .maybeSingle()
    : { data: null };
  if (body.action === "confirm_species") {
    const entries = Object.entries(body.speciesMappings ?? {}).filter(
      ([name, id]) => name.trim() && id,
    );
    const ids = [...new Set(entries.map(([, id]) => id))];
    const { data: allowed } = ids.length
      ? await supabaseAdmin
          .from("species")
          .select("id")
          .in("id", ids)
          .eq("is_active", true)
      : { data: [] };
    const allowedIds = new Set((allowed ?? []).map((item) => item.id));
    if (ids.some((id) => !allowedIds.has(id)))
      return NextResponse.json(
        { message: "Pilihan spesies tidak valid." },
        { status: 400 },
      );
    await supabaseAdmin
      .from("fisheries_import_species_mappings")
      .delete()
      .eq("import_batch_id", body.batchId);
    if (entries.length) {
      const { error: speciesMappingError } = await supabaseAdmin
        .from("fisheries_import_species_mappings")
        .insert(
          entries.map(([name, speciesId]) => ({
            import_batch_id: body.batchId,
            original_name: name.trim(),
            normalized_name: name.trim().toLocaleLowerCase("id-ID"),
            species_id: speciesId,
            confirmed_by: auth.user.id,
          })),
        );
      if (speciesMappingError)
        return NextResponse.json(
          { message: "Pemetaan spesies gagal disimpan." },
          { status: 500 },
        );
    }
    return NextResponse.json({ saved: true });
  }
  const mappings = body.mappings ?? {};
  for (const [role, mapping] of Object.entries(mappings)) {
    if (!mapping || !(role in CAPTURE_FIELDS))
      return NextResponse.json(
        { message: "Jenis file pemetaan tidak valid." },
        { status: 400 },
      );
    const supported = new Set(CAPTURE_FIELDS[role as CaptureFileRole]);
    if (
      Object.values(mapping).some(
        (target) => target && !supported.has(target),
      ) ||
      duplicateMappedTargets(mapping).length
    )
      return NextResponse.json(
        { message: "Pemetaan mengandung target tidak valid atau duplikat." },
        { status: 400 },
      );
  }
  const { error } = await supabaseAdmin
    .from("fisheries_import_batches")
    .update({
      mapping_config: mappings,
      status: "validating",
      validation_version: "1.0",
    })
    .eq("id", body.batchId);
  if (error)
    return NextResponse.json(
      { message: "Pemetaan gagal disimpan." },
      { status: 500 },
    );
  if (!["validate", "import"].includes(body.action ?? ""))
    return NextResponse.json({ saved: true });

  try {
    const { data: files } = await supabaseAdmin
      .from("fisheries_source_files")
      .select("file_role,storage_path")
      .eq("import_batch_id", body.batchId);
    const mapped: Partial<Record<CaptureFileRole, Record<string, string>[]>> =
      {};
    for (const file of files ?? []) {
      if (!(file.file_role in CAPTURE_FIELDS)) continue;
      const role = file.file_role as CaptureFileRole;
      const mapping = mappings[role] ?? {};
      const { data: blob, error: downloadError } = await supabaseAdmin.storage
        .from("fisheries-source-files")
        .download(file.storage_path);
      if (downloadError || !blob)
        throw downloadError ?? new Error("Download failed");
      const content = (await blob.text()).replace(
        /^# FISHERIES_TEMPLATE_VERSION=[^\r\n]*\r?\n/,
        "",
      );
      const parsed = Papa.parse<Record<string, string>>(content, {
        header: true,
        skipEmptyLines: "greedy",
      });
      if (parsed.data.length > 500000) throw new Error("Row limit exceeded");
      mapped[role] = parsed.data.map((source) =>
        Object.fromEntries(
          Object.entries(mapping)
            .filter(([, target]) => target)
            .map(([header, target]) => [target, String(source[header] ?? "")]),
        ),
      );
    }
    const { data: speciesRows } = await supabaseAdmin
      .from("species")
      .select("id,scientific_name,common_name,local_name")
      .eq("is_active", true);
    const speciesLookup: Record<
      string,
      { id: string; scientificName: string }
    > = {};
    const ambiguousSpeciesNames = new Set<string>();
    for (const species of speciesRows ?? []) {
      [species.scientific_name, species.common_name, species.local_name]
        .filter(Boolean)
        .forEach((name) => {
          const key = String(name).trim().toLocaleLowerCase("id-ID");
          if (speciesLookup[key] && speciesLookup[key].id !== species.id) {
            ambiguousSpeciesNames.add(key);
            delete speciesLookup[key];
            return;
          }
          if (ambiguousSpeciesNames.has(key)) return;
          speciesLookup[key] = {
            id: species.id,
            scientificName: species.scientific_name,
          };
        });
    }
    const { data: confirmedSpecies } = await supabaseAdmin
      .from("fisheries_import_species_mappings")
      .select("normalized_name,species_id")
      .eq("import_batch_id", body.batchId);
    const confirmedIds = [
      ...new Set((confirmedSpecies ?? []).map((item) => item.species_id)),
    ];
    const { data: confirmedSpeciesRows } = confirmedIds.length
      ? await supabaseAdmin
          .from("species")
          .select("id,scientific_name")
          .in("id", confirmedIds)
      : { data: [] };
    const confirmedById = new Map(
      (confirmedSpeciesRows ?? []).map((item) => [item.id, item]),
    );
    for (const confirmation of confirmedSpecies ?? []) {
      const selected = confirmedById.get(confirmation.species_id);
      if (selected)
        speciesLookup[confirmation.normalized_name] = {
          id: selected.id,
          scientificName: selected.scientific_name,
        };
    }
    const selectedAnalyses = Array.isArray(
      dashboard?.dashboard_config?.selectedAnalyses,
    )
      ? dashboard.dashboard_config.selectedAnalyses
      : [];
    const cpueMethods = Array.isArray(
      dashboard?.dashboard_config?.requirementSettings?.cpueMethods,
    )
      ? dashboard.dashboard_config.requirementSettings.cpueMethods
      : [];
    const validation = validateCaptureImport(mapped, speciesLookup, {
      requireLengths: selectedAnalyses.includes("lbi"),
      requireEffort:
        selectedAnalyses.includes("cpue") &&
        cpueMethods.some(
          (method: string) =>
            !["kg_per_trip", "individuals_per_trip"].includes(method),
        ),
    });
    const fieldInventory: Record<
      string,
      { present: boolean; validCount: number; sourceRole: string }
    > = Object.fromEntries(
      Object.entries(mapped).flatMap(([role, rows]) => {
        const keys = new Set((rows ?? []).flatMap((row) => Object.keys(row)));
        return [...keys].map((key) => [
          key,
          {
            present: true,
            validCount: (rows ?? []).filter((row) =>
              String(row[key] ?? "").trim(),
            ).length,
            sourceRole: role,
          },
        ]);
      }),
    );
    const derivedInventory = (
      key: string,
      candidates: string[],
      sourceRole: string,
    ) => {
      const validCount = Math.max(
        0,
        ...candidates.map(
          (candidate) => fieldInventory[candidate]?.validCount ?? 0,
        ),
      );
      if (validCount)
        fieldInventory[key] = { present: true, validCount, sourceRole };
    };
    derivedInventory(
      "species",
      ["scientific_name", "original_species_name"],
      "catches",
    );
    derivedInventory("landing_date", ["return_at"], "trips");
    derivedInventory("fishing_gear", ["primary_gear"], "trips");
    derivedInventory(
      "catch_quantity",
      ["catch_weight_kg", "individual_count"],
      "catches",
    );
    derivedInventory("length", ["length_cm"], "lengths");
    if (
      body.action === "import" &&
      validation.summary.warnings > 0 &&
      !body.warningAcknowledged
    )
      return NextResponse.json(
        { message: "Peringatan validasi harus dikonfirmasi sebelum impor." },
        { status: 400 },
      );
    if (body.action === "import" && validation.summary.errors > 0)
      return NextResponse.json(
        { message: "Perbaiki seluruh error validasi sebelum impor." },
        { status: 400 },
      );

    await supabaseAdmin
      .from("fisheries_import_batches")
      .update({
        status:
          body.action === "import"
            ? "importing"
            : validation.summary.errors
              ? "failed"
              : "validating",
        validation_summary: validation.summary,
        validation_report: validation.issues.slice(0, 5000),
        field_inventory: fieldInventory,
        validation_version: "1.0",
      })
      .eq("id", body.batchId);

    if (body.action === "import") {
      if (!batch.dashboard_id)
        return NextResponse.json(
          { message: "Dashboard tujuan tidak tersedia." },
          { status: 400 },
        );
      const effortByTrip = new Map(
        validation.normalized.effort.map((row) => [
          String(row.trip_id ?? "").trim(),
          row,
        ]),
      );
      const trips = validation.normalized.trips.map((trip) => ({
        ...trip,
        ...(effortByTrip.get(String(trip.trip_id ?? "").trim()) ?? {}),
      }));
      const userClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          auth: { persistSession: false, autoRefreshToken: false },
          global: { headers: { Authorization: `Bearer ${auth.token}` } },
        },
      );
      const importedAt = new Date();
      const { data: datasetId, error: importError } = await userClient.rpc(
        "import_normalized_fisheries_dataset",
        {
          p_dashboard_id: batch.dashboard_id,
          p_metadata: {
            dataset_name: `Dataset perikanan ${importedAt.toISOString()}`,
            slug: `fisheries-${batch.dashboard_id}-${importedAt.getTime()}`,
            source_file_name: (files ?? [])
              .map((file) => file.storage_path.split("/").at(-1))
              .join(", "),
            template_version: "1.0",
            validation_version: "1.0",
            taxonomy_version: "curated-species-v1",
            validation_summary: validation.summary,
            field_inventory: fieldInventory,
          },
          p_trips: trips,
          p_catches: validation.normalized.catches,
          p_lengths: validation.normalized.lengths,
        },
      );
      if (importError) {
        console.error("Atomic fisheries import failed:", importError);
        await supabaseAdmin
          .from("fisheries_import_batches")
          .update({
            status: "failed",
            technical_error: importError.code ?? "atomic_import_failed",
          })
          .eq("id", body.batchId);
        return NextResponse.json(
          { message: "Impor atomik gagal; tidak ada data parsial disimpan." },
          { status: 500 },
        );
      }
      await Promise.all([
        supabaseAdmin
          .from("fisheries_import_batches")
          .update({
            status: "completed",
            fisheries_dataset_id: datasetId,
            completed_at: importedAt.toISOString(),
            technical_error: null,
          })
          .eq("id", body.batchId),
        supabaseAdmin
          .from("fisheries_source_files")
          .update({ fisheries_dataset_id: datasetId })
          .eq("import_batch_id", body.batchId),
      ]);
      return NextResponse.json({
        saved: true,
        imported: true,
        datasetId,
        dashboardId: batch.dashboard_id,
      });
    }
    return NextResponse.json({
      saved: true,
      validation: {
        summary: validation.summary,
        issues: validation.issues.slice(0, 5000),
        issueCount: validation.issues.length,
        reportTruncated: validation.issues.length > 5000,
        unresolvedSpecies: validation.unresolvedSpecies,
        preview: {
          trips: validation.normalized.trips.slice(0, 10),
          catches: validation.normalized.catches.slice(0, 10),
          effort: validation.normalized.effort.slice(0, 10),
          lengths: validation.normalized.lengths.slice(0, 10),
        },
      },
    });
  } catch (cause) {
    console.error("Fisheries batch validation failed:", cause);
    return NextResponse.json(
      { message: "Validasi batch gagal diproses." },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  const auth = await actor(request);
  if (!auth)
    return NextResponse.json({ message: "Tidak diizinkan." }, { status: 401 });
  const batchId = new URL(request.url).searchParams.get("batch_id");
  if (!batchId)
    return NextResponse.json(
      { message: "Batch tidak tersedia." },
      { status: 400 },
    );
  const { data: batch } = await supabaseAdmin
    .from("fisheries_import_batches")
    .select("id,owner_id,dashboard_id,status,mapping_config")
    .eq("id", batchId)
    .maybeSingle();
  if (!batch || (batch.owner_id !== auth.user.id && !auth.admin))
    return NextResponse.json(
      { message: "Batch tidak dapat diakses." },
      { status: 403 },
    );
  const { data: files, error: filesError } = await supabaseAdmin
    .from("fisheries_source_files")
    .select("id,file_role,original_file_name,storage_path,size_bytes")
    .eq("import_batch_id", batchId)
    .order("created_at");
  if (filesError)
    return NextResponse.json(
      { message: "Daftar file tidak dapat dibaca." },
      { status: 500 },
    );
  try {
    const [{ data: speciesOptions }, { data: confirmedSpeciesMappings }] =
      await Promise.all([
        supabaseAdmin
          .from("species")
          .select("id,scientific_name,common_name,local_name")
          .eq("is_active", true)
          .order("scientific_name"),
        supabaseAdmin
          .from("fisheries_import_species_mappings")
          .select("original_name,species_id")
          .eq("import_batch_id", batchId),
      ]);
    const inspected = [];
    const inventory: Record<string, unknown> = {};
    for (const file of files ?? []) {
      if (!["trips", "catches", "effort", "lengths"].includes(file.file_role))
        continue;
      const { data: blob, error } = await supabaseAdmin.storage
        .from("fisheries-source-files")
        .download(file.storage_path);
      if (error || !blob) throw error ?? new Error("Download failed");
      const raw = await blob.text();
      const content = raw.replace(
        /^# FISHERIES_TEMPLATE_VERSION=[^\r\n]*\r?\n/,
        "",
      );
      const parsed = Papa.parse<Record<string, string>>(content, {
        header: true,
        skipEmptyLines: "greedy",
        preview: 100001,
        transformHeader: (header) => header.trim(),
      });
      const headers = parsed.meta.fields ?? [];
      const rowCount = parsed.data.length;
      const role = file.file_role as CaptureFileRole;
      const suggestedMapping = suggestCaptureMapping(role, headers);
      await supabaseAdmin
        .from("fisheries_source_files")
        .update({ column_inventory: headers, row_count: rowCount })
        .eq("id", file.id);
      inventory[role] = { headers, rowCount };
      inspected.push({
        id: file.id,
        role,
        filename: file.original_file_name,
        sizeBytes: file.size_bytes,
        headers,
        rowCount,
        preview: parsed.data.slice(0, 5),
        suggestedMapping,
        parsingIssues: parsed.errors.slice(0, 50).map((item) => ({
          row: typeof item.row === "number" ? item.row + 2 : null,
          message: item.message,
          code: item.code,
        })),
        truncated: rowCount >= 100001,
      });
    }
    await supabaseAdmin
      .from("fisheries_import_batches")
      .update({ field_inventory: inventory })
      .eq("id", batchId);
    return NextResponse.json({
      batchId,
      dashboardId: batch.dashboard_id,
      status: batch.status,
      savedMapping: batch.mapping_config ?? {},
      speciesOptions: speciesOptions ?? [],
      confirmedSpeciesMappings: Object.fromEntries(
        (confirmedSpeciesMappings ?? []).map((item) => [
          item.original_name,
          item.species_id,
        ]),
      ),
      files: inspected,
    });
  } catch (error) {
    console.error("Fisheries batch inspection failed:", error);
    return NextResponse.json(
      { message: "File sumber tidak dapat diperiksa." },
      { status: 500 },
    );
  }
}
