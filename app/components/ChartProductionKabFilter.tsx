"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/supabaseClient";
import BarCharts from "./BarCharts";
import { DownChevron, LeftChevron, UpChevron } from "@/public/icons/iconSets";
import Link from "next/link";

type Row = {
  kab: string | null;
  year: number | string | null;
  tot_produksi?: number | string | null; // budidaya
  weight?: number | string | null; // tangkap
};

type DatasetConf = {
  label: string;
  values: number[];
  backgroundColor?: string;
};

type Pages = { title: string; slug: string }[];

type DatasetFilter = "all" | "budidaya" | "tangkap";
type DisplayMode = "group" | "stacked";
type SortColumn = "kab" | "bud" | "tang" | "total";

interface Props {
  pages: Pages;
}

const TITLE = "Produksi Perikanan Tangkap dan Budidaya per Kabupaten";

function toNum(v: unknown) {
  if (v == null) return NaN;
  if (typeof v === "number") return v;

  if (typeof v === "string") {
    const cleaned = v.replace(/[^\d.-]/g, "");
    return Number(cleaned);
  }

  return NaN;
}

async function fetchAllRows<T>(
  table: string,
  columns: string,
  pageSize = 1000,
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

function aggregate(
  rows: Row[],
  pick: (r: Row) => number | string | null | undefined,
) {
  const totals = new Map<string, number>();

  rows.forEach((r) => {
    const kab = r.kab?.trim();
    if (!kab) return;

    const val = toNum(pick(r));
    if (!Number.isFinite(val)) return;

    totals.set(kab, (totals.get(kab) ?? 0) + val);
  });

  return totals;
}

export default function ChartProductionKabFilter({ pages }: Props) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [rowsBudidaya, setRowsBudidaya] = useState<Row[]>([]);
  const [rowsTangkap, setRowsTangkap] = useState<Row[]>([]);

  const [selectedKab, setSelectedKab] = useState<string>("all");
  const [selectedDataset, setSelectedDataset] = useState<DatasetFilter>("all");
  const [displayMode, setDisplayMode] = useState<DisplayMode>("group");
  const [selectedYear, setSelectedYear] = useState<"all" | number>("all");
  const [sortColumn, setSortColumn] = useState<SortColumn>("total");
  const [showDropDown, setShowDropDown] = useState(false);

  const showBudidaya =
    selectedDataset === "all" || selectedDataset === "budidaya";

  const showTangkap =
    selectedDataset === "all" || selectedDataset === "tangkap";

  const stacked = displayMode === "stacked";

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
        const [budi, tang] = await Promise.all([
          fetchAllRows<Row>("budidaya", "kab, tot_produksi, year"),
          fetchAllRows<Row>("tangkap", "kab, weight, year"),
        ]);

        if (cancelled) return;

        setRowsBudidaya(budi);
        setRowsTangkap(tang);
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

  const filteredBudidaya = useMemo(
    () =>
      selectedYear === "all"
        ? rowsBudidaya
        : rowsBudidaya.filter((r) => Number(r.year) === selectedYear),
    [rowsBudidaya, selectedYear],
  );

  const filteredTangkap = useMemo(
    () =>
      selectedYear === "all"
        ? rowsTangkap
        : rowsTangkap.filter((r) => Number(r.year) === selectedYear),
    [rowsTangkap, selectedYear],
  );

  const totals = useMemo(() => {
    const tb = aggregate(filteredBudidaya, (r) => r.tot_produksi);
    const tt = aggregate(filteredTangkap, (r) => r.weight);

    return { tb, tt };
  }, [filteredBudidaya, filteredTangkap]);

  const allKabOptions = useMemo(() => {
    const set = new Set<string>();

    if (showBudidaya) {
      totals.tb.forEach((_, k) => set.add(k));
    }

    if (showTangkap) {
      totals.tt.forEach((_, k) => set.add(k));
    }

    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [totals, showBudidaya, showTangkap]);

  useEffect(() => {
    if (selectedKab !== "all" && !allKabOptions.includes(selectedKab)) {
      setSelectedKab("all");
    }
  }, [selectedKab, allKabOptions]);

  useEffect(() => {
    if (sortColumn === "bud" && !showBudidaya) {
      setSortColumn("total");
    }

    if (sortColumn === "tang" && !showTangkap) {
      setSortColumn("total");
    }
  }, [sortColumn, showBudidaya, showTangkap]);

  const yearOptions = useMemo(() => {
    const set = new Set<number>();

    [...rowsBudidaya, ...rowsTangkap].forEach((r) => {
      const y = r.year != null ? Number(r.year) : NaN;
      if (Number.isFinite(y)) set.add(y);
    });

    return Array.from(set).sort((a, b) => b - a);
  }, [rowsBudidaya, rowsTangkap]);

  const selectedLabels = useMemo(() => {
    if (selectedKab === "all") return allKabOptions;

    return allKabOptions.includes(selectedKab) ? [selectedKab] : [];
  }, [selectedKab, allKabOptions]);

  const tableRows = useMemo(() => {
    const rows = selectedLabels.map((kab) => {
      const bud = totals.tb.get(kab) ?? 0;
      const tang = totals.tt.get(kab) ?? 0;

      return {
        kab,
        bud: showBudidaya ? bud : 0,
        tang: showTangkap ? tang : 0,
        total: (showBudidaya ? bud : 0) + (showTangkap ? tang : 0),
      };
    });

    rows.sort((a, b) => {
      if (sortColumn === "kab") {
        return a.kab.localeCompare(b.kab);
      }

      return b[sortColumn] - a[sortColumn];
    });

    return rows;
  }, [selectedLabels, totals, showBudidaya, showTangkap, sortColumn]);

  const labels = useMemo(() => tableRows.map((r) => r.kab), [tableRows]);

  const datasets: DatasetConf[] = useMemo(() => {
    const ds: DatasetConf[] = [];

    if (showBudidaya) {
      ds.push({
        label: "Budidaya",
        values: tableRows.map((r) => r.bud),
        backgroundColor: "rgba(144, 238, 144, 0.7)",
      });
    }

    if (showTangkap) {
      ds.push({
        label: "Tangkap",
        values: tableRows.map((r) => r.tang),
        backgroundColor: "rgba(53, 162, 235, 0.6)",
      });
    }

    return ds;
  }, [tableRows, showBudidaya, showTangkap]);

  const sortOptions = useMemo(() => {
    const options: { value: SortColumn; label: string }[] = [
      { value: "kab", label: "Kabupaten" },
    ];

    if (showBudidaya) {
      options.push({ value: "bud", label: "Budidaya" });
    }

    if (showTangkap) {
      options.push({ value: "tang", label: "Tangkap" });
    }

    options.push({ value: "total", label: "Total" });

    return options;
  }, [showBudidaya, showTangkap]);

  const grand = useMemo(
    () =>
      tableRows.reduce(
        (acc, r) => ({
          bud: acc.bud + r.bud,
          tang: acc.tang + r.tang,
          total: acc.total + r.total,
        }),
        { bud: 0, tang: 0, total: 0 },
      ),
    [tableRows],
  );

  const nf = useMemo(
    () => new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }),
    [],
  );

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
    if (tableRows.length === 0) return;

    const header: (string | number)[] = ["Kabupaten"];

    if (showBudidaya) header.push("Budidaya (ton)");
    if (showTangkap) header.push("Tangkap (ton)");

    header.push("Total (ton)");

    const body: (string | number)[][] = tableRows.map((r) => {
      const row: (string | number)[] = [r.kab];

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
    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;",
    });

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
      <div className="w-full h-[70vh] flex items-center justify-center">
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
    <div className="flex flex-col lg:mx-12 mx-8 w-full">
      {/* //! HEAD DROPDOWN */}
      <div className="flex w-full">
        <Link
          href={"/data"}
          className="flex justify-center items-center md:pr-6 pr-3 md:py-3 py-0 cursor-pointer"
        >
          <LeftChevron className="lg:w-7 lg:h-7 w-5 h-5" />
        </Link>

        <div className="relative flex flex-col justify-center items-center md:my-3 my-0 w-full">
          <div
            onClick={() => setShowDropDown(!showDropDown)}
            className="flex items-center justify-between w-full lg:h-10 h-8 mx-12 px-3 my-3 rounded-lg mt-6 mb-6 border border-stone-100 cursor-pointer shadow-md"
          >
            <p className="lg:text-sm md:text-[1.5vw] text-[2.8vw]">
              Lihat Data Lainnya
            </p>

            <DownChevron
              className={`${
                showDropDown ? "hidden" : "flex"
              } lg:w-7 lg:h-7 w-4 h-4`}
            />

            <UpChevron
              width={20}
              height={20}
              className={showDropDown ? "flex" : "hidden"}
            />
          </div>

          {/* //! DROPDOWN */}
          <div
            className={`${
              showDropDown ? "flex" : "hidden"
            } flex-col w-full py-1.5 border rounded-lg absolute z-10 top-17 bg-white cursor-pointer`}
          >
            {pages.map((e, idx) => {
              if (e.title === "Home") return null;

              return (
                <Link
                  href={`/data/${e.slug}`}
                  key={idx}
                  onClick={() => {
                    setShowDropDown(false);
                  }}
                  className="px-3 py-1.5 hover:bg-stone-100 lg:text-sm md:text-[1.5vw] text-[2.8vw]"
                >
                  <h5>{e.title}</h5>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* //! MAIN TITLE */}
      <h2 className="md:mb-6 mb-3">{TITLE}</h2>

      {/* //! TOP CONTROL */}
      <div className="flex gap-x-3 md:gap-y-2 gap-y-3 flex-wrap mb-6">
        {/* Tahun */}
        <div>
          <label className="font-medium lg:text-sm md:text-[1.5vw] text-[2.8vw]">
            Tahun
          </label>

          <div>
            <select
              className="rounded border px-2 py-1 lg:text-sm md:text-[1.5vw] text-[2.8vw] bg-white"
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

        {/* Kabupaten */}
        <div>
          <label className="font-medium lg:text-sm md:text-[1.5vw] text-[2.8vw]">
            Kabupaten
          </label>

          <div>
            <select
              className="rounded border px-2 py-1 lg:text-sm md:text-[1.5vw] text-[2.8vw] bg-white"
              value={selectedKab}
              onChange={(e) => setSelectedKab(e.target.value)}
            >
              <option value="all">Semua Kabupaten</option>

              {allKabOptions.map((kab) => (
                <option key={kab} value={kab}>
                  {kab}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Dataset */}
        <div>
          <label className="font-medium lg:text-sm md:text-[1.5vw] text-[2.8vw]">
            Dataset
          </label>

          <div>
            <select
              className="rounded border px-2 py-1 lg:text-sm md:text-[1.5vw] text-[2.8vw] bg-white"
              value={selectedDataset}
              onChange={(e) =>
                setSelectedDataset(e.target.value as DatasetFilter)
              }
            >
              <option value="all">Semua Dataset</option>
              <option value="budidaya">Budidaya</option>
              <option value="tangkap">Tangkap</option>
            </select>
          </div>
        </div>

        {/* Tampilan */}
        <div>
          <label className="font-medium lg:text-sm md:text-[1.5vw] text-[2.8vw]">
            Tampilan
          </label>

          <div>
            <select
              className="rounded border px-2 py-1 lg:text-sm md:text-[1.5vw] text-[2.8vw] bg-white"
              value={displayMode}
              onChange={(e) => setDisplayMode(e.target.value as DisplayMode)}
            >
              <option value="group">Grup</option>
              <option value="stacked">Tumpuk</option>
            </select>
          </div>
        </div>

        {/* Urutkan */}
        <div>
          <label className="font-medium lg:text-sm md:text-[1.5vw] text-[2.8vw]">
            Urutkan
          </label>

          <div>
            <select
              className="rounded border px-2 py-1 lg:text-sm md:text-[1.5vw] text-[2.8vw] bg-white"
              value={sortColumn}
              onChange={(e) => setSortColumn(e.target.value as SortColumn)}
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
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
              type="button"
              className={`px-3 py-1 rounded w-full border lg:text-sm md:text-[1.5vw] text-[2.8vw] ${
                tableRows.length === 0
                  ? "opacity-50 cursor-not-allowed"
                  : "bg-sky-600 text-white hover:bg-sky-500"
              }`}
              onClick={downloadCsv}
              disabled={tableRows.length === 0}
            >
              CSV
            </button>
          </div>
        </div>
      </div>

      {/* //! CHART */}
      <BarCharts
        chartTitle=""
        labels={labels}
        datasets={datasets}
        stacked={stacked}
        datalabel={false}
        yAxis={true}
        rotateXLabels={45}
        unit="ton"
      />

      {/* Table */}
      <div className="overflow-x-auto mb-12">
        <table className="min-w-full lg:text-sm md:text-[1.5vw] text-[2vw]">
          <thead className="bg-sky-100">
            <tr>
              <th className="px-3 py-2 border border-gray-400">Kabupaten</th>

              {showBudidaya && (
                <th className="px-3 py-2 border border-gray-400">
                  Budidaya (ton)
                </th>
              )}

              {showTangkap && (
                <th className="px-3 py-2 border border-gray-400">
                  Tangkap (ton)
                </th>
              )}

              <th className="px-3 py-2 border border-gray-400">Total (ton)</th>
            </tr>
          </thead>

          <tbody>
            {tableRows.length === 0 ? (
              <tr>
                <td
                  className="px-3 py-3 text-gray-500"
                  colSpan={2 + Number(showBudidaya) + Number(showTangkap)}
                >
                  Tidak ada data untuk filter saat ini.
                </td>
              </tr>
            ) : (
              tableRows.map((r) => (
                <tr key={r.kab}>
                  <td className="px-3 py-2 border border-gray-400">{r.kab}</td>

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
            <tfoot className="bg-sky-50">
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
  );
}
