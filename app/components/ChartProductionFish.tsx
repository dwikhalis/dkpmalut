"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/supabaseClient";
import BarCharts from "./BarCharts";
import DataPageDropdown from "./DataPageDropdown";
import AlertNotif from "./AlertNotif";
import { useAuthStore } from "../Stores/authStores";

type Row = {
  kab: string | null;
  year: number | string | null;
  semester?: number | string | null;
  class: string | null;
  common: string | null;
  name?: string | null;
  landing?: string | null;
  weight?: number | string | null;
};

type DatasetConf = {
  label: string;
  values: number[];
  backgroundColor?: string;
};

type Pages = { title: string; slug: string }[];

type SortBy = "name" | "class" | "value";
type TopN = "all" | 5 | 10;

interface Props {
  pages: Pages;
}

const TITLE = "Produksi Perikanan Tangkap per Jenis Komoditas";

/* ================= Helpers ================= */

function toNum(v: unknown) {
  if (v == null) return NaN;

  if (typeof v === "number") {
    return v;
  }

  if (typeof v === "string") {
    return Number(v.replace(/[^\d.-]/g, ""));
  }

  return NaN;
}

function trimOrEmpty(value: string | null | undefined) {
  return (value ?? "").trim();
}

function keyOf(value: string) {
  return value.normalize("NFKC").trim().toLowerCase();
}

function yearOf(value: unknown): number | null {
  if (value == null) return null;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const match = value.match(/\d{4}/);
    return match ? Number(match[0]) : null;
  }

  return null;
}

function semesterOf(value: unknown): 1 | 2 | null {
  if (value == null) return null;

  if (typeof value === "number") {
    const num = Math.trunc(value);
    return num === 1 || num === 2 ? (num as 1 | 2) : null;
  }

  if (typeof value === "string") {
    const text = value.trim().toLowerCase();

    const match = text.match(/[12]/);
    if (match) {
      const num = Number(match[0]);
      return num === 1 || num === 2 ? (num as 1 | 2) : null;
    }

    if (/\bii\b/.test(text)) return 2;
    if (/\bi\b/.test(text)) return 1;
  }

  return null;
}

