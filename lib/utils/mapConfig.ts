import type {
  Feature,
  FeatureCollection,
  GeoJsonProperties,
  Geometry,
} from "geojson";

export type MapGeometryType = "polygon" | "polyline" | "point" | "mixed";
export type MapFillPattern = "none" | "diagonal" | "reverse-diagonal" | "crosshatch" | "horizontal" | "vertical" | "dots";

export function getMapPatternFill(
  pattern: MapFillPattern | null | undefined,
  patternColor: string | null | undefined,
  fillColor: string,
  thickness = 1.25,
  opacity = 1,
  gap = 8,
) {
  if (!pattern || pattern === "none") return fillColor;
  const color = patternColor || fillColor;
  const size = Math.max(4, Math.min(24, gap));
  const half = size / 2;
  const marks: Record<Exclude<MapFillPattern, "none">, string> = {
    diagonal: `<path d="M-${half} ${half}L${half}-${half}M0 ${size}L${size} 0M${half} ${size + half}L${size + half} ${half}"/>`,
    "reverse-diagonal": `<path d="M-${half} ${half}L${half} ${size + half}M0 0L${size} ${size}M${half}-${half}L${size + half} ${half}"/>`,
    crosshatch: `<path d="M-${half} ${half}L${half}-${half}M0 ${size}L${size} 0M-${half} ${half}L${half} ${size + half}M0 0L${size} ${size}"/>`,
    horizontal: `<path d="M0 ${half}H${size}"/>`,
    vertical: `<path d="M${half} 0V${size}"/>`,
    dots: `<circle cx="${half}" cy="${half}" r="${Math.max(1, thickness)}"/>`,
  };
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="${fillColor}"/><g fill="${color}" stroke="${color}" stroke-width="${thickness}" opacity="${opacity}">${marks[pattern]}</g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

export type MapPopupField = {
  field: string;
  label: string;
  selected: boolean;
  suffixEnabled: boolean;
  suffix: string;
};

export type MapLayerGroupConfig = {
  legendItemMode: "none" | "rows" | "columns" | "both";
  mainGroupField: string;
  subGroupField: string;
  useMainGroup: boolean;
  useSubGroup: boolean;
  columnLegendFields: string[];
  mainGroupAliases: Record<string, string>;
  legendItemSources: Record<string, "main" | "sub">;
  legendItemMainValues: Record<string, string>;
};

export type MapLayerTableConfig = {
  enabled: boolean;
  mode: "rows" | "columns";
  dataLabel: string;
  valueLabel: string;
  dataField: string;
  valueField: string;
  selectorField: string;
  selectedFields: string[];
};

export type MapLink = {
  id: string;
  name: string;
  address: string;
  iconPath: string | null;
  style: "filled" | "outline";
};

export type MapGlobalLegendGeometryType = Exclude<MapGeometryType, "mixed">;

export type MapGlobalLegendRawMapping = {
  layerId: string;
  column: string;
  rawValue: string;
};

export type MapGlobalLegendStyle = {
  color: string;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  fillOpacity: number;
  pointSize: number;
  iconPath: string | null;
  fillPattern: MapFillPattern;
  patternColor: string;
  patternThickness: number;
  patternOpacity: number;
  patternGap: number;
};

export type MapGlobalLegendMainGroup = {
  id: string;
  name: string;
  showLabel: boolean;
};

export type MapGlobalLegendItem = {
  id: string;
  name: string;
  showLabel: boolean;
  role: "main" | "sub";
  parentMainGroupId: string;
  geometryType: MapGlobalLegendGeometryType;
  rawMappings: MapGlobalLegendRawMapping[];
  style: MapGlobalLegendStyle;
  sortOrder: number;
};

export type MapGlobalLegendGeometryConfig = {
  mainGroups: MapGlobalLegendMainGroup[];
  items: MapGlobalLegendItem[];
};

export type MapGlobalLegendGroup = {
  id: string;
  name: string;
  layerIds: string[];
  columnByLayerId: Record<string, string>;
  geometries: Partial<
    Record<MapGlobalLegendGeometryType, MapGlobalLegendGeometryConfig>
  >;
};

export type MapGlobalLegendConfig = {
  enabled: boolean;
  selectedGroupId: string;
  groups: MapGlobalLegendGroup[];
};

export type MapConfig = {
  mainGroupField: string;
  subGroupField: string;
  useMainGroup: boolean;
  useSubGroup: boolean;
  layerGroupConfigs: Record<string, MapLayerGroupConfig>;
  globalLegend: MapGlobalLegendConfig;
  selectedFeatureColor: string;
  selectedFeatureFillColor: string;
  selectedFeatureStrokeColor: string;
  selectedFeatureStrokeWidth: number;
  selectedFeatureFillOpacity: number;
  hiddenMapLayerIds: string[];
  popupFields: MapPopupField[];
  layerPopupFields: Record<string, MapPopupField[]>;
  layerTableConfigs: Record<string, MapLayerTableConfig>;
  links: MapLink[];
};

export type MapLegendDraft = {
  value: string;
  label: string;
  labelOnly: boolean;
  geometryType: Exclude<MapGeometryType, "mixed">;
  color: string;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  fillOpacity: number;
  pointSize: number;
  iconPath: string | null;
  fillPattern: MapFillPattern;
  patternColor: string;
  patternThickness: number;
  patternOpacity: number;
  patternGap: number;
  sortOrder: number;
};

export type MapAttachment = {
  name: string;
  path: string;
  size: number;
  type: string;
  uploaded_at: string;
};

const DEFAULT_COLORS = [
  "#0EA5E9",
  "#22C55E",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#14B8A6",
  "#F97316",
  "#64748B",
  "#EC4899",
  "#84CC16",
];

export const DEFAULT_SELECTED_FEATURE_COLOR = "#FACC15";
export const DEFAULT_SELECTED_FEATURE_STROKE_WIDTH = 4;
export const DEFAULT_SELECTED_FEATURE_FILL_OPACITY = 0.35;

export const DEFAULT_GLOBAL_LEGEND_CONFIG: MapGlobalLegendConfig = {
  enabled: false,
  selectedGroupId: "",
  groups: [],
};

function cleanOpacity(value: unknown, fallback: number) {
  return cleanNumberRange(value, fallback, 0, 1);
}

function cleanNumberRange(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) return fallback;

  return Math.min(Math.max(numericValue, min), max);
}

