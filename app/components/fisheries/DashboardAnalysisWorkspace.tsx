"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "@/app/components/Button";
import SpinnerLoading from "@/app/components/SpinnerLoading";
import { supabase } from "@/lib/supabase/supabaseClient";
import {
  updateAnalysisProgress,
  type DashboardConfiguration,
  type FisheriesAnalysisType,
} from "@/lib/fisheries/dashboardOrchestration";
import { ANALYSIS_OPTIONS } from "./DashboardTypeSelector";

type SpeciesSummary = {
  species_id: string;
  scientific_name: string;
  local_name: string | null;
  weight_kg: number;
  individuals: number;
  landing_trips: number;
  records: number;
};
type Snapshot = {
  tripCount: number;
  catchTripCount: number;
  vesselCount: number;
  totalWeightKg: number;
  totalIndividuals: number;
  effort: {
    hours: number;
    hourTrips: number;
    hourWeight: number;
    settings: number;
    settingTrips: number;
    settingWeight: number;
    hooks: number;
    hookTrips: number;
    hookWeight: number;
    netMetres: number;
    netTrips: number;
    netWeight: number;
  };
  species: SpeciesSummary[];
  lengths: Array<{
    species_id: string;
    measurement_type: "total_length" | "fork_length";
    length_cm: number;
    frequency: number;
  }>;
  filters: {
    gears: string[];
    landingLocations: string[];
    wpps: string[];
  };
};

const number = (value: number, digits = 2) =>
  Number(value || 0).toLocaleString("id-ID", { maximumFractionDigits: digits });
