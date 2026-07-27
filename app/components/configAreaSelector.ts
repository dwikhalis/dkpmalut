export type DataRegencyOption = {
  id: string;
  label: string;
  value: string;
};

/** Kabupaten/kota identifiers stored in `datasets.data_regency`. */
export const DATA_REGENCY_OPTIONS = [
  { id: "pulau-morotai", label: "Pulau Morotai", value: "Pulau Morotai" },
  {
    id: "kepulauan-sula",
    label: "Kepulauan Sula",
    value: "Kepulauan Sula",
  },
  {
    id: "halmahera-tengah",
    label: "Halmahera Tengah",
    value: "Halmahera Tengah",
  },
  { id: "kota-ternate", label: "Kota Ternate", value: "Kota Ternate" },
  {
    id: "halmahera-timur",
    label: "Halmahera Timur",
    value: "Halmahera Timur",
  },
  { id: "kota-tidore", label: "Kota Tidore", value: "Kota Tidore" },
  {
    id: "halmahera-selatan",
    label: "Halmahera Selatan",
    value: "Halmahera Selatan",
  },
  { id: "pulau-taliabu", label: "Pulau Taliabu", value: "Pulau Taliabu" },
  {
    id: "halmahera-utara",
    label: "Halmahera Utara",
    value: "Halmahera Utara",
  },
  {
    id: "halmahera-barat",
    label: "Halmahera Barat",
    value: "Halmahera Barat",
  },
] as const satisfies readonly DataRegencyOption[];

export type DataRegencyId = (typeof DATA_REGENCY_OPTIONS)[number]["id"];
export type DataRegencyValue = (typeof DATA_REGENCY_OPTIONS)[number]["value"];

export type DataAreaOption = {
  id: string;
  label: string;
  value: string;
};

/** Sub-WPP identifiers stored in `datasets.data_subwpp`. */
export const DATA_SUBWPP_OPTIONS = [
  {
    id: "morotai-halut",
    label: "Morotai - Halut",
    value: "Morotai - Halut",
  },
  {
    id: "ternate-tidore-halsel",
    label: "Ternate - Tidore - Halsel",
    value: "Ternate - Tidore - Halsel",
  },
] as const satisfies readonly DataAreaOption[];

export type DataSubWppValue = (typeof DATA_SUBWPP_OPTIONS)[number]["value"];

/** KKPD identifiers stored in `datasets.data_kkpd`. */
export const DATA_KKPD_OPTIONS = [
  {
    id: "widi",
    label: "TPK Kepulauan Widi",
    value: "TPK Kepulauan Widi",
  },
  {
    id: "makian_moti",
    label: "TWP Pulau Makian dan Pulau Moti",
    value: "TWP Pulau Makian dan Pulau Moti",
  },
  {
    id: "guraici",
    label: "TPK Kepulauan Guraici",
    value: "TPK Kepulauan Guraici",
  },
  {
    id: "mare",
    label: "TWP Pulau Mare",
    value: "TWP Pulau Mare",
  },
  {
    id: "rao_dehegila",
    label: "TWP Pulau Rao - Tanjung Dehegila",
    value: "TWP Pulau Rao - Tanjung Dehegila",
  },
  {
    id: "sula",
    label: "TP Kepulauan Sula",
    value: "TP Kepulauan Sula",
  },
] as const satisfies readonly DataAreaOption[];

export type DataKkpdId = (typeof DATA_KKPD_OPTIONS)[number]["id"];
export type DataKkpdValue = (typeof DATA_KKPD_OPTIONS)[number]["value"];