function cleanText(value: unknown) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function parseLayerGroupConfig(value: unknown): MapLayerGroupConfig {
  const config = (typeof value === "object" && value !== null
    ? value
    : {}) as Partial<MapLayerGroupConfig>;

  const parseTextRecord = (recordValue: unknown) =>
    typeof recordValue === "object" && recordValue !== null
      ? Object.entries(recordValue).reduce<Record<string, string>>(
          (acc, [key, recordItem]) => {
            const cleanKey = cleanText(key);
            const cleanValue = cleanText(recordItem);

            if (cleanKey && cleanValue) {
              acc[cleanKey] = cleanValue;
            }

            return acc;
          },
          {},
        )
      : {};

  return {
    legendItemMode:
      config.legendItemMode === "none" ||
      config.legendItemMode === "columns" ||
      config.legendItemMode === "both"
        ? config.legendItemMode
        : "rows",
    mainGroupField: cleanText(config.mainGroupField),
    subGroupField: cleanText(config.subGroupField),
    useMainGroup: config.useMainGroup !== false,
    useSubGroup: config.useSubGroup === true,
    columnLegendFields: cleanStringArray(config.columnLegendFields),
    mainGroupAliases: parseTextRecord(config.mainGroupAliases),
    legendItemSources:
      typeof config.legendItemSources === "object" &&
      config.legendItemSources !== null
        ? Object.entries(config.legendItemSources).reduce<
            Record<string, "main" | "sub">
          >((acc, [key, source]) => {
            const cleanKey = cleanText(key);

            if (cleanKey) {
              acc[cleanKey] = source === "main" ? "main" : "sub";
            }

            return acc;
          }, {})
        : {},
    legendItemMainValues: parseTextRecord(config.legendItemMainValues),
  };
}

function cleanStringArray(value: unknown) {
  return Array.isArray(value) ? value.map(cleanText).filter(Boolean) : [];
}

