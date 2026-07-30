import Papa from "papaparse";
import { LBI_TEMPLATE_VERSION, type ValidationIssue } from "./lbiTypes.ts";

export const LBI_FIELDS = [
  "sample_id", "sampling_date", "length", "sex", "weight", "maturity_stage", "notes",
] as const;
export type LBIField = (typeof LBI_FIELDS)[number];
export const REQUIRED_LBI_FIELDS: LBIField[] = ["sample_id", "sampling_date", "length"];

export function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_").replace(/[^\p{L}\p{N}_]/gu, "");
}

export function suggestColumnMapping(headers: string[]): Record<string, LBIField | ""> {
  const aliases: Record<string, LBIField> = {
    fish_id: "sample_id", id_ikan: "sample_id", date_measured: "sampling_date",
    tanggal: "sampling_date", panjang: "length", fork_length_cm: "length",
    sex_code: "sex", jenis_kelamin: "sex", body_weight: "weight", berat: "weight",
  };
  return Object.fromEntries(headers.map((header): [string, LBIField | ""] => {
    const normalized = normalizeHeader(header);
    return [header, LBI_FIELDS.includes(normalized as LBIField) ? normalized as LBIField : aliases[normalized] ?? ""];
  })) as Record<string, LBIField | "">;
}

export function parseLbiCsv(text: string) {
  const parsed = Papa.parse<Record<string, string>>(text.replace(/^\uFEFF/, ""), {
    header: true, skipEmptyLines: "greedy", transformHeader: (header) => header.trim(),
  });
  return {
    headers: parsed.meta.fields ?? [],
    rows: parsed.data,
    parseIssues: parsed.errors.map<ValidationIssue>((error) => ({
      rowNumber: typeof error.row === "number" ? error.row + 2 : undefined,
      severity: "error", code: "csv_parse", message: error.message,
      suggestedAction: "Perbaiki struktur CSV pada baris ini.",
    })),
  };
}

function csvCell(value: unknown) {
  let text = value == null ? "" : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function rowsToSafeCsv(rows: Record<string, unknown>[]) {
  const headers = Array.from(new Set(rows.flatMap(Object.keys)));
  return [headers.join(","), ...rows.map((row) => headers.map((key) => csvCell(row[key])).join(","))].join("\r\n");
}

export function createLbiTemplate(example = false) {
  const lines = [
    `# LBI_TEMPLATE_VERSION=${LBI_TEMPLATE_VERSION}`,
    LBI_FIELDS.join(","),
  ];
  if (example) {
    lines.push("EXAMPLE-REMOVE-001,2026-01-15,25.5,male,0.45,adult,REMOVE THIS EXAMPLE ROW");
    lines.push("EXAMPLE-REMOVE-002,2026-01-15,27.0,female,,,REMOVE THIS EXAMPLE ROW");
  }
  return lines.join("\r\n");
}
