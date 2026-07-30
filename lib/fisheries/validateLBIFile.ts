import {
  LBI_MAX_FILE_BYTES, LBI_MAX_ROWS, type BiologicalReference, type LBIMetadata,
  type LBIObservation, type LBIValidationResult, type NormalizedSex, type ValidationIssue,
} from "./lbiTypes.ts";
import { REQUIRED_LBI_FIELDS, type LBIField } from "./lbiCsv.ts";

const SEX_ALIASES: Record<string, NormalizedSex> = {
  m: "male", male: "male", jantan: "male", f: "female", female: "female",
  betina: "female", unknown: "unknown", "tidak diketahui": "unknown", "": "unknown",
};
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const issue = (data: ValidationIssue) => data;

export function validateReferenceForApproval(reference: Pick<BiologicalReference, "linf" | "lm" | "lopt">) {
  const errors: string[] = [];
  if (!(reference.linf > 0)) errors.push("L∞ harus lebih besar dari 0.");
  if (!(reference.lm > 0)) errors.push("Lm harus lebih besar dari 0.");
  if (!(reference.lopt > 0)) errors.push("Lopt harus lebih besar dari 0.");
  if (!(reference.lm < reference.linf)) errors.push("Lm harus lebih kecil dari L∞.");
  if (!(reference.lopt < reference.linf)) errors.push("Lopt harus lebih kecil dari L∞.");
  return { errors, warnings: reference.lm > reference.lopt ? ["Lm lebih besar dari Lopt; kombinasi ini perlu ditinjau."] : [] };
}

export function normalizeSex(value: string): NormalizedSex | null {
  return SEX_ALIASES[value.trim().toLocaleLowerCase("id-ID")] ?? null;
}

