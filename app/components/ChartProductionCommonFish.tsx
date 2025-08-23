"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/supabaseClient";
import BarCharts from "./BarCharts";
import { DownChevron, LeftChevron, UpChevron } from "@/public/icons/iconSets";

type Row = {
  kab: string | null;
  year: number | string | null;
  semester?: number | string | null; // NEW
  class: string | null;
  common: string | null;
  name?: string | null;
  landing?: string | null; // NEW
  weight?: number | string | null;
};

type DatasetConf = {
  label: string;
  values: number[];
  backgroundColor?: string;
};

type SortBy = "name" | "value";
type Order = "asc" | "desc";
type TopN = "all" | 5 | 10;

interface Props {
  fromChild?: (sendData: string) => void;
  pages: string[];
}

const TITLE = "Produksi Perikanan Tangkap per Jenis Komoditas";

/* ================= Helpers ================= */
const toNum = (v: unknown) => {
  if (v == null) return NaN;
  if (typeof v === "number") return v;
  if (typeof v === "string") return Number(v.replace(/[^\d.-]/g, ""));
  return NaN;
};
const trimOrEmpty = (s: string | null | undefined) => (s ?? "").trim();
const keyOf = (s: string) => s.normalize("NFKC").trim().toLowerCase();

const yearOf = (v: unknown): number | null => {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const m = v.match(/\d{4}/);
    return m ? Number(m[0]) : null;
  }
  return null;
};

const semesterOf = (v: unknown): 1 | 2 | null => {
  if (v == null) return null;
  if (typeof v === "number") {
    const n = Math.trunc(v);
    return n === 1 || n === 2 ? (n as 1 | 2) : null;
  }
  if (typeof v === "string") {
    const m = v.match(/[12]/);
    if (!m) return null;
    const n = Number(m[0]);
    return n === 1 || n === 2 ? (n as 1 | 2) : null;
  }
  return null;
};

/** e.g. "Alu-alu Besar; Barakuda Besar (Sphyraena barracuda)" -> "Alu-alu Besar" */
function shortNameForChart(fullNameRaw: string | null | undefined): string {
  const full = trimOrEmpty(fullNameRaw);
  if (!full) return "";
  const noParen = full.split("(")[0];
  const firstAlias = noParen.split(";")[0];
  const firstSlash = firstAlias.split("/")[0];
  return firstSlash.trim();
}

/** Fetch *all* rows with pagination */
async function fetchAllRows<T>(
  table: string,
  columns: string,
  pageSize = 1000
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;
  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(from, to);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...(data as T[]));
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

