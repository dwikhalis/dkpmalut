"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/supabaseClient";
import BarCharts from "./BarCharts";
import { DownChevron, LeftChevron, UpChevron } from "@/public/icons/iconSets";

type Row = {
  kab: string | null;
  year: number | string | null;
  semester?: number | string | null;
  class: string | null;
  landing?: string | null;
  weight?: number | string | null;
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

const TITLE = "Produksi Perikanan Tangkap per Kelas Komoditas";

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
// "1", "2", "Semester 1/II", "I"/"II" -> 1/2
function toSemester(v: unknown): 1 | 2 | null {
  if (v == null) return null;
  if (typeof v === "number") {
    const n = Math.trunc(v);
    return n === 1 || n === 2 ? (n as 1 | 2) : null;
  }
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    const m = s.match(/[12]/);
    if (m) {
      const n = Number(m[0]);
      return n === 1 || n === 2 ? (n as 1 | 2) : null;
    }
    if (/\bii\b/.test(s)) return 2;
    if (/\bi\b/.test(s)) return 1;
  }
  return null;
}

/** Fetch *all* rows with pagination to avoid Supabase/PostgREST limit */
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

/** Sum weight per CLASS with optional kab + year + semester + landing filters */
function aggregateByClass(
  rows: Row[],
  pick: (r: Row) => number | string | null | undefined,
  kabFilter?: Set<string>,
  yearSelected?: number | null,
  semesterSelected?: 1 | 2 | null,
  landingSelected?: string | null
) {
  const totals = new Map<string, number>();
  rows.forEach((r) => {
    const kab = r.kab?.trim();
    if (!kab) return;
    if (kabFilter && kabFilter.size > 0 && !kabFilter.has(kab)) return;

    const y = toYear(r.year);
    if (y == null) return;
    if (yearSelected != null && y !== yearSelected) return;

    const sem = toSemester(r.semester);
    if (semesterSelected != null && sem !== semesterSelected) return;

    const land = r.landing?.trim();
    if (landingSelected && (!land || land !== landingSelected)) return;

    const cls = r.class?.trim();
    if (!cls) return;

    const val = toNum(pick(r));
    if (!Number.isFinite(val)) return;

    totals.set(cls, (totals.get(cls) ?? 0) + val);
  });
  return totals;
}

