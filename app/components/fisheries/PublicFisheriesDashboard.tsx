"use client";

import { useEffect, useState } from "react";
import SpinnerLoading from "@/app/components/SpinnerLoading";
import { supabase } from "@/lib/supabase/supabaseClient";

type Snapshot = {
  label: string;
  analyses: string[];
  updatedAt: string;
  tripCount: number;
  vesselCount: number;
  totalWeightKg: number;
  totalIndividuals: number;
  species: Array<{
    species_id: string;
    scientific_name: string;
    local_name: string | null;
    weight_kg: number;
    individuals: number;
    landing_trips: number;
  }>;
  privacyNote: string;
};

export default function PublicFisheriesDashboard({
  dashboardId,
}: {
  dashboardId: string;
}) {
  const [data, setData] = useState<Snapshot | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    void supabase
      .rpc("get_public_fisheries_dashboard_snapshot", {
        p_dashboard_id: dashboardId,
      })
      .then(({ data, error }) => {
        if (error || !data) setFailed(true);
        else setData(data as Snapshot);
      });
  }, [dashboardId]);
  if (failed)
    return (
      <main className="mx-auto max-w-6xl p-6">
        Dashboard tidak tersedia untuk publik.
      </main>
    );
  if (!data)
    return (
      <main className="flex min-h-[50vh] items-center justify-center">
        <SpinnerLoading size="sm" color="black" />
      </main>
    );
  const format = (value: number) =>
    Number(value || 0).toLocaleString("id-ID", { maximumFractionDigits: 2 });
  return (
    <main className="mx-auto min-h-[70vh] max-w-6xl p-6 md:p-10">
      <p className="text-sm font-semibold text-sky-800">
        Dashboard Perikanan Tangkap
      </p>
      <h1 className="mt-1 text-3xl font-bold">{data.label}</h1>
      <p className="mt-2 text-sm text-stone-600">
        Analisis: {data.analyses.join(", ")} · Diperbarui{" "}
        {new Date(data.updatedAt).toLocaleDateString("id-ID")}
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Trip", format(data.tripCount)],
          ["Kapal", format(data.vesselCount)],
          ["Total pendaratan (kg)", format(data.totalWeightKg)],
          ["Total individu", format(data.totalIndividuals)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="text-xs text-stone-500">{label}</div>
            <div className="text-2xl font-bold">{value}</div>
          </div>
        ))}
      </div>
      <div className="mt-6 overflow-auto rounded-xl border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-sky-100">
            <tr>
              <th className="p-3 text-left">Spesies</th>
              <th className="p-3 text-right">Berat (kg)</th>
              <th className="p-3 text-right">Individu</th>
              <th className="p-3 text-right">Trip</th>
            </tr>
          </thead>
          <tbody>
            {data.species.map((item) => (
              <tr key={item.species_id} className="border-t">
                <td className="p-3">
                  <i>{item.scientific_name}</i>
                  {item.local_name ? ` — ${item.local_name}` : ""}
                </td>
                <td className="p-3 text-right">{format(item.weight_kg)}</td>
                <td className="p-3 text-right">{format(item.individuals)}</td>
                <td className="p-3 text-right">{format(item.landing_trips)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-stone-500">{data.privacyNote}</p>
    </main>
  );
}
