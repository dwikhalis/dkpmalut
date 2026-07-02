import type { FeatureCollection, Geometry } from "geojson";

export type KkdId =
  | "widi"
  | "makian_moti"
  | "guraici"
  | "mare"
  | "rao_dehegila"
  | "sula";

export type SelectedKkdId = "" | "all" | KkdId;

export type GeoLayerId = KkdId;

export type LegendValue =
  | "All"
  | "Inti"
  | "Pariwisata"
  | "Pariwisata Alam Perairan"
  | "Perikanan Tangkap"
  | "Perikanan Berkelanjutan"
  | "Penangkapan Ikan"
  | "Perikanan Tradisional"
  | "Perikanan Budidaya"
  | "Budidaya"
  | "Pelabuhan"
  | "Rehabilitasi"
  | "Jalur Lalu Lintas Kapal"
  | "Pelestarian Budaya"
  | "Perlindungan Mamalia Laut"
  | "Tambat Labuh";

export type ZoneProperties = {
  KKP?: string;
  Zona?: string;
  Sub_Zona?: string;
  Luas?: number;
  luas?: number;
  Area?: number;
  [key: string]: unknown;
};

export type ZoneFeatureCollection = FeatureCollection<Geometry, ZoneProperties>;

export type GeoDataMap = Partial<Record<GeoLayerId, ZoneFeatureCollection>>;

export type MapStyle = {
  color: string;
  fillColor: string;
  fillOpacity: number;
  weight: number;
};

export type LegendItem = {
  value: Exclude<LegendValue, "All">;
  label: string;
  legendClassName: string;
  mapStyle: MapStyle;
};

export type DynamicLegendGroup = {
  zona: string;
  items: Exclude<LegendValue, "All">[];
};

export type KkdOption = {
  id: Exclude<SelectedKkdId, "">;
  label: string;
  layers: GeoLayerId[];
  center: [number, number];
  zoom: number;
  downloads?: {
    map?: string;
    rpz?: string;
    decree?: string;
  };
  data_link?: string;
};

export const ZONA_ORDER = [
  "Inti",
  "Pemanfaatan",
  "Pemanfaatan Terbatas",
  "Perikanan Berkelanjutan",
  "Lainnya",
];

export const DEFAULT_MAP_VIEW = {
  center: [0.7213405231465007, 127.97671266232439] as [number, number],
  zoom: 7,
};

export const COLORS = {
  red: "#E83628",
  green: "#A8E248",
  lightBlue: "#5CCAF5",
  blue: "#336FF5",
  darkGray: "#818181",
  lightGray: "#CBCBCB",
  gray: "#686868",
  dotGray: "#BABABA",
  borderGray: "#777777",
  black: "#111111",
} as const;

export const GEOJSON_LAYERS = [
  {
    id: "widi",
    path: "/geojson/zonasi_widi.geojson",
  },
  {
    id: "makian_moti",
    path: "/geojson/zonasi_makian_moti.geojson",
  },
  {
    id: "guraici",
    path: "/geojson/zonasi_guraici.geojson",
  },
  {
    id: "mare",
    path: "/geojson/zonasi_mare.geojson",
  },
  {
    id: "rao_dehegila",
    path: "/geojson/zonasi_rao_dehegila.geojson",
  },
  {
    id: "sula",
    path: "/geojson/zonasi_sula.geojson",
  },
] satisfies {
  id: GeoLayerId;
  path: string;
}[];

