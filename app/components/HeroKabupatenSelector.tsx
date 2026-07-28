"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import MapSelector, {
  SUB_WPP,
  type KabupatenName,
  type SubWppName,
  type ZonaName,
} from "./MapSelector";
import {
  DATA_KKPD_OPTIONS,
  DATA_REGENCY_OPTIONS,
  type DataKkpdValue,
  type DataRegencyValue,
} from "./configAreaSelector";

type FilterMode = "kabupaten" | "sub-wpp" | "kkpd";

type Props = {
  className?: string;
};

const FILTER_MODES: readonly { value: FilterMode; label: string }[] = [
  { value: "kabupaten", label: "Kabupaten" },
  { value: "sub-wpp", label: "Sub-WPP" },
  { value: "kkpd", label: "KKPD" },
];

function isFilterMode(value: string | null): value is FilterMode {
  return FILTER_MODES.some((mode) => mode.value === value);
}

function isRegencyValue(value: string | null): value is DataRegencyValue {
  return DATA_REGENCY_OPTIONS.some((option) => option.value === value);
}

function isAreaValue(value: string | null): value is DataKkpdValue {
  return DATA_KKPD_OPTIONS.some((option) => option.value === value);
}

function isSubWppName(value: string | null): value is SubWppName {
  return SUB_WPP.some((option) => option.name === value);
}