const toSlug = (value: string) =>
  value
    .toLocaleLowerCase("id-ID")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export default function DashboardAnalysisWorkspace({
  dashboardId,
  type,
}: {
  dashboardId: string;
  type: FisheriesAnalysisType;
}) {
  const [dashboard, setDashboard] = useState<{
    label: string;
    fisheries_dataset_id: string | null;
    dashboard_config: DashboardConfiguration;
  } | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    gear: "",
    landing: "",
    wpp: "",
  });
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("");
  const [references, setReferences] = useState<
    Array<{
      id: string;
      species_id: string;
      lm: number;
      lopt: number;
      linf: number;
      length_type: string;
      version: number;
    }>
  >([]);
  const [referenceId, setReferenceId] = useState("");

  useEffect(() => {
    void supabase
      .from("datasets")
      .select("label,fisheries_dataset_id,dashboard_config")
      .eq("id", dashboardId)
      .eq("kind", "dashboard")
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) setMessage("Dashboard tidak dapat diakses.");
        else setDashboard(data as typeof dashboard);
        setBusy(false);
      });
  }, [dashboardId]);

  const load = async () => {
    if (!dashboard?.fisheries_dataset_id) return;
    setBusy(true);
    setMessage("");
    const { data, error } = await supabase.rpc(
      "get_private_fisheries_analysis_snapshot",
      {
        p_fisheries_dataset_id: dashboard.fisheries_dataset_id,
        p_date_from: filters.dateFrom || null,
        p_date_to: filters.dateTo || null,
        p_gear: filters.gear || null,
        p_landing_location: filters.landing || null,
        p_wpp: filters.wpp || null,
      },
    );
    if (error) {
      console.error("Fisheries snapshot failed:", error);
      setMessage("Ringkasan analisis tidak dapat dihitung.");
    } else {
      const next = data as Snapshot;
      setSnapshot(next);
      if (type === "lbi" && next.lengths.length) {
        const speciesIds = [
          ...new Set(next.lengths.map((item) => item.species_id)),
        ];
        const { data: referenceRows } = await supabase
          .from("species_biological_references")
          .select("id,species_id,lm,lopt,linf,length_type,version")
          .eq("status", "approved")
          .in("species_id", speciesIds)
          .order("version", { ascending: false });
        setReferences((referenceRows ?? []) as typeof references);
      }
    }
    setBusy(false);
  };
  useEffect(() => {
    if (dashboard?.fisheries_dataset_id) void load();
    // Initial load is intentionally tied to the selected source.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboard?.fisheries_dataset_id]);

  const cpue = useMemo(() => {
    if (!snapshot) return [];
    const values = [
      ["kg/trip", snapshot.totalWeightKg, snapshot.catchTripCount],
      ["individu/trip", snapshot.totalIndividuals, snapshot.catchTripCount],
      ["kg/jam", snapshot.effort.hourWeight, snapshot.effort.hours],
      ["kg/setting", snapshot.effort.settingWeight, snapshot.effort.settings],
      ["kg/100 kail", snapshot.effort.hookWeight, snapshot.effort.hooks / 100],
      [
        "kg/100 m jaring",
        snapshot.effort.netWeight,
        snapshot.effort.netMetres / 100,
      ],
    ] as const;
    return values.map(([label, numerator, denominator]) => ({
      label,
      value: denominator > 0 ? numerator / denominator : null,
      numerator,
      denominator,
    }));
  }, [snapshot]);
  const lbi = useMemo(() => {
    const reference = references.find((item) => item.id === referenceId);
    if (!snapshot || !reference) return null;
    const rows = snapshot.lengths.filter(
      (item) =>
        item.species_id === reference.species_id &&
        item.measurement_type === reference.length_type,
    );
    const sampleSize = rows.reduce((sum, item) => sum + item.frequency, 0);
    const share = (predicate: (length: number) => boolean) =>
      sampleSize
        ? (rows
            .filter((item) => predicate(item.length_cm))
            .reduce((sum, item) => sum + item.frequency, 0) /
            sampleSize) *
          100
        : null;
    return {
      sampleSize,
      minimum: rows.length
        ? Math.min(...rows.map((item) => item.length_cm))
        : null,
      maximum: rows.length
        ? Math.max(...rows.map((item) => item.length_cm))
        : null,
      pmat: share((length) => length >= reference.lm),
      popt: share(
        (length) =>
          length >= reference.lopt * 0.9 && length <= reference.lopt * 1.1,
      ),
      pmega: share((length) => length > reference.lopt * 1.1),
    };
  }, [snapshot, references, referenceId]);

  const complete = async () => {
    if (!dashboard) return;
    const next = updateAnalysisProgress(
      dashboard.dashboard_config,
      type,
      "completed",
    );
    const { error } = await supabase
      .from("datasets")
      .update({
        dashboard_config: next,
        import_status: "ready",
        draft_expires_at: null,
      })
      .eq("id", dashboardId);
    if (error) setMessage("Status analisis tidak dapat disimpan.");
    else {
      setDashboard({ ...dashboard, dashboard_config: next });
      setMessage("Analisis ditandai selesai.");
    }
  };

  if (busy && !dashboard)
    return (
      <div className="flex flex-1 justify-center rounded-2xl bg-white p-10 shadow-md">
        <SpinnerLoading size="sm" color="black" />
      </div>
    );
  if (!dashboard)
    return (
      <div className="rounded-xl bg-red-50 p-4 text-red-700">{message}</div>
    );
  const title = ANALYSIS_OPTIONS.find(([value]) => value === type)?.[1] ?? type;
  const workspaceHref = `/profile/data/${toSlug(dashboard.label)}?view=dashboard&step=4`;
  if (!dashboard.dashboard_config.selectedAnalyses.includes(type))
    return (
      <div className="rounded-xl bg-amber-50 p-4 text-amber-800">
        Analisis ini tidak termasuk dalam dashboard.
      </div>
    );
  if (!dashboard.fisheries_dataset_id)
    return (
      <section className="flex-1 rounded-2xl bg-white p-5 shadow-md">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-3 text-amber-800">
          Hubungkan atau impor sumber data bersama dari halaman dashboard
          terlebih dahulu.
        </p>
        <a
          className="mt-4 inline-block text-sky-800 underline"
          href={workspaceHref}
        >
          Kembali ke dashboard
        </a>
      </section>
    );

  return (
    <section className="min-w-0 flex-1 rounded-2xl bg-white p-5 shadow-md">
      <a className="text-sm text-sky-800 underline" href={workspaceHref}>
        Kembali ke dashboard
      </a>
      <h1 className="mt-2 text-2xl font-bold">{title}</h1>
      <p className="text-sm text-stone-600">{dashboard.label}</p>
      <div className="mt-5 grid gap-2 md:grid-cols-5">
        <input
          type="date"
          value={filters.dateFrom}
          onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
          className="rounded-md border p-2 text-sm"
          aria-label="Tanggal mulai"
        />
        <input
          type="date"
          value={filters.dateTo}
          onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
          className="rounded-md border p-2 text-sm"
          aria-label="Tanggal selesai"
        />
        {(["gear", "landing", "wpp"] as const).map((key) => (
          <select
            key={key}
            value={filters[key]}
            onChange={(e) => setFilters({ ...filters, [key]: e.target.value })}
            className="rounded-md border p-2 text-sm"
          >
            <option value="">
              {key === "gear"
                ? "Semua alat"
                : key === "landing"
                  ? "Semua pendaratan"
                  : "Semua WPP"}
            </option>
            {(key === "gear"
              ? snapshot?.filters.gears
              : key === "landing"
                ? snapshot?.filters.landingLocations
                : snapshot?.filters.wpps
            )?.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        ))}
      </div>
      <div className="mt-3 flex justify-end">
        <Button loading={busy} onClick={() => void load()}>
          Terapkan filter
        </Button>
      </div>
      {snapshot && (
        <div className="mt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Trip", snapshot.tripCount],
              ["Kapal", snapshot.vesselCount],
              ["Total kg", number(snapshot.totalWeightKg)],
              ["Individu", number(snapshot.totalIndividuals, 0)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border p-4">
                <div className="text-xs text-stone-500">{label}</div>
                <div className="text-xl font-bold">{value}</div>
              </div>
            ))}
          </div>
          {type === "cpue" && (
            <ResultTable
              headers={["Metode", "Nilai", "Pembilang", "Penyebut"]}
              rows={cpue.map((item) => [
                item.label,
                item.value == null ? "Tidak tersedia" : number(item.value),
                number(item.numerator),
                number(item.denominator),
              ])}
            />
          )}
          {type === "total-landing" && (
            <ResultTable
              headers={["Spesies", "Berat (kg)", "Individu"]}
              rows={snapshot.species.map((item) => [
                item.scientific_name,
                number(item.weight_kg),
                number(item.individuals, 0),
              ])}
            />
          )}
          {type === "landing-frequency" && (
            <ResultTable
              headers={["Spesies", "Trip pendaratan", "Frekuensi"]}
              rows={snapshot.species.map((item) => [
                item.scientific_name,
                number(item.landing_trips, 0),
                snapshot.tripCount
                  ? `${number((item.landing_trips / snapshot.tripCount) * 100)}%`
                  : "0%",
              ])}
            />
          )}
          {type === "catch-composition" && (
            <ResultTable
              headers={["Spesies", "Berat", "Komposisi berat"]}
              rows={snapshot.species.map((item) => [
                item.scientific_name,
                number(item.weight_kg),
                snapshot.totalWeightKg
                  ? `${number((item.weight_kg / snapshot.totalWeightKg) * 100)}%`
                  : "0%",
              ])}
            />
          )}
          {type === "lbi" && (
            <div className="space-y-3 rounded-lg bg-sky-50 p-4 text-sm text-sky-900">
              <label className="block font-medium">
                Referensi biologis yang disetujui
                <select
                  value={referenceId}
                  onChange={(event) => setReferenceId(event.target.value)}
                  className="mt-1 w-full rounded-md border bg-white p-2"
                >
                  <option value="">Pilih spesies dan referensi</option>
                  {references.map((reference) => {
                    const species = snapshot.species.find(
                      (item) => item.species_id === reference.species_id,
                    );
                    return (
                      <option key={reference.id} value={reference.id}>
                        {species?.scientific_name ?? reference.species_id} ·{" "}
                        {reference.length_type} · v{reference.version}
                      </option>
                    );
                  })}
                </select>
              </label>
              {lbi && (
                <ResultTable
                  headers={["Indikator", "Nilai"]}
                  rows={[
                    ["Jumlah sampel", number(lbi.sampleSize, 0)],
                    [
                      "Panjang minimum",
                      lbi.minimum == null ? "—" : number(lbi.minimum),
                    ],
                    [
                      "Panjang maksimum",
                      lbi.maximum == null ? "—" : number(lbi.maximum),
                    ],
                    ["Pmat", lbi.pmat == null ? "—" : `${number(lbi.pmat)}%`],
                    ["Popt", lbi.popt == null ? "—" : `${number(lbi.popt)}%`],
                    [
                      "Pmega",
                      lbi.pmega == null ? "—" : `${number(lbi.pmega)}%`,
                    ],
                  ]}
                />
              )}
              {!references.length && (
                <p>
                  Tidak ada referensi biologis approved yang cocok dengan
                  spesies dan tipe panjang pada dataset.
                </p>
              )}
            </div>
          )}
        </div>
      )}
      <div className="mt-5 flex justify-end">
        <Button
          disabled={
            !snapshot || (type === "lbi" && (!lbi || lbi.sampleSize === 0))
          }
          onClick={() => void complete()}
        >
          Tandai analisis selesai
        </Button>
      </div>
      {message && (
        <p role="status" className="mt-3 text-sm text-sky-800">
          {message}
        </p>
      )}
    </section>
  );
}

function ResultTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: Array<Array<string | number>>;
}) {
  return (
    <div className="max-h-[32rem] overflow-auto rounded-xl border">
      <table className="min-w-full text-sm">
        <thead className="sticky top-0 bg-sky-100">
          <tr>
            {headers.map((header) => (
              <th key={header} className="p-3 text-left">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-t">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="p-3">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