export function validateLbiRows(args: {
  rows: Record<string, string>[];
  mapping: Record<string, LBIField | "">;
  metadata: LBIMetadata;
  reference: Pick<BiologicalReference, "linf" | "lm" | "lopt" | "lengthType" | "lengthUnit">;
  file?: { name: string; size: number; type?: string };
  parseIssues?: ValidationIssue[];
}): LBIValidationResult {
  const { rows, mapping, metadata, reference } = args;
  const issues = [...(args.parseIssues ?? [])];
  if (args.file && !/\.csv$/i.test(args.file.name)) issues.push(issue({ severity: "error", code: "file_type", message: "File harus berformat CSV.", suggestedAction: "Unggah file dengan ekstensi .csv." }));
  if (args.file && args.file.size > LBI_MAX_FILE_BYTES) issues.push(issue({ severity: "error", code: "file_size", message: "Ukuran file melebihi 5 MB.", suggestedAction: "Kurangi ukuran atau pecah file." }));
  if (!rows.length) issues.push(issue({ severity: "error", code: "empty_file", message: "CSV tidak memiliki baris data.", suggestedAction: "Tambahkan data pengamatan." }));
  if (rows.length > LBI_MAX_ROWS) issues.push(issue({ severity: "error", code: "row_limit", message: `CSV melebihi batas ${LBI_MAX_ROWS} baris.`, suggestedAction: "Pecah file menjadi beberapa dataset." }));

  const mapped = Object.values(mapping).filter(Boolean);
  REQUIRED_LBI_FIELDS.forEach((field) => {
    if (!mapped.includes(field)) issues.push(issue({ column: field, severity: "error", code: "missing_column", message: `Kolom wajib ${field} belum dipetakan.`, suggestedAction: `Petakan satu kolom ke ${field}.` }));
  });
  const duplicates = mapped.filter((field, index) => mapped.indexOf(field) !== index);
  [...new Set(duplicates)].forEach((field) => issues.push(issue({ column: field, severity: "error", code: "duplicate_mapping", message: `Lebih dari satu kolom dipetakan ke ${field}.`, suggestedAction: "Gunakan satu kolom sumber saja." })));
  if (metadata.lengthType !== reference.lengthType) issues.push(issue({ severity: "error", code: "length_type_mismatch", message: "Tipe pengukuran panjang tidak sesuai referensi.", suggestedAction: "Pilih referensi dengan tipe panjang yang sama." }));
  if (metadata.lengthUnit !== reference.lengthUnit) issues.push(issue({ severity: "error", code: "length_unit_mismatch", message: "Satuan panjang tidak sesuai referensi.", suggestedAction: "Pilih referensi dengan satuan yang sama." }));

  const sourceFor = (field: LBIField) => Object.entries(mapping).find(([, target]) => target === field)?.[0];
  const seenIds = new Set<string>();
  const seenRows = new Set<string>();
  const validRows: LBIObservation[] = [];
  let duplicateSampleIds = 0;

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const value = (field: LBIField) => String(row[sourceFor(field) ?? ""] ?? "").trim();
    const before = issues.length;
    const sampleId = value("sample_id");
    const samplingDate = value("sampling_date");
    const rawLength = value("length");
    if (!sampleId) issues.push(issue({ rowNumber, column: "sample_id", originalValue: sampleId, severity: "error", code: "required", message: "sample_id wajib diisi.", suggestedAction: "Isi pengenal sampel yang unik." }));
    else if (/^EXAMPLE-REMOVE-/i.test(sampleId)) issues.push(issue({ rowNumber, column: "sample_id", originalValue: sampleId, severity: "error", code: "example_row", message: "Baris contoh tidak boleh diimpor.", suggestedAction: "Hapus baris contoh dari template." }));
    else if (seenIds.has(sampleId)) { duplicateSampleIds++; issues.push(issue({ rowNumber, column: "sample_id", originalValue: sampleId, severity: "error", code: "duplicate_sample_id", message: "sample_id duplikat dalam file.", suggestedAction: "Gunakan sample_id yang unik." })); }
    seenIds.add(sampleId);
    const parsedDate = new Date(`${samplingDate}T00:00:00Z`);
    if (!datePattern.test(samplingDate) || Number.isNaN(parsedDate.valueOf())) issues.push(issue({ rowNumber, column: "sampling_date", originalValue: samplingDate, severity: "error", code: "invalid_date", message: "Tanggal harus valid dalam format YYYY-MM-DD.", suggestedAction: "Perbaiki tanggal." }));
    else if (samplingDate < metadata.samplingStartDate || samplingDate > metadata.samplingEndDate) issues.push(issue({ rowNumber, column: "sampling_date", originalValue: samplingDate, severity: "error", code: "date_outside_period", message: "Tanggal berada di luar periode sampling.", suggestedAction: "Perbaiki tanggal atau periode sampling." }));
    const length = Number(rawLength);
    if (!rawLength || !Number.isFinite(length) || length <= 0) issues.push(issue({ rowNumber, column: "length", originalValue: rawLength, severity: "error", code: "invalid_length", message: "Panjang harus berupa angka lebih besar dari nol.", suggestedAction: "Masukkan angka panjang yang valid." }));
    else if (length > reference.linf * 1.25) issues.push(issue({ rowNumber, column: "length", originalValue: rawLength, severity: "warning", code: "above_linf", message: "Panjang jauh di atas L∞; L∞ bukan batas maksimum absolut.", suggestedAction: "Verifikasi nilai dan satuan tanpa menghapusnya otomatis." }));
    const rawWeight = value("weight");
    const weight = rawWeight ? Number(rawWeight) : undefined;
    if (rawWeight && (!Number.isFinite(weight) || (weight ?? 0) <= 0)) issues.push(issue({ rowNumber, column: "weight", originalValue: rawWeight, severity: "error", code: "invalid_weight", message: "Berat harus berupa angka lebih besar dari nol.", suggestedAction: "Perbaiki atau kosongkan nilai berat." }));
    const rawSex = value("sex");
    const sex = normalizeSex(rawSex);
    if (rawSex && !sex) issues.push(issue({ rowNumber, column: "sex", originalValue: rawSex, severity: "warning", code: "unknown_sex", message: "Nilai jenis kelamin tidak dikenali.", suggestedAction: "Gunakan M/F, Male/Female, Jantan/Betina, atau Unknown." }));
    const fingerprint = JSON.stringify([sampleId, samplingDate, rawLength, rawSex, rawWeight, value("maturity_stage"), value("notes")]);
    if (seenRows.has(fingerprint)) issues.push(issue({ rowNumber, severity: "warning", code: "duplicate_row", message: "Seluruh isi baris sama dengan baris sebelumnya.", suggestedAction: "Periksa apakah pengamatan ini duplikat." }));
    seenRows.add(fingerprint);
    const hasRowError = issues.slice(before).some((item) => item.severity === "error");
    if (!hasRowError) validRows.push({ sampleId, samplingDate, length, sex: sex ?? "unknown", weight, maturityStage: value("maturity_stage") || undefined, notes: value("notes") || undefined, sourceRowNumber: rowNumber });
  });

  const lengths = validRows.map((row) => row.length);
  if (validRows.length > 0 && validRows.length < 30) issues.push(issue({ severity: "warning", code: "small_sample", message: "Ukuran sampel kurang dari 30 pengamatan.", suggestedAction: "Tafsirkan hasil dengan kehati-hatian." }));
  if (lengths.length > 2) {
    const range = Math.max(...lengths) - Math.min(...lengths);
    if (range < reference.linf * 0.05) issues.push(issue({ severity: "warning", code: "narrow_range", message: "Rentang panjang tampak sangat sempit.", suggestedAction: "Periksa selektivitas alat, penyortiran pasar, dan satuan." }));
    const mostCommon = Math.max(...Object.values(lengths.reduce<Record<string, number>>((acc, item) => { acc[item] = (acc[item] ?? 0) + 1; return acc; }, {})));
    if (mostCommon / lengths.length > 0.8) issues.push(issue({ severity: "warning", code: "identical_values", message: "Lebih dari 80% nilai panjang identik.", suggestedAction: "Periksa presisi pengukuran dan data sumber." }));
  }
  const errorRows = new Set(issues.filter((item) => item.severity === "error" && item.rowNumber).map((item) => item.rowNumber));
  const warningRows = new Set(issues.filter((item) => item.severity === "warning" && item.rowNumber).map((item) => item.rowNumber));
  return {
    issues, validRows, excludedRows: errorRows.size, totalRows: rows.length, duplicateSampleIds,
    summary: {
      validRows: validRows.length, rowsWithErrors: errorRows.size, rowsWithWarnings: warningRows.size,
      minimumLength: lengths.length ? Math.min(...lengths) : null,
      maximumLength: lengths.length ? Math.max(...lengths) : null,
      meanLength: lengths.length ? lengths.reduce((sum, item) => sum + item, 0) / lengths.length : null,
    },
  };
}