export const KKD_OPTIONS: KkdOption[] = [
  // ! SHOW ALL KKPD OPTION IS DISABLED
  // {
  //   id: "all",
  //   label: "Semua KKPD",
  //   layers: ["widi", "makian_moti", "guraici", "mare", "rao_dehegila", "sula"],
  //   center: DEFAULT_MAP_VIEW.center,
  //   zoom: DEFAULT_MAP_VIEW.zoom,
  // },
  {
    id: "widi",
    label: "TPK Kepulauan Widi",
    layers: ["widi"],
    center: [-0.454058840694179, 128.3333424947321],
    zoom: 10,
    downloads: {
      map: "/maps/map_widi.jpg",
      rpz: "/documents/rpz_widi.pdf",
      decree: "/documents/kepmenkp_widi.pdf",
    },
    data_link:
      "https://explore.datamermaid.org/?lat=-0.5691674027445686&lng=128.4358287002309&zoom=10.025080875900432",
  },
  {
    id: "makian_moti",
    label: "TWP Pulau Makian dan Pulau Moti",
    layers: ["makian_moti"],
    center: [0.33921074759833, 127.292037053151],
    zoom: 11,
    downloads: {
      map: "/maps/map_makian_moti.jpg",
      rpz: "/documents/rpz_makian_moti.pdf",
      decree: "/documents/kepmenkp_makian_moti.pdf",
    },
    data_link:
      "https://explore.datamermaid.org/?lat=0.3884449816521425&lng=127.4087498296833&zoom=10.7821418162412",
  },
  {
    id: "guraici",
    label: "TPK Kepulauan Guraici",
    layers: ["guraici"],
    center: [-0.0006369443475774182, 127.20325856570801],
    zoom: 11,
    downloads: {
      map: "/maps/map_guraici.jpg",
      rpz: "/documents/rpz_guraici.pdf",
      decree: "/documents/kepmenkp_guraici.pdf",
    },
    data_link:
      "https://explore.datamermaid.org/?lat=0.01870372610049742&lng=127.28376207057408&zoom=10.437054988374738",
  },
  {
    id: "mare",
    label: "TWP Pulau Mare",
    layers: ["mare"],
    center: [0.5711664225265207, 127.3981937559456],
    zoom: 12,
    downloads: {
      map: "/maps/map_mare.jpg",
      rpz: "/documents/rpz_mare.pdf",
      decree: "/documents/kepmenkp_mare.pdf",
    },
    data_link:
      "https://explore.datamermaid.org/?lat=0.5763984374883933&lng=127.39199797405445&zoom=13.292138810620731",
  },
  {
    id: "rao_dehegila",
    label: "TWP Pulau Rao - Tanjung Dehegila",
    layers: ["rao_dehegila"],
    center: [2.1874194484627885, 128.20795178555449],
    zoom: 11,
    downloads: {
      map: "/maps/map_rao_dehegila.jpg",
      rpz: "/documents/rpz_rao_dehegila.pdf",
      decree: "/documents/kepmenkp_rao_dehegila.pdf",
    },
    data_link:
      "https://explore.datamermaid.org/?lat=2.204355268634359&lng=128.19846554821027&zoom=10.01414314192795",
  },
  {
    id: "sula",
    label: "Kepulauan Sula",
    layers: ["sula"],
    center: [-2.134340277999968, 126.15313500200011],
    zoom: 9,
    downloads: {
      map: "/maps/map_sula.jpg",
      rpz: "/documents/rpz_sula.pdf",
      decree: "/documents/kepmenkp_sula.pdf",
    },
    data_link:
      "https://explore.datamermaid.org/?lat=-2.0857299697138103&lng=126.10304850107377&zoom=9.091227411710365",
  },
];

const solid = (color: string): MapStyle => ({
  color,
  fillColor: color,
  fillOpacity: 0.7,
  weight: 0,
});

export const LEGEND_ORDER: Exclude<LegendValue, "All">[] = [
  "Inti",
  "Pariwisata",
  "Pariwisata Alam Perairan",
  "Perikanan Tangkap",
  "Perikanan Berkelanjutan",
  "Penangkapan Ikan",
  "Perikanan Tradisional",
  "Perikanan Budidaya",
  "Budidaya",
  "Pelabuhan",
  "Rehabilitasi",
  "Jalur Lalu Lintas Kapal",
  "Pelestarian Budaya",
  "Perlindungan Mamalia Laut",
  "Tambat Labuh",
];

