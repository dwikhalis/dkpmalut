"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  Circle,
  CircleMarker,
  GeoJSON,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type {
  Feature,
  FeatureCollection,
  GeoJsonProperties,
  Geometry,
  Point,
} from "geojson";
import {
  getCenterFromBounds,
  getGeometryType,
  parseMapConfig,
  type MapConfig,
  type MapGlobalLegendItem,
  type MapGeometryType,
  type MapFillPattern,
  type MapLayerGroupConfig,
} from "@/lib/utils/mapConfig";

export type MapLegendItem = {
  value: string;
  label: string;
  geometry_type: Exclude<MapGeometryType, "mixed">;
  color: string | null;
  fill_color: string | null;
  stroke_color: string | null;
  stroke_width: number | null;
  fill_opacity: number | null;
  fill_pattern?: import("@/lib/utils/mapConfig").MapFillPattern | null;
  pattern_color?: string | null;
  pattern_thickness?: number | null;
  pattern_opacity?: number | null;
  pattern_gap?: number | null;
  icon_path: string | null;
  icon_width: number | null;
  icon_height: number | null;
  visible_by_default?: boolean | null;
  label_only?: boolean;
};

export type MapPreviewLayer = {
  id: string;
  name: string;
  geometry_type: MapGeometryType;
  collection: FeatureCollection;
  legends: MapLegendItem[];
};

type Props = {
  layers: MapPreviewLayer[];
  mapConfig: MapConfig | string | null;
  bounds?: {
    south: number;
    west: number;
    north: number;
    east: number;
  } | null;
  boundsTrigger?: number;
  selectedLegendValues?: string[];
  selectedLegendFilters?: Array<{
    layerId: string;
    value: string;
  }>;
  heightClassName?: string;
  className?: string;
  snapshotTrigger?: number;
  onSnapshot?: (dataUrl: string | null) => void;
  onRenderComplete?: () => void;
  onFeatureSelect?: (
    layerId: string | null,
    feature: Feature<Geometry, GeoJsonProperties> | null,
  ) => void;
};

const DEFAULT_CENTER: [number, number] = [0.7893, 127.3842];
const DEFAULT_ZOOM = 7;

async function drawImageElement(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  if (!image.complete) {
    await new Promise<void>((resolve) => {
      image.addEventListener("load", () => resolve(), { once: true });
      image.addEventListener("error", () => resolve(), { once: true });
    });
  }

  if (image.complete && image.naturalWidth > 0) {
    context.drawImage(image, x, y, width, height);
  }
}

async function drawSvgElement(
  context: CanvasRenderingContext2D,
  svg: SVGSVGElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const snapshotSvg = svg.cloneNode(true) as SVGSVGElement;

  // getBoundingClientRect() already includes Leaflet's pane translation. Keeping
  // that transform in the serialized SVG applies the offset a second time.
  snapshotSvg.style.transform = "none";
  snapshotSvg.style.transformOrigin = "0 0";

  const serialized = new XMLSerializer().serializeToString(snapshotSvg);
  const blob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  try {
    const image = new Image();
    image.src = url;

    await new Promise<void>((resolve) => {
      image.onload = () => resolve();
      image.onerror = () => resolve();
    });

    if (image.complete && image.naturalWidth > 0) {
      context.drawImage(image, x, y, width, height);
    }
  } finally {
    URL.revokeObjectURL(url);
  }
}

function exportCanvasDataUrl(canvas: HTMLCanvasElement) {
  try {
    return canvas.toDataURL("image/png");
  } catch (error) {
    if (error instanceof DOMException && error.name === "SecurityError") {
      return null;
    }

    throw error;
  }
}

async function captureLeafletMap(
  map: L.Map,
  options: { includeExternalImages?: boolean } = {},
) {
  const includeExternalImages = options.includeExternalImages ?? true;
  const container = map.getContainer();
  const bounds = container.getBoundingClientRect();
  const canvas = document.createElement("canvas");
  const scale = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = Math.max(1, Math.round(bounds.width * scale));
  canvas.height = Math.max(1, Math.round(bounds.height * scale));

  const context = canvas.getContext("2d");
  if (!context) return null;

  context.scale(scale, scale);
  context.fillStyle = "#f8fafc";
  context.fillRect(0, 0, bounds.width, bounds.height);

  if (includeExternalImages) {
    const tileImages = Array.from(
      container.querySelectorAll<HTMLImageElement>(".leaflet-tile-loaded"),
    );

    for (const tile of tileImages) {
      const tileBounds = tile.getBoundingClientRect();
      await drawImageElement(
        context,
        tile,
        tileBounds.left - bounds.left,
        tileBounds.top - bounds.top,
        tileBounds.width,
        tileBounds.height,
      );
    }
  }

  const overlaySvgs = Array.from(
    container.querySelectorAll<SVGSVGElement>(".leaflet-overlay-pane svg"),
  );

  for (const svg of overlaySvgs) {
    const svgBounds = svg.getBoundingClientRect();
    await drawSvgElement(
      context,
      svg,
      svgBounds.left - bounds.left,
      svgBounds.top - bounds.top,
      svgBounds.width,
      svgBounds.height,
    );
  }

  if (includeExternalImages) {
    const markerImages = Array.from(
      container.querySelectorAll<HTMLImageElement>(".leaflet-marker-pane img"),
    );

    for (const marker of markerImages) {
      const markerBounds = marker.getBoundingClientRect();
      await drawImageElement(
        context,
        marker,
        markerBounds.left - bounds.left,
        markerBounds.top - bounds.top,
        markerBounds.width,
        markerBounds.height,
      );
    }
  }

  const dataUrl = exportCanvasDataUrl(canvas);

  if (!dataUrl && includeExternalImages) {
    return captureLeafletMap(map, { includeExternalImages: false });
  }

  return dataUrl;
}

