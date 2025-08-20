"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/supabaseClient";
import BarCharts from "./BarCharts";

type Row = {
  kab: string | null;
  year: number | string | null;
  semester?: number | string | null; // <-- NEW
  class: string | null;
  common: string | null;
  name?: string | null;
  landing?: string | null; // <-- NEW
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

const TITLE = "Produksi Perikanan Tangkap per Jenis Komoditas";

// ===== Helpers =====
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

// Accepts "1", "2", "Semester I", "Semester 2", etc.
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

// fetch *all* rows with pagination
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

export default function ChartProductionCommonFish() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);

  // Filters
  const [selectedYear, setSelectedYear] = useState<"all" | number>("all");
  const [selectedSemester, setSelectedSemester] = useState<"all" | 1 | 2>(
    "all"
  ); // NEW
  const [selectedKab, setSelectedKab] = useState<"all" | string>("all");
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]); // sidebar checkboxes
  const [sortBy, setSortBy] = useState<SortBy>("name");
  const [order, setOrder] = useState<Order>("asc");
  const [topN, setTopN] = useState<TopN>("all");
  const [selectedLanding, setSelectedLanding] = useState<"all" | string>("all"); // NEW

  // Fetch ALL data (include `name`, `semester`, `landing`)
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

  // Options
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

  // Helper filter keys
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

  // ======= AGGREGATION KEYED BY `name` =======
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

  // Chart data (labels = SHORT NAME from `name`)
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

  // Tooltip titles (full `name`)
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

  // ===== CSV (data-based) =====
  const noDatasetSelected = false; // there’s only one dataset

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
    if (noDatasetSelected || items.length === 0) return;

    const header: (string | number)[] = ["Nama", "Total"];
    const body: (string | number)[][] = items.map((it) => [
      it.tableLabel,
      it.value,
    ]);

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
      {/* Sidebar: Kelas Komoditas (multi checkboxes) */}
      <aside className="flex flex-col bg-teal-900 md:pt-10 pt-20 p-6 top-0 md:top-auto md:static fixed z-5 md:z-0 md:w-[18%] w-[45vw] md:h-auto h-[100vh] text-white">
        <h3 className="mb-2">Kelas Komoditas</h3>
        <div className="space-y-1 max-h-[55vh] overflow-auto pr-1">
          {classOptions.map((c) => {
            const checked = selectedClasses.includes(c);
            return (
              <label key={c} className="flex items-center gap-2 py-0.5">
                <input
                  type="checkbox"
                  className="accent-teal-600"
                  checked={checked}
                  onChange={(e) => {
                    setSelectedClasses((prev) =>
                      e.target.checked
                        ? [...prev, c]
                        : prev.filter((x) => x !== c)
                    );
                  }}
                />
                <span className="text-sm">{c}</span>
              </label>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 mt-6">
          <button
            className="flex p-2 bg-teal-600 rounded-xl text-xs text-white hover:bg-teal-700 justify-center"
            onClick={() => setSelectedClasses(classOptions)}
          >
            Semua
          </button>
          <button
            className="flex p-2 bg-teal-600 rounded-xl text-xs text-white hover:bg-teal-700 justify-center"
            onClick={() => setSelectedClasses([])}
          >
            Reset
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex flex-col ml-12 mt-12 w-full">
        <h2 className="mb-6">{TITLE}</h2>

        {/* Top controls: Tahun -> Semester -> Kabupaten -> Sorting -> Top -> Landing -> Download */}
        <div className="flex flex-wrap gap-6">
          {/* Tahun */}
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

          {/* Kabupaten (single) */}
          <div>
            <label className="text-sm font-medium">Kabupaten</label>
            <div>
              <select
                className="rounded border px-2 py-1 text-sm min-w-[220px]"
                value={selectedKab}
                onChange={(e) =>
                  setSelectedKab(
                    e.target.value === "all" ? "all" : e.target.value
                  )
                }
              >
                <option value="all">Semua</option>
                {kabOptions.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
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
                onChange={(e) => setSortBy(e.target.value as SortBy)}
              >
                <option value="name">Nama</option>
                <option value="value">Nilai</option>
              </select>
              <select
                className="rounded border px-2 py-1 text-sm"
                value={order}
                onChange={(e) => setOrder(e.target.value as Order)}
              >
                <option value="asc">Naik</option>
                <option value="desc">Turun</option>
              </select>
            </div>
          </div>

          {/* Top N */}
          <div>
            <label className="text-sm font-medium">Top</label>
            <div>
              <select
                className="rounded border px-2 py-1 text-sm"
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
                  noDatasetSelected || items.length === 0
                    ? "opacity-50 cursor-not-allowed"
                    : "bg-teal-400 text-white hover:bg-teal-500"
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
        <div className="mt-4">
          <BarCharts
            chartTitle=""
            labels={labels}
            datasets={datasets}
            stacked={false}
            tooltipLabels={tooltipLabels} // uses full `name` in tooltip
          />
        </div>

        {/* Table */}
        <div className="mt-8 overflow-x-auto mb-12">
          <table className="min-w-full text-sm">
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
      </main>
    </div>
  );
}
