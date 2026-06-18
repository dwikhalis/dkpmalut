"use client";

import { useEffect, useMemo, useState } from "react";
import { DownChevron, LeftChevron, UpChevron } from "@/public/icons/iconSets";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import MapKKD_dynamic from "./MapKKD_dynamic";
import {
  ZONA_ORDER,
  KKD_OPTIONS,
  LEGEND_ITEMS,
  buildDynamicLegendGroups,
  getGeoJsonLayer,
  getKkdOption,
  type GeoDataMap,
  type LegendValue,
  type SelectedKkdId,
  type ZoneFeatureCollection,
} from "./kkdConfig";

type Pages = { title: string; slug: string }[];

interface Props {
  pages: Pages;
}

type AvailableDownloads = {
  map?: string;
  rpz?: string;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function downloadFile(fileName: string) {
  const link = document.createElement("a");
  link.href = fileName;
  link.download = fileName.split("/").pop() || "download";
  link.click();
}

async function fileExists(path?: string) {
  if (!path) return false;

  try {
    const res = await fetch(path, {
      method: "HEAD",
      cache: "no-store",
    });

    return res.ok;
  } catch {
    return false;
  }
}

function normalizeZonaName(zona: string) {
  return zona.replace(/^Zona\s+/i, "").trim();
}

function getZonaNumber(zona: string) {
  const normalizedZona = normalizeZonaName(zona);

  const index = ZONA_ORDER.findIndex(
    (item) => item.toLowerCase() === normalizedZona.toLowerCase(),
  );

  return index === -1 ? ZONA_ORDER.length + 1 : index + 1;
}

function getZonaOrderIndex(zona: string) {
  const normalizedZona = normalizeZonaName(zona);

  const index = ZONA_ORDER.findIndex(
    (item) => item.toLowerCase() === normalizedZona.toLowerCase(),
  );

  return index === -1 ? 999 : index;
}

function getZonaLabel(zona: string) {
  const normalizedZona = normalizeZonaName(zona);

  return `Zona ${normalizedZona}`;
}

export default function ChartKKD({ pages }: Props) {
  const [showDropDown, setShowDropDown] = useState(false);
  const [legend, setLegend] = useState<LegendValue>("All");
  const [kkd, setKkd] = useState<SelectedKkdId>("");
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [mapLoad, setMapLoad] = useState(true);
  const [geoData, setGeoData] = useState<GeoDataMap>({});
  const [availableDownloads, setAvailableDownloads] =
    useState<AvailableDownloads>({});

  const selectedKkd = kkd ? getKkdOption(kkd) : null;

  const dynamicLegendGroups = useMemo(() => {
    if (!selectedKkd) return [];

    return buildDynamicLegendGroups(geoData, selectedKkd.layers);
  }, [geoData, selectedKkd]);

  const orderedLegendGroups = useMemo(() => {
    return dynamicLegendGroups
      .map((group) => ({
        ...group,
        normalizedZona: normalizeZonaName(group.zona),
        zonaNumber: getZonaNumber(group.zona),
        zonaOrderIndex: getZonaOrderIndex(group.zona),
      }))
      .sort((a, b) => {
        if (a.zonaOrderIndex !== b.zonaOrderIndex) {
          return a.zonaOrderIndex - b.zonaOrderIndex;
        }

        return a.normalizedZona.localeCompare(b.normalizedZona);
      });
  }, [dynamicLegendGroups]);

  const hasDownloads = Boolean(
    availableDownloads.map || availableDownloads.rpz,
  );

  useEffect(() => {
    let isMounted = true;

    const loadSelectedGeoJson = async () => {
      if (!selectedKkd) {
        setGeoData({});
        return;
      }

      try {
        setMapLoad(true);

        const entries = await Promise.all(
          selectedKkd.layers.map(async (layerId) => {
            const layer = getGeoJsonLayer(layerId);

            if (!layer) {
              throw new Error(`GeoJSON layer config not found: ${layerId}`);
            }

            const res = await fetch(layer.path);

            if (!res.ok) {
              throw new Error(`Failed to load ${layer.path}`);
            }

            const data = (await res.json()) as ZoneFeatureCollection;

            return [layerId, data] as const;
          }),
        );

        if (!isMounted) return;

        setGeoData(Object.fromEntries(entries) as GeoDataMap);
      } catch (err) {
        console.error("Error loading selected GeoJSON:", err);

        if (isMounted) {
          setGeoData({});
          setMapLoad(false);
        }
      }
    };

    loadSelectedGeoJson();

    return () => {
      isMounted = false;
    };
  }, [selectedKkd]);

  useEffect(() => {
    let isMounted = true;

    const checkDownloads = async () => {
      if (!selectedKkd?.downloads) {
        setAvailableDownloads({});
        return;
      }

      const [mapAvailable, rpzAvailable] = await Promise.all([
        fileExists(selectedKkd.downloads.map),
        fileExists(selectedKkd.downloads.rpz),
      ]);

      if (!isMounted) return;

      setAvailableDownloads({
        map: mapAvailable ? selectedKkd.downloads.map : undefined,
        rpz: rpzAvailable ? selectedKkd.downloads.rpz : undefined,
      });
    };

    checkDownloads();

    return () => {
      isMounted = false;
    };
  }, [selectedKkd]);

  return (
    <div className="flex w-full">
      <aside
        className={cn(
          "fixed top-0 z-5 flex h-[100vh] w-[65%] justify-between transition-transform duration-300",
          "md:static md:top-auto md:z-0 md:h-auto md:w-[30vw] md:grow md:translate-x-0",
          showSideMenu ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-full w-full min-w-55 flex-col gap-3 overflow-y-scroll bg-sky-800 px-5 pt-18 pb-20 text-white scrollbar-hide md:pt-8 lg:pt-12">
          <h3 className="font-bold">Legenda</h3>

          {!selectedKkd ? (
            <p className="text-sm text-white/80">
              Pilih Kawasan Konservasi yang ingin anda lihat
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {orderedLegendGroups.length === 0 ? (
                <p className="text-sm text-white/80">Memuat legenda...</p>
              ) : (
                <>
                  {orderedLegendGroups.map((group) => {
                    const isZonaInti =
                      group.normalizedZona.toLowerCase() === "inti";

                    return (
                      <div key={group.zona} className="flex flex-col gap-2">
                        <p className="mt-3 text-sm font-semibold first:mt-0">
                          {getZonaLabel(group.zona)}
                        </p>

                        {!isZonaInti && group.items.length > 0 && (
                          <p className="mt-0 text-xs text-white/80">Sub Zona</p>
                        )}

                        {group.items.map((itemValue, itemIndex) => {
                          const item = LEGEND_ITEMS[itemValue];

                          if (!item) return null;

                          const isActive = legend === item.value;

                          return (
                            <button
                              key={item.value}
                              type="button"
                              onClick={() => setLegend(item.value)}
                              className={cn(
                                "flex w-full cursor-pointer items-center justify-start gap-3 rounded-xl border border-sky-600 px-2 py-1 text-left hover:bg-sky-700",
                                isActive && "bg-sky-700",
                              )}
                            >
                              <div
                                className={cn(
                                  "h-7.5 w-7.5 shrink-0 rounded-full",
                                  item.legendClassName,
                                )}
                              />

                              <p className="text-xs">{item.label}</p>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    className="mt-3 flex cursor-pointer items-center justify-center rounded-md bg-sky-600 py-2 text-xs text-white hover:bg-sky-700"
                    onClick={() => setLegend("All")}
                  >
                    Reset
                  </button>
                </>
              )}

              {hasDownloads && (
                <div className="flex flex-col gap-2">
                  <h5 className="mt-6 font-bold">Download</h5>

                  <div className="flex w-full items-center justify-between gap-2">
                    {availableDownloads.map && (
                      <button
                        type="button"
                        className="flex w-full cursor-pointer items-center justify-center rounded-md bg-sky-600 py-2 text-xs text-white hover:bg-sky-700"
                        onClick={() => downloadFile(availableDownloads.map!)}
                      >
                        Peta
                      </button>
                    )}

                    {availableDownloads.rpz && (
                      <button
                        type="button"
                        className="flex w-full cursor-pointer items-center justify-center rounded-md bg-sky-600 py-2 text-xs text-white hover:bg-sky-700"
                        onClick={() => downloadFile(availableDownloads.rpz!)}
                      >
                        RPZ
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div
          className="flex cursor-pointer items-center justify-center md:hidden"
          onClick={() => setShowSideMenu(false)}
        >
          <div className="-translate-x-6 -rotate-90 px-0 pb-3">
            <div className="flex items-center justify-center rounded-b-md bg-sky-800 px-2">
              <p className="w-full text-sm text-white">Filters</p>
              <UpChevron className="h-6 w-6" color="white" />
            </div>
          </div>
        </div>
      </aside>

      <div className="fixed top-[50%] flex -translate-x-12 cursor-pointer items-center justify-start md:hidden">
        <div
          className="-rotate-90 px-6 pb-2"
          onClick={() => setShowSideMenu(true)}
        >
          <div className="flex items-center justify-center rounded-b-md bg-stone-300 px-2">
            <p className="w-full text-sm text-white">Filters</p>
            <DownChevron className="h-6 w-6" color="white" />
          </div>
        </div>
      </div>

      <div
        className={cn(
          showSideMenu ? "flex" : "hidden",
          "fixed inset-0 z-3 h-[100vh] w-[100vw] bg-black/50 md:hidden",
        )}
        onClick={() => setShowSideMenu(false)}
      />

      <div className="mx-8 flex w-500 flex-col lg:mx-12">
        <div className="flex w-full">
          <Link
            href="/data"
            className="flex cursor-pointer items-center justify-center py-0 pr-3 md:py-3 md:pr-6"
          >
            <LeftChevron className="h-5 w-5 lg:h-7 lg:w-7" />
          </Link>

          <div className="relative my-0 flex w-full flex-col items-center justify-center md:my-3">
            <div
              onClick={() => setShowDropDown((prev) => !prev)}
              className="my-3 mt-6 mb-6 flex h-8 w-full cursor-pointer items-center justify-between rounded-lg border border-stone-100 px-3 shadow-md lg:h-10"
            >
              <p className="text-[2.8vw] md:text-[1.5vw] lg:text-sm">
                Lihat Data Lainnya
              </p>

              {showDropDown ? (
                <UpChevron className="h-4 w-4 lg:h-7 lg:w-7" />
              ) : (
                <DownChevron className="h-4 w-4 lg:h-7 lg:w-7" />
              )}
            </div>

            <div
              className={cn(
                showDropDown ? "flex" : "hidden",
                "absolute top-17 z-10 w-full cursor-pointer flex-col rounded-lg border bg-white py-1.5",
              )}
            >
              {pages
                .filter((page) => page.title !== "Home")
                .map((page) => (
                  <Link
                    href={`/data/${page.slug}`}
                    key={page.slug}
                    onClick={() => setShowDropDown(false)}
                    className="px-3 py-1.5 text-[2.8vw] hover:bg-stone-100 md:text-[1.5vw] lg:text-sm"
                  >
                    <h5>{page.title}</h5>
                  </Link>
                ))}
            </div>
          </div>
        </div>

        <h2 className="mb-3">Kawasan Konservasi Daerah</h2>

        <div className="mb-6 flex justify-between">
          <form>
            <select
              className="w-full rounded-xl border border-stone-200 p-2"
              value={kkd}
              onChange={(e) => {
                const value = e.target.value as SelectedKkdId;

                setKkd(value);
                setLegend("All");
                setGeoData({});
                setAvailableDownloads({});
                setMapLoad(true);
              }}
            >
              <option value="">Pilih Kawasan Konservasi</option>

              {KKD_OPTIONS.map((option) => (
                <option key={option.id} className="text-xs" value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </form>
        </div>

        <div className="relative z-0 min-h-[70vh]">
          {mapLoad && (
            <div className="absolute inset-0 z-[1000] flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-slate-300 border-t-transparent" />
              <p className="mt-3 text-sm text-gray-600">Loading map...</p>
            </div>
          )}

          <MapKKD_dynamic
            legend={legend}
            kkd={kkd}
            geoData={geoData}
            loadStatus={setMapLoad}
          />

          <div id="scrollToThis" className="mt-6 flex w-full flex-col">
            <div />
          </div>
        </div>
      </div>
    </div>
  );
}
