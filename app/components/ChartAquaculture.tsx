"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/supabaseClient";
import BarCharts from "./BarCharts";
import { DownChevron, LeftChevron, UpChevron } from "@/public/icons/iconSets";

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

interface Props {
  fromChild?: (sendData: string) => void;
  pages: string[];
}

const TITLE = "Gambaran Umum Perikanan Budidaya Provinsi Maluku Utara";

/* ================= Helpers ================= */
const toNum = (v: unknown) => {
  if (v == null) return NaN;
  if (typeof v === "number") return v;
  if (typeof v === "string") return Number(v.replace(/[^\d.-]/g, ""));
  return NaN;
};

const toYear = (v: unknown): number | null => {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const m = v.match(/\d{4}/);
    return m ? Number(m[0]) : null;
  }
  return null;
};

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

/** Sum selected metric per kab with optional year/kab filters */
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

/* ================= Component ================= */
export default function ChartBudidayaByKab({
  fromChild = () => {},
  pages,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [rowsBudidaya, setRowsBudidaya] = useState<Row[]>([]);

  // Filters
  const [selectedKabs, setSelectedKabs] = useState<string[]>([]); // multi (side menu)
  const [selectedYear, setSelectedYear] = useState<"all" | number>("all");
  const [sortBy, setSortBy] = useState<"value" | "kab">("value");
  const [order, setOrder] = useState<"desc" | "asc">("desc");

  // Dataset toggles
  const [showRTP, setShowRTP] = useState(true);
  const [showPembudi, setShowPembudi] = useState(true);
  const [showLahan, setShowLahan] = useState(true);
  const [showProduksi, setShowProduksi] = useState(true);

  // UI
  const [showDropDown, setShowDropDown] = useState(false);
  const [showSideMenu, setShowSideMenu] = useState(false); // retractable side menu (mobile)

  // Fetch ALL data
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

  /* ======= Options ======= */
  const yearOptions = useMemo(() => {
    const set = new Set<number>();
    rowsBudidaya.forEach((r) => {
      const y = toYear(r.year);
      if (y != null) set.add(y);
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [rowsBudidaya]);

  const allKabOptions = useMemo(() => {
    const s = new Set<string>();
    rowsBudidaya.forEach((r) => {
      const k = r.kab?.trim();
      if (k) s.add(k);
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [rowsBudidaya]);

  /* ======= Aggregations ======= */
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

  // Labels & datasets
  const { labels, datasets }: { labels: string[]; datasets: DatasetConf[] } =
    useMemo(() => {
      const unionKabs = new Set<string>();
      if (showRTP) totals.tRTP.forEach((_, k) => unionKabs.add(k));
      if (showPembudi) totals.tPembudi.forEach((_, k) => unionKabs.add(k));
      if (showLahan) totals.tLahan.forEach((_, k) => unionKabs.add(k));
      if (showProduksi) totals.tProd.forEach((_, k) => unionKabs.add(k));
      const labs = Array.from(unionKabs);

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

  /* ======= Table model ======= */
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
        }),
        { rtp: 0, pembudi: 0, lahan: 0, prod: 0 }
      ),
    [tableRows]
  );

  // Formatter
  const nf = useMemo(
    () => new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }),
    []
  );

  /* ======= CSV ======= */
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

  const noDatasetSelected =
    !showRTP && !showPembudi && !showLahan && !showProduksi;

  const downloadCsv = () => {
    if (noDatasetSelected || tableRows.length === 0) return;

    const header: (string | number)[] = ["Kabupaten"];
    if (showRTP) header.push("RTP");
    if (showPembudi) header.push("Pembudidaya");
    if (showLahan) header.push("Luas Lahan");
    if (showProduksi) header.push("Produksi");
    header.push("Total");

    const body: (string | number)[][] = tableRows.map((r) => {
      const row: (string | number)[] = [r.kab];
      if (showRTP) row.push(r.rtp);
      if (showPembudi) row.push(r.pembudi);
      if (showLahan) row.push(r.lahan);
      if (showProduksi) row.push(r.prod);
      row.push(r.total);
      return row;
    });

    const grandRow: (string | number)[] = ["Jumlah"];
    if (showRTP) grandRow.push(grand.rtp);
    if (showPembudi) grandRow.push(grand.pembudi);
    if (showLahan) grandRow.push(grand.lahan);
    if (showProduksi) grandRow.push(grand.prod);
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

  /* ======= UI States ======= */
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
          <h3 className="font-bold">Kabupaten</h3>

          {/* Kabupaten (multi) */}
          <div>
            {allKabOptions.map((kab) => {
              const checked = selectedKabs.includes(kab);
              return (
                <label key={kab} className="flex items-center gap-2 py-0.5">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      setSelectedKabs((prev) =>
                        e.target.checked
                          ? [...prev, kab]
                          : prev.filter((k) => k !== kab)
                      );
                    }}
                  />
                  <h6 className="text-sm">{kab}</h6>
                </label>
              );
            })}
          </div>

          <div className="flex flex-col gap-3">
            <button
              className="flex py-1 bg-teal-600 rounded-md text-xs text-white hover:bg-teal-700 cursor-pointer justify-center items-center"
              onClick={() => setSelectedKabs(allKabOptions)}
            >
              Semua
            </button>
            <button
              className="flex py-1 bg-teal-600 rounded-md text-xs text-white hover:bg-teal-700 cursor-pointer justify-center items-center"
              onClick={() => setSelectedKabs([])}
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

            {/* Datasets */}
            <div className="w-full">
              <label className="font-medium lg:text-sm md:text-[1.5vw] text-[2.8vw]">
                Datasets
              </label>
              <div className="flex flex-col gap-2">
                <button
                  className={`px-3 py-1 rounded border lg:text-sm md:text-[1.5vw] text-[2.8vw] ${
                    showRTP
                      ? "bg-orange-500 text-white border-orange-500"
                      : "border-white"
                  }`}
                  onClick={() => setShowRTP((v) => !v)}
                >
                  RTP
                </button>
                <button
                  className={`px-3 py-1 rounded border lg:text-sm md:text-[1.5vw] text-[2.8vw] ${
                    showPembudi
                      ? "bg-teal-600 text-white border-teal-600"
                      : "border-white"
                  }`}
                  onClick={() => setShowPembudi((v) => !v)}
                >
                  Pembudidaya
                </button>
                <button
                  className={`px-3 py-1 rounded border lg:text-sm md:text-[1.5vw] text-[2.8vw] ${
                    showLahan
                      ? "bg-purple-600 text-white border-purple-600"
                      : "border-white"
                  }`}
                  onClick={() => setShowLahan((v) => !v)}
                >
                  Luas Lahan
                </button>
                <button
                  className={`px-3 py-1 rounded border lg:text-sm md:text-[1.5vw] text-[2.8vw] ${
                    showProduksi
                      ? "bg-sky-600 text-white border-sky-600"
                      : "border-white"
                  }`}
                  onClick={() => setShowProduksi((v) => !v)}
                >
                  Produksi
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
                  onChange={(e) => setSortBy(e.target.value as "value" | "kab")}
                >
                  <option value="value" className="text-black">
                    Nilai
                  </option>
                  <option value="kab" className="text-black">
                    Nama
                  </option>
                </select>
                <select
                  className="rounded border px-2 py-1 lg:text-sm md:text-[1.5vw] text-[2.8vw] w-full"
                  value={order}
                  onChange={(e) => setOrder(e.target.value as "asc" | "desc")}
                >
                  <option value="desc" className="text-black">
                    Atas
                  </option>
                  <option value="asc" className="text-black">
                    Bawah
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
        className={`${
          showSideMenu ? "flex" : "hidden"
        } md:hidden fixed z-3 inset-0 bg-black/50 w-[100vw] h-[100vh]`}
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
              className={`${
                showDropDown ? "flex" : "hidden"
              } flex-col w-full py-1.5 border rounded-lg absolute z-10 top-17 bg-white cursor-pointer`}
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
                <option value="all">Semua</option>
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
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
            <div className="flex gap-2">
              <button
                className={`px-3 py-1 rounded border lg:text-sm md:text-[1.5vw] text-[2.8vw] ${
                  showRTP
                    ? "bg-orange-500 text-white border-orange-500"
                    : "bg-white"
                }`}
                onClick={() => setShowRTP((v) => !v)}
              >
                RTP
              </button>
              <button
                className={`px-3 py-1 rounded border lg:text-sm md:text-[1.5vw] text-[2.8vw] ${
                  showPembudi
                    ? "bg-teal-600 text-white border-teal-600"
                    : "bg-white"
                }`}
                onClick={() => setShowPembudi((v) => !v)}
              >
                Pembudidaya
              </button>
              <button
                className={`px-3 py-1 rounded border lg:text-sm md:text-[1.5vw] text-[2.8vw] ${
                  showLahan
                    ? "bg-purple-600 text-white border-purple-600"
                    : "bg-white"
                }`}
                onClick={() => setShowLahan((v) => !v)}
              >
                Luas Lahan
              </button>
              <button
                className={`px-3 py-1 rounded border lg:text-sm md:text-[1.5vw] text-[2.8vw] ${
                  showProduksi
                    ? "bg-sky-600 text-white border-sky-600"
                    : "bg-white"
                }`}
                onClick={() => setShowProduksi((v) => !v)}
              >
                Produksi
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
                onChange={(e) => setSortBy(e.target.value as "value" | "kab")}
              >
                <option value="value">Nilai</option>
                <option value="kab">Nama</option>
              </select>
              <select
                className="rounded border px-2 py-1 lg:text-sm md:text-[1.5vw] text-[2.8vw]"
                value={order}
                onChange={(e) => setOrder(e.target.value as "asc" | "desc")}
              >
                <option value="desc">Atas</option>
                <option value="asc">Bawah</option>
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

        {/* Chart */}
        <BarCharts
          chartTitle=""
          labels={labels}
          datasets={datasets}
          stacked={false}
          datalabel={false}
          yAxis={true}
          rotateXLabels={45}
        />

        {/* Table */}
        <div className="overflow-x-auto mb-12">
          <table className="min-w-full lg:text-sm md:text-[1.5vw] text-[2vw]">
            <thead className="bg-teal-100">
              <tr>
                <th className="px-3 py-2 border border-gray-400">Kabupaten</th>
                {showRTP && (
                  <th className="px-3 py-2 border border-gray-400">RTP</th>
                )}
                {showPembudi && (
                  <th className="px-3 py-2 border border-gray-400 wrap-anywhere">
                    Pembudidaya
                  </th>
                )}
                {showLahan && (
                  <th className="px-3 py-2 border border-gray-400">
                    Luas Lahan
                  </th>
                )}
                {showProduksi && (
                  <th className="px-3 py-2 border border-gray-400">Produksi</th>
                )}
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
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
