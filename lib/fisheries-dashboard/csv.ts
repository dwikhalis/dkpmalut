import Papa from "papaparse";
import { DASHBOARD_CONFIG, getTemplateColumns, type DashboardTab } from "./config";
import type { ValidationIssue, ValidationResult } from "./types";

const TRIP_COLUMNS = new Set(["trip_id", "tanggal", "kode_lokasi", "alat_utama", "zonasi", "family", "nama_spesies", "total_tangkapan"]);
const LENGTH_COLUMNS = new Set(["id_trip", "tanggal", "fishing_ground", "alat_tangkap", "family", "spesies", "panjang"]);
const NUMERIC_COLUMNS = new Set(["total_tangkapan", "panjang"]);

function blank(value: unknown) { return String(value ?? "").trim() === ""; }
function validDate(value: string) { const d = new Date(value); return !isNaN(d.getTime()); }
function issue(issues: ValidationIssue[], severity: "error" | "warning", reason: string, row?: number, column?: string, value?: unknown, suggestion?: string) {
  issues.push({ severity, reason, row, column, value: value == null ? undefined : String(value), suggestion });
}

export function createDashboardTemplate(tab: DashboardTab) {
  return `${getTemplateColumns(tab).join(",")}\r\n`;
}

export function protectCsvCell(value: unknown) {
  const text = String(value ?? "");
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

export function parseAndValidateDashboardCsv(text: string, tab: DashboardTab): ValidationResult {
  const parsed = Papa.parse<Record<string, string>>(text.replace(/^\uFEFF/, ""), { header: true, skipEmptyLines: "greedy", transformHeader: (h) => h.trim() });
  const issues: ValidationIssue[] = [];
  parsed.errors.forEach((error) => issue(issues, "error", error.message, error.row == null ? undefined : error.row + 2));
  const rawHeaders = (parsed.meta.fields ?? []).map((header) => header.trim());
  const duplicates = rawHeaders.filter((header, index) => rawHeaders.indexOf(header) !== index);
  new Set(duplicates).forEach((header) => issue(issues, "error", "Header duplikat.", 1, header, header, "Gunakan satu header unik."));
  const config = DASHBOARD_CONFIG[tab];
  const allowed = config.templateType === "trip" ? TRIP_COLUMNS : LENGTH_COLUMNS;
  config.requiredColumns.filter((column) => !rawHeaders.includes(column)).forEach((column) => issue(issues, "error", "Kolom wajib tidak ditemukan.", 1, column, "", `Tambahkan kolom ${column}.`));
  rawHeaders.filter((header) => header && !allowed.has(header)).forEach((header) => issue(issues, "warning", "Kolom tidak dikenal dan tidak akan disimpan.", 1, header));

  let ignoredEmptyRows = 0;
  const rows = parsed.data.filter((row) => {
    const empty = Object.values(row).every(blank);
    if (empty) ignoredEmptyRows += 1;
    return !empty;
  }).map((raw, index) => {
    const rowNumber = index + 2;
    const output: Record<string, string | number | null> = {};
    for (const column of rawHeaders.filter((header) => allowed.has(header))) {
      const value = String(raw[column] ?? "").trim();
      output[column] = value || null;
    }
    for (const column of config.requiredColumns) {
      if (blank(raw[column])) issue(issues, "error", "Nilai wajib kosong.", rowNumber, column, raw[column], "Isi nilai yang valid.");
    }
    if (raw.tanggal && !validDate(raw.tanggal)) issue(issues, "error", "Tanggal tidak valid.", rowNumber, "tanggal", raw.tanggal, "Gunakan YYYY-MM-DD.");
    for (const column of NUMERIC_COLUMNS) {
      const value = raw[column];
      if (blank(value)) continue;
      const number = Number(value);
      if (!Number.isFinite(number)) issue(issues, "error", "Nilai bukan angka yang valid.", rowNumber, column, value, "Gunakan angka seperti 12.5.");
      else if (column === "panjang" && number <= 0) issue(issues, "error", "Panjang harus lebih besar dari nol.", rowNumber, column, value);
      else if (number < 0) issue(issues, "error", "Nilai tidak boleh negatif.", rowNumber, column, value);
      else output[column] = number;
    }
    const identifier = config.templateType === "trip" ? raw.trip_id : raw.id_trip;
    if (identifier && (!identifier.trim() || identifier.length > 200)) issue(issues, "error", "Identifier tidak valid.", rowNumber, config.templateType === "trip" ? "trip_id" : "id_trip", identifier);
    return output;
  });
  const invalidRowNumbers = new Set(issues.filter((entry) => entry.severity === "error" && entry.row && entry.row > 1).map((entry) => entry.row));
  const structuralError = issues.some((entry) => entry.severity === "error" && (!entry.row || entry.row === 1));
  const invalidRows = structuralError ? rows.length : invalidRowNumbers.size;
  return { tab, destinationTable: config.sourceTable, totalRows: rows.length, validRows: rows.length - invalidRows, invalidRows, ignoredEmptyRows, issues, rows, valid: rows.length > 0 && !issues.some((entry) => entry.severity === "error") };
}

export function validateTripCsvForTabs(text: string, tabs: DashboardTab[]) {
  return Object.fromEntries(tabs.filter((tab) => DASHBOARD_CONFIG[tab].templateType === "trip").map((tab) => [tab, parseAndValidateDashboardCsv(text, tab)])) as Partial<Record<DashboardTab, ValidationResult>>;
}