export const LEGEND_ITEMS: Record<Exclude<LegendValue, "All">, LegendItem> = {
  Inti: {
    value: "Inti",
    label: "Inti",
    legendClassName: "bg-[#E83628]",
    mapStyle: solid(COLORS.red),
  },

  Pariwisata: {
    value: "Pariwisata",
    label: "Pariwisata",
    legendClassName: "bg-[#A8E248]",
    mapStyle: solid(COLORS.green),
  },

  "Pariwisata Alam Perairan": {
    value: "Pariwisata Alam Perairan",
    label: "Pariwisata Alam Perairan",
    legendClassName: "bg-[#A8E248]",
    mapStyle: solid(COLORS.green),
  },

  "Perikanan Tangkap": {
    value: "Perikanan Tangkap",
    label: "Perikanan Tangkap",
    legendClassName: "bg-[#5CCAF5]",
    mapStyle: solid(COLORS.lightBlue),
  },

  "Perikanan Berkelanjutan": {
    value: "Perikanan Berkelanjutan",
    label: "Perikanan Berkelanjutan",
    legendClassName: "bg-[#5CCAF5]",
    mapStyle: solid(COLORS.lightBlue),
  },

  "Penangkapan Ikan": {
    value: "Penangkapan Ikan",
    label: "Penangkapan Ikan",
    legendClassName: "bg-[#5CCAF5]",
    mapStyle: solid(COLORS.lightBlue),
  },

  "Perikanan Tradisional": {
    value: "Perikanan Tradisional",
    label: "Perikanan Tradisional",
    legendClassName:
      "bg-[#5CCAF5] bg-[repeating-linear-gradient(45deg,#336FF5_0_2px,transparent_2px_10px)]",
    mapStyle: {
      color: COLORS.blue,
      fillColor: "url(#pattern-diagonal-blue)",
      fillOpacity: 1,
      weight: 0,
    },
  },

  "Perikanan Budidaya": {
    value: "Perikanan Budidaya",
    label: "Perikanan Budidaya",
    legendClassName: "bg-[#336FF5]",
    mapStyle: solid(COLORS.blue),
  },

  Budidaya: {
    value: "Budidaya",
    label: "Budidaya",
    legendClassName: "bg-[#336FF5]",
    mapStyle: solid(COLORS.blue),
  },

  Pelabuhan: {
    value: "Pelabuhan",
    label: "Pelabuhan",
    legendClassName: "bg-[#818181]",
    mapStyle: solid(COLORS.darkGray),
  },

  Rehabilitasi: {
    value: "Rehabilitasi",
    label: "Rehabilitasi",
    legendClassName: "bg-[#CBCBCB]",
    mapStyle: solid(COLORS.lightGray),
  },

  "Jalur Lalu Lintas Kapal": {
    value: "Jalur Lalu Lintas Kapal",
    label: "Jalur Lalu Lintas Kapal",
    legendClassName: "bg-[#818181]",
    mapStyle: solid(COLORS.darkGray),
  },

  "Pelestarian Budaya": {
    value: "Pelestarian Budaya",
    label: "Pelestarian Budaya",
    legendClassName:
      "bg-[#686868] [background-image:repeating-linear-gradient(45deg,rgba(255,255,255,0.35)_0_1px,transparent_1px_12px)]",
    mapStyle: {
      color: COLORS.gray,
      fillColor: "url(#pattern-vine-gray)",
      fillOpacity: 1,
      weight: 0,
    },
  },

  "Perlindungan Mamalia Laut": {
    value: "Perlindungan Mamalia Laut",
    label: "Perlindungan Mamalia Laut",
    legendClassName:
      "border border-[#777777] bg-[#BABABA] [background-image:radial-gradient(#ffffff_1.5px,transparent_1.6px)] [background-size:8px_8px]",
    mapStyle: {
      color: COLORS.borderGray,
      fillColor: "url(#pattern-white-dot)",
      fillOpacity: 1,
      weight: 0,
    },
  },

  "Tambat Labuh": {
    value: "Tambat Labuh",
    label: "Tambat Labuh",
    legendClassName: "bg-[#818181]",
    mapStyle: solid(COLORS.darkGray),
  },
};

export const DEFAULT_MAP_STYLE: MapStyle = {
  color: COLORS.black,
  fillColor: COLORS.black,
  fillOpacity: 0.7,
  weight: 1,
};

export function getKkdOption(id: Exclude<SelectedKkdId, "">) {
  return KKD_OPTIONS.find((option) => option.id === id) ?? KKD_OPTIONS[0];
}

export function getGeoJsonLayer(id: GeoLayerId) {
  return GEOJSON_LAYERS.find((layer) => layer.id === id);
}

export function getLegendItem(value?: string | null): LegendItem | undefined {
  if (!value) return undefined;

  if (!(value in LEGEND_ITEMS)) return undefined;

  return LEGEND_ITEMS[value as Exclude<LegendValue, "All">];
}

export function buildDynamicLegendGroups(
  geoData: GeoDataMap,
  layerIds: GeoLayerId[],
): DynamicLegendGroup[] {
  const groupMap = new Map<string, Set<Exclude<LegendValue, "All">>>();

  for (const layerId of layerIds) {
    const collection = geoData[layerId];

    if (!collection) continue;

    for (const feature of collection.features) {
      const zona = feature.properties?.Zona;
      const subZona = feature.properties?.Sub_Zona;

      if (typeof zona !== "string" || typeof subZona !== "string") continue;

      const legendItem = getLegendItem(subZona);

      if (!legendItem) continue;

      if (!groupMap.has(zona)) {
        groupMap.set(zona, new Set());
      }

      groupMap.get(zona)?.add(legendItem.value);
    }
  }

  return Array.from(groupMap.entries()).map(([zona, items]) => ({
    zona,
    items: Array.from(items).sort(
      (a, b) => LEGEND_ORDER.indexOf(a) - LEGEND_ORDER.indexOf(b),
    ),
  }));
}