/* ================= Component ================= */
export default function ChartProductionCommonFish({
  fromChild = () => {},
  pages,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);

  // Filters
  const [selectedYear, setSelectedYear] = useState<"all" | number>("all");
  const [selectedSemester, setSelectedSemester] = useState<"all" | 1 | 2>(
    "all"
  );
  const [selectedKab, setSelectedKab] = useState<"all" | string>("all");
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]); // multi (side menu)
  const [sortBy, setSortBy] = useState<SortBy>("name");
  const [order, setOrder] = useState<Order>("asc");
  const [topN, setTopN] = useState<TopN>("all");
  const [selectedLanding, setSelectedLanding] = useState<"all" | string>("all");
  const [showDropDown, setShowDropDown] = useState(false);
  const [showSideMenu, setShowSideMenu] = useState(false); // retractable side menu (mobile)

  // Fetch ALL data (include name/semester/landing)
  useEffect(() => {
    let cancelled = false;
    const getErr = (e: unknown) =>
      e instanceof Error
        ? e.message
        : (() => {
            try {
              return JSON.stringify(e);
            } catch {
              return String(e);
            }
          })();

    (async () => {
      try {
        type TangkapRow = Pick<
          Row,
          | "kab"
          | "year"
          | "semester"
          | "class"
          | "common"
          | "name"
          | "landing"
          | "weight"
        >;
        const data = await fetchAllRows<TangkapRow>(
          "tangkap",
          "kab, year, semester, class, common, name, landing, weight"
        );
        if (cancelled) return;
        const cleaned: Row[] = (data ?? []).map((r) => ({
          kab: trimOrEmpty(r.kab),
          year: r.year,
          semester: r.semester,
          class: trimOrEmpty(r.class),
          common: trimOrEmpty(r.common),
          name: trimOrEmpty(r.name ?? ""),
          landing: trimOrEmpty(r.landing ?? ""),
          weight: r.weight,
        }));
        setRows(cleaned);
        setErr(null);
      } catch (e) {
        setErr(getErr(e) || "Failed to load data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /* ======= Options ======= */
  const yearOptions = useMemo(() => {
    const s = new Set<number>();
    rows.forEach((r) => {
      const y = yearOf(r.year);
      if (y != null) s.add(y);
    });
    return Array.from(s).sort((a, b) => b - a);
  }, [rows]);

  const kabOptions = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((r) => {
      const disp = trimOrEmpty(r.kab);
      if (!disp) return;
      const k = keyOf(disp);
      if (!map.has(k)) map.set(k, disp);
    });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const classOptions = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((r) => {
      const disp = trimOrEmpty(r.class);
      if (!disp) return;
      const k = keyOf(disp);
      if (!map.has(k)) map.set(k, disp);
    });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const landingOptions = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((r) => {
      const disp = trimOrEmpty(r.landing);
      if (!disp) return;
      const k = keyOf(disp);
      if (!map.has(k)) map.set(k, disp);
    });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  /* ======= Filter keys ======= */
  const kabSelectedKey = useMemo(
    () => (selectedKab === "all" ? undefined : keyOf(selectedKab)),
    [selectedKab]
  );
  const selectedClassKeys = useMemo(
    () =>
      selectedClasses.length > 0
        ? new Set(selectedClasses.map((d) => keyOf(d)))
        : undefined,
    [selectedClasses]
  );
  const yearSelected = selectedYear === "all" ? null : selectedYear;
  const semesterSelected = useMemo(
    () => (selectedSemester === "all" ? null : selectedSemester),
    [selectedSemester]
  );
  const landingSelectedKey = useMemo(
    () => (selectedLanding === "all" ? undefined : keyOf(selectedLanding)),
    [selectedLanding]
  );

  /* ======= Aggregation keyed by name ======= */
  const nameUniverse = useMemo(() => {
    const byKey = new Map<string, { full: string; short: string }>();
    rows.forEach((r) => {
      const cls = trimOrEmpty(r.class);
      if (selectedClassKeys && !selectedClassKeys.has(keyOf(cls))) return;

      const kabDisp = trimOrEmpty(r.kab);
      if (!kabDisp) return;
      if (kabSelectedKey && keyOf(kabDisp) !== kabSelectedKey) return;

      const y = yearOf(r.year);
      if (yearSelected != null && y !== yearSelected) return;

      const sem = semesterOf(r.semester);
      if (semesterSelected != null && sem !== semesterSelected) return;

      const land = trimOrEmpty(r.landing);
      if (landingSelectedKey && keyOf(land) !== landingSelectedKey) return;

      const fullName = trimOrEmpty(r.name) || trimOrEmpty(r.common);
      if (!fullName) return;

      const k = keyOf(fullName);
      if (!byKey.has(k))
        byKey.set(k, { full: fullName, short: shortNameForChart(fullName) });
    });
    return byKey;
  }, [
    rows,
    selectedClassKeys,
    kabSelectedKey,
    yearSelected,
    semesterSelected,
    landingSelectedKey,
  ]);

  const totalsByNameKey = useMemo(() => {
    const totals = new Map<string, number>();
    rows.forEach((r) => {
      const cls = trimOrEmpty(r.class);
      if (selectedClassKeys && !selectedClassKeys.has(keyOf(cls))) return;

      const kabDisp = trimOrEmpty(r.kab);
      if (!kabDisp) return;
      if (kabSelectedKey && keyOf(kabDisp) !== kabSelectedKey) return;

      const y = yearOf(r.year);
      if (yearSelected != null && y !== yearSelected) return;

      const sem = semesterOf(r.semester);
      if (semesterSelected != null && sem !== semesterSelected) return;

      const land = trimOrEmpty(r.landing);
      if (landingSelectedKey && keyOf(land) !== landingSelectedKey) return;

      const fullName = trimOrEmpty(r.name) || trimOrEmpty(r.common);
      if (!fullName) return;
      const nameKey = keyOf(fullName);

      const w = toNum(r.weight);
      if (!Number.isFinite(w)) return;

      totals.set(nameKey, (totals.get(nameKey) ?? 0) + w);
    });
    return totals;
  }, [
    rows,
    selectedClassKeys,
    kabSelectedKey,
    yearSelected,
    semesterSelected,
    landingSelectedKey,
  ]);

  // Items (filter zeros), chart labels (short), table labels (full)
  const items = useMemo(() => {
    const EPS = 1e-9;
    let arr: {
      key: string;
      chartLabel: string;
      tableLabel: string;
      value: number;
    }[] = [];
    nameUniverse.forEach(({ full, short }, key) => {
      arr.push({
        key,
        chartLabel: short || full,
        tableLabel: full,
        value: totalsByNameKey.get(key) ?? 0,
      });
    });

    arr = arr.filter((it) => Math.abs(it.value) > EPS);

    if (sortBy === "name") {
      arr.sort(
        (a, b) =>
          a.tableLabel.localeCompare(b.tableLabel) * (order === "asc" ? 1 : -1)
      );
    } else {
      arr.sort((a, b) => (a.value - b.value) * (order === "asc" ? 1 : -1));
    }
    return topN === "all" ? arr : arr.slice(0, topN);
  }, [nameUniverse, totalsByNameKey, sortBy, order, topN]);

  // Chart data (labels = SHORT NAME), tooltip = full name
  const { labels, datasets }: { labels: string[]; datasets: DatasetConf[] } =
    useMemo(() => {
      const labs = items.map((it) => it.chartLabel);
      const vals = items.map((it) => it.value);
      return {
        labels: labs,
        datasets: [
          {
            label: "Tangkap",
            values: vals,
            backgroundColor: "rgba(53, 162, 235, 0.6)",
          },
        ],
      };
    }, [items]);

  const tooltipLabels = useMemo(
    () => items.map((it) => it.tableLabel),
    [items]
  );

  // Table helpers
  const nf = useMemo(
    () => new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }),
    []
  );
  const grandTotal = useMemo(
    () => items.reduce((acc, r) => acc + r.value, 0),
    [items]
  );

  // CSV
  const noDatasetSelected = false;
  const fileNameFromTitle = (title: string) =>
    title
      .trim()
      .replace(/[\/\\?%*:|"<>]/g, "")
      .replace(/\s+/g, "_") + ".csv";
  const csvCell = (v: unknown) => {
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
    const s = String(v ?? "");
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const toCsv = (
    header: (string | number)[],
    rowsData: (string | number)[][]
  ) => {
    const lines = [
      header.map(csvCell).join(","),
      ...rowsData.map((r) => r.map(csvCell).join(",")),
    ];
    return lines.join("\r\n");
  };
  const downloadCsv = () => {
    if (noDatasetSelected || items.length === 0) return;
    const header: (string | number)[] = ["Nama", "Total"];
    const body: (string | number)[][] = items.map((it) => [
      it.tableLabel,
      it.value,
    ]);
    body.push(["Jumlah", grandTotal]);
    const csv = toCsv(header, body);
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileNameFromTitle(TITLE);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="w-full h-[50vh] flex items-center justify-center">
        <div className="h-6 w-6 border-4 border-slate-300 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (err) {
    return (
      <div className="bg-red-50 text-red-700 border border-red-200 p-3 rounded">
        {err}
      </div>
    );
  }

  return (
    <div className="flex w-full">
      {/* //! SIDE MENU (mobile) */}
      <aside
        className={`flex top-0 md:top-auto md:static fixed z-5 md:z-0 justify-between md:w-[30vw] w-[65%] md:grow md:h-auto h-[100vh] transition-transform duration-300 md:translate-x-0 ${
          showSideMenu ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col gap-3 bg-teal-900 px-5 md:pt-8 lg:pt-12 pt-18 text-white overflow-y-scroll scrollbar-hide pb-20 w-full">
          <h3 className="font-bold">Kelas Komoditas</h3>

          {/* Kelas (multi) */}
          <div>
            {classOptions.map((c) => {
              const checked = selectedClasses.includes(c);
              return (
                <label key={c} className="flex items-center gap-2 py-0.5">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      setSelectedClasses((prev) =>
                        e.target.checked
                          ? [...prev, c]
                          : prev.filter((x) => x !== c)
                      );
                    }}
                  />
                  <h6 className="text-sm">{c}</h6>
                </label>
              );
            })}
          </div>

          <div className="flex flex-col gap-3">
            <button
              className="flex py-1 bg-teal-600 rounded-md text-xs text-white hover:bg-teal-700 cursor-pointer justify-center items-center"
              onClick={() => setSelectedClasses(classOptions)}
            >
              Semua
            </button>
            <button
              className="flex py-1 bg-teal-600 rounded-md text-xs text-white hover:bg-teal-700 cursor-pointer justify-center items-center"
              onClick={() => setSelectedClasses([])}
            >
              Reset
            </button>
          </div>

          {/* //! FILTERS - MOBILE (inside side menu) */}
          <div className="reltive flex md:hidden gap-x-6 md:gap-y-2 gap-y-6 flex-wrap">
            {/* Tahun */}
            <div className="w-full">
              <label className="font-medium lg:text-sm md:text-[1.5vw] text-[2.8vw]">
                Tahun
              </label>
              <div>
                <select
                  className="rounded border px-2 py-1 lg:text-sm md:text-[1.5vw] text-[2.8vw] w-full"
                  value={selectedYear === "all" ? "all" : String(selectedYear)}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSelectedYear(v === "all" ? "all" : Number(v));
                  }}
                >
                  <option value="all" className="text-black">
                    Semua
                  </option>
                  {yearOptions.map((y) => (
                    <option key={y} value={y} className="text-black">
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Semester */}
            <div className="w-full">
              <label className="font-medium lg:text-sm md:text-[1.5vw] text-[2.8vw]">
                Semester
              </label>
              <div>
                <select
                  className="rounded border px-2 py-1 lg:text-sm md:text-[1.5vw] text-[2.8vw] w-full"
                  value={String(selectedSemester)}
                  onChange={(e) => {
                    const v = e.target.value as "all" | "1" | "2";
                    setSelectedSemester(
                      v === "all" ? "all" : (Number(v) as 1 | 2)
                    );
                  }}
                >
                  <option value="all" className="text-black">
                    Semua
                  </option>
                  <option value="1" className="text-black">
                    1
                  </option>
                  <option value="2" className="text-black">
                    2
                  </option>
                </select>
              </div>
            </div>

            {/* Kabupaten (single) */}
            <div className="w-full">
              <label className="font-medium lg:text-sm md:text-[1.5vw] text-[2.8vw]">
                Kabupaten
              </label>
              <div>
                <select
                  className="rounded border px-2 py-1 lg:text-sm md:text-[1.5vw] text-[2.8vw] w-full"
                  value={selectedKab}
                  onChange={(e) =>
                    setSelectedKab(
                      e.target.value === "all" ? "all" : e.target.value
                    )
                  }
                >
                  <option value="all" className="text-black">
                    Semua
                  </option>
                  {kabOptions.map((k) => (
                    <option key={k} value={k} className="text-black">
                      {k}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Landing */}
            <div className="w-full">
              <label className="font-medium lg:text-sm md:text-[1.5vw] text-[2.8vw]">
                Landing
              </label>
              <div>
                <select
                  className="rounded border px-2 py-1 lg:text-sm md:text-[1.5vw] text-[2.8vw] w-full"
                  value={selectedLanding}
                  onChange={(e) =>
                    setSelectedLanding(
                      e.target.value === "all" ? "all" : e.target.value
                    )
                  }
                >
                  <option value="all" className="text-black">
                    Semua
                  </option>
                  {landingOptions.map((l) => (
                    <option key={l} value={l} className="text-black">
                      {l}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sorting + Order */}
            <div className="w-full">
              <label className="font-medium lg:text-sm md:text-[1.5vw] text-[2.8vw]">
                Urutkan
              </label>
              <div className="flex flex-col gap-3">
                <select
                  className="rounded border px-2 py-1 lg:text-sm md:text-[1.5vw] text-[2.8vw] w-full"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortBy)}
                >
                  <option value="name" className="text-black">
                    Nama
                  </option>
                  <option value="value" className="text-black">
                    Nilai
                  </option>
                </select>
                <select
                  className="rounded border px-2 py-1 lg:text-sm md:text-[1.5vw] text-[2.8vw] w-full"
                  value={order}
                  onChange={(e) => setOrder(e.target.value as Order)}
                >
                  <option value="asc" className="text-black">
                    Naik
                  </option>
                  <option value="desc" className="text-black">
                    Turun
                  </option>
                </select>
              </div>
            </div>

            {/* Top */}
            <div className="w-full">
              <label className="font-medium lg:text-sm md:text-[1.5vw] text-[2.8vw]">
                Top
              </label>
              <select
                className="rounded border px-2 py-1 lg:text-sm md:text-[1.5vw] text-[2.8vw] w-full"
                value={topN}
                onChange={(e) => {
                  const v = e.target.value as "all" | "5" | "10";
                  setTopN(v === "all" ? "all" : (Number(v) as 5 | 10));
                }}
              >
                <option value="all" className="text-black">
                  Semua
                </option>
                <option value="5" className="text-black">
                  Top 5
                </option>
                <option value="10" className="text-black">
                  Top 10
                </option>
              </select>
            </div>

            {/* Download */}
            <div className="w-full">
              <label className="font-medium lg:text-sm md:text-[1.5vw] text-[2.8vw]">
                Download
              </label>
              <div>
                <button
                  className={`px-3 py-1 rounded border lg:text-sm md:text-[1.5vw] text-[2.8vw] w-full ${
                    noDatasetSelected || items.length === 0
                      ? "opacity-50 cursor-not-allowed"
                      : "bg-teal-600 text-white hover:bg-teal-500"
                  }`}
                  onClick={downloadCsv}
                  disabled={noDatasetSelected || items.length === 0}
                >
                  CSV
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* //! Close Side Menu */}
        <div className="flex justify-center items-center text-6xl md:hidden cursor-pointer">
          <div
            className="px-0 pb-3 -rotate-90 -translate-x-6"
            onClick={() => setShowSideMenu(!showSideMenu)}
          >
            <div className="flex justify-center items-center bg-teal-900 px-2 rounded-b-md">
              <p className="text-sm w-full text-white">Filters </p>
              <UpChevron className="w-6 h-6" color="white" />
            </div>
          </div>
        </div>
      </aside>

      {/* //! Open Side Menu */}
      <div
        className="flex fixed top-0 items-center justify-start text-6xl h-[100vh] md:hidden cursor-pointer
            -translate-x-6"
      >
        <div
          className="px-0 pb-3 -rotate-90 "
          onClick={() => setShowSideMenu(!showSideMenu)}
        >
          <div className="flex justify-center items-center bg-stone-300 px-2 rounded-b-md">
            <p className="text-sm w-full text-white">Filters </p>
            <DownChevron className="w-6 h-6" color="white" />
          </div>
        </div>
      </div>

      {/* Overlay */}
      <div
        className={`${showSideMenu ? "flex" : "hidden"} md:hidden fixed z-3 inset-0 bg-black/50 w-[100vw] h-[100vh]`}
        onClick={() => setShowSideMenu(false)}
      />

      {/* Main */}
      <div className="flex flex-col lg:mx-12 mx-8 w-full">
        {/* Header + page nav */}
        <div className="flex w-full">
          <div
            className="flex justify-center items-center md:pr-6 pr-3 md:py-3 py-0 cursor-pointer"
            onClick={() => fromChild(pages[0])}
          >
            <LeftChevron className="lg:w-7 lg:h-7 w-5 h-5" />
          </div>

          <div className="relative flex flex-col justify-center items-center md:my-3 my-0 w-full">
            <div
              onClick={() => setShowDropDown(!showDropDown)}
              className="flex items-center justify-between w-full lg:h-10 h-8 mx-12 px-3 my-3 rounded-lg mt-6 mb-6 border border-stone-100 cursor-pointer shadow-md"
            >
              <p className="lg:text-sm md:text-[1.5vw] text-[2.8vw]">
                Lihat Data Lainnya
              </p>
              <DownChevron
                className={`${showDropDown ? "hidden" : "flex"} lg:w-7 lg:h-7 w-4 h-4`}
              />
              <UpChevron
                className={`${showDropDown ? "flex" : "hidden"} lg:w-7 lg:h-7 w-4 h-4`}
              />
            </div>

            {/* Dropdown list */}
            <div
              className={`${showDropDown ? "flex" : "hidden"} flex-col w-full py-1.5 border rounded-lg absolute z-10 top-17 bg-white cursor-pointer`}
            >
              {pages.map((e, idx) => {
                if (e === "Home") return null;
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setShowDropDown(false);
                      fromChild(pages[idx]);
                    }}
                    className="px-3 py-1.5 hover:bg-stone-100 lg:text-sm md:text-[1.5vw] text-[2.8vw]"
                  >
                    {e}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Title */}
        <h2 className="md:mb-6 mb-3">{TITLE}</h2>

        {/* //! TOP CONTROL (desktop only) */}
        <div className="hidden md:flex gap-x-3 md:gap-y-2 gap-y-1 flex-wrap mb-6">
          {/* Tahun */}
          <div>
            <label className="font-medium lg:text-sm md:text-[1.5vw] text-[2.8vw]">
              Tahun
            </label>
            <div>
              <select
                className="rounded border px-2 py-1 lg:text-sm md:text-[1.5vw] text-[2.8vw]"
                value={selectedYear === "all" ? "all" : String(selectedYear)}
                onChange={(e) => {
                  const v = e.target.value;
                  setSelectedYear(v === "all" ? "all" : Number(v));
                }}
              >
                <option
                  value="all"
                  className="lg:text-sm md:text-[1.5vw] text-[2.8vw]"
                >
                  Semua
                </option>
                {yearOptions.map((y) => (
                  <option
                    key={y}
                    value={y}
                    className="lg:text-sm md:text-[1.5vw] text-[2.8vw]"
                  >
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Semester */}
          <div>
            <label className="font-medium lg:text-sm md:text-[1.5vw] text-[2.8vw]">
              Semester
            </label>
            <div>
              <select
                className="rounded border px-2 py-1 lg:text-sm md:text-[1.5vw] text-[2.8vw]"
                value={String(selectedSemester)}
                onChange={(e) => {
                  const v = e.target.value as "all" | "1" | "2";
                  setSelectedSemester(
                    v === "all" ? "all" : (Number(v) as 1 | 2)
                  );
                }}
              >
                <option
                  value="all"
                  className="lg:text-sm md:text-[1.5vw] text-[2.8vw]"
                >
                  Semua
                </option>
                <option
                  value="1"
                  className="lg:text-sm md:text-[1.5vw] text-[2.8vw]"
                >
                  1
                </option>
                <option
                  value="2"
                  className="lg:text-sm md:text-[1.5vw] text-[2.8vw]"
                >
                  2
                </option>
              </select>
            </div>
          </div>

          {/* Kabupaten */}
          <div>
            <label className="font-medium lg:text-sm md:text-[1.5vw] text-[2.8vw]">
              Kabupaten
            </label>
            <div>
              <select
                className="rounded border px-2 py-1 lg:text-sm md:text-[1.5vw] text-[2.8vw]"
                value={selectedKab}
                onChange={(e) =>
                  setSelectedKab(
                    e.target.value === "all" ? "all" : e.target.value
                  )
                }
              >
                <option
                  value="all"
                  className="lg:text-sm md:text-[1.5vw] text-[2.8vw]"
                >
                  Semua
                </option>
                {kabOptions.map((k) => (
                  <option
                    key={k}
                    value={k}
                    className="lg:text-sm md:text-[1.5vw] text-[2.8vw]"
                  >
                    {k}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Landing */}
          <div>
            <label className="font-medium lg:text-sm md:text-[1.5vw] text-[2.8vw]">
              Landing
            </label>
            <div>
              <select
                className="rounded border px-2 py-1 lg:text-sm md:text-[1.5vw] text-[2.8vw]"
                value={selectedLanding}
                onChange={(e) =>
                  setSelectedLanding(
                    e.target.value === "all" ? "all" : e.target.value
                  )
                }
              >
                <option
                  value="all"
                  className="lg:text-sm md:text-[1.5vw] text-[2.8vw]"
                >
                  Semua
                </option>
                {landingOptions.map((l) => (
                  <option
                    key={l}
                    value={l}
                    className="lg:text-sm md:text-[1.5vw] text-[2.8vw]"
                  >
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sorting + Order */}
          <div>
            <label className="font-medium lg:text-sm md:text-[1.5vw] text-[2.8vw]">
              Urutkan
            </label>
            <div className="flex gap-3">
              <select
                className="rounded border px-2 py-1 lg:text-sm md:text-[1.5vw] text-[2.8vw]"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
              >
                <option value="name">Nama</option>
                <option value="value">Nilai</option>
              </select>
              <select
                className="rounded border px-2 py-1 lg:text-sm md:text-[1.5vw] text-[2.8vw]"
                value={order}
                onChange={(e) => setOrder(e.target.value as Order)}
              >
                <option value="asc">Naik</option>
                <option value="desc">Turun</option>
              </select>
            </div>
          </div>

          {/* Top */}
          <div>
            <label className="font-medium lg:text-sm md:text-[1.5vw] text-[2.8vw]">
              Top
            </label>
            <div>
              <select
                className="rounded border px-2 py-1 lg:text-sm md:text-[1.5vw] text-[2.8vw]"
                value={topN}
                onChange={(e) => {
                  const v = e.target.value as "all" | "5" | "10";
                  setTopN(v === "all" ? "all" : (Number(v) as 5 | 10));
                }}
              >
                <option value="all">Semua</option>
                <option value="5">Top 5</option>
                <option value="10">Top 10</option>
              </select>
            </div>
          </div>

          {/* Download */}
          <div>
            <label className="font-medium lg:text-sm md:text-[1.5vw] text-[2.8vw]">
              Download
            </label>
            <div>
              <button
                className={`px-3 py-1 rounded w-full border lg:text-sm md:text-[1.5vw] text-[2.8vw] ${
                  noDatasetSelected || items.length === 0
                    ? "opacity-50 cursor-not-allowed"
                    : "bg-teal-600 text-white hover:bg-teal-500"
                }`}
                onClick={downloadCsv}
                disabled={noDatasetSelected || items.length === 0}
              >
                CSV
              </button>
            </div>
          </div>
        </div>

        {/* Chart */}
        <BarCharts
          chartTitle=""
          labels={labels}
          datasets={datasets}
          stacked={false}
          datalabel={false}
          yAxis={true}
          tooltipLabels={tooltipLabels}
          rotateXLabels={45}
        />

        {/* Table */}
        <div className="overflow-x-auto mb-12">
          <table className="min-w-full lg:text-sm md:text-[1.5vw] text-[2vw]">
            <thead className="bg-teal-100">
              <tr>
                <th className="px-3 py-2 border border-gray-400 text-center">
                  Nama
                </th>
                <th className="px-3 py-2 border border-gray-400 text-center">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-gray-500" colSpan={2}>
                    Tidak ada data untuk filter saat ini.
                  </td>
                </tr>
              ) : (
                items.map((it) => (
                  <tr key={it.key}>
                    <td className="px-3 py-2 border border-gray-400">
                      {it.tableLabel}
                    </td>
                    <td className="px-3 py-2 border border-gray-400 text-right">
                      {nf.format(it.value)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {items.length > 0 && (
              <tfoot className="bg-teal-50">
                <tr>
                  <td className="px-3 py-2 border border-gray-400 font-semibold">
                    Jumlah
                  </td>
                  <td className="px-3 py-2 border border-gray-400 text-right font-semibold">
                    {nf.format(grandTotal)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
