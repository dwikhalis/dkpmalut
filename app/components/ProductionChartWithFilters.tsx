"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/supabaseClient";
import BarCharts from "./BarCharts";

type Row = {
  kab: string | null;
  tot_produksi?: number | string | null; // budidaya
  weight?: number | string | null; // tangkap
};

type DatasetConf = {
  label: string;
  values: number[];
  backgroundColor?: string;
};

type Unit = "kg" | "t";

function toNum(v: unknown) {
  if (v == null) return NaN;
  if (typeof v === "number") return v;
  if (typeof v === "string") return Number(v.replaceAll(",", ""));
  return NaN;
}

function aggregate(
  rows: Row[],
  pick: (r: Row) => number | string | null | undefined
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

export default function ProductionChartWithFilters() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // raw rows
  const [rowsBudidaya, setRowsBudidaya] = useState<Row[]>([]);
  const [rowsTangkap, setRowsTangkap] = useState<Row[]>([]);

  // filters
  const [selectedKabs, setSelectedKabs] = useState<string[]>([]);
  const [showBudidaya, setShowBudidaya] = useState(true);
  const [showTangkap, setShowTangkap] = useState(true);
  const [stacked, setStacked] = useState(false);
  const [unit, setUnit] = useState<Unit>("t"); // default to ton
  const [topN, setTopN] = useState<number | "all">("all");
  const [sortBy, setSortBy] = useState<"value" | "kab">("value");
  const [order, setOrder] = useState<"desc" | "asc">("desc");
  const [showSideMenu, setShowSideMenu] = useState(true);

  // fetch once on mount (client-side for interactive filters)
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [
          { data: dataBudidaya, error: e1 },
          { data: dataTangkap, error: e2 },
        ] = await Promise.all([
          supabase.from("budidaya").select("kab, tot_produksi"),
          supabase.from("tangkap").select("kab, weight"),
        ]);
        if (e1 || e2) throw e1 || e2;
        if (cancelled) return;

        setRowsBudidaya((dataBudidaya ?? []) as Row[]);
        setRowsTangkap((dataTangkap ?? []) as Row[]);
        setErr(null);
      } catch (e: any) {
        setErr(e?.message ?? "Failed to load data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // aggregate
  const totals = useMemo(() => {
    const tb = aggregate(rowsBudidaya, (r) => r.tot_produksi);
    const tt = aggregate(rowsTangkap, (r) => r.weight);
    return { tb, tt };
  }, [rowsBudidaya, rowsTangkap]);

  // all kab options
  const allKabOptions = useMemo(() => {
    const set = new Set<string>([...totals.tb.keys(), ...totals.tt.keys()]);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [totals]);

  // apply filters + build labels & datasets
  const { labels, datasets }: { labels: string[]; datasets: DatasetConf[] } =
    useMemo(() => {
      // base labels (all kabs that pass dataset toggles)
      const unionKabs = new Set<string>();
      if (showBudidaya) totals.tb.forEach((_, k) => unionKabs.add(k));
      if (showTangkap) totals.tt.forEach((_, k) => unionKabs.add(k));
      let labs = Array.from(unionKabs);

      // filter by selected kabs (if any selected)
      if (selectedKabs.length > 0) {
        const wanted = new Set(selectedKabs);
        labs = labs.filter((k) => wanted.has(k));
      }

      // sort & topN based on sum of visible datasets
      const sumForKab = (k: string) =>
        (showBudidaya ? (totals.tb.get(k) ?? 0) : 0) +
        (showTangkap ? (totals.tt.get(k) ?? 0) : 0);

      if (sortBy === "kab") {
        labs.sort((a, b) => a.localeCompare(b) * (order === "asc" ? 1 : -1));
      } else {
        labs.sort(
          (a, b) => (sumForKab(a) - sumForKab(b)) * (order === "asc" ? 1 : -1)
        );
      }

      if (topN !== "all") {
        labs = labs.slice(0, topN);
      }

      const scale = unit === "t" ? 1 / 1000 : 1;

      const ds: DatasetConf[] = [];
      if (showBudidaya) {
        ds.push({
          label: "Budidaya",
          values: labs.map((k) => (totals.tb.get(k) ?? 0) * scale),
          backgroundColor: "rgba(144, 238, 144, 0.7)",
        });
      }
      if (showTangkap) {
        ds.push({
          label: "Tangkap",
          values: labs.map((k) => (totals.tt.get(k) ?? 0) * scale),
          backgroundColor: "rgba(53, 162, 235, 0.6)",
        });
      }

      return { labels: labs, datasets: ds };
    }, [
      totals,
      selectedKabs,
      showBudidaya,
      showTangkap,
      unit,
      sortBy,
      order,
      topN,
    ]);

  //! ==== TABLE ====
  const unitLabel = unit === "t" ? "Ton" : "Kg";

  const tableRows = useMemo(() => {
    const scale = unit === "t" ? 1 / 1000 : 1; // totals.* are in kg
    return labels.map((kab) => {
      const bud = (totals.tb.get(kab) ?? 0) * scale;
      const tang = (totals.tt.get(kab) ?? 0) * scale;
      return {
        kab,
        bud: showBudidaya ? bud : 0,
        tang: showTangkap ? tang : 0,
        total: (showBudidaya ? bud : 0) + (showTangkap ? tang : 0),
      };
    });
  }, [labels, totals, unit, showBudidaya, showTangkap]);

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
      {/* //! FILTERS */}

      {/* //! ============================================================================ */}
      {/* //! SIDEBAR : DATASETS & KABUPATEN */}
      {/* //! ============================================================================ */}

      <div
        className={`flex flex-col bg-teal-900 md:pt-10 pt-20 p-6 top-0 md:top-auto md:static fixed z-5 md:z-0 md:w-[18%] w-[45vw] md:h-auto h-[100vh] transition-transform duration-300 md:translate-x-0 text-white ${
          showSideMenu ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* //! KABUPATEN */}
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

      {/* //! ============================================================================ */}
      {/* //! CHART LAYOUT UNIT SORT */}
      {/* //! ============================================================================ */}

      <div className="flex flex-col ml-12 mt-12 w-full">
        <h2 className="mb-6">
          Produksi Perikanan Tangkap dan Budidaya Provinsi Maluku Utara
        </h2>
        <div className="flex justify-between">
          <div>
            {/* //! DATASETS */}
            <label>Datasets</label>
            <div className="flex gap-3">
              <button
                className={`flex px-3 py-1 rounded border items-center gap-1 text-sm ${showBudidaya ? "bg-teal-600 text-white border-teal-600" : "bg-white"}`}
                onClick={(e) => setShowBudidaya(!showBudidaya)}
              >
                Budidaya
              </button>
              <button
                className={`flex px-3 py-1 rounded border items-center gap-1 text-sm ${showTangkap ? "bg-teal-600 text-white border-teal-600" : "bg-white"}`}
                onClick={(e) => setShowTangkap(!showTangkap)}
              >
                Tangkap
              </button>
            </div>
          </div>
          {/* //! LAYOUT : STACKED / GROUPED */}
          <div>
            <label className="text-sm font-medium">Tampilan</label>
            <div className="flex gap-3">
              <button
                className={`px-3 py-1 rounded border text-sm ${stacked ? "bg-teal-600 text-white border-teal-600" : "bg-white"}`}
                onClick={() => setStacked(true)}
              >
                Tumpuk
              </button>
              <button
                className={`px-3 py-1 rounded border text-sm ${!stacked ? "bg-teal-600 text-white border-teal-600" : "bg-white"}`}
                onClick={() => setStacked(false)}
              >
                Grup
              </button>
            </div>
          </div>

          {/* //! SORTING */}
          <div>
            <label className="text-sm font-medium">Urutkan</label>
            <div className="flex gap-3">
              {/* //! SORT BY VALUE / NAME */}
              <select
                className="rounded border px-2 py-1 text-sm"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "value" | "kab")}
              >
                <option value="value">Nilai</option>
                <option value="kab">Nama</option>
              </select>

              {/* //! SORT ASCENDING / DESCENDING */}
              <select
                className="rounded border px-2 py-1 text-sm"
                value={order}
                onChange={(e) => setOrder(e.target.value as "asc" | "desc")}
              >
                <option value="desc">Atas</option>
                <option value="asc">Bawah</option>
              </select>

              {/* //! SORT TOP N */}
              {/* <select
                className="rounded border px-2 py-1 text-sm"
                value={topN}
                onChange={(e) =>
                  setTopN(
                    e.target.value === "all" ? "all" : Number(e.target.value)
                  )
                }
              >
                <option value="all">All</option>
                <option value="5">Top 5</option>
                <option value="10">Top 10</option>
                <option value="15">Top 15</option>
                <option value="20">Top 20</option>
              </select> */}
            </div>
          </div>
          {/* //! UNITS */}
          {/* <div>
            <label className="text-sm font-medium">Unit</label>
            <div>
              <select
                className="rounded border px-2 py-1 text-sm"
                value={unit}
                onChange={(e) => setUnit(e.target.value as Unit)}
              >
                <option value="t">Ton</option>
                <option value="kg">Kg</option>
              </select>
            </div>
          </div> */}
        </div>
        {/* //! CHART */}
        <div>
          <BarCharts
            chartTitle={""}
            labels={labels}
            datasets={datasets}
            stacked={stacked}
          />
        </div>

        {/* //! TABLE */}
        <div className="mt-8 overflow-x-auto mb-12">
          <table className="min-w-full text-sm">
            <thead className="bg-teal-100">
              <tr>
                <th className="px-3 py-2 border border-gray-400">Kabupaten</th>
                {showBudidaya && (
                  <th className="px-3 py-2 border border-gray-400">
                    Budidaya ({unitLabel})
                  </th>
                )}
                {showTangkap && (
                  <th className="px-3 py-2 border border-gray-400">
                    Tangkap ({unitLabel})
                  </th>
                )}
                <th className="px-3 py-2 border border-gray-400">
                  Total ({unitLabel})
                </th>
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
                  <tr key={r.kab}>
                    <td className="px-3 py-2 border border-gray-400">
                      {r.kab}
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
