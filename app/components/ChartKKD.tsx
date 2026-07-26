"use client";

import { useEffect, useMemo, useState } from "react";
import { DownChevron, UpChevron } from "@/public/icons/iconSets";
import "leaflet/dist/leaflet.css";
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
} from "./configKKD";
import DataPageDropdown from "./DataPageDropdown";
import Image from "next/image";
import SpinnerLoading from "./SpinnerLoading";
import Link from "next/link";
import AlertNotif from "./AlertNotif";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../Stores/authStores";

type Pages = { title: string; slug: string }[];

interface Props {
  pages?: Pages;
  initialKkd?: Exclude<SelectedKkdId, "" | "all">;
  showDataNavigation?: boolean;
}

type AvailableDownloads = {
  map?: string;
  rpz?: string;
  decree?: string;
};

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

export default function ChartKKD({
  pages = [],
  initialKkd = undefined,
  showDataNavigation = true,
}: Props) {
  const router = useRouter();
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);

  const [alertType, setAlertType] = useState<null | "login-required">(null);

  const [legend, setLegend] = useState<LegendValue>("All");
  const [kkd, setKkd] = useState<SelectedKkdId>(initialKkd ?? "");
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
    availableDownloads.map ||
      availableDownloads.rpz ||
      availableDownloads.decree,
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

      const [mapAvailable, rpzAvailable, decreeAvailable] = await Promise.all([
        fileExists(selectedKkd.downloads.map),
        fileExists(selectedKkd.downloads.rpz),
        fileExists(selectedKkd.downloads.decree),
      ]);

      if (!isMounted) return;

      setAvailableDownloads({
        map: mapAvailable ? selectedKkd.downloads.map : undefined,
        rpz: rpzAvailable ? selectedKkd.downloads.rpz : undefined,
        decree: decreeAvailable ? selectedKkd.downloads.decree : undefined,
      });
    };

    checkDownloads();

    return () => {
      isMounted = false;
    };
  }, [selectedKkd]);

  const handleDownloadFile = (filePath?: string) => {
    if (!filePath) return;

    if (!isLoggedIn) {
      setAlertType("login-required");
      return;
    }

    downloadFile(filePath);
  };

  const handleLoginRedirect = () => {
    setAlertType(null);
    router.push("/masuk/");
  };

  return (
    <div className="flex w-full">
      {/* //! SIDE MENU */}
      <aside
        className={`flex top-0 md:top-auto md:static fixed z-5 md:z-0 justify-between md:w-[30vw] w-[65%] md:grow md:h-auto h-[100vh] transition-transform duration-300 md:translate-x-0 ${
          showSideMenu ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex w-full md:min-w-55 flex-col gap-3 overflow-y-scroll bg-sky-800 px-5 pt-18 pb-20 text-white scrollbar-hide md:pt-8 lg:pt-12">
          <h3 className="font-bold">Legenda</h3>

          {!selectedKkd ? (
            <p className="text-sm text-white/80">
              Pilih Kawasan Konservasi terlebih dahulu
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

                        {group.items.map((itemValue) => {
                          const item = LEGEND_ITEMS[itemValue];

                          if (!item) return null;

                          const isActive = legend === item.value;

                          return (
                            <button
                              key={item.value}
                              type="button"
                              onClick={() => setLegend(item.value)}
                              className={`flex w-full cursor-pointer items-center justify-start gap-3 rounded-xl border border-sky-600 px-2 py-1 text-left hover:bg-sky-700 ${
                                isActive && "bg-sky-700"
                              }`}
                            >
                              <div
                                className={`h-7.5 w-7.5 shrink-0 rounded-full ${item.legendClassName}`}
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
                  <h3 className="mt-6 text-lg font-bold">Download</h3>

                  <div className="flex flex-wrap w-full items-center justify-between gap-2">
                    {availableDownloads.map && (
                      <button
                        type="button"
                        className="flex grow cursor-pointer items-center justify-center rounded-md bg-sky-600 p-2 text-xs text-white hover:bg-sky-700"
                        onClick={() =>
                          handleDownloadFile(availableDownloads.map)
                        }
                      >
                        Peta
                      </button>
                    )}

                    {availableDownloads.rpz && (
                      <button
                        type="button"
                        className="flex grow cursor-pointer items-center justify-center rounded-md bg-sky-600 p-2 text-xs text-white hover:bg-sky-700"
                        onClick={() =>
                          handleDownloadFile(availableDownloads.rpz)
                        }
                      >
                        RPZ
                      </button>
                    )}

                    {availableDownloads.decree && (
                      <button
                        type="button"
                        className="flex grow cursor-pointer items-center justify-center rounded-md bg-sky-600 p-2 text-xs text-white hover:bg-sky-700"
                        onClick={() =>
                          handleDownloadFile(availableDownloads.decree)
                        }
                      >
                        KepmenKP
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* //! Close Side Menu */}
        <div
          className="flex justify-center items-center md:hidden cursor-pointer"
          onClick={() => setShowSideMenu(!showSideMenu)}
        >
          <div
            className="px-0 pb-3 -rotate-90 -translate-x-6"
            onClick={() => setShowSideMenu(!showSideMenu)}
          >
            <div className="flex justify-center items-center bg-sky-800 px-2 rounded-b-md">
              <p className="w-full text-sm text-white">Filters </p>
              <UpChevron className="w-6 h-6" color="white" />
            </div>
          </div>
        </div>
      </aside>

      {/* //! Open Side Menu */}
      <div className="flex fixed top-[48%] items-center justify-start md:hidden cursor-pointer -translate-x-12">
        <div
          className="-rotate-90 pb-2 px-6"
          onClick={() => setShowSideMenu(!showSideMenu)}
        >
          <div className="flex justify-center items-center bg-stone-300 px-2 rounded-b-md">
            <p className="text-sm w-full text-white">Filters </p>
            <DownChevron className="w-6 h-6" color="white" />
          </div>
        </div>
      </div>

      {/* //! DARK VEIL */}
      <div
        className={`
          ${showSideMenu ? "flex" : "hidden"}
          fixed inset-0 z-3 h-[100vh] w-[100vw] bg-black/50 md:hidden
        `}
        onClick={() => setShowSideMenu(false)}
      />

      <div className="mx-8 flex w-full flex-col lg:mx-12">
        {/* //! HEAD DROPDOWN */}
        {showDataNavigation && <DataPageDropdown pages={pages} />}

        {/* //! MAIN TITLE */}
        <h2 className="mb-3">
          {selectedKkd ? `Peta Interaktif ${selectedKkd.label}` : "Kawasan Konservasi Daerah"}
        </h2>

        <div className="flex justify-between mb-6">
          <form className="w-full">
            <select
              className="w-full rounded-sm border border-black p-2"
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
                <option key={option.id} className="text-sm" value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </form>
        </div>

        {/* //! MAP */}
        <div className="relative z-0 min-h-[70vh]">
          {mapLoad && (
            <div className="absolute inset-0 z-[1000] flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
              <SpinnerLoading size="sm" color="black" />
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

        {kkd && (
          <Link
            target="_blank"
            rel="noopener"
            href={
              KKD_OPTIONS.find((option) => option.id === kkd)?.data_link || "#"
            }
            className="flex justify-between items-center w-full rounded-md border border-stone-200 p-4 bg-sky-800 mb-6"
          >
            <p className="text-md text-white">Lihat Data Ekologi</p>
            <Image
              src="/assets/mermaid_logo.svg"
              alt="datamermaid"
              width={1}
              height={1}
              priority
              className="h-10 w-30 object-contain"
            />
          </Link>
        )}
      </div>

      {alertType === "login-required" && (
        <AlertNotif
          type="single"
          msg="Log In terlebih dahulu untuk download data"
          yesText="Log In"
          icon="warning"
          confirm={handleLoginRedirect}
        />
      )}
    </div>
  );
}
