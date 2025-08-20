"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/supabaseClient";
import BarCharts from "./BarCharts";

type Row = {
  kab: string | null;
  year: number | string | null;
  jum_rtp?: number | string | null;
  jum_pembudidaya?: number | string | null;
  luas_lahan?: number | string | null;
  tot_produksi?: number | string | null; // Produksi
};

type DatasetConf = {
  label: string;
  values: number[];
  backgroundColor?: string;
};

const TITLE = "Gambaran Umum Perikanan Budidaya Provinsi Maluku Utara";

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
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const m = v.match(/\d{4}/);
    return m ? Number(m[0]) : null;
  }
  return null;
}

// fetch all with pagination
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

function aggregateByKab(
  rows: Row[],
  pick: (r: Row) => number | string | null | undefined,
  yearSelected: number | null,
  kabFilter?: Set<string>
) {
  const totals = new Map<string, number>();
  rows.forEach((r) => {
    const kab = r.kab?.trim();
    if (!kab) return;
    if (kabFilter && kabFilter.size > 0 && !kabFilter.has(kab)) return;

    const y = toYear(r.year);
    if (y == null) return;
    if (yearSelected != null && y !== yearSelected) return;

    const val = toNum(pick(r));
    if (!Number.isFinite(val)) return;

    totals.set(kab, (totals.get(kab) ?? 0) + val);
  });
  return totals;
}

