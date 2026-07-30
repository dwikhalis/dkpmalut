"use client";

import { useMemo, useState } from "react";
import BarCharts from "@/app/components/Charts/BarCharts";
import Button from "@/app/components/Button";
import { calculateLBIMetrics } from "@/lib/fisheries/calculateLBIMetrics";
import { rowsToSafeCsv } from "@/lib/fisheries/lbiCsv";
import type { LBIObservation } from "@/lib/fisheries/lbiTypes";

type Props = {
  dataset: {
    dataset_name: string;
    sampling_location: string;
    landing_site: string;
    fishing_gear: string;
    sampling_start_date: string;
    sampling_end_date: string;
    length_unit: "cm" | "mm";
    published?: string | null;
    reference_snapshot: {
      scientificName: string;
      commonName?: string;
      linf: number;
      lm: number;
      lopt: number;
      lengthType: string;
      lengthUnit: string;
      referenceVersion: number;
      sourceTitle: string;
      sourceAuthors?: string;
      sourceYear?: number;
    };
  };
  observations: LBIObservation[];
  canExport?: boolean;
};

const number = (value: number | null) => value == null ? "—" : value.toLocaleString("id-ID", { maximumFractionDigits: 2 });

export default function LBIDashboard({ dataset, observations, canExport = false }: Props) {
  const unit = dataset.length_unit;
  const widths = unit === "mm" ? [5, 10, 20, 50] : [0.5, 1, 2, 5];
  const [binWidth, setBinWidth] = useState(widths[1]);
  const [sex, setSex] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const filtered = useMemo(
    () => observations.filter(
      (row) =>
        (sex === "all" || row.sex === sex) &&
        (!dateFrom || row.samplingDate >= dateFrom) &&
        (!dateTo || row.samplingDate <= dateTo),
    ),
    [dateFrom, dateTo, observations, sex],
  );
  const reference = dataset.reference_snapshot;
  const metrics = useMemo(
    () => calculateLBIMetrics(filtered.map((row) => row.length), reference, binWidth),
    [binWidth, filtered, reference],
  );
  const lower = reference.lopt * 0.9;
  const upper = reference.lopt * 1.1;
  const below = filtered.filter((row) => row.length < reference.lm).length;
  const matureBelow = filtered.filter((row) => row.length >= reference.lm && row.length < lower).length;
  const optimal = filtered.filter((row) => row.length >= lower && row.length <= upper).length;
  const above = filtered.filter((row) => row.length > upper).length;
  const limitation = "Hasil ini menggambarkan struktur panjang sampel yang diunggah. Interpretasi harus mempertimbangkan desain sampling, selektivitas alat tangkap, cakupan spasial dan musiman, penyortiran pasar, serta informasi penilaian stok lainnya.";
  const interpretations = metrics.sampleSize < 10
    ? ["Sampel terfilter terlalu kecil untuk interpretasi yang andal."]
    : [
        (metrics.pmat ?? 0) < 50 ? "Proporsi besar ikan sampel berada di bawah panjang matang yang dipilih." : "Sebagian besar ikan sampel mencapai atau melampaui panjang matang yang dipilih.",
        (metrics.popt ?? 0) >= 50 ? "Sebagian besar ikan sampel berada dalam rentang panjang optimum yang dipilih." : "Kurang dari separuh ikan sampel berada dalam rentang panjang optimum.",
        (metrics.pmega ?? 0) < 10 ? "Sedikit individu teramati di atas batas atas panjang optimum." : "Individu di atas batas atas panjang optimum terdapat dalam sampel.",
      ];

  const downloadNormalized = () => {
    const csv = rowsToSafeCsv(filtered.map((row) => ({
      sample_id: row.sampleId, sampling_date: row.samplingDate, length: row.length,
      sex: row.sex, weight: row.weight ?? "", maturity_stage: row.maturityStage ?? "", notes: row.notes ?? "",
    })));
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    anchor.download = "lbi-normalized-observations.csv";
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  };

  return (
    <section className="space-y-5" aria-label="Dashboard indikator berbasis panjang">
      <header className="rounded-2xl bg-sky-800 p-5 text-white shadow-md">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{dataset.dataset_name}</h1>
            <p className="italic">{reference.scientificName}</p>
            <p className="mt-2 text-sm">{dataset.sampling_location} · {dataset.sampling_start_date}–{dataset.sampling_end_date} · {dataset.fishing_gear}</p>
          </div>
          <span className="rounded-full bg-white/20 px-3 py-1 text-sm">{dataset.published === "approved" ? "Dipublikasikan" : dataset.published === "requested" ? "Menunggu persetujuan" : "Belum dipublikasikan"}</span>
        </div>
      </header>

      <details className="rounded-xl border border-sky-200 bg-sky-50 p-4" open>
        <summary className="cursor-pointer font-semibold">Referensi biologis</summary>
        <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <span>Lm: <b>{reference.lm} {unit}</b></span><span>Lopt: <b>{reference.lopt} {unit}</b></span>
          <span>L∞: <b>{reference.linf} {unit}</b></span><span>Rentang optimum: <b>{number(lower)}–{number(upper)} {unit}</b></span>
          <span>Versi: <b>{reference.referenceVersion}</b></span><span className="sm:col-span-2">Sumber: <b>{reference.sourceAuthors ? `${reference.sourceAuthors}. ` : ""}{reference.sourceTitle}{reference.sourceYear ? ` (${reference.sourceYear})` : ""}</b></span>
        </div>
      </details>

      <div className="flex flex-wrap gap-4 rounded-xl border bg-white p-4">
        <label className="text-sm font-medium">Jenis kelamin
          <select value={sex} onChange={(event) => setSex(event.target.value)} className="ml-2 rounded-md border px-3 py-2">
            <option value="all">Semua</option><option value="male">Jantan</option><option value="female">Betina</option><option value="unknown">Tidak diketahui</option>
          </select>
        </label>
        <label className="text-sm font-medium">Lebar bin
          <select value={binWidth} onChange={(event) => setBinWidth(Number(event.target.value))} className="ml-2 rounded-md border px-3 py-2">
            {widths.map((width) => <option key={width} value={width}>{width} {unit}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium">Dari tanggal
          <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="ml-2 rounded-md border px-3 py-2" />
        </label>
        <label className="text-sm font-medium">Sampai tanggal
          <input type="date" min={dateFrom} value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="ml-2 rounded-md border px-3 py-2" />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Ukuran sampel", metrics.sampleSize, "Jumlah pengamatan valid terfilter"],
          ["Rerata panjang", `${number(metrics.meanLength)} ${unit}`, "Rerata aritmetika panjang"],
          ["Median panjang", `${number(metrics.medianLength)} ${unit}`, "Nilai tengah panjang"],
          ["Pmat", `${number(metrics.pmat)}%`, "Persentase panjang ≥ Lm"],
          ["Popt", `${number(metrics.popt)}%`, "Persentase dalam 0,9–1,1 × Lopt"],
          ["Pmega", `${number(metrics.pmega)}%`, "Persentase panjang > 1,1 × Lopt"],
          ["Maksimum", `${number(metrics.maximumLength)} ${unit}`, "Panjang maksimum teramati"],
        ].map(([label, value, title]) => (
          <div key={String(label)} title={String(title)} className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="text-sm text-stone-500">{label}</div><div className="mt-1 text-2xl font-bold text-sky-900">{value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <h2 className="font-semibold">Frekuensi panjang</h2>
        <p className="text-xs text-stone-500">Garis acuan: Lm {reference.lm}, Lopt {reference.lopt}, L∞ {reference.linf} {unit}. Rentang optimum {number(lower)}–{number(upper)} {unit}.</p>
        {metrics.sampleSize ? <BarCharts chartTitle="" labels={metrics.bins.map((bin) => bin.label)} tooltipLabels={metrics.bins.map((bin) => `${bin.binStart} ≤ panjang < ${bin.binEnd} ${unit}`)} datasets={[{ label: "Frekuensi", values: metrics.bins.map((bin) => bin.frequency), backgroundColor: "#0369a1" }]} stacked={false} histogram xAxisTitle={`Panjang (${unit})`} showLegend={false} heightClassName="h-[45vh]" /> : <p className="p-8 text-center text-stone-500">Tidak ada data untuk filter ini.</p>}
      </div>

      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <h2 className="font-semibold">Komposisi panjang (kategori eksklusif)</h2>
        <BarCharts chartTitle="" labels={["Di bawah matang", "Matang, di bawah optimum", "Rentang optimum", "Di atas optimum"]} datasets={[{ label: "Ikan", values: [below, matureBelow, optimal, above], backgroundColor: "#0ea5e9" }]} stacked={false} showLegend={false} heightClassName="h-[35vh]" />
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <h2 className="font-semibold">Interpretasi deskriptif</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{interpretations.map((text) => <li key={text}>{text}</li>)}</ul>
        <p className="mt-3 text-sm font-medium">{limitation}</p>
      </div>
      {canExport && <Button variant="outline" onClick={downloadNormalized}>Ekspor observasi terfilter</Button>}
    </section>
  );
}
