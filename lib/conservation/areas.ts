export type LocalizedText = { id?: string; en?: string };

export type ConservationDocumentRow = {
  label: LocalizedText;
  title: LocalizedText;
  path: string;
  kind: string;
};

export type ConservationZoningRow = {
  name: LocalizedText;
  area: string;
  percentage: string;
  purpose: LocalizedText;
  allowed: LocalizedText[];
  prohibited: LocalizedText[];
};

export type ConservationAreaRow = {
  id: string;
  slug: string;
  name: string;
  short_name: LocalizedText;
  official_name: LocalizedText;
  category: LocalizedText;
  location: LocalizedText;
  summary: LocalizedText;
  area_hectares: number;
  ecosystems: LocalizedText[];
  key_features: LocalizedText[];
  zoning_summary: LocalizedText;
  zoning_details: ConservationZoningRow[];
  documents: ConservationDocumentRow[];
  image_path: string | null;
  map_image_path: string | null;
  ticket_price: number;
  is_active: boolean;
  display_order: number;
  created_at?: string;
  updated_at?: string;
};

export const CONSERVATION_AREA_SELECT =
  "id, slug, name, short_name, official_name, category, location, summary, area_hectares, ecosystems, key_features, zoning_summary, zoning_details, documents, image_path, map_image_path, ticket_price, is_active, display_order, created_at, updated_at";

export function localizedText(
  value: LocalizedText | null | undefined,
  locale: "id" | "en",
  fallback = "",
) {
  return value?.[locale]?.trim() || value?.id?.trim() || fallback;
}

export function emptyLocalizedText(): LocalizedText {
  return { id: "", en: "" };
}

export function createEmptyConservationArea(): ConservationAreaRow {
  return {
    id: "",
    slug: "",
    name: "",
    short_name: emptyLocalizedText(),
    official_name: emptyLocalizedText(),
    category: emptyLocalizedText(),
    location: emptyLocalizedText(),
    summary: emptyLocalizedText(),
    area_hectares: 0,
    ecosystems: [],
    key_features: [],
    zoning_summary: emptyLocalizedText(),
    zoning_details: [],
    documents: [],
    image_path: null,
    map_image_path: null,
    ticket_price: 0,
    is_active: true,
    display_order: 0,
  };
}
