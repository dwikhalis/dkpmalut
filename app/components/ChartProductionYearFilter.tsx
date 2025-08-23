"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/supabaseClient";
import BarCharts from "./BarCharts";
import { DownChevron, LeftChevron, UpChevron } from "@/public/icons/iconSets";

type Row = {
  kab: string | null;
  year: number | string | null; // x-axis (year)
  tot_produksi?: number | string | null; // budidaya
  weight?: number | string | null; // tangkap
};

type DatasetConf = {
  label: string;
  values: number[];
  backgroundColor?: string;
};

interface Props {
  fromChild?: (sendData: string) => void;
  pages: string[];
}

const TITLE = "Produksi Perikanan Tangkap dan Budidaya per Tahun";

// tolerant number parser
function toNum(v: unknown) {
  if (v == null) return NaN;
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const cleaned = v.replace(/[^\d.-]/g, "");
    return Number(cleaned);
  }
  return NaN;
}
function toYear(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v.slice(0, 4)) : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Fetch *all* rows with pagination to avoid PostgREST default limit */
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

/** Aggregate per YEAR (x-axis) with optional kab + year filters */
function aggregateByYear(
  rows: Row[],
  pick: (r: Row) => number | string | null | undefined,
  kabFilter?: Set<string>,
  yearFilter?: Set<number>
) {
  const totals = new Map<number, number>();
  rows.forEach((r) => {
    const kab = r.kab?.trim();
    if (!kab) return;
    if (kabFilter && kabFilter.size > 0 && !kabFilter.has(kab)) return;

    const y = toYear(r.year);
    if (y == null) return;
    if (yearFilter && yearFilter.size > 0 && !yearFilter.has(y)) return;

    const val = toNum(pick(r));
    if (!Number.isFinite(val)) return;

    totals.set(y, (totals.get(y) ?? 0) + val);
  });
  return totals;
}

