"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type {
  Feature,
  FeatureCollection,
  GeoJsonProperties,
  Geometry,
} from "geojson";
import { supabase } from "@/lib/supabase/supabaseClient";
import { getUploadTimestamp } from "@/lib/utils/uploadTimestamp";
import {
  collectionToCsv,
  createLegendDrafts,
  getBoundsFromCollection,
  getMapPatternFill,
  getCollectionGeometryType,
  getDefaultGroupField,
  getDefaultPopupFields,
  getDefaultSubGroupField,
  getFeaturePropertyKeys,
  DEFAULT_SELECTED_FEATURE_FILL_OPACITY,
  DEFAULT_SELECTED_FEATURE_COLOR,
  DEFAULT_SELECTED_FEATURE_STROKE_WIDTH,
  DEFAULT_GLOBAL_LEGEND_CONFIG,
  isFeatureCollection,
  parseJsonArray,
  parseMapConfig,
  toSlug,
  type MapAttachment,
  type MapConfig,
  type MapGlobalLegendGeometryType,
  type MapGlobalLegendGroup,
  type MapGlobalLegendItem,
  type MapGlobalLegendMainGroup,
  type MapGlobalLegendStyle,
  type MapGeometryType,
  type MapLayerGroupConfig,
  type MapLegendDraft,
  type MapLink,
  type MapLayerTableConfig,
  type MapPopupField,
} from "@/lib/utils/mapConfig";
import AlertNotif from "../AlertNotif";
import Button from "../Button";
import SpinnerLoading from "../SpinnerLoading";
import MapPreviewDynamic from "./MapPreviewDynamic";
import type { MapLegendItem, MapPreviewLayer } from "./MapPreview";
import {
  Delete,
  DownChevron,
  Draggable,
  LeftChevron,
  Refresh,
  RightChevron,
  UpChevron,
} from "@/public/icons/iconSets";
import AccordionToggleIcon from "../AccordionToggleIcon";
import MapLinks from "./MapLinks";
import {
  DATA_KKPD_OPTIONS,
  DATA_REGENCY_OPTIONS,
  DATA_SUBWPP_OPTIONS,
} from "../configAreaSelector";

const Papa = (await import("papaparse")).default;

type MapDatasetView =
  | "mapadd"
  | "mapdataset"
  | "mapvisualization"
  | "maplegend"
  | "mappreview"
  | "publication";
type PublicationStatus = null | "requested" | "approved" | "rejected" | string;
type EditablePublicationStatus = "requested" | "approved" | "rejected";

type MapDatasetRow = {
  id: string;
  user_id: string | null;
  label: string | null;
  slug: string | null;
  geojson_feature_count?: number | null;
  bounds: { south: number; west: number; north: number; east: number } | null;
  map_config: MapConfig | string | null;
  documents_path: MapAttachment[] | string | null;
  pictures_path: MapAttachment[] | string | null;
  published: PublicationStatus;
  tag: string[] | string | null;
  data_regency: string[] | string | null;
  data_subwpp: string[] | string | null;
  data_kkpd: string[] | string | null;
  description: string | null;
  image_path: string | null;
};

type MapLayerRow = {
  id: string;
  map_dataset_id: string;
  name: string;
  geometry_type: MapGeometryType;
  source_path: string | null;
  feature_count: number;
  property_keys: string[] | null;
  sort_order: number;
};

type MapLegendRow = {
  id: string;
  map_layer_id: string;
  value: string;
  label: string;
  geometry_type: Exclude<MapGeometryType, "mixed">;
  color: string | null;
  fill_color: string | null;
  stroke_color: string | null;
  stroke_width: number | null;
  fill_opacity: number | null;
  fill_pattern: MapLegendDraft["fillPattern"] | null;
  pattern_color: string | null;
  pattern_thickness: number | null;
  pattern_opacity: number | null;
  pattern_gap: number | null;
  icon_path: string | null;
  icon_width: number | null;
  icon_height: number | null;
  visible_by_default: boolean | null;
  sort_order: number;
};

type LoadedMapLayer = MapLayerRow & {
  collection: FeatureCollection | null;
  legends: MapLegendDraft[];
};

type AppliedMapPreview = {
  layers: LoadedMapLayer[];
  mapConfig: MapConfig;
};

type Props = {
  mapDatasetId: string | null;
  ownerId: string | null;
  role: "admin" | "partner" | null;
  view: MapDatasetView;
  action?: "list" | "add" | "edit" | "delete";
  saveData?: number;
  onAddReadyChange?: (ready: boolean) => void;
  onChangeCountChange?: (count: number) => void;
  onSavingChange?: (saving: boolean) => void;
  onVisualizationSaved?: () => void;
  onCreated?: () => void;
};

type PendingGeoJson = {
  file: File;
  collection: FeatureCollection;
  propertyKeys: string[];
  geometryType: MapGeometryType;
  bounds: MapDatasetRow["bounds"];
};

type CsvRawRow = Record<string, unknown>;
type MapConfirmAction = "add-layer" | "edit-layer" | "visualization" | "publication";

type MapVisualizationSnapshot = {
  label: string;
  mapConfig: MapConfig;
  documents: MapAttachment[];
  pictures: MapAttachment[];
  layers: Array<{
    id: string;
    name: string;
    sortOrder: number;
  }>;
  legends: Array<{
    layerId: string;
    value: string;
    label: string;
    color: string;
    fillColor: string;
    strokeColor: string;
    strokeWidth: number;
    fillOpacity: number;
    fillPattern: MapLegendDraft["fillPattern"];
    patternColor: string;
    patternThickness: number;
    patternOpacity: number;
    patternGap: number;
    pointSize: number;
    iconPath?: string | null;
    labelOnly: boolean;
    sortOrder: number;
  }>;
};

type MapPublicationSnapshot = {
  label: string;
  tags: string[];
  dataRegencies: string[];
  dataSubWpp: string[];
  dataKkpd: string[];
  description: string;
  imagePath: string | null;
};

const TAG_OPTIONS = [
  { label: "Konservasi", value: "konservasi" },
  { label: "Ekologi", value: "ekologi" },
  { label: "Sosial", value: "sosial" },
  { label: "Ekonomi", value: "ekonomi" },
  { label: "Lainnya", value: "lainnya" },
];

const MAP_ICON_MAX_SIZE_BYTES = 512 * 1024;
const FILL_PATTERN_OPTIONS: Array<{ value: MapLegendDraft["fillPattern"]; label: string }> = [
  { value: "none", label: "Tanpa Pattern" },
  { value: "diagonal", label: "Diagonal" },
  { value: "reverse-diagonal", label: "Diagonal Terbalik" },
  { value: "crosshatch", label: "Crosshatch" },
  { value: "horizontal", label: "Horizontal" },
  { value: "vertical", label: "Vertikal" },
  { value: "dots", label: "Titik" },
];
const MAP_ICON_MAX_SIZE_LABEL = "512 KB";

type BufferedStyleInput = HTMLInputElement & {
  styleUpdateTimer?: number;
  pendingStyleUpdate?: () => void;
};

function flushBufferedStyleUpdate(input: BufferedStyleInput) {
  if (input.styleUpdateTimer) window.clearTimeout(input.styleUpdateTimer);

  const pendingUpdate = input.pendingStyleUpdate;
  input.styleUpdateTimer = undefined;
  input.pendingStyleUpdate = undefined;
  pendingUpdate?.();
}

function scheduleBufferedStyleUpdate(
  input: BufferedStyleInput,
  update: () => void,
) {
  if (input.styleUpdateTimer) window.clearTimeout(input.styleUpdateTimer);

  input.pendingStyleUpdate = update;
  input.styleUpdateTimer = window.setTimeout(
    () => flushBufferedStyleUpdate(input),
    250,
  );
}

function BufferedRangeControl({
  label,
  value,
  min,
  max,
  step,
  formatValue,
  onCommit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  formatValue: (value: number) => string;
  onCommit: (value: number) => void;
}) {
  const [draftValue, setDraftValue] = useState(value);
  const commitTimerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (commitTimerRef.current) {
        window.clearTimeout(commitTimerRef.current);
      }
    },
    [],
  );

  const scheduleCommit = (nextValue: number) => {
    if (commitTimerRef.current) {
      window.clearTimeout(commitTimerRef.current);
    }

    commitTimerRef.current = window.setTimeout(() => {
      commitTimerRef.current = null;
      onCommit(nextValue);
    }, 250);
  };

  return (
    <label className="flex min-w-0 grow flex-col gap-2 text-sm">
      <span className="flex items-center justify-between gap-3">
        {label}
        <span className="text-xs text-stone-500">
          {formatValue(draftValue)}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={draftValue}
        onChange={(event) => setDraftValue(Number(event.target.value))}
        onPointerUp={(event) => scheduleCommit(Number(event.currentTarget.value))}
        onPointerCancel={(event) =>
          scheduleCommit(Number(event.currentTarget.value))
        }
        onKeyUp={(event) => scheduleCommit(Number(event.currentTarget.value))}
        onBlur={(event) => scheduleCommit(Number(event.currentTarget.value))}
        className="w-full accent-sky-800"
      />
    </label>
  );
}

function DeferredCheckbox({
  checked,
  onCommit,
  className,
  ariaLabel,
}: {
  checked: boolean;
  onCommit: (checked: boolean) => void;
  className?: string;
  ariaLabel?: string;
}) {
  const [draftChecked, setDraftChecked] = useState(checked);
  const commitTimerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (commitTimerRef.current) {
        window.clearTimeout(commitTimerRef.current);
      }
    },
    [],
  );

  return (
    <input
      type="checkbox"
      checked={draftChecked}
      onChange={(event) => {
        const nextChecked = event.target.checked;
        setDraftChecked(nextChecked);

        if (commitTimerRef.current) {
          window.clearTimeout(commitTimerRef.current);
        }

        commitTimerRef.current = window.setTimeout(() => {
          commitTimerRef.current = null;
          onCommit(nextChecked);
        }, 50);
      }}
      className={className}
      aria-label={ariaLabel}
    />
  );
}

function DeferredColumnDropdown({
  columns,
  selectedColumns,
  onToggleColumn,
}: {
  columns: string[];
  selectedColumns: string[];
  onToggleColumn: (column: string, checked: boolean) => void;
}) {
  const [showOptions, setShowOptions] = useState(false);
  const optionTimerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (optionTimerRef.current) window.clearTimeout(optionTimerRef.current);
    },
    [],
  );

  return (
    <details
      data-field-dropdown="true"
      className="flex min-w-48 grow flex-col gap-2 text-sm"
      onToggle={(event) => {
        if (optionTimerRef.current) {
          window.clearTimeout(optionTimerRef.current);
        }

        if (!event.currentTarget.open) {
          setShowOptions(false);
          return;
        }

        window.requestAnimationFrame(() => {
          optionTimerRef.current = window.setTimeout(() => {
            optionTimerRef.current = null;
            setShowOptions(true);
          }, 0);
        });
      }}
    >
      <summary className="flex h-10 cursor-pointer list-none items-center justify-between rounded-md border border-stone-300 px-3 py-2">
        <span>
          {selectedColumns.length > 0
            ? `${selectedColumns.length} kolom dipilih`
            : "Pilih Kolom"}
        </span>
      </summary>

      {showOptions && (
        <div className="mt-2 flex max-h-60 flex-col gap-2 overflow-auto rounded-md border border-stone-200 p-3">
          {columns.map((column) => {
            const checked = selectedColumns.includes(column);

            return (
              <label key={column} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) =>
                    onToggleColumn(column, event.target.checked)
                  }
                  aria-label={column}
                />
                {column}
              </label>
            );
          })}
        </div>
      )}
    </details>
  );
}

function ImmediateAccordionButton({
  open,
  targetId,
  label,
  onCommit,
}: {
  open: boolean;
  targetId: string;
  label: string;
  onCommit: (open: boolean) => void;
}) {
  const [draftOpen, setDraftOpen] = useState(open);
  const commitTimerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (commitTimerRef.current) window.clearTimeout(commitTimerRef.current);
    },
    [],
  );

  return (
    <button
      type="button"
      onClick={() => {
        const nextOpen = !draftOpen;
        const target = document.getElementById(targetId);

        setDraftOpen(nextOpen);
        target?.classList.toggle("invisible", !nextOpen);
        target?.classList.toggle("h-0", !nextOpen);
        target?.classList.toggle("pointer-events-none", !nextOpen);
        target?.classList.toggle("visible", nextOpen);

        if (commitTimerRef.current) {
          window.clearTimeout(commitTimerRef.current);
        }

        commitTimerRef.current = window.setTimeout(() => {
          commitTimerRef.current = null;
          onCommit(nextOpen);
        }, 50);
      }}
      className="flex w-full items-center justify-between gap-3 text-left text-sm font-semibold"
      aria-expanded={draftOpen}
      aria-controls={targetId}
    >
      <span>{label}</span>
      <AccordionToggleIcon open={draftOpen} size="sm" />
    </button>
  );
}

function PatternControls({
  pattern,
  color,
  thickness,
  opacity,
  gap,
  onCommit,
}: {
  pattern: MapLegendDraft["fillPattern"];
  color: string;
  thickness: number;
  opacity: number;
  gap: number;
  onCommit: (changes: Partial<MapGlobalLegendStyle>) => void;
}) {
  const [draft, setDraft] = useState({ pattern, color, thickness, opacity, gap });
  const commitTimerRef = useRef<number | null>(null);
  const pendingChangesRef = useRef<Partial<MapGlobalLegendStyle>>({});

  useEffect(() => setDraft({ pattern, color, thickness, opacity, gap }), [color, gap, opacity, pattern, thickness]);
  useEffect(() => () => {
    if (commitTimerRef.current) window.clearTimeout(commitTimerRef.current);
  }, []);

  const updateDraft = (changes: Partial<typeof draft>) => {
    setDraft((current) => ({ ...current, ...changes }));
    const mapped: Partial<MapGlobalLegendStyle> = {};
    if (changes.pattern !== undefined) mapped.fillPattern = changes.pattern;
    if (changes.color !== undefined) mapped.patternColor = changes.color;
    if (changes.thickness !== undefined) mapped.patternThickness = changes.thickness;
    if (changes.opacity !== undefined) mapped.patternOpacity = changes.opacity;
    if (changes.gap !== undefined) mapped.patternGap = changes.gap;
    pendingChangesRef.current = { ...pendingChangesRef.current, ...mapped };
    if (commitTimerRef.current) window.clearTimeout(commitTimerRef.current);
    commitTimerRef.current = window.setTimeout(() => {
      commitTimerRef.current = null;
      onCommit(pendingChangesRef.current);
      pendingChangesRef.current = {};
    }, 250);
  };

  return (
    <>
      <label className="flex items-center gap-2 text-sm text-stone-700">
        <input
          type="checkbox"
          checked={draft.pattern !== "none"}
          onChange={(event) => updateDraft({ pattern: event.target.checked ? "diagonal" : "none" })}
          className="h-4 w-4"
        />
        Pattern
      </label>
      {draft.pattern !== "none" && (
        <>
          <div className="flex min-w-0 flex-row flex-wrap gap-2 [&>*]:min-w-40">
            <select
              aria-label="Jenis Pattern"
              value={draft.pattern}
              onChange={(event) => updateDraft({ pattern: event.target.value as MapLegendDraft["fillPattern"] })}
              className="h-10 min-w-0 flex-1 rounded-md border border-stone-300 bg-white px-3 text-sm font-medium text-stone-700"
            >
                {FILL_PATTERN_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <label className="flex h-10 min-w-0 flex-1 cursor-pointer items-center justify-center rounded-md border border-stone-300 bg-white px-3 text-sm font-medium text-stone-700">
                <span className="mr-2 h-4 w-4 rounded border border-stone-300" style={{ backgroundColor: draft.color }} />
                Warna Pattern
              <input type="color" value={draft.color} onChange={(event) => updateDraft({ color: event.target.value })} className="sr-only" />
            </label>
          </div>
          <label className="flex min-w-0 grow flex-col gap-2 text-sm"><span className="flex items-center justify-between gap-3">Ketebalan Pattern<span className="text-xs text-stone-500">{draft.thickness}px</span></span><input type="range" min="0.5" max="6" step="0.25" value={draft.thickness} onChange={(event) => updateDraft({ thickness: Number(event.target.value) })} className="w-full accent-sky-800" /></label>
          <label className="flex min-w-0 grow flex-col gap-2 text-sm"><span className="flex items-center justify-between gap-3">Transparansi Pattern<span className="text-xs text-stone-500">{Math.round((1 - draft.opacity) * 100)}%</span></span><input type="range" min="0" max="1" step="0.05" value={1 - draft.opacity} onChange={(event) => updateDraft({ opacity: 1 - Number(event.target.value) })} className="w-full accent-sky-800" /></label>
          <label className="flex min-w-0 grow flex-col gap-2 text-sm"><span className="flex items-center justify-between gap-3">Jarak Pattern<span className="text-xs text-stone-500">{draft.gap}px</span></span><input type="range" min="4" max="24" step="1" value={draft.gap} onChange={(event) => updateDraft({ gap: Number(event.target.value) })} className="w-full accent-sky-800" /></label>
        </>
      )}
    </>
  );
}

function getDraftExpiryDate() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  return expiresAt.toISOString();
}

function isTemporaryDraftTitle(value: string) {
  return value.trim().toLowerCase() === "draft";
}

function mergeBounds(
  current: MapDatasetRow["bounds"],
  next: MapDatasetRow["bounds"],
) {
  if (!current) return next;
  if (!next) return current;

  return {
    south: Math.min(current.south, next.south),
    west: Math.min(current.west, next.west),
    north: Math.max(current.north, next.north),
    east: Math.max(current.east, next.east),
  };
}

function getFileExtension(file: File) {
  return file.name.split(".").pop()?.toLowerCase() || "bin";
}

function getGeoJsonContentType(file: File) {
  const extension = getFileExtension(file);

  if (extension === "json") return "application/json";

  return "application/geo+json";
}

async function createGeoJsonUploadBlob(file: File) {
  return new Blob([await file.arrayBuffer()], {
    type: getGeoJsonContentType(file),
  });
}

async function uploadGeoJson(
  path: string,
  file: Blob,
  options?: {
    mapDatasetId: string;
    permission: "add" | "edit";
  },
) {
  const upload = (accessToken: string) => {
    const formData = new FormData();
    formData.set("path", path);
    formData.set(
      "file",
      file,
      path.split("/").pop() || "map.geojson",
    );
    if (options) {
      formData.set("mapDatasetId", options.mapDatasetId);
      formData.set("permission", options.permission);
    }

    return fetch("/api/map-files", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });
  };

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Sesi login telah berakhir. Silakan masuk kembali.");
  }

  let response = await upload(session.access_token);

  // A long-running map edit can outlive the cached access token. Refresh it
  // once before treating the upload as an unauthenticated request.
  if (response.status === 401) {
    const {
      data: { session: refreshedSession },
      error: refreshError,
    } = await supabase.auth.refreshSession();

    if (refreshError || !refreshedSession?.access_token) {
      throw new Error("Sesi login telah berakhir. Silakan masuk kembali.");
    }

    response = await upload(refreshedSession.access_token);
  }

  const result = (await response.json().catch(() => null)) as {
    message?: string;
  } | null;

  if (!response.ok) {
    throw new Error(
      response.status === 401
        ? "Sesi login telah berakhir. Silakan masuk kembali."
        : result?.message || "Gagal mengunggah data peta.",
    );
  }
}

function getPublicImageUrl(path: string | null) {
  if (!path) return "";

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const { data } = supabase.storage.from("images").getPublicUrl(path);
  return data.publicUrl;
}

function dataUrlToBlob(dataUrl: string) {
  const separatorIndex = dataUrl.indexOf(",");

  if (separatorIndex < 0) {
    throw new Error("Format snapshot tidak valid.");
  }

  const metadata = dataUrl.slice(0, separatorIndex);
  const encodedData = dataUrl.slice(separatorIndex + 1);
  const mimeType = metadata.match(/^data:([^;,]+)/)?.[1] ?? "image/png";
  const binary = metadata.includes(";base64")
    ? window.atob(encodedData)
    : decodeURIComponent(encodedData);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mimeType });
}

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function readGeoJsonFile(file: File) {
  const text = await file.text();
  const parsed = JSON.parse(text) as unknown;

  if (!isFeatureCollection(parsed)) {
    throw new Error("File harus berupa GeoJSON FeatureCollection.");
  }

  return parsed;
}

function isCsvFile(file: File) {
  return (
    file.name.toLowerCase().endsWith(".csv") &&
    (!file.type ||
      ["text/csv", "application/vnd.ms-excel", "text/plain"].includes(
        file.type,
      ))
  );
}

function getValidCsvRows(rows: CsvRawRow[]) {
  return rows.filter((row) =>
    Object.values(row).some(
      (value) => value !== undefined && value !== null && String(value).trim(),
    ),
  );
}

function getCsvColumns(rows: CsvRawRow[]) {
  return Array.from(
    rows.reduce<Set<string>>((set, row) => {
      Object.keys(row).forEach((key) => {
        if (key.trim()) set.add(key);
      });

      return set;
    }, new Set()),
  );
}

function parseCoordinateValue(value: unknown) {
  const text = String(value ?? "").trim();
  const normalized =
    text.includes(",") && !text.includes(".")
      ? text.replace(",", ".")
      : text.replace(/,/g, "");

  if (!normalized) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function isValidLatitude(value: unknown) {
  const parsed = parseCoordinateValue(value);
  return parsed !== null && parsed >= -90 && parsed <= 90;
}

function isValidLongitude(value: unknown) {
  const parsed = parseCoordinateValue(value);
  return parsed !== null && parsed >= -180 && parsed <= 180;
}

function getGeometryLabel(type: MapGeometryType) {
  if (type === "polygon") return "Polygon";
  if (type === "polyline") return "Polyline";
  if (type === "point") return "Point";

  return "Mixed";
}

function getCoordinateColumnStats(
  rows: CsvRawRow[],
  column: string,
  validator: (value: unknown) => boolean,
) {
  if (!column || rows.length === 0) {
    return {
      validRows: 0,
      invalidRows: 0,
      hasFatalError: false,
    };
  }

  const validRows = rows.filter((row) => validator(row[column])).length;

  return {
    validRows,
    invalidRows: rows.length - validRows,
    hasFatalError: validRows === 0,
  };
}

function getRowsWithValidCoordinates(
  rows: CsvRawRow[],
  latitudeColumn: string,
  longitudeColumn: string,
) {
  return rows.filter(
    (row) =>
      isValidLatitude(row[latitudeColumn]) &&
      isValidLongitude(row[longitudeColumn]),
  );
}

function csvToPointCollection(
  rows: CsvRawRow[],
  latitudeColumn: string,
  longitudeColumn: string,
): FeatureCollection {
  const validRows = getRowsWithValidCoordinates(
    rows,
    latitudeColumn,
    longitudeColumn,
  );

  return {
    type: "FeatureCollection",
    features: validRows.map((row) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [
          parseCoordinateValue(row[longitudeColumn]) ?? 0,
          parseCoordinateValue(row[latitudeColumn]) ?? 0,
        ],
      },
      properties: { ...row },
    })),
  };
}

function createGeoJsonFileFromCsv(
  csvFile: File,
  collection: FeatureCollection,
) {
  const baseName = csvFile.name.replace(/\.[^.]+$/, "");
  const blob = new Blob([JSON.stringify(collection)], {
    type: "application/geo+json",
  });

  return new File([blob], `${baseName}.geojson`, {
    type: "application/geo+json",
  });
}

async function loadGeoJsonFromStorage(path: string | null) {
  if (!path) return null;

  const { data, error } = await supabase.storage.from("geojsons").download(path);

  if (error) throw error;

  const parsed = JSON.parse(await data.text()) as unknown;

  return isFeatureCollection(parsed) ? parsed : null;
}

function getSelectedLegendFields(config: MapLayerGroupConfig) {
  if (config.legendItemMode === "none") {
    return [];
  }

  if (config.legendItemMode === "columns") {
    return config.columnLegendFields;
  }

  if (config.legendItemMode === "both") {
    return [
      ...(config.useMainGroup ? [config.mainGroupField] : []),
      ...(config.useSubGroup ? [config.subGroupField] : []),
      ...config.columnLegendFields,
    ].filter(Boolean);
  }

  return [
    ...(config.useMainGroup ? [config.mainGroupField] : []),
    ...(config.useSubGroup ? [config.subGroupField] : []),
  ].filter(Boolean);
}

function createDefaultLayerGroupConfig(keys: string[]): MapLayerGroupConfig {
  const mainGroupField = getDefaultGroupField(keys);
  const subGroupField = getDefaultSubGroupField(keys, mainGroupField);

  return {
    legendItemMode: "none",
    mainGroupField,
    subGroupField,
    useMainGroup: false,
    useSubGroup: false,
    columnLegendFields: [],
    mainGroupAliases: {},
    legendItemSources: {},
    legendItemMainValues: {},
  };
}

function getLayerGroupConfig(
  mapConfig: MapConfig,
  layer: Pick<LoadedMapLayer, "id" | "property_keys">,
): MapLayerGroupConfig {
  return (
    mapConfig.layerGroupConfigs[layer.id] ?? {
      mainGroupField:
        mapConfig.mainGroupField ||
        createDefaultLayerGroupConfig(layer.property_keys ?? []).mainGroupField,
      subGroupField:
        mapConfig.subGroupField ||
        createDefaultLayerGroupConfig(layer.property_keys ?? []).subGroupField,
      useMainGroup: true,
      useSubGroup: mapConfig.useSubGroup,
      legendItemMode: "rows",
      columnLegendFields: [],
      mainGroupAliases: {},
      legendItemSources: {},
      legendItemMainValues: {},
    }
  );
}

function getLayerTableConfig(
  mapConfig: MapConfig,
  layer: Pick<LoadedMapLayer, "id" | "property_keys">,
): MapLayerTableConfig {
  const keys = layer.property_keys ?? [];
  const selectorField =
    keys.find((key) => ["name", "nama"].includes(key.trim().toLowerCase())) ??
    keys[0] ??
    "";
  const metadataFields = new Set([
    "no",
    "type",
    "tipe",
    "level",
    "name",
    "nama",
    "lat",
    "latitude",
    "lon",
    "lng",
    "longitude",
    "desc",
    "description",
    "deskripsi",
  ]);
  const selectedFields = keys.filter((key) => {
    const normalized = key.trim().toLowerCase();

    return (
      !metadataFields.has(normalized) &&
      !normalized.startsWith("unnamed:")
    );
  });

  const savedConfig = mapConfig.layerTableConfigs[layer.id];

  if (savedConfig) {
    const usedInitialAllFieldsDefault =
      savedConfig.selectedFields.length === keys.length &&
      keys.every((key) => savedConfig.selectedFields.includes(key));
    const usedInitialFirstKeySelector =
      Boolean(keys[0]) && savedConfig.selectorField === keys[0];

    return {
      ...savedConfig,
      selectorField: usedInitialFirstKeySelector
        ? selectorField
        : savedConfig.selectorField,
      selectedFields: usedInitialAllFieldsDefault
        ? selectedFields
        : savedConfig.selectedFields,
    };
  }

  return {
      enabled: false,
      mode: "rows",
      dataLabel: "Data",
      valueLabel: "Nilai",
      dataField: keys[0] ?? "",
      valueField: keys[1] ?? keys[0] ?? "",
      selectorField,
      selectedFields,
  };
}

function getCompositeLegendValue(mainValue: string, subValue: string) {
  return `${mainValue}|||${subValue}`;
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

function getLegendDisplayValue(value: string) {
  return value.includes("|||") ? value.split("|||").at(-1) || value : value;
}

function getFeatureTextValue(feature: FeatureCollection["features"][number], field: string) {
  return String(feature.properties?.[field] ?? "").trim();
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

function getLegendItemMode(useRows: boolean, useColumns: boolean) {
  if (useRows && useColumns) return "both";
  if (useColumns) return "columns";
  if (useRows) return "rows";
  return "none";
}

function getColumnLegendDrafts(
  collection: FeatureCollection,
  config: MapLayerGroupConfig,
) {
  const geometryType = collection.features.reduce<
    Exclude<MapGeometryType, "mixed"> | null
  >((result, feature) => {
    if (result) return result;

    const featureGeometryType = getCollectionGeometryType({
      type: "FeatureCollection",
      features: [feature],
    });

    return featureGeometryType === "mixed" ? null : featureGeometryType;
  }, null);

  const legends: MapLegendDraft[] = config.columnLegendFields
    .filter(Boolean)
    .map((field, index) => {
      const baseLegend = createLegendDrafts(
        {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry:
                geometryType === "point"
                  ? { type: "Point", coordinates: [0, 0] }
                  : geometryType === "polyline"
                    ? { type: "LineString", coordinates: [[0, 0], [1, 1]] }
                    : {
                        type: "Polygon",
                        coordinates: [
                          [
                            [0, 0],
                            [1, 0],
                            [1, 1],
                            [0, 0],
                          ],
                        ],
                      },
              properties: { value: field },
            },
          ],
        },
        ["value"],
      )[0];

      return {
        ...(baseLegend as MapLegendDraft),
        value: field,
        label: field,
        sortOrder: index,
      };
    });

  return {
    legends,
    legendItemSources: legends.reduce<Record<string, "main" | "sub">>(
      (acc, legend) => {
        acc[legend.value] = "main";
        return acc;
      },
      {},
    ),
    legendItemMainValues: legends.reduce<Record<string, string>>(
      (acc, legend) => {
        acc[legend.value] = "Kolom";
        return acc;
      },
      {},
    ),
  };
}

function getRowLegendDrafts(
  collection: FeatureCollection,
  config: MapLayerGroupConfig,
) {
  const valueMap = new Map<
    string,
    {
      label: string;
      mainValue: string;
      geometryType: Exclude<MapGeometryType, "mixed">;
    }
  >();

  collection.features.forEach((feature) => {
    const geometryType = getCollectionGeometryType({
      type: "FeatureCollection",
      features: [feature],
    });

    if (geometryType === "mixed") return;

    if (config.useMainGroup && config.mainGroupField) {
      const mainValue = getFeatureTextValue(feature, config.mainGroupField);
      const value = mainValue ? getRowLegendValue("main", mainValue) : "";

      if (value && !valueMap.has(value)) {
        valueMap.set(value, {
          label: mainValue,
          mainValue,
          geometryType,
        });
      }
    }

    if (config.useSubGroup && config.subGroupField) {
      const subValue = getFeatureTextValue(feature, config.subGroupField);
      const value = subValue ? getRowLegendValue("sub", subValue) : "";

      if (value && !valueMap.has(value)) {
        valueMap.set(value, {
          label: subValue,
          mainValue: subValue,
          geometryType,
        });
      }
    }
  });

  const legends: MapLegendDraft[] = Array.from(valueMap.entries())
    .sort(([, a], [, b]) => {
      const mainCompare = a.mainValue.localeCompare(b.mainValue);
      return mainCompare !== 0 ? mainCompare : a.label.localeCompare(b.label);
    })
    .map(([value, item], index) => {
      const baseLegend = createLegendDrafts(
        {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry:
                item.geometryType === "point"
                  ? { type: "Point", coordinates: [0, 0] }
                  : item.geometryType === "polyline"
                    ? { type: "LineString", coordinates: [[0, 0], [1, 1]] }
                    : {
                        type: "Polygon",
                        coordinates: [
                          [
                            [0, 0],
                            [1, 0],
                            [1, 1],
                            [0, 0],
                          ],
                        ],
                      },
              properties: { value },
            },
          ],
        },
        ["value"],
      )[0];

      return {
        ...(baseLegend as MapLegendDraft),
        value,
        label: item.label,
        sortOrder: index,
      };
    });

  return {
    legends,
    legendItemSources: legends.reduce<Record<string, "main" | "sub">>(
      (acc, legend) => {
        acc[legend.value] = parseRowLegendValue(legend.value).source === "sub"
          ? "sub"
          : "main";
        return acc;
      },
      {},
    ),
    legendItemMainValues: Array.from(valueMap.entries()).reduce<
      Record<string, string>
    >((acc, [value, item]) => {
      acc[value] = item.mainValue;
      return acc;
    }, {}),
  };
}

function createLayerLegendDrafts(
  collection: FeatureCollection,
  config: MapLayerGroupConfig,
) {
  if (config.legendItemMode === "none") {
    return {
      legends: [],
      legendItemSources: {},
      legendItemMainValues: {},
    };
  }

  if (config.legendItemMode === "columns") {
    return getColumnLegendDrafts(collection, config);
  }

  if (config.legendItemMode === "both") {
    const rowDraft = getRowLegendDrafts(collection, config);
    const columnDraft = getColumnLegendDrafts(collection, config);
    const legends = [
      ...rowDraft.legends,
      ...columnDraft.legends.map((legend, index) => ({
        ...legend,
        sortOrder: rowDraft.legends.length + index,
      })),
    ];

    return {
      legends,
      legendItemSources: {
        ...rowDraft.legendItemSources,
        ...columnDraft.legendItemSources,
      },
      legendItemMainValues: {
        ...rowDraft.legendItemMainValues,
        ...columnDraft.legendItemMainValues,
      },
    };
  }

  return getRowLegendDrafts(collection, config);
}