function parseGlobalLegendStyle(
  value: unknown,
  geometryType: MapGlobalLegendGeometryType,
  index: number,
): MapGlobalLegendStyle {
  const style = (typeof value === "object" && value !== null
    ? value
    : {}) as Partial<MapGlobalLegendStyle>;
  const color =
    cleanText(style.color) || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
  const iconPath = cleanText(style.iconPath) || null;

  return {
    color,
    fillColor: cleanText(style.fillColor) || color,
    strokeColor: cleanText(style.strokeColor) || color,
    strokeWidth: cleanNumberRange(
      style.strokeWidth,
      geometryType === "polyline" ? 3 : 2,
      1,
      12,
    ),
    fillOpacity:
      geometryType === "polyline"
        ? 0
        : cleanOpacity(style.fillOpacity, 0.65),
    pointSize:
      geometryType === "point"
        ? cleanNumberRange(
            style.pointSize,
            iconPath ? 16 : 1,
            iconPath ? 4 : 0.1,
            iconPath ? 64 : 100,
          )
        : 0,
    iconPath,
    fillPattern: ["diagonal", "reverse-diagonal", "crosshatch", "horizontal", "vertical", "dots"].includes(String(style.fillPattern)) ? style.fillPattern as MapFillPattern : "none",
    patternColor: cleanText(style.patternColor) || color,
    patternThickness: cleanNumberRange(style.patternThickness, 1.25, 0.5, 6),
    patternOpacity: cleanOpacity(style.patternOpacity, 1),
    patternGap: cleanNumberRange(style.patternGap, 8, 4, 24),
  };
}

function parseGlobalLegendGeometryConfig(
  value: unknown,
  geometryType: MapGlobalLegendGeometryType,
): MapGlobalLegendGeometryConfig {
  const config = (typeof value === "object" && value !== null
    ? value
    : {}) as Partial<MapGlobalLegendGeometryConfig>;
  const mainGroups = Array.isArray(config.mainGroups)
    ? config.mainGroups
        .map((group) => {
          const parsedGroup = (typeof group === "object" && group !== null
            ? group
            : {}) as Partial<MapGlobalLegendMainGroup>;
          const id = cleanText(parsedGroup.id);

          return {
            id,
            name: cleanText(parsedGroup.name) || id,
            showLabel: parsedGroup.showLabel !== false,
          };
        })
        .filter((group) => group.id && group.name)
    : [];

  const items = Array.isArray(config.items)
    ? config.items
        .map((item, index) => {
          const parsedItem = (typeof item === "object" && item !== null
            ? item
            : {}) as Partial<MapGlobalLegendItem>;
          const id = cleanText(parsedItem.id);
          const rawMappings = Array.isArray(parsedItem.rawMappings)
            ? parsedItem.rawMappings
                .map((mapping) => {
                  const parsedMapping =
                    typeof mapping === "object" && mapping !== null
                      ? (mapping as Partial<MapGlobalLegendRawMapping>)
                      : {};

                  return {
                    layerId: cleanText(parsedMapping.layerId),
                    column: cleanText(parsedMapping.column),
                    rawValue: cleanText(parsedMapping.rawValue),
                  };
                })
                .filter(
                  (mapping) =>
                    mapping.layerId && mapping.column && mapping.rawValue,
                )
            : [];

          return {
            id,
            name: cleanText(parsedItem.name) || id,
            showLabel: parsedItem.showLabel !== false,
            role: (parsedItem.role === "sub" ? "sub" : "main") as
              | "sub"
              | "main",
            parentMainGroupId: cleanText(parsedItem.parentMainGroupId),
            geometryType,
            rawMappings,
            style: parseGlobalLegendStyle(parsedItem.style, geometryType, index),
            sortOrder: cleanNumberRange(parsedItem.sortOrder, index, 0, 10000),
          };
        })
        .filter((item) => item.id && item.name)
    : [];

  return {
    mainGroups,
    items,
  };
}

