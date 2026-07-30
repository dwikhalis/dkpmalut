export type CaptureFileRole = "trips" | "catches" | "effort" | "lengths";

export const CAPTURE_FIELDS: Record<CaptureFileRole, string[]> = {
  trips: [
    "trip_id",
    "departure_at",
    "return_at",
    "village",
    "origin_port",
    "landing_location",
    "primary_gear",
    "secondary_gear",
    "fishing_location",
    "wpp",
    "zoning",
    "vessel_code",
    "vessel_name",
    "fishing_duration_hours",
    "number_of_settings",
    "number_of_hooks",
    "net_length",
    "source_row_number",
  ],
  catches: [
    "source_key",
    "trip_id",
    "original_species_name",
    "scientific_name",
    "catch_weight_kg",
    "individual_count",
    "retained_weight_kg",
    "discarded_weight_kg",
    "source_row_number",
  ],
  effort: [
    "trip_id",
    "gear_material",
    "net_length",
    "headline_length",
    "mesh_size",
    "hook_size",
    "number_of_hooks",
    "fishing_duration_hours",
    "number_of_settings",
  ],
  lengths: [
    "catch_source_key",
    "trip_id",
    "original_species_name",
    "scientific_name",
    "measurement_type",
    "length_cm",
    "fish_sequence",
    "sampling_date",
    "sex",
    "source_row_number",
  ],
};

const ALIASES: Record<string, string> = {
  id_trip: "trip_id",
  kode_trip: "trip_id",
  trip_code: "trip_id",
  tgl_berangkat: "departure_at",
  tanggal_berangkat: "departure_at",
  tgl_pulang: "return_at",
  tanggal_pulang: "return_at",
  tanggal_pendaratan: "return_at",
  desa: "village",
  pelabuhan_asal: "origin_port",
  lokasi_pendaratan: "landing_location",
  alat_tangkap_utama: "primary_gear",
  alat_tangkap: "primary_gear",
  lokasi_penangkapan: "fishing_location",
  nama_kapal: "vessel_name",
  kode_kapal: "vessel_code",
  waktu_memancing: "fishing_duration_hours",
  jumlah_setting: "number_of_settings",
  jumlah_mata_pancing: "number_of_hooks",
  panjang_jaring: "net_length",
  nama_spesies: "original_species_name",
  spesies: "original_species_name",
  nama_ilmiah: "scientific_name",
  berat_hasil: "catch_weight_kg",
  berat_kg: "catch_weight_kg",
  jumlah_individu: "individual_count",
  panjang_total: "length_cm",
  tl_cm: "length_cm",
  panjang_cagak: "length_cm",
  fl_cm: "length_cm",
  tipe_panjang: "measurement_type",
  tanggal_sampling: "sampling_date",
};

export function normalizeCaptureHeader(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("id-ID")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export function suggestCaptureMapping(
  role: CaptureFileRole,
  headers: string[],
) {
  const supported = new Set(CAPTURE_FIELDS[role]);
  return Object.fromEntries(
    headers.map((header) => {
      const normalized = normalizeCaptureHeader(header);
      const direct = supported.has(normalized) ? normalized : "";
      const alias = ALIASES[normalized] ?? "";
      return [header, supported.has(alias) ? alias : direct];
    }),
  ) as Record<string, string>;
}

export function duplicateMappedTargets(mapping: Record<string, string>) {
  const targets = Object.values(mapping).filter(Boolean);
  return [
    ...new Set(
      targets.filter((value, index) => targets.indexOf(value) !== index),
    ),
  ];
}