function FitBounds({
  bounds,
  layersLength,
  trigger,
}: {
  bounds: Props["bounds"];
  layersLength: number;
  trigger: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (!bounds) return;

    map.fitBounds(
      [
        [bounds.south, bounds.west],
        [bounds.north, bounds.east],
      ],
      {
        animate: true,
        maxZoom: 15,
        padding: [24, 24],
      },
    );
  }, [bounds, layersLength, map, trigger]);

  return null;
}

function collectGeometryLatLngs(geometry: Geometry | null): L.LatLngExpression[] {
  if (!geometry) return [];

  const latLngs: L.LatLngExpression[] = [];
  const collect = (coordinates: unknown) => {
    if (!Array.isArray(coordinates)) return;

    if (
      coordinates.length >= 2 &&
      typeof coordinates[0] === "number" &&
      typeof coordinates[1] === "number"
    ) {
      const lng = coordinates[0];
      const lat = coordinates[1];

      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        latLngs.push([lat, lng]);
      }

      return;
    }

    coordinates.forEach(collect);
  };

  if (geometry.type === "GeometryCollection") {
    geometry.geometries.forEach((item) => {
      latLngs.push(...collectGeometryLatLngs(item));
    });
    return latLngs;
  }

  collect(geometry.coordinates);
  return latLngs;
}

function FitSelectedFeatures({
  bounds,
  active,
}: {
  bounds: L.LatLngBounds | null;
  active: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (!active || !bounds?.isValid()) return;

    map.fitBounds(bounds, {
      animate: true,
      maxZoom: 15,
      padding: [36, 36],
    });
  }, [active, bounds, map]);

  return null;
}

function ClearSelectionOnMapClick({ onClear }: { onClear: () => void }) {
  useMapEvents({
    click: () => {
      onClear();
    },
  });

  return null;
}

