"use client";

import { useEffect, useMemo, useState } from "react";
import type { FeatureCollection } from "geojson";
import { supabase } from "@/lib/supabase/supabaseClient";
import {
  collectionToCsv,
  getBoundsFromCollection,
  getMapPatternFill,
  isFeatureCollection,
  parseJsonArray,
  parseMapConfig,
  type MapAttachment,
  type MapConfig,
  type MapGeometryType,
} from "@/lib/utils/mapConfig";
import DataPageDropdown from "../DataPageDropdown";
import SpinnerLoading from "../SpinnerLoading";
import MapPreviewDynamic from "./MapPreviewDynamic";
import type { MapLegendItem, MapPreviewLayer } from "./MapPreview";
import { LeftChevron, VerticalThreeDot } from "@/public/icons/iconSets";

type PageOption = {
  title: string;
  slug: string;
};

type Props = {
  slug: string;
  pages: PageOption[];
};

type MapDatasetRow = {
  id: string;
  label: string | null;
  bounds: { south: number; west: number; north: number; east: number } | null;
  map_config: MapConfig | string | null;
  documents_path: MapAttachment[] | string | null;
  pictures_path: MapAttachment[] | string | null;
  description: string | null;
};

type MapLayerRow = {
  id: string;
  name: string;
  geometry_type: MapGeometryType;
  source_path: string | null;
};