export default function ChartBudidayaByKab() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [rowsBudidaya, setRowsBudidaya] = useState<Row[]>([]);

  // filters
  const [selectedKabs, setSelectedKabs] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<"all" | number>("all");
  const [sortBy, setSortBy] = useState<"value" | "kab">("value");
  const [order, setOrder] = useState<"desc" | "asc">("desc");

  // dataset toggles
  const [showRTP, setShowRTP] = useState(true);
  const [showPembudi, setShowPembudi] = useState(true);
  const [showLahan, setShowLahan] = useState(true);
  const [showProduksi, setShowProduksi] = useState(true);

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
        const data = await fetchAllRows<Row>(
          "budidaya",
          "kab, year, jum_rtp, jum_pembudidaya, luas_lahan, tot_produksi"
        );
        if (cancelled) return;
        setRowsBudidaya(data ?? []);
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

  // YEAR options
  const yearOptions = useMemo(() => {
    const set = new Set<number>();
    rowsBudidaya.forEach((r) => {
      const y = toYear(r.year);
      if (y != null) set.add(y);
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [rowsBudidaya]);

  // kab options
  const allKabOptions = useMemo(() => {
    const s = new Set<string>();
    rowsBudidaya.forEach((r) => {
      const k = r.kab?.trim();
      if (k) s.add(k);
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [rowsBudidaya]);

  // totals
  const totals = useMemo(() => {
    const ySel = selectedYear === "all" ? null : selectedYear;
    const kabSet = selectedKabs.length > 0 ? new Set(selectedKabs) : undefined;

    const tRTP = aggregateByKab(rowsBudidaya, (r) => r.jum_rtp, ySel, kabSet);
    const tPembudi = aggregateByKab(
      rowsBudidaya,
      (r) => r.jum_pembudidaya,
      ySel,
      kabSet
    );
    const tLahan = aggregateByKab(
      rowsBudidaya,
      (r) => r.luas_lahan,
      ySel,
      kabSet
    );
    const tProd = aggregateByKab(
      rowsBudidaya,
      (r) => r.tot_produksi,
      ySel,
      kabSet
    );
    return { tRTP, tPembudi, tLahan, tProd };
  }, [rowsBudidaya, selectedYear, selectedKabs]);

  // chart labels + datasets
  const { labels, datasets }: { labels: string[]; datasets: DatasetConf[] } =
    useMemo(() => {
      const unionKabs = new Set<string>();
      if (showRTP) totals.tRTP.forEach((_, k) => unionKabs.add(k));
      if (showPembudi) totals.tPembudi.forEach((_, k) => unionKabs.add(k));
      if (showLahan) totals.tLahan.forEach((_, k) => unionKabs.add(k));
      if (showProduksi) totals.tProd.forEach((_, k) => unionKabs.add(k));
      let labs = Array.from(unionKabs);

      const sumForKab = (k: string) =>
        (showRTP ? (totals.tRTP.get(k) ?? 0) : 0) +
        (showPembudi ? (totals.tPembudi.get(k) ?? 0) : 0) +
        (showLahan ? (totals.tLahan.get(k) ?? 0) : 0) +
        (showProduksi ? (totals.tProd.get(k) ?? 0) : 0);

      if (sortBy === "kab") {
        labs.sort((a, b) => a.localeCompare(b) * (order === "asc" ? 1 : -1));
      } else {
        labs.sort(
          (a, b) => (sumForKab(a) - sumForKab(b)) * (order === "asc" ? 1 : -1)
        );
      }

      const ds: DatasetConf[] = [];
      if (showRTP) {
        ds.push({
          label: "RTP",
          values: labs.map((k) => totals.tRTP.get(k) ?? 0),
          backgroundColor: "rgba(255, 159, 64, 0.7)", // orange
        });
      }
      if (showPembudi) {
        ds.push({
          label: "Pembudidaya",
          values: labs.map((k) => totals.tPembudi.get(k) ?? 0),
          backgroundColor: "rgba(75, 192, 192, 0.7)", // teal
        });
      }
      if (showLahan) {
        ds.push({
          label: "Luas Lahan",
          values: labs.map((k) => totals.tLahan.get(k) ?? 0),
          backgroundColor: "rgba(153, 102, 255, 0.7)", // purple
        });
      }
      if (showProduksi) {
        ds.push({
          label: "Produksi",
          values: labs.map((k) => totals.tProd.get(k) ?? 0),
          backgroundColor: "rgba(54, 162, 235, 0.7)", // blue
        });
      }

      return { labels: labs, datasets: ds };
    }, [totals, sortBy, order, showRTP, showPembudi, showLahan, showProduksi]);

  // table model (data source of truth for export)
  const tableRows = useMemo(() => {
    return labels.map((kab) => {
      const rtp = showRTP ? (totals.tRTP.get(kab) ?? 0) : 0;
      const pembudi = showPembudi ? (totals.tPembudi.get(kab) ?? 0) : 0;
      const lahan = showLahan ? (totals.tLahan.get(kab) ?? 0) : 0;
      const prod = showProduksi ? (totals.tProd.get(kab) ?? 0) : 0;
      return {
        kab,
        rtp,
        pembudi,
        lahan,
        prod,
        total: rtp + pembudi + lahan + prod,
      };
    });
  }, [labels, totals, showRTP, showPembudi, showLahan, showProduksi]);

  const grand = useMemo(
    () =>
      tableRows.reduce(
        (acc, r) => ({
          rtp: acc.rtp + r.rtp,
          pembudi: acc.pembudi + r.pembudi,
          lahan: acc.lahan + r.lahan,
          prod: acc.prod + r.prod,
          total: acc.total + r.total,
        }),
        { rtp: 0, pembudi: 0, lahan: 0, prod: 0, total: 0 }
      ),
    [tableRows]
  );

  // number formatter for display
  const nf = useMemo(
    () => new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }),
    []
  );

  // ===== CSV (data-based) =====
  const fileNameFromTitle = (title: string) =>
    title
      .trim()
      .replace(/[\/\\?%*:|"<>]/g, "")
      .replace(/\s+/g, "_") + ".csv";

  // quote only when needed; keep numbers unquoted
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

  const noDatasetSelected =
    !showRTP && !showPembudi && !showLahan && !showProduksi;

  const downloadCsv = () => {
    if (noDatasetSelected || tableRows.length === 0) return;

    // Build header to match visible columns (and table order)
    const header: (string | number)[] = ["Kabupaten"];
    if (showRTP) header.push("RTP");
    if (showPembudi) header.push("Pembudidaya");
    if (showLahan) header.push("Luas Lahan");
    if (showProduksi) header.push("Produksi");
    header.push("Total");

    // Build body from data model (raw numbers)
    const body: (string | number)[][] = tableRows.map((r) => {
      const row: (string | number)[] = [r.kab];
      if (showRTP) row.push(r.rtp);
      if (showPembudi) row.push(r.pembudi);
      if (showLahan) row.push(r.lahan);
      if (showProduksi) row.push(r.prod);
      row.push(r.total);
      return row;
    });

    // Grand total row
    const grandRow: (string | number)[] = ["Jumlah"];
    if (showRTP) grandRow.push(grand.rtp);
    if (showPembudi) grandRow.push(grand.pembudi);
    if (showLahan) grandRow.push(grand.lahan);
    if (showProduksi) grandRow.push(grand.prod);
    grandRow.push(grand.total);
    body.push(grandRow);

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
    <div className="flex w-full">
      {/* Sidebar: Kabupaten (multi) */}
      <div className="flex flex-col bg-teal-900 md:pt-10 pt-20 p-6 top-0 md:top-auto md:static fixed z-5 md:z-0 md:w-[18%] w-[45vw] md:h-auto h-[100vh] text-white">
        <div>
          <h3>Kabupaten</h3>
          {allKabOptions.map((kab) => {
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

          <div className="flex flex-col gap-2 mt-6">
            <button
              className="flex p-2 bg-teal-600 rounded-xl text-xs text-white hover:bg-teal-700 cursor-pointer justify-center items-center"
              onClick={() => setSelectedKabs(allKabOptions)}
            >
              Semua
            </button>
            <button
              className="flex p-2 bg-teal-600 rounded-xl text-xs text-white hover:bg-teal-700 cursor-pointer justify-center items-center"
              onClick={() => setSelectedKabs([])}
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="flex flex-col ml-12 mt-12 w-full">
        <h2 className="mb-6">{TITLE}</h2>

        <div className="flex flex-wrap gap-6 items-start">
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

          {/* Datasets (multi toggles) */}
          <div>
            <label className="text-sm font-medium">Datasets</label>
            <div className="flex flex-wrap gap-2">
              <button
                className={`px-3 py-1 rounded border text-sm ${showRTP ? "bg-orange-500 text-white border-orange-500" : "bg-white"}`}
                onClick={() => setShowRTP((v) => !v)}
              >
                RTP
              </button>
              <button
                className={`px-3 py-1 rounded border text-sm ${showPembudi ? "bg-teal-600 text-white border-teal-600" : "bg-white"}`}
                onClick={() => setShowPembudi((v) => !v)}
              >
                Pembudidaya
              </button>
              <button
                className={`px-3 py-1 rounded border text-sm ${showLahan ? "bg-purple-600 text-white border-purple-600" : "bg-white"}`}
                onClick={() => setShowLahan((v) => !v)}
              >
                Luas Lahan
              </button>
              <button
                className={`px-3 py-1 rounded border text-sm ${showProduksi ? "bg-sky-600 text-white border-sky-600" : "bg-white"}`}
                onClick={() => setShowProduksi((v) => !v)}
              >
                Produksi
              </button>
            </div>
            {noDatasetSelected && (
              <p className="text-xs text-red-600 mt-1">
                Pilih minimal satu dataset.
              </p>
            )}
          </div>

          {/* Sorting */}
          <div>
            <label className="text-sm font-medium">Urutkan</label>
            <div className="flex gap-3">
              <select
                className="rounded border px-2 py-1 text-sm"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "value" | "kab")}
              >
                <option value="value">Nilai</option>
                <option value="kab">Nama</option>
              </select>

              <select
                className="rounded border px-2 py-1 text-sm"
                value={order}
                onChange={(e) => setOrder(e.target.value as "asc" | "desc")}
              >
                <option value="desc">Atas</option>
                <option value="asc">Bawah</option>
              </select>
            </div>
          </div>

          {/* Download CSV (data-based) */}
          <div>
            <label className="text-sm font-medium">Download</label>
            <div>
              <button
                className={`px-3 py-1 rounded w-full border text-sm ${noDatasetSelected || tableRows.length === 0 ? "opacity-50 cursor-not-allowed" : "bg-teal-600 text-white hover:bg-teal-500"}`}
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
          {noDatasetSelected ? (
            <div className="text-sm text-gray-500 border rounded p-4">
              Tidak ada dataset yang dipilih.
            </div>
          ) : (
            <BarCharts
              chartTitle=""
              labels={labels}
              datasets={datasets}
              stacked={false}
            />
          )}
        </div>

        {/* Table */}
        <div className="mt-8 overflow-x-auto mb-12">
          <table className="min-w-full text-sm">
            <thead className="bg-teal-100">
              <tr>
                <th className="px-3 py-2 border border-gray-400">Kabupaten</th>
                {showRTP && (
                  <th className="px-3 py-2 border border-gray-400 text-right">
                    RTP
                  </th>
                )}
                {showPembudi && (
                  <th className="px-3 py-2 border border-gray-400 text-right">
                    Pembudidaya
                  </th>
                )}
                {showLahan && (
                  <th className="px-3 py-2 border border-gray-400 text-right">
                    Luas Lahan
                  </th>
                )}
                {showProduksi && (
                  <th className="px-3 py-2 border border-gray-400 text-right">
                    Produksi
                  </th>
                )}
                <th className="px-3 py-2 border border-gray-400 text-right">
                  Total
                </th>
              </tr>
            </thead>

            <tbody>
              {tableRows.length === 0 ? (
                <tr>
                  <td
                    className="px-3 py-3 text-gray-500"
                    colSpan={
                      2 +
                      Number(showRTP) +
                      Number(showPembudi) +
                      Number(showLahan) +
                      Number(showProduksi)
                    }
                  >
                    Tidak ada data untuk filter saat ini.
                  </td>
                </tr>
              ) : (
                tableRows.map((r) => (
                  <tr key={r.kab}>
                    <td className="px-3 py-2 border border-gray-400">
                      {r.kab}
                    </td>
                    {showRTP && (
                      <td className="px-3 py-2 border border-gray-400 text-right">
                        {nf.format(r.rtp)}
                      </td>
                    )}
                    {showPembudi && (
                      <td className="px-3 py-2 border border-gray-400 text-right">
                        {nf.format(r.pembudi)}
                      </td>
                    )}
                    {showLahan && (
                      <td className="px-3 py-2 border border-gray-400 text-right">
                        {nf.format(r.lahan)}
                      </td>
                    )}
                    {showProduksi && (
                      <td className="px-3 py-2 border border-gray-400 text-right">
                        {nf.format(r.prod)}
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
                  {showRTP && (
                    <td className="px-3 py-2 border border-gray-400 text-right font-semibold">
                      {nf.format(grand.rtp)}
                    </td>
                  )}
                  {showPembudi && (
                    <td className="px-3 py-2 border border-gray-400 text-right font-semibold">
                      {nf.format(grand.pembudi)}
                    </td>
                  )}
                  {showLahan && (
                    <td className="px-3 py-2 border border-gray-400 text-right font-semibold">
                      {nf.format(grand.lahan)}
                    </td>
                  )}
                  {showProduksi && (
                    <td className="px-3 py-2 border border-gray-400 text-right font-semibold">
                      {nf.format(grand.prod)}
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