function getPublicImageUrl(path: string | null) {
  if (!path) return "";

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/images/${path}`;
}

function getFeatureValue(
  feature: Feature<Geometry, GeoJsonProperties>,
  mapConfig: MapConfig,
  layerId?: string,
) {
  const layerConfig: MapLayerGroupConfig = layerId
    ? (mapConfig.layerGroupConfigs[layerId] ?? {
        mainGroupField: mapConfig.mainGroupField,
        subGroupField: mapConfig.subGroupField,
        useMainGroup: mapConfig.useMainGroup,
        useSubGroup: mapConfig.useSubGroup,
        legendItemMode: "rows",
        columnLegendFields: [],
        mainGroupAliases: {},
        legendItemSources: {},
        legendItemMainValues: {},
      })
    : {
        mainGroupField: mapConfig.mainGroupField,
        subGroupField: mapConfig.subGroupField,
        useMainGroup: mapConfig.useMainGroup,
        useSubGroup: mapConfig.useSubGroup,
        legendItemMode: "rows",
        columnLegendFields: [],
        mainGroupAliases: {},
        legendItemSources: {},
        legendItemMainValues: {},
      };
  if (layerConfig.legendItemMode === "columns") {
    return (
      layerConfig.columnLegendFields.find((field) =>
        isColumnLegendValueActive(feature.properties?.[field]),
      ) ?? ""
    );
  }

  const mainValue = layerConfig.mainGroupField
    ? feature.properties?.[layerConfig.mainGroupField]
    : null;
  const subValue = layerConfig.subGroupField
    ? feature.properties?.[layerConfig.subGroupField]
    : null;

  if (layerConfig.useSubGroup && subValue && mainValue) {
    return `${String(mainValue)}|||${String(subValue)}`;
  }

  if (layerConfig.useSubGroup && subValue) return String(subValue);
  if (layerConfig.useMainGroup && mainValue) return String(mainValue);

  return "";
}

const ROW_LEGEND_VALUE_SEPARATOR = ":::";

function getRowLegendValue(source: "main" | "sub", value: string) {
  return `${source}${ROW_LEGEND_VALUE_SEPARATOR}${value}`;
}

function parseRowLegendValue(value: string): {
  source: "main" | "sub" | "column";
  rawValue: string;
} {
  if (value.startsWith(`main${ROW_LEGEND_VALUE_SEPARATOR}`)) {
    return {
      source: "main",
      rawValue: value.slice(`main${ROW_LEGEND_VALUE_SEPARATOR}`.length),
    };
  }

  if (value.startsWith(`sub${ROW_LEGEND_VALUE_SEPARATOR}`)) {
    return {
      source: "sub",
      rawValue: value.slice(`sub${ROW_LEGEND_VALUE_SEPARATOR}`.length),
    };
  }

  return {
    source: "column",
    rawValue: value.includes("|||") ? value.split("|||").at(-1) || value : value,
  };
}

function getLegendDisplayValue(value: unknown) {
  return String(value ?? "").trim();
}

function isColumnLegendValueActive(value: unknown) {
  if (value === undefined || value === null) return false;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;

  const normalized = String(value).trim().toLowerCase();

  return Boolean(
    normalized &&
      !["0", "false", "no", "tidak", "none", "null", "undefined", "-"].includes(
        normalized,
      ),
  );
}

function getLayerLegendMatch(
  feature: Feature<Geometry, GeoJsonProperties>,
  legends: MapLegendItem[],
  mapConfig: MapConfig,
  layerId: string,
) {
  const layerConfig: MapLayerGroupConfig =
    mapConfig.layerGroupConfigs[layerId] ?? {
      mainGroupField: mapConfig.mainGroupField,
      subGroupField: mapConfig.subGroupField,
      useMainGroup: mapConfig.useMainGroup,
      useSubGroup: mapConfig.useSubGroup,
      legendItemMode: "rows",
      columnLegendFields: [],
      mainGroupAliases: {},
      legendItemSources: {},
      legendItemMainValues: {},
    };

  if (layerConfig.legendItemMode === "columns") {
    return legends.find((legend) =>
      !legend.label_only &&
      isColumnLegendValueActive(feature.properties?.[legend.value]),
    );
  }

  const mainValue = getLegendDisplayValue(
    layerConfig.mainGroupField
      ? feature.properties?.[layerConfig.mainGroupField]
      : "",
  );
  const subValue = getLegendDisplayValue(
    layerConfig.subGroupField
      ? feature.properties?.[layerConfig.subGroupField]
      : "",
  );
  const rowLegendMatches = (legend: MapLegendItem) => {
    const parsedLegend = parseRowLegendValue(legend.value);
    const source =
      parsedLegend.source === "column"
        ? layerConfig.legendItemSources[legend.value]
        : parsedLegend.source;
    const rawValue =
      parsedLegend.source === "column"
        ? layerConfig.legendItemMainValues[legend.value] ||
          (legend.value.includes("|||")
            ? legend.value.split("|||").at(-1) || legend.value
            : legend.value)
        : parsedLegend.rawValue;

    if (source === "main") return rawValue === mainValue;
    if (source === "sub") return rawValue === subValue;

    return false;
  };

  if (layerConfig.legendItemMode === "both") {
    return legends.find((legend) => {
      if (legend.label_only) return false;

      if (layerConfig.columnLegendFields.includes(legend.value)) {
        return isColumnLegendValueActive(feature.properties?.[legend.value]);
      }

      return rowLegendMatches(legend);
    });
  }

  return (
    legends.find((item) => !item.label_only && rowLegendMatches(item)) ??
    legends.find(
      (item) =>
        !item.label_only && item.value === getRowLegendValue("main", mainValue),
    ) ??
    legends.find(
      (item) =>
        !item.label_only && item.value === getRowLegendValue("sub", subValue),
    )
  );
}

function getLayerLegendMatches(
  feature: Feature<Geometry, GeoJsonProperties>,
  legends: MapLegendItem[],
  mapConfig: MapConfig,
  layerId: string,
) {
  const layerConfig: MapLayerGroupConfig =
    mapConfig.layerGroupConfigs[layerId] ?? {
      mainGroupField: mapConfig.mainGroupField,
      subGroupField: mapConfig.subGroupField,
      useMainGroup: mapConfig.useMainGroup,
      useSubGroup: mapConfig.useSubGroup,
      legendItemMode: "rows",
      columnLegendFields: [],
      mainGroupAliases: {},
      legendItemSources: {},
      legendItemMainValues: {},
    };

  if (layerConfig.legendItemMode === "columns") {
    return legends.filter((legend) =>
      !legend.label_only &&
      isColumnLegendValueActive(feature.properties?.[legend.value]),
    );
  }

  if (layerConfig.legendItemMode === "both") {
    const mainValue = getLegendDisplayValue(
      layerConfig.mainGroupField
        ? feature.properties?.[layerConfig.mainGroupField]
        : "",
    );
    const subValue = getLegendDisplayValue(
      layerConfig.subGroupField
        ? feature.properties?.[layerConfig.subGroupField]
        : "",
    );
    return legends.filter((legend) => {
      if (legend.label_only) return false;

      if (layerConfig.columnLegendFields.includes(legend.value)) {
        return isColumnLegendValueActive(feature.properties?.[legend.value]);
      }

      const parsedLegend = parseRowLegendValue(legend.value);
      const source =
        parsedLegend.source === "column"
          ? layerConfig.legendItemSources[legend.value]
          : parsedLegend.source;
      const rawValue =
        parsedLegend.source === "column"
          ? layerConfig.legendItemMainValues[legend.value] ||
            (legend.value.includes("|||")
              ? legend.value.split("|||").at(-1) || legend.value
              : legend.value)
          : parsedLegend.rawValue;

      if (source === "main") return rawValue === mainValue;
      if (source === "sub") return rawValue === subValue;

      return false;
    });
  }

  const mainValue = getLegendDisplayValue(
    layerConfig.mainGroupField
      ? feature.properties?.[layerConfig.mainGroupField]
      : "",
  );
  const subValue = getLegendDisplayValue(
    layerConfig.subGroupField
      ? feature.properties?.[layerConfig.subGroupField]
      : "",
  );
  const matches = legends.filter((legend) => {
    if (legend.label_only) return false;

    const parsedLegend = parseRowLegendValue(legend.value);
    const source =
      parsedLegend.source === "column"
        ? layerConfig.legendItemSources[legend.value]
        : parsedLegend.source;
    const rawValue =
      parsedLegend.source === "column"
        ? layerConfig.legendItemMainValues[legend.value] ||
          (legend.value.includes("|||")
            ? legend.value.split("|||").at(-1) || legend.value
            : legend.value)
        : parsedLegend.rawValue;

    if (source === "main") return rawValue === mainValue;
    if (source === "sub") return rawValue === subValue;

    return false;
  });

  return matches;
}

function getPreferredLayerLegendMatch(
  feature: Feature<Geometry, GeoJsonProperties>,
  legends: MapLegendItem[],
  mapConfig: MapConfig,
  layerId: string,
  selectedFilters: Props["selectedLegendFilters"] = [],
) {
  const matches = getLayerLegendMatches(feature, legends, mapConfig, layerId);
  const selectedMatch = matches.find((legend) =>
    selectedFilters.some(
      (filter) => filter.layerId === layerId && filter.value === legend.value,
    ),
  );

  return selectedMatch ?? matches[0] ?? null;
}

function getGlobalLegendMatch(
  feature: Feature<Geometry, GeoJsonProperties>,
  mapConfig: MapConfig,
  layerId: string,
): MapGlobalLegendItem | null {
  if (!mapConfig.globalLegend.enabled) return null;

  const geometryType = getGeometryType(feature.geometry);
  if (geometryType === "mixed") return null;

  const candidateGroups = mapConfig.globalLegend.groups.filter((group) => {
    if (!group.layerIds.includes(layerId)) return false;
    if (!mapConfig.globalLegend.selectedGroupId) return true;

    return group.id === mapConfig.globalLegend.selectedGroupId;
  });

  for (const group of candidateGroups) {
    const column = group.columnByLayerId[layerId];
    if (!column) continue;

    const rawValue = String(feature.properties?.[column] ?? "").trim();
    if (!rawValue) continue;

    const geometryConfig = group.geometries[geometryType];
    const item = geometryConfig?.items.find((legendItem) =>
      legendItem.rawMappings.some(
        (mapping) =>
          mapping.layerId === layerId &&
          mapping.column === column &&
          mapping.rawValue === rawValue,
      ),
    );

    if (item) return item;
  }

  return null;
}

function getLegendStyle(
  feature: Feature<Geometry, GeoJsonProperties>,
  legends: MapLegendItem[],
  mapConfig: MapConfig,
  layerId: string,
  isSelected?: boolean,
  selectedFilters: Props["selectedLegendFilters"] = [],
): L.PathOptions {
  const geometryType = getGeometryType(feature.geometry);
  const globalLegend = getGlobalLegendMatch(feature, mapConfig, layerId);
  const legend = getPreferredLayerLegendMatch(
    feature,
    legends,
    mapConfig,
    layerId,
    selectedFilters,
  );
  const fallbackColor = geometryType === "polyline" ? "#0EA5E9" : "#38BDF8";
  const strokeColor =
    globalLegend?.style.strokeColor ||
    legend?.stroke_color ||
    legend?.color ||
    fallbackColor;
  const solidFillColor =
    globalLegend?.style.fillColor ||
    legend?.fill_color ||
    legend?.color ||
    fallbackColor;
  const fillColor = solidFillColor;
  const baseWeight =
    globalLegend?.style.strokeWidth ??
    legend?.stroke_width ??
    (geometryType === "polyline" ? 3 : 2);
  const baseFillOpacity =
    geometryType === "polyline"
      ? 0
      : (globalLegend?.style.fillOpacity ?? legend?.fill_opacity ?? 0.65);

  if (isSelected) {
    return {
      color: mapConfig.selectedFeatureStrokeColor,
      fillColor: mapConfig.selectedFeatureFillColor,
      weight: mapConfig.selectedFeatureStrokeWidth,
      opacity: 1,
      fillOpacity:
        geometryType === "polyline" ? 0 : mapConfig.selectedFeatureFillOpacity,
    };
  }

  return {
    color: strokeColor,
    fillColor,
    weight: baseWeight,
    opacity: 1,
    fillOpacity: baseFillOpacity,
  };
}

function renderPopup(
  feature: Feature<Geometry, GeoJsonProperties>,
  mapConfig: MapConfig,
  layerId: string,
) {
  const layerFields = mapConfig.layerPopupFields[layerId];
  const fields = (layerFields && layerFields.length > 0
    ? layerFields
    : mapConfig.popupFields
  ).filter((field) =>
    Boolean(
      field.selected &&
        field.field &&
        Object.prototype.hasOwnProperty.call(
          feature.properties ?? {},
          field.field,
        ),
    ),
  );

  if (fields.length === 0) return null;

  const formatPopupValue = (field: (typeof fields)[number]) => {
    const rawValue = feature.properties?.[field.field];

    if (rawValue === undefined || rawValue === null || rawValue === "") {
      return "-";
    }

    const numericValue =
      typeof rawValue === "number"
        ? rawValue
        : Number(String(rawValue).replace(/,/g, ""));

    if (Number.isFinite(numericValue)) {
      const formatted = new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 2,
      }).format(numericValue);

      return field.suffixEnabled && field.suffix
        ? `${formatted} ${field.suffix}`
        : formatted;
    }

    return String(rawValue);
  };

  return (
    <Popup>
      <div className="space-y-1 text-sm leading-tight">
        {fields.map((field) => (
          <p key={field.field}>
            <b>{field.label || field.field}:</b>{" "}
            {formatPopupValue(field)}
          </p>
        ))}
      </div>
    </Popup>
  );
}

function createLeafletPopupContent(
  feature: Feature<Geometry, GeoJsonProperties>,
  mapConfig: MapConfig,
  layerId: string,
) {
  const layerFields = mapConfig.layerPopupFields[layerId];
  const configuredFields = layerFields && layerFields.length > 0
    ? layerFields
    : mapConfig.popupFields;
  const selectedFields = configuredFields.filter((field) => field.selected);
  let fields = selectedFields.filter(
    (field) =>
      field.field &&
      Object.prototype.hasOwnProperty.call(
        feature.properties ?? {},
        field.field,
      ),
  );

  // A header may have been renamed after an older popup configuration was
  // saved. If callouts are enabled but none of those saved keys exist on this
  // feature anymore, show the available properties instead of silently
  // producing no polygon popup.
  if (fields.length === 0 && selectedFields.length > 0) {
    fields = Object.keys(feature.properties ?? {})
      .slice(0, 6)
      .map((field) => ({
        field,
        label: field,
        selected: true,
        suffixEnabled: false,
        suffix: "",
      }));
  }

  if (fields.length === 0) return null;

  const container = document.createElement("div");
  container.className = "space-y-1 text-sm leading-tight";
  fields.forEach((field) => {
    const row = document.createElement("p");
    const label = document.createElement("b");
    const rawValue = feature.properties?.[field.field];
    const numericValue =
      typeof rawValue === "number"
        ? rawValue
        : Number(String(rawValue ?? "").replace(/,/g, ""));
    const formattedValue =
      rawValue === undefined || rawValue === null || rawValue === ""
        ? "-"
        : Number.isFinite(numericValue)
          ? new Intl.NumberFormat("en-US", {
              maximumFractionDigits: 2,
            }).format(numericValue)
          : String(rawValue);
    const value =
      field.suffixEnabled && field.suffix && formattedValue !== "-"
        ? `${formattedValue} ${field.suffix}`
        : formattedValue;

    label.textContent = `${field.label || field.field}:`;
    row.append(label, document.createTextNode(` ${value}`));
    container.append(row);
  });

  return container;
}

function getPointLatLng(feature: Feature<Point, GeoJsonProperties>) {
  const coordinates = feature.geometry.coordinates;
  return [coordinates[1], coordinates[0]] as [number, number];
}

function MapPoint({
  feature,
  legends,
  mapConfig,
  layerId,
  selectedLegendFilters,
  isSelected,
  onSelect,
  onUnselect,
}: {
  feature: Feature<Point, GeoJsonProperties>;
  legends: MapLegendItem[];
  mapConfig: MapConfig;
  layerId: string;
  selectedLegendFilters?: Props["selectedLegendFilters"];
  isSelected: boolean;
  onSelect: () => void;
  onUnselect: () => void;
}) {
  const value = getFeatureValue(feature, mapConfig, layerId);
  const globalLegend = getGlobalLegendMatch(feature, mapConfig, layerId);
  const legend = getPreferredLayerLegendMatch(
    feature,
    legends,
    mapConfig,
    layerId,
    selectedLegendFilters,
  );
  const iconUrl = getPublicImageUrl(
    globalLegend?.style.iconPath ?? legend?.icon_path ?? null,
  );
  const configuredPointSize =
    globalLegend?.style.pointSize ?? legend?.icon_width ?? 14;
  const configuredPointHeight =
    globalLegend?.style.pointSize ?? legend?.icon_height ?? configuredPointSize;
  // Older configurations often retained the 1px symbol default after an
  // image was selected, making the marker effectively invisible.
  const pointSize = configuredPointSize <= 1 ? 14 : configuredPointSize;
  const pointHeight =
    configuredPointHeight <= 1 ? 14 : configuredPointHeight;
  const layerBuffer = mapConfig.layerPointBuffers[layerId]?.[
    legend?.value ?? value
  ];
  const bufferRadius =
    globalLegend?.style.bufferRadius ?? layerBuffer?.radius ?? 0;
  const bufferUnit =
    globalLegend?.style.bufferUnit ?? layerBuffer?.unit ?? "km";
  const bufferColor =
    globalLegend?.style.bufferColor ??
    layerBuffer?.color ??
    globalLegend?.style.fillColor ??
    legend?.fill_color ??
    legend?.color ??
    "#0EA5E9";
  const bufferOpacity =
    globalLegend?.style.bufferOpacity ?? layerBuffer?.opacity ?? 0.15;
  const bufferRadiusMeters =
    bufferRadius * (bufferUnit === "km" ? 1000 : 1);

  const icon = useMemo(() => {
    if (!iconUrl) return undefined;

    return L.icon({
      iconUrl,
      iconSize: [pointSize, pointHeight],
      iconAnchor: [pointSize / 2, pointHeight / 2],
      popupAnchor: [0, -pointHeight / 2],
      crossOrigin: "anonymous",
    });
  }, [iconUrl, pointHeight, pointSize]);

  const defaultColor = globalLegend?.style.color || legend?.color || "#0EA5E9";
  const pointStyle: L.PathOptions = isSelected
    ? {
        color: mapConfig.selectedFeatureStrokeColor,
        fillColor: mapConfig.selectedFeatureFillColor,
        fillOpacity: mapConfig.selectedFeatureFillOpacity,
        opacity: 1,
        weight: mapConfig.selectedFeatureStrokeWidth,
      }
    : {
        color: globalLegend?.style.strokeColor || legend?.stroke_color || defaultColor,
        fillColor: globalLegend?.style.fillColor || legend?.fill_color || defaultColor,
        fillOpacity: globalLegend?.style.fillOpacity ?? legend?.fill_opacity ?? 0.65,
        opacity: 1,
        weight: globalLegend?.style.strokeWidth ?? legend?.stroke_width ?? 2,
      };

  if (!icon) {
    return (
      <>
        {bufferRadiusMeters > 0 && (
          <Circle
            center={getPointLatLng(feature)}
            radius={bufferRadiusMeters}
            interactive={false}
            pathOptions={{
              color: bufferColor,
              fillColor: bufferColor,
              fillOpacity: bufferOpacity,
              opacity: Math.min(1, Math.max(0.25, bufferOpacity + 0.25)),
              weight: 1,
            }}
          />
        )}
        <CircleMarker
          center={getPointLatLng(feature)}
          radius={pointSize / 2}
          pathOptions={pointStyle}
          eventHandlers={{
            click: (event) => {
              L.DomEvent.stopPropagation(event.originalEvent);
              onSelect();
              event.target.openPopup();
            },
            popupclose: onUnselect,
          }}
        >
          {renderPopup(feature, mapConfig, layerId)}
        </CircleMarker>
      </>
    );
  }

  return (
    <>
      {bufferRadiusMeters > 0 && (
        <Circle
          center={getPointLatLng(feature)}
          radius={bufferRadiusMeters}
          interactive={false}
          pathOptions={{
            color: bufferColor,
            fillColor: bufferColor,
            fillOpacity: bufferOpacity,
            opacity: Math.min(1, Math.max(0.25, bufferOpacity + 0.25)),
            weight: 1,
          }}
        />
      )}
      {isSelected && (
        <CircleMarker
          center={getPointLatLng(feature)}
          radius={pointSize / 2}
          pathOptions={{
            color: mapConfig.selectedFeatureStrokeColor,
            fillColor: mapConfig.selectedFeatureFillColor,
            fillOpacity: mapConfig.selectedFeatureFillOpacity,
            opacity: 1,
            weight: mapConfig.selectedFeatureStrokeWidth,
          }}
        />
      )}
      <Marker
        position={getPointLatLng(feature)}
        icon={icon}
        eventHandlers={{
          click: (event) => {
            L.DomEvent.stopPropagation(event.originalEvent);
            onSelect();
            event.target.openPopup();
          },
          popupclose: onUnselect,
        }}
      >
        {renderPopup(feature, mapConfig, layerId)}
      </Marker>
    </>
  );
}

function applySvgPattern(
  geoJson: L.GeoJSON,
  pattern: MapFillPattern,
  fillColor: string,
  patternColor: string,
  thickness: number,
  opacity: number,
  gap: number,
) {
  if (pattern === "none") return false;
  let applied = false;
  geoJson.eachLayer((layer) => {
    const path = (layer as L.Path & { _path?: SVGPathElement })._path;
    const svg = path?.ownerSVGElement;
    if (!path || !svg) return;
    applied = true;
    const key = `${pattern}-${fillColor}-${patternColor}-${thickness}-${opacity}-${gap}`;
    let hash = 0;
    for (let index = 0; index < key.length; index += 1) hash = (hash * 31 + key.charCodeAt(index)) >>> 0;
    const id = `map-fill-pattern-${hash}`;
    let defs = svg.querySelector<SVGDefsElement>("defs[data-map-patterns]");
    if (!defs) {
      defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
      defs.dataset.mapPatterns = "true";
      svg.prepend(defs);
    }
    if (!defs.querySelector(`#${id}`)) {
      const size = Math.max(4, Math.min(24, gap));
      const half = size / 2;
      const patternNode = document.createElementNS("http://www.w3.org/2000/svg", "pattern");
      patternNode.id = id;
      patternNode.setAttribute("patternUnits", "userSpaceOnUse");
      patternNode.setAttribute("width", String(size));
      patternNode.setAttribute("height", String(size));
      const background = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      background.setAttribute("width", String(size));
      background.setAttribute("height", String(size));
      background.setAttribute("fill", fillColor);
      patternNode.append(background);
      const mark = document.createElementNS("http://www.w3.org/2000/svg", pattern === "dots" ? "circle" : "path");
      mark.setAttribute("fill", patternColor);
      mark.setAttribute("stroke", patternColor);
      mark.setAttribute("stroke-width", String(thickness));
      mark.setAttribute("opacity", String(opacity));
      if (pattern === "dots") {
        mark.setAttribute("cx", String(half));
        mark.setAttribute("cy", String(half));
        mark.setAttribute("r", String(Math.max(1, thickness)));
      } else {
        const paths = {
          diagonal: `M-${half} ${half}L${half}-${half}M0 ${size}L${size} 0M${half} ${size + half}L${size + half} ${half}`,
          "reverse-diagonal": `M-${half} ${half}L${half} ${size + half}M0 0L${size} ${size}M${half}-${half}L${size + half} ${half}`,
          crosshatch: `M-${half} ${half}L${half}-${half}M0 ${size}L${size} 0M-${half} ${half}L${half} ${size + half}M0 0L${size} ${size}`,
          horizontal: `M0 ${half}H${size}`,
          vertical: `M${half} 0V${size}`,
        } as const;
        mark.setAttribute("d", paths[pattern]);
      }
      patternNode.append(mark);
      defs.append(patternNode);
    }
    const patternFill = `url(#${id})`;
    (layer as L.Path).setStyle({ fillColor: patternFill });
    path.setAttribute("fill", patternFill);
  });
  return applied;
}