type MapLegendRow = {
  map_layer_id: string;
  value: string;
  label: string;
  geometry_type: Exclude<MapGeometryType, "mixed">;
  color: string | null;
  fill_color: string | null;
  stroke_color: string | null;
  stroke_width: number | null;
  fill_opacity: number | null;
  fill_pattern: import("@/lib/utils/mapConfig").MapFillPattern | null;
  pattern_color: string | null;
  pattern_thickness: number | null;
  pattern_opacity: number | null;
  pattern_gap: number | null;
  icon_path: string | null;
  icon_width: number | null;
  icon_height: number | null;
  visible_by_default: boolean | null;
};

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function loadGeoJson(path: string | null) {
  if (!path) return null;

  const { data, error } = await supabase.storage.from("geojsons").download(path);

  if (error) throw error;

  const parsed = JSON.parse(await data.text()) as unknown;

  return isFeatureCollection(parsed) ? parsed : null;
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

function getDocumentUrl(path: string) {
  const { data } = supabase.storage.from("documents").getPublicUrl(path);
  return data.publicUrl;
}

function getPublicImageUrl(path: string | null | undefined) {
  if (!path) return "";
  if (path.startsWith("http") || path.startsWith("/")) return path;

  const { data } = supabase.storage.from("images").getPublicUrl(path);

  return data.publicUrl;
}

export default function MapPublic({ slug, pages }: Props) {
  const [loading, setLoading] = useState(true);
  const [dataset, setDataset] = useState<MapDatasetRow | null>(null);
  const [layers, setLayers] = useState<MapPreviewLayer[]>([]);
  const [selectedLegendFilterIds, setSelectedLegendFilterIds] = useState<string[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState("");
  const [showLegend, setShowLegend] = useState(false);
  const [mapBoundsTrigger, setMapBoundsTrigger] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetchMap = async () => {
      try {
        setLoading(true);

        const { data: rows, error } = await supabase
          .from("map_datasets")
          .select(
            "id, label, bounds, map_config, documents_path, pictures_path, description",
          )
          .eq("published", "approved");

        if (error) throw error;

        const mapRow = ((rows ?? []) as MapDatasetRow[]).find(
          (row) => toSlug(row.label ?? "") === slug,
        );

        if (!mapRow) {
          setDataset(null);
          setLayers([]);
          return;
        }

        const { data: layerRows, error: layerError } = await supabase
          .from("map_layers")
          .select("id, name, geometry_type, source_path")
          .eq("map_dataset_id", mapRow.id)
          .order("sort_order", { ascending: true });

        if (layerError) throw layerError;

        const layerIds = (layerRows ?? []).map((layer) => layer.id);
        const { data: legendRows, error: legendError } =
          layerIds.length > 0
            ? await supabase
                .from("map_legend_items")
                .select(
                  "map_layer_id, value, label, geometry_type, color, fill_color, stroke_color, stroke_width, fill_opacity, fill_pattern, pattern_color, pattern_thickness, pattern_opacity, pattern_gap, icon_path, icon_width, icon_height, visible_by_default",
                )
                .in("map_layer_id", layerIds)
                .order("sort_order", { ascending: true })
            : { data: [], error: null };

        if (legendError) throw legendError;

        const loadedLayers = await Promise.all(
          ((layerRows ?? []) as MapLayerRow[]).map(async (layer) => {
            const collection = await loadGeoJson(layer.source_path);
            const legends = ((legendRows ?? []) as MapLegendRow[])
              .filter((legend) => legend.map_layer_id === layer.id)
              .map((legend) => ({
                value: legend.value,
                label: legend.label,
                geometry_type: legend.geometry_type,
                color: legend.color,
                fill_color: legend.fill_color,
                stroke_color: legend.stroke_color,
                stroke_width: legend.stroke_width,
                fill_opacity: legend.fill_opacity,
                fill_pattern: legend.fill_pattern,
                pattern_color: legend.pattern_color,
                pattern_thickness: legend.pattern_thickness,
                pattern_opacity: legend.pattern_opacity,
                pattern_gap: legend.pattern_gap,
                icon_path: legend.icon_path,
                icon_width: legend.icon_width,
                icon_height: legend.icon_height,
                visible_by_default: legend.visible_by_default,
                label_only: legend.visible_by_default === false,
              }));

            return collection
              ? {
                  id: layer.id,
                  name: layer.name,
                  geometry_type: layer.geometry_type,
                  collection,
                  legends,
                }
              : null;
          }),
        );

        if (cancelled) return;

        setDataset(mapRow);
        const nextLayers: MapPreviewLayer[] = [];

        loadedLayers.forEach((layer) => {
          if (layer) {
            nextLayers.push(layer);
          }
        });

        setLayers(nextLayers);
      } catch (error) {
        console.error("Failed to fetch public map:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchMap();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const mapConfig = useMemo(
    () => parseMapConfig(dataset?.map_config),
    [dataset?.map_config],
  );
  const visibleLegendLayers = useMemo(
    () =>
      layers
        .filter((layer) => !mapConfig.hiddenMapLayerIds.includes(layer.id))
        .filter((layer) => !selectedLayerId || layer.id === selectedLayerId),
    [layers, mapConfig.hiddenMapLayerIds, selectedLayerId],
  );
  const publicMapConfig = useMemo(
    () =>
      selectedLayerId
        ? {
            ...mapConfig,
            hiddenMapLayerIds: [
              ...new Set([
                ...mapConfig.hiddenMapLayerIds,
                ...layers
                  .filter((layer) => layer.id !== selectedLayerId)
                  .map((layer) => layer.id),
              ]),
            ],
          }
        : mapConfig,
    [layers, mapConfig, selectedLayerId],
  );
  const publicMapBounds = useMemo(() => {
    if (!selectedLayerId) return dataset?.bounds ?? null;

    const selectedLayer = layers.find((layer) => layer.id === selectedLayerId);

    return selectedLayer
      ? getBoundsFromCollection(selectedLayer.collection)
      : dataset?.bounds ?? null;
  }, [dataset?.bounds, layers, selectedLayerId]);
  const legendEnabled = visibleLegendLayers.some(
    (layer) => layer.legends.length > 0,
  );
  const selectedLegendFilters = useMemo(
    () =>
      visibleLegendLayers.flatMap((layer) =>
        layer.legends
          .filter(
            (legend) =>
              !legend.label_only &&
              selectedLegendFilterIds.includes(`${layer.id}|||${legend.value}`),
          )
          .map((legend) => ({
            layerId: layer.id,
            value: legend.value,
          })),
      ),
    [selectedLegendFilterIds, visibleLegendLayers],
  );
  const documents = parseJsonArray<MapAttachment>(dataset?.documents_path);
  const canDownloadCsv = layers.length > 0;

  useEffect(() => {
    if (!dataset?.id) return;

    const storageKey = `public-dataset-view:map:${dataset.id}`;
    if (window.sessionStorage.getItem(storageKey)) return;

    window.sessionStorage.setItem(storageKey, "1");
    void supabase
      .rpc("record_public_dataset_metric", {
        p_resource_kind: "map",
        p_resource_id: dataset.id,
        p_metric: "view",
      })
      .then(({ error }) => {
        if (error) {
          window.sessionStorage.removeItem(storageKey);
          console.warn("Failed to record map view:", error);
        }
      });
  }, [dataset?.id]);

  const downloadCsv = () => {
    if (!canDownloadCsv) return;

    if (dataset?.id) {
      void supabase
        .rpc("record_public_dataset_metric", {
          p_resource_kind: "map",
          p_resource_id: dataset.id,
          p_metric: "download",
        })
        .then(({ error }) => {
          if (error) console.warn("Failed to record map download:", error);
        });
    }

    const collections = layers.map((layer) => layer.collection);
    downloadText(`${slug}.csv`, collectionToCsv(collections as FeatureCollection[]));
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <SpinnerLoading size="sm" color="black" />
      </div>
    );
  }

  if (!dataset) {
    return <p className="mx-8 my-12">Peta tidak ditemukan.</p>;
  }

  return (
    <section className="flex min-h-[70vh] w-full flex-col px-6 pb-12 md:px-12">
      <DataPageDropdown pages={pages} />

      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="min-w-0 font-bold">{dataset.label}</h2>

        <div className="shrink-0">
          <details three-dot-menu="true" className="group relative">
            <summary className="list-none cursor-pointer rounded-sm border-2 border-white bg-white px-1 py-1 text-xs hover:border-black group-open:border-2 group-open:border-black">
              <VerticalThreeDot className="size-6" />
            </summary>

            <div className="absolute right-0 z-30 mt-2 flex flex-col rounded-lg border border-gray-400 bg-white p-2 shadow-lg">
              <button
                type="button"
                className={`whitespace-nowrap px-2 p-2 text-left text-sm ${
                  canDownloadCsv
                    ? "hover:bg-sky-200"
                    : "cursor-not-allowed text-gray-400"
                }`}
                onClick={downloadCsv}
                disabled={!canDownloadCsv}
              >
                Download CSV
              </button>
            </div>
          </details>
        </div>
      </div>

      {layers.length > 0 && (
        <label className="mb-3 flex min-w-0 grow flex-col gap-2 text-sm">
          Filter Layer
          <select
            value={selectedLayerId}
            onChange={(event) => {
              setSelectedLayerId(event.target.value);
              setSelectedLegendFilterIds([]);
            }}
            className="h-10 rounded-md border border-stone-300 px-3 py-2"
          >
            <option value="">Semua</option>
            {layers.map((layer) => (
              <option key={layer.id} value={layer.id}>
                {layer.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="relative min-h-[60vh] min-w-0 overflow-hidden rounded-md shadow-md">
        {legendEnabled && (
          <div
            className={`absolute inset-y-0 left-0 z-[1200] flex min-h-[60vh] min-w-0 flex-col gap-3 bg-sky-800 p-3 text-white transition-transform duration-300 ${
              showLegend ? "translate-x-0" : "-translate-x-full"
            } w-[65%] md:w-[30%]`}
          >
            <div className="flex w-full items-center justify-between gap-3">
              <p className="text-sm font-semibold">Legenda</p>
              <button
                type="button"
                onClick={() => setShowLegend(false)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-sky-700 text-white hover:bg-sky-600"
                aria-label="Tutup legenda"
              >
                <LeftChevron className="h-4 w-4" />
              </button>
            </div>

            {visibleLegendLayers.length === 0 ? (
              <p className="text-xs text-white/80">Tidak ada layer aktif.</p>
            ) : (
              <>
                <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
                  {visibleLegendLayers.map((layer) => (
                    <div
                      key={`public-legend-${layer.id}`}
                      className="flex flex-col gap-2"
                    >
                      <p className="text-xs font-semibold">{layer.name}</p>
                      {layer.legends.map((legend) => {
                        const optionId = `${layer.id}|||${legend.value}`;
                        const isActive =
                          selectedLegendFilterIds.includes(optionId);
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
                              setSelectedLegendFilterIds((current) =>
                                current.includes(optionId)
                                  ? current.filter((item) => item !== optionId)
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
                                  src={getPublicImageUrl(legend.icon_path)}
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
                    setSelectedLegendFilterIds([]);
                    setMapBoundsTrigger((current) => current + 1);
                  }}
                >
                  Reset
                </button>
              </>
            )}
          </div>
        )}

        {legendEnabled && showLegend && (
          <div
            className="absolute inset-0 z-[1100] bg-black/50"
            onClick={() => setShowLegend(false)}
          />
        )}

        {legendEnabled && (
          <button
            type="button"
            onClick={() => setShowLegend(true)}
            className={`absolute left-0 top-1/2 z-[1150] flex -translate-y-1/2 flex-col items-center gap-1 rounded-r-md bg-sky-800 px-1.5 py-3 text-white transition-opacity hover:bg-sky-200 hover:text-stone-950 ${
              showLegend ? "pointer-events-none opacity-0" : "opacity-100"
            }`}
            aria-label="Buka legenda"
          >
            <span className="[writing-mode:vertical-rl] text-xs font-semibold">
              Legenda
            </span>
          </button>
        )}

        <MapPreviewDynamic
          layers={layers}
          mapConfig={publicMapConfig}
          bounds={publicMapBounds}
          boundsTrigger={mapBoundsTrigger}
          selectedLegendFilters={selectedLegendFilters}
          heightClassName="h-[60vh] min-h-[60vh]"
          className=""
        />
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {dataset.description && (
          <p className="max-w-3xl text-sm text-stone-600">
            {dataset.description}
          </p>
        )}
      </div>

      {documents.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-3">
          {documents.map((document) => (
            <a
              key={document.path}
              href={getDocumentUrl(document.path)}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-sky-800 px-3 py-1 text-sm text-sky-900 hover:bg-sky-50"
            >
              {document.name}
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
