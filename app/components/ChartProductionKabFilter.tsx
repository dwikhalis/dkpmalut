"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/supabaseClient";
import BarCharts from "./BarCharts";
import DataPageDropdown from "./DataPageDropdown";

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
      totals.tb.forEach((_, kab) => set.add(kab));
    }

    if (showTangkap) {
      totals.tt.forEach((_, kab) => set.add(kab));
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

      if (Number.isFinite(y)) {
        set.add(y);
      }
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
        (acc, row) => ({
          bud: acc.bud + row.bud,
          tang: acc.tang + row.tang,
          total: acc.total + row.total,
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
      ...rows.map((row) => row.map(csvCell).join(",")),
    ];

    return lines.join("\r\n");
  };

  const downloadCsv = () => {
    if (tableRows.length === 0) return;

    const header: (string | number)[] = ["Kabupaten"];

    if (showBudidaya) header.push("Budidaya (ton)");
    if (showTangkap) header.push("Tangkap (ton)");

    header.push("Total (ton)");

    const body: (string | number)[][] = tableRows.map((row) => {
      const dataRow: (string | number)[] = [row.kab];

      if (showBudidaya) dataRow.push(row.bud);
      if (showTangkap) dataRow.push(row.tang);

      dataRow.push(row.total);

      return dataRow;
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
    <div className="flex w-full max-w-full min-w-0 flex-col overflow-hidden px-6 md:px-12">
      <DataPageDropdown pages={pages} />

      <h2 className="mb-3 md:mb-6">{TITLE}</h2>

      {/* Top Control */}
      <div className="mb-6 flex flex-wrap justify-between gap-x-3 gap-y-3 md:gap-y-2">
        {/* Tahun */}
        <div className="flex flex-col w-[45%] md:w-auto">
          <label className="mb-1 block font-medium text-[2.8vw] md:text-[1.5vw] lg:text-sm">
            Tahun
          </label>

          <select
            className="w-full rounded border bg-white px-2 py-1 text-[2.8vw] md:text-[1.5vw] lg:text-sm"
            value={selectedYear === "all" ? "all" : String(selectedYear)}
            onChange={(event) => {
              const value = event.target.value;
              setSelectedYear(value === "all" ? "all" : Number(value));
            }}
          >
            <option value="all">Semua</option>

            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        {/* Kabupaten */}
        <div className="flex flex-col w-[45%] md:w-auto">
          <label className="mb-1 block font-medium text-[2.8vw] md:text-[1.5vw] lg:text-sm">
            Kabupaten
          </label>

          <select
            className="w-full rounded border bg-white px-2 py-1 text-[2.8vw] md:text-[1.5vw] lg:text-sm"
            value={selectedKab}
            onChange={(event) => setSelectedKab(event.target.value)}
          >
            <option value="all">Semua Kabupaten</option>

            {allKabOptions.map((kab) => (
              <option key={kab} value={kab}>
                {kab}
              </option>
            ))}
          </select>
        </div>

        {/* Dataset */}
        <div className="flex flex-col w-[45%] md:w-auto">
          <label className="mb-1 block font-medium text-[2.8vw] md:text-[1.5vw] lg:text-sm">
            Dataset
          </label>

          <select
            className="w-full rounded border bg-white px-2 py-1 text-[2.8vw] md:text-[1.5vw] lg:text-sm"
            value={selectedDataset}
            onChange={(event) =>
              setSelectedDataset(event.target.value as DatasetFilter)
            }
          >
            <option value="all">Semua Dataset</option>
            <option value="budidaya">Budidaya</option>
            <option value="tangkap">Tangkap</option>
          </select>
        </div>

        {/* Tampilan */}
        <div className="flex flex-col w-[45%] md:w-auto">
          <label className="mb-1 block font-medium text-[2.8vw] md:text-[1.5vw] lg:text-sm">
            Tampilan
          </label>

          <select
            className="w-full rounded border bg-white px-2 py-1 text-[2.8vw] md:text-[1.5vw] lg:text-sm"
            value={displayMode}
            onChange={(event) =>
              setDisplayMode(event.target.value as DisplayMode)
            }
          >
            <option value="group">Grup</option>
            <option value="stacked">Tumpuk</option>
          </select>
        </div>

        {/* Urutkan */}
        <div className="flex flex-col w-[45%] md:w-auto">
          <label className="mb-1 block font-medium text-[2.8vw] md:text-[1.5vw] lg:text-sm">
            Urutkan
          </label>

          <select
            className="w-full rounded border bg-white px-2 py-1 text-[2.8vw] md:text-[1.5vw] lg:text-sm"
            value={sortColumn}
            onChange={(event) =>
              setSortColumn(event.target.value as SortColumn)
            }
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Download */}
        <div className="flex flex-col w-[45%] md:w-auto">
          <label className="mb-1 block font-medium text-[2.8vw] md:text-[1.5vw] lg:text-sm">
            Download
          </label>

          <button
            type="button"
            className={`w-full rounded border px-3 py-1 text-[2.8vw] md:text-[1.5vw] lg:text-sm ${
              tableRows.length === 0
                ? "cursor-not-allowed opacity-50"
                : "bg-sky-600 text-white hover:bg-sky-500"
            }`}
            onClick={downloadCsv}
            disabled={tableRows.length === 0}
          >
            CSV
          </button>
        </div>
      </div>

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

      <div className="mb-12 w-full max-w-full min-w-0 overflow-x-auto overscroll-x-contain">
        <table className="min-w-max table-auto text-[2vw] md:text-[1.5vw] lg:text-sm">
          <thead className="bg-sky-100">
            <tr>
              <th className="whitespace-nowrap border border-gray-400 px-3 py-2">
                Kabupaten
              </th>

              {showBudidaya && (
                <th className="whitespace-nowrap border border-gray-400 px-3 py-2">
                  Budidaya (ton)
                </th>
              )}

              {showTangkap && (
                <th className="whitespace-nowrap border border-gray-400 px-3 py-2">
                  Tangkap (ton)
                </th>
              )}

              <th className="whitespace-nowrap border border-gray-400 px-3 py-2">
                Total (ton)
              </th>
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
              tableRows.map((row) => (
                <tr key={row.kab}>
                  <td className="whitespace-nowrap border border-gray-400 px-3 py-2">
                    {row.kab}
                  </td>

                  {showBudidaya && (
                    <td className="whitespace-nowrap border border-gray-400 px-3 py-2 text-right">
                      {nf.format(row.bud)}
                    </td>
                  )}

                  {showTangkap && (
                    <td className="whitespace-nowrap border border-gray-400 px-3 py-2 text-right">
                      {nf.format(row.tang)}
                    </td>
                  )}

                  <td className="whitespace-nowrap border border-gray-400 px-3 py-2 text-right font-medium">
                    {nf.format(row.total)}
                  </td>
                </tr>
              ))
            )}
          </tbody>

          {tableRows.length > 0 && (
            <tfoot className="bg-sky-50">
              <tr>
                <td className="whitespace-nowrap border border-gray-400 px-3 py-2 font-semibold">
                  Jumlah
                </td>

                {showBudidaya && (
                  <td className="whitespace-nowrap border border-gray-400 px-3 py-2 text-right font-semibold">
                    {nf.format(grand.bud)}
                  </td>
                )}

                {showTangkap && (
                  <td className="whitespace-nowrap border border-gray-400 px-3 py-2 text-right font-semibold">
                    {nf.format(grand.tang)}
                  </td>
                )}

                <td className="whitespace-nowrap border border-gray-400 px-3 py-2 text-right font-semibold">
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