function MapFeature({
  feature,
  legends,
  mapConfig,
  layerId,
  selectedLegendFilters,
  isSelected,
  onSelect,
  onUnselect,
}: {
  feature: Feature<Geometry, GeoJsonProperties>;
  legends: MapLegendItem[];
  mapConfig: MapConfig;
  layerId: string;
  selectedLegendFilters?: Props["selectedLegendFilters"];
  isSelected: boolean;
  onSelect: () => void;
  onUnselect: () => void;
}) {
  const map = useMap();
  const geoJsonRef = useRef<L.GeoJSON | null>(null);

  useEffect(() => {
    const geoJson = geoJsonRef.current;
    if (!geoJson) return;
    geoJson.setStyle(
      getLegendStyle(
        feature,
        legends,
        mapConfig,
        layerId,
        isSelected,
        selectedLegendFilters,
      ),
    );
    if (isSelected || getGeometryType(feature.geometry) !== "polygon") return;
    const globalLegend = getGlobalLegendMatch(feature, mapConfig, layerId);
    const legend = getPreferredLayerLegendMatch(feature, legends, mapConfig, layerId, selectedLegendFilters);
    const pattern = globalLegend?.style.fillPattern ?? legend?.fill_pattern ?? "none";
    if (pattern === "none") return;
    const fillColor = globalLegend?.style.fillColor || legend?.fill_color || legend?.color || "#38BDF8";
    const patternArgs = [
      geoJson,
      pattern,
      fillColor,
      globalLegend?.style.patternColor ?? legend?.pattern_color ?? fillColor,
      globalLegend?.style.patternThickness ?? legend?.pattern_thickness ?? 1.25,
      globalLegend?.style.patternOpacity ?? legend?.pattern_opacity ?? 1,
      globalLegend?.style.patternGap ?? legend?.pattern_gap ?? 8,
    ] as const;
    let frameId = 0;
    let retryTimer = 0;
    const apply = () => {
      if (!applySvgPattern(...patternArgs)) {
        frameId = window.requestAnimationFrame(() => {
          if (!applySvgPattern(...patternArgs)) {
            retryTimer = window.setTimeout(() => applySvgPattern(...patternArgs), 100);
          }
        });
      }
    };
    const reapplyAfterMapRedraw = () => {
      frameId = window.requestAnimationFrame(() => applySvgPattern(...patternArgs));
    };
    apply();
    geoJson.on("add", apply);
    map.on("zoomend moveend viewreset", reapplyAfterMapRedraw);
    return () => {
      geoJson.off("add", apply);
      map.off("zoomend moveend viewreset", reapplyAfterMapRedraw);
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(retryTimer);
    };
  }, [feature, isSelected, layerId, legends, map, mapConfig, selectedLegendFilters]);

  return (
    <GeoJSON
      ref={geoJsonRef}
      data={feature}
      style={() => ({
        ...getLegendStyle(
          feature,
          legends,
          mapConfig,
          layerId,
          isSelected,
          selectedLegendFilters,
        ),
        bubblingMouseEvents: false,
      })}
      onEachFeature={(_, layer) => {
        const popupContent = createLeafletPopupContent(
          feature,
          mapConfig,
          layerId,
        );
        if (popupContent) {
          layer.bindPopup(popupContent);
          layer.on("click", (event: L.LeafletMouseEvent) => {
            if (event.originalEvent) L.DomEvent.stop(event.originalEvent);
            layer.openPopup(event.latlng);
          });
        }
      }}
      eventHandlers={{
        click: (event) => {
          L.DomEvent.stop(event.originalEvent);
          onSelect();
          const target = event.target as L.Layer & {
            openPopup?: (latlng?: L.LatLng) => void;
          };
          target.openPopup?.(event.latlng);
        },
      }}
    >
    </GeoJSON>
  );
}