export default function HeroKabupatenSelector({ className = "" }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const inferredMode: FilterMode = searchParams.has("sub_wpp")
    ? "sub-wpp"
    : searchParams.has("kkpd")
      ? "kkpd"
      : "kabupaten";
  const modeParam = searchParams.get("filter_by");
  const activeMode = isFilterMode(modeParam) ? modeParam : inferredMode;

  const kabupatenParam = searchParams.get("kabupaten");
  const subWppParam = searchParams.get("sub_wpp");
  const kkpdParam = searchParams.get("kkpd");
  const selectedRegency = isRegencyValue(kabupatenParam)
    ? kabupatenParam
    : null;
  const selectedSubWpp = isSubWppName(subWppParam) ? subWppParam : null;
  const selectedArea = isAreaValue(kkpdParam) ? kkpdParam : null;

  const selectedMapKabupaten = selectedRegency
    ? (selectedRegency.toLocaleUpperCase("id-ID") as KabupatenName)
    : null;
  const selectedAreaOption = DATA_KKPD_OPTIONS.find(
    (area) => area.value === selectedArea,
  );
  const selectedMapZona = selectedAreaOption
    ? (`zonasi_${selectedAreaOption.id}` as ZonaName)
    : null;

  function replaceParams(update: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    update(params);
    const query = params.toString();

    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }

  function selectMode(mode: FilterMode) {
    replaceParams((params) => {
      params.set("filter_by", mode);
      params.delete("show_results");
      params.delete("kabupaten");
      params.delete("sub_wpp");
      params.delete("kkpd");
    });
  }

  function replaceSelection(
    key: "kabupaten" | "sub_wpp" | "kkpd",
    value: string | null,
  ) {
    replaceParams((params) => {
      params.set("filter_by", activeMode);
      params.delete("show_results");
      params.delete("kabupaten");
      params.delete("sub_wpp");
      params.delete("kkpd");

      if (value) {
        params.set(key, value);
      }
    });
  }

  function handleMapKabupaten(name: KabupatenName) {
    const option = DATA_REGENCY_OPTIONS.find(
      (regency) => regency.value.toLocaleUpperCase("id-ID") === name,
    );
    if (!option) return;

    replaceSelection(
      "kabupaten",
      selectedRegency === option.value ? null : option.value,
    );
  }

  function handleMapZona(name: ZonaName) {
    const areaId = name.replace(/^zonasi_/, "");
    const option = DATA_KKPD_OPTIONS.find((area) => area.id === areaId);
    if (!option) return;

    replaceSelection(
      "kkpd",
      selectedArea === option.value ? null : option.value,
    );
  }

  const selectedLabel =
    activeMode === "kabupaten"
      ? selectedRegency
      : activeMode === "sub-wpp"
        ? selectedSubWpp
        : selectedArea;

  function showResults() {
    replaceParams((params) => {
      params.set("filter_by", activeMode);
      params.set("show_results", "1");
    });

    window.requestAnimationFrame(() => {
      document.getElementById("hasil-pencarian")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  return (
    <div
      className={`flex w-full min-w-0 flex-col items-center gap-4 ${className}`}
    >
      <div
        className="grid w-full max-w-md grid-cols-3 gap-2"
        aria-label="Pilih dasar filter data"
      >
        {FILTER_MODES.map((mode) => {
          const active = activeMode === mode.value;

          return (
            <button
              key={mode.value}
              type="button"
              aria-pressed={active}
              onClick={() => selectMode(mode.value)}
              className={`rounded-full border px-3 py-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                active
                  ? "border-amber-300 bg-amber-400 text-sky-950"
                  : "border-white/60 bg-white/10 text-white hover:bg-white hover:text-sky-950"
              }`}
            >
              {mode.label}
            </button>
          );
        })}
      </div>

      <div className="w-full max-w-md">
        <label
          htmlFor={`hero-${activeMode}-filter`}
          className="mb-2 block text-sm font-semibold text-white"
        >
          {activeMode === "kabupaten"
            ? "Filter kabupaten atau kota"
            : activeMode === "sub-wpp"
              ? "Filter Sub-WPP"
              : "Filter kawasan KKPD"}
        </label>

        <div className="flex items-stretch gap-2">
          {activeMode === "kabupaten" && (
            <select
              id="hero-kabupaten-filter"
              value={selectedRegency ?? ""}
              onChange={(event) =>
                replaceSelection("kabupaten", event.target.value || null)
              }
              className="min-w-0 flex-1 rounded-xl border border-white/40 bg-white px-4 py-3 text-sm font-medium text-sky-950 shadow-sm outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-300"
            >
              <option value="">Tampilkan Semua</option>
              {DATA_REGENCY_OPTIONS.map((option) => (
                <option key={option.id} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}

          {activeMode === "sub-wpp" && (
            <select
              id="hero-sub-wpp-filter"
              value={selectedSubWpp ?? ""}
              onChange={(event) =>
                replaceSelection("sub_wpp", event.target.value || null)
              }
              className="min-w-0 flex-1 rounded-xl border border-white/40 bg-white px-4 py-3 text-sm font-medium text-sky-950 shadow-sm outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-300"
            >
              <option value="">Tampilkan Semua</option>
              {SUB_WPP.map((option) => (
                <option key={option.id} value={option.name}>
                  {option.label}
                </option>
              ))}
            </select>
          )}

          {activeMode === "kkpd" && (
            <select
              id="hero-kkpd-filter"
              value={selectedArea ?? ""}
              onChange={(event) =>
                replaceSelection("kkpd", event.target.value || null)
              }
              className="min-w-0 flex-1 rounded-xl border border-white/40 bg-white px-4 py-3 text-sm font-medium text-sky-950 shadow-sm outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-300"
            >
              <option value="">Tampilkan Semua</option>
              {DATA_KKPD_OPTIONS.map((option) => (
                <option key={option.id} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={showResults}
            className="rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-sky-950 transition-colors hover:bg-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-sky-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cari
          </button>
        </div>
      </div>

      <MapSelector
        interactiveLayer={activeMode === "kkpd" ? "zonasi" : activeMode}
        selectedKabupaten={selectedMapKabupaten}
        selectedSubWpp={selectedSubWpp}
        selectedZona={selectedMapZona}
        onKabupatenSelect={handleMapKabupaten}
        onSubWppSelect={(name) =>
          replaceSelection("sub_wpp", selectedSubWpp === name ? null : name)
        }
        onZonaSelect={handleMapZona}
        className="max-w-[31rem] drop-shadow-[0_18px_30px_rgba(8,47,73,0.25)]"
      />

      <div
        className="flex min-h-10 flex-wrap items-center justify-center gap-2 text-center text-sm text-white"
        aria-live="polite"
      >
        {selectedLabel ? (
          <p>
            Filter terpilih:{" "}
            <span className="font-semibold">{selectedLabel}</span>
          </p>
        ) : (
          <p className="text-cyan-100">
            Pilih wilayah, atau gunakan “Tampilkan Semua”, lalu tekan Cari
          </p>
        )}
      </div>
    </div>
  );
}