function getStoredLegendMainValue(
  legend: MapLegendDraft,
  config: MapLayerGroupConfig,
) {
  const parsedValue = parseRowLegendValue(legend.value);

  if (parsedValue.source !== "column") return parsedValue.rawValue;

  return (
    config.legendItemMainValues[legend.value] ||
    (legend.value.includes("|||")
      ? legend.value.split("|||")[0] || legend.value
      : legend.value)
  );
}

function getMainGroupLabel(config: MapLayerGroupConfig, mainValue: string) {
  return config.mainGroupAliases[mainValue] ?? mainValue;
}

function getMainGroupAliasesWithDefaults(
  config: MapLayerGroupConfig,
  draft: ReturnType<typeof createLayerLegendDrafts>,
) {
  const nextAliases = { ...config.mainGroupAliases };

  Object.entries(draft.legendItemSources).forEach(([value, source]) => {
    const isColumnLegend = config.columnLegendFields.includes(value);

    if (isColumnLegend || source !== "main") return;

    const mainValue =
      draft.legendItemMainValues[value] ||
      (value.includes("|||") ? value.split("|||")[0] || value : value);

    if (nextAliases[mainValue] === undefined) {
      nextAliases[mainValue] = mainValue;
    }
  });

  return nextAliases;
}

function mergeLegendStyle(
  draft: MapLegendDraft,
  existing?: MapLegendDraft,
  options: { preserveLabel?: boolean } = {},
): MapLegendDraft {
  if (!existing) return draft;

  return {
    ...draft,
    label: options.preserveLabel ? existing.label : draft.label,
    labelOnly: Boolean(existing.labelOnly),
    color: existing.color,
    fillColor: existing.fillColor,
    strokeColor: existing.strokeColor,
    strokeWidth: existing.strokeWidth,
    fillOpacity: existing.fillOpacity,
    fillPattern: existing.fillPattern,
    patternColor: existing.patternColor,
    patternThickness: existing.patternThickness,
    patternOpacity: existing.patternOpacity,
    patternGap: existing.patternGap,
    pointSize: existing.pointSize,
    iconPath: existing.iconPath,
    sortOrder: existing.sortOrder,
  };
}