function parseGlobalLegendConfig(value: unknown): MapGlobalLegendConfig {
  const config = (typeof value === "object" && value !== null
    ? value
    : {}) as Partial<MapGlobalLegendConfig>;
  const selectedGroupId = cleanText(config.selectedGroupId);

  return {
    enabled: config.enabled === true,
    selectedGroupId,
    groups: Array.isArray(config.groups)
      ? config.groups
          .map((group) => {
            const parsedGroup = (typeof group === "object" && group !== null
              ? group
              : {}) as Partial<MapGlobalLegendGroup>;
            const id = cleanText(parsedGroup.id);
            const columnByLayerId =
              typeof parsedGroup.columnByLayerId === "object" &&
              parsedGroup.columnByLayerId !== null
                ? Object.entries(parsedGroup.columnByLayerId).reduce<
                    Record<string, string>
                  >((acc, [layerId, column]) => {
                    const cleanLayerId = cleanText(layerId);
                    const cleanColumn = cleanText(column);

                    if (cleanLayerId && cleanColumn) {
                      acc[cleanLayerId] = cleanColumn;
                    }

                    return acc;
                  }, {})
                : {};
            const geometries =
              typeof parsedGroup.geometries === "object" &&
              parsedGroup.geometries !== null
                ? (parsedGroup.geometries as Partial<
                    Record<MapGlobalLegendGeometryType, unknown>
                  >)
                : {};

            return {
              id,
              name: cleanText(parsedGroup.name),
              layerIds: cleanStringArray(parsedGroup.layerIds),
              columnByLayerId,
              geometries: {
                polygon: parseGlobalLegendGeometryConfig(
                  geometries.polygon,
                  "polygon",
                ),
                polyline: parseGlobalLegendGeometryConfig(
                  geometries.polyline,
                  "polyline",
                ),
                point: parseGlobalLegendGeometryConfig(
                  geometries.point,
                  "point",
                ),
              },
            };
          })
          .filter((group) => group.id)
      : [],
  };
}

