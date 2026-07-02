"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/supabaseClient";
import BarCharts from "./BarCharts";
import { DownChevron, UpChevron } from "@/public/icons/iconSets";
import DataPageDropdown from "./DataPageDropdown";
import { useAuthStore } from "../Stores/authStores";
import AlertNotif from "./AlertNotif";

type Row = {
  kab: string | null;
  year: number | string | null;
  jum_rtp?: number | string | null;
  jum_pembudidaya?: number | string | null;
  luas_lahan?: number | string | null;
  tot_produksi?: number | string | null;
};

type DatasetConf = {
  label: string;
  values: number[];
  backgroundColor?: string;
};

type Pages = { title: string; slug: string }[];

interface Props {
  pages: Pages;
}

const TITLE = "Gambaran Umum Perikanan Budidaya Provinsi Maluku Utara";

const toNum = (v: unknown) => {
  if (v == null) return NaN;
  if (typeof v === "number") return v;
  if (typeof v === "string") return Number(v.replace(/[^\d.-]/g, ""));
  return NaN;
};

const toYear = (v: unknown): number | null => {
  if (v == null) return null;

  if (typeof v === "number") {
    return Number.isFinite(v) ? v : null;
  }

  if (typeof v === "string") {
    const m = v.match(/\d{4}/);
    return m ? Number(m[0]) : null;
  }

  return null;
};

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

function aggregateByKab(
  rows: Row[],
  pick: (r: Row) => number | string | null | undefined,
  yearSelected: number | null,
  kabSelected: string,
) {
  const totals = new Map<string, number>();

  rows.forEach((r) => {
    const kab = r.kab?.trim();

    if (!kab) return;
    if (kabSelected !== "all" && kab !== kabSelected) return;

    const y = toYear(r.year);

    if (y == null) return;
    if (yearSelected != null && y !== yearSelected) return;

    const val = toNum(pick(r));

    if (!Number.isFinite(val)) return;

    totals.set(kab, (totals.get(kab) ?? 0) + val);
  });

  return totals;
}