function getEffectiveLayerLegends(
  layer: LoadedMapLayer,
  mapConfig: MapConfig,
) {
  if (!layer.collection) return layer.legends;

  const groupConfig = getLayerGroupConfig(mapConfig, layer);
  const draft = createLayerLegendDrafts(layer.collection, groupConfig);

  return draft.legends.map((legend) => {
    const legendSource =
      groupConfig.legendItemSources[legend.value] ??
      (groupConfig.useSubGroup ? "sub" : "main");
    const mainValue =
      draft.legendItemMainValues[legend.value] ||
      getStoredLegendMainValue(legend, groupConfig);
    const legendWithConfiguredLabel =
      !groupConfig.columnLegendFields.includes(legend.value) &&
      legendSource === "main"
        ? {
            ...legend,
            label: getMainGroupLabel(groupConfig, mainValue),
          }
        : legend;
    const exactExisting = layer.legends.find(
      (item) => item.value === legend.value,
    );
    const isColumnLegend = groupConfig.columnLegendFields.includes(legend.value);
    const preserveExactLabel = groupConfig.useSubGroup || isColumnLegend;
    const mainGroupExisting =
      !groupConfig.useSubGroup && groupConfig.legendItemMode !== "columns"
        ? layer.legends.find(
            (item) => getStoredLegendMainValue(item, groupConfig) === legend.value,
          )
        : undefined;

    return mergeLegendStyle(
      legendWithConfiguredLabel,
      exactExisting ?? mainGroupExisting,
      {
      preserveLabel: preserveExactLabel && Boolean(exactExisting),
      },
    );
  }).sort((a, b) => a.sortOrder - b.sortOrder);
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createDefaultGlobalLegendStyle(
  geometryType: MapGlobalLegendGeometryType,
  index: number,
): MapGlobalLegendStyle {
  const colors = [
    "#0EA5E9",
    "#22C55E",
    "#F59E0B",
    "#EF4444",
    "#8B5CF6",
    "#14B8A6",
    "#F97316",
    "#64748B",
  ];
  const color = colors[index % colors.length] ?? "#0EA5E9";

  return {
    color,
    fillColor: color,
    strokeColor: color,
    strokeWidth: geometryType === "polyline" ? 3 : 2,
    fillOpacity: geometryType === "polyline" ? 0 : 0.65,
    fillPattern: "none",
    patternColor: color,
    patternThickness: 1.25,
    patternOpacity: 1,
    patternGap: 8,
    pointSize: geometryType === "point" ? 16 : 0,
    iconPath: null,
  };
}

function getEmptyGlobalLegendGeometryConfig() {
  return {
    mainGroups: [] as MapGlobalLegendMainGroup[],
    items: [] as MapGlobalLegendItem[],
  };
}

function getGlobalLegendGeometryConfig(
  group: MapGlobalLegendGroup,
  geometryType: MapGlobalLegendGeometryType,
) {
  return group.geometries[geometryType] ?? getEmptyGlobalLegendGeometryConfig();
}

function getLayerGeometryType(
  layer: Pick<LoadedMapLayer, "geometry_type" | "collection">,
): MapGlobalLegendGeometryType | null {
  if (layer.geometry_type !== "mixed") return layer.geometry_type;
  if (!layer.collection) return null;

  const geometryType = getCollectionGeometryType(layer.collection);

  return geometryType === "mixed" ? null : geometryType;
}

function getLayerSourceName(layer: Pick<LoadedMapLayer, "name" | "source_path">) {
  const sourceName = layer.source_path?.split("/").pop();

  return sourceName ? decodeURIComponent(sourceName) : layer.name;
}

function buildVisualizationSnapshot(
  label: string,
  mapConfig: MapConfig,
  documents: MapAttachment[],
  pictures: MapAttachment[],
  layers: LoadedMapLayer[],
): MapVisualizationSnapshot {
  return {
    label,
    mapConfig,
    documents,
    pictures,
    layers: layers.map((layer) => ({
      id: layer.id,
      name: layer.name,
      sortOrder: layer.sort_order,
    })),
    legends: layers.flatMap((layer) =>
      getEffectiveLayerLegends(layer, mapConfig).map((legend) => ({
        layerId: layer.id,
        value: legend.value,
        label: legend.label,
        color: legend.color,
        fillColor: legend.fillColor,
        strokeColor: legend.strokeColor,
        strokeWidth: legend.strokeWidth,
        fillOpacity: legend.fillOpacity,
        fillPattern: legend.fillPattern,
        patternColor: legend.patternColor,
        patternThickness: legend.patternThickness,
        patternOpacity: legend.patternOpacity,
        patternGap: legend.patternGap,
        pointSize: legend.pointSize,
        iconPath: legend.iconPath,
        labelOnly: legend.labelOnly,
        sortOrder: legend.sortOrder,
      })),
    ),
  };
}

function countVisualizationChanges(
  current: MapVisualizationSnapshot,
  original: MapVisualizationSnapshot | null,
) {
  if (!original) return 0;

  const countChanges = (currentValue: unknown, originalValue: unknown): number => {
    if (JSON.stringify(currentValue) === JSON.stringify(originalValue)) return 0;

    if (Array.isArray(currentValue) && Array.isArray(originalValue)) {
      const sharedLength = Math.min(currentValue.length, originalValue.length);
      let count = Math.abs(currentValue.length - originalValue.length);

      for (let index = 0; index < sharedLength; index += 1) {
        count += countChanges(currentValue[index], originalValue[index]);
      }

      return count;
    }

    if (
      typeof currentValue === "object" &&
      currentValue !== null &&
      typeof originalValue === "object" &&
      originalValue !== null
    ) {
      const currentRecord = currentValue as Record<string, unknown>;
      const originalRecord = originalValue as Record<string, unknown>;
      const keys = new Set([
        ...Object.keys(currentRecord),
        ...Object.keys(originalRecord),
      ]);

      return [...keys].reduce(
        (count, key) =>
          count + countChanges(currentRecord[key], originalRecord[key]),
        0,
      );
    }

    return 1;
  };

  return countChanges(current, original);
}

function buildPublicationSnapshot(
  label: string,
  tags: string[],
  dataRegencies: string[],
  dataSubWpp: string[],
  dataKkpd: string[],
  description: string,
  imagePath: string | null,
): MapPublicationSnapshot {
  return {
    label: label.trim(),
    tags: [...tags].sort((a, b) => a.localeCompare(b)),
    dataRegencies: [...dataRegencies].sort((a, b) => a.localeCompare(b)),
    dataSubWpp: [...dataSubWpp].sort((a, b) => a.localeCompare(b)),
    dataKkpd: [...dataKkpd].sort((a, b) => a.localeCompare(b)),
    description: description.trim(),
    imagePath,
  };
}

function countPublicationChanges(
  current: MapPublicationSnapshot,
  original: MapPublicationSnapshot | null,
  hasPendingImageFile: boolean,
) {
  const imageFileChangeCount = hasPendingImageFile ? 1 : 0;

  if (!original) return imageFileChangeCount;

  const fieldChangeCount = (
    Object.keys(current) as Array<keyof MapPublicationSnapshot>
  ).filter(
    (key) => JSON.stringify(current[key]) !== JSON.stringify(original[key]),
  ).length;

  return fieldChangeCount + imageFileChangeCount;
}

export default function MapDataset({
  mapDatasetId,
  ownerId,
  role,
  view,
  action = "list",
  saveData = 0,
  onAddReadyChange,
  onChangeCountChange,
  onSavingChange,
  onVisualizationSaved,
  onCreated,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const geojsonInputRef = useRef<HTMLInputElement | null>(null);
  const csvInputRef = useRef<HTMLInputElement | null>(null);
  const publicationImageInputRef = useRef<HTMLInputElement | null>(null);
  const publicationSnapshotResolverRef = useRef<
    ((dataUrl: string | null) => void) | null
  >(null);
  const legendSectionRef = useRef<HTMLElement | null>(null);
  const tableSectionRef = useRef<HTMLElement | null>(null);
  const popupSectionRef = useRef<HTMLElement | null>(null);
  const linkSectionRef = useRef<HTMLElement | null>(null);
  const pendingMapConfigScrollRef = useRef<
    "legend" | "table" | "popup" | "link" | null
  >(null);
  const lastHandledSave = useRef(saveData);
  const mountedRef = useRef(false);
  const layerNameUpdateTimersRef = useRef<Map<string, number>>(new Map());

  const [loading, setLoading] = useState(Boolean(mapDatasetId));
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<"none" | "success" | "failed" | "invalid">(
    "none",
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    onSavingChange?.(saving);
  }, [onSavingChange, saving]);

  const [dataset, setDataset] = useState<MapDatasetRow | null>(null);
  const [layers, setLayers] = useState<LoadedMapLayer[]>([]);
  const [appliedMapPreview, setAppliedMapPreview] =
    useState<AppliedMapPreview | null>(null);
  const [label, setLabel] = useState("");
  const [mapConfig, setMapConfig] = useState<MapConfig>(() =>
    parseMapConfig(null),
  );
  const [documents, setDocuments] = useState<MapAttachment[]>([]);
  const [pictures, setPictures] = useState<MapAttachment[]>([]);
  const [publicationStatus, setPublicationStatus] =
    useState<PublicationStatus>(null);
  const [publicationTags, setPublicationTags] = useState<string[]>([]);
  const [publicationDataRegencies, setPublicationDataRegencies] = useState<
    string[]
  >([]);
  const [publicationInKkpd, setPublicationInKkpd] = useState(false);
  const [publicationDataKkpd, setPublicationDataKkpd] = useState<string[]>([]);
  const [publicationInSubWpp, setPublicationInSubWpp] = useState(false);
  const [publicationDataSubWpp, setPublicationDataSubWpp] = useState<string[]>(
    [],
  );
  const [publicationDescription, setPublicationDescription] = useState("");
  const [publicationImagePath, setPublicationImagePath] = useState<
    string | null
  >(null);
  const [publicationImageFile, setPublicationImageFile] = useState<File | null>(
    null,
  );
  const [publicationImagePreviewUrl, setPublicationImagePreviewUrl] =
    useState<string | null>(null);
  const [publicationSnapshotPreview, setPublicationSnapshotPreview] =
    useState<string | null>(null);
  const [publicationSnapshotTrigger, setPublicationSnapshotTrigger] =
    useState(0);
  const [refreshingPublicationSnapshot, setRefreshingPublicationSnapshot] =
    useState(false);
  const [showPublicationForm, setShowPublicationForm] = useState(false);
  const [savedPublicationSnapshot, setSavedPublicationSnapshot] =
    useState<MapPublicationSnapshot | null>(null);
  const [pendingGeoJson, setPendingGeoJson] = useState<PendingGeoJson | null>(
    null,
  );
  const [mapAddSource, setMapAddSource] = useState<"geojson" | "csv">(
    "geojson",
  );
  const [pendingCsvFile, setPendingCsvFile] = useState<File | null>(null);
  const [pendingCsvRows, setPendingCsvRows] = useState<CsvRawRow[]>([]);
  const [pendingCsvColumns, setPendingCsvColumns] = useState<string[]>([]);
  const [latitudeColumn, setLatitudeColumn] = useState("");
  const [longitudeColumn, setLongitudeColumn] = useState("");
  const [selectedFeatureRows, setSelectedFeatureRows] = useState<number[]>([]);
  const [deleteSelectedLayer, setDeleteSelectedLayer] = useState(false);
  const [editedFeatureCells, setEditedFeatureCells] = useState<string[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<"features" | "dataset" | null>(
    null,
  );
  const [mapConfirmAction, setMapConfirmAction] =
    useState<MapConfirmAction | null>(null);
  const [pendingPublicationStatus, setPendingPublicationStatus] =
    useState<EditablePublicationStatus | null>(null);
  const [draftMapDatasetId, setDraftMapDatasetId] = useState<string | null>(
    null,
  );
  const [draggedPopupField, setDraggedPopupField] = useState<string | null>(
    null,
  );
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
  const [draggedLegendGroup, setDraggedLegendGroup] = useState<{
    layerId: string;
    values: string[];
  } | null>(null);
  const [legendGroupDropTarget, setLegendGroupDropTarget] = useState<{
    layerId: string;
    values: string[];
    position: "before" | "after";
  } | null>(null);
  const [layerDropTarget, setLayerDropTarget] = useState<{
    layerId: string;
    position: "before" | "after";
  } | null>(null);
  const [popupDropTarget, setPopupDropTarget] = useState<{
    field: string;
    position: "before" | "after";
  } | null>(null);
  const [openPopupLayerId, setOpenPopupLayerId] = useState<string | null>(null);
  const [selectedLayerId, setSelectedLayerId] = useState("");
  const [visibleFeatureColumns, setVisibleFeatureColumns] = useState<string[]>(
    [],
  );
  const [draggedFeatureColumn, setDraggedFeatureColumn] = useState<
    string | null
  >(null);
  const [featureColumnDropTarget, setFeatureColumnDropTarget] = useState<{
    column: string;
    position: "before" | "after";
  } | null>(null);
  const [featureFilters, setFeatureFilters] = useState<Record<string, string[]>>(
    {},
  );
  const [featureSort, setFeatureSort] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);
  const [openFeatureColumnMenu, setOpenFeatureColumnMenu] = useState(false);
  const [openFeatureHeaderMenu, setOpenFeatureHeaderMenu] = useState<
    string | null
  >(null);
  const [showLegendConfig, setShowLegendConfig] = useState(true);
  const [showTableConfig, setShowTableConfig] = useState(false);
  const [showPopupConfig, setShowPopupConfig] = useState(false);
  const [showLinkConfig, setShowLinkConfig] = useState(false);
  const [showLayerListSection, setShowLayerListSection] = useState(true);
  const [openLegendLayerId, setOpenLegendLayerId] = useState<string | null>(
    null,
  );
  const [openTableLayerId, setOpenTableLayerId] = useState<string | null>(null);
  const [openLegendItemKey, setOpenLegendItemKey] = useState<string | null>(
    null,
  );
  const [openLayerLegendGroupKey, setOpenLayerLegendGroupKey] = useState<
    string | null
  >(null);
  const [openGlobalLegendGroupId, setOpenGlobalLegendGroupId] = useState<
    string | null
  >(null);
  const [showGabungConfig, setShowGabungConfig] = useState(false);
  const [showGabungLayerSection, setShowGabungLayerSection] = useState(false);
  const [selectedPreviewLayerId, setSelectedPreviewLayerId] = useState("");
  const [selectedPreviewFeature, setSelectedPreviewFeature] = useState<{
    layerId: string;
    feature: Feature<Geometry, GeoJsonProperties>;
  } | null>(null);
  const [selectedPreviewLegendFilterIds, setSelectedPreviewLegendFilterIds] =
    useState<string[]>([]);
  const [previewMapBoundsTrigger, setPreviewMapBoundsTrigger] = useState(0);
  const [previewRefreshing, setPreviewRefreshing] = useState(false);
  const previewLegendEnabled = true;
  const [showPreviewLegend, setShowPreviewLegend] = useState(false);
  const [openGlobalLegendItemKey, setOpenGlobalLegendItemKey] = useState<
    string | null
  >(null);
  const [showSelectedFeatureConfig, setShowSelectedFeatureConfig] =
    useState(false);
  const [iconUploadTargets, setIconUploadTargets] = useState<string[]>([]);
  const [savedVisualizationSnapshot, setSavedVisualizationSnapshot] =
    useState<MapVisualizationSnapshot | null>(null);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      layerNameUpdateTimersRef.current.forEach((timer) =>
        window.clearTimeout(timer),
      );
      layerNameUpdateTimersRef.current.clear();
    };
  }, []);

  const toggleMapConfigSection = (
    section: "legend" | "table" | "popup" | "link",
  ) => {
    pendingMapConfigScrollRef.current = section;
    setShowLegendConfig((prev) => (section === "legend" ? !prev : false));
    setShowTableConfig((prev) => (section === "table" ? !prev : false));
    setShowPopupConfig((prev) => (section === "popup" ? !prev : false));
    setShowLinkConfig((prev) => (section === "link" ? !prev : false));
  };

  useEffect(() => {
    const section = pendingMapConfigScrollRef.current;
    if (!section || window.innerWidth >= 1024) return;

    pendingMapConfigScrollRef.current = null;
    const timer = window.setTimeout(() => {
      const target =
        section === "legend"
          ? legendSectionRef.current
          : section === "table"
            ? tableSectionRef.current
            : section === "popup"
              ? popupSectionRef.current
              : linkSectionRef.current;

      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);

    return () => window.clearTimeout(timer);
  }, [showLegendConfig, showLinkConfig, showPopupConfig, showTableConfig]);

  const allPropertyKeys = useMemo(() => {
    return Array.from(
      layers.reduce<Set<string>>((set, layer) => {
        (layer.property_keys ?? []).forEach((key) => set.add(key));
        return set;
      }, new Set()),
    );
  }, [layers]);

  const orderedPopupFields = useMemo<MapPopupField[]>(() => {
    const keys = new Set(allPropertyKeys);
    const ordered = mapConfig.popupFields.filter((field) =>
      keys.has(field.field),
    );
    const orderedKeys = new Set(ordered.map((field) => field.field));
    const missingFields = allPropertyKeys
      .filter((key) => !orderedKeys.has(key))
      .map((key) => ({
        field: key,
        label: key,
        selected: false,
        suffixEnabled: false,
        suffix: "",
      }));

    return [...ordered, ...missingFields];
  }, [allPropertyKeys, mapConfig.popupFields]);

  const numericPopupFields = useMemo(() => {
    const numericFields = new Set<string>();

    allPropertyKeys.forEach((key) => {
      const values = layers.flatMap((layer) =>
        (layer.collection?.features ?? [])
          .map((feature) => feature.properties?.[key])
          .filter(
            (value) => value !== undefined && value !== null && value !== "",
          ),
      );

      if (
        values.length > 0 &&
        values.every((value) =>
          Number.isFinite(Number(String(value).replace(/,/g, ""))),
        )
      ) {
        numericFields.add(key);
      }
    });

    return numericFields;
  }, [allPropertyKeys, layers]);

  const getOrderedLayerPopupFields = useCallback(
    (layer: LoadedMapLayer): MapPopupField[] => {
      const keys = new Set(layer.property_keys ?? []);
      const layerFields = mapConfig.layerPopupFields[layer.id];
      const fallbackFields = mapConfig.popupFields.filter((field) =>
        keys.has(field.field),
      );
      const configuredFields =
        layerFields && layerFields.length > 0 ? layerFields : fallbackFields;
      const ordered = configuredFields.filter((field) => keys.has(field.field));
      const orderedKeys = new Set(ordered.map((field) => field.field));
      const missingFields = (layer.property_keys ?? [])
        .filter((key) => !orderedKeys.has(key))
        .map((key) => ({
          field: key,
          label: key,
          selected: configuredFields.length === 0,
          suffixEnabled: false,
          suffix: "",
        }));

      return [...ordered, ...missingFields];
    },
    [mapConfig.layerPopupFields, mapConfig.popupFields],
  );

  const getNumericLayerPopupFields = useCallback((layer: LoadedMapLayer) => {
    const numericFields = new Set<string>();

    (layer.property_keys ?? []).forEach((key) => {
      const values = (layer.collection?.features ?? [])
        .map((feature) => feature.properties?.[key])
        .filter(
          (value) => value !== undefined && value !== null && value !== "",
        );

      if (
        values.length > 0 &&
        values.every((value) =>
          Number.isFinite(Number(String(value).replace(/,/g, ""))),
        )
      ) {
        numericFields.add(key);
      }
    });

    return numericFields;
  }, []);

  const latitudeCoordinateStats = useMemo(
    () =>
      getCoordinateColumnStats(
        pendingCsvRows,
        latitudeColumn,
        isValidLatitude,
      ),
    [latitudeColumn, pendingCsvRows],
  );

  const longitudeCoordinateStats = useMemo(
    () =>
      getCoordinateColumnStats(
        pendingCsvRows,
        longitudeColumn,
        isValidLongitude,
      ),
    [longitudeColumn, pendingCsvRows],
  );

  const csvCoordinateFatal = Boolean(
    mapAddSource === "csv" &&
      pendingCsvFile &&
      latitudeColumn &&
      longitudeColumn &&
      (latitudeCoordinateStats.hasFatalError ||
        longitudeCoordinateStats.hasFatalError),
  );
  const csvInvalidCoordinateRowCount = useMemo(() => {
    if (
      mapAddSource !== "csv" ||
      !pendingCsvFile ||
      !latitudeColumn ||
      !longitudeColumn ||
      csvCoordinateFatal
    ) {
      return 0;
    }

    return pendingCsvRows.filter(
      (row) =>
        !isValidLatitude(row[latitudeColumn]) ||
        !isValidLongitude(row[longitudeColumn]),
    ).length;
  }, [
    csvCoordinateFatal,
    latitudeColumn,
    longitudeColumn,
    mapAddSource,
    pendingCsvFile,
    pendingCsvRows,
  ]);

  const selectedLayer = useMemo(() => {
    return (
      layers.find((layer) => layer.id === selectedLayerId) ?? layers[0] ?? null
    );
  }, [layers, selectedLayerId]);

  const featureColumns = useMemo(() => {
    return selectedLayer?.property_keys ?? [];
  }, [selectedLayer]);

  const featureRows = useMemo(() => {
    return selectedLayer?.collection?.features ?? [];
  }, [selectedLayer]);

  const activeFeatureColumns = useMemo(() => {
    const availableColumns = new Set(featureColumns);
    return visibleFeatureColumns.filter((column) =>
      availableColumns.has(column),
    );
  }, [featureColumns, visibleFeatureColumns]);

  const featureFilterOptions = useMemo(() => {
    return featureColumns.reduce<Record<string, string[]>>((acc, column) => {
      const values = new Set<string>();

      featureRows.forEach((feature) => {
        values.add(String(feature.properties?.[column] ?? ""));
      });

      acc[column] = Array.from(values).sort((a, b) => a.localeCompare(b));
      return acc;
    }, {});
  }, [featureColumns, featureRows]);

  const visibleFeatureRows = useMemo(() => {
    const rows = featureRows.map((feature, index) => ({ feature, index }));
    const filteredRows = rows.filter(({ feature }) =>
      featureColumns.every((column) => {
        const options = featureFilterOptions[column] ?? [];
        const selectedValues = featureFilters[column] ?? options;

        if (selectedValues.length === options.length) return true;

        return selectedValues.includes(String(feature.properties?.[column] ?? ""));
      }),
    );

    if (!featureSort) return filteredRows;

    return [...filteredRows].sort((a, b) => {
      const left = String(a.feature.properties?.[featureSort.key] ?? "");
      const right = String(b.feature.properties?.[featureSort.key] ?? "");
      const compare = left.localeCompare(right, undefined, {
        numeric: true,
        sensitivity: "base",
      });

      return featureSort.direction === "asc" ? compare : -compare;
    });
  }, [
    featureColumns,
    featureFilterOptions,
    featureFilters,
    featureRows,
    featureSort,
  ]);

  const appliedPreviewLayers = appliedMapPreview?.layers ?? layers;
  const appliedPreviewConfig = appliedMapPreview?.mapConfig ?? mapConfig;

  const previewLayers: MapPreviewLayer[] = useMemo(
    () =>
      appliedPreviewLayers
        .filter(
          (layer): layer is LoadedMapLayer & { collection: FeatureCollection } =>
            Boolean(layer.collection) &&
            !appliedPreviewConfig.hiddenMapLayerIds.includes(layer.id),
        )
        .map((layer) => ({
          id: layer.id,
          name: layer.name,
          geometry_type: layer.geometry_type,
          collection: layer.collection,
          legends: getEffectiveLayerLegends(layer, appliedPreviewConfig).map((legend) => ({
            value: legend.value,
            label: legend.label,
            geometry_type: legend.geometryType,
            color: legend.color,
            fill_color: legend.fillColor,
            stroke_color: legend.strokeColor,
            stroke_width: legend.strokeWidth,
            fill_opacity: legend.fillOpacity,
            fill_pattern: legend.fillPattern,
            pattern_color: legend.patternColor,
            pattern_thickness: legend.patternThickness,
            pattern_opacity: legend.patternOpacity,
            pattern_gap: legend.patternGap,
            icon_path: legend.iconPath,
            icon_width: legend.pointSize,
            icon_height: legend.pointSize,
            visible_by_default: !legend.labelOnly,
            label_only: legend.labelOnly,
          })) satisfies MapLegendItem[],
        })),
    [appliedPreviewConfig, appliedPreviewLayers],
  );

  const resolvedLayerPopupFields = useMemo(
    () =>
      layers.reduce<Record<string, MapPopupField[]>>((acc, layer) => {
        acc[layer.id] = getOrderedLayerPopupFields(layer);
        return acc;
      }, {}),
    [getOrderedLayerPopupFields, layers],
  );

  const applyDraftToPreview = () => {
    setPreviewRefreshing(true);
    setAppliedMapPreview({
      layers,
      mapConfig: {
        ...mapConfig,
        layerPopupFields: resolvedLayerPopupFields,
      },
    });
    setPreviewMapBoundsTrigger((current) => current + 1);
  };
  const handlePreviewRenderComplete = useCallback(
    () => setPreviewRefreshing(false),
    [],
  );
  const handlePreviewFeatureSelect = useCallback(
    (
      layerId: string | null,
      feature: Feature<Geometry, GeoJsonProperties> | null,
    ) => {
      setSelectedPreviewFeature(
        layerId && feature ? { layerId, feature } : null,
      );
    },
    [],
  );

  const activeGabungGroups = mapConfig.globalLegend.groups;
  const visiblePreviewLayerIds = useMemo(
    () => new Set(previewLayers.map((layer) => layer.id)),
    [previewLayers],
  );
  const filteredPreviewLegendLayers = useMemo(() => {
    if (selectedPreviewLayerId) {
      return previewLayers.filter((layer) => layer.id === selectedPreviewLayerId);
    }

    return previewLayers;
  }, [
    previewLayers,
    selectedPreviewLayerId,
  ]);
  const previewLegendItemOptions = useMemo(
    () =>
      filteredPreviewLegendLayers.flatMap((layer) =>
        layer.legends.map((legend) => {
          const layerGroupConfig =
            appliedPreviewConfig.layerGroupConfigs[layer.id] ?? {
            mainGroupField: appliedPreviewConfig.mainGroupField,
            subGroupField: appliedPreviewConfig.subGroupField,
            useMainGroup: true,
            useSubGroup: appliedPreviewConfig.useSubGroup,
            legendItemMode: "none",
            columnLegendFields: [],
            mainGroupAliases: {},
            legendItemSources: {},
            legendItemMainValues: {},
          };
          const isColumnLegend =
            layerGroupConfig.columnLegendFields.includes(legend.value);
          const legendSource =
            layerGroupConfig.legendItemSources[legend.value] ??
            (layerGroupConfig.useSubGroup ? "sub" : "main");
          const mainValue =
            layerGroupConfig.legendItemMainValues[legend.value] ||
            (legend.value.includes("|||")
              ? legend.value.split("|||")[0] || legend.value
              : legend.value);
          const resolvedLegendLabel =
            !isColumnLegend && legendSource === "main"
              ? getMainGroupLabel(layerGroupConfig, mainValue)
              : legend.label || legend.value;

          return {
            id: `${layer.id}|||${legend.value}`,
            layerId: layer.id,
            value: legend.value,
            label: `${layer.name} - ${resolvedLegendLabel}`,
            labelOnly: legend.label_only === true,
          };
        }),
      ),
    [appliedPreviewConfig, filteredPreviewLegendLayers],
  );
  const selectedPreviewLegendFilters = useMemo(
    () =>
      previewLegendItemOptions
        .filter(
          (item) =>
            !item.labelOnly && selectedPreviewLegendFilterIds.includes(item.id),
        )
        .map((item) => ({
          layerId: item.layerId,
          value: item.value,
        })),
    [previewLegendItemOptions, selectedPreviewLegendFilterIds],
  );

  const previewMapConfig = useMemo(
    () => {
      const basePreviewConfig = {
        ...appliedPreviewConfig,
      };
      const layerFilteredConfig =
        selectedPreviewLayerId
          ? {
              ...basePreviewConfig,
              hiddenMapLayerIds: Array.from(
                new Set([
                  ...appliedPreviewConfig.hiddenMapLayerIds,
                  ...appliedPreviewLayers
                    .filter((layer) => layer.id !== selectedPreviewLayerId)
                    .map((layer) => layer.id),
                ]),
              ),
            }
          : basePreviewConfig;

      return {
        ...layerFilteredConfig,
        globalLegend: DEFAULT_GLOBAL_LEGEND_CONFIG,
      };
    },
    [
      appliedPreviewConfig,
      appliedPreviewLayers,
      selectedPreviewLayerId,
    ],
  );
  const selectedPreviewTable = useMemo(() => {
    if (!selectedPreviewFeature) return null;

    const layer = layers.find(
      (item) => item.id === selectedPreviewFeature.layerId,
    );
    if (!layer) return null;

    const config = getLayerTableConfig(mapConfig, layer);
    if (!config.enabled) return null;

    // The map click already gives us the exact feature. Re-querying the
    // collection by a non-unique/empty selector can accidentally select a
    // different row from the one displayed in the callout.
    const properties = selectedPreviewFeature.feature.properties ?? {};
    const formatTableValue = (rawValue: unknown) =>
      rawValue === null || rawValue === undefined ? "null" : String(rawValue);
    const rows =
      config.mode === "rows"
        ? [
            {
              data: formatTableValue(properties[config.dataField]),
              value: formatTableValue(properties[config.valueField]),
            },
          ]
        : config.selectedFields.map((field) => ({
            data: field,
            value: formatTableValue(properties[field]),
          }));

    return {
      selectorValue:
        String(
          properties.name ??
            properties.nama ??
            properties.Name ??
            properties.Nama ??
            properties[config.selectorField] ??
            "",
        ).trim() || layer.name,
      dataLabel: config.dataLabel || "Data",
      valueLabel: config.valueLabel || "Nilai",
      rows,
    };
  }, [layers, mapConfig, selectedPreviewFeature]);
  const hasEnabledPreviewTable = useMemo(
    () =>
      layers.some(
        (layer) =>
          !mapConfig.hiddenMapLayerIds.includes(layer.id) &&
          getLayerTableConfig(mapConfig, layer).enabled,
      ),
    [layers, mapConfig],
  );

  const publicationSnapshotMapConfig = useMemo(
    () => ({
      ...mapConfig,
      layerPopupFields: resolvedLayerPopupFields,
      globalLegend: DEFAULT_GLOBAL_LEGEND_CONFIG,
    }),
    [mapConfig, resolvedLayerPopupFields],
  );

  const previewBounds = useMemo(() => {
    if (!selectedPreviewLayerId) return dataset?.bounds ?? null;

    const selectedPreviewLayer = previewLayers.find(
      (layer) => layer.id === selectedPreviewLayerId,
    );

    return selectedPreviewLayer
      ? getBoundsFromCollection(selectedPreviewLayer.collection)
      : dataset?.bounds ?? null;
  }, [dataset?.bounds, previewLayers, selectedPreviewLayerId]);

  const currentVisualizationSnapshot = useMemo(
    () =>
      buildVisualizationSnapshot(label, mapConfig, documents, pictures, layers),
    [documents, label, layers, mapConfig, pictures],
  );

  const visualizationChangeCount = useMemo(
    () =>
      countVisualizationChanges(
        currentVisualizationSnapshot,
        savedVisualizationSnapshot,
      ),
    [currentVisualizationSnapshot, savedVisualizationSnapshot],
  );

  useEffect(() => {
    if (
      selectedPreviewLayerId &&
      !previewLayers.some((layer) => layer.id === selectedPreviewLayerId)
    ) {
      setSelectedPreviewLayerId("");
    }

    if (
      selectedPreviewLegendFilterIds.some(
        (selectedId) =>
          !previewLegendItemOptions.some(
            (item) => item.id === selectedId && !item.labelOnly,
          ),
      )
    ) {
      setSelectedPreviewLegendFilterIds((current) =>
        current.filter((selectedId) =>
          previewLegendItemOptions.some(
            (item) => item.id === selectedId && !item.labelOnly,
          ),
        ),
      );
    }
  }, [
    filteredPreviewLegendLayers,
    previewLayers,
    previewLegendItemOptions,
    selectedPreviewLayerId,
    selectedPreviewLegendFilterIds,
  ]);

  useEffect(() => {
    if (
      openPopupLayerId &&
      mapConfig.hiddenMapLayerIds.includes(openPopupLayerId)
    ) {
      setOpenPopupLayerId(null);
    }
  }, [mapConfig.hiddenMapLayerIds, openPopupLayerId]);

  const fetchMapDataset = useCallback(async () => {
    if (!mapDatasetId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const { data: mapRow, error: mapError } = await supabase
        .from("map_datasets")
        .select(
          "id, user_id, label, slug, geojson_feature_count, bounds, map_config, documents_path, pictures_path, published, tag, data_regency, data_subwpp, data_kkpd, description, image_path",
        )
        .eq("id", mapDatasetId)
        .maybeSingle();

      if (mapError) throw mapError;
      if (!mapRow) throw new Error("Map tidak ditemukan.");

      const { data: layerRows, error: layerError } = await supabase
        .from("map_layers")
        .select("*")
        .eq("map_dataset_id", mapDatasetId)
        .order("sort_order", { ascending: true });

      if (layerError) throw layerError;

      const layerIds = (layerRows ?? []).map((layer) => layer.id);
      const { data: legendRows, error: legendError } =
        layerIds.length > 0
          ? await supabase
              .from("map_legend_items")
              .select("*")
              .in("map_layer_id", layerIds)
              .order("sort_order", { ascending: true })
          : { data: [], error: null };

      if (legendError) throw legendError;

      const loadedLayers = await Promise.all(
        ((layerRows ?? []) as MapLayerRow[]).map(async (layer) => {
          const collection = await loadGeoJsonFromStorage(layer.source_path);
          const rowLegends = ((legendRows ?? []) as MapLegendRow[])
            .filter((legend) => legend.map_layer_id === layer.id)
            .map((legend) => ({
              value: legend.value,
              label: legend.label,
              labelOnly: legend.visible_by_default === false,
              geometryType: legend.geometry_type,
              color: legend.color || "#0EA5E9",
              fillColor: legend.fill_color || legend.color || "#0EA5E9",
              strokeColor: legend.stroke_color || legend.color || "#0EA5E9",
              strokeWidth: legend.stroke_width ?? 2,
              fillOpacity: legend.fill_opacity ?? 0.65,
              fillPattern: legend.fill_pattern ?? "none",
              patternColor: legend.pattern_color || legend.fill_color || legend.color || "#0EA5E9",
              patternThickness: legend.pattern_thickness ?? 1.25,
              patternOpacity: legend.pattern_opacity ?? 1,
              patternGap: legend.pattern_gap ?? 8,
              pointSize: legend.icon_width ?? 16,
              iconPath: legend.icon_path,
              sortOrder: legend.sort_order,
            }));

          return {
            ...layer,
            collection,
            // `property_keys` stores the source header order. Prefer it over
            // deriving keys again so CSV columns are displayed exactly as
            // arranged in the uploaded file.
            property_keys:
              layer.property_keys && layer.property_keys.length > 0
                ? layer.property_keys
                : collection
                  ? getFeaturePropertyKeys(collection)
                  : layer.property_keys,
            legends: rowLegends,
          };
        }),
      );

      const row = mapRow as MapDatasetRow;
      const parsedConfig = parseMapConfig(row.map_config);
      const parsedPublicationTags = parseJsonArray<string>(row.tag);
      const configuredRegencies = new Set<string>(
        DATA_REGENCY_OPTIONS.map((option) => option.value),
      );
      const parsedDataRegencies = parseJsonArray<string>(
        row.data_regency,
      ).filter((value) => configuredRegencies.has(value));
      const configuredSubWpp = new Set<string>(
        DATA_SUBWPP_OPTIONS.map((option) => option.value),
      );
      const parsedDataSubWpp = parseJsonArray<string>(row.data_subwpp).filter(
        (value) => configuredSubWpp.has(value),
      );
      const configuredKkpd = new Set<string>(
        DATA_KKPD_OPTIONS.map((option) => option.value),
      );
      const parsedDataKkpd = parseJsonArray<string>(row.data_kkpd).filter(
        (value) => configuredKkpd.has(value),
      );
      const parsedDocuments = parseJsonArray<MapAttachment>(row.documents_path);
      const parsedPictures = parseJsonArray<MapAttachment>(row.pictures_path);

      setDataset(row);
      setLabel(row.label ?? "");
      setMapConfig(parsedConfig);
      setDocuments(parsedDocuments);
      setPictures(parsedPictures);
      setPublicationStatus(row.published ?? null);
      setPublicationTags(parsedPublicationTags);
      setPublicationDataRegencies(parsedDataRegencies);
      setPublicationDataSubWpp(parsedDataSubWpp);
      setPublicationInSubWpp(parsedDataSubWpp.length > 0);
      setPublicationDataKkpd(parsedDataKkpd);
      setPublicationInKkpd(parsedDataKkpd.length > 0);
      setPublicationDescription(row.description ?? "");
      setPublicationImagePath(row.image_path ?? null);
      setPublicationImageFile(null);
      setPublicationImagePreviewUrl(null);
      setPublicationSnapshotPreview(null);
      setShowPublicationForm(row.published !== null);
      setLayers(loadedLayers);
      setAppliedMapPreview({ layers: loadedLayers, mapConfig: parsedConfig });
      setSavedPublicationSnapshot(
        buildPublicationSnapshot(
          row.label ?? "",
          parsedPublicationTags,
          parsedDataRegencies,
          parsedDataSubWpp,
          parsedDataKkpd,
          row.description ?? "",
          row.image_path ?? null,
        ),
      );
      setSavedVisualizationSnapshot(
        buildVisualizationSnapshot(
          row.label ?? "",
          parsedConfig,
          parsedDocuments,
          parsedPictures,
          loadedLayers,
        ),
      );
    } catch (error) {
      console.error("Failed to fetch map dataset:", error);
      setMessage("Gagal memuat data peta.");
      setAlert("failed");
    } finally {
      setLoading(false);
    }
  }, [mapDatasetId]);

  useEffect(() => {
    void fetchMapDataset();
  }, [fetchMapDataset]);

  useEffect(() => {
    if (selectedLayerId || layers.length === 0) return;

    setSelectedLayerId(layers[0]?.id ?? "");
  }, [layers, selectedLayerId]);

  useEffect(() => {
    let cancelled = false;
    setVisibleFeatureColumns(featureColumns);
    setFeatureFilters({});
    setFeatureSort(null);
    setSelectedFeatureRows([]);
    setDeleteSelectedLayer(false);
    setEditedFeatureCells([]);

    const fetchColumnOrder = async () => {
      if (!selectedLayer?.id || featureColumns.length === 0) return;

      const { data, error } = await supabase
        .from("table_view_preferences")
        .select("column_order")
        .eq("resource_kind", "map_layer")
        .eq("resource_id", selectedLayer.id)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        console.warn("Map table column order is unavailable:", error);
        return;
      }
      if (!Array.isArray(data?.column_order)) return;

      const savedColumns = data.column_order.filter((column: string) =>
        featureColumns.includes(column),
      );
      setVisibleFeatureColumns([
        ...savedColumns,
        ...featureColumns.filter((column) => !savedColumns.includes(column)),
      ]);
    };

    void fetchColumnOrder();
    return () => {
      cancelled = true;
    };
  }, [featureColumns, selectedLayer?.id]);

  const featureEditChangeCount =
    editedFeatureCells.length +
    Number(Boolean(label.trim() && label.trim() !== dataset?.label));

  useEffect(() => {
    if (!onChangeCountChange) return;

    let nextCount = 0;

    if (view === "mapadd" || action === "add") {
      nextCount = pendingGeoJson ? 1 : 0;
    } else if (view === "mapdataset" && action === "edit") {
      nextCount = featureEditChangeCount;
    } else if (view === "mapdataset" && action === "delete") {
      nextCount = deleteSelectedLayer ? 1 : selectedFeatureRows.length;
    } else if (view === "mapvisualization" || view === "maplegend") {
      nextCount = visualizationChangeCount;
    } else if (view === "publication") {
      nextCount = 1;
    }

    let active = true;
    const timeout = window.setTimeout(() => {
      if (active) {
        onChangeCountChange(nextCount);
      }
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [
    action,
    deleteSelectedLayer,
    featureEditChangeCount,
    onChangeCountChange,
    pendingGeoJson,
    selectedFeatureRows.length,
    visualizationChangeCount,
    view,
  ]);

  useEffect(() => {
    if (mapConfig.mainGroupField || allPropertyKeys.length === 0) return;

    const mainGroupField = getDefaultGroupField(allPropertyKeys);
    const subGroupField = getDefaultSubGroupField(allPropertyKeys, mainGroupField);

    setMapConfig({
      mainGroupField,
      subGroupField,
            useMainGroup: false,
      useSubGroup: false,
      selectedFeatureColor: DEFAULT_SELECTED_FEATURE_COLOR,
      selectedFeatureFillColor: DEFAULT_SELECTED_FEATURE_COLOR,
      selectedFeatureStrokeColor: DEFAULT_SELECTED_FEATURE_COLOR,
      selectedFeatureStrokeWidth: DEFAULT_SELECTED_FEATURE_STROKE_WIDTH,
      selectedFeatureFillOpacity: DEFAULT_SELECTED_FEATURE_FILL_OPACITY,
      hiddenMapLayerIds: [],
      layerGroupConfigs: {},
      globalLegend: DEFAULT_GLOBAL_LEGEND_CONFIG,
      popupFields: getDefaultPopupFields(allPropertyKeys),
      layerPopupFields: {},
      layerTableConfigs: {},
      links: [],
    });
  }, [allPropertyKeys, mapConfig.mainGroupField]);

  useEffect(() => {
    const missingLayers = layers.filter(
      (layer) => !mapConfig.layerGroupConfigs[layer.id],
    );

    if (missingLayers.length === 0) return;

    const nextConfigs = missingLayers.reduce<Record<string, MapLayerGroupConfig>>(
      (acc, layer) => {
        const defaultConfig = createDefaultLayerGroupConfig(
          layer.property_keys ?? [],
        );
        const draft = layer.collection
          ? createLayerLegendDrafts(layer.collection, defaultConfig)
          : null;

        acc[layer.id] = {
          ...defaultConfig,
          legendItemSources:
            draft?.legendItemSources ?? defaultConfig.legendItemSources,
          legendItemMainValues:
            draft?.legendItemMainValues ?? defaultConfig.legendItemMainValues,
        };
        return acc;
      },
      {},
    );

    setMapConfig((prev) => ({
      ...prev,
      layerGroupConfigs: {
        ...prev.layerGroupConfigs,
        ...nextConfigs,
      },
    }));

    setLayers((prev) =>
      prev.map((layer) => {
        const nextConfig = nextConfigs[layer.id];

        if (!nextConfig || !layer.collection) return layer;

        const { legends: nextLegends } = createLayerLegendDrafts(
          layer.collection,
          nextConfig,
        );

        return {
          ...layer,
          legends: nextLegends.map((legend) => {
            const existing = layer.legends.find(
              (item) => item.value === legend.value,
            );

            return existing ?? legend;
          }),
        };
      }),
    );
  }, [layers, mapConfig.layerGroupConfigs]);

  const uploadAttachment = async (
    bucket: "documents" | "images",
    folder: string,
    file: File,
  ) => {
    const extension = getFileExtension(file);
    const base = toSlug(file.name.replace(/\.[^.]+$/, ""));
    const path = `${folder}/${base}-${getUploadTimestamp()}.${extension}`;

    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      upsert: true,
      contentType: file.type || undefined,
    });

    if (error) throw error;

    return {
      name: file.name,
      path,
      size: file.size,
      type: file.type,
      uploaded_at: new Date().toISOString(),
    } satisfies MapAttachment;
  };

  const createDraftMapDataset = useCallback(
    async (draft: PendingGeoJson) => {
      if (!ownerId) return null;

      const { file, collection, propertyKeys, geometryType, bounds: nextBounds } =
        draft;
      const draftSlug = `draft-${Date.now()}`;
      const storagePath = `${ownerId}/${draftSlug}/${toSlug(
        file.name.replace(/\.[^.]+$/, ""),
      )}-${getUploadTimestamp()}.${getFileExtension(file)}`;
      const uploadBody = await createGeoJsonUploadBlob(file);

      await uploadGeoJson(storagePath, uploadBody);

      const mainGroupField = getDefaultGroupField(propertyKeys);
      const subGroupField = getDefaultSubGroupField(propertyKeys, mainGroupField);
      const initialConfig: MapConfig = {
        mainGroupField,
        subGroupField,
        useMainGroup: true,
        useSubGroup: false,
        selectedFeatureColor: DEFAULT_SELECTED_FEATURE_COLOR,
        selectedFeatureFillColor: DEFAULT_SELECTED_FEATURE_COLOR,
        selectedFeatureStrokeColor: DEFAULT_SELECTED_FEATURE_COLOR,
        selectedFeatureStrokeWidth: DEFAULT_SELECTED_FEATURE_STROKE_WIDTH,
        selectedFeatureFillOpacity: DEFAULT_SELECTED_FEATURE_FILL_OPACITY,
        hiddenMapLayerIds: [],
        layerGroupConfigs: {},
        globalLegend: DEFAULT_GLOBAL_LEGEND_CONFIG,
        popupFields: getDefaultPopupFields(propertyKeys),
        layerPopupFields: {},
        layerTableConfigs: {},
        links: [],
      };

      const { data: inserted, error: insertError } = await supabase
        .from("map_datasets")
        .insert({
          user_id: ownerId,
          label: "Draft",
          slug: draftSlug,
          original_filename: file.name,
          geojson_size_bytes: file.size,
          geojson_feature_count: collection.features.length,
          bounds: nextBounds,
          map_config: initialConfig,
          import_status: "draft",
          draft_expires_at: getDraftExpiryDate(),
        })
        .select("id")
        .single();

      if (insertError) throw insertError;

      const draftId = inserted.id as string;

      const { data: insertedLayer, error: layerError } = await supabase
        .from("map_layers")
        .insert({
          map_dataset_id: draftId,
          name: file.name.replace(/\.[^.]+$/, ""),
          geometry_type: geometryType,
          source_path: storagePath,
          feature_count: collection.features.length,
          property_keys: propertyKeys,
          sort_order: 0,
        })
        .select("id")
        .single();

      if (layerError) throw layerError;

      const initialLayerConfig = createDefaultLayerGroupConfig(propertyKeys);
      const draftLegends = createLayerLegendDrafts(
        collection,
        initialLayerConfig,
      );
      const layerGroupConfig = {
        ...initialLayerConfig,
        legendItemSources: draftLegends.legendItemSources,
        legendItemMainValues: draftLegends.legendItemMainValues,
      };
      const nextInitialConfig = {
        ...initialConfig,
        layerGroupConfigs: {
          [insertedLayer.id]: layerGroupConfig,
        },
      };
      const legends = draftLegends.legends;

      if (legends.length > 0) {
        const { error: legendError } = await supabase
          .from("map_legend_items")
          .insert(
            legends.map((legend) => ({
              map_layer_id: insertedLayer.id,
              value: legend.value,
              label: legend.label,
              geometry_type: legend.geometryType,
              color: legend.color,
              fill_color: legend.fillColor,
              stroke_color: legend.strokeColor,
              stroke_width: legend.strokeWidth,
              fill_opacity: legend.fillOpacity,
              fill_pattern: legend.fillPattern,
              pattern_color: legend.patternColor,
              pattern_thickness: legend.patternThickness,
              pattern_opacity: legend.patternOpacity,
              pattern_gap: legend.patternGap,
              icon_path: legend.iconPath,
              icon_width: legend.pointSize,
              icon_height: legend.pointSize,
              sort_order: legend.sortOrder,
            })),
          );

        if (legendError) throw legendError;
      }

      await supabase
        .from("map_datasets")
        .update({ map_config: nextInitialConfig })
        .eq("id", draftId);

      setMapConfig(nextInitialConfig);
      setDraftMapDatasetId(draftId);

      return draftId;
    },
    [ownerId],
  );

  const handleUploadGeoJson = async (file: File) => {
    if (!file.name.match(/\.(geojson|json)$/i)) {
      setMessage("File harus berupa GeoJSON atau JSON.");
      setAlert("invalid");
      return;
    }

    if (!ownerId && !dataset?.user_id) {
      setMessage("Pemilik data tidak tersedia.");
      setAlert("failed");
      return;
    }

    try {
      const collection = await readGeoJsonFile(file);
      const propertyKeys = getFeaturePropertyKeys(collection);
      const geometryType = getCollectionGeometryType(collection);
      const nextBounds = getBoundsFromCollection(collection);
      const nextDraft = {
        file,
        collection,
        propertyKeys,
        geometryType,
        bounds: nextBounds,
      };

      setPendingGeoJson(nextDraft);
      setPendingCsvFile(null);
      setPendingCsvRows([]);
      setPendingCsvColumns([]);
      setLatitudeColumn("");
      setLongitudeColumn("");
      setLabel((prev) => prev || "Draft");
      setMessage("");
      onAddReadyChange?.(true);

      if (!mapDatasetId) {
        setSaving(true);

        try {
          await createDraftMapDataset(nextDraft);
        } finally {
          setSaving(false);
        }
      }
    } catch (error) {
      console.error("Failed to parse map GeoJSON:", error);
      setMessage(
        error instanceof Error ? error.message : "Gagal membaca GeoJSON.",
      );
      setAlert("failed");
      setPendingGeoJson(null);
      setDraftMapDatasetId(null);
      onAddReadyChange?.(false);
    }
  };

  const resetPendingMapAdd = () => {
    setPendingGeoJson(null);
    setPendingCsvFile(null);
    setPendingCsvRows([]);
    setPendingCsvColumns([]);
    setLatitudeColumn("");
    setLongitudeColumn("");
    setDraftMapDatasetId(null);
    setMessage("");
    onAddReadyChange?.(false);
  };

  const cancelPendingMapAdd = () => {
    resetPendingMapAdd();

    if (!mapDatasetId) return;

    const params = new URLSearchParams(searchParams.toString());
    params.delete("action");
    params.set("view", "mapdataset");

        if (mountedRef.current) {
          router.replace(`${pathname}?${params.toString()}`, {
            scroll: false,
          });
        }
  };

  const handleUploadCsv = (file: File) => {
    if (!isCsvFile(file)) {
      resetPendingMapAdd();
      setMessage("File harus berupa CSV.");
      setAlert("invalid");
      return;
    }

    if (!ownerId && !dataset?.user_id) {
      setMessage("Pemilik data tidak tersedia.");
      setAlert("failed");
      return;
    }

    Papa.parse<CsvRawRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const rows = getValidCsvRows(result.data);
        const columns = getCsvColumns(rows);

        if (rows.length === 0 || columns.length === 0) {
          resetPendingMapAdd();
          setMessage("CSV tidak memiliki data yang valid.");
          setAlert("invalid");
          return;
        }

        setMapAddSource("csv");
        setPendingCsvFile(file);
        setPendingCsvRows(rows);
        setPendingCsvColumns(columns);
        setLatitudeColumn("");
        setLongitudeColumn("");
        setPendingGeoJson(null);
        setDraftMapDatasetId(null);
        setLabel((prev) => prev || "Draft");
        setMessage(`CSV berhasil dibaca: ${rows.length} baris.`);
        onAddReadyChange?.(false);
      },
      error: (error) => {
        console.error("Failed to parse map CSV:", error);
        resetPendingMapAdd();
        setMessage("Gagal membaca file CSV.");
        setAlert("failed");
      },
    });
  };

  useEffect(() => {
    if (mapAddSource !== "csv" || !pendingCsvFile) return;

    if (
      !latitudeColumn ||
      !longitudeColumn ||
      csvCoordinateFatal ||
      getRowsWithValidCoordinates(
        pendingCsvRows,
        latitudeColumn,
        longitudeColumn,
      ).length === 0
    ) {
      setPendingGeoJson(null);
      onAddReadyChange?.(false);
      return;
    }

    const collection = csvToPointCollection(
      pendingCsvRows,
      latitudeColumn,
      longitudeColumn,
    );
    const geoJsonFile = createGeoJsonFileFromCsv(pendingCsvFile, collection);
    // Papa Parse preserves the CSV header sequence in `pendingCsvColumns`.
    // Keep that sequence as the canonical horizontal table order.
    const propertyKeys = [...pendingCsvColumns];
    const nextDraft: PendingGeoJson = {
      file: geoJsonFile,
      collection,
      propertyKeys,
      geometryType: "point",
      bounds: getBoundsFromCollection(collection),
    };

    setPendingGeoJson(nextDraft);
    onAddReadyChange?.(true);
  }, [
    csvCoordinateFatal,
    latitudeColumn,
    longitudeColumn,
    mapAddSource,
    onAddReadyChange,
    pendingCsvFile,
    pendingCsvRows,
  ]);

  const savePendingGeoJson = useCallback(async () => {
    if (!pendingGeoJson) {
      setAlert("invalid");
      return;
    }

    if (!label.trim()) {
      setMessage("Judul Peta wajib diisi sebelum menyimpan.");
      setAlert("invalid");
      return;
    }

    if (isTemporaryDraftTitle(label)) {
      setMessage(
        'Judul Peta masih menggunakan nama sementara "Draft". Silakan ubah judul sebelum menyimpan.',
      );
      setAlert("invalid");
      return;
    }

    const { file, collection, propertyKeys, geometryType, bounds: nextBounds } =
      pendingGeoJson;

    if (!ownerId && !dataset?.user_id) {
      setMessage("Pemilik data tidak tersedia.");
      setAlert("failed");
      return;
    }

    setSaving(true);

    try {
      const nextLabel = label.trim() || file.name.replace(/\.[^.]+$/, "");
      const nextSlug = toSlug(nextLabel);

      if (!mapDatasetId && draftMapDatasetId) {
        const { error: promoteError } = await supabase
          .from("map_datasets")
          .update({
            label: nextLabel,
            slug: nextSlug,
          })
          .eq("id", draftMapDatasetId);

        if (promoteError) throw promoteError;

        setPendingGeoJson(null);
        setPendingCsvFile(null);
        setPendingCsvRows([]);
        setPendingCsvColumns([]);
        setLatitudeColumn("");
        setLongitudeColumn("");
        setDraftMapDatasetId(null);
        onAddReadyChange?.(false);
        setAlert("success");
        onCreated?.();
        return;
      }

      const storagePath = `${ownerId || dataset?.user_id}/${nextSlug}/${toSlug(
        file.name.replace(/\.[^.]+$/, ""),
      )}-${getUploadTimestamp()}.${getFileExtension(file)}`;
      const uploadBody = await createGeoJsonUploadBlob(file);

      await uploadGeoJson(storagePath, uploadBody);

      let targetDatasetId = dataset?.id ?? mapDatasetId;
      const targetBounds = mergeBounds(dataset?.bounds ?? null, nextBounds);

      if (!targetDatasetId) {
        const mainGroupField = getDefaultGroupField(propertyKeys);
        const subGroupField = getDefaultSubGroupField(propertyKeys, mainGroupField);
        const initialConfig: MapConfig = {
          mainGroupField,
          subGroupField,
          useMainGroup: true,
          useSubGroup: false,
          selectedFeatureColor: DEFAULT_SELECTED_FEATURE_COLOR,
          selectedFeatureFillColor: DEFAULT_SELECTED_FEATURE_COLOR,
          selectedFeatureStrokeColor: DEFAULT_SELECTED_FEATURE_COLOR,
          selectedFeatureStrokeWidth: DEFAULT_SELECTED_FEATURE_STROKE_WIDTH,
          selectedFeatureFillOpacity: DEFAULT_SELECTED_FEATURE_FILL_OPACITY,
          hiddenMapLayerIds: [],
          layerGroupConfigs: {},
          globalLegend: DEFAULT_GLOBAL_LEGEND_CONFIG,
          popupFields: getDefaultPopupFields(propertyKeys),
          layerPopupFields: {},
          layerTableConfigs: {},
          links: [],
        };

        const { data: inserted, error: insertError } = await supabase
          .from("map_datasets")
          .insert({
            user_id: ownerId,
            label: nextLabel,
            slug: nextSlug,
            original_filename: file.name,
            geojson_size_bytes: file.size,
            geojson_feature_count: collection.features.length,
            bounds: targetBounds,
            map_config: initialConfig,
            import_status: "draft",
            draft_expires_at: getDraftExpiryDate(),
          })
          .select("id, label, slug, bounds, map_config")
          .single();

        if (insertError) throw insertError;

        targetDatasetId = inserted.id;
        setMapConfig(initialConfig);
      } else {
        const { error: updateError } = await supabase
          .from("map_datasets")
          .update({
            bounds: targetBounds,
            geojson_feature_count:
              (dataset?.geojson_feature_count ?? 0) + collection.features.length,
          })
          .eq("id", targetDatasetId);

        if (updateError) throw updateError;
      }

      const { data: insertedLayer, error: layerError } = await supabase
        .from("map_layers")
        .insert({
          map_dataset_id: targetDatasetId,
          name: file.name.replace(/\.[^.]+$/, ""),
          geometry_type: geometryType,
          source_path: storagePath,
          feature_count: collection.features.length,
          property_keys: propertyKeys,
          sort_order: layers.length,
        })
        .select("*")
        .single();

      if (layerError) throw layerError;

      const initialLayerConfig = createDefaultLayerGroupConfig(propertyKeys);
      const draftLegends = createLayerLegendDrafts(
        collection,
        initialLayerConfig,
      );
      const newLayerGroupConfig = {
        ...initialLayerConfig,
        legendItemSources: draftLegends.legendItemSources,
        legendItemMainValues: draftLegends.legendItemMainValues,
      };
      const nextMapConfig = {
        ...mapConfig,
        layerGroupConfigs: {
          ...mapConfig.layerGroupConfigs,
          [insertedLayer.id]: newLayerGroupConfig,
        },
      };
      const legends = draftLegends.legends;

      if (legends.length > 0) {
        const { error: legendError } = await supabase
          .from("map_legend_items")
          .insert(
            legends.map((legend) => ({
              map_layer_id: insertedLayer.id,
              value: legend.value,
              label: legend.label,
              geometry_type: legend.geometryType,
              color: legend.color,
              fill_color: legend.fillColor,
              stroke_color: legend.strokeColor,
              stroke_width: legend.strokeWidth,
              fill_opacity: legend.fillOpacity,
              fill_pattern: legend.fillPattern,
              pattern_color: legend.patternColor,
              pattern_thickness: legend.patternThickness,
              pattern_opacity: legend.patternOpacity,
              pattern_gap: legend.patternGap,
              icon_path: legend.iconPath,
              icon_width: legend.pointSize,
              icon_height: legend.pointSize,
              sort_order: legend.sortOrder,
            })),
          );

        if (legendError) throw legendError;
      }

      await supabase
        .from("map_datasets")
        .update({ map_config: nextMapConfig })
        .eq("id", targetDatasetId);
      setMapConfig(nextMapConfig);

      setAlert("success");

      if (!mapDatasetId) {
        setPendingGeoJson(null);
        setPendingCsvFile(null);
        setPendingCsvRows([]);
        setPendingCsvColumns([]);
        setLatitudeColumn("");
        setLongitudeColumn("");
        onAddReadyChange?.(false);
        onCreated?.();
        return;
      }

      setPendingGeoJson(null);
      setPendingCsvFile(null);
      setPendingCsvRows([]);
      setPendingCsvColumns([]);
      setLatitudeColumn("");
      setLongitudeColumn("");
      onAddReadyChange?.(false);
      await fetchMapDataset();

      const params = new URLSearchParams(searchParams.toString());
      params.delete("action");
      params.set("view", "mapdataset");

      if (mountedRef.current) {
        router.replace(`${pathname}?${params.toString()}`, {
          scroll: false,
        });
      }
    } catch (error) {
      console.error("Failed to upload map GeoJSON:", error);
      setMessage(
        error instanceof Error ? error.message : "Gagal mengunggah GeoJSON.",
      );
      setAlert("failed");
    } finally {
      setSaving(false);
    }
  }, [
    dataset,
    draftMapDatasetId,
    fetchMapDataset,
    label,
    layers.length,
    mapConfig,
    mapDatasetId,
    onAddReadyChange,
    onCreated,
    ownerId,
    pendingGeoJson,
    pathname,
    router,
    searchParams,
  ]);

  const handleDropGeoJson = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();

    const file = event.dataTransfer.files?.[0];

    if (file) {
      void handleUploadGeoJson(file);
    }
  };

  const handleDropCsv = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();

    const file = event.dataTransfer.files?.[0];

    if (file) {
      handleUploadCsv(file);
    }
  };

  useEffect(() => {
    if (view !== "mapadd") return;

    onAddReadyChange?.(Boolean(pendingGeoJson));
  }, [onAddReadyChange, pendingGeoJson, view]);

  useEffect(() => {
    if (view !== "mapadd") return;
    if (saveData === lastHandledSave.current) return;

    lastHandledSave.current = saveData;

    if (saveData <= 0) return;

    setMapConfirmAction("add-layer");
  }, [saveData, savePendingGeoJson, view]);

  const handleSaveLegend = async () => {
    if (!mapDatasetId) return;

    setSaving(true);

    try {
      const layerIds = layers.map((layer) => layer.id);

      if (layerIds.length > 0) {
        const { error: deleteError } = await supabase
          .from("map_legend_items")
          .delete()
          .in("map_layer_id", layerIds);

        if (deleteError) throw deleteError;
      }

      const legendPayload = layers.flatMap((layer) =>
        getEffectiveLayerLegends(layer, mapConfig).map((legend) => ({
          map_layer_id: layer.id,
          value: legend.value,
          label: legend.label,
          geometry_type: legend.geometryType,
          color: legend.color,
          fill_color: legend.fillColor,
          stroke_color: legend.strokeColor,
          stroke_width: legend.strokeWidth,
          fill_opacity: legend.fillOpacity,
          fill_pattern: legend.fillPattern,
          pattern_color: legend.patternColor,
          pattern_thickness: legend.patternThickness,
          pattern_opacity: legend.patternOpacity,
          pattern_gap: legend.patternGap,
          icon_path: legend.iconPath,
          icon_width: legend.pointSize,
          icon_height: legend.pointSize,
          visible_by_default: !legend.labelOnly,
          sort_order: legend.sortOrder,
        })),
      );

      if (legendPayload.length > 0) {
        const { error: insertError } = await supabase
          .from("map_legend_items")
          .insert(legendPayload);

        if (insertError) throw insertError;
      }

      await Promise.all(
        layers.map(async (layer, index) => {
          const { error: layerUpdateError } = await supabase
            .from("map_layers")
            .update({
              name: layer.name.trim() || getLayerSourceName(layer),
              sort_order: index,
            })
            .eq("id", layer.id);

          if (layerUpdateError) throw layerUpdateError;
        }),
      );

      const { error: updateError } = await supabase
        .from("map_datasets")
        .update({
          label: label.trim() || dataset?.label,
          slug: toSlug(label.trim() || dataset?.label || ""),
          map_config: {
            ...mapConfig,
            layerPopupFields: resolvedLayerPopupFields,
          },
          documents_path: documents,
          pictures_path: pictures,
          import_status: "ready",
          draft_expires_at: null,
        })
        .eq("id", mapDatasetId);

      if (updateError) throw updateError;

      setAppliedMapPreview({
        layers,
        mapConfig: {
          ...mapConfig,
          layerPopupFields: resolvedLayerPopupFields,
        },
      });
      setPreviewMapBoundsTrigger((current) => current + 1);
      setSavedVisualizationSnapshot(currentVisualizationSnapshot);
      setAlert("success");
      onVisualizationSaved?.();
      await fetchMapDataset();
    } catch (error) {
      console.error("Failed to save map legend:", error);
      setAlert("failed");
    } finally {
      setSaving(false);
    }
  };

  const updateLayerLegend = (
    layerId: string,
    value: string,
    changes: Partial<MapLegendDraft>,
  ) => {
    setLayers((prev) =>
      prev.map((layer) => {
        if (layer.id !== layerId) return layer;

        const hasLegend = layer.legends.some((legend) => legend.value === value);

        if (hasLegend) {
          return {
            ...layer,
            legends: layer.legends.map((legend) =>
              legend.value === value ? { ...legend, ...changes } : legend,
            ),
          };
        }

        if (!layer.collection) return layer;

        const groupConfig = getLayerGroupConfig(mapConfig, layer);
        const draftLegend = createLayerLegendDrafts(
          layer.collection,
          groupConfig,
        ).legends.find((legend) => legend.value === value);

        if (!draftLegend) return layer;

        return {
          ...layer,
          legends: [...layer.legends, { ...draftLegend, ...changes }],
        };
      }),
    );
  };

  const moveLayerLegend = (
    layerId: string,
    legendValue: string,
    direction: "up" | "down",
  ) => {
    setLayers((prev) =>
      prev.map((item) => {
        if (item.id !== layerId || !item.collection) return item;

        const orderedLegends = getEffectiveLayerLegends(item, mapConfig);
        const currentIndex = orderedLegends.findIndex(
          (legend) => legend.value === legendValue,
        );

        if (currentIndex < 0) return item;

        const nextIndex =
          direction === "up" ? currentIndex - 1 : currentIndex + 1;

        if (nextIndex < 0 || nextIndex >= orderedLegends.length) return item;

        const nextLegends = [...orderedLegends];
        const [movedLegend] = nextLegends.splice(currentIndex, 1);

        if (!movedLegend) return item;

        nextLegends.splice(nextIndex, 0, movedLegend);

        return {
          ...item,
          legends: nextLegends.map((legend, index) => ({
            ...legend,
            sortOrder: index,
          })),
        };
      }),
    );
  };

  const moveLayerLegendGroup = (
    layerId: string,
    draggedValues: string[],
    targetValues: string[],
    position: "before" | "after",
  ) => {
    const draggedSet = new Set(draggedValues);
    const targetSet = new Set(targetValues);

    setLayers((prev) =>
      prev.map((item) => {
        if (item.id !== layerId || !item.collection) return item;

        const ordered = getEffectiveLayerLegends(item, mapConfig);
        const moved = ordered.filter((legend) => draggedSet.has(legend.value));
        const remaining = ordered.filter(
          (legend) => !draggedSet.has(legend.value),
        );
        if (!moved.length) return item;

        const targetIndexes = remaining
          .map((legend, index) => (targetSet.has(legend.value) ? index : -1))
          .filter((index) => index >= 0);
        if (!targetIndexes.length) return item;

        const insertIndex =
          position === "before"
            ? Math.min(...targetIndexes)
            : Math.max(...targetIndexes) + 1;
        const reordered = [...remaining];
        reordered.splice(insertIndex, 0, ...moved);

        return {
          ...item,
          legends: reordered.map((legend, index) => ({
            ...legend,
            sortOrder: index,
          })),
        };
      }),
    );
  };

  const updateLayerName = (layerId: string, name: string) => {
    setLayers((prev) =>
      prev.map((layer) =>
        layer.id === layerId
          ? {
              ...layer,
              name,
            }
          : layer,
      ),
    );
  };

  const scheduleLayerNameUpdate = (layerId: string, name: string) => {
    const currentTimer = layerNameUpdateTimersRef.current.get(layerId);

    if (currentTimer) window.clearTimeout(currentTimer);

    const nextTimer = window.setTimeout(() => {
      layerNameUpdateTimersRef.current.delete(layerId);
      updateLayerName(layerId, name);
    }, 500);

    layerNameUpdateTimersRef.current.set(layerId, nextTimer);
  };

  const commitLayerNameUpdate = (layerId: string, name: string) => {
    const currentTimer = layerNameUpdateTimersRef.current.get(layerId);

    if (currentTimer) window.clearTimeout(currentTimer);

    layerNameUpdateTimersRef.current.delete(layerId);
    updateLayerName(layerId, name);
  };


  const moveLayer = (layerId: string, direction: "up" | "down") => {
    setLayers((prev) => {
      const currentIndex = prev.findIndex((layer) => layer.id === layerId);

      if (currentIndex < 0) return prev;

      const nextIndex =
        direction === "up" ? currentIndex - 1 : currentIndex + 1;

      if (nextIndex < 0 || nextIndex >= prev.length) return prev;

      const nextLayers = [...prev];
      const [movedLayer] = nextLayers.splice(currentIndex, 1);

      if (!movedLayer) return prev;

      nextLayers.splice(nextIndex, 0, movedLayer);

      return nextLayers.map((layer, index) => ({
        ...layer,
        sort_order: index,
      }));
    });
  };

  const moveLayerToPosition = (
    draggedLayerId: string,
    targetLayerId: string,
    position: "before" | "after",
  ) => {
    if (draggedLayerId === targetLayerId) return;

    setLayers((prev) => {
      const draggedIndex = prev.findIndex((layer) => layer.id === draggedLayerId);
      const targetIndex = prev.findIndex((layer) => layer.id === targetLayerId);

      if (draggedIndex < 0 || targetIndex < 0) return prev;

      const nextLayers = [...prev];
      const [draggedLayer] = nextLayers.splice(draggedIndex, 1);

      if (!draggedLayer) return prev;

      const adjustedTargetIndex = nextLayers.findIndex(
        (layer) => layer.id === targetLayerId,
      );
      const insertIndex =
        position === "before" ? adjustedTargetIndex : adjustedTargetIndex + 1;

      nextLayers.splice(insertIndex, 0, draggedLayer);

      return nextLayers.map((layer, index) => ({
        ...layer,
        sort_order: index,
      }));
    });
  };

  const setGlobalLegendGroups = (groups: MapGlobalLegendGroup[]) => {
    setMapConfig((prev) => ({
      ...prev,
      globalLegend: {
        ...prev.globalLegend,
        selectedGroupId:
          prev.globalLegend.selectedGroupId &&
          groups.some((group) => group.id === prev.globalLegend.selectedGroupId)
            ? prev.globalLegend.selectedGroupId
            : "",
        groups,
      },
    }));
  };

  const updateGlobalLegendGroup = (
    groupId: string,
    updater: (group: MapGlobalLegendGroup) => MapGlobalLegendGroup,
  ) => {
    setGlobalLegendGroups(
      mapConfig.globalLegend.groups.map((group) =>
        group.id === groupId ? updater(group) : group,
      ),
    );
  };

  const addGlobalLegendGroup = () => {
    const id = createId("legend-group");
    const nextGroup: MapGlobalLegendGroup = {
      id,
      name: "",
      layerIds: [],
      columnByLayerId: {},
      geometries: {},
    };

    setShowGabungConfig(true);
    setMapConfig((prev) => ({
      ...prev,
      globalLegend: {
        ...prev.globalLegend,
        enabled: true,
        selectedGroupId: "",
        groups: showGabungConfig
          ? [...prev.globalLegend.groups, nextGroup]
          : [nextGroup],
      },
    }));
    setOpenGlobalLegendGroupId(id);
    setOpenLegendLayerId(null);
    setOpenLegendItemKey(null);
  };

  const removeGlobalLegendGroup = (groupId: string) => {
    const nextGroups = mapConfig.globalLegend.groups.filter(
      (group) => group.id !== groupId,
    );

    setGlobalLegendGroups(nextGroups);
    setShowGabungConfig(nextGroups.length > 0);

    if (openGlobalLegendGroupId === groupId) {
      setOpenGlobalLegendGroupId(null);
    }
  };

  const toggleGlobalLegendLayer = (
    groupId: string,
    layer: LoadedMapLayer,
    selected: boolean,
  ) => {
    updateGlobalLegendGroup(groupId, (group) => {
      const layerIds = selected
        ? Array.from(new Set([...group.layerIds, layer.id]))
        : group.layerIds.filter((id) => id !== layer.id);
      const columnByLayerId = { ...group.columnByLayerId };

      if (selected && !columnByLayerId[layer.id]) {
        columnByLayerId[layer.id] = getDefaultGroupField(layer.property_keys ?? []);
      }

      if (!selected) {
        delete columnByLayerId[layer.id];
      }

      return {
        ...group,
        layerIds,
        columnByLayerId,
      };
    });
  };

  const generateGlobalLegendItems = (groupId: string) => {
    updateGlobalLegendGroup(groupId, (group) => {
      const nextGeometries: MapGlobalLegendGroup["geometries"] = {};

      group.layerIds.forEach((layerId) => {
        const layer = layers.find((item) => item.id === layerId);
        const column = group.columnByLayerId[layerId];
        const geometryType = layer ? getLayerGeometryType(layer) : null;

        if (!layer?.collection || !column || !geometryType) return;

        layer.collection.features.forEach((feature) => {
          const rawValue = String(feature.properties?.[column] ?? "").trim();
          if (!rawValue) return;

          const geometryConfig =
            nextGeometries[geometryType] ??
            getGlobalLegendGeometryConfig(group, geometryType);
          const existingItem = geometryConfig.items.find(
            (item) => item.name.toLowerCase() === rawValue.toLowerCase(),
          );
          const mapping = { layerId, column, rawValue };

          if (existingItem) {
            if (
              !existingItem.rawMappings.some(
                (item) =>
                  item.layerId === mapping.layerId &&
                  item.column === mapping.column &&
                  item.rawValue === mapping.rawValue,
              )
            ) {
              existingItem.rawMappings.push(mapping);
            }
          } else {
            geometryConfig.items.push({
              id: createId("legend-item"),
              name: rawValue,
              showLabel: true,
              role: "main",
              parentMainGroupId: "",
              geometryType,
              rawMappings: [mapping],
              style: createDefaultGlobalLegendStyle(
                geometryType,
                geometryConfig.items.length,
              ),
              sortOrder: geometryConfig.items.length,
            });
          }

          nextGeometries[geometryType] = {
            ...geometryConfig,
            items: [...geometryConfig.items],
          };
        });
      });

      return {
        ...group,
        geometries: {
          ...group.geometries,
          ...nextGeometries,
        },
      };
    });
  };

  const updateGlobalLegendItem = (
    groupId: string,
    geometryType: MapGlobalLegendGeometryType,
    itemId: string,
    changes: Partial<MapGlobalLegendItem>,
  ) => {
    updateGlobalLegendGroup(groupId, (group) => {
      const geometryConfig = getGlobalLegendGeometryConfig(group, geometryType);

      return {
        ...group,
        geometries: {
          ...group.geometries,
          [geometryType]: {
            ...geometryConfig,
            items: geometryConfig.items.map((item) =>
              item.id === itemId ? { ...item, ...changes } : item,
            ),
          },
        },
      };
    });
  };

  const updateGlobalLegendItemStyle = (
    groupId: string,
    geometryType: MapGlobalLegendGeometryType,
    itemId: string,
    changes: Partial<MapGlobalLegendStyle>,
  ) => {
    updateGlobalLegendGroup(groupId, (group) => {
      const geometryConfig = getGlobalLegendGeometryConfig(group, geometryType);

      return {
        ...group,
        geometries: {
          ...group.geometries,
          [geometryType]: {
            ...geometryConfig,
            items: geometryConfig.items.map((item) =>
              item.id === itemId
                ? { ...item, style: { ...item.style, ...changes } }
                : item,
            ),
          },
        },
      };
    });
  };

  const mergeGlobalLegendItem = (
    groupId: string,
    geometryType: MapGlobalLegendGeometryType,
    sourceItemId: string,
    targetItemId: string,
  ) => {
    if (sourceItemId === targetItemId) return;

    updateGlobalLegendGroup(groupId, (group) => {
      const geometryConfig = getGlobalLegendGeometryConfig(group, geometryType);
      const sourceItem = geometryConfig.items.find(
        (item) => item.id === sourceItemId,
      );

      if (!sourceItem) return group;

      return {
        ...group,
        geometries: {
          ...group.geometries,
          [geometryType]: {
            ...geometryConfig,
            items: geometryConfig.items
              .filter((item) => item.id !== sourceItemId)
              .map((item) =>
                item.id === targetItemId
                  ? {
                      ...item,
                      rawMappings: [
                        ...item.rawMappings,
                        ...sourceItem.rawMappings.filter(
                          (mapping) =>
                            !item.rawMappings.some(
                              (existing) =>
                                existing.layerId === mapping.layerId &&
                                existing.column === mapping.column &&
                                existing.rawValue === mapping.rawValue,
                            ),
                        ),
                      ],
                    }
                  : item,
              ),
          },
        },
      };
    });
  };

  const assignGlobalLegendItemToNewMainGroup = (
    groupId: string,
    geometryType: MapGlobalLegendGeometryType,
    itemId: string,
    name: string,
  ) => {
    const cleanName = name.trim();
    if (!cleanName) return;

    updateGlobalLegendGroup(groupId, (group) => {
      const geometryConfig = getGlobalLegendGeometryConfig(group, geometryType);
      const existingGroup = geometryConfig.mainGroups.find(
        (item) => item.name.toLowerCase() === cleanName.toLowerCase(),
      );
      const mainGroup =
        existingGroup ?? ({
          id: createId("main-group"),
          name: cleanName,
          showLabel: true,
        } satisfies MapGlobalLegendMainGroup);

      return {
        ...group,
        geometries: {
          ...group.geometries,
          [geometryType]: {
            mainGroups: existingGroup
              ? geometryConfig.mainGroups
              : [...geometryConfig.mainGroups, mainGroup],
            items: geometryConfig.items.map((item) =>
              item.id === itemId
                ? {
                    ...item,
                    role: "sub",
                    parentMainGroupId: mainGroup.id,
                  }
                : item,
            ),
          },
        },
      };
    });
  };

  const setLayerPopupFields = (layerId: string, fields: MapPopupField[]) => {
    setMapConfig((prev) => ({
      ...prev,
      layerPopupFields: {
        ...prev.layerPopupFields,
        [layerId]: fields,
      },
    }));
  };

  const updateLayerPopupField = (
    layer: LoadedMapLayer,
    fieldName: string,
    changes: Partial<MapPopupField>,
  ) => {
    setLayerPopupFields(
      layer.id,
      getOrderedLayerPopupFields(layer).map((field) =>
        field.field === fieldName ? { ...field, ...changes } : field,
      ),
    );
  };

  const reorderLayerPopupField = (
    layer: LoadedMapLayer,
    fromField: string,
    toField: string,
    position: "before" | "after",
  ) => {
    if (fromField === toField) return;

    const orderedFields = getOrderedLayerPopupFields(layer);
    const fromIndex = orderedFields.findIndex(
      (field) => field.field === fromField,
    );
    const toIndex = orderedFields.findIndex(
      (field) => field.field === toField,
    );

    if (fromIndex < 0 || toIndex < 0) return;

    const nextFields = [...orderedFields];
    const [movedField] = nextFields.splice(fromIndex, 1);

    if (!movedField) return;

    const nextToIndex = nextFields.findIndex((field) => field.field === toField);

    if (nextToIndex < 0) return;

    nextFields.splice(
      position === "after" ? nextToIndex + 1 : nextToIndex,
      0,
      movedField,
    );
    setLayerPopupFields(layer.id, nextFields);
  };

  const moveLayerPopupField = (
    layer: LoadedMapLayer,
    fieldName: string,
    direction: "up" | "down",
  ) => {
    const orderedFields = getOrderedLayerPopupFields(layer);
    const currentIndex = orderedFields.findIndex(
      (field) => field.field === fieldName,
    );

    if (currentIndex < 0) return;

    const nextIndex =
      direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (nextIndex < 0 || nextIndex >= orderedFields.length) return;

    const nextFields = [...orderedFields];
    const [movedField] = nextFields.splice(currentIndex, 1);

    if (!movedField) return;

    nextFields.splice(nextIndex, 0, movedField);
    setLayerPopupFields(layer.id, nextFields);
  };

  const toggleFeatureColumn = (column: string) => {
    setVisibleFeatureColumns((prev) =>
      prev.includes(column)
        ? prev.filter((item) => item !== column)
        : [...prev, column],
    );
  };

  const setAllFeatureColumnsVisible = (visible: boolean) => {
    setVisibleFeatureColumns(visible ? featureColumns : []);
  };

  const persistFeatureColumnOrder = async (visibleOrder: string[]) => {
    if (!selectedLayer?.id) return;

    const columnOrder = [
      ...visibleOrder,
      ...featureColumns.filter((column) => !visibleOrder.includes(column)),
    ];
    const { error } = await supabase.from("table_view_preferences").upsert(
      {
        resource_kind: "map_layer",
        resource_id: selectedLayer.id,
        column_order: columnOrder,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,resource_kind,resource_id" },
    );

    if (error) {
      console.error("Failed to save map table column order:", error);
    }
  };

  const moveFeatureColumn = (column: string, direction: -1 | 1) => {
    const index = visibleFeatureColumns.indexOf(column);
    const targetIndex = index + direction;
    if (
      index < 0 ||
      targetIndex < 0 ||
      targetIndex >= visibleFeatureColumns.length
    ) {
      return;
    }

    const next = [...visibleFeatureColumns];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    setVisibleFeatureColumns(next);
    void persistFeatureColumnOrder(next);
  };

  const dropFeatureColumn = (
    event: DragEvent<HTMLTableCellElement>,
    targetColumn: string,
    position: "before" | "after",
  ) => {
    event.preventDefault();
    const sourceColumn =
      draggedFeatureColumn || event.dataTransfer.getData("text/plain");
    if (!sourceColumn || sourceColumn === targetColumn) {
      setDraggedFeatureColumn(null);
      setFeatureColumnDropTarget(null);
      return;
    }

    const sourceIndex = visibleFeatureColumns.indexOf(sourceColumn);
    const targetIndex = visibleFeatureColumns.indexOf(targetColumn);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const next = [...visibleFeatureColumns];
    const [moved] = next.splice(sourceIndex, 1);
    const adjustedTargetIndex =
      sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
    next.splice(
      position === "after" ? adjustedTargetIndex + 1 : adjustedTargetIndex,
      0,
      moved,
    );
    setVisibleFeatureColumns(next);
    void persistFeatureColumnOrder(next);
    setDraggedFeatureColumn(null);
    setFeatureColumnDropTarget(null);
  };

  const toggleFeatureSort = (column: string) => {
    setFeatureSort((prev) => {
      if (prev?.key !== column) {
        return { key: column, direction: "asc" };
      }

      if (prev.direction === "asc") {
        return { key: column, direction: "desc" };
      }

      return null;
    });
  };

  const isLayerVisible = (layerId: string) =>
    !mapConfig.hiddenMapLayerIds.includes(layerId);

  const visibleCalloutLayers = layers.filter((layer) =>
    isLayerVisible(layer.id),
  );

  const toggleLayerVisibility = (layerId: string, visible: boolean) => {
    setMapConfig((prev) => ({
      ...prev,
      hiddenMapLayerIds: visible
        ? prev.hiddenMapLayerIds.filter((id) => id !== layerId)
        : Array.from(new Set([...prev.hiddenMapLayerIds, layerId])),
    }));
  };

  const getLegendKey = (layerId: string, legendValue: string) =>
    `${layerId}:${legendValue}`;

  const toggleFeatureFilterValue = (column: string, value: string) => {
    const options = featureFilterOptions[column] ?? [];

    setFeatureFilters((prev) => {
      const selectedValues = prev[column] ?? options;
      const nextValues = selectedValues.includes(value)
        ? selectedValues.filter((item) => item !== value)
        : [...selectedValues, value];

      return {
        ...prev,
        [column]: nextValues,
      };
    });
  };

  const selectAllFeatureFilterValues = (
    column: string,
    selected: boolean,
  ) => {
    setFeatureFilters((prev) => ({
      ...prev,
      [column]: selected ? [...(featureFilterOptions[column] ?? [])] : [],
    }));
  };

  const updateFeatureCell = (
    layerId: string,
    rowIndex: number,
    column: string,
    value: string,
  ) => {
    setEditedFeatureCells((prev) =>
      Array.from(new Set([...prev, `${layerId}:${rowIndex}:${column}`])),
    );

    setLayers((prev) =>
      prev.map((layer) => {
        if (layer.id !== layerId || !layer.collection) return layer;

        return {
          ...layer,
          collection: {
            ...layer.collection,
            features: layer.collection.features.map((feature, index) =>
              index === rowIndex
                ? {
                    ...feature,
                    properties: {
                      ...(feature.properties ?? {}),
                      [column]: value,
                    },
                  }
                : feature,
            ),
          },
        };
      }),
    );
  };

  const toggleSelectedFeatureRow = (rowIndex: number) => {
    setSelectedFeatureRows((prev) =>
      prev.includes(rowIndex)
        ? prev.filter((item) => item !== rowIndex)
        : [...prev, rowIndex],
    );
  };

  const setAllVisibleFeatureRowsSelected = (selected: boolean) => {
    const visibleIndexes = visibleFeatureRows.map((row) => row.index);

    setSelectedFeatureRows((prev) => {
      if (!selected) {
        return prev.filter((index) => !visibleIndexes.includes(index));
      }

      return Array.from(new Set([...prev, ...visibleIndexes]));
    });
  };

  const uploadLayerCollection = async (
    layer: LoadedMapLayer,
    collection: FeatureCollection,
  ) => {
    if (!layer.source_path) {
      throw new Error("Lokasi file dataset tidak tersedia.");
    }

    const blob = new Blob([JSON.stringify(collection)], {
      type: "application/geo+json",
    });

    await uploadGeoJson(
      layer.source_path,
      blob,
      mapDatasetId
        ? { mapDatasetId, permission: "edit" }
        : undefined,
    );
  };

  const refreshMapDatasetSummary = async (
    nextLayers: LoadedMapLayer[],
    targetDatasetId: string,
  ) => {
    const collections = nextLayers
      .map((layer) => layer.collection)
      .filter((collection): collection is FeatureCollection => Boolean(collection));
    const nextBounds = collections.reduce<MapDatasetRow["bounds"]>(
      (bounds, collection) =>
        mergeBounds(bounds, getBoundsFromCollection(collection)),
      null,
    );
    const nextFeatureCount = collections.reduce(
      (count, collection) => count + collection.features.length,
      0,
    );

    const { error } = await supabase
      .from("map_datasets")
      .update({
        bounds: nextBounds,
        geojson_feature_count: nextFeatureCount,
      })
      .eq("id", targetDatasetId);

    if (error) throw error;
  };

  const saveFeatureEdits = async () => {
    if (!mapDatasetId) return;

    setSaving(true);

    try {
      await Promise.all(
        layers
          .filter((layer) => Boolean(layer.collection))
          .map(async (layer) => {
            await uploadLayerCollection(
              layer,
              layer.collection as FeatureCollection,
            );
            const { error } = await supabase
              .from("map_layers")
              .update({ property_keys: layer.property_keys })
              .eq("id", layer.id);

            if (error) throw error;
          }),
      );

      const nextLabel = label.trim();
      if (nextLabel && nextLabel !== dataset?.label) {
        const { error } = await supabase
          .from("map_datasets")
          .update({ label: nextLabel, slug: toSlug(nextLabel) })
          .eq("id", mapDatasetId);

        if (error) throw error;
      }

      setEditedFeatureCells([]);
      setAlert("success");
      await fetchMapDataset();
    } catch (error) {
      console.error("Failed to save map feature edits:", error);
      setMessage("Gagal menyimpan perubahan dataset.");
      setAlert("failed");
    } finally {
      setSaving(false);
    }
  };

  const deleteSelectedFeatures = async () => {
    if (!mapDatasetId || !selectedLayer) return;

    if (!deleteSelectedLayer && selectedFeatureRows.length === 0) {
      setMessage("Pilih feature yang ingin dihapus.");
      setAlert("invalid");
      return;
    }

    setSaving(true);

    try {
      let nextLayers = layers;

      if (deleteSelectedLayer) {
        const { error: deleteLayerError } = await supabase
          .from("map_layers")
          .delete()
          .eq("id", selectedLayer.id);

        if (deleteLayerError) throw deleteLayerError;

        if (selectedLayer.source_path) {
          const { error: removeError } = await supabase.storage
            .from("geojsons")
            .remove([selectedLayer.source_path]);

          if (removeError) {
            console.warn("Failed to remove deleted map layer source:", removeError);
          }
        }

        nextLayers = layers.filter((layer) => layer.id !== selectedLayer.id);
      } else if (selectedLayer.collection) {
        const selectedIndexes = new Set(selectedFeatureRows);
        const nextCollection: FeatureCollection = {
          ...selectedLayer.collection,
          features: selectedLayer.collection.features.filter(
            (_, index) => !selectedIndexes.has(index),
          ),
        };

        await uploadLayerCollection(selectedLayer, nextCollection);

        const nextPropertyKeys = getFeaturePropertyKeys(nextCollection);
        const { error: updateLayerError } = await supabase
          .from("map_layers")
          .update({
            feature_count: nextCollection.features.length,
            property_keys: nextPropertyKeys,
          })
          .eq("id", selectedLayer.id);

        if (updateLayerError) throw updateLayerError;

        nextLayers = layers.map((layer) =>
          layer.id === selectedLayer.id
            ? {
                ...layer,
                collection: nextCollection,
                feature_count: nextCollection.features.length,
                property_keys: nextPropertyKeys,
              }
            : layer,
        );
      }

      await refreshMapDatasetSummary(nextLayers, mapDatasetId);
      setSelectedFeatureRows([]);
      setDeleteSelectedLayer(false);
      setAlert("success");
      await fetchMapDataset();
    } catch (error) {
      console.error("Failed to delete map features:", error);
      setMessage("Gagal menghapus layer.");
      setAlert("failed");
    } finally {
      setSaving(false);
    }
  };

  const requestDeleteConfirmation = () => {
    if (!selectedLayer) return;

    if (deleteSelectedLayer) {
      setDeleteConfirm("dataset");
      return;
    }

    if (selectedFeatureRows.length === 0) {
      setMessage("Pilih data yang ingin dihapus.");
      setAlert("invalid");
      return;
    }

    setDeleteConfirm("features");
  };

  useEffect(() => {
    if (view !== "mapdataset") return;
    if (saveData === lastHandledSave.current) return;

    lastHandledSave.current = saveData;

    if (saveData <= 0) return;

    if (action === "edit") {
      setMapConfirmAction("edit-layer");
      return;
    }

    if (action === "delete") {
      requestDeleteConfirmation();
    }
  }, [action, requestDeleteConfirmation, saveData, saveFeatureEdits, view]);

  const renderFeatureHeaderMenu = (column: string, columnIndex: number) => {
    const options = featureFilterOptions[column] ?? [];
    const selectedValues = featureFilters[column] ?? options;
    const allSelected =
      options.length > 0 && selectedValues.length === options.length;

    return (
      <div className="relative">
        <div className="flex items-center justify-between lg:hidden">
          <button
            type="button"
            aria-label={`Geser ${column} ke kiri`}
            disabled={columnIndex === 0}
            onClick={() => moveFeatureColumn(column, -1)}
            className="shrink-0 rounded p-1 hover:bg-sky-200 disabled:opacity-25"
          >
            <LeftChevron className="size-4" />
          </button>
          <button
            type="button"
            onClick={() =>
              setOpenFeatureHeaderMenu((prev) =>
                prev === column ? null : column,
              )
            }
            className="min-w-0 grow rounded py-1 text-center hover:bg-sky-200"
          >
            {column}
          </button>
          <button
            type="button"
            aria-label={`Geser ${column} ke kanan`}
            disabled={columnIndex === activeFeatureColumns.length - 1}
            onClick={() => moveFeatureColumn(column, 1)}
            className="shrink-0 rounded p-1 hover:bg-sky-200 disabled:opacity-25"
          >
            <RightChevron className="size-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={() =>
            setOpenFeatureHeaderMenu((prev) =>
              prev === column ? null : column,
            )
          }
          className="relative hidden w-full items-center justify-center gap-2 rounded px-7 py-1 text-left hover:bg-sky-200 lg:flex"
        >
          <span
            draggable
            aria-label={`Geser kolom ${column}`}
            title="Geser kolom"
            onClick={(event) => event.stopPropagation()}
            onDragStart={(event) => {
              event.stopPropagation();
              setDraggedFeatureColumn(column);
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", column);
            }}
            onDragEnd={() => {
              setDraggedFeatureColumn(null);
              setFeatureColumnDropTarget(null);
            }}
            className="absolute left-0 cursor-grab rounded p-0.5 active:cursor-grabbing"
          >
            <Draggable className="size-4" />
          </span>
          <span>{column}</span>
          <DownChevron className="h-3 w-3 shrink-0" />
        </button>

        {openFeatureHeaderMenu === column && (
          <div className="absolute left-0 top-full z-30 mt-1 w-64 rounded-md border border-gray-300 bg-white p-3 text-left text-xs text-gray-700 shadow-lg">
            <div className="mb-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setFeatureSort({ key: column, direction: "asc" });
                  setOpenFeatureHeaderMenu(null);
                }}
                className="rounded border border-sky-600 px-2 py-1 font-medium text-sky-700 hover:bg-sky-50"
              >
                Sort A-Z
              </button>

              <button
                type="button"
                onClick={() => {
                  setFeatureSort({ key: column, direction: "desc" });
                  setOpenFeatureHeaderMenu(null);
                }}
                className="rounded border border-sky-600 px-2 py-1 font-medium text-sky-700 hover:bg-sky-50"
              >
                Sort Z-A
              </button>
            </div>

            <div className="mb-2 flex items-center gap-2">
              {!allSelected && (
                <button
                  type="button"
                  onClick={() => selectAllFeatureFilterValues(column, true)}
                  className="rounded border border-gray-300 px-2 py-1 hover:bg-gray-100"
                >
                  Pilih Semua
                </button>
              )}

              {selectedValues.length > 0 && (
                <button
                  type="button"
                  onClick={() => selectAllFeatureFilterValues(column, false)}
                  className="rounded border border-gray-300 px-2 py-1 hover:bg-gray-100"
                >
                  Hapus Semua
                </button>
              )}
            </div>

            <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
              {options.map((option) => (
                <label
                  key={`${column}-${option}`}
                  className="flex items-center gap-2"
                >
                  <input
                    type="checkbox"
                    checked={selectedValues.includes(option)}
                    onChange={() => toggleFeatureFilterValue(column, option)}
                  />
                  <span className="break-words">
                    {option === "" ? "N/A" : option}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const regenerateLayerLegends = (
    layerId: string,
    groupConfig: MapLayerGroupConfig,
  ) => {
    setLayers((prev) =>
      prev.map((layer) => {
        if (layer.id !== layerId || !layer.collection) return layer;

        const { legends: nextLegends } = createLayerLegendDrafts(
          layer.collection,
          groupConfig,
        );

        return {
          ...layer,
          legends: nextLegends.map((legend) => {
            const existing = layer.legends.find(
              (item) => item.value === legend.value,
            );

            return existing ?? legend;
          }),
        };
      }),
    );
  };

  const updateLayerGroupConfig = (
    layer: LoadedMapLayer,
    changes: Partial<MapLayerGroupConfig>,
  ) => {
    const currentConfig = getLayerGroupConfig(mapConfig, layer);
    let nextConfig = {
      ...currentConfig,
      ...changes,
    };

    if (changes.useSubGroup === false) {
      nextConfig = {
        ...nextConfig,
        subGroupField: nextConfig.subGroupField,
      };
    }

    if (layer.collection) {
      const draft = createLayerLegendDrafts(layer.collection, nextConfig);
      const previousSources =
        changes.useSubGroup === false ? {} : nextConfig.legendItemSources;

      nextConfig = {
        ...nextConfig,
        legendItemSources: Object.fromEntries(
          Object.entries(draft.legendItemSources).map(([value, source]) => [
            value,
            previousSources[value] ?? source,
          ]),
        ),
        legendItemMainValues: draft.legendItemMainValues,
        mainGroupAliases: getMainGroupAliasesWithDefaults(nextConfig, draft),
      };
    }

    setMapConfig((prev) => ({
      ...prev,
      layerGroupConfigs: {
        ...prev.layerGroupConfigs,
        [layer.id]: nextConfig,
      },
    }));
    regenerateLayerLegends(layer.id, nextConfig);
  };

  const updateLayerTableConfig = (
    layer: LoadedMapLayer,
    changes: Partial<MapLayerTableConfig>,
  ) => {
    const currentConfig = getLayerTableConfig(mapConfig, layer);

    setMapConfig((prev) => ({
      ...prev,
      layerTableConfigs: {
        ...prev.layerTableConfigs,
        [layer.id]: {
          ...currentConfig,
          ...changes,
        },
      },
    }));
  };

  const addMapLink = () => {
    const link: MapLink = {
      id: crypto.randomUUID(),
      name: "",
      address: "",
      iconPath: null,
      style: "filled",
    };

    setMapConfig((prev) => ({
      ...prev,
      links: [...prev.links, link],
    }));
  };

  const updateMapLink = (linkId: string, changes: Partial<MapLink>) => {
    setMapConfig((prev) => ({
      ...prev,
      links: prev.links.map((link) =>
        link.id === linkId ? { ...link, ...changes } : link,
      ),
    }));
  };

  const deleteMapLink = (linkId: string) => {
    setMapConfig((prev) => ({
      ...prev,
      links: prev.links.filter((link) => link.id !== linkId),
    }));
  };

  const uploadMapLinkIcon = async (linkId: string, file: File) => {
    const isAllowed =
      ["image/jpeg", "image/png"].includes(file.type) ||
      /\.(jpe?g|png)$/i.test(file.name);

    if (!isAllowed) {
      setMessage("Ikon tautan harus berupa JPG, JPEG, atau PNG.");
      setAlert("invalid");
      return;
    }

    try {
      const attachment = await uploadAttachment(
        "images",
        `map_links/${mapDatasetId || draftMapDatasetId || "draft"}`,
        file,
      );
      updateMapLink(linkId, { iconPath: attachment.path });
    } catch (error) {
      console.error("Failed to upload map link icon:", error);
      setMessage("Gagal mengunggah ikon tautan.");
      setAlert("failed");
    }
  };

  const handleUploadLegendIcon = async (
    layerId: string,
    legendValue: string,
    file: File,
  ) => {
    const isAllowedIcon =
      file.type === "image/png" ||
      file.type === "image/svg+xml" ||
      file.name.match(/\.(png|svg)$/i);

    if (!isAllowedIcon) {
      setMessage("Ikon legenda harus SVG atau PNG.");
      setAlert("invalid");
      return;
    }

    if (file.size > MAP_ICON_MAX_SIZE_BYTES) {
      setMessage(`Ukuran ikon maksimal ${MAP_ICON_MAX_SIZE_LABEL}.`);
      setAlert("invalid");
      return;
    }

    try {
      const attachment = await uploadAttachment(
        "images",
        `map_icons/${mapDatasetId || draftMapDatasetId || "draft"}`,
        file,
      );

      updateLayerLegend(layerId, legendValue, {
        iconPath: attachment.path,
      });
    } catch (error) {
      console.error("Failed to upload legend icon:", error);
      setAlert("failed");
    }
  };

  const handleUploadDocuments = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);

    try {
      const uploaded = await Promise.all(
        files
          .filter((file) => file.type === "application/pdf")
          .map((file) =>
            uploadAttachment("documents", `${mapDatasetId || "new"}`, file),
          ),
      );

      setDocuments((prev) => [...prev, ...uploaded]);
    } catch (error) {
      console.error("Failed to upload documents:", error);
      setAlert("failed");
    } finally {
      event.target.value = "";
    }
  };

  const handleUploadPictures = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);

    try {
      const uploaded = await Promise.all(
        files
          .filter((file) => file.type.match(/^image\/(png|jpeg)$/))
          .map((file) =>
            uploadAttachment("images", `map_items/${mapDatasetId || "new"}/pictures`, file),
          ),
      );

      setPictures((prev) => [...prev, ...uploaded]);
    } catch (error) {
      console.error("Failed to upload pictures:", error);
      setAlert("failed");
    } finally {
      event.target.value = "";
    }
  };

  const handleDeleteAttachment = async (
    bucket: "documents" | "images",
    attachment: MapAttachment,
    type: "document" | "picture",
  ) => {
    await supabase.storage.from(bucket).remove([attachment.path]);

    if (type === "document") {
      setDocuments((prev) => prev.filter((item) => item.path !== attachment.path));
    } else {
      setPictures((prev) => prev.filter((item) => item.path !== attachment.path));
    }
  };

  const toggleTag = (tag: string) => {
    setPublicationTags((prev) =>
      prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag],
    );
  };

  const togglePublicationDataRegency = (regency: string) => {
    setPublicationDataRegencies((current) =>
      current.includes(regency)
        ? current.filter((item) => item !== regency)
        : [...current, regency],
    );
  };

  const togglePublicationDataKkpd = (area: string) => {
    setPublicationDataKkpd((current) =>
      current.includes(area)
        ? current.filter((item) => item !== area)
        : [...current, area],
    );
  };

  const togglePublicationDataSubWpp = (subWpp: string) => {
    setPublicationDataSubWpp((current) =>
      current.includes(subWpp)
        ? current.filter((item) => item !== subWpp)
        : [...current, subWpp],
    );
  };

  const uploadPublicationImage = async () => {
    if (!publicationImageFile) return publicationImagePath;

    const attachment = await uploadAttachment(
      "images",
      `map_items/${mapDatasetId}/publication`,
      publicationImageFile,
    );

    return attachment.path;
  };

  const requestPublicationSnapshot = async () => {
    if (!mapDatasetId) return null;

    return new Promise<string | null>((resolve) => {
      publicationSnapshotResolverRef.current = resolve;
      setPublicationSnapshotTrigger((current) => current + 1);

      window.setTimeout(() => {
        if (publicationSnapshotResolverRef.current === resolve) {
          publicationSnapshotResolverRef.current = null;
          resolve(null);
        }
      }, 4000);
    });
  };

  const uploadPublicationSnapshot = async (snapshotDataUrl: string | null) => {
    if (!snapshotDataUrl || !mapDatasetId) return publicationImagePath;

    const blob = dataUrlToBlob(snapshotDataUrl);
    const path = `map_items/${mapDatasetId}/publication/${toSlug(
      label || mapDatasetId,
    )}-${getUploadTimestamp()}.png`;

    const { error } = await supabase.storage.from("images").upload(path, blob, {
      upsert: true,
      contentType: "image/png",
    });

    if (error) throw error;

    return path;
  };

  const handlePublicationSnapshot = useCallback((dataUrl: string | null) => {
    if (dataUrl) {
      setPublicationSnapshotPreview(dataUrl);
    }

    publicationSnapshotResolverRef.current?.(dataUrl);
    publicationSnapshotResolverRef.current = null;
  }, []);

  const refreshPublicationSnapshot = async () => {
    setRefreshingPublicationSnapshot(true);

    try {
      const snapshotDataUrl = await requestPublicationSnapshot();

      if (!snapshotDataUrl) {
        throw new Error("Snapshot peta tidak berhasil dibuat.");
      }

      const blob = dataUrlToBlob(snapshotDataUrl);
      const snapshotFile = new File(
        [blob],
        `${toSlug(label || mapDatasetId || "peta")}-snapshot.png`,
        { type: "image/png" },
      );

      setPublicationImageFile(snapshotFile);
      setPublicationSnapshotPreview(snapshotDataUrl);
    } catch (error) {
      console.error("Failed to refresh publication snapshot:", error);
      setMessage("Gagal memperbarui snapshot peta.");
      setAlert("failed");
    } finally {
      setRefreshingPublicationSnapshot(false);
    }
  };

  const requestPublicationStatusChange = (
    nextStatus: EditablePublicationStatus,
  ) => {
    if (nextStatus === publicationStatus) return;

    setPendingPublicationStatus(nextStatus);
  };

  const handleConfirmPublicationStatusChange = async (
    confirmation?: boolean,
  ) => {
    if (confirmation === false) {
      setPendingPublicationStatus(null);
      return;
    }

    if (!pendingPublicationStatus || !mapDatasetId) {
      setPendingPublicationStatus(null);
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from("map_datasets")
        .update({
          published: pendingPublicationStatus,
        })
        .eq("id", mapDatasetId);

      if (error) throw error;

      setPublicationStatus(pendingPublicationStatus);
      setPendingPublicationStatus(null);
      setMessage("Status publikasi berhasil diubah.");
      setAlert("success");
    } catch (error) {
      console.error("Failed to update map publication status:", error);
      setMessage("Gagal mengubah status publikasi.");
      setAlert("failed");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!publicationImageFile) {
      setPublicationImagePreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(publicationImageFile);
    setPublicationImagePreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [publicationImageFile]);

  useEffect(() => {
    if (view !== "publication") return;
    if (publicationImagePath || publicationImageFile) return;

    const timeout = window.setTimeout(() => {
      setPublicationSnapshotTrigger((current) => current + 1);
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [publicationImageFile, publicationImagePath, view]);

  const handleSubmitPublication = async () => {
    if (
      !mapDatasetId ||
      !label.trim() ||
      publicationTags.length === 0 ||
      publicationDataRegencies.length === 0
    ) {
      setAlert("invalid");
      return;
    }

    setSaving(true);

    try {
      const uploadedImagePath = await uploadPublicationImage();
      const snapshotDataUrl = publicationImageFile
        ? null
        : await requestPublicationSnapshot();
      const imagePath = publicationImageFile
        ? uploadedImagePath
        : await uploadPublicationSnapshot(snapshotDataUrl);

      const { error } = await supabase
        .from("map_datasets")
        .update({
          label: label.trim(),
          slug: toSlug(label.trim()),
          tag: publicationTags,
          data_regency: publicationDataRegencies,
          data_subwpp:
            publicationInSubWpp && publicationDataSubWpp.length > 0
              ? publicationDataSubWpp
              : null,
          data_kkpd:
            publicationInKkpd && publicationDataKkpd.length > 0
              ? publicationDataKkpd
              : null,
          description: publicationDescription.trim(),
          image_path: imagePath,
          published: "requested",
        })
        .eq("id", mapDatasetId);

      if (error) throw error;

      setPublicationImagePath(imagePath ?? null);
      setPublicationImageFile(null);
      setPublicationImagePreviewUrl(null);
      setSavedPublicationSnapshot(
        buildPublicationSnapshot(
          label.trim(),
          publicationTags,
          publicationDataRegencies,
          publicationInSubWpp ? publicationDataSubWpp : [],
          publicationInKkpd ? publicationDataKkpd : [],
          publicationDescription.trim(),
          imagePath ?? null,
        ),
      );
      setPublicationStatus("requested");
      setShowPublicationForm(true);
      setAlert("success");
    } catch (error) {
      console.error("Failed to submit map publication:", error);
      setAlert("failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadCsv = () => {
    const collections = layers
      .map((layer) => layer.collection)
      .filter((collection): collection is FeatureCollection => Boolean(collection));

    downloadText(`${toSlug(label || "map-data")}.csv`, collectionToCsv(collections));
  };

  const isPublished = publicationStatus !== null;
  const visualizationButtonLabel = isPublished
    ? `Update Visualisasi (${visualizationChangeCount})`
    : "Simpan Visualisasi";
  const publicationChangeCount = countPublicationChanges(
    buildPublicationSnapshot(
      label,
      publicationTags,
      publicationDataRegencies,
      publicationInSubWpp ? publicationDataSubWpp : [],
      publicationInKkpd ? publicationDataKkpd : [],
      publicationDescription,
      publicationImagePath,
    ),
    savedPublicationSnapshot,
    Boolean(publicationImageFile),
  );
  const publicationButtonLabel = isPublished
    ? `Update Publikasi${
        publicationChangeCount > 0 ? ` (${publicationChangeCount})` : ""
      }`
    : "Ajukan Publikasi";
  const publicationPreviewImageSrc =
    publicationImagePreviewUrl ||
    (publicationImagePath ? getPublicImageUrl(publicationImagePath) : "") ||
    publicationSnapshotPreview;

  const getMapConfirmMessage = (confirmAction: MapConfirmAction) => {
    if (confirmAction === "add-layer") {
      if (csvInvalidCoordinateRowCount > 0) {
        return `Terdapat ${csvInvalidCoordinateRowCount} baris bermasalah dan tidak dapat disimpan. Tetap lanjutkan simpan data ?`;
      }

      return "Simpan (1) layer ini?";
    }

    if (confirmAction === "edit-layer") {
      return `Simpan (${featureEditChangeCount}) perubahan layer ini?`;
    }

    if (confirmAction === "visualization") {
      return isPublished
        ? `Update visualisasi peta ini (${visualizationChangeCount} perubahan)?`
        : "Simpan visualisasi peta ini?";
    }

    if (isPublished) {
      return publicationChangeCount > 0
        ? `Update publikasi peta ini (${publicationChangeCount} perubahan)?`
        : "Update publikasi peta ini?";
    }

    return "Ajukan publikasi peta ini?";
  };

  const handleMapConfirmAction = (confirmAction: MapConfirmAction) => {
    if (confirmAction === "add-layer") {
      void savePendingGeoJson();
      return;
    }

    if (confirmAction === "edit-layer") {
      void saveFeatureEdits();
      return;
    }

    if (confirmAction === "visualization") {
      void handleSaveLegend();
      return;
    }

    void handleSubmitPublication();
  };

  if (loading) {
    return (
      <div className="flex min-h-40 w-full items-center justify-center">
        <SpinnerLoading size="sm" color="black" />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      {view === "mapadd" && (
        <section className="flex flex-col gap-5">
          {!mapDatasetId && (
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium">Judul Peta</span>
              <input
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                placeholder="Contoh: Sebaran Pelabuhan Perikanan"
                className="rounded-md border border-stone-300 p-2"
              />
            </label>
          )}

          <div className="flex w-full flex-wrap gap-3">
            <Button
              variant={mapAddSource === "geojson" ? "outline" : "primary"}
              size="md"
              onClick={() => {
                setMapAddSource("geojson");
                resetPendingMapAdd();
              }}
            >
              GeoJSON
            </Button>

            <Button
              variant={mapAddSource === "csv" ? "outline" : "primary"}
              size="md"
              onClick={() => {
                setMapAddSource("csv");
                resetPendingMapAdd();
              }}
            >
              CSV
            </Button>
          </div>

          <input
            ref={geojsonInputRef}
            type="file"
            accept=".geojson,.json,application/geo+json,application/json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];

              if (file) void handleUploadGeoJson(file);

              event.target.value = "";
            }}
          />

          <input
            ref={csvInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];

              if (file) handleUploadCsv(file);

              event.target.value = "";
            }}
          />

          {mapAddSource === "geojson" ? (
            <button
              type="button"
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDropGeoJson}
              onClick={() => geojsonInputRef.current?.click()}
              className="flex min-h-[50vh] cursor-pointer flex-col items-center justify-center rounded-lg border-5 border-dashed border-gray-300 bg-white p-6 text-center transition hover:bg-gray-50"
            >
              <p className="text-2xl font-medium text-gray-700">
                Drag GeoJSON ke sini atau klik untuk pilih file
              </p>

              <p className="mt-1 text-lg text-gray-500">
                Hanya .geojson atau .json. Setelah file dipilih, peta akan
                dibuat dan legenda dapat diatur dari halaman dataset.
              </p>
            </button>
          ) : (
            <>
              <button
                type="button"
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDropCsv}
                onClick={() => csvInputRef.current?.click()}
                className="flex min-h-[40vh] cursor-pointer flex-col items-center justify-center rounded-lg border-5 border-dashed border-gray-300 bg-white p-6 text-center transition hover:bg-gray-50"
              >
                <p className="text-2xl font-medium text-gray-700">
                  Drag CSV ke sini atau klik untuk pilih file
                </p>

                <p className="mt-1 text-lg text-gray-500">
                  Gunakan kolom Latitude dan Longitude, atau X dan Y, yang
                  berisi angka koordinat.
                </p>
              </button>

              {pendingCsvFile && (
                <div className="flex flex-col gap-3 rounded-md border border-stone-200 bg-white p-4">
                  <div className="grid gap-2 text-sm md:grid-cols-[10rem_1fr] md:items-start">
                    <span className="font-medium text-gray-700">Latitude</span>
                    <div className="flex flex-col gap-1">
                      <select
                        value={latitudeColumn}
                        onChange={(event) => setLatitudeColumn(event.target.value)}
                        className="rounded-md border border-stone-300 px-3 py-2"
                      >
                        <option value="">Pilih Kolom</option>
                        {pendingCsvColumns.map((column) => (
                          <option key={`lat-${column}`} value={column}>
                            {column}
                          </option>
                        ))}
                      </select>

                      {latitudeColumn &&
                        longitudeColumn &&
                        latitudeCoordinateStats.hasFatalError && (
                        <p className="text-xs font-medium text-red-600">
                          Kolom ini tidak berisi angka latitude yang valid
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-2 text-sm md:grid-cols-[10rem_1fr] md:items-start">
                    <span className="font-medium text-gray-700">Longitude</span>
                    <div className="flex flex-col gap-1">
                      <select
                        value={longitudeColumn}
                        onChange={(event) =>
                          setLongitudeColumn(event.target.value)
                        }
                        className="rounded-md border border-stone-300 px-3 py-2"
                      >
                        <option value="">Pilih Kolom</option>
                        {pendingCsvColumns.map((column) => (
                          <option key={`lon-${column}`} value={column}>
                            {column}
                          </option>
                        ))}
                      </select>

                      {latitudeColumn &&
                        longitudeColumn &&
                        longitudeCoordinateStats.hasFatalError && (
                        <p className="text-xs font-medium text-red-600">
                          Kolom ini tidak berisi angka longitude yang valid
                        </p>
                      )}
                    </div>
                  </div>

                </div>
              )}
            </>
          )}

          {csvInvalidCoordinateRowCount > 0 && (
            <div className="rounded-md border border-orange-200 bg-orange-50 p-3 text-sm font-medium text-orange-700">
              Warning : {csvInvalidCoordinateRowCount} baris tidak dapat
              disimpan karena koordinat tidak sesuai atau kosong
            </div>
          )}

          {pendingGeoJson && (
            <div className="rounded-md border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800">
              {draftMapDatasetId && !mapDatasetId
                ? `Draft tersimpan: ${pendingGeoJson.file.name}`
                : `File siap disimpan: ${pendingGeoJson.file.name}`}
            </div>
          )}

          {action === "list" && mapDatasetId && pendingGeoJson && (
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                color="grey"
                onClick={cancelPendingMapAdd}
                fullWidth
                className="rounded-md"
              >
                Batal
              </Button>

              <Button
                onClick={() => setMapConfirmAction("add-layer")}
                loading={saving}
                fullWidth
                className="rounded-md"
              >
                Simpan (1) Layer
              </Button>
            </div>
          )}
        </section>
      )}

      {view === "mapdataset" && (
        <div className="w-full">
          {action === "edit" && (
            <label className="mb-4 flex flex-col gap-1 text-sm">
              <span className="font-semibold text-gray-700">Judul Peta</span>
              <input
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                placeholder="Judul peta"
                className="rounded-md border border-gray-400 px-3 py-2"
              />
            </label>
          )}

          <div className="mb-4 flex flex-row flex-wrap gap-3">
            <label className="flex min-w-0 flex-1 grow flex-col gap-1 text-xs">
              <span className="font-semibold text-gray-700">
                Layer
              </span>
              <div className="flex items-center gap-2">
                <select
                  value={selectedLayer?.id ?? ""}
                  onChange={(event) => {
                    setSelectedLayerId(event.target.value);
                    setSelectedFeatureRows([]);
                    setDeleteSelectedLayer(false);
                  }}
                  className="min-w-0 flex-1 rounded border border-gray-400 px-3 py-2 text-xs"
                >
                  {layers.map((layer) => (
                    <option key={layer.id} value={layer.id}>
                      {layer.name}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            <details
              data-field-dropdown="true"
              open={openFeatureColumnMenu}
              className="group relative min-w-0 flex-1 grow self-end text-xs"
            >
              <summary
                onClick={(event) => {
                  event.preventDefault();
                  setOpenFeatureColumnMenu((prev) => !prev);
                }}
                className="cursor-pointer rounded-sm border border-gray-400 bg-white px-3 py-2 text-xs group-open:border-2 group-open:border-black"
              >
                Kolom ({activeFeatureColumns.length}/{featureColumns.length})
              </summary>

              {openFeatureColumnMenu && (
                <div className="absolute left-0 z-30 mt-1 w-72 rounded-md border border-gray-300 bg-white p-3 text-xs text-gray-700 shadow-lg">
                  <div className="mb-2 flex gap-2">
                    {activeFeatureColumns.length < featureColumns.length && (
                      <button
                        type="button"
                        onClick={() => setAllFeatureColumnsVisible(true)}
                        className="rounded border border-gray-300 px-2 py-1 hover:bg-gray-100"
                      >
                        Pilih Semua
                      </button>
                    )}

                    {activeFeatureColumns.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setAllFeatureColumnsVisible(false)}
                        className="rounded border border-gray-300 px-2 py-1 hover:bg-gray-100"
                      >
                        Hapus Semua
                      </button>
                    )}
                  </div>

                  <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                    {featureColumns.map((column) => (
                      <label key={column} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={visibleFeatureColumns.includes(column)}
                          onChange={() => toggleFeatureColumn(column)}
                        />
                        <span>{column}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </details>
          </div>

          {action === "delete" && selectedLayer && (
            <label className="mb-4 flex w-full items-center gap-3 rounded-md border border-stone-200 bg-white px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={deleteSelectedLayer}
                onChange={(event) => {
                  setDeleteSelectedLayer(event.target.checked);
                  if (event.target.checked) {
                    setSelectedFeatureRows([]);
                  }
                }}
                aria-label={`Hapus layer ${selectedLayer.name}`}
              />
              <span className="min-w-0 flex-1 truncate font-semibold text-stone-800">
                {selectedLayer.name}
              </span>
            </label>
          )}

          <div className="relative mb-6 min-h-[60vh] rounded-sm border border-gray-950/20">
            <div className="min-h-[60vh] overflow-x-auto">
              <table className="min-w-full lg:text-sm md:text-[1.5vw] text-[2vw]">
                <thead>
                  <tr>
                    {action === "delete" && (
                      <th className="w-12 border border-gray-400 bg-sky-100 px-0 py-2">
                        <span className="sr-only">Pilih</span>
                      </th>
                    )}

                    {activeFeatureColumns.map((column, columnIndex) => (
                      <th
                        key={column}
                        onDragOver={(event) => {
                          if (action !== "list" || !draggedFeatureColumn) return;
                          event.preventDefault();
                          const bounds =
                            event.currentTarget.getBoundingClientRect();
                          setFeatureColumnDropTarget({
                            column,
                            position:
                              event.clientX < bounds.left + bounds.width / 2
                                ? "before"
                                : "after",
                          });
                        }}
                        onDrop={(event) =>
                          dropFeatureColumn(
                            event,
                            column,
                            featureColumnDropTarget?.column === column
                              ? featureColumnDropTarget.position
                              : "before",
                          )
                        }
                        className={`min-w-44 border border-gray-400 bg-sky-100 px-0 py-2 whitespace-normal break-words ${
                          draggedFeatureColumn === column
                            ? "lg:opacity-50"
                            : ""
                        } ${
                          featureColumnDropTarget?.column === column &&
                          featureColumnDropTarget.position === "before"
                            ? "lg:shadow-[inset_4px_0_0_#0369a1]"
                            : ""
                        } ${
                          featureColumnDropTarget?.column === column &&
                          featureColumnDropTarget.position === "after"
                            ? "lg:shadow-[inset_-4px_0_0_#0369a1]"
                            : ""
                        }`}
                      >
                        {renderFeatureHeaderMenu(column, columnIndex)}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {visibleFeatureRows.map(({ feature, index }) => (
                    <tr key={`${selectedLayer?.id ?? "layer"}-${index}`}>
                      {action === "delete" && (
                        <td className="border border-gray-400 px-3 py-2 text-center align-top">
                          <input
                            type="checkbox"
                            checked={selectedFeatureRows.includes(index)}
                            disabled={deleteSelectedLayer}
                            onChange={() => toggleSelectedFeatureRow(index)}
                            aria-label={`Pilih baris ${index + 1}`}
                          />
                        </td>
                      )}

                      {activeFeatureColumns.map((column) => (
                        <td
                          key={column}
                          className="border border-gray-400 px-3 py-2 align-top"
                        >
                          {action === "edit" && selectedLayer ? (
                            <input
                              value={String(feature.properties?.[column] ?? "")}
                              onChange={(event) =>
                                updateFeatureCell(
                                  selectedLayer.id,
                                  index,
                                  column,
                                  event.target.value,
                                )
                              }
                              className="w-full min-w-32 rounded border border-gray-300 px-2 py-1 text-inherit"
                            />
                          ) : (
                            String(feature.properties?.[column] ?? "")
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {(view === "mapvisualization" || view === "maplegend") && (
        <div className="flex w-full min-w-0 flex-col gap-6 lg:flex-row">
          <div className="flex w-full min-w-0 flex-col gap-6 lg:w-[35%]">
            <section
              ref={legendSectionRef}
              className="scroll-mt-24 rounded-lg border border-stone-200 bg-white shadow-md"
            >
              <button
                type="button"
                onClick={() => toggleMapConfigSection("legend")}
                className="flex w-full items-center justify-between rounded-t-lg bg-sky-800 px-3 py-2 text-left text-sm font-semibold text-white"
              >
                <span>Legenda</span>
                <AccordionToggleIcon open={showLegendConfig} size="sm" />
              </button>

              <div
                className={`${showLegendConfig ? "visible" : "invisible h-0 pointer-events-none"} flex min-h-0 flex-row flex-wrap gap-6 overflow-hidden border-t border-gray-200 p-3`}
              >

            <div className="hidden">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">Gabung</p>

                <Button variant="outline" size="sm" onClick={addGlobalLegendGroup}>
                  Tambah Gabungan
                </Button>
              </div>

              {activeGabungGroups.map((group) => {
                const isGroupOpen = openGlobalLegendGroupId === group.id;
                const groupItemCount = (
                  ["polygon", "polyline", "point"] as MapGlobalLegendGeometryType[]
                ).reduce(
                  (total, geometryType) =>
                    total +
                    (group.geometries[geometryType]?.items.length ?? 0),
                  0,
                );

                return (
                  <div
                    key={group.id}
                    className="flex min-w-0 grow basis-full flex-col rounded-md border border-stone-200 bg-white [contain-intrinsic-size:auto_12rem] [content-visibility:auto]"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setOpenGlobalLegendGroupId((current) =>
                          current === group.id ? null : group.id,
                        )
                      }
                      className="flex w-full items-center justify-between gap-3 p-3 text-left"
                    >
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-sm font-semibold">
                          {group.name || "Gabungan"}
                        </span>
                        <span className="text-xs text-stone-500">
                          {group.layerIds.length} layer
                        </span>
                      </span>
                      <AccordionToggleIcon open={isGroupOpen} size="sm" />
                    </button>

                    <div
                      className={`${isGroupOpen ? "visible" : "invisible h-0 pointer-events-none"} flex overflow-hidden`}
                    >
                    <div className="flex min-h-0 min-w-0 flex-col gap-4 overflow-hidden border-t border-stone-200 p-3">
                      <label className="flex min-w-0 grow flex-col gap-2 text-sm">
                        Nama Gabungan
                        <input
                          value={group.name}
                          placeholder="Masukkan Nama Gabungan"
                          onChange={(event) =>
                            updateGlobalLegendGroup(group.id, (current) => ({
                              ...current,
                              name: event.target.value,
                            }))
                          }
                          className="h-10 rounded-md border border-stone-300 px-3 py-2"
                        />
                      </label>

                      <div className="flex flex-col gap-3">
                        {[
                          ...group.layerIds,
                          ...(group.layerIds.length < layers.length ? [""] : []),
                        ].map((selectedLayerId, layerIndex) => {
                          const selectedLayerIds = group.layerIds.filter(Boolean);
                          const selectableLayers = layers.filter(
                            (layer) =>
                              layer.id === selectedLayerId ||
                              !selectedLayerIds.includes(layer.id),
                          );

                          return (
                            <select
                              key={`${group.id}-layer-${layerIndex}`}
                              value={selectedLayerId}
                              onChange={(event) => {
                                const nextLayerIds = [...group.layerIds];

                                if (event.target.value) {
                                  nextLayerIds[layerIndex] = event.target.value;
                                } else {
                                  nextLayerIds.splice(layerIndex, 1);
                                }

                                updateGlobalLegendGroup(group.id, (current) => ({
                                  ...current,
                                  layerIds: nextLayerIds.filter(Boolean),
                                  columnByLayerId: {},
                                  geometries: {},
                                }));
                              }}
                              className="h-10 rounded-md border border-stone-300 px-3 py-2 text-sm"
                            >
                              <option value="">Tambah Layer</option>
                              {selectableLayers.map((layer) => (
                                <option key={layer.id} value={layer.id}>
                                  {layer.name}
                                </option>
                              ))}
                            </select>
                          );
                        })}
                      </div>

                      <Button
                        variant="secondary"
                        fullWidth
                        className="hidden"
                        onClick={() => generateGlobalLegendItems(group.id)}
                      >
                        Buat Legenda Global
                      </Button>

                      {false && (["polygon", "polyline", "point"] as MapGlobalLegendGeometryType[]).map(
                        (geometryType) => {
                          const geometryConfig =
                            group.geometries[geometryType] ??
                            getEmptyGlobalLegendGeometryConfig();

                          if (geometryConfig.items.length === 0) return null;

                          return (
                            <div key={geometryType} className="flex flex-col gap-3">
                              <p className="text-sm font-semibold">
                                {getGeometryLabel(geometryType)}
                              </p>

                              {geometryConfig.mainGroups.length > 0 && (
                                <div className="flex flex-col gap-2 rounded-md border border-stone-200 p-3">
                                  <p className="text-xs font-semibold text-stone-600">
                                    Grup Utama
                                  </p>
                                  {geometryConfig.mainGroups.map((mainGroup) => (
                                    <div
                                      key={mainGroup.id}
                                      className="flex flex-row flex-wrap items-center gap-3"
                                    >
                                      <label className="flex items-center gap-2 text-sm">
                                        <input
                                          type="checkbox"
                                          checked={mainGroup.showLabel}
                                          onChange={(event) =>
                                            updateGlobalLegendGroup(
                                              group.id,
                                              (current) => {
                                                const currentGeometry =
                                                  getGlobalLegendGeometryConfig(
                                                    current,
                                                    geometryType,
                                                  );

                                                return {
                                                  ...current,
                                                  geometries: {
                                                    ...current.geometries,
                                                    [geometryType]: {
                                                      ...currentGeometry,
                                                      mainGroups:
                                                        currentGeometry.mainGroups.map(
                                                          (item) =>
                                                            item.id === mainGroup.id
                                                              ? {
                                                                  ...item,
                                                                  showLabel:
                                                                    event.target
                                                                      .checked,
                                                                }
                                                              : item,
                                                        ),
                                                    },
                                                  },
                                                };
                                              },
                                            )
                                          }
                                        />
                                        Tampilkan
                                      </label>
                                      <input
                                        value={mainGroup.name}
                                        onChange={(event) =>
                                          updateGlobalLegendGroup(
                                            group.id,
                                            (current) => {
                                              const currentGeometry =
                                                getGlobalLegendGeometryConfig(
                                                  current,
                                                  geometryType,
                                                );

                                              return {
                                                ...current,
                                                geometries: {
                                                  ...current.geometries,
                                                  [geometryType]: {
                                                    ...currentGeometry,
                                                    mainGroups:
                                                      currentGeometry.mainGroups.map(
                                                        (item) =>
                                                          item.id === mainGroup.id
                                                            ? {
                                                                ...item,
                                                                name:
                                                                  event.target
                                                                    .value,
                                                              }
                                                            : item,
                                                      ),
                                                  },
                                                },
                                              };
                                            },
                                          )
                                        }
                                        className="h-10 min-w-48 grow rounded-md border border-stone-300 px-3 py-2 text-sm"
                                      />
                                    </div>
                                  ))}
                                </div>
                              )}

                              {geometryConfig.items.map((item) => {
                                const itemKey = `${group.id}:${geometryType}:${item.id}`;
                                const isItemOpen =
                                  openGlobalLegendItemKey === itemKey;

                                return (
                                  <div
                                    key={item.id}
                                    className="flex min-w-0 flex-col rounded-md border border-stone-200"
                                  >
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setOpenGlobalLegendItemKey((current) =>
                                          current === itemKey ? null : itemKey,
                                        )
                                      }
                                      className="flex w-full items-center justify-between gap-3 p-3 text-left"
                                    >
                                      <span className="flex min-w-0 flex-col">
                                        <span className="truncate text-xs font-semibold text-stone-600">
                                          {item.name}
                                        </span>
                                        <span className="text-xs text-stone-500">
                                          {item.rawMappings.length} nilai sumber
                                        </span>
                                      </span>
                                      <AccordionToggleIcon open={isItemOpen} size="sm" />
                                    </button>

                                    <div
                                      className={`${isItemOpen ? "visible" : "invisible h-0 pointer-events-none"} flex overflow-hidden`}
                                    >
                                    <div className="flex min-h-0 min-w-0 flex-col gap-3 overflow-hidden border-t border-stone-200 p-3">
                                      <label className="flex min-w-0 grow flex-col gap-2 text-sm">
                                        Nama Item
                                        <input
                                          value={item.name}
                                          onChange={(event) =>
                                            updateGlobalLegendItem(
                                              group.id,
                                              geometryType,
                                              item.id,
                                              { name: event.target.value },
                                            )
                                          }
                                          className="h-10 rounded-md border border-stone-300 px-3 py-2"
                                        />
                                      </label>

                                      <div className="flex flex-row flex-wrap gap-3">
                                        <label className="flex min-w-40 grow flex-col gap-2 text-sm">
                                          Peran
                                          <select
                                            value={item.role}
                                            onChange={(event) =>
                                              updateGlobalLegendItem(
                                                group.id,
                                                geometryType,
                                                item.id,
                                                {
                                                  role:
                                                    event.target.value === "sub"
                                                      ? "sub"
                                                      : "main",
                                                  parentMainGroupId:
                                                    event.target.value === "sub"
                                                      ? item.parentMainGroupId
                                                      : "",
                                                },
                                              )
                                            }
                                            className="h-10 rounded-md border border-stone-300 px-3 py-2"
                                          >
                                            <option value="main">Grup Utama</option>
                                            <option value="sub">Sub Grup</option>
                                          </select>
                                        </label>

                                        <label className="flex min-w-40 grow items-center gap-2 pt-7 text-sm">
                                          <input
                                            type="checkbox"
                                            checked={item.showLabel}
                                            onChange={(event) =>
                                              updateGlobalLegendItem(
                                                group.id,
                                                geometryType,
                                                item.id,
                                                { showLabel: event.target.checked },
                                              )
                                            }
                                          />
                                          Tampilkan label
                                        </label>
                                      </div>

                                      {item.role === "sub" && (
                                        <div className="flex flex-row flex-wrap gap-3">
                                          <label className="flex min-w-40 grow flex-col gap-2 text-sm">
                                            Grup Utama
                                            <select
                                              value={item.parentMainGroupId}
                                              onChange={(event) =>
                                                updateGlobalLegendItem(
                                                  group.id,
                                                  geometryType,
                                                  item.id,
                                                  {
                                                    parentMainGroupId:
                                                      event.target.value,
                                                  },
                                                )
                                              }
                                              className="h-10 rounded-md border border-stone-300 px-3 py-2"
                                            >
                                              <option value="">Pilih Grup</option>
                                              {geometryConfig.mainGroups.map(
                                                (mainGroup) => (
                                                  <option
                                                    key={mainGroup.id}
                                                    value={mainGroup.id}
                                                  >
                                                    {mainGroup.name}
                                                  </option>
                                                ),
                                              )}
                                            </select>
                                          </label>

                                          <label className="flex min-w-40 grow flex-col gap-2 text-sm">
                                            Grup Utama Baru
                                            <input
                                              placeholder="Ketik lalu Enter"
                                              onKeyDown={(event) => {
                                                if (event.key !== "Enter") return;

                                                event.preventDefault();
                                                assignGlobalLegendItemToNewMainGroup(
                                                  group.id,
                                                  geometryType,
                                                  item.id,
                                                  event.currentTarget.value,
                                                );
                                                event.currentTarget.value = "";
                                              }}
                                              onBlur={(event) => {
                                                if (!event.currentTarget.value.trim()) {
                                                  return;
                                                }

                                                assignGlobalLegendItemToNewMainGroup(
                                                  group.id,
                                                  geometryType,
                                                  item.id,
                                                  event.currentTarget.value,
                                                );
                                                event.currentTarget.value = "";
                                              }}
                                              className="h-10 rounded-md border border-stone-300 px-3 py-2"
                                            />
                                          </label>
                                        </div>
                                      )}

                                      <label className="flex min-w-0 grow flex-col gap-2 text-sm">
                                        Gabungkan ke
                                        <select
                                          value=""
                                          onChange={(event) => {
                                            if (!event.target.value) return;

                                            mergeGlobalLegendItem(
                                              group.id,
                                              geometryType,
                                              item.id,
                                              event.target.value,
                                            );
                                          }}
                                          className="h-10 rounded-md border border-stone-300 px-3 py-2"
                                        >
                                          <option value="">Pilih item tujuan</option>
                                          {geometryConfig.items
                                            .filter((target) => target.id !== item.id)
                                            .map((target) => (
                                              <option
                                                key={target.id}
                                                value={target.id}
                                              >
                                                {target.name}
                                              </option>
                                            ))}
                                        </select>
                                      </label>

                                      <div className="flex flex-wrap gap-2">
                                        {item.rawMappings.map((mapping) => (
                                          <span
                                            key={`${mapping.layerId}:${mapping.column}:${mapping.rawValue}`}
                                            className="rounded border border-stone-200 bg-stone-50 px-2 py-1 text-xs text-stone-600"
                                          >
                                            {mapping.rawValue}
                                          </span>
                                        ))}
                                      </div>

                                      <div className="flex flex-col gap-3">
                                        <div className="flex min-w-0 grow flex-col gap-2 text-sm">
                                          Preview
                                          <div className="relative h-20 overflow-hidden rounded-md border border-stone-300 bg-[linear-gradient(45deg,#e7e5e4_25%,transparent_25%),linear-gradient(-45deg,#e7e5e4_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e7e5e4_75%),linear-gradient(-45deg,transparent_75%,#e7e5e4_75%)] bg-[length:14px_14px] bg-[position:0_0,0_7px,7px_-7px,-7px_0]">
                                            {geometryType === "polygon" ? (
                                              <>
                                                <div
                                                  className="absolute inset-4 rounded border-4"
                                                  style={{
                                                    backgroundColor:
                                                      item.style.fillColor,
                                                    backgroundImage:
                                                      item.style.fillPattern === "none"
                                                        ? undefined
                                                        : getMapPatternFill(
                                                            item.style.fillPattern,
                                                            item.style.patternColor,
                                                            item.style.fillColor,
                                                            item.style.patternThickness,
                                                            item.style.patternOpacity,
                                                            item.style.patternGap,
                                                          ),
                                                    borderColor:
                                                      item.style.strokeColor,
                                                    borderWidth:
                                                      item.style.strokeWidth,
                                                    opacity:
                                                      item.style.fillOpacity,
                                                  }}
                                                />
                                                <div
                                                  className="absolute inset-4 rounded border-4 bg-transparent"
                                                  style={{
                                                    borderColor:
                                                      item.style.strokeColor,
                                                    borderWidth:
                                                      item.style.strokeWidth,
                                                  }}
                                                />
                                              </>
                                            ) : geometryType === "point" ? (
                                              <div
                                                className="absolute inset-0 m-auto rounded-full border-4"
                                                style={{
                                                  height: item.style.pointSize,
                                                  width: item.style.pointSize,
                                                  backgroundColor:
                                                    item.style.fillColor,
                                                  borderColor:
                                                    item.style.strokeColor,
                                                  borderWidth:
                                                    item.style.strokeWidth,
                                                  opacity:
                                                    item.style.fillOpacity,
                                                }}
                                              />
                                            ) : (
                                              <div
                                                className="absolute left-5 right-5 top-1/2 rounded-full"
                                                style={{
                                                  borderTop: `${item.style.strokeWidth}px solid ${item.style.strokeColor}`,
                                                }}
                                              />
                                            )}
                                          </div>
                                        </div>

                                        <div className="flex min-w-0 flex-row flex-wrap gap-3 [&>*]:min-w-40">
                                          {geometryType !== "polyline" && (
                                            <label className="relative flex h-10 min-w-0 flex-1 cursor-pointer items-center justify-center rounded-md border border-stone-300 bg-white px-3 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50">
                                              <span className="mr-2 h-4 w-4 rounded border border-stone-300">
                                                <span
                                                  className="block h-full w-full rounded-sm"
                                                  style={{
                                                    backgroundColor:
                                                      item.style.fillColor,
                                                  }}
                                                />
                                              </span>
                                              Fill
                                              <input
                                                type="color"
                                                value={item.style.fillColor}
                                                onChange={(event) => {
                                                  const value = event.target.value;
                                                  scheduleBufferedStyleUpdate(
                                                    event.currentTarget,
                                                    () =>
                                                      updateGlobalLegendItemStyle(
                                                        group.id,
                                                        geometryType,
                                                        item.id,
                                                        { fillColor: value, color: value },
                                                      ),
                                                  );
                                                }}
                                                onBlur={(event) =>
                                                  flushBufferedStyleUpdate(
                                                    event.currentTarget,
                                                  )
                                                }
                                                className="sr-only"
                                              />
                                            </label>
                                          )}

                                          <label className="relative flex h-10 min-w-0 flex-1 cursor-pointer items-center justify-center rounded-md border border-stone-300 bg-white px-3 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50">
                                            <span className="mr-2 h-4 w-4 rounded border border-stone-300">
                                              <span
                                                className="block h-full w-full rounded-sm"
                                                style={{
                                                  backgroundColor:
                                                    item.style.strokeColor,
                                                }}
                                              />
                                            </span>
                                            <input
                                              type="color"
                                              value={item.style.strokeColor}
                                              onChange={(event) => {
                                                const value = event.target.value;
                                                scheduleBufferedStyleUpdate(
                                                  event.currentTarget,
                                                  () =>
                                                    updateGlobalLegendItemStyle(
                                                      group.id,
                                                      geometryType,
                                                      item.id,
                                                      { strokeColor: value },
                                                    ),
                                                );
                                              }}
                                              onBlur={(event) =>
                                                flushBufferedStyleUpdate(
                                                  event.currentTarget,
                                                )
                                              }
                                              className="sr-only"
                                            />
                                            {geometryType === "polyline"
                                              ? "Line"
                                              : "Border"}
                                          </label>

                                        </div>

                                        {geometryType !== "polyline" && (
                                          <BufferedRangeControl
                                            key={`global-${group.id}-${geometryType}-${item.id}-opacity-${item.style.fillOpacity}`}
                                            label="Transparansi"
                                            value={1 - item.style.fillOpacity}
                                            min={0}
                                            max={1}
                                            step={0.05}
                                            formatValue={(value) =>
                                              `${Math.round(value * 100)}%`
                                            }
                                            onCommit={(value) =>
                                              updateGlobalLegendItemStyle(
                                                group.id,
                                                geometryType,
                                                item.id,
                                                { fillOpacity: 1 - value },
                                              )
                                            }
                                          />
                                        )}

                                        <BufferedRangeControl
                                          key={`global-${group.id}-${geometryType}-${item.id}-width-${item.style.strokeWidth}`}
                                          label="Ketebalan"
                                          value={item.style.strokeWidth}
                                          min={1}
                                          max={12}
                                          step={1}
                                          formatValue={(value) => `${value}px`}
                                          onCommit={(value) =>
                                            updateGlobalLegendItemStyle(
                                              group.id,
                                              geometryType,
                                              item.id,
                                              { strokeWidth: value },
                                            )
                                          }
                                        />

                                        {geometryType === "polygon" && (
                                          <PatternControls
                                            pattern={item.style.fillPattern}
                                            color={item.style.patternColor}
                                            thickness={item.style.patternThickness}
                                            opacity={item.style.patternOpacity}
                                            gap={item.style.patternGap}
                                            onCommit={(changes) => updateGlobalLegendItemStyle(group.id, geometryType, item.id, changes)}
                                          />
                                        )}

                                        {geometryType === "point" && (
                                          <label className="flex min-w-0 grow flex-col gap-2 text-sm">
                                            <span className="flex items-center justify-between gap-3">
                                              Ukuran
                                              <span className="text-xs text-stone-500">
                                                {item.style.iconPath
                                                  ? `${item.style.pointSize}px`
                                                  : `${item.style.pointSize} km`}
                                              </span>
                                            </span>
                                            <input
                                              type="range"
                                              min={item.style.iconPath ? 4 : 0.1}
                                              max={item.style.iconPath ? 64 : 100}
                                              step={item.style.iconPath ? 1 : 0.1}
                                              value={item.style.pointSize}
                                              onChange={(event) =>
                                                updateGlobalLegendItemStyle(
                                                  group.id,
                                                  geometryType,
                                                  item.id,
                                                  {
                                                    pointSize: Number(
                                                      event.target.value,
                                                    ),
                                                  },
                                                )
                                              }
                                              className="w-full accent-sky-800"
                                            />
                                          </label>
                                        )}
                                      </div>
                                    </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        },
                      )}
                    </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex min-w-0 grow basis-full flex-col gap-3">
              <ImmediateAccordionButton
                key={`list-layer-toggle-${showLayerListSection}`}
                open={showLayerListSection}
                targetId="map-visualization-layer-list"
                label="List Layer"
                onCommit={(open) => {
                  setShowLayerListSection(open);

                  if (open) {
                    setShowSelectedFeatureConfig(false);
                    setShowGabungLayerSection(false);
                  }
                }}
              />

                <div
                  id="map-visualization-layer-list"
                  className={`${showLayerListSection ? "visible" : "invisible h-0 pointer-events-none"} flex min-h-0 w-full flex-col gap-3 overflow-hidden`}
                >
            {layers.map((layer, layerIndex) => {
              const isLayerOpen = openLegendLayerId === layer.id;
              const layerGroupConfig = getLayerGroupConfig(mapConfig, layer);
              const layerTableConfig = getLayerTableConfig(mapConfig, layer);
              const layerPropertyKeys = layer.property_keys ?? [];
              const isColumnLegendMode =
                layerGroupConfig.legendItemMode === "columns";
              const useRowLegendItems =
                layerGroupConfig.legendItemMode !== "columns";
              const useColumnLegendItems =
                layerGroupConfig.legendItemMode === "columns" ||
                layerGroupConfig.legendItemMode === "both";

              return (
              <div
                key={layer.id}
                onDragEnd={() => {
                  setDraggedLayerId(null);
                  setLayerDropTarget(null);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";

                  if (!draggedLayerId || draggedLayerId === layer.id) return;

                  const rect = event.currentTarget.getBoundingClientRect();
                  const position =
                    event.clientY - rect.top < rect.height / 2
                      ? "before"
                      : "after";

                  setLayerDropTarget({
                    layerId: layer.id,
                    position,
                  });
                }}
                onDragLeave={(event) => {
                  if (
                    event.currentTarget.contains(
                      event.relatedTarget as Node | null,
                    )
                  ) {
                    return;
                  }

                  setLayerDropTarget((current) =>
                    current?.layerId === layer.id ? null : current,
                  );
                }}
                onDrop={(event) => {
                  event.preventDefault();

                  const droppedLayerId =
                    draggedLayerId || event.dataTransfer.getData("text/plain");

                  if (droppedLayerId && layerDropTarget?.layerId === layer.id) {
                    moveLayerToPosition(
                      droppedLayerId,
                      layer.id,
                      layerDropTarget.position,
                    );
                  }

                  setDraggedLayerId(null);
                  setLayerDropTarget(null);
                }}
                className={`relative flex min-w-0 grow basis-full flex-col gap-3 rounded-md border border-stone-200 bg-white p-3 shadow-sm [contain-intrinsic-size:auto_18rem] [content-visibility:auto] ${
                  draggedLayerId === layer.id ? "opacity-60" : ""
                } ${
                  layerDropTarget?.layerId === layer.id
                    ? layerDropTarget.position === "before"
                      ? "border-t-4 border-t-black"
                      : "border-b-4 border-b-black"
                    : ""
                }`}
              >
                <div
                  className={`flex items-center justify-between gap-3 ${
                    draggedLayerId ? "pointer-events-none" : ""
                  }`}
                >
                  <div className="flex h-full w-7 shrink-0 items-center justify-center text-stone-400">
                    <div className="flex w-full flex-col items-center justify-center gap-1 md:hidden">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          moveLayer(layer.id, "up");
                        }}
                        disabled={layerIndex === 0}
                        className="flex h-6 w-full items-center justify-center rounded text-stone-500 disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label={`Pindahkan ${layer.name} ke atas`}
                      >
                        <UpChevron className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          moveLayer(layer.id, "down");
                        }}
                        disabled={layerIndex === layers.length - 1}
                        className="flex h-6 w-full items-center justify-center rounded text-stone-500 disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label={`Pindahkan ${layer.name} ke bawah`}
                      >
                        <DownChevron className="h-4 w-4" />
                      </button>
                    </div>
                    <div
                      draggable
                      onDragStart={(event) => {
                        event.stopPropagation();
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", layer.id);
                        setDraggedLayerId(layer.id);
                      }}
                      onDragEnd={() => {
                        setDraggedLayerId(null);
                        setLayerDropTarget(null);
                      }}
                      className={`hidden cursor-grab active:cursor-grabbing md:block ${
                        draggedLayerId ? "pointer-events-auto" : ""
                      }`}
                      aria-label={`Geser ${layer.name}`}
                    >
                      <Draggable className="pointer-events-none h-7 w-5" />
                    </div>
                  </div>
                  <DeferredCheckbox
                    key={`layer-visibility-${layer.id}-${isLayerVisible(layer.id)}`}
                    checked={isLayerVisible(layer.id)}
                    onCommit={(checked) =>
                      toggleLayerVisibility(layer.id, checked)
                    }
                    className="shrink-0"
                    ariaLabel={`Tampilkan ${layer.name} di peta`}
                  />

                  <button
                    type="button"
                    onClick={(event) => {
                      const willOpen = !isLayerOpen;
                      setOpenLegendLayerId((current) =>
                        current === layer.id ? null : layer.id,
                      );
                      setOpenLegendItemKey(null);
                      setOpenLayerLegendGroupKey(null);
                      setShowSelectedFeatureConfig(false);
                      if (willOpen && window.innerWidth < 1024) {
                        const trigger = event.currentTarget;
                        window.setTimeout(
                          () =>
                            trigger.scrollIntoView({
                              behavior: "smooth",
                              block: "start",
                            }),
                          100,
                        );
                      }
                    }}
                    className="scroll-mt-24 flex min-w-0 grow items-center gap-3 rounded p-1 text-left text-sm font-semibold text-stone-900"
                    aria-label={isLayerOpen ? "Tutup layer" : "Buka layer"}
                  >
                    <span className="flex min-w-0 grow flex-col">
                      <span className="min-w-0 truncate">{layer.name}</span>
                      <span className="text-xs font-medium text-stone-500">
                        {getGeometryLabel(layer.geometry_type)}
                      </span>
                    </span>
                    <span className="shrink-0 text-stone-500">
                      <AccordionToggleIcon open={isLayerOpen} size="sm" />
                    </span>
                  </button>
                </div>

                <div
                  className={`${isLayerOpen ? "visible" : "invisible h-0 pointer-events-none"} flex overflow-hidden`}
                >
                <div className="flex min-h-0 flex-row flex-wrap gap-3 overflow-hidden">
                  <div className="flex min-w-0 grow basis-full flex-col gap-4 rounded-md border border-stone-200 p-3">
                    <label className="flex min-w-0 grow flex-col gap-2 text-sm">
                      Nama Layer
                      <input
                        defaultValue={layer.name}
                        placeholder={getLayerSourceName(layer)}
                        onChange={(event) =>
                          scheduleLayerNameUpdate(layer.id, event.target.value)
                        }
                        onBlur={(event) =>
                          commitLayerNameUpdate(layer.id, event.target.value)
                        }
                        className="h-10 rounded-md border border-stone-300 px-3 py-2"
                      />
                    </label>

                    <div className="flex min-w-0 grow basis-full flex-col gap-2 text-sm">
                      <span>Grup Item</span>
                      <div className="flex flex-row flex-wrap gap-3">
                        <label className="flex min-w-36 grow items-center gap-2 rounded-md border border-stone-300 px-3 py-2">
                          <DeferredCheckbox
                            key={`row-items-${layer.id}-${useRowLegendItems}`}
                            checked={useRowLegendItems}
                            onCommit={(checked) => {
                              updateLayerGroupConfig(layer, {
                                legendItemMode: getLegendItemMode(
                                  checked,
                                  useColumnLegendItems,
                                ),
                              });
                            }}
                          />
                          Nilai Baris
                        </label>
                        <label className="flex min-w-36 grow items-center gap-2 rounded-md border border-stone-300 px-3 py-2">
                          <DeferredCheckbox
                            key={`column-items-${layer.id}-${useColumnLegendItems}`}
                            checked={useColumnLegendItems}
                            onCommit={(checked) => {
                              updateLayerGroupConfig(layer, {
                                legendItemMode: getLegendItemMode(
                                  useRowLegendItems,
                                  checked,
                                ),
                                columnLegendFields:
                                  layerGroupConfig.columnLegendFields,
                              });
                            }}
                          />
                          Kolom
                        </label>
                      </div>
                    </div>

                    {useColumnLegendItems && (
                      <DeferredColumnDropdown
                        columns={layerPropertyKeys}
                        selectedColumns={layerGroupConfig.columnLegendFields}
                        onToggleColumn={(column, checked) => {
                          const nextFields = checked
                            ? [
                                ...layerGroupConfig.columnLegendFields,
                                column,
                              ]
                            : layerGroupConfig.columnLegendFields.filter(
                                (field) => field !== column,
                              );

                          updateLayerGroupConfig(layer, {
                            columnLegendFields: nextFields,
                          });
                        }}
                      />
                    )}

                    {useRowLegendItems && (
                    <>
                    <div className="flex min-w-48 grow flex-col gap-2 text-sm">
                      <label className="flex items-center gap-2">
                        <DeferredCheckbox
                          key={`main-group-${layer.id}-${layerGroupConfig.useMainGroup}`}
                          checked={layerGroupConfig.useMainGroup}
                          onCommit={(checked) =>
                            updateLayerGroupConfig(layer, {
                              useMainGroup: checked,
                              mainGroupField:
                                layerGroupConfig.mainGroupField ||
                                getDefaultGroupField(layerPropertyKeys),
                            })
                          }
                        />
                        Grup Utama
                      </label>

                      {layerGroupConfig.useMainGroup && (
                        <select
                          value={layerGroupConfig.mainGroupField}
                          onChange={(event) =>
                            updateLayerGroupConfig(layer, {
                              mainGroupField: event.target.value,
                              subGroupField:
                                layerGroupConfig.subGroupField === event.target.value
                                  ? ""
                                  : layerGroupConfig.subGroupField,
                            })
                          }
                          className="h-10 rounded-md border border-stone-300 px-3 py-2"
                        >
                          {layerPropertyKeys.map((key) => (
                            <option key={key} value={key}>
                              {key}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div className="flex min-w-48 grow flex-col gap-2 text-sm">
                      <label className="flex items-center gap-2">
                        <DeferredCheckbox
                          key={`sub-group-${layer.id}-${layerGroupConfig.useSubGroup}`}
                          checked={layerGroupConfig.useSubGroup}
                          onCommit={(checked) =>
                            updateLayerGroupConfig(layer, {
                              useSubGroup: checked,
                              subGroupField:
                                layerGroupConfig.subGroupField ||
                                getDefaultSubGroupField(
                                  layerPropertyKeys,
                                  layerGroupConfig.mainGroupField,
                                ),
                            })
                          }
                        />
                        Sub Grup
                      </label>

                      {layerGroupConfig.useSubGroup && (
                        <select
                          value={layerGroupConfig.subGroupField}
                          onChange={(event) =>
                            updateLayerGroupConfig(layer, {
                              subGroupField: event.target.value,
                              useSubGroup: Boolean(event.target.value),
                            })
                          }
                          className="h-10 rounded-md border border-stone-300 px-3 py-2"
                        >
                          <option value="">Pilih Sub Grup</option>
                          {layerPropertyKeys
                            .filter((key) => key !== layerGroupConfig.mainGroupField)
                            .map((key) => (
                              <option key={key} value={key}>
                                {key}
                              </option>
                            ))}
                        </select>
                      )}
                    </div>
                    </>
                    )}
                  </div>

                  <div className="hidden">
                    <p className="text-sm font-semibold">Tabel</p>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={layerTableConfig.enabled}
                        onChange={(event) =>
                          updateLayerTableConfig(layer, {
                            enabled: event.target.checked,
                          })
                        }
                      />
                      Munculkan tabel layer ini
                    </label>

                    {layerTableConfig.enabled && (
                      <>
                        <label className="flex flex-col gap-2 text-sm">
                          Susunan Data
                          <select
                            value={layerTableConfig.mode}
                            onChange={(event) =>
                              updateLayerTableConfig(layer, {
                                mode:
                                  event.target.value === "columns"
                                    ? "columns"
                                    : "rows",
                              })
                            }
                            className="h-10 rounded-md border border-stone-300 px-3 py-2"
                          >
                            <option value="rows">Baris</option>
                            <option value="columns">Kolom</option>
                          </select>
                        </label>

                        <div className="grid gap-3 md:grid-cols-2">
                          <label className="flex flex-col gap-2 text-sm">
                            Nama Data
                            <input
                              value={layerTableConfig.dataLabel}
                              onChange={(event) =>
                                updateLayerTableConfig(layer, {
                                  dataLabel: event.target.value,
                                })
                              }
                              className="h-10 rounded-md border border-stone-300 px-3 py-2"
                            />
                          </label>
                          <label className="flex flex-col gap-2 text-sm">
                            Nama Nilai
                            <input
                              value={layerTableConfig.valueLabel}
                              onChange={(event) =>
                                updateLayerTableConfig(layer, {
                                  valueLabel: event.target.value,
                                })
                              }
                              className="h-10 rounded-md border border-stone-300 px-3 py-2"
                            />
                          </label>
                        </div>

                        {layerTableConfig.mode === "rows" ? (
                          <div className="grid gap-3 md:grid-cols-2">
                            <label className="flex flex-col gap-2 text-sm">
                              Kolom untuk Data
                              <select
                                value={layerTableConfig.dataField}
                                onChange={(event) =>
                                  updateLayerTableConfig(layer, {
                                    dataField: event.target.value,
                                  })
                                }
                                className="h-10 rounded-md border border-stone-300 px-3 py-2"
                              >
                                {layerPropertyKeys.map((key) => (
                                  <option key={key} value={key}>{key}</option>
                                ))}
                              </select>
                            </label>
                            <label className="flex flex-col gap-2 text-sm">
                              Kolom untuk Nilai
                              <select
                                value={layerTableConfig.valueField}
                                onChange={(event) =>
                                  updateLayerTableConfig(layer, {
                                    valueField: event.target.value,
                                  })
                                }
                                className="h-10 rounded-md border border-stone-300 px-3 py-2"
                              >
                                {layerPropertyKeys.map((key) => (
                                  <option key={key} value={key}>{key}</option>
                                ))}
                              </select>
                            </label>
                          </div>
                        ) : (
                          <>
                            <label className="flex flex-col gap-2 text-sm">
                              Kolom selector fitur
                              <select
                                value={layerTableConfig.selectorField}
                                onChange={(event) =>
                                  updateLayerTableConfig(layer, {
                                    selectorField: event.target.value,
                                  })
                                }
                                className="h-10 rounded-md border border-stone-300 px-3 py-2"
                              >
                                {getOrderedLayerPopupFields(layer)
                                  .filter((field) => field.selected)
                                  .map((field) => (
                                    <option key={field.field} value={field.field}>
                                      {field.label || field.field}
                                    </option>
                                  ))}
                              </select>
                            </label>
                            <div className="flex max-h-52 flex-col gap-2 overflow-y-auto rounded-md border border-stone-200 p-3">
                              <span className="text-sm">Kolom yang ditampilkan</span>
                              {layerPropertyKeys.map((key) => (
                                <label key={key} className="flex items-center gap-2 text-sm">
                                  <input
                                    type="checkbox"
                                    checked={layerTableConfig.selectedFields.includes(key)}
                                    onChange={(event) =>
                                      updateLayerTableConfig(layer, {
                                        selectedFields: event.target.checked
                                          ? [...layerTableConfig.selectedFields, key]
                                          : layerTableConfig.selectedFields.filter(
                                              (field) => field !== key,
                                            ),
                                      })
                                    }
                                  />
                                  {key}
                                </label>
                              ))}
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>

                  <p className="w-full text-sm font-semibold">Fitur Legenda</p>

                  {Array.from(
                    getEffectiveLayerLegends(layer, mapConfig).reduce<
                      Map<
                        string,
                        {
                          groupId: string;
                          mainValue: string;
                          source: "main" | "sub" | "column";
                          legends: MapLegendDraft[];
                        }
                      >
                    >((acc, legend) => {
                      const parsedLegendValue = parseRowLegendValue(legend.value);
                      const source = isColumnLegendMode
                        ? "column"
                        : layerGroupConfig.legendItemSources[legend.value] ??
                          parsedLegendValue.source;
                      const mainValue =
                        isColumnLegendMode
                          ? legend.value
                          : source === "column"
                            ? "Kolom"
                          : parsedLegendValue.rawValue ||
                            layerGroupConfig.legendItemMainValues[legend.value] ||
                            legend.value;
                      const groupId = `${source}:${mainValue}`;

                      if (!acc.has(groupId)) {
                        acc.set(groupId, {
                          groupId,
                          mainValue,
                          source,
                          legends: [],
                        });
                      }

                      acc.get(groupId)?.legends.push(legend);
                      return acc;
                    }, new Map()).values(),
                  ).map((legendGroup, legendGroupIndex, legendGroups) => {
                    const groupKey = `${layer.id}:${legendGroup.groupId}`;
                    const isLayerLegendGroupOpen =
                      openLayerLegendGroupKey === groupKey;
                    const isColumnLegendGroup =
                      useColumnLegendItems && legendGroup.source === "column";
                    const mainAlias =
                      isColumnLegendMode && isColumnLegendGroup
                        ? legendGroup.legends[0]?.label || legendGroup.mainValue
                        : isColumnLegendGroup
                        ? "Kolom"
                        : legendGroup.source === "sub"
                          ? legendGroup.legends[0]?.label || legendGroup.mainValue
                        : getMainGroupLabel(
                            layerGroupConfig,
                            legendGroup.mainValue,
                          );
                    const useMainGroupStyling =
                      isColumnLegendMode || !isColumnLegendGroup;
                    const visibleLegendItems = legendGroup.legends.slice(0, 1);
                    const firstLegendItem = visibleLegendItems[0];
                    const renderLegendItemCard = (
                      legend: MapLegendDraft,
                      options: {
                        embeddedInMain: boolean;
                        level: "1" | "2";
                        index: number;
                      },
                    ) => {
                      const legendItemKey = getLegendKey(layer.id, legend.value);
                      const isLegendItemOpen =
                        options.embeddedInMain ||
                        openLegendItemKey === legendItemKey;
                      const legendItemSource =
                        layerGroupConfig.legendItemSources[legend.value] ?? "sub";
                      const isPointImageMode =
                        legend.geometryType === "point" &&
                        (Boolean(legend.iconPath) ||
                          iconUploadTargets.includes(legendItemKey));

                      return (
                    <div
                      key={options.index}
                      className={
                        options.embeddedInMain
                          ? "flex min-w-0 grow basis-full flex-col [contain-intrinsic-size:auto_12rem] [content-visibility:auto]"
                          : "flex min-w-0 grow basis-full flex-col rounded-md border border-stone-200 [contain-intrinsic-size:auto_12rem] [content-visibility:auto]"
                      }
                    >
                      {!options.embeddedInMain && (
                        <button
                          type="button"
                          onClick={() =>
                            setOpenLegendItemKey((current) =>
                              current === legendItemKey ? null : legendItemKey,
                            )
                          }
                          className="flex w-full items-center justify-between gap-3 p-3 text-left"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-stone-300 text-xs font-semibold text-stone-600">
                              {options.level}
                            </span>
                            <span className="min-w-0 truncate text-xs font-semibold text-stone-600">
                              {legend.label || getLegendDisplayValue(legend.value)}
                            </span>
                          </span>
                          <AccordionToggleIcon open={isLegendItemOpen} size="sm" />
                        </button>
                      )}

                      <div
                        className={`${isLegendItemOpen ? "visible" : "invisible h-0 pointer-events-none"} flex w-full overflow-hidden`}
                      >
                      <div
                        className={
                          options.embeddedInMain
                            ? "flex min-h-0 w-full min-w-0 flex-col gap-3 overflow-hidden"
                            : "flex min-h-0 w-full min-w-0 flex-col gap-3 overflow-hidden border-t border-stone-200 px-3 py-3"
                        }
                      >

                      {false && !isColumnLegendGroup && layerGroupConfig.useSubGroup && (
                        <label className="flex min-w-0 grow flex-col gap-2 text-sm">
                          Gunakan Grup
                          <select
                            value={legendItemSource}
                            onChange={(event) =>
                              updateLayerGroupConfig(layer, {
                                legendItemSources: {
                                  ...layerGroupConfig.legendItemSources,
                                  [legend.value]:
                                    event.target.value === "main"
                                      ? "main"
                                      : "sub",
                                },
                              })
                            }
                            className="h-10 rounded-md border border-stone-300 px-3 py-2"
                          >
                            <option value="main">Grup Utama</option>
                            <option value="sub">Sub Grup</option>
                          </select>
                        </label>
                      )}

                      {(isColumnLegendGroup ||
                        (layerGroupConfig.useSubGroup &&
                          legendItemSource === "sub")) && (
                        <label className="flex min-w-0 grow flex-col gap-2 text-sm">
                          {isColumnLegendGroup ? "Label" : "Label Sub Grup"}
                          <input
                            value={legend.label}
                            onChange={(event) =>
                              updateLayerLegend(layer.id, legend.value, {
                                label: event.target.value,
                              })
                            }
                            className="h-10 rounded-md border border-stone-300 px-3 py-2"
                          />
                        </label>
                      )}

                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={legend.labelOnly}
                          onChange={(event) =>
                            updateLayerLegend(layer.id, legend.value, {
                              labelOnly: event.target.checked,
                            })
                          }
                          className="h-4 w-4"
                        />
                        Hanya Label
                      </label>

                      {!legend.labelOnly && (
                        <div className="flex w-full flex-col gap-3">
                          {!isPointImageMode && (
                          <div className="flex min-w-0 grow flex-col gap-2 text-sm">
                            Preview
                            <div className="relative h-20 overflow-hidden rounded-md border border-stone-300 bg-[linear-gradient(45deg,#e7e5e4_25%,transparent_25%),linear-gradient(-45deg,#e7e5e4_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e7e5e4_75%),linear-gradient(-45deg,transparent_75%,#e7e5e4_75%)] bg-[length:14px_14px] bg-[position:0_0,0_7px,7px_-7px,-7px_0]">
                              {legend.geometryType === "polygon" ? (
                                <div
                                  className="absolute inset-4 rounded border-4"
                                  style={{
                                    backgroundColor: legend.fillColor,
                                    backgroundImage:
                                      legend.fillPattern === "none"
                                        ? undefined
                                        : getMapPatternFill(
                                            legend.fillPattern,
                                            legend.patternColor,
                                            legend.fillColor,
                                            legend.patternThickness,
                                            legend.patternOpacity,
                                            legend.patternGap,
                                          ),
                                    borderColor: legend.strokeColor,
                                    borderWidth: legend.strokeWidth,
                                    opacity: legend.fillOpacity,
                                  }}
                                />
                              ) : legend.geometryType === "point" ? (
                                <div
                                  className="absolute inset-0 m-auto rounded-full border-4"
                                  style={{
                                    height: legend.pointSize,
                                    width: legend.pointSize,
                                    backgroundColor: legend.fillColor,
                                    borderColor: legend.strokeColor,
                                    borderWidth: legend.strokeWidth,
                                    opacity: legend.fillOpacity,
                                  }}
                                />
                              ) : (
                                <div
                                  className="absolute left-5 right-5 top-1/2 rounded-full"
                                  style={{
                                    borderTop: `${legend.strokeWidth}px solid ${legend.strokeColor}`,
                                  }}
                                />
                              )}
                              {legend.geometryType === "polygon" && (
                                <div
                                  className="absolute inset-4 rounded border-4 bg-transparent"
                                  style={{
                                    borderColor: legend.strokeColor,
                                    borderWidth: legend.strokeWidth,
                                  }}
                                />
                              )}
                            </div>
                          </div>
                          )}

                          {!isPointImageMode && (
                          <div className="flex min-w-0 flex-row flex-wrap gap-3 [&>*]:min-w-40">
                            {legend.geometryType !== "polyline" && (
                              <label className="relative flex h-10 min-w-0 flex-1 cursor-pointer items-center justify-center rounded-md border border-stone-300 bg-white px-3 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50">
                                <span className="mr-2 h-4 w-4 rounded border border-stone-300">
                                  <span
                                    className="block h-full w-full rounded-sm"
                                    style={{ backgroundColor: legend.fillColor }}
                                  />
                                </span>
                                Fill
                                <input
                                  type="color"
                                  value={legend.fillColor}
                                  onChange={(event) => {
                                    const value = event.target.value;
                                    scheduleBufferedStyleUpdate(
                                      event.currentTarget,
                                      () =>
                                        updateLayerLegend(layer.id, legend.value, {
                                          fillColor: value,
                                          color: value,
                                        }),
                                    );
                                  }}
                                  onBlur={(event) =>
                                    flushBufferedStyleUpdate(event.currentTarget)
                                  }
                                  className="sr-only"
                                />
                              </label>
                            )}

                            <label className="relative flex h-10 min-w-0 flex-1 cursor-pointer items-center justify-center rounded-md border border-stone-300 bg-white px-3 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50">
                              <span className="mr-2 h-4 w-4 rounded border border-stone-300">
                                <span
                                  className="block h-full w-full rounded-sm"
                                  style={{ backgroundColor: legend.strokeColor }}
                                />
                              </span>
                              <input
                                type="color"
                                value={legend.strokeColor}
                                onChange={(event) => {
                                  const value = event.target.value;
                                  scheduleBufferedStyleUpdate(
                                    event.currentTarget,
                                    () =>
                                      updateLayerLegend(layer.id, legend.value, {
                                        strokeColor: value,
                                      }),
                                  );
                                }}
                                onBlur={(event) =>
                                  flushBufferedStyleUpdate(event.currentTarget)
                                }
                                className="sr-only"
                              />
                              {legend.geometryType === "polyline" ? "Line" : "Border"}
                            </label>

                          </div>
                          )}

                          {legend.geometryType !== "polyline" && !isPointImageMode && (
                            <BufferedRangeControl
                              key={`layer-${layer.id}-${legend.value}-opacity-${legend.fillOpacity}`}
                              label="Transparansi"
                              value={1 - legend.fillOpacity}
                              min={0}
                              max={1}
                              step={0.05}
                              formatValue={(value) =>
                                `${Math.round(value * 100)}%`
                              }
                              onCommit={(value) =>
                                updateLayerLegend(layer.id, legend.value, {
                                  fillOpacity: 1 - value,
                                })
                              }
                            />
                          )}

                          {!isPointImageMode && (
                          <BufferedRangeControl
                            key={`layer-${layer.id}-${legend.value}-width-${legend.strokeWidth}`}
                            label="Ketebalan"
                            value={legend.strokeWidth}
                            min={1}
                            max={12}
                            step={1}
                            formatValue={(value) => `${value}px`}
                            onCommit={(value) =>
                              updateLayerLegend(layer.id, legend.value, {
                                strokeWidth: value,
                              })
                            }
                          />
                          )}

                          {legend.geometryType === "polygon" && !isPointImageMode && (
                            <PatternControls
                              pattern={legend.fillPattern}
                              color={legend.patternColor}
                              thickness={legend.patternThickness}
                              opacity={legend.patternOpacity}
                              gap={legend.patternGap}
                              onCommit={(changes) => updateLayerLegend(layer.id, legend.value, changes)}
                            />
                          )}

                          {legend.geometryType === "point" && (
                            <>
                              <label className="flex min-w-0 grow flex-col gap-2 text-sm">
                                <span className="flex items-center justify-between gap-3">
                                  Ukuran
                                  <span className="text-xs text-stone-500">
                                    {isPointImageMode
                                      ? `${legend.pointSize}px`
                                      : `${legend.pointSize} km`}
                                  </span>
                                </span>
                                <input
                                  type="range"
                                  min={isPointImageMode ? 4 : 0.1}
                                  max={isPointImageMode ? 64 : 100}
                                  step={isPointImageMode ? 1 : 0.1}
                                  value={legend.pointSize}
                                  onChange={(event) =>
                                    updateLayerLegend(layer.id, legend.value, {
                                      pointSize: Number(event.target.value),
                                    })
                                  }
                                  className="w-full accent-sky-800"
                                />
                              </label>

                            <div className="flex min-w-0 grow flex-col gap-2 text-sm">
                              {isPointImageMode ? (
                                <>
                                <label
                                  onDragOver={(event) => event.preventDefault()}
                                  onDrop={(event) => {
                                    event.preventDefault();

                                    const file = event.dataTransfer.files?.[0];

                                    if (file) {
                                      void handleUploadLegendIcon(
                                        layer.id,
                                        legend.value,
                                        file,
                                      );
                                    }
                                  }}
                                  className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-stone-300 bg-stone-50 p-3 text-center text-xs text-stone-600 transition hover:bg-stone-100"
                                >
                                  {legend.iconPath ? (
                                    <img
                                      src={getPublicImageUrl(legend.iconPath)}
                                      alt={legend.label}
                                      className="h-12 w-12 object-contain"
                                    />
                                  ) : (
                                    <span>
                                      Drop gambar di sini atau klik untuk pilih
                                      dari penyimpanan lokal.
                                    </span>
                                  )}
                                  <span>
                                    SVG atau PNG, maksimal {MAP_ICON_MAX_SIZE_LABEL}.
                                  </span>
                                  <input
                                    type="file"
                                    accept=".svg,.png,image/svg+xml,image/png"
                                    className="sr-only"
                                    onChange={(event) => {
                                      const file = event.target.files?.[0];

                                      if (file) {
                                        void handleUploadLegendIcon(
                                          layer.id,
                                          legend.value,
                                          file,
                                        );
                                      }

                                      event.target.value = "";
                                    }}
                                  />
                                </label>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  fullWidth
                                  onClick={() => {
                                    setIconUploadTargets((prev) =>
                                      prev.filter((key) => key !== legendItemKey),
                                    );
                                    updateLayerLegend(layer.id, legend.value, {
                                      iconPath: null,
                                    });
                                  }}
                                >
                                  Gunakan Simbol
                                </Button>
                                </>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  fullWidth
                                  onClick={() =>
                                    setIconUploadTargets((prev) =>
                                      Array.from(
                                        new Set([
                                          ...prev,
                                          getLegendKey(layer.id, legend.value),
                                        ]),
                                      ),
                                    )
                                  }
                                >
                                  Gunakan Gambar
                                </Button>
                              )}
                            </div>
                            </>
                          )}
                        </div>
                      )}
                      </div>
                      </div>
                    </div>
                      );
                    };

                    return (
                    <div
                      key={legendGroupIndex}
                      onDragOver={(event) => {
                        if (!draggedLegendGroup || !firstLegendItem) return;
                        event.preventDefault();
                        event.dataTransfer.dropEffect = "move";
                        const bounds = event.currentTarget.getBoundingClientRect();
                        setLegendGroupDropTarget({
                          layerId: layer.id,
                          values: legendGroup.legends.map((item) => item.value),
                          position:
                            event.clientY < bounds.top + bounds.height / 2
                              ? "before"
                              : "after",
                        });
                      }}
                      onDragLeave={(event) => {
                        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                          setLegendGroupDropTarget(null);
                        }
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        if (draggedLegendGroup && legendGroupDropTarget?.layerId === layer.id) {
                          moveLayerLegendGroup(layer.id, draggedLegendGroup.values, legendGroupDropTarget.values, legendGroupDropTarget.position);
                        }
                        setDraggedLegendGroup(null);
                        setLegendGroupDropTarget(null);
                      }}
                      className={`flex min-w-0 grow basis-full flex-col gap-3 [contain-intrinsic-size:auto_12rem] [content-visibility:auto] ${
                        draggedLegendGroup?.values.some((value) => legendGroup.legends.some((item) => item.value === value)) ? "opacity-60" : ""
                      } ${
                        legendGroupDropTarget?.layerId === layer.id && legendGroupDropTarget.values.some((value) => legendGroup.legends.some((item) => item.value === value))
                          ? legendGroupDropTarget.position === "before" ? "border-t-4 border-t-black" : "border-b-4 border-b-black"
                          : ""
                      }`}
                    >
                    <div className="flex min-w-0 grow basis-full flex-col rounded-md border border-stone-200">
                      <div className="flex items-center justify-between gap-3 p-3">
                        {firstLegendItem && (
                          <div className="flex h-full w-7 shrink-0 items-center justify-center text-stone-400">
                            <div className="flex w-full flex-col items-center justify-center gap-1 md:hidden">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  moveLayerLegend(
                                    layer.id,
                                    firstLegendItem.value,
                                    "up",
                                  );
                                }}
                                disabled={legendGroupIndex === 0}
                                className="flex h-6 w-full items-center justify-center rounded text-stone-500 disabled:cursor-not-allowed disabled:opacity-30"
                                aria-label={`Pindahkan ${mainAlias} ke atas`}
                              >
                                <UpChevron className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  moveLayerLegend(
                                    layer.id,
                                    firstLegendItem.value,
                                    "down",
                                  );
                                }}
                                disabled={legendGroupIndex === legendGroups.length - 1}
                                className="flex h-6 w-full items-center justify-center rounded text-stone-500 disabled:cursor-not-allowed disabled:opacity-30"
                                aria-label={`Pindahkan ${mainAlias} ke bawah`}
                              >
                                <DownChevron className="h-4 w-4" />
                              </button>
                            </div>
                            <div
                              draggable
                              onDragStart={(event) => {
                                event.stopPropagation();
                                event.dataTransfer.effectAllowed = "move";
                                event.dataTransfer.setData("text/plain", firstLegendItem.value);
                                setDraggedLegendGroup({ layerId: layer.id, values: legendGroup.legends.map((item) => item.value) });
                              }}
                              onDragEnd={() => {
                                setDraggedLegendGroup(null);
                                setLegendGroupDropTarget(null);
                              }}
                              className="hidden cursor-grab active:cursor-grabbing md:block"
                              aria-label={`Geser ${mainAlias}`}
                            >
                              <Draggable className="pointer-events-none h-7 w-5" />
                            </div>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setOpenLayerLegendGroupKey((current) =>
                              current === groupKey ? null : groupKey,
                            );
                            setOpenLegendItemKey(null);
                          }}
                          className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-stone-300 text-xs font-semibold text-stone-600">
                              {legendGroup.source === "sub" ? "2" : "1"}
                            </span>
                            <span className="min-w-0 truncate text-sm font-semibold">
                              {mainAlias}
                            </span>
                          </span>
                          <AccordionToggleIcon open={isLayerLegendGroupOpen} size="sm" />
                        </button>
                      </div>

                      <div
                        className={`${isLayerLegendGroupOpen ? "visible" : "invisible h-0 pointer-events-none"} flex w-full overflow-hidden`}
                      >
                      <div className="flex min-h-0 w-full min-w-0 flex-col gap-3 overflow-hidden border-t border-stone-200 p-3">

                      {!isColumnLegendGroup && legendGroup.source === "main" && (
                        <label className="flex min-w-0 grow flex-col gap-2 text-sm">
                          Label Grup Utama
                          <input
                            value={
                              layerGroupConfig.mainGroupAliases[
                                legendGroup.mainValue
                              ] ?? legendGroup.mainValue
                            }
                            placeholder={legendGroup.mainValue}
                            onChange={(event) =>
                              updateLayerGroupConfig(layer, {
                                mainGroupAliases: {
                                  ...layerGroupConfig.mainGroupAliases,
                                  [legendGroup.mainValue]: event.target.value,
                                },
                              })
                            }
                            className="h-10 rounded-md border border-stone-300 px-3 py-2"
                          />
                        </label>
                      )}

                  {useMainGroupStyling &&
                    visibleLegendItems.map((legend, legendIndex) =>
                      renderLegendItemCard(legend, {
                        embeddedInMain: true,
                        level: legendGroup.source === "sub" ? "2" : "1",
                        index: legendIndex,
                      }),
                    )}
                      </div>
                      </div>
                    </div>
                    {!useMainGroupStyling &&
                      visibleLegendItems.map((legend, legendIndex) =>
                        renderLegendItemCard(legend, {
                          embeddedInMain: false,
                          level: "2",
                          index: legendIndex,
                        }),
                      )}
                    </div>
                    );
                  })}
                      </div>
                      </div>
                    </div>
                    );
                  })}
                </div>
            </div>

            <div className="flex min-w-0 grow basis-full flex-col gap-3 border-t border-stone-200 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowSelectedFeatureConfig((current) => {
                    const next = !current;

                    if (next) {
                      setShowLayerListSection(false);
                      setShowGabungLayerSection(false);
                      setOpenLegendLayerId(null);
                    }

                    return next;
                  });
                  setOpenLegendLayerId(null);
                  setOpenLegendItemKey(null);
                }}
                className="flex w-full items-center justify-between gap-3 text-left text-sm font-semibold"
              >
                <span>Fitur Terpilih</span>
                <AccordionToggleIcon open={showSelectedFeatureConfig} size="sm" />
              </button>

                <div
                  className={`${showSelectedFeatureConfig ? "visible" : "invisible h-0 pointer-events-none"} flex min-h-0 w-full flex-col gap-3 overflow-hidden`}
                >
                  <div className="flex min-w-0 grow flex-col gap-2 text-sm">
                    Preview
                    <div className="relative h-20 overflow-hidden rounded-md border border-stone-300 bg-[linear-gradient(45deg,#e7e5e4_25%,transparent_25%),linear-gradient(-45deg,#e7e5e4_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e7e5e4_75%),linear-gradient(-45deg,transparent_75%,#e7e5e4_75%)] bg-[length:14px_14px] bg-[position:0_0,0_7px,7px_-7px,-7px_0]">
                      <div
                        className="absolute inset-4 rounded border-4"
                        style={{
                          backgroundColor: mapConfig.selectedFeatureFillColor,
                          borderColor: mapConfig.selectedFeatureStrokeColor,
                          borderWidth: mapConfig.selectedFeatureStrokeWidth,
                          opacity: mapConfig.selectedFeatureFillOpacity,
                        }}
                      />
                      <div
                        className="absolute inset-4 rounded border-4 bg-transparent"
                        style={{
                          borderColor: mapConfig.selectedFeatureStrokeColor,
                          borderWidth: mapConfig.selectedFeatureStrokeWidth,
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex min-w-0 grow flex-col gap-3">
                    <div className="flex min-w-0 grow flex-row gap-3">
                      <label className="relative flex h-10 min-w-0 flex-1 cursor-pointer items-center justify-center rounded-md border border-stone-300 bg-white px-3 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50">
                        <span className="mr-2 h-4 w-4 rounded border border-stone-300">
                          <span
                            className="block h-full w-full rounded-sm"
                            style={{
                              backgroundColor:
                                mapConfig.selectedFeatureFillColor,
                            }}
                          />
                        </span>
                        Fill
                        <input
                          type="color"
                          value={mapConfig.selectedFeatureFillColor}
                          onChange={(event) =>
                            setMapConfig((prev) => ({
                              ...prev,
                              selectedFeatureColor: event.target.value,
                              selectedFeatureFillColor: event.target.value,
                            }))
                          }
                          className="sr-only"
                        />
                      </label>

                      <label className="relative flex h-10 min-w-0 flex-1 cursor-pointer items-center justify-center rounded-md border border-stone-300 bg-white px-3 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50">
                        <span className="mr-2 h-4 w-4 rounded border border-stone-300">
                          <span
                            className="block h-full w-full rounded-sm"
                            style={{
                              backgroundColor:
                                mapConfig.selectedFeatureStrokeColor,
                            }}
                          />
                        </span>
                        Border
                        <input
                          type="color"
                          value={mapConfig.selectedFeatureStrokeColor}
                          onChange={(event) =>
                            setMapConfig((prev) => ({
                              ...prev,
                              selectedFeatureStrokeColor: event.target.value,
                            }))
                          }
                          className="sr-only"
                        />
                      </label>
                    </div>

                    <label className="flex min-w-0 grow flex-col gap-2 text-sm">
                      <span className="flex items-center justify-between gap-3">
                        Transparansi
                        <span className="text-xs text-stone-500">
                          {Math.round(
                            (1 - mapConfig.selectedFeatureFillOpacity) * 100,
                          )}
                          %
                        </span>
                      </span>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={1 - mapConfig.selectedFeatureFillOpacity}
                        onChange={(event) =>
                          setMapConfig((prev) => ({
                            ...prev,
                            selectedFeatureFillOpacity:
                              1 - Number(event.target.value),
                          }))
                        }
                        className="w-full accent-sky-800"
                      />
                    </label>

                    <label className="flex min-w-0 grow flex-col gap-2 text-sm">
                      <span className="flex items-center justify-between gap-3">
                        Ketebalan
                        <span className="text-xs text-stone-500">
                          {mapConfig.selectedFeatureStrokeWidth}px
                        </span>
                      </span>
                      <input
                        type="range"
                        min="1"
                        max="12"
                        step="1"
                        value={mapConfig.selectedFeatureStrokeWidth}
                        onChange={(event) =>
                          setMapConfig((prev) => ({
                            ...prev,
                            selectedFeatureStrokeWidth: Number(
                              event.target.value,
                            ),
                          }))
                        }
                        className="w-full accent-sky-800"
                      />
                    </label>
                  </div>
                </div>
            </div>

            <div className="hidden">
              <button
                type="button"
                onClick={() => {
                  setShowSelectedFeatureConfig((current) => !current);
                  setOpenLegendLayerId(null);
                  setOpenLegendItemKey(null);
                }}
                className="flex w-full items-center justify-between gap-3 text-left text-sm font-semibold"
              >
                <span>Fitur Terpilih</span>
                <AccordionToggleIcon open={showSelectedFeatureConfig} size="sm" />
              </button>

              <div
                className={`${showSelectedFeatureConfig ? "visible" : "invisible h-0 pointer-events-none"} flex overflow-hidden`}
              >
              <div className="flex min-h-0 w-full flex-col gap-3 overflow-hidden">
                <div className="flex min-w-0 grow flex-col gap-2 text-sm">
                  Preview
                  <div className="relative h-20 overflow-hidden rounded-md border border-stone-300 bg-[linear-gradient(45deg,#e7e5e4_25%,transparent_25%),linear-gradient(-45deg,#e7e5e4_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e7e5e4_75%),linear-gradient(-45deg,transparent_75%,#e7e5e4_75%)] bg-[length:14px_14px] bg-[position:0_0,0_7px,7px_-7px,-7px_0]">
                    <div
                      className="absolute inset-4 rounded border-4"
                      style={{
                        backgroundColor: mapConfig.selectedFeatureFillColor,
                        borderColor: mapConfig.selectedFeatureStrokeColor,
                        borderWidth: mapConfig.selectedFeatureStrokeWidth,
                        opacity: mapConfig.selectedFeatureFillOpacity,
                      }}
                    />
                    <div
                      className="absolute inset-4 rounded border-4 bg-transparent"
                      style={{
                        borderColor: mapConfig.selectedFeatureStrokeColor,
                        borderWidth: mapConfig.selectedFeatureStrokeWidth,
                      }}
                    />
                  </div>
                </div>

                <div className="flex min-w-0 grow flex-col gap-3">
                  <div className="flex min-w-0 grow flex-row gap-3">
                  <label className="relative flex h-10 min-w-0 flex-1 cursor-pointer items-center justify-center rounded-md border border-stone-300 bg-white px-3 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50">
                    <span className="mr-2 h-4 w-4 rounded border border-stone-300">
                      <span
                        className="block h-full w-full rounded-sm"
                        style={{
                          backgroundColor: mapConfig.selectedFeatureFillColor,
                        }}
                      />
                    </span>
                    Fill
                    <input
                      type="color"
                      value={mapConfig.selectedFeatureFillColor}
                      onChange={(event) =>
                        setMapConfig((prev) => ({
                          ...prev,
                          selectedFeatureColor: event.target.value,
                          selectedFeatureFillColor: event.target.value,
                        }))
                      }
                      className="sr-only"
                    />
                  </label>

                  <label className="relative flex h-10 min-w-0 flex-1 cursor-pointer items-center justify-center rounded-md border border-stone-300 bg-white px-3 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50">
                    <span className="mr-2 h-4 w-4 rounded border border-stone-300">
                      <span
                        className="block h-full w-full rounded-sm"
                        style={{
                          backgroundColor: mapConfig.selectedFeatureStrokeColor,
                        }}
                      />
                    </span>
                    Border
                    <input
                      type="color"
                      value={mapConfig.selectedFeatureStrokeColor}
                      onChange={(event) =>
                        setMapConfig((prev) => ({
                          ...prev,
                          selectedFeatureStrokeColor: event.target.value,
                        }))
                      }
                      className="sr-only"
                    />
                  </label>

                  </div>

                  <label className="flex min-w-0 grow flex-col gap-2 text-sm">
                    <span className="flex items-center justify-between gap-3">
                      Transparansi
                      <span className="text-xs text-stone-500">
                        {Math.round(
                          (1 - mapConfig.selectedFeatureFillOpacity) * 100,
                        )}
                        %
                      </span>
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={1 - mapConfig.selectedFeatureFillOpacity}
                      onChange={(event) =>
                        setMapConfig((prev) => ({
                          ...prev,
                          selectedFeatureFillOpacity:
                            1 - Number(event.target.value),
                        }))
                      }
                      className="w-full accent-sky-800"
                    />
                  </label>

                  <label className="flex min-w-0 grow flex-col gap-2 text-sm">
                    <span className="flex items-center justify-between gap-3">
                      Ketebalan
                      <span className="text-xs text-stone-500">
                        {mapConfig.selectedFeatureStrokeWidth}px
                      </span>
                    </span>
                    <input
                      type="range"
                      min="1"
                      max="12"
                      step="1"
                      value={mapConfig.selectedFeatureStrokeWidth}
                      onChange={(event) =>
                        setMapConfig((prev) => ({
                          ...prev,
                          selectedFeatureStrokeWidth: Number(event.target.value),
                        }))
                      }
                      className="w-full accent-sky-800"
                    />
                  </label>
                </div>
              </div>
              </div>
            </div>
              </div>
            </section>

            <section
              ref={tableSectionRef}
              className="scroll-mt-24 rounded-lg border border-stone-200 bg-white shadow-md"
            >
              <button
                type="button"
                onClick={() => toggleMapConfigSection("table")}
                className="flex w-full items-center justify-between rounded-t-lg bg-sky-800 px-3 py-2 text-left text-sm font-semibold text-white"
              >
                <span>Tabel</span>
                <AccordionToggleIcon open={showTableConfig} size="sm" />
              </button>

              <div
                className={`${showTableConfig ? "visible" : "invisible h-0 pointer-events-none"} flex min-h-0 flex-col gap-3 overflow-hidden border-t border-gray-200 p-3`}
              >
                {layers.filter((layer) => isLayerVisible(layer.id)).length ===
                  0 && (
                  <p className="rounded-md border border-stone-200 bg-stone-50 px-3 py-4 text-center text-sm text-stone-500">
                    Pilih layer legenda terlebih dahulu
                  </p>
                )}

                {layers
                  .filter((layer) => isLayerVisible(layer.id))
                  .map((layer) => {
                  const isLayerOpen = openTableLayerId === layer.id;
                  const layerTableConfig = getLayerTableConfig(
                    mapConfig,
                    layer,
                  );
                  const layerPropertyKeys = layer.property_keys ?? [];

                  return (
                    <div
                      key={layer.id}
                      className="flex min-w-0 flex-col rounded-md border border-stone-200 bg-white"
                    >
                      <div className="flex min-h-20 w-full items-center gap-3 px-6 py-6 transition-colors hover:bg-stone-50">
                        <input
                          type="checkbox"
                          checked={layerTableConfig.enabled}
                          onChange={(event) =>
                            updateLayerTableConfig(layer, {
                              enabled: event.target.checked,
                            })
                          }
                          aria-label={`Tampilkan tabel ${layer.name}`}
                          className="shrink-0"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setOpenTableLayerId((current) =>
                              current === layer.id ? null : layer.id,
                            )
                          }
                          className="flex min-w-0 grow items-center justify-between gap-5 text-left"
                        >
                          <span className="flex min-w-0 flex-col">
                            <span className="min-w-0 truncate text-sm font-semibold">
                              {layer.name}
                            </span>
                            <span className="text-xs text-stone-500">
                              {getGeometryLabel(layer.geometry_type)}
                            </span>
                          </span>
                          <AccordionToggleIcon open={isLayerOpen} />
                        </button>
                      </div>

                      <div
                        className={`${isLayerOpen ? "visible" : "invisible h-0 pointer-events-none"} flex min-h-0 flex-col gap-3 overflow-hidden border-t border-stone-200 p-3`}
                      >
                        {layerTableConfig.enabled && (
                          <>
                            <label className="flex flex-col gap-2 text-sm">
                              Susunan Data
                              <select
                                value={layerTableConfig.mode}
                                onChange={(event) =>
                                  updateLayerTableConfig(layer, {
                                    mode:
                                      event.target.value === "columns"
                                        ? "columns"
                                        : "rows",
                                  })
                                }
                                className="h-10 rounded-md border border-stone-300 px-3 py-2"
                              >
                                <option value="rows">Baris</option>
                                <option value="columns">Kolom</option>
                              </select>
                            </label>

                            <div className="grid gap-3 md:grid-cols-2">
                              <label className="flex flex-col gap-2 text-sm">
                                Nama Data
                                <input
                                  value={layerTableConfig.dataLabel}
                                  onChange={(event) =>
                                    updateLayerTableConfig(layer, {
                                      dataLabel: event.target.value,
                                    })
                                  }
                                  className="h-10 rounded-md border border-stone-300 px-3 py-2"
                                />
                              </label>
                              <label className="flex flex-col gap-2 text-sm">
                                Nama Nilai
                                <input
                                  value={layerTableConfig.valueLabel}
                                  onChange={(event) =>
                                    updateLayerTableConfig(layer, {
                                      valueLabel: event.target.value,
                                    })
                                  }
                                  className="h-10 rounded-md border border-stone-300 px-3 py-2"
                                />
                              </label>
                            </div>

                            {layerTableConfig.mode === "rows" ? (
                              <div className="grid gap-3 md:grid-cols-2">
                                <label className="flex flex-col gap-2 text-sm">
                                  Kolom untuk Data
                                  <select
                                    value={layerTableConfig.dataField}
                                    onChange={(event) =>
                                      updateLayerTableConfig(layer, {
                                        dataField: event.target.value,
                                      })
                                    }
                                    className="h-10 rounded-md border border-stone-300 px-3 py-2"
                                  >
                                    {layerPropertyKeys.map((key) => (
                                      <option key={key} value={key}>
                                        {key}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <label className="flex flex-col gap-2 text-sm">
                                  Kolom untuk Nilai
                                  <select
                                    value={layerTableConfig.valueField}
                                    onChange={(event) =>
                                      updateLayerTableConfig(layer, {
                                        valueField: event.target.value,
                                      })
                                    }
                                    className="h-10 rounded-md border border-stone-300 px-3 py-2"
                                  >
                                    {layerPropertyKeys.map((key) => (
                                      <option key={key} value={key}>
                                        {key}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                              </div>
                            ) : (
                              <>
                                <label className="flex flex-col gap-2 text-sm">
                                  Kolom selector fitur
                                  <select
                                    value={layerTableConfig.selectorField}
                                    onChange={(event) =>
                                      updateLayerTableConfig(layer, {
                                        selectorField: event.target.value,
                                      })
                                    }
                                    className="h-10 rounded-md border border-stone-300 px-3 py-2"
                                  >
                                    {getOrderedLayerPopupFields(layer)
                                      .filter((field) => field.selected)
                                      .map((field) => (
                                        <option
                                          key={field.field}
                                          value={field.field}
                                        >
                                          {field.label || field.field}
                                        </option>
                                      ))}
                                  </select>
                                </label>

                                <div className="flex max-h-52 flex-col gap-2 overflow-y-auto rounded-md border border-stone-200 p-3">
                                  <span className="text-sm">
                                    Kolom yang ditampilkan
                                  </span>
                                  {layerPropertyKeys.map((key) => (
                                    <label
                                      key={key}
                                      className="flex items-center gap-2 text-sm"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={layerTableConfig.selectedFields.includes(
                                          key,
                                        )}
                                        onChange={(event) =>
                                          updateLayerTableConfig(layer, {
                                            selectedFields: event.target.checked
                                              ? [
                                                  ...layerTableConfig.selectedFields,
                                                  key,
                                                ]
                                              : layerTableConfig.selectedFields.filter(
                                                  (field) => field !== key,
                                                ),
                                          })
                                        }
                                      />
                                      {key}
                                    </label>
                                  ))}
                                </div>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section
              ref={popupSectionRef}
              className="scroll-mt-24 rounded-lg border border-stone-200 bg-white shadow-md"
            >
              <button
                type="button"
                onClick={() => toggleMapConfigSection("popup")}
                className="flex w-full items-center justify-between rounded-t-lg bg-sky-800 px-3 py-2 text-left text-sm font-semibold text-white"
              >
                <span>Pop-up / Callout</span>
                <AccordionToggleIcon open={showPopupConfig} size="sm" />
              </button>

              <div
                className={`${showPopupConfig ? "visible" : "invisible h-0 pointer-events-none"} flex min-h-0 flex-col gap-3 overflow-hidden border-t border-gray-200 p-3`}
              >
              {visibleCalloutLayers.length === 0 ? (
                <p className="rounded-md border border-stone-200 bg-stone-50 px-3 py-4 text-center text-sm text-stone-500">
                  Pilih layer legenda terlebih dahulu
                </p>
              ) : (
              visibleCalloutLayers.map((layer) => {
                const isPopupLayerOpen = openPopupLayerId === layer.id;
                const layerPopupFields = getOrderedLayerPopupFields(layer);
                const numericLayerPopupFields = getNumericLayerPopupFields(layer);
                const popupEnabled = layerPopupFields.some(
                  (field) => field.selected,
                );

                return (
                <div
                  key={layer.id}
                  className="flex min-w-0 flex-col rounded-md border border-stone-200 bg-white [contain-intrinsic-size:auto_10rem] [content-visibility:auto]"
                >
                  <div className="flex min-h-20 w-full touch-manipulation items-center gap-3 px-6 py-6 transition-colors hover:bg-stone-50">
                    <input
                      type="checkbox"
                      checked={popupEnabled}
                      onChange={(event) => {
                        const selected = event.target.checked;
                        setLayerPopupFields(
                          layer.id,
                          layerPopupFields.map((field) => ({
                            ...field,
                            selected,
                          })),
                        );
                      }}
                      aria-label={`Tampilkan pop-up ${layer.name}`}
                      className="shrink-0"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setOpenPopupLayerId((current) =>
                          current === layer.id ? null : layer.id,
                        )
                      }
                      className="flex min-w-0 grow items-center justify-between gap-5 text-left"
                    >
                      <span className="flex min-w-0 flex-col">
                        <span className="min-w-0 truncate text-sm font-semibold">
                          {layer.name}
                        </span>
                        <span className="text-xs text-stone-500">
                          {getGeometryLabel(layer.geometry_type)}
                        </span>
                      </span>
                      <AccordionToggleIcon open={isPopupLayerOpen} />
                    </button>
                  </div>

                  <div
                    className={`${isPopupLayerOpen ? "visible" : "invisible h-0 pointer-events-none"} flex min-h-0 flex-col gap-2 overflow-hidden border-t border-stone-200 p-3`}
                  >
                  {popupEnabled && (
                  <>
                  {layerPopupFields.map((popupField, popupFieldIndex) => {
                    const popupFieldKey = `${layer.id}:${popupField.field}`;
                    const isNumericField = numericLayerPopupFields.has(
                      popupField.field,
                    );

                    return (
                    <div
                      key={popupFieldKey}
                      draggable
                      onDragStart={() => setDraggedPopupField(popupFieldKey)}
                      onDragEnd={() => {
                        setDraggedPopupField(null);
                        setPopupDropTarget(null);
                      }}
                      onDragOver={(event) => {
                        event.preventDefault();

                        if (!draggedPopupField) return;

                        const bounds =
                          event.currentTarget.getBoundingClientRect();
                        const position =
                          event.clientY < bounds.top + bounds.height / 2
                            ? "before"
                            : "after";

                        setPopupDropTarget({
                          field: popupFieldKey,
                          position,
                        });
                      }}
                      onDragLeave={(event) => {
                        if (
                          !event.currentTarget.contains(
                            event.relatedTarget as Node,
                          )
                        ) {
                          setPopupDropTarget((current) =>
                            current?.field === popupFieldKey ? null : current,
                          );
                        }
                      }}
                      onDrop={(event) => {
                        event.preventDefault();

                        if (draggedPopupField?.startsWith(`${layer.id}:`)) {
                          reorderLayerPopupField(
                            layer,
                            draggedPopupField.slice(layer.id.length + 1),
                            popupField.field,
                            popupDropTarget?.field === popupFieldKey
                              ? popupDropTarget.position
                              : "before",
                          );
                        }

                        setDraggedPopupField(null);
                        setPopupDropTarget(null);
                      }}
                      className={`relative grid cursor-grab grid-cols-[3.25rem_minmax(0,1fr)] items-stretch gap-0 rounded-md border py-3 pr-3 pl-0 transition ${
                        draggedPopupField === popupFieldKey
                          ? "border-sky-300 bg-sky-50"
                          : "border-stone-200 bg-white"
                      } ${
                        popupDropTarget?.field === popupFieldKey
                          ? popupDropTarget.position === "before"
                            ? "border-t-4 border-t-black"
                            : "border-b-4 border-b-black"
                          : ""
                      }`}
                    >
                      <div className="flex min-h-full w-full items-center justify-center text-stone-400">
                        <div className="flex w-full flex-col items-center justify-center gap-1 md:hidden">
                          <button
                            type="button"
                            onClick={() =>
                              moveLayerPopupField(
                                layer,
                                popupField.field,
                                "up",
                              )
                            }
                            disabled={popupFieldIndex === 0}
                            className="flex h-7 w-full items-center justify-center rounded text-stone-500 disabled:cursor-not-allowed disabled:opacity-30"
                            aria-label={`Pindahkan ${popupField.field} ke atas`}
                          >
                            <UpChevron className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              moveLayerPopupField(
                                layer,
                                popupField.field,
                                "down",
                              )
                            }
                            disabled={
                              popupFieldIndex === layerPopupFields.length - 1
                            }
                            className="flex h-7 w-full items-center justify-center rounded text-stone-500 disabled:cursor-not-allowed disabled:opacity-30"
                            aria-label={`Pindahkan ${popupField.field} ke bawah`}
                          >
                            <DownChevron className="h-4 w-4" />
                          </button>
                        </div>
                            <Draggable className="hidden h-7 w-5 md:block" />
                      </div>

                      <div className="flex min-w-0 flex-col gap-2 pl-1">
                        <div className="flex min-w-0 flex-row flex-wrap items-center gap-3">
                          <DeferredCheckbox
                            key={`callout-${layer.id}-${popupField.field}-${popupField.selected}`}
                            checked={popupField.selected}
                            onCommit={(checked) =>
                              updateLayerPopupField(layer, popupField.field, {
                                selected: checked,
                              })
                            }
                            ariaLabel={`Tampilkan ${popupField.field} di pop-up`}
                            className="h-4 w-4 shrink-0"
                          />

                          <span className="min-w-28 flex-1 basis-28 truncate text-sm text-stone-700">
                            {popupField.field}
                          </span>

                          <input
                            value={popupField.label}
                            disabled={!popupField.selected}
                            onChange={(event) =>
                              updateLayerPopupField(layer, popupField.field, {
                                label: event.target.value,
                              })
                            }
                            className="h-10 min-w-40 flex-[2_1_10rem] rounded-md border border-stone-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400"
                          />
                        </div>

                        {isNumericField && (
                          <div className="flex min-w-0 flex-row flex-wrap items-center gap-3">
                            <DeferredCheckbox
                              key={`callout-suffix-${layer.id}-${popupField.field}-${popupField.suffixEnabled}`}
                              checked={popupField.suffixEnabled}
                              onCommit={(checked) =>
                                updateLayerPopupField(layer, popupField.field, {
                                  suffixEnabled: checked,
                                })
                              }
                              ariaLabel={`Gunakan satuan untuk ${popupField.field}`}
                              className="h-4 w-4 shrink-0"
                            />
                            <span className="min-w-28 flex-1 basis-28 text-sm text-stone-700">
                              Satuan
                            </span>
                            {popupField.suffixEnabled && (
                              <input
                                value={popupField.suffix}
                                onChange={(event) =>
                                  updateLayerPopupField(layer, popupField.field, {
                                    suffix: event.target.value,
                                  })
                                }
                                className="h-10 min-w-40 flex-[2_1_10rem] rounded-md border border-stone-300 px-3 py-2 text-sm"
                              />
                            )}
                          </div>
                        )}
                      </div>
                      </div>
                    );
                  })}
                  </>
                  )}
                  </div>
                </div>
                );
              })
              )}
              </div>
            </section>

            {role === "admin" && (
              <section
                ref={linkSectionRef}
                className="scroll-mt-24 rounded-lg border border-stone-200 bg-white shadow-md"
              >
                <button
                  type="button"
                  onClick={() => toggleMapConfigSection("link")}
                  className="flex w-full items-center justify-between rounded-t-lg bg-sky-800 px-3 py-2 text-left text-sm font-semibold text-white"
                >
                  <span>Tautan</span>
                  <AccordionToggleIcon open={showLinkConfig} size="sm" />
                </button>

                <div
                  className={`${showLinkConfig ? "visible" : "invisible h-0 pointer-events-none"} flex min-h-0 flex-col gap-3 overflow-hidden border-t border-gray-200 p-3`}
                >
                  {mapConfig.links.map((link, index) => (
                    <div
                      key={link.id}
                      className="flex flex-col gap-3 rounded-md border border-stone-200 bg-white p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold">
                          Tautan {index + 1}
                        </p>
                        <button
                          type="button"
                          onClick={() => deleteMapLink(link.id)}
                          aria-label={`Hapus tautan ${index + 1}`}
                          className="flex size-9 shrink-0 items-center justify-center rounded-md text-rose-600 transition-colors hover:bg-rose-50 hover:text-rose-700"
                        >
                          <Delete className="size-5" />
                        </button>
                      </div>

                      <label className="flex flex-col gap-2 text-sm">
                        Label Tautan
                        <input
                          value={link.name}
                          onChange={(event) =>
                            updateMapLink(link.id, {
                              name: event.target.value,
                            })
                          }
                          className="h-10 rounded-md border border-stone-300 px-3 py-2"
                        />
                      </label>

                      <label className="flex flex-col gap-2 text-sm">
                        Alamat
                        <input
                          type="url"
                          value={link.address}
                          onChange={(event) =>
                            updateMapLink(link.id, {
                              address: event.target.value,
                            })
                          }
                          placeholder="https://"
                          className="h-10 rounded-md border border-stone-300 px-3 py-2"
                        />
                      </label>

                      <fieldset className="flex flex-col gap-2 text-sm">
                        <legend>Gaya Tombol</legend>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            aria-pressed={link.style === "filled"}
                            onClick={() =>
                              updateMapLink(link.id, { style: "filled" })
                            }
                            className={`rounded-md border px-3 py-2 font-semibold ${
                              link.style === "filled"
                                ? "border-sky-800 bg-sky-800 text-white"
                                : "border-stone-300 bg-white text-stone-600"
                            }`}
                          >
                            Style 1
                          </button>
                          <button
                            type="button"
                            aria-pressed={link.style === "outline"}
                            onClick={() =>
                              updateMapLink(link.id, { style: "outline" })
                            }
                            className={`rounded-md border px-3 py-2 font-semibold ${
                              link.style === "outline"
                                ? "border-sky-800 bg-white text-sky-800"
                                : "border-stone-300 bg-white text-stone-600"
                            }`}
                          >
                            Style 2
                          </button>
                        </div>
                      </fieldset>

                      <label className="flex flex-col gap-2 text-sm">
                        Icon
                        <span
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={(event) => {
                            event.preventDefault();
                            const file = event.dataTransfer.files[0];
                            if (file) void uploadMapLinkIcon(link.id, file);
                          }}
                          className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-stone-300 bg-stone-50 p-3 text-center text-xs text-stone-500 hover:bg-stone-100"
                        >
                          <input
                            type="file"
                            accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                            className="hidden"
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (file) void uploadMapLinkIcon(link.id, file);
                              event.target.value = "";
                            }}
                          />
                          {link.iconPath ? (
                            <>
                              <img
                                src={getPublicImageUrl(link.iconPath)}
                                alt={`Icon ${link.name || `tautan ${index + 1}`}`}
                                className="mb-2 h-16 w-16 rounded-md object-contain"
                              />
                              <span>
                                Klik atau jatuhkan gambar untuk mengganti.
                              </span>
                            </>
                          ) : (
                            "Klik atau jatuhkan JPG, JPEG, atau PNG di sini."
                          )}
                        </span>
                      </label>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addMapLink}
                    className="flex min-h-16 w-full items-center justify-center rounded-md border-2 border-dashed border-stone-300 bg-stone-50 px-4 py-3 text-sm font-semibold text-stone-600 transition-colors hover:border-sky-500 hover:bg-sky-50 hover:text-sky-800"
                  >
                    Tambah tautan
                  </button>
                </div>
              </section>
            )}

            <div className="hidden xl:block">
              <Button
                onClick={() => setMapConfirmAction("visualization")}
                loading={saving}
                fullWidth
                className="rounded-md"
              >
                {visualizationButtonLabel}
              </Button>
            </div>
          </div>

          <div className="w-full min-w-0 lg:w-[65%]">
            <section className="rounded-lg border border-stone-200 bg-white shadow-md">
              <div className="flex w-full items-center justify-between rounded-t-lg bg-sky-800 px-3 py-2 text-left text-sm font-semibold text-white">
                <span>Preview</span>
                <button
                  type="button"
                  onClick={applyDraftToPreview}
                  disabled={previewRefreshing}
                  className="flex items-center gap-2 rounded-md border border-white/60 px-2 py-1 text-xs text-white disabled:cursor-wait disabled:opacity-70"
                  aria-label="Refresh preview"
                >
                  {previewRefreshing ? (
                    <SpinnerLoading size="sm" color="white" />
                  ) : (
                    <Refresh className="h-4 w-4" />
                  )}
                  <span>Refresh</span>
                </button>
              </div>

              <div className="p-3">
                {previewLayers.length > 0 && (
                  <label className="mb-3 flex min-w-0 grow flex-col gap-2 text-sm">
                    Filter Layer
                    <select
                      value={selectedPreviewLayerId}
                      onChange={(event) =>
                        setSelectedPreviewLayerId(event.target.value)
                      }
                      className="h-10 rounded-md border border-stone-300 px-3 py-2"
                    >
                      <option value="">Semua</option>
                      {previewLayers.map((layer) => (
                        <option key={layer.id} value={layer.id}>
                          {layer.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <div className="relative min-h-[60vh] min-w-0 overflow-hidden rounded-md">
                  {previewLegendEnabled && (
                  <div
                    className={`absolute inset-y-0 left-0 z-[1200] flex min-h-[60vh] min-w-0 flex-col bg-sky-800 text-white transition-transform duration-300 ${
                      showPreviewLegend
                        ? "translate-x-0"
                        : "-translate-x-full"
                    } w-[65%] gap-3 p-3 md:w-[30%]`}
                  >
                    <div className="flex w-full items-center justify-between gap-3">
                      <p className="text-sm font-semibold">Legenda</p>
                      <button
                        type="button"
                        onClick={() => setShowPreviewLegend(false)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-sky-700 text-white hover:bg-sky-600"
                        aria-label="Tutup legenda"
                      >
                        <LeftChevron className="h-4 w-4" />
                      </button>
                    </div>

                    {filteredPreviewLegendLayers.length === 0 ? (
                      <p className="text-xs text-white/80">
                        Tidak ada layer aktif.
                      </p>
                    ) : (
                      <>
                        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
                          {filteredPreviewLegendLayers.map((layer) => (
                            <div
                              key={`preview-legend-${layer.id}`}
                              className="flex flex-col gap-2"
                            >
                              <p className="text-xs font-semibold">
                                {layer.name}
                              </p>
                              {layer.legends.map((legend) => {
                                const optionId = `${layer.id}|||${legend.value}`;
                                const isActive =
                                  selectedPreviewLegendFilterIds.includes(
                                    optionId,
                                  );
                                const swatchColor =
                                  legend.fill_color ||
                                  legend.stroke_color ||
                                  legend.color ||
                                  "#0EA5E9";

                                if (legend.label_only) {
                                  return (
                                    <div
                                      key={optionId}
                                      className="w-full px-2 py-1 text-xs font-semibold leading-snug text-white"
                                    >
                                      {legend.label || legend.value}
                                    </div>
                                  );
                                }

                                return (
                                  <button
                                    key={optionId}
                                    type="button"
                                    onClick={() =>
                                      setSelectedPreviewLegendFilterIds(
                                        (current) =>
                                          current.includes(optionId)
                                            ? current.filter(
                                                (item) => item !== optionId,
                                              )
                                            : [...current, optionId],
                                      )
                                    }
                                    className={`flex w-full cursor-pointer items-center justify-start gap-3 rounded-xl border border-sky-600 px-2 py-1 text-left hover:bg-sky-700 ${
                                      isActive ? "bg-sky-700" : ""
                                    }`}
                                  >
                                    {legend.icon_path ? (
                                      <span className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded border border-sky-600 bg-white">
                                        <img
                                          src={getPublicImageUrl(
                                            legend.icon_path,
                                          )}
                                          alt={legend.label || legend.value}
                                          className="h-6 w-6 object-contain"
                                        />
                                      </span>
                                    ) : legend.geometry_type === "polyline" ? (
                                      <span
                                        className="h-0 w-8 shrink-0 rounded-full border-t-4"
                                        style={{
                                          borderColor:
                                            legend.stroke_color ||
                                            legend.color ||
                                            "#0EA5E9",
                                        }}
                                      />
                                    ) : (
                                      <span
                                        className="h-7.5 w-7.5 shrink-0 rounded-full border"
                                        style={{
                                          backgroundColor: swatchColor,
                                          backgroundImage:
                                            legend.fill_pattern && legend.fill_pattern !== "none"
                                              ? getMapPatternFill(
                                                  legend.fill_pattern,
                                                  legend.pattern_color,
                                                  swatchColor,
                                                  legend.pattern_thickness ?? 1.25,
                                                  legend.pattern_opacity ?? 1,
                                                  legend.pattern_gap ?? 8,
                                                )
                                              : undefined,
                                          borderColor:
                                            legend.stroke_color ||
                                            legend.color ||
                                            swatchColor,
                                        }}
                                      />
                                    )}
                                      <span className="min-w-0 whitespace-normal break-words text-xs leading-snug">
                                        {legend.label || legend.value}
                                      </span>
                                  </button>
                                );
                              })}
                            </div>
                          ))}
                        </div>

                        <button
                          type="button"
                          className="mt-1 flex cursor-pointer items-center justify-center rounded-md bg-sky-600 py-2 text-xs text-white hover:bg-sky-700"
                          onClick={() => {
                            setSelectedPreviewLegendFilterIds([]);
                            setPreviewMapBoundsTrigger((current) => current + 1);
                          }}
                        >
                          Reset
                        </button>
                      </>
                    )}
                  </div>
                  )}

                  {previewLegendEnabled && showPreviewLegend && (
                    <div
                      className="absolute inset-0 z-[1100] bg-black/50"
                      onClick={() => setShowPreviewLegend(false)}
                    />
                  )}

                  {previewLegendEnabled && (
                  <button
                    type="button"
                    onClick={() => setShowPreviewLegend(true)}
                    className={`absolute left-0 top-1/2 z-[1150] flex -translate-y-1/2 flex-col items-center gap-1 rounded-r-md bg-sky-800 px-1.5 py-3 text-white transition-opacity hover:bg-sky-200 hover:text-stone-950 ${
                      showPreviewLegend
                        ? "pointer-events-none opacity-0"
                        : "opacity-100"
                    }`}
                    aria-label="Buka legenda"
                  >
                    <span className="[writing-mode:vertical-rl] text-xs font-semibold">
                      Legenda
                    </span>
                  </button>
                  )}

                  <div className="min-w-0">
                    <MapPreviewDynamic
                      layers={previewLayers}
                      mapConfig={previewMapConfig}
                      bounds={previewBounds}
                      boundsTrigger={previewMapBoundsTrigger}
                      onRenderComplete={handlePreviewRenderComplete}
                      onFeatureSelect={handlePreviewFeatureSelect}
                      selectedLegendFilters={
                        previewLegendEnabled ? selectedPreviewLegendFilters : []
                      }
                      heightClassName="h-[60vh] min-h-[60vh]"
                      className=""
                    />
                  </div>
                </div>

                <MapLinks links={previewMapConfig.links} />

                {hasEnabledPreviewTable && (
                  <div className="mt-4 overflow-x-auto rounded-md border border-stone-300">
                    {selectedPreviewTable ? (
                      <>
                    <div className="border-b border-stone-300 bg-stone-50 px-3 py-2 text-sm font-semibold">
                      {selectedPreviewTable.selectorValue}
                    </div>
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-sky-100">
                          <th className="border border-stone-300 px-3 py-2 text-left">
                            {selectedPreviewTable.dataLabel}
                          </th>
                          <th className="border border-stone-300 px-3 py-2 text-left">
                            {selectedPreviewTable.valueLabel}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedPreviewTable.rows.map((row, index) => (
                          <tr key={`${row.data}-${index}`}>
                            <td className="border border-stone-300 px-3 py-2">
                              {row.data || "-"}
                            </td>
                            <td className="border border-stone-300 px-3 py-2">
                              {row.value || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                      </>
                    ) : (
                      <div className="bg-stone-50 px-4 py-5 text-center text-sm text-stone-600">
                        Klik fitur pada peta untuk menampilkan data terkait.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>

            <div className="mt-3 xl:hidden">
              <Button
                onClick={() => setMapConfirmAction("visualization")}
                loading={saving}
                fullWidth
                className="rounded-md"
              >
                {visualizationButtonLabel}
              </Button>
            </div>
          </div>
        </div>
      )}

      {view === "mappreview" && (
        <section className="flex flex-col gap-6">
          <MapPreviewDynamic
            layers={previewLayers}
            mapConfig={previewMapConfig}
            bounds={previewBounds}
            selectedLegendFilters={selectedPreviewLegendFilters}
          />

          <Button variant="outline" onClick={handleDownloadCsv}>
            Download CSV
          </Button>
        </section>
      )}

      {view === "publication" && (
        <section className="flex min-h-[70vh] flex-col gap-4">
          <div className="pointer-events-none fixed left-[-200vw] top-0 h-[540px] w-[960px] opacity-0">
            <MapPreviewDynamic
              layers={previewLayers}
              mapConfig={publicationSnapshotMapConfig}
              bounds={dataset?.bounds ?? null}
              selectedLegendFilters={[]}
              heightClassName="h-[540px]"
              snapshotTrigger={publicationSnapshotTrigger}
              onSnapshot={handlePublicationSnapshot}
            />
          </div>

          <div
            className={`rounded border p-3 text-sm ${
              publicationStatus === "approved"
                ? "border-green-200 bg-green-50 text-green-700"
                : publicationStatus === "rejected"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-yellow-200 bg-yellow-50 text-yellow-700"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span>
                {publicationStatus === "approved"
                  ? "Peta telah dipublikasikan."
                  : publicationStatus === "rejected"
                    ? "Publikasi peta ini ditolak."
                    : publicationStatus === "requested"
                      ? "Publikasi peta ini menunggu persetujuan."
                      : "Peta belum dipublikasikan."}
              </span>

              {role === "admin" && publicationStatus !== null && (
                <select
                  value={
                    publicationStatus === "requested" ||
                    publicationStatus === "approved" ||
                    publicationStatus === "rejected"
                      ? publicationStatus
                      : ""
                  }
                  disabled={saving}
                  onChange={(event) =>
                    requestPublicationStatusChange(
                      event.target.value as EditablePublicationStatus,
                    )
                  }
                  className="ml-2 rounded border border-gray-300 bg-white px-2 py-1 text-sm text-black disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="" disabled>
                    Pilih Status
                  </option>
                  <option value="requested">Tangguhkan</option>
                  <option value="approved">Setujui</option>
                  <option value="rejected">Tolak</option>
                </select>
              )}
            </div>
          </div>

          {!showPublicationForm && publicationStatus === null && (
            <Button
              type="button"
              onClick={() => setShowPublicationForm(true)}
              fullWidth
              className="rounded-md"
            >
              Publikasikan Peta Ini
            </Button>
          )}

          {showPublicationForm && (
            <div className="flex flex-col gap-6 rounded-md border border-stone-200 bg-white p-4 shadow-md">
              <div className="flex flex-col gap-3">
                {publicationPreviewImageSrc ? (
                  <img
                    src={publicationPreviewImageSrc}
                    alt={label}
                    className="max-h-[280px] w-full rounded-md object-cover"
                  />
                ) : (
                  <div className="flex min-h-44 items-center justify-center rounded-md border border-dashed border-stone-300 bg-stone-50 px-4 text-center text-sm text-stone-500">
                    Snapshot peta sedang disiapkan.
                  </div>
                )}

                <input
                  ref={publicationImageInputRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];

                    if (file) setPublicationImageFile(file);
                  }}
                />

                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    onClick={() => publicationImageInputRef.current?.click()}
                    disabled={refreshingPublicationSnapshot}
                    className="grow"
                  >
                    Ubah Gambar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => void refreshPublicationSnapshot()}
                    loading={refreshingPublicationSnapshot}
                    disabled={saving}
                    className="grow"
                  >
                    Refresh
                  </Button>
                </div>
              </div>

              <label className="flex flex-col gap-2 text-sm">
                Judul Peta
                <input
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  className="rounded-md border border-stone-300 p-2"
                />
              </label>

              <div className="flex flex-wrap gap-2">
                {TAG_OPTIONS.map((tag) => (
                  <button
                    key={tag.value}
                    type="button"
                    onClick={() => toggleTag(tag.value)}
                    className={`rounded-full border px-3 py-1 text-sm ${
                      publicationTags.includes(tag.value)
                        ? "border-sky-800 bg-sky-800 text-white"
                        : "border-sky-800 bg-white text-sky-900"
                    }`}
                  >
                    {tag.label}
                  </button>
                ))}
              </div>

              <fieldset className="space-y-3 rounded-lg border border-gray-200 bg-gray-50/60 p-4">
                <legend className="px-1 text-sm font-semibold text-gray-900">
                  Wilayah Administratif — Kabupaten / Kota{" "}
                  <span className="text-red-600" aria-hidden="true">
                    *
                  </span>
                </legend>

                <div className="flex flex-wrap gap-2">
                  {DATA_REGENCY_OPTIONS.map((regency) => {
                    const selected = publicationDataRegencies.includes(
                      regency.value,
                    );

                    return (
                      <button
                        key={regency.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() =>
                          togglePublicationDataRegency(regency.value)
                        }
                        className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 ${
                          selected
                            ? "border-sky-700 bg-sky-700 text-white hover:bg-sky-800"
                            : "border-gray-300 bg-white text-gray-700 hover:border-sky-400 hover:bg-sky-50"
                        }`}
                      >
                        {regency.label}
                      </button>
                    );
                  })}
                </div>

                <p className="text-xs leading-relaxed text-gray-500">
                  Wajib pilih minimal satu kabupaten atau kota yang dicakup
                  oleh peta.
                </p>
              </fieldset>

              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm transition-colors hover:bg-sky-50">
                <input
                  type="checkbox"
                  checked={publicationInKkpd}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setPublicationInKkpd(checked);
                    if (!checked) setPublicationDataKkpd([]);
                  }}
                  className="h-4 w-4 accent-sky-700"
                />
                <span>
                  <span className="block font-medium text-gray-900">
                    Kawasan Konservasi
                  </span>
                  <span className="block text-xs text-gray-500">
                    Peta mencakup salah satu kawasan konservasi.
                  </span>
                </span>
              </label>

              {publicationInKkpd && (
                <fieldset className="space-y-3 rounded-lg border border-gray-200 bg-gray-50/60 p-4">
                  <legend className="px-1 text-sm font-semibold text-gray-900">
                    Kawasan Konservasi — KKD
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {DATA_KKPD_OPTIONS.map((area) => {
                      const selected = publicationDataKkpd.includes(area.value);
                      return (
                        <button
                          key={area.id}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => togglePublicationDataKkpd(area.value)}
                          className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 ${
                            selected
                              ? "border-sky-700 bg-sky-700 text-white hover:bg-sky-800"
                              : "border-gray-300 bg-white text-gray-700 hover:border-sky-400 hover:bg-sky-50"
                          }`}
                        >
                          {area.label}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              )}

              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm transition-colors hover:bg-sky-50">
                <input
                  type="checkbox"
                  checked={publicationInSubWpp}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setPublicationInSubWpp(checked);
                    if (!checked) setPublicationDataSubWpp([]);
                  }}
                  className="h-4 w-4 accent-sky-700"
                />
                <span>
                  <span className="block font-medium text-gray-900">
                    Wilayah Perikanan
                  </span>
                  <span className="block text-xs text-gray-500">
                    Peta mencakup salah satu wilayah Sub-WPP.
                  </span>
                </span>
              </label>

              {publicationInSubWpp && (
                <fieldset className="space-y-3 rounded-lg border border-gray-200 bg-gray-50/60 p-4">
                  <legend className="px-1 text-sm font-semibold text-gray-900">
                    Wilayah Perikanan — Sub-WPP
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {DATA_SUBWPP_OPTIONS.map((subWpp) => {
                      const selected = publicationDataSubWpp.includes(
                        subWpp.value,
                      );
                      return (
                        <button
                          key={subWpp.id}
                          type="button"
                          aria-pressed={selected}
                          onClick={() =>
                            togglePublicationDataSubWpp(subWpp.value)
                          }
                          className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 ${
                            selected
                              ? "border-sky-700 bg-sky-700 text-white hover:bg-sky-800"
                              : "border-gray-300 bg-white text-gray-700 hover:border-sky-400 hover:bg-sky-50"
                          }`}
                        >
                          {subWpp.label}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              )}

              <label className="flex flex-col gap-2 text-sm">
                Deskripsi
                <textarea
                  value={publicationDescription}
                  onChange={(event) =>
                    setPublicationDescription(event.target.value)
                  }
                  className="min-h-32 rounded-md border border-stone-300 p-2"
                />
              </label>

              <Button
                onClick={() => setMapConfirmAction("publication")}
                loading={saving}
                fullWidth
                className="rounded-md"
              >
                {publicationButtonLabel}
              </Button>
            </div>
          )}
        </section>
      )}

      {mapConfirmAction && (
        <AlertNotif
          type="double"
          icon="warning"
          msg={getMapConfirmMessage(mapConfirmAction)}
          yesText="Ya"
          noText="Tidak"
          loading={saving}
          confirm={(confirmation) => {
            const confirmedAction = mapConfirmAction;

            if (!confirmation) {
              setMapConfirmAction(null);
              return;
            }

            setMapConfirmAction(null);
            handleMapConfirmAction(confirmedAction);
          }}
        />
      )}

      {deleteConfirm && selectedLayer && (
        <AlertNotif
          type="double"
          icon="warning"
          msg={
            deleteConfirm === "dataset"
              ? `Hapus layer ${selectedLayer.name} ?`
              : `Hapus (${selectedFeatureRows.length}) Feature dari layer ini ?`
          }
          yesText="Ya"
          noText="Tidak"
          loading={saving}
          confirm={(confirmation) => {
            if (!confirmation) {
              setDeleteConfirm(null);
              return;
            }

            setDeleteConfirm(null);
            void deleteSelectedFeatures();
          }}
        />
      )}

      {pendingPublicationStatus && (
        <AlertNotif
          type="double"
          msg="Ubah status publikasi?"
          yesText="Ya"
          noText="Tidak"
          icon="warning"
          loading={saving}
          confirm={handleConfirmPublicationStatusChange}
        />
      )}

      {alert !== "none" && (
        <AlertNotif
          type="single"
          icon={alert === "success" ? "success" : alert === "failed" ? "failed" : "warning"}
          msg={
            alert === "success"
              ? message || "Perubahan peta berhasil disimpan."
              : message || "Periksa kembali data peta."
          }
          yesText="OK"
          confirm={() => {
            setAlert("none");
            setMessage("");
          }}
        />
      )}
    </div>
  );
}