export function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function parseJsonArray<T>(value: T[] | string | null | undefined): T[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function parseMapConfig(value: unknown): MapConfig {
  if (!value) {
    return {
      mainGroupField: "",
      subGroupField: "",
      useMainGroup: true,
      useSubGroup: false,
      layerGroupConfigs: {},
      globalLegend: DEFAULT_GLOBAL_LEGEND_CONFIG,
      selectedFeatureColor: DEFAULT_SELECTED_FEATURE_COLOR,
      selectedFeatureFillColor: DEFAULT_SELECTED_FEATURE_COLOR,
      selectedFeatureStrokeColor: DEFAULT_SELECTED_FEATURE_COLOR,
      selectedFeatureStrokeWidth: DEFAULT_SELECTED_FEATURE_STROKE_WIDTH,
      selectedFeatureFillOpacity: DEFAULT_SELECTED_FEATURE_FILL_OPACITY,
      hiddenMapLayerIds: [],
      popupFields: [],
      layerPopupFields: {},
      layerTableConfigs: {},
      links: [],
    };
  }

  let parsed: unknown = value;

  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value) as Partial<MapConfig>;
    } catch {
      parsed = {};
    }
  }

  const config = parsed as Partial<MapConfig>;

  const selectedFeatureColor =
    cleanText(config.selectedFeatureColor) || DEFAULT_SELECTED_FEATURE_COLOR;
  const selectedFeatureFillColor =
    cleanText(config.selectedFeatureFillColor) || selectedFeatureColor;
  const selectedFeatureStrokeColor =
    cleanText(config.selectedFeatureStrokeColor) || selectedFeatureColor;

  return {
    mainGroupField: cleanText(config.mainGroupField),
    subGroupField: cleanText(config.subGroupField),
    useMainGroup: config.useMainGroup !== false,
    useSubGroup: config.useSubGroup === true,
    layerGroupConfigs:
      typeof config.layerGroupConfigs === "object" &&
      config.layerGroupConfigs !== null
        ? Object.entries(config.layerGroupConfigs).reduce<
            Record<string, MapLayerGroupConfig>
          >((acc, [layerId, layerConfig]) => {
            const cleanLayerId = cleanText(layerId);

            if (cleanLayerId) {
              acc[cleanLayerId] = parseLayerGroupConfig(layerConfig);
            }

            return acc;
          }, {})
        : {},
    globalLegend: parseGlobalLegendConfig(config.globalLegend),
    selectedFeatureColor,
    selectedFeatureFillColor,
    selectedFeatureStrokeColor,
    selectedFeatureStrokeWidth: cleanNumberRange(
      config.selectedFeatureStrokeWidth,
      DEFAULT_SELECTED_FEATURE_STROKE_WIDTH,
      1,
      12,
    ),
    selectedFeatureFillOpacity: cleanOpacity(
      config.selectedFeatureFillOpacity,
      DEFAULT_SELECTED_FEATURE_FILL_OPACITY,
    ),
    hiddenMapLayerIds: Array.isArray(config.hiddenMapLayerIds)
      ? config.hiddenMapLayerIds.map(cleanText).filter(Boolean)
      : [],
    popupFields: Array.isArray(config.popupFields)
      ? config.popupFields.map((field) => ({
          field: cleanText(field.field),
          label: cleanText(field.label) || cleanText(field.field),
          selected: field.selected !== false,
          suffixEnabled: field.suffixEnabled === true,
          suffix: cleanText(field.suffix),
        }))
      : [],
    layerPopupFields:
      typeof config.layerPopupFields === "object" &&
      config.layerPopupFields !== null
        ? Object.entries(config.layerPopupFields).reduce<
            Record<string, MapPopupField[]>
          >((acc, [layerId, fields]) => {
            const cleanLayerId = cleanText(layerId);

            if (!cleanLayerId || !Array.isArray(fields)) return acc;

            acc[cleanLayerId] = fields.map((field) => ({
              field: cleanText(field.field),
              label: cleanText(field.label) || cleanText(field.field),
              selected: field.selected !== false,
              suffixEnabled: field.suffixEnabled === true,
              suffix: cleanText(field.suffix),
            }));

            return acc;
          }, {})
        : {},
    layerTableConfigs:
      typeof config.layerTableConfigs === "object" &&
      config.layerTableConfigs !== null
        ? Object.entries(config.layerTableConfigs).reduce<
            Record<string, MapLayerTableConfig>
          >((acc, [layerId, tableConfig]) => {
            const cleanLayerId = cleanText(layerId);

            if (!cleanLayerId || !tableConfig) return acc;

            acc[cleanLayerId] = {
              enabled: tableConfig.enabled === true,
              mode: tableConfig.mode === "columns" ? "columns" : "rows",
              dataLabel: cleanText(tableConfig.dataLabel) || "Data",
              valueLabel: cleanText(tableConfig.valueLabel) || "Nilai",
              dataField: cleanText(tableConfig.dataField),
              valueField: cleanText(tableConfig.valueField),
              selectorField: cleanText(tableConfig.selectorField),
              selectedFields: cleanStringArray(tableConfig.selectedFields),
            };

            return acc;
          }, {})
        : {},
    links: Array.isArray(config.links)
      ? config.links
          .map<MapLink>((link) => ({
            id: cleanText(link.id),
            name: cleanText(link.name),
            address: cleanText(link.address),
            iconPath: cleanText(link.iconPath) || null,
            style: link.style === "outline" ? "outline" : "filled",
          }))
          .filter((link) => link.id)
      : [],
  };
}

export function isFeatureCollection(value: unknown): value is FeatureCollection {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as FeatureCollection).type === "FeatureCollection" &&
    Array.isArray((value as FeatureCollection).features)
  );
}

export function getGeometryType(geometry: Geometry | null): MapGeometryType {
  if (!geometry) return "mixed";

  if (geometry.type === "Polygon" || geometry.type === "MultiPolygon") {
    return "polygon";
  }

  if (
    geometry.type === "LineString" ||
    geometry.type === "MultiLineString"
  ) {
    return "polyline";
  }

  if (geometry.type === "Point" || geometry.type === "MultiPoint") {
    return "point";
  }

  return "mixed";
}

export function getCollectionGeometryType(collection: FeatureCollection) {
  const geometryTypes = new Set<MapGeometryType>();

  collection.features.forEach((feature) => {
    geometryTypes.add(getGeometryType(feature.geometry));
  });

  if (geometryTypes.size === 1) {
    return Array.from(geometryTypes)[0] ?? "mixed";
  }

  return "mixed";
}

export function getFeaturePropertyKeys(collection: FeatureCollection) {
  const keys = new Set<string>();

  collection.features.forEach((feature) => {
    Object.keys(feature.properties ?? {}).forEach((key) => keys.add(key));
  });

  return Array.from(keys);
}

