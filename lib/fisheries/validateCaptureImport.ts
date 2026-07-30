import type { CaptureFileRole } from "./captureMapping.ts";

export type CaptureValidationIssue = {
  role: CaptureFileRole;
  row: number;
  column?: string;
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
};
export type SpeciesMatch = { id: string; scientificName: string };
export type CaptureValidationInput = Partial<
  Record<CaptureFileRole, Record<string, string>[]>
>;

const numeric = (value: string | undefined) =>
  value == null || value.trim() === "" ? null : Number(value);
const issue = (
  role: CaptureFileRole,
  row: number,
  severity: CaptureValidationIssue["severity"],
  code: string,
  message: string,
  column?: string,
): CaptureValidationIssue => ({ role, row, severity, code, message, column });

export function validateCaptureImport(
  input: CaptureValidationInput,
  speciesLookup: Record<string, SpeciesMatch>,
  options: { requireLengths?: boolean; requireEffort?: boolean } = {},
) {
  const issues: CaptureValidationIssue[] = [];
  if (!input.trips?.length)
    issues.push(
      issue(
        "trips",
        1,
        "error",
        "trips_required",
        "File trips wajib tersedia.",
      ),
    );
  if (!input.catches?.length)
    issues.push(
      issue(
        "catches",
        1,
        "error",
        "catches_required",
        "File catches wajib tersedia.",
      ),
    );
  if (options.requireEffort && !input.effort?.length)
    issues.push(
      issue(
        "effort",
        1,
        "error",
        "effort_required",
        "File effort wajib untuk metode CPUE yang dipilih.",
      ),
    );
  if (options.requireLengths && !input.lengths?.length)
    issues.push(
      issue(
        "lengths",
        1,
        "error",
        "lengths_required",
        "File lengths wajib untuk analisis LBI.",
      ),
    );
  const tripIds = new Set<string>();
  const catchKeys = new Set<string>();
  const catchSpecies = new Set<string>();
  const unresolved = new Set<string>();
  const normalized = {
    trips: [] as Record<string, unknown>[],
    catches: [] as Record<string, unknown>[],
    effort: [] as Record<string, unknown>[],
    lengths: [] as Record<string, unknown>[],
  };

  (input.trips ?? []).forEach((row, index) => {
    const sourceRow = index + 2;
    const id = row.trip_id?.trim();
    if (!id)
      issues.push(
        issue(
          "trips",
          sourceRow,
          "error",
          "trip_id_required",
          "Trip ID wajib diisi.",
          "trip_id",
        ),
      );
    else if (tripIds.has(id))
      issues.push(
        issue(
          "trips",
          sourceRow,
          "error",
          "duplicate_trip",
          "Trip ID duplikat.",
          "trip_id",
        ),
      );
    if (id) tripIds.add(id);
    const departure = Date.parse(row.departure_at ?? "");
    const returned = Date.parse(row.return_at ?? "");
    if (!Number.isFinite(departure) || !Number.isFinite(returned))
      issues.push(
        issue(
          "trips",
          sourceRow,
          "error",
          "invalid_trip_date",
          "Tanggal berangkat dan pulang harus valid.",
        ),
      );
    else if (returned <= departure)
      issues.push(
        issue(
          "trips",
          sourceRow,
          "error",
          "trip_time_order",
          "Waktu pulang harus setelah waktu berangkat.",
        ),
      );
    else if ((returned - departure) / 86400000 > 90)
      issues.push(
        issue(
          "trips",
          sourceRow,
          "warning",
          "long_trip",
          "Durasi trip lebih dari 90 hari; periksa kembali.",
        ),
      );
    if (!row.primary_gear?.trim())
      issues.push(
        issue(
          "trips",
          sourceRow,
          "error",
          "gear_required",
          "Alat tangkap utama wajib diisi.",
          "primary_gear",
        ),
      );
    if (!row.landing_location?.trim())
      issues.push(
        issue(
          "trips",
          sourceRow,
          "error",
          "landing_required",
          "Lokasi pendaratan wajib diisi.",
          "landing_location",
        ),
      );
    normalized.trips.push({
      ...row,
      trip_id: id,
      source_row_number: sourceRow,
    });
  });

  (input.effort ?? []).forEach((row, index) => {
    const sourceRow = index + 2;
    if (!tripIds.has(row.trip_id?.trim()))
      issues.push(
        issue(
          "effort",
          sourceRow,
          "error",
          "unknown_trip",
          "Trip ID tidak ditemukan.",
          "trip_id",
        ),
      );
    [
      "fishing_duration_hours",
      "number_of_settings",
      "number_of_hooks",
      "net_length",
    ].forEach((key) => {
      const value = numeric(row[key]);
      if (value !== null && (!Number.isFinite(value) || value <= 0))
        issues.push(
          issue(
            "effort",
            sourceRow,
            "error",
            "invalid_effort",
            `${key} harus lebih besar dari nol.`,
            key,
          ),
        );
    });
    normalized.effort.push({ ...row, source_row_number: sourceRow });
  });

  (input.catches ?? []).forEach((row, index) => {
    const sourceRow = index + 2;
    const tripId = row.trip_id?.trim();
    const sourceKey = row.source_key?.trim() || `catch-${sourceRow}`;
    if (!tripIds.has(tripId))
      issues.push(
        issue(
          "catches",
          sourceRow,
          "error",
          "unknown_trip",
          "Trip ID tangkapan tidak ditemukan.",
          "trip_id",
        ),
      );
    if (catchKeys.has(sourceKey))
      issues.push(
        issue(
          "catches",
          sourceRow,
          "error",
          "duplicate_catch_key",
          "source_key tangkapan duplikat.",
          "source_key",
        ),
      );
    catchKeys.add(sourceKey);
    const originalName = (
      row.scientific_name ||
      row.original_species_name ||
      ""
    ).trim();
    if (!originalName)
      issues.push(
        issue(
          "catches",
          sourceRow,
          "error",
          "species_required",
          "Spesies wajib diisi.",
          "original_species_name",
        ),
      );
    const match = speciesLookup[originalName.toLocaleLowerCase("id-ID")];
    if (originalName && !match) {
      unresolved.add(originalName);
      issues.push(
        issue(
          "catches",
          sourceRow,
          "error",
          "species_unresolved",
          "Spesies belum dipetakan ke daftar kurasi.",
          "original_species_name",
        ),
      );
    }
    const weight = numeric(row.catch_weight_kg);
    const count = numeric(row.individual_count);
    if (weight === null && count === null)
      issues.push(
        issue(
          "catches",
          sourceRow,
          "error",
          "quantity_required",
          "Berat atau jumlah individu wajib tersedia.",
        ),
      );
    if (weight !== null && (!Number.isFinite(weight) || weight < 0))
      issues.push(
        issue(
          "catches",
          sourceRow,
          "error",
          "invalid_weight",
          "Berat harus angka non-negatif.",
          "catch_weight_kg",
        ),
      );
    if (count !== null && (!Number.isInteger(count) || count < 0))
      issues.push(
        issue(
          "catches",
          sourceRow,
          "error",
          "invalid_count",
          "Jumlah individu harus bilangan bulat non-negatif.",
          "individual_count",
        ),
      );
    const pair = `${tripId}\u0000${match?.id ?? originalName.toLowerCase()}`;
    if (catchSpecies.has(pair))
      issues.push(
        issue(
          "catches",
          sourceRow,
          "warning",
          "duplicate_trip_species",
          "Spesies muncul lebih dari sekali dalam trip; catatan tetap dipertahankan.",
        ),
      );
    catchSpecies.add(pair);
    normalized.catches.push({
      ...row,
      source_key: sourceKey,
      species_id: match?.id,
      original_species_name: originalName,
      source_row_number: sourceRow,
    });
  });

  const lengthFingerprints = new Set<string>();
  (input.lengths ?? []).forEach((row, index) => {
    const sourceRow = index + 2;
    const name = (
      row.scientific_name ||
      row.original_species_name ||
      ""
    ).trim();
    const match = speciesLookup[name.toLocaleLowerCase("id-ID")];
    if (!match) {
      if (name) unresolved.add(name);
      issues.push(
        issue(
          "lengths",
          sourceRow,
          "error",
          "species_unresolved",
          "Spesies pengukuran belum dipetakan.",
          "original_species_name",
        ),
      );
    }
    if (!["total_length", "fork_length"].includes(row.measurement_type))
      issues.push(
        issue(
          "lengths",
          sourceRow,
          "error",
          "invalid_length_type",
          "Tipe panjang harus total_length atau fork_length.",
          "measurement_type",
        ),
      );
    const length = numeric(row.length_cm);
    if (length === null || !Number.isFinite(length) || length <= 0)
      issues.push(
        issue(
          "lengths",
          sourceRow,
          "error",
          "invalid_length",
          "Panjang harus angka lebih besar dari nol.",
          "length_cm",
        ),
      );
    else if (length > 500)
      issues.push(
        issue(
          "lengths",
          sourceRow,
          "warning",
          "extreme_length",
          "Panjang di atas 500 cm; verifikasi nilai dan satuan.",
          "length_cm",
        ),
      );
    const fingerprint = `${row.catch_source_key}|${match?.id ?? name}|${row.measurement_type}|${length}`;
    if (lengthFingerprints.has(fingerprint))
      issues.push(
        issue(
          "lengths",
          sourceRow,
          "warning",
          "suspected_duplicate_length",
          "Pengukuran panjang yang sama terdeteksi.",
        ),
      );
    lengthFingerprints.add(fingerprint);
    normalized.lengths.push({
      ...row,
      species_id: match?.id,
      length_cm: length,
      source_row_number: sourceRow,
    });
  });

  const errorRows = new Set(
    issues
      .filter((x) => x.severity === "error")
      .map((x) => `${x.role}:${x.row}`),
  );
  return {
    issues,
    unresolvedSpecies: [...unresolved].sort(),
    normalized,
    summary: {
      trips: normalized.trips.length,
      catches: normalized.catches.length,
      effort: normalized.effort.length,
      lengths: normalized.lengths.length,
      errors: issues.filter((x) => x.severity === "error").length,
      warnings: issues.filter((x) => x.severity === "warning").length,
      excludedRows: errorRows.size,
      validTl: normalized.lengths.filter(
        (x) => x.measurement_type === "total_length",
      ).length,
      validFl: normalized.lengths.filter(
        (x) => x.measurement_type === "fork_length",
      ).length,
    },
  };
}