function MapPreview({
  layers,
  mapConfig,
  bounds,
  boundsTrigger = 0,
  selectedLegendValues,
  selectedLegendFilters,
  heightClassName = "h-[70vh]",
  className = "rounded-md",
  snapshotTrigger = 0,
  onSnapshot,
  onRenderComplete,
  onFeatureSelect,
}: Props) {
  const parsedMapConfig = useMemo(() => parseMapConfig(mapConfig), [mapConfig]);
  const mapRef = useRef<L.Map | null>(null);
  const ctrlDownRef = useRef(false);
  const hoveredRef = useRef(false);
  const [selectedFeatureKey, setSelectedFeatureKey] = useState<string | null>(
    null,
  );
  const [showCtrlNotif, setShowCtrlNotif] = useState(false);

  useEffect(() => {
    if (!onFeatureSelect) return;

    if (!selectedFeatureKey) {
      onFeatureSelect(null, null);
      return;
    }

    for (const layer of layers) {
      const feature = layer.collection.features.find(
        (item, index) =>
          `${layer.id}-${item.id ?? index}` === selectedFeatureKey,
      );

      if (feature) {
        onFeatureSelect(layer.id, feature);
        return;
      }
    }

    onFeatureSelect(null, null);
  }, [layers, onFeatureSelect, selectedFeatureKey]);

  useEffect(() => {
    if (!onRenderComplete) return;
    let cancelled = false;
    let timer = 0;
    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        timer = window.setTimeout(() => {
          if (!cancelled) onRenderComplete();
        }, 100);
      });
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [boundsTrigger, layers, mapConfig, onRenderComplete]);
  const selectedValues = selectedLegendValues ?? [];
  const selectedFilters = selectedLegendFilters ?? [];
  const normalizedBounds = bounds ?? null;
  const center = getCenterFromBounds(normalizedBounds) ?? DEFAULT_CENTER;
  const layoutSignature = useMemo(
    () =>
      JSON.stringify({
        layerIds: layers.map((layer) => layer.id),
        hiddenLayerIds: parsedMapConfig.hiddenMapLayerIds,
        selectedFilters,
        selectedValues,
        heightClassName,
      }),
    [
      heightClassName,
      layers,
      parsedMapConfig.hiddenMapLayerIds,
      selectedFilters,
      selectedValues,
    ],
  );

  const shouldShowFeature = (
    feature: Feature<Geometry, GeoJsonProperties>,
    layerId: string,
  ) => {
    if (
      parsedMapConfig.globalLegend.enabled &&
      parsedMapConfig.globalLegend.selectedGroupId
    ) {
      const group = parsedMapConfig.globalLegend.groups.find(
        (item) => item.id === parsedMapConfig.globalLegend.selectedGroupId,
      );

      if (!group?.layerIds.includes(layerId)) return false;
    }

    if (selectedFilters.length > 0) {
      const globalLegend = getGlobalLegendMatch(feature, parsedMapConfig, layerId);
      const legendMatches = getLayerLegendMatches(
        feature,
        layers.find((layer) => layer.id === layerId)?.legends ?? [],
        parsedMapConfig,
        layerId,
      );

      return selectedFilters.some(
        (filter) =>
          filter.layerId === layerId &&
          (filter.value === globalLegend?.id ||
            legendMatches.some((legend) => legend.value === filter.value)),
      );
    }

    if (selectedValues.length === 0) return true;

    const globalLegend = getGlobalLegendMatch(feature, parsedMapConfig, layerId);
    const value =
      globalLegend?.id ?? getFeatureValue(feature, parsedMapConfig, layerId);

    return selectedValues.includes(value);
  };
  const hasActiveFeatureSelection =
    selectedFilters.length > 0 || selectedValues.length > 0;
  const selectedFeatureBounds = useMemo(() => {
    if (!hasActiveFeatureSelection) return null;

    const latLngs = layers.flatMap((layer) =>
      parsedMapConfig.hiddenMapLayerIds.includes(layer.id)
        ? []
        : layer.collection.features
            .filter((feature) => shouldShowFeature(feature, layer.id))
            .flatMap((feature) => collectGeometryLatLngs(feature.geometry)),
    );

    if (latLngs.length === 0) return null;

    return L.latLngBounds(latLngs);
  }, [
    hasActiveFeatureSelection,
    layers,
    parsedMapConfig.hiddenMapLayerIds,
    selectedFilters,
    selectedValues,
  ]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && !ctrlDownRef.current) {
        ctrlDownRef.current = true;

        if (hoveredRef.current) {
          mapRef.current?.scrollWheelZoom.enable();
        }

        setShowCtrlNotif(false);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (!event.ctrlKey && !event.metaKey) {
        ctrlDownRef.current = false;
        mapRef.current?.scrollWheelZoom.disable();

        if (hoveredRef.current) {
          setShowCtrlNotif(true);
        }
      }
    };

    const handleBlur = () => {
      ctrlDownRef.current = false;
      mapRef.current?.scrollWheelZoom.disable();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const invalidate = () => map.invalidateSize({ animate: false });
    const frame = window.requestAnimationFrame(invalidate);
    const timers = [
      window.setTimeout(invalidate, 120),
      window.setTimeout(invalidate, 320),
    ];
    const container = map.getContainer();
    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(invalidate)
        : null;

    resizeObserver?.observe(container);

    return () => {
      window.cancelAnimationFrame(frame);
      timers.forEach((timer) => window.clearTimeout(timer));
      resizeObserver?.disconnect();
    };
  }, [layoutSignature]);

  useEffect(() => {
    if (!snapshotTrigger || !onSnapshot) return;

    let cancelled = false;

    const capture = async () => {
      try {
        const map = mapRef.current;
        if (!map) return;

        map.stop();
        map.invalidateSize({ animate: false });

        if (normalizedBounds) {
          map.fitBounds(
            [
              [normalizedBounds.south, normalizedBounds.west],
              [normalizedBounds.north, normalizedBounds.east],
            ],
            {
              animate: false,
              maxZoom: 15,
              padding: [36, 36],
            },
          );
        }

        await new Promise<void>((resolve) => {
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => resolve());
          });
        });
        await new Promise((resolve) => window.setTimeout(resolve, 250));

        if (cancelled) return;

        const dataUrl = await captureLeafletMap(map);

        if (!cancelled) {
          onSnapshot(dataUrl);
        }
      } catch (error) {
        console.error("Failed to capture map preview:", error);

        if (!cancelled) {
          onSnapshot(null);
        }
      }
    };

    void capture();

    return () => {
      cancelled = true;
    };
  }, [normalizedBounds, onSnapshot, snapshotTrigger]);

  return (
    <div
      className={`relative z-0 w-full overflow-hidden ${className} ${heightClassName}`}
      onMouseEnter={() => {
        hoveredRef.current = true;

        if (ctrlDownRef.current) {
          mapRef.current?.scrollWheelZoom.enable();
        } else {
          setShowCtrlNotif(true);
        }
      }}
      onMouseLeave={() => {
        hoveredRef.current = false;
        mapRef.current?.scrollWheelZoom.disable();
        setShowCtrlNotif(false);
      }}
    >
      <MapContainer
        center={center}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom={false}
        className="h-full w-full"
        ref={(mapInstance: L.Map | null) => {
          if (mapInstance) {
            mapRef.current = mapInstance;
          }
        }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          crossOrigin="anonymous"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        <FitBounds
          bounds={normalizedBounds}
          layersLength={layers.length}
          trigger={boundsTrigger}
        />
        <FitSelectedFeatures
          active={hasActiveFeatureSelection}
          bounds={selectedFeatureBounds}
        />
        <ClearSelectionOnMapClick
          onClear={() => {
            setSelectedFeatureKey(null);
            onFeatureSelect?.(null, null);
          }}
        />

        {layers.filter((layer) => !parsedMapConfig.hiddenMapLayerIds.includes(layer.id)).map((layer) =>
          layer.collection.features.map((feature, index) => ({ feature, index })).filter(({ feature }) => shouldShowFeature(feature, layer.id)).map(({ feature, index }) => {
            const geometryType = getGeometryType(feature.geometry);
            const featureKey = `${layer.id}-${feature.id ?? index}`;
            const isSelected = selectedFeatureKey === featureKey;

            if (geometryType === "point" && feature.geometry?.type === "Point") {
              return (
                <MapPoint
                  key={featureKey}
                  feature={feature as Feature<Point, GeoJsonProperties>}
                  legends={layer.legends}
                  mapConfig={parsedMapConfig}
                  layerId={layer.id}
                  selectedLegendFilters={selectedFilters}
                  isSelected={isSelected}
                  onSelect={() => {
                    setSelectedFeatureKey(featureKey);
                    onFeatureSelect?.(layer.id, feature);
                  }}
                  onUnselect={() =>
                    setSelectedFeatureKey((current) =>
                      current === featureKey ? null : current,
                    )
                  }
                />
              );
            }

            return (
              <MapFeature
                key={featureKey}
                feature={feature}
                legends={layer.legends}
                mapConfig={parsedMapConfig}
                layerId={layer.id}
                selectedLegendFilters={selectedFilters}
                isSelected={isSelected}
                onSelect={() => {
                  setSelectedFeatureKey(featureKey);
                  onFeatureSelect?.(layer.id, feature);
                }}
                onUnselect={() =>
                  setSelectedFeatureKey((current) =>
                    current === featureKey ? null : current,
                  )
                }
              />
            );
          }),
        )}
      </MapContainer>

      {showCtrlNotif && (
        <div className="pointer-events-none absolute left-1/2 top-3 z-[1200] hidden h-8 w-100 -translate-x-1/2 items-center justify-center rounded-xl bg-black/40 text-white md:flex">
          <p className="text-sm">
            Tekan <kbd>Ctrl</kbd> + Scroll untuk Zoom
          </p>
        </div>
      )}
    </div>
  );
}

export default memo(MapPreview);