export function getDefaultGroupField(keys: string[]) {
  const preferred = [
    "Zona",
    "zona",
    "Zone",
    "zone",
    "Kategori",
    "kategori",
    "Type",
    "type",
    "Nama",
    "name",
  ];

  return preferred.find((key) => keys.includes(key)) ?? keys[0] ?? "";
}

export function getDefaultSubGroupField(keys: string[], mainGroupField: string) {
  const preferred = [
    "Sub_Zona",
    "sub_zona",
    "Sub Zona",
    "sub zone",
    "Subzone",
    "subzone",
    "Sub_Kategori",
    "sub_kategori",
  ];

  return (
    preferred.find((key) => keys.includes(key) && key !== mainGroupField) ?? ""
  );
}

export function getDefaultPopupFields(keys: string[]): MapPopupField[] {
  return keys.slice(0, 6).map((key) => ({
    field: key,
    label: key,
    selected: true,
    suffixEnabled: false,
    suffix: "",
  }));
}

function getFeatureValue(feature: Feature<Geometry, GeoJsonProperties>, field: string) {
  return cleanText(feature.properties?.[field]);
}

export function createLegendDrafts(
  collection: FeatureCollection,
  fields: string[],
): MapLegendDraft[] {
  const valueMap = new Map<string, Exclude<MapGeometryType, "mixed">>();

  collection.features.forEach((feature) => {
    const geometryType = getGeometryType(feature.geometry);

    if (geometryType === "mixed") return;

    fields.forEach((field) => {
      const value = getFeatureValue(feature, field);

      if (value && !valueMap.has(value)) {
        valueMap.set(value, geometryType);
      }
    });
  });

  return Array.from(valueMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([value, geometryType], index) => {
      const color = DEFAULT_COLORS[index % DEFAULT_COLORS.length];

      return {
        value,
        label: value,
        labelOnly: false,
        geometryType,
        color,
        fillColor: color,
        strokeColor: color,
        strokeWidth: geometryType === "polyline" ? 3 : 2,
        fillOpacity: geometryType === "polyline" ? 0 : 0.65,
        pointSize: geometryType === "point" ? 1 : 0,
        iconPath: null,
        fillPattern: "none",
        patternColor: color,
        patternThickness: 1.25,
        patternOpacity: 1,
        patternGap: 8,
        sortOrder: index,
      };
    });
}

export function getBoundsFromCollection(collection: FeatureCollection) {
  const points: [number, number][] = [];

  const walk = (coordinates: unknown): void => {
    if (!Array.isArray(coordinates)) return;

    if (
      coordinates.length >= 2 &&
      typeof coordinates[0] === "number" &&
      typeof coordinates[1] === "number"
    ) {
      points.push([coordinates[1], coordinates[0]]);
      return;
    }

    coordinates.forEach(walk);
  };

  const walkGeometry = (geometry: Geometry | null) => {
    if (!geometry) return;

    if (geometry.type === "GeometryCollection") {
      geometry.geometries.forEach(walkGeometry);
      return;
    }

    walk(geometry.coordinates);
  };

  collection.features.forEach((feature) => {
    walkGeometry(feature.geometry);
  });

  if (points.length === 0) return null;

  const lats = points.map(([lat]) => lat);
  const lngs = points.map(([, lng]) => lng);

  return {
    south: Math.min(...lats),
    west: Math.min(...lngs),
    north: Math.max(...lats),
    east: Math.max(...lngs),
  };
}

export function getCenterFromBounds(
  bounds: ReturnType<typeof getBoundsFromCollection>,
) {
  if (!bounds) return null;

  return [
    (bounds.south + bounds.north) / 2,
    (bounds.west + bounds.east) / 2,
  ] as [number, number];
}

export function collectionToCsv(collections: FeatureCollection[]) {
  const rows = collections.flatMap((collection) =>
    collection.features.map((feature) => feature.properties ?? {}),
  );

  const headers = Array.from(
    rows.reduce<Set<string>>((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set()),
  );

  const escape = (value: unknown) => {
    const text = cleanText(value);

    if (/[",\n]/.test(text)) {
      return `"${text.replaceAll('"', '""')}"`;
    }

    return text;
  };

  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escape(row[header])).join(",")),
  ].join("\n");
}
