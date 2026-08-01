"use client";

import { useEffect, useMemo, useState } from "react";
import BarCharts from "../Charts/BarCharts";
import { supabase } from "@/lib/supabase/supabaseClient";
import type { DashboardTab } from "@/lib/fisheries-dashboard/config";

type Props = { tab: DashboardTab; userId?: string };
type RpcPayload = { options?: Record<string, Array<string | number>>; series?: Record<string, unknown>[] };
const FILTERS = [
  ["location", "Lokasi"], ["year", "Tahun"],
  ["gear", "Alat Tangkap"], ["area", "Area Penangkapan"],
  ["family", "Family"], ["species", "Species"],
] as const;

export default function DashboardVisualizationPreview({ tab, userId }: Props) {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [options, setOptions] = useState<Record<string, Array<string | number>>>({});
  const [series, setSeries] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true); const [message, setMessage] = useState("");
  const [binWidth, setBinWidth] = useState(1);
  const [chartColor, setChartColor] = useState("#0369a1"); const [showLegend, setShowLegend] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); setMessage("User sumber dashboard belum tersedia."); return; }
    let active = true; setLoading(true); setMessage("");
    void supabase.rpc("get_fisheries_dashboard_chart", {
      p_user_id: userId, p_tab: tab, p_filters: filters,
      p_bin_width: binWidth, p_measurement: "TL",
    }).then(({ data, error }) => {
      if (!active) return;
      if (error) { setMessage(error.message); setSeries([]); }
      else { const payload = (data ?? {}) as RpcPayload; setOptions(payload.options ?? {}); setSeries(payload.series ?? []); }
      setLoading(false);
    });
    return () => { active = false; };
  }, [binWidth, filters, userId, tab]);

  const controls = <div className="grid gap-3 rounded-xl border border-stone-200 bg-stone-50 p-4 sm:grid-cols-2 lg:grid-cols-3">
    {FILTERS.map(([key, label]) => <label key={key} className="flex flex-col gap-1 text-sm font-semibold">{label}<select value={filters[key] ?? ""} onChange={(event) => setFilters((current) => ({ ...current, [key]: event.target.value }))} className="rounded border bg-white px-3 py-2 font-normal"><option value="">Semua</option>{(options[key] ?? []).map((option) => <option key={String(option)} value={String(option)}>{String(option)}</option>)}</select></label>)}
    <label className="flex items-center gap-2 text-sm font-semibold">Warna<input type="color" value={chartColor} onChange={(event) => setChartColor(event.target.value)} /></label>
    <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={showLegend} onChange={(event) => setShowLegend(event.target.checked)} />Tampilkan legenda</label>
  </div>;

  const chart = useMemo(() => {
    if (tab === "cpue") return { labels: series.map((row) => String(row.month)), datasets: [{ label: "CPUE", values: series.map((row) => Number(row.cpue ?? 0)), backgroundColor: chartColor }], title: "CPUE Bulanan", histogram: false };
    if (tab === "totallanding") return { labels: series.map((row) => String(row.month)), datasets: [{ label: "Total Landing", values: series.map((row) => Number(row.totalKg ?? 0)), backgroundColor: chartColor }], title: "Total Landing Bulanan", histogram: false };
    const months = Array.from(new Set(series.map((row) => String(row.month)))).sort();
    if (tab === "composition") {
      const species = Array.from(new Set(series.map((row) => String(row.species))));
      return { labels: months, datasets: species.map((name) => ({ label: name, values: months.map((month) => Number(series.find((row) => row.month === month && row.species === name)?.totalKg ?? 0)) })), title: "Komposisi Tangkapan Bulanan", histogram: false };
    }
    const bins = Array.from(new Set(series.map((row) => Number(row.lower)))).sort((a, b) => a - b);
    return { labels: bins.map((lower) => `${lower}-${lower + binWidth}`), datasets: months.map((month) => ({ label: month, values: bins.map((lower) => Number(series.find((row) => row.month === month && Number(row.lower) === lower)?.frequency ?? 0)) })), title: "Frekuensi Panjang Bulanan", histogram: true };
  }, [binWidth, chartColor, series, tab]);

  return <div className="space-y-4">{controls}{tab === "lengthfrequency" && <label className="text-sm">Lebar bin <input type="number" min="0.1" step="0.1" value={binWidth} onChange={(event) => setBinWidth(Number(event.target.value))} className="ml-2 w-24 rounded border px-2 py-1" /></label>}{loading ? <p className="p-6 text-sm">Menghitung seluruh data…</p> : series.length ? <BarCharts labels={chart.labels} datasets={chart.datasets} stacked={tab === "composition"} chartTitle={chart.title} histogram={chart.histogram} showLegend={showLegend} heightClassName="h-96" /> : <p className="rounded-xl bg-amber-50 p-4 text-sm">Tidak ada data untuk filter yang dipilih.</p>}{message && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{message}</p>}</div>;
}