function shortNameForChart(fullNameRaw: string | null | undefined) {
  const full = trimOrEmpty(fullNameRaw);
  if (!full) return "";

  const noParen = full.split("(")[0];
  const firstAlias = noParen.split(";")[0];
  const firstSlash = firstAlias.split("/")[0];

  return firstSlash.trim();
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

function fileNameFromTitle(title: string) {
  return (
    title
      .trim()
      .replace(/[\/\\?%*:|"<>]/g, "")
      .replace(/\s+/g, "_") + ".csv"
  );
}

function csvCell(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  const text = String(value ?? "");

  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(header: (string | number)[], rows: (string | number)[][]) {
  const lines = [
    header.map(csvCell).join(","),
    ...rows.map((row) => row.map(csvCell).join(",")),
  ];

  return lines.join("\r\n");
}

/* ================= Component ================= */

export default function ChartProductionFish({ pages }: Props) {
  const router = useRouter();
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);

  const [alertType, setAlertType] = useState<null | "login-required">(null);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);

  // Filters
  const [selectedYear, setSelectedYear] = useState<"all" | number>("all");
  const [selectedSemester, setSelectedSemester] = useState<"all" | 1 | 2>(
    "all",
  );
  const [selectedKab, setSelectedKab] = useState<"all" | string>("all");
  const [selectedLanding, setSelectedLanding] = useState<"all" | string>("all");
  const [selectedClass, setSelectedClass] = useState<"all" | string>("all");
  const [selectedFishName, setSelectedFishName] = useState<"all" | string>(
    "all",
  );

  // Sort / display
  const [sortBy, setSortBy] = useState<SortBy>("value");
  const [topN, setTopN] = useState<TopN>("all");

  // Fetch ALL data
  useEffect(() => {
    let cancelled = false;

    const getErrorMessage = (error: unknown) => {
      if (error instanceof Error) return error.message;

      try {
        return JSON.stringify(error);
      } catch {
        return String(error);
      }
    };

    async function loadData() {
      try {
        const data = await fetchAllRows<Row>(
          "tangkap",
          "kab, year, semester, class, common, name, landing, weight",
        );

        if (cancelled) return;

        const cleaned = (data ?? []).map((row) => ({
          kab: trimOrEmpty(row.kab),
          year: row.year,
          semester: row.semester,
          class: trimOrEmpty(row.class),
          common: trimOrEmpty(row.common),
          name: trimOrEmpty(row.name ?? ""),
          landing: trimOrEmpty(row.landing ?? ""),
          weight: row.weight,
        }));

        setRows(cleaned);
        setErr(null);
      } catch (error) {
        setErr(getErrorMessage(error) || "Failed to load data");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  /* ================= Options ================= */

  const yearOptions = useMemo(() => {
    const set = new Set<number>();

    rows.forEach((row) => {
      const year = yearOf(row.year);
      if (year != null) set.add(year);
    });

    return Array.from(set).sort((a, b) => b - a);
  }, [rows]);

  const kabOptions = useMemo(() => {
    const map = new Map<string, string>();

    rows.forEach((row) => {
      const label = trimOrEmpty(row.kab);
      if (!label) return;

      const key = keyOf(label);
      if (!map.has(key)) map.set(key, label);
    });

    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const landingOptions = useMemo(() => {
    const map = new Map<string, string>();

    rows.forEach((row) => {
      const label = trimOrEmpty(row.landing);
      if (!label) return;

      const key = keyOf(label);
      if (!map.has(key)) map.set(key, label);
    });

    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const classOptions = useMemo(() => {
    const map = new Map<string, string>();

    rows.forEach((row) => {
      const label = trimOrEmpty(row.class);
      if (!label) return;

      const key = keyOf(label);
      if (!map.has(key)) map.set(key, label);
    });

    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const fishNameOptions = useMemo(() => {
    const map = new Map<string, string>();

    rows.forEach((row) => {
      const label = trimOrEmpty(row.name) || trimOrEmpty(row.common);
      if (!label) return;

      const key = keyOf(label);
      if (!map.has(key)) map.set(key, label);
    });

    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  /* ================= Filtering ================= */

  const filteredRows = useMemo(() => {
    const selectedYearValue = selectedYear === "all" ? null : selectedYear;
    const selectedSemesterValue =
      selectedSemester === "all" ? null : selectedSemester;

    const selectedKabKey =
      selectedKab === "all" ? null : keyOf(String(selectedKab));

    const selectedLandingKey =
      selectedLanding === "all" ? null : keyOf(String(selectedLanding));

    const selectedClassKey =
      selectedClass === "all" ? null : keyOf(String(selectedClass));

    const selectedFishNameKey =
      selectedFishName === "all" ? null : keyOf(String(selectedFishName));

    return rows.filter((row) => {
      const kab = trimOrEmpty(row.kab);
      if (!kab) return false;

      const cls = trimOrEmpty(row.class);
      if (!cls) return false;

      const fishName = trimOrEmpty(row.name) || trimOrEmpty(row.common);
      if (!fishName) return false;

      const year = yearOf(row.year);
      if (selectedYearValue != null && year !== selectedYearValue) {
        return false;
      }

      const semester = semesterOf(row.semester);
      if (selectedSemesterValue != null && semester !== selectedSemesterValue) {
        return false;
      }

      if (selectedKabKey && keyOf(kab) !== selectedKabKey) {
        return false;
      }

      const landing = trimOrEmpty(row.landing);
      if (selectedLandingKey && keyOf(landing) !== selectedLandingKey) {
        return false;
      }

      if (selectedClassKey && keyOf(cls) !== selectedClassKey) {
        return false;
      }

      if (selectedFishNameKey && keyOf(fishName) !== selectedFishNameKey) {
        return false;
      }

      return true;
    });
  }, [
    rows,
    selectedYear,
    selectedSemester,
    selectedKab,
    selectedLanding,
    selectedClass,
    selectedFishName,
  ]);

  /* ================= Aggregation by fish name ================= */

  const items = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        tableLabel: string;
        chartLabel: string;
        classSet: Set<string>;
        value: number;
      }
    >();

    filteredRows.forEach((row) => {
      const fishName = trimOrEmpty(row.name) || trimOrEmpty(row.common);
      if (!fishName) return;

      const fishKey = keyOf(fishName);
      const cls = trimOrEmpty(row.class);

      const value = toNum(row.weight);
      if (!Number.isFinite(value)) return;

      if (!map.has(fishKey)) {
        map.set(fishKey, {
          key: fishKey,
          tableLabel: fishName,
          chartLabel: shortNameForChart(fishName) || fishName,
          classSet: new Set<string>(),
          value: 0,
        });
      }

      const target = map.get(fishKey);
      if (!target) return;

      if (cls) {
        target.classSet.add(cls);
      }

      target.value += value;
    });

    let result = Array.from(map.values())
      .map((item) => ({
        key: item.key,
        tableLabel: item.tableLabel,
        chartLabel: item.chartLabel,
        classLabel: Array.from(item.classSet).sort().join(", "),
        value: item.value,
      }))
      .filter((item) => Math.abs(item.value) > 1e-9);

    result.sort((a, b) => {
      if (sortBy === "name") {
        return a.tableLabel.localeCompare(b.tableLabel);
      }

      if (sortBy === "class") {
        return a.classLabel.localeCompare(b.classLabel);
      }

      return b.value - a.value;
    });

    if (topN !== "all") {
      result = result.slice(0, topN);
    }

    return result;
  }, [filteredRows, sortBy, topN]);

  /* ================= Chart data ================= */

  const { labels, datasets }: { labels: string[]; datasets: DatasetConf[] } =
    useMemo(() => {
      return {
        labels: items.map((item) => item.chartLabel),
        datasets: [
          {
            label: "Tangkap",
            values: items.map((item) => item.value),
            backgroundColor: "rgba(53, 162, 235, 0.6)",
          },
        ],
      };
    }, [items]);

  const tooltipLabels = useMemo(
    () => items.map((item) => item.tableLabel),
    [items],
  );

  const grandTotal = useMemo(
    () => items.reduce((sum, item) => sum + item.value, 0),
    [items],
  );

  const nf = useMemo(
    () => new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }),
    [],
  );

  /* ================= CSV ================= */

  const downloadCsv = () => {
    if (items.length === 0) return;

    const header: (string | number)[] = ["Nama Ikan", "Kelas", "Total (ton)"];

    const body: (string | number)[][] = items.map((item) => [
      item.tableLabel,
      item.classLabel,
      item.value,
    ]);

    body.push(["Jumlah", "", grandTotal]);

    const csv = toCsv(header, body);
    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = fileNameFromTitle(TITLE);

    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    URL.revokeObjectURL(url);
  };

  const handleCsvClick = () => {
    if (items.length === 0) return;

    if (!isLoggedIn) {
      setAlertType("login-required");
      return;
    }

    downloadCsv();
  };

  const handleLoginRedirect = () => {
    setAlertType(null);
    router.push("/masuk/");
  };

  /* ================= UI States ================= */

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

      {/* Title */}
      <h2 className="mb-3 md:mb-6">{TITLE}</h2>

      {/* Top controls */}
      <div className="mb-6 flex flex-wrap justify-between gap-x-3 gap-y-3 md:gap-y-2">
        {/* Tahun */}
        <div className="flex flex-col w-[45%] md:w-auto ">
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

        {/* Semester */}
        <div className="flex flex-col w-[45%] md:w-auto ">
          <label className="mb-1 block font-medium text-[2.8vw] md:text-[1.5vw] lg:text-sm">
            Semester
          </label>

          <select
            className="w-full rounded border bg-white px-2 py-1 text-[2.8vw] md:text-[1.5vw] lg:text-sm"
            value={String(selectedSemester)}
            onChange={(event) => {
              const value = event.target.value as "all" | "1" | "2";

              setSelectedSemester(
                value === "all" ? "all" : (Number(value) as 1 | 2),
              );
            }}
          >
            <option value="all">Semua</option>
            <option value="1">1</option>
            <option value="2">2</option>
          </select>
        </div>

        {/* Kabupaten */}
        <div className="flex flex-col w-[45%] md:w-auto  ">
          <label className="mb-1 block font-medium text-[2.8vw] md:text-[1.5vw] lg:text-sm">
            Kabupaten
          </label>

          <select
            className="w-full rounded border bg-white px-2 py-1 text-[2.8vw] md:text-[1.5vw] lg:text-sm"
            value={selectedKab}
            onChange={(event) =>
              setSelectedKab(
                event.target.value === "all" ? "all" : event.target.value,
              )
            }
          >
            <option value="all">Semua Kabupaten</option>

            {kabOptions.map((kab) => (
              <option key={kab} value={kab}>
                {kab}
              </option>
            ))}
          </select>
        </div>

        {/* Landing */}
        <div className="flex flex-col w-[45%] md:w-auto  ">
          <label className="mb-1 block font-medium text-[2.8vw] md:text-[1.5vw] lg:text-sm">
            Landing
          </label>

          <select
            className="w-full rounded border bg-white px-2 py-1 text-[2.8vw] md:text-[1.5vw] lg:text-sm"
            value={selectedLanding}
            onChange={(event) =>
              setSelectedLanding(
                event.target.value === "all" ? "all" : event.target.value,
              )
            }
          >
            <option value="all">Semua Landing</option>

            {landingOptions.map((landing) => (
              <option key={landing} value={landing}>
                {landing}
              </option>
            ))}
          </select>
        </div>

        {/* Kelas */}
        <div className="flex flex-col w-[45%] md:w-auto  ">
          <label className="mb-1 block font-medium text-[2.8vw] md:text-[1.5vw] lg:text-sm">
            Kelas
          </label>

          <select
            className="w-full rounded border bg-white px-2 py-1 text-[2.8vw] md:text-[1.5vw] lg:text-sm"
            value={selectedClass}
            onChange={(event) =>
              setSelectedClass(
                event.target.value === "all" ? "all" : event.target.value,
              )
            }
          >
            <option value="all">Semua Kelas</option>

            {classOptions.map((cls) => (
              <option key={cls} value={cls}>
                {cls}
              </option>
            ))}
          </select>
        </div>

        {/* Nama Ikan */}
        <div className="flex flex-col w-[45%] md:w-auto  ">
          <label className="mb-1 block font-medium text-[2.8vw] md:text-[1.5vw] lg:text-sm">
            Nama Ikan
          </label>

          <select
            className="w-full rounded border bg-white px-2 py-1 text-[2.8vw] md:text-[1.5vw] lg:text-sm"
            value={selectedFishName}
            onChange={(event) =>
              setSelectedFishName(
                event.target.value === "all" ? "all" : event.target.value,
              )
            }
          >
            <option value="all">Semua Nama Ikan</option>

            {fishNameOptions.map((fishName) => (
              <option key={fishName} value={fishName}>
                {fishName}
              </option>
            ))}
          </select>
        </div>

        {/* Urutkan */}
        <div className="flex flex-col w-[45%] md:w-auto  ">
          <label className="mb-1 block font-medium text-[2.8vw] md:text-[1.5vw] lg:text-sm">
            Urutkan
          </label>

          <select
            className="w-full rounded border bg-white px-2 py-1 text-[2.8vw] md:text-[1.5vw] lg:text-sm"
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as SortBy)}
          >
            <option value="value">Total</option>
            <option value="name">Nama Ikan</option>
            <option value="class">Kelas</option>
          </select>
        </div>

        {/* Top */}
        <div className="flex flex-col w-[45%] md:w-auto  ">
          <label className="mb-1 block font-medium text-[2.8vw] md:text-[1.5vw] lg:text-sm">
            Top
          </label>

          <select
            className="w-full rounded border bg-white px-2 py-1 text-[2.8vw] md:text-[1.5vw] lg:text-sm"
            value={topN}
            onChange={(event) => {
              const value = event.target.value as "all" | "5" | "10";

              setTopN(value === "all" ? "all" : (Number(value) as 5 | 10));
            }}
          >
            <option value="all">Semua</option>
            <option value="5">Top 5</option>
            <option value="10">Top 10</option>
          </select>
        </div>

        {/* Download */}
        <div className="flex flex-col w-[45%] md:w-auto  ">
          <label className="mb-1 block font-medium text-[2.8vw] md:text-[1.5vw] lg:text-sm">
            Download
          </label>

          <button
            type="button"
            className={`w-full rounded border px-3 py-1 text-[2.8vw] md:text-[1.5vw] lg:text-sm ${
              items.length === 0
                ? "cursor-not-allowed opacity-50"
                : "bg-sky-600 text-white hover:bg-sky-500"
            }`}
            onClick={handleCsvClick}
            disabled={items.length === 0}
          >
            CSV
          </button>
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
        unit="ton"
      />

      {/* Table */}
      <div className="mb-12 w-full max-w-full min-w-0 overflow-x-auto overscroll-x-contain">
        <table className="min-w-max table-auto text-[2vw] md:text-[1.5vw] lg:text-sm">
          <thead className="bg-sky-100">
            <tr>
              <th className="whitespace-nowrap border border-gray-400 px-3 py-2 text-center">
                Nama Ikan
              </th>

              <th className="whitespace-nowrap border border-gray-400 px-3 py-2 text-center">
                Kelas
              </th>

              <th className="whitespace-nowrap border border-gray-400 px-3 py-2 text-center">
                Total (ton)
              </th>
            </tr>
          </thead>

          <tbody>
            {items.length === 0 ? (
              <tr>
                <td className="px-3 py-3 text-gray-500" colSpan={3}>
                  Tidak ada data untuk filter saat ini.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.key}>
                  <td className="whitespace-nowrap border border-gray-400 px-3 py-2">
                    {item.tableLabel}
                  </td>

                  <td className="whitespace-nowrap border border-gray-400 px-3 py-2">
                    {item.classLabel || "-"}
                  </td>

                  <td className="whitespace-nowrap border border-gray-400 px-3 py-2 text-right">
                    {nf.format(item.value)}
                  </td>
                </tr>
              ))
            )}
          </tbody>

          {items.length > 0 && (
            <tfoot className="bg-sky-50">
              <tr>
                <td className="whitespace-nowrap border border-gray-400 px-3 py-2 font-semibold">
                  Jumlah
                </td>

                <td className="whitespace-nowrap border border-gray-400 px-3 py-2 font-semibold" />

                <td className="whitespace-nowrap border border-gray-400 px-3 py-2 text-right font-semibold">
                  {nf.format(grandTotal)}
                </td>
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
          confirm={handleLoginRedirect}
        />
      )}
    </div>
  );
}
