import type { FisheriesAnalysisType } from "./dashboardOrchestration.ts";
export type FieldRequirement = {
  key: string;
  label: string;
  level: "dataset" | "trip" | "catch" | "effort" | "length";
  requirement: "required" | "conditional" | "optional";
  requiredBy: FisheriesAnalysisType[];
  reason: string;
};
const field = (
  key: string,
  label: string,
  level: FieldRequirement["level"],
  requirement: FieldRequirement["requirement"],
  type: FisheriesAnalysisType,
  reason: string,
): FieldRequirement => ({
  key,
  label,
  level,
  requirement,
  requiredBy: [type],
  reason,
});
export const REQUIREMENTS: Record<FisheriesAnalysisType, FieldRequirement[]> = {
  lbi: [
    field(
      "species",
      "Spesies",
      "catch",
      "required",
      "lbi",
      "Identitas spesies",
    ),
    field(
      "length",
      "Panjang individu",
      "length",
      "required",
      "lbi",
      "Perhitungan LBI",
    ),
    field(
      "measurement_type",
      "Tipe TL/FL",
      "length",
      "required",
      "lbi",
      "Mencegah pencampuran",
    ),
    field(
      "biological_reference",
      "Referensi biologis",
      "dataset",
      "conditional",
      "lbi",
      "Lm, Lopt, L∞",
    ),
  ],
  cpue: [
    field("trip_id", "Trip ID", "trip", "required", "cpue", "Denominator trip"),
    field(
      "landing_date",
      "Tanggal",
      "trip",
      "required",
      "cpue",
      "Agregasi waktu",
    ),
    field("species", "Spesies", "catch", "required", "cpue", "Agregasi"),
    field(
      "fishing_gear",
      "Alat tangkap",
      "trip",
      "required",
      "cpue",
      "Kompatibilitas upaya",
    ),
    field(
      "catch_weight_kg",
      "Berat",
      "catch",
      "conditional",
      "cpue",
      "CPUE berat",
    ),
    field(
      "fishing_duration_hours",
      "Durasi",
      "effort",
      "conditional",
      "cpue",
      "Kg per jam",
    ),
    field(
      "number_of_settings",
      "Jumlah setting",
      "effort",
      "conditional",
      "cpue",
      "Kg per setting",
    ),
    field(
      "number_of_hooks",
      "Jumlah pancing",
      "effort",
      "conditional",
      "cpue",
      "Kg per 100 pancing",
    ),
    field(
      "net_length",
      "Panjang jaring",
      "effort",
      "conditional",
      "cpue",
      "Kg per 100 m",
    ),
  ],
  "total-landing": [
    field(
      "trip_id",
      "Trip ID",
      "trip",
      "required",
      "total-landing",
      "Unit pendaratan",
    ),
    field(
      "landing_date",
      "Tanggal",
      "trip",
      "required",
      "total-landing",
      "Agregasi waktu",
    ),
    field(
      "species",
      "Spesies",
      "catch",
      "required",
      "total-landing",
      "Agregasi",
    ),
    field(
      "catch_quantity",
      "Berat atau jumlah",
      "catch",
      "required",
      "total-landing",
      "Total pendaratan",
    ),
  ],
  "landing-frequency": [
    field(
      "trip_id",
      "Trip ID",
      "trip",
      "required",
      "landing-frequency",
      "Frekuensi trip berbeda",
    ),
    field(
      "landing_date",
      "Tanggal",
      "trip",
      "required",
      "landing-frequency",
      "Agregasi waktu",
    ),
    field(
      "species",
      "Spesies",
      "catch",
      "required",
      "landing-frequency",
      "Kemunculan spesies",
    ),
  ],
  "catch-composition": [
    field(
      "trip_id",
      "Trip ID",
      "trip",
      "required",
      "catch-composition",
      "Frekuensi trip",
    ),
    field(
      "species",
      "Spesies",
      "catch",
      "required",
      "catch-composition",
      "Komposisi",
    ),
    field(
      "fishing_gear",
      "Alat tangkap",
      "trip",
      "required",
      "catch-composition",
      "Pengelompokan utama",
    ),
    field(
      "catch_quantity",
      "Berat atau jumlah",
      "catch",
      "required",
      "catch-composition",
      "Basis komposisi",
    ),
  ],
};
export const getAnalysisRequirements = (type: FisheriesAnalysisType) =>
  REQUIREMENTS[type];
export function mergeAnalysisRequirements(types: FisheriesAnalysisType[]) {
  const merged = new Map<string, FieldRequirement>();
  types.flatMap(getAnalysisRequirements).forEach((item) => {
    const old = merged.get(item.key);
    merged.set(
      item.key,
      old
        ? {
            ...old,
            requiredBy: [...new Set([...old.requiredBy, ...item.requiredBy])],
            requirement:
              old.requirement === "required" || item.requirement === "required"
                ? "required"
                : old.requirement,
          }
        : item,
    );
  });
  return [...merged.values()];
}