export default function ChartProductionClassFish({
  fromChild = () => {},
  pages,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [rows, setRows] = useState<Row[]>([]);

  // Filters
  const [selectedKabs, setSelectedKabs] = useState<string[]>([]); // sidebar (multi)
  const [selectedYear, setSelectedYear] = useState<"all" | number>("all"); // dropdown (single)
  const [selectedSemester, setSelectedSemester] = useState<"all" | 1 | 2>(
    "all"
  );
  const [selectedLanding, setSelectedLanding] = useState<"all" | string>("all");
  const [sortBy, setSortBy] = useState<"value" | "class">("class");
  const [order, setOrder] = useState<"desc" | "asc">("asc");
  const [showDropDown, setShowDropDown] = useState(false);

  // fetch ALL rows (pagination) — include semester & landing
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
        type TangkapRow = Pick<
          Row,
          "kab" | "year" | "semester" | "class" | "landing" | "weight"
        >;
        const data = await fetchAllRows<TangkapRow>(
          "tangkap",
          "kab, year, semester, class, landing, weight"
        );
        if (cancelled) return;
        setRows((data ?? []) as Row[]);
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

  // Options
  const kabOptions = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => {
      const k = r.kab?.trim();
      if (k) s.add(k);
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const yearOptions = useMemo(() => {
    const s = new Set<number>();
    rows.forEach((r) => {
      const y = toYear(r.year);
      if (y != null) s.add(y);
    });
    return Array.from(s).sort((a, b) => b - a); // newest first
  }, [rows]);

  const landingOptions = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => {
      const l = r.landing?.trim();
      if (l) s.add(l);
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  // Totals per class with filters applied
  const totals = useMemo(() => {
    const kabSet = selectedKabs.length > 0 ? new Set(selectedKabs) : undefined;
    const ySel = selectedYear === "all" ? null : selectedYear;
    const semSel = selectedSemester === "all" ? null : selectedSemester;
    const landSel = selectedLanding === "all" ? null : selectedLanding.trim();

    return aggregateByClass(
      rows,
      (r) => r.weight,
      kabSet,
      ySel,
      semSel,
      landSel
    );
  }, [rows, selectedKabs, selectedYear, selectedSemester, selectedLanding]);

  // Build X labels (classes) and dataset
  const { labels, datasets }: { labels: string[]; datasets: DatasetConf[] } =
    useMemo(() => {
      const labs = Array.from(totals.keys());

      if (sortBy === "class") {
        labs.sort((a, b) => a.localeCompare(b) * (order === "asc" ? 1 : -1));
      } else {
        labs.sort(
          (a, b) =>
            ((totals.get(a) ?? 0) - (totals.get(b) ?? 0)) *
            (order === "asc" ? 1 : -1)
        );
      }

      const ds: DatasetConf[] = [
        {
          label: "Tangkap",
          values: labs.map((cls) => totals.get(cls) ?? 0),
          backgroundColor: "rgba(53, 162, 235, 0.6)",
        },
      ];
      return { labels: labs, datasets: ds };
    }, [totals, sortBy, order]);

  // Table helpers (source of truth for CSV)
  const tableRows = useMemo(
    () =>
      labels.map((cls) => ({
        cls,
        val: totals.get(cls) ?? 0,
      })),
    [labels, totals]
  );

  const grandTotal = useMemo(
    () => tableRows.reduce((acc, r) => acc + r.val, 0),
    [tableRows]
  );

  const nf = useMemo(
    () => new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }),
    []
  );

  // ===== CSV (data-based) =====
  // keep this var to match your button's disabled logic
  const noDatasetSelected = false;

  const fileNameFromTitle = (title: string) =>
    title
      .trim()
      .replace(/[\/\\?%*:|"<>]/g, "")
      .replace(/\s+/g, "_") + ".csv";

  const csvCell = (v: unknown) => {
    if (typeof v === "number" && Number.isFinite(v)) return String(v); // raw numeric
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
    if (noDatasetSelected || tableRows.length === 0) return;

    const header: (string | number)[] = ["Kelas", "Total"];
    const body: (string | number)[][] = tableRows.map((r) => [r.cls, r.val]);

    // footer (Jumlah)
    body.push(["Jumlah", grandTotal]);

    const csv = toCsv(header, body);
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" }); // BOM for Excel
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
    <div className="flex">
      {/* Sidebar: Kabupaten (multi) */}
      <aside className="flex flex-col bg-teal-900 md:pt-10 pt-20 p-6 top-0 md:top-auto md:static fixed z-5 md:z-0 md:w-[18%] w-[45vw] md:h-auto h-[100vh] text-white">
        <h3 className="mb-2">Kabupaten</h3>
        <div className="space-y-1">
          {kabOptions.map((kab) => {
            const checked = selectedKabs.includes(kab);
            return (
              <label key={kab} className="flex items-center gap-2 py-0.5">
                <input
                  type="checkbox"
                  className="accent-teal-600"
                  checked={checked}
                  onChange={(e) => {
                    setSelectedKabs((prev) =>
                      e.target.checked
                        ? [...prev, kab]
                        : prev.filter((k) => k !== kab)
                    );
                  }}
                />
                <span className="text-sm">{kab}</span>
              </label>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 mt-6">
          <button
            className="flex p-2 bg-teal-600 rounded-xl text-xs text-white hover:bg-teal-700 justify-center"
            onClick={() => setSelectedKabs(kabOptions)}
          >
            Semua
          </button>
          <button
            className="flex p-2 bg-teal-600 rounded-xl text-xs text-white hover:bg-teal-700 justify-center"
            onClick={() => setSelectedKabs([])}
          >
            Reset
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex flex-col ml-12 w-full">
        {/* //! HEAD DROPDOWN */}
        <div className="flex w-full">
          <div
            className="flex justify-center items-center pr-6 py-3 cursor-pointer"
            onClick={() => fromChild(pages[0])}
          >
            <LeftChevron width={30} height={30} />
          </div>
          <div className="relative flex flex-col justify-center items-center my-3 w-full">
            <div
              onClick={() => setShowDropDown(!showDropDown)}
              className="flex items-center justify-between w-full h-10 mx-12 px-3 my-3 rounded-lg mt-6 mb-6 border border-stone-100 cursor-pointer shadow-md"
            >
              <p>Lihat Data Lainnya</p>
              <DownChevron
                width={20}
                height={20}
                className={showDropDown ? "hidden" : "flex"}
              />
              <UpChevron
                width={20}
                height={20}
                className={showDropDown ? "flex" : "hidden"}
              />
            </div>
            {/* //! DROPDOWN */}
            <div
              className={`${showDropDown ? "flex" : "hidden"} flex-col w-full py-1.5 border rounded-lg absolute z-10 top-17 bg-white cursor-pointer`}
            >
              {pages.map((e, idx) => {
                if (e === "Home") return;

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setShowDropDown(false);
                      fromChild(pages[idx]);
                    }}
                    className="px-3 py-1.5 hover:bg-stone-100"
                  >
                    {e}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <h2 className="mb-6">{TITLE}</h2>

        <div className="flex flex-wrap gap-6">
          {/* Year */}
          <div>
            <label className="text-sm font-medium">Tahun</label>
            <div>
              <select
                className="rounded border px-2 py-1 text-sm"
                value={selectedYear === "all" ? "all" : String(selectedYear)}
                onChange={(e) => {
                  const v = e.target.value;
                  setSelectedYear(v === "all" ? "all" : Number(v));
                }}
              >
                <option value="all">Semua</option>
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Semester */}
          <div>
            <label className="text-sm font-medium">Semester</label>
            <div>
              <select
                className="rounded border px-2 py-1 text-sm"
                value={String(selectedSemester)}
                onChange={(e) => {
                  const v = e.target.value as "all" | "1" | "2";
                  setSelectedSemester(
                    v === "all" ? "all" : (Number(v) as 1 | 2)
                  );
                }}
              >
                <option value="all">Semua</option>
                <option value="1">1</option>
                <option value="2">2</option>
              </select>
            </div>
          </div>

          {/* Sorting */}
          <div>
            <label className="text-sm font-medium">Urutkan</label>
            <div className="flex gap-3">
              <select
                className="rounded border px-2 py-1 text-sm"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "value" | "class")}
              >
                <option value="class">Nama Kelas</option>
                <option value="value">Nilai</option>
              </select>
              <select
                className="rounded border px-2 py-1 text-sm"
                value={order}
                onChange={(e) => setOrder(e.target.value as "asc" | "desc")}
              >
                <option value="asc">Naik</option>
                <option value="desc">Turun</option>
              </select>
            </div>
          </div>

          {/* Landing */}
          <div>
            <label className="text-sm font-medium">Landing</label>
            <div>
              <select
                className="rounded border px-2 py-1 text-sm min-w-[220px]"
                value={selectedLanding}
                onChange={(e) =>
                  setSelectedLanding(
                    e.target.value === "all" ? "all" : e.target.value
                  )
                }
              >
                <option value="all">Semua</option>
                {landingOptions.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Download (your button) */}
          <div>
            <label className="text-sm font-medium">Download</label>
            <div>
              <button
                className={`px-3 py-1 rounded w-full border text-sm ${
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

        {/* Chart */}
        <div className="mt-4">
          <BarCharts
            chartTitle=""
            labels={labels}
            datasets={datasets}
            stacked={false}
          />
        </div>

        {/* Table */}
        <div className="mt-8 overflow-x-auto mb-12">
          <table className="min-w-full text-sm">
            <thead className="bg-teal-100">
              <tr>
                <th className="px-3 py-2 border border-gray-400 text-center">
                  Kelas
                </th>
                <th className="px-3 py-2 border border-gray-400 text-center">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {tableRows.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-gray-500" colSpan={2}>
                    Tidak ada data untuk filter saat ini.
                  </td>
                </tr>
              ) : (
                tableRows.map((r) => (
                  <tr key={r.cls}>
                    <td className="px-3 py-2 border border-gray-400">
                      {r.cls}
                    </td>
                    <td className="px-3 py-2 border border-gray-400 text-right">
                      {nf.format(r.val)}
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
                  <td className="px-3 py-2 border border-gray-400 text-right font-semibold">
                    {nf.format(grandTotal)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </main>
    </div>
  );
}