export default function ChartProductionYearFilter({
  fromChild = () => {},
  pages,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // raw rows
  const [rowsBudidaya, setRowsBudidaya] = useState<Row[]>([]);
  const [rowsTangkap, setRowsTangkap] = useState<Row[]>([]);

  // filters
  const [selectedYears, setSelectedYears] = useState<number[]>([]); // sidebar multi-select (mobile)
  const [selectedKab, setSelectedKab] = useState<"all" | string>("all"); // dropdown single
  const [showBudidaya, setShowBudidaya] = useState(true);
  const [showTangkap, setShowTangkap] = useState(true);
  const [stacked, setStacked] = useState(false);
  const [sortBy, setSortBy] = useState<"value" | "year">("year");
  const [order, setOrder] = useState<"desc" | "asc">("asc");
  const [showDropDown, setShowDropDown] = useState(false);
  const [showSideMenu, setShowSideMenu] = useState(false); // retractable side menu (mobile)

  // fetch (with pagination)
  useEffect(() => {
    let cancelled = false;
    const getErrorMessage = (e: unknown) => {
      if (e instanceof Error) return e.message;
      try {
        return JSON.stringify(e);
      } catch {
        return String(e);
      }
    };

    (async () => {
      try {
        const [bud, tan] = await Promise.all([
          fetchAllRows<Row>("budidaya", "kab, year, tot_produksi"),
          fetchAllRows<Row>("tangkap", "kab, year, weight"),
        ]);
        if (cancelled) return;
        setRowsBudidaya(bud);
        setRowsTangkap(tan);
        setErr(null);
      } catch (e) {
        setErr(getErrorMessage(e) || "Failed to load data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // options
  const yearOptions = useMemo(() => {
    const s = new Set<number>();
    [...rowsBudidaya, ...rowsTangkap].forEach((r) => {
      const y = toYear(r.year);
      if (y != null) s.add(y);
    });
    return Array.from(s).sort((a, b) => b - a); // newest first
  }, [rowsBudidaya, rowsTangkap]);

  const kabOptions = useMemo(() => {
    const s = new Set<string>();
    [...rowsBudidaya, ...rowsTangkap].forEach((r) => {
      const kab = r.kab?.trim();
      if (kab) s.add(kab);
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [rowsBudidaya, rowsTangkap]);

  // totals per year, with filters
  const totals = useMemo(() => {
    const kabSet = selectedKab === "all" ? undefined : new Set([selectedKab]);
    const yearSet =
      selectedYears.length > 0 ? new Set(selectedYears) : undefined;

    const tb = aggregateByYear(
      rowsBudidaya,
      (r) => r.tot_produksi,
      kabSet,
      yearSet
    );
    const tt = aggregateByYear(rowsTangkap, (r) => r.weight, kabSet, yearSet);
    return { tb, tt };
  }, [rowsBudidaya, rowsTangkap, selectedKab, selectedYears]);

  // x-axis (years)
  const years = useMemo(() => {
    const s = new Set<number>([...totals.tb.keys(), ...totals.tt.keys()]);
    const arr = Array.from(s);

    if (sortBy === "year") {
      arr.sort((a, b) => (order === "asc" ? a - b : b - a));
    } else {
      const sumForYear = (y: number) =>
        (showBudidaya ? (totals.tb.get(y) ?? 0) : 0) +
        (showTangkap ? (totals.tt.get(y) ?? 0) : 0);
      arr.sort(
        (a, b) => (sumForYear(a) - sumForYear(b)) * (order === "asc" ? 1 : -1)
      );
    }
    return arr;
  }, [totals, sortBy, order, showBudidaya, showTangkap]);

  const datasets: DatasetConf[] = useMemo(() => {
    const ds: DatasetConf[] = [];
    if (showBudidaya) {
      ds.push({
        label: "Budidaya",
        values: years.map((y) => totals.tb.get(y) ?? 0),
        backgroundColor: "rgba(144, 238, 144, 0.7)",
      });
    }
    if (showTangkap) {
      ds.push({
        label: "Tangkap",
        values: years.map((y) => totals.tt.get(y) ?? 0),
        backgroundColor: "rgba(53, 162, 235, 0.6)",
      });
    }
    return ds;
  }, [years, totals, showBudidaya, showTangkap]);

  // table (source of truth for CSV)
  const tableRows = useMemo(() => {
    return years.map((y) => {
      const bud = totals.tb.get(y) ?? 0;
      const tang = totals.tt.get(y) ?? 0;
      return {
        year: y,
        bud: showBudidaya ? bud : 0,
        tang: showTangkap ? tang : 0,
        total: (showBudidaya ? bud : 0) + (showTangkap ? tang : 0),
      };
    });
  }, [years, totals, showBudidaya, showTangkap]);

  const grand = useMemo(
    () =>
      tableRows.reduce(
        (acc, r) => ({
          bud: acc.bud + r.bud,
          tang: acc.tang + r.tang,
          total: acc.total + r.total,
        }),
        { bud: 0, tang: 0, total: 0 }
      ),
    [tableRows]
  );

  const nf = useMemo(
    () => new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }),
    []
  );

  // ===== CSV (data-based) =====
  const noDatasetSelected = !showBudidaya && !showTangkap;

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

  const toCsv = (header: (string | number)[], rows: (string | number)[][]) => {
    const lines = [
      header.map(csvCell).join(","),
      ...rows.map((r) => r.map(csvCell).join(",")),
    ];
    return lines.join("\r\n");
  };

  const downloadCsv = () => {
    if (noDatasetSelected || tableRows.length === 0) return;

    const header: (string | number)[] = ["Tahun"];
    if (showBudidaya) header.push("Budidaya");
    if (showTangkap) header.push("Tangkap");
    header.push("Total");

    const body: (string | number)[][] = tableRows.map((r) => {
      const row: (string | number)[] = [r.year];
      if (showBudidaya) row.push(r.bud);
      if (showTangkap) row.push(r.tang);
      row.push(r.total);
      return row;
    });

    const grandRow: (string | number)[] = ["Jumlah"];
    if (showBudidaya) grandRow.push(grand.bud);
    if (showTangkap) grandRow.push(grand.tang);
    grandRow.push(grand.total);
    body.push(grandRow);

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
        <div
          className={`flex flex-col gap-3 bg-teal-900 px-5 md:pt-8 lg:pt-12 pt-18 text-white overflow-y-scroll scrollbar-hide pb-20 w-full`}
        >
          <h3 className="font-bold">Filter</h3>

          {/* Tahun (multi) */}
          <div className="w-full">
            <label className="font-medium lg:text-sm md:text-[1.5vw] text-[2.8vw]">
              Tahun
            </label>
            <div className="flex flex-col gap-2 mt-1">
              {yearOptions.map((y) => {
                const checked = selectedYears.includes(y);
                return (
                  <label key={y} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        setSelectedYears((prev) =>
                          e.target.checked
                            ? [...prev, y]
                            : prev.filter((v) => v !== y)
                        );
                      }}
                    />
                    <h6 className="lg:text-sm md:text-[1.5vw] text-[2.8vw]">
                      {y}
                    </h6>
                  </label>
                );
              })}

              <div className="flex flex-col gap-3 mt-3">
                <button
                  className="flex py-1 bg-teal-600 rounded-md text-white hover:bg-teal-700 cursor-pointer justify-center items-center lg:text-sm md:text-[1.5vw] text-[2.8vw]"
                  onClick={() => setSelectedYears(yearOptions)}
                >
                  Semua
                </button>
                <button
                  className="flex py-1 bg-teal-600 rounded-md text-white hover:bg-teal-700 cursor-pointer justify-center items-center lg:text-sm md:text-[1.5vw] text-[2.8vw]"
                  onClick={() => setSelectedYears([])}
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          {/* //! FILTERS */}
          {/* Kabupaten (single) */}
          <div className="flex flex-col gap-6 md:hidden">
            <div className="w-full">
              <label className="font-medium lg:text-sm md:text-[1.5vw] text-[2.8vw]">
                Kabupaten
              </label>
              <div>
                <select
                  className="rounded border px-2 py-1 lg:text-sm md:text-[1.5vw] text-[2.8vw] w-full"
                  value={selectedKab}
                  onChange={(e) =>
                    setSelectedKab(e.target.value as "all" | string)
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

            {/* Datasets */}
            <div className="w-full">
              <label className="font-medium lg:text-sm md:text-[1.5vw] text-[2.8vw]">
                Datasets
              </label>
              <div className="flex flex-col gap-3">
                <button
                  className={`flex px-3 py-1 rounded border items-center gap-1 lg:text-sm md:text-[1.5vw] text-[2.8vw] w-full ${
                    showBudidaya
                      ? "bg-teal-600 text-white border-teal-600"
                      : "border-white"
                  }`}
                  onClick={() => setShowBudidaya(!showBudidaya)}
                >
                  Budidaya
                </button>
                <button
                  className={`flex px-3 py-1 rounded border items-center gap-1 lg:text-sm md:text-[1.5vw] text-[2.8vw] w-full ${
                    showTangkap
                      ? "bg-sky-600 text-white border-teal-600"
                      : "border-white"
                  }`}
                  onClick={() => setShowTangkap(!showTangkap)}
                >
                  Tangkap
                </button>
              </div>
            </div>

            {/* Tampilan */}
            <div className="w-full">
              <label className="font-medium lg:text-sm md:text-[1.5vw] text-[2.8vw]">
                Tampilan
              </label>
              <div className="flex flex-col gap-3">
                <button
                  className={`px-3 py-1 rounded border lg:text-sm md:text-[1.5vw] text-[2.8vw] w-full ${
                    stacked
                      ? "bg-teal-600 text-white border-teal-600"
                      : "border-white"
                  }`}
                  onClick={() => setStacked(true)}
                >
                  Tumpuk
                </button>
                <button
                  className={`px-3 py-1 rounded border lg:text-sm md:text-[1.5vw] text-[2.8vw] w-full ${
                    !stacked
                      ? "bg-teal-600 text-white border-teal-600"
                      : "border-white"
                  }`}
                  onClick={() => setStacked(false)}
                >
                  Grup
                </button>
              </div>
            </div>

            {/* Sorting */}
            <div className="w-full">
              <label className="font-medium lg:text-sm md:text-[1.5vw] text-[2.8vw]">
                Urutkan
              </label>
              <div className="flex flex-col gap-3">
                <select
                  className="rounded border px-2 py-1 lg:text-sm md:text-[1.5vw] text-[2.8vw] w-full"
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(e.target.value as "value" | "year")
                  }
                >
                  <option value="year" className="text-black">
                    Tahun
                  </option>
                  <option value="value" className="text-black">
                    Nilai
                  </option>
                </select>

                <select
                  className="rounded border px-2 py-1 lg:text-sm md:text-[1.5vw] text-[2.8vw] w-full"
                  value={order}
                  onChange={(e) => setOrder(e.target.value as "asc" | "desc")}
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

            {/* Download */}
            <div className="w-full">
              <label className="font-medium lg:text-sm md:text-[1.5vw] text-[2.8vw]">
                Download
              </label>
              <div>
                <button
                  className={`px-3 py-1 rounded border lg:text-sm md:text-[1.5vw] text-[2.8vw] w-full ${
                    noDatasetSelected || tableRows.length === 0
                      ? "opacity-50 cursor-not-allowed"
                      : "bg-teal-600 text-white hover:bg-teal-500"
                  }`}
                  onClick={downloadCsv}
                  disabled={noDatasetSelected || tableRows.length === 0}
                >
                  CSV
                </button>
              </div>
            </div>
          </div>
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
            <div className="flex justify-center items-center bg-teal-900 px-2 rounded-b-md">
              <p className="text-sm w-full text-white">Filters </p>
              <UpChevron className="w-6 h-6" color="white" />
            </div>
          </div>
        </div>
      </aside>

      {/* //! Open Side Menu */}
      <div
        className="flex fixed top-[50%] items-center justify-start md:hidden cursor-pointer
              -translate-x-12"
      >
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

      {/* //! POP UP FOCUS OVERLAY */}
      <div
        className={`${showSideMenu ? "flex" : "hidden"} md:hidden fixed z-3 inset-0 bg-black/50 w-[100vw] h-[100vh]`}
        onClick={() => setShowSideMenu(false)}
      />

      {/* Main */}
      <div className="flex flex-col lg:mx-12 mx-8 w-full">
        <div className="flex w-full">
          {/* //! HEAD + PAGE NAV */}
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

            {/* //! DROPDOWN */}
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

        {/* //! MAIN TITLE */}
        <h2 className="md:mb-6 mb-3">{TITLE}</h2>

        {/* //! TOP CONTROL (desktop only) */}
        <div className="hidden md:flex gap-x-3 md:gap-y-2 gap-y-1 flex-wrap mb-6">
          {/* Kabupaten (single) */}
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

          {/* Datasets */}
          <div>
            <label className="font-medium lg:text-sm md:text-[1.5vw] text-[2.8vw]">
              Datasets
            </label>
            <div className="flex gap-3">
              <button
                className={`flex px-3 py-1 rounded border items-center gap-1 lg:text-sm md:text-[1.5vw] text-[2.8vw] ${
                  showBudidaya
                    ? "bg-teal-600 text-white border-teal-600"
                    : "bg-white"
                }`}
                onClick={() => setShowBudidaya(!showBudidaya)}
              >
                Budidaya
              </button>
              <button
                className={`flex px-3 py-1 rounded border items-center gap-1 lg:text-sm md:text-[1.5vw] text-[2.8vw] ${
                  showTangkap
                    ? "bg-sky-600 text-white border-teal-600"
                    : "bg-white"
                }`}
                onClick={() => setShowTangkap(!showTangkap)}
              >
                Tangkap
              </button>
            </div>
          </div>

          {/* Tampilan */}
          <div>
            <label className="font-medium lg:text-sm md:text-[1.5vw] text-[2.8vw]">
              Tampilan
            </label>
            <div className="flex gap-3">
              <button
                className={`px-3 py-1 rounded border lg:text-sm md:text-[1.5vw] text-[2.8vw] ${
                  stacked
                    ? "bg-teal-600 text-white border-teal-600"
                    : "bg-white"
                }`}
                onClick={() => setStacked(true)}
              >
                Tumpuk
              </button>
              <button
                className={`px-3 py-1 rounded border lg:text-sm md:text-[1.5vw] text-[2.8vw] ${
                  !stacked
                    ? "bg-teal-600 text-white border-teal-600"
                    : "bg-white"
                }`}
                onClick={() => setStacked(false)}
              >
                Grup
              </button>
            </div>
          </div>

          {/* Sorting */}
          <div>
            <label className="font-medium lg:text-sm md:text-[1.5vw] text-[2.8vw]">
              Urutkan
            </label>
            <div className="flex gap-3">
              <select
                className="rounded border px-2 py-1 lg:text-sm md:text-[1.5vw] text-[2.8vw]"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "value" | "year")}
              >
                <option value="year">Tahun</option>
                <option value="value">Nilai</option>
              </select>

              <select
                className="rounded border px-2 py-1 lg:text-sm md:text-[1.5vw] text-[2.8vw]"
                value={order}
                onChange={(e) => setOrder(e.target.value as "asc" | "desc")}
              >
                <option value="asc">Naik</option>
                <option value="desc">Turun</option>
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
                  noDatasetSelected || tableRows.length === 0
                    ? "opacity-50 cursor-not-allowed"
                    : "bg-teal-600 text-white hover:bg-teal-500"
                }`}
                onClick={downloadCsv}
                disabled={noDatasetSelected || tableRows.length === 0}
              >
                CSV
              </button>
            </div>
          </div>
        </div>

        {/* //! CHART */}
        <BarCharts
          chartTitle=""
          labels={years.map(String)}
          datasets={datasets}
          stacked={stacked}
          datalabel={false}
          yAxis={true}
          rotateXLabels={0}
        />

        {/* Table */}
        <div className="overflow-x-auto mb-12">
          <table className="min-w-full lg:text-sm md:text-[1.5vw] text-[2vw]">
            <thead className="bg-teal-100">
              <tr>
                <th className="px-3 py-2 border border-gray-400">Tahun</th>
                {showBudidaya && (
                  <th className="px-3 py-2 border border-gray-400">Budidaya</th>
                )}
                {showTangkap && (
                  <th className="px-3 py-2 border border-gray-400">Tangkap</th>
                )}
                <th className="px-3 py-2 border border-gray-400">Total</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.length === 0 ? (
                <tr>
                  <td
                    className="px-3 py-3 text-gray-500"
                    colSpan={3 + Number(showBudidaya) + Number(showTangkap)}
                  >
                    Tidak ada data untuk filter saat ini.
                  </td>
                </tr>
              ) : (
                tableRows.map((r) => (
                  <tr key={r.year}>
                    <td className="px-3 py-2 border border-gray-400">
                      {r.year}
                    </td>
                    {showBudidaya && (
                      <td className="px-3 py-2 border border-gray-400 text-right">
                        {nf.format(r.bud)}
                      </td>
                    )}
                    {showTangkap && (
                      <td className="px-3 py-2 border border-gray-400 text-right">
                        {nf.format(r.tang)}
                      </td>
                    )}
                    <td className="px-3 py-2 border border-gray-400 text-right font-medium">
                      {nf.format(r.total)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {tableRows.length > 0 && (
              <tfoot className="bg-teal-50">
                <tr>
                  <td className="px-3 py-2 border border-gray-400 font-semibold">
                    Jumlah
                  </td>
                  {showBudidaya && (
                    <td className="px-3 py-2 border border-gray-400 text-right font-semibold">
                      {nf.format(grand.bud)}
                    </td>
                  )}
                  {showTangkap && (
                    <td className="px-3 py-2 border border-gray-400 text-right font-semibold">
                      {nf.format(grand.tang)}
                    </td>
                  )}
                  <td className="px-3 py-2 border border-gray-400 text-right font-semibold">
                    {nf.format(grand.total)}
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