export default function ChartAquaculture({ pages }: Props) {
  const router = useRouter();
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const [alertType, setAlertType] = useState<null | "login-required">(null);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [rowsBudidaya, setRowsBudidaya] = useState<Row[]>([]);

  const [selectedKab, setSelectedKab] = useState("all");
  const [selectedYear, setSelectedYear] = useState<"all" | number>("all");
  const [sortBy, setSortBy] = useState<"value" | "kab">("value");

  const [showRTP, setShowRTP] = useState(true);
  const [showPembudi, setShowPembudi] = useState(true);
  const [showLahan, setShowLahan] = useState(true);
  const [showProduksi, setShowProduksi] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const getErrorMessage = (e: unknown) =>
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
        const data = await fetchAllRows<Row>(
          "budidaya",
          "kab, year, jum_rtp, jum_pembudidaya, luas_lahan, tot_produksi",
        );

        if (cancelled) return;

        setRowsBudidaya(data ?? []);
        setErr(null);
      } catch (e) {
        setErr(getErrorMessage(e) || "Failed to load data");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const yearOptions = useMemo(() => {
    const set = new Set<number>();

    rowsBudidaya.forEach((r) => {
      const y = toYear(r.year);

      if (y != null) {
        set.add(y);
      }
    });

    return Array.from(set).sort((a, b) => b - a);
  }, [rowsBudidaya]);

  const allKabOptions = useMemo(() => {
    const set = new Set<string>();

    rowsBudidaya.forEach((r) => {
      const kab = r.kab?.trim();

      if (kab) {
        set.add(kab);
      }
    });

    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rowsBudidaya]);

  const totals = useMemo(() => {
    const ySel = selectedYear === "all" ? null : selectedYear;

    const tRTP = aggregateByKab(
      rowsBudidaya,
      (r) => r.jum_rtp,
      ySel,
      selectedKab,
    );

    const tPembudi = aggregateByKab(
      rowsBudidaya,
      (r) => r.jum_pembudidaya,
      ySel,
      selectedKab,
    );

    const tLahan = aggregateByKab(
      rowsBudidaya,
      (r) => r.luas_lahan,
      ySel,
      selectedKab,
    );

    const tProd = aggregateByKab(
      rowsBudidaya,
      (r) => r.tot_produksi,
      ySel,
      selectedKab,
    );

    return { tRTP, tPembudi, tLahan, tProd };
  }, [rowsBudidaya, selectedYear, selectedKab]);

  const { labels, datasets }: { labels: string[]; datasets: DatasetConf[] } =
    useMemo(() => {
      const unionKabs = new Set<string>();

      if (showRTP) totals.tRTP.forEach((_, kab) => unionKabs.add(kab));
      if (showPembudi) totals.tPembudi.forEach((_, kab) => unionKabs.add(kab));
      if (showLahan) totals.tLahan.forEach((_, kab) => unionKabs.add(kab));
      if (showProduksi) totals.tProd.forEach((_, kab) => unionKabs.add(kab));

      const labs = Array.from(unionKabs);

      const sumForKab = (kab: string) =>
        (showRTP ? (totals.tRTP.get(kab) ?? 0) : 0) +
        (showPembudi ? (totals.tPembudi.get(kab) ?? 0) : 0) +
        (showLahan ? (totals.tLahan.get(kab) ?? 0) : 0) +
        (showProduksi ? (totals.tProd.get(kab) ?? 0) : 0);

      if (sortBy === "kab") {
        labs.sort((a, b) => a.localeCompare(b));
      } else {
        labs.sort((a, b) => sumForKab(b) - sumForKab(a));
      }

      const ds: DatasetConf[] = [];

      if (showRTP) {
        ds.push({
          label: "RTP",
          values: labs.map((kab) => totals.tRTP.get(kab) ?? 0),
          backgroundColor: "rgba(255, 159, 64, 0.7)",
        });
      }

      if (showPembudi) {
        ds.push({
          label: "Pembudidaya",
          values: labs.map((kab) => totals.tPembudi.get(kab) ?? 0),
          backgroundColor: "rgba(75, 192, 192, 0.7)",
        });
      }

      if (showLahan) {
        ds.push({
          label: "Luas Lahan",
          values: labs.map((kab) => totals.tLahan.get(kab) ?? 0),
          backgroundColor: "rgba(153, 102, 255, 0.7)",
        });
      }

      if (showProduksi) {
        ds.push({
          label: "Produksi",
          values: labs.map((kab) => totals.tProd.get(kab) ?? 0),
          backgroundColor: "rgba(54, 162, 235, 0.7)",
        });
      }

      return { labels: labs, datasets: ds };
    }, [totals, sortBy, showRTP, showPembudi, showLahan, showProduksi]);

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
        (acc, row) => ({
          rtp: acc.rtp + row.rtp,
          pembudi: acc.pembudi + row.pembudi,
          lahan: acc.lahan + row.lahan,
          prod: acc.prod + row.prod,
        }),
        { rtp: 0, pembudi: 0, lahan: 0, prod: 0 },
      ),
    [tableRows],
  );

  const nf = useMemo(
    () => new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }),
    [],
  );

  const noDatasetSelected =
    !showRTP && !showPembudi && !showLahan && !showProduksi;

  const selectedDatasetCount =
    Number(showRTP) +
    Number(showPembudi) +
    Number(showLahan) +
    Number(showProduksi);

  const datasetDropdownLabel =
    selectedDatasetCount === 0
      ? "Pilih Dataset"
      : selectedDatasetCount === 4
        ? "Semua Dataset"
        : `${selectedDatasetCount} Dataset`;

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
    if (noDatasetSelected || tableRows.length === 0) return;

    const header: (string | number)[] = ["Kabupaten"];

    if (showRTP) header.push("RTP");
    if (showPembudi) header.push("Pembudidaya");
    if (showLahan) header.push("Luas Lahan");
    if (showProduksi) header.push("Produksi");

    header.push("Total");

    const body: (string | number)[][] = tableRows.map((row) => {
      const dataRow: (string | number)[] = [row.kab];

      if (showRTP) dataRow.push(row.rtp);
      if (showPembudi) dataRow.push(row.pembudi);
      if (showLahan) dataRow.push(row.lahan);
      if (showProduksi) dataRow.push(row.prod);

      dataRow.push(row.total);

      return dataRow;
    });

    const grandRow: (string | number)[] = ["Jumlah"];

    if (showRTP) grandRow.push(grand.rtp);
    if (showPembudi) grandRow.push(grand.pembudi);
    if (showLahan) grandRow.push(grand.lahan);
    if (showProduksi) grandRow.push(grand.prod);

    grandRow.push(grand.rtp + grand.pembudi + grand.lahan + grand.prod);

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

  const handleCsvClick = () => {
    if (noDatasetSelected || tableRows.length === 0) return;

    if (!isLoggedIn) {
      setAlertType("login-required");
      return;
    }

    downloadCsv();
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

      <h2 className="md:mb-6 mb-3">{TITLE}</h2>

      <div className="flex gap-x-3 gap-y-2 flex-wrap mb-6">
        <div className="w-full sm:w-auto">
          <label className="mb-1 block font-medium lg:text-sm md:text-[1.5vw] text-[2.8vw]">
            Tahun
          </label>

          <select
            className="w-full rounded border border-gray-400 px-3 py-1 lg:text-sm md:text-[1.5vw] text-[2.8vw]"
            value={selectedYear === "all" ? "all" : String(selectedYear)}
            onChange={(e) => {
              const value = e.target.value;
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

        <div className="w-full sm:w-auto">
          <label className="mb-1 block font-medium lg:text-sm md:text-[1.5vw] text-[2.8vw]">
            Kabupaten
          </label>

          <select
            className="w-full rounded border border-gray-400 px-3 py-1 lg:text-sm md:text-[1.5vw] text-[2.8vw]"
            value={selectedKab}
            onChange={(e) => setSelectedKab(e.target.value)}
          >
            <option value="all">Semua</option>

            {allKabOptions.map((kab) => (
              <option key={kab} value={kab}>
                {kab}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full sm:w-auto">
          <label className="mb-1 block font-medium lg:text-sm md:text-[1.5vw] text-[2.8vw]">
            Urutkan
          </label>

          <select
            className="w-full rounded border border-gray-400 px-3 py-1 lg:text-sm md:text-[1.5vw] text-[2.8vw]"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "value" | "kab")}
          >
            <option value="value">Nilai</option>
            <option value="kab">Nama Kabupaten</option>
          </select>
        </div>

        <details className="group relative w-full sm:w-auto">
          <summary className="list-none">
            <label className="mb-1 block font-medium lg:text-sm md:text-[1.5vw] text-[2.8vw]">
              Datasets
            </label>

            <div className="flex min-w-[180px] cursor-pointer items-center justify-between gap-3 rounded border border-gray-400 bg-white px-3 py-1 text-[2.8vw] md:text-[1.5vw] lg:text-sm">
              <span>{datasetDropdownLabel}</span>
              <DownChevron className="h-4 w-4 group-open:hidden" />
              <UpChevron className="hidden h-4 w-4 group-open:flex" />
            </div>
          </summary>

          <div className="absolute left-0 z-30 mt-2 w-full min-w-[240px] rounded-lg border border-gray-300 bg-white shadow-lg">
            <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
              <button
                type="button"
                onClick={() => {
                  setShowRTP(true);
                  setShowPembudi(true);
                  setShowLahan(true);
                  setShowProduksi(true);
                }}
                className="text-xs text-sky-700 hover:underline"
              >
                Pilih Semua
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowRTP(false);
                  setShowPembudi(false);
                  setShowLahan(false);
                  setShowProduksi(false);
                }}
                className="text-xs text-sky-700 hover:underline"
              >
                Reset
              </button>
            </div>

            <div className="p-2">
              <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-gray-100">
                <input
                  type="checkbox"
                  checked={showRTP}
                  onChange={() => setShowRTP((v) => !v)}
                />
                <span>RTP</span>
              </label>

              <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-gray-100">
                <input
                  type="checkbox"
                  checked={showPembudi}
                  onChange={() => setShowPembudi((v) => !v)}
                />
                <span>Pembudidaya</span>
              </label>

              <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-gray-100">
                <input
                  type="checkbox"
                  checked={showLahan}
                  onChange={() => setShowLahan((v) => !v)}
                />
                <span>Luas Lahan</span>
              </label>

              <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-gray-100">
                <input
                  type="checkbox"
                  checked={showProduksi}
                  onChange={() => setShowProduksi((v) => !v)}
                />
                <span>Produksi</span>
              </label>
            </div>
          </div>
        </details>

        <div className="w-full sm:w-auto">
          <label className="mb-1 block font-medium lg:text-sm md:text-[1.5vw] text-[2.8vw]">
            Download
          </label>

          <button
            className={`w-full rounded border px-3 py-1 lg:text-sm md:text-[1.5vw] text-[2.8vw] ${
              noDatasetSelected || tableRows.length === 0
                ? "opacity-50 cursor-not-allowed"
                : "bg-sky-600 text-white hover:bg-sky-500"
            }`}
            onClick={handleCsvClick}
            disabled={noDatasetSelected || tableRows.length === 0}
          >
            CSV
          </button>
        </div>
      </div>

      <BarCharts
        chartTitle=""
        labels={labels}
        datasets={datasets}
        stacked={false}
        datalabel={false}
        yAxis={true}
        rotateXLabels={45}
      />

      <div className="mb-12 w-full max-w-full min-w-0 overflow-x-auto overscroll-x-contain">
        <table className="min-w-max table-auto lg:text-sm md:text-[1.5vw] text-[2vw]">
          <thead className="bg-sky-100">
            <tr>
              <th className="whitespace-nowrap px-3 py-2 border border-gray-400">
                Kabupaten
              </th>

              {showRTP && (
                <th className="whitespace-nowrap px-3 py-2 border border-gray-400">
                  RTP
                </th>
              )}

              {showPembudi && (
                <th className="whitespace-nowrap px-3 py-2 border border-gray-400">
                  Pembudidaya (org)
                </th>
              )}

              {showLahan && (
                <th className="whitespace-nowrap px-3 py-2 border border-gray-400">
                  Luas Lahan (ha)
                </th>
              )}

              {showProduksi && (
                <th className="whitespace-nowrap px-3 py-2 border border-gray-400">
                  Produksi (ton)
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {tableRows.length === 0 ? (
              <tr>
                <td
                  className="px-3 py-3 text-gray-500"
                  colSpan={
                    1 +
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
              tableRows.map((row) => (
                <tr key={row.kab}>
                  <td className="whitespace-nowrap px-3 py-2 border border-gray-400">
                    {row.kab}
                  </td>

                  {showRTP && (
                    <td className="whitespace-nowrap px-3 py-2 border border-gray-400 text-right">
                      {nf.format(row.rtp)}
                    </td>
                  )}

                  {showPembudi && (
                    <td className="whitespace-nowrap px-3 py-2 border border-gray-400 text-right">
                      {nf.format(row.pembudi)}
                    </td>
                  )}

                  {showLahan && (
                    <td className="whitespace-nowrap px-3 py-2 border border-gray-400 text-right">
                      {nf.format(row.lahan)}
                    </td>
                  )}

                  {showProduksi && (
                    <td className="whitespace-nowrap px-3 py-2 border border-gray-400 text-right">
                      {nf.format(row.prod / 1000)}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>

          {tableRows.length > 0 && (
            <tfoot className="bg-sky-50">
              <tr>
                <td className="whitespace-nowrap px-3 py-2 border border-gray-400 font-semibold">
                  Jumlah
                </td>

                {showRTP && (
                  <td className="whitespace-nowrap px-3 py-2 border border-gray-400 text-right font-semibold">
                    {nf.format(grand.rtp)}
                  </td>
                )}

                {showPembudi && (
                  <td className="whitespace-nowrap px-3 py-2 border border-gray-400 text-right font-semibold">
                    {nf.format(grand.pembudi)}
                  </td>
                )}

                {showLahan && (
                  <td className="whitespace-nowrap px-3 py-2 border border-gray-400 text-right font-semibold">
                    {nf.format(grand.lahan)}
                  </td>
                )}

                {showProduksi && (
                  <td className="whitespace-nowrap px-3 py-2 border border-gray-400 text-right font-semibold">
                    {nf.format(grand.prod / 1000)}
                  </td>
                )}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {alertType === "login-required" && (
        <AlertNotif
          type="single"
          msg="Log In terlebih dahulu untuk download data"
          yesText="Log In"
          icon="warning"
          confirm={() => {
            setAlertType(null);
            router.push("/masuk/");
          }}
        />
      )}
    </div>
  );
}
