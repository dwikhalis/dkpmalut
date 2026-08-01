export const DASHBOARD_TAB_ORDER = [
  "cpue",
  "totallanding",
  "composition",
  "lengthfrequency",
] as const;

export type DashboardTab = (typeof DASHBOARD_TAB_ORDER)[number];
export type DashboardTemplateType = "trip" | "length";

export const FISHERIES_COLUMN_DESCRIPTIONS: Record<string, string> = {
  trip_id: "Kode lokasi dan tanggal pengambilan data (kode lokasi_tanggal_bulan_tahun_trip ke).",
  id_trip: "Kode lokasi dan tanggal pengambilan data (kode lokasi_tanggal_bulan_tahun_trip ke).",
  tanggal: "Tanggal pengambilan data.",
  kode_lokasi: "Kode lokasi untuk desa pengambilan data.",
  alat_utama: "Alat tangkap utama yang dioperasikan nelayan.",
  zonasi: "Lokasi penangkapan termasuk kawasan konservasi atau nonkonservasi.",
  family: "Nama family hasil tangkapan atau ikan.",
  nama_spesies: "Nama spesies ilmiah hasil tangkapan.",
  total_tangkapan: "Total hasil tangkapan per spesies dalam kilogram (kg).",
  fishing_ground: "Daerah penangkapan ikan.",
  alat_tangkap: "Alat tangkap yang digunakan untuk menangkap ikan.",
  spesies: "Nama spesies ilmiah ikan.",
  panjang: "Panjang total (TL) ikan dalam centimeter (cm).",
};

export type DashboardConfig = {
  label: string;
  description: string;
  sourceTable: "dataset_fish_trip" | "dataset_fish_length";
  templateType: DashboardTemplateType;
  visualizationType: DashboardTab;
  requiredColumns: readonly string[];
  optionalColumns: readonly string[];
  defaultChart: "bar" | "doughnut" | "histogram";
};

export const DASHBOARD_CONFIG = {
  cpue: {
    label: "CPUE",
    description: "Tangkapan bulanan per trip penangkapan.",
    sourceTable: "dataset_fish_trip",
    templateType: "trip",
    visualizationType: "cpue",
    requiredColumns: ["trip_id", "tanggal", "kode_lokasi", "alat_utama", "zonasi", "family", "nama_spesies", "total_tangkapan"],
    optionalColumns: [],
    defaultChart: "bar",
  },
  totallanding: {
    label: "Total Landing",
    description: "Total pendaratan bulanan dalam kilogram.",
    sourceTable: "dataset_fish_trip",
    templateType: "trip",
    visualizationType: "totallanding",
    requiredColumns: ["trip_id", "tanggal", "kode_lokasi", "alat_utama", "zonasi", "family", "nama_spesies", "total_tangkapan"],
    optionalColumns: [],
    defaultChart: "bar",
  },
  composition: {
    label: "Komposisi",
    description: "Persentase komposisi tangkapan berdasarkan spesies.",
    sourceTable: "dataset_fish_trip",
    templateType: "trip",
    visualizationType: "composition",
    requiredColumns: ["trip_id", "tanggal", "kode_lokasi", "alat_utama", "zonasi", "family", "nama_spesies", "total_tangkapan"],
    optionalColumns: [],
    defaultChart: "doughnut",
  },
  lengthfrequency: {
    label: "Frekuensi Panjang",
    description: "Distribusi TL atau FL tanpa menggabungkan tipe pengukuran.",
    sourceTable: "dataset_fish_length",
    templateType: "length",
    visualizationType: "lengthfrequency",
    requiredColumns: ["id_trip", "tanggal", "fishing_ground", "alat_tangkap", "family", "spesies", "panjang"],
    optionalColumns: [],
    defaultChart: "histogram",
  },
} satisfies Record<DashboardTab, DashboardConfig>;

export function isDashboardTab(value: unknown): value is DashboardTab {
  return typeof value === "string" && DASHBOARD_TAB_ORDER.includes(value as DashboardTab);
}

export function sortDashboardTabs(tabs: Iterable<DashboardTab>) {
  const selected = new Set(tabs);
  return DASHBOARD_TAB_ORDER.filter((tab) => selected.has(tab));
}

export function getTemplateColumns(tab: DashboardTab) {
  return Array.from(new Set([...DASHBOARD_CONFIG[tab].requiredColumns, ...DASHBOARD_CONFIG[tab].optionalColumns]));
}
