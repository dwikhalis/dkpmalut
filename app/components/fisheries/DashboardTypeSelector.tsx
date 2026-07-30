"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/app/components/Button";
import { useAuthStore } from "@/app/Stores/authStores";
import { supabase } from "@/lib/supabase/supabaseClient";
import { createDashboardConfiguration } from "@/lib/fisheries/dashboardOrchestration";

export const ANALYSIS_OPTIONS = [
  ["lbi", "Length Based Indicator (LBI)"],
  ["cpue", "Catch per Unit Effort (CPUE)"],
  ["total-landing", "Total Pendaratan"],
  ["landing-frequency", "Frekuensi Pendaratan"],
  ["catch-composition", "Komposisi Hasil Tangkapan"],
] as const;
type Analysis = (typeof ANALYSIS_OPTIONS)[number][0];

function toSlug(value: string) {
  return value
    .toLocaleLowerCase("id-ID")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function DashboardTypeSelector() {
  const router = useRouter();
  const userId = useAuthStore((state) => state.userId);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"single" | "multiple">("single");
  const [single, setSingle] = useState<Analysis | "">("");
  const [multiple, setMultiple] = useState<Analysis[]>([]);
  const toggle = (value: Analysis) =>
    setMultiple((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  const submit = async () => {
    if (!userId || !name.trim()) return;
    const selected = mode === "single" ? (single ? [single] : []) : multiple;
    try {
      setSaving(true);
      setError("");
      const config = createDashboardConfiguration(mode, selected);
      const { error: insertError } = await supabase.from("datasets").insert({
        user_id: userId,
        label: name.trim(),
        kind: "dashboard",
        data: [],
        column_config: [],
        import_status: "draft",
        draft_expires_at: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        dashboard_config: config,
      });
      if (insertError) throw insertError;
      router.push(`/profile/data/${toSlug(name)}?view=dashboard&step=1`);
    } catch (cause) {
      console.error("Dashboard parent creation failed:", cause);
      setError(
        "Dashboard gagal dibuat. Pastikan migrasi dashboard sudah diterapkan.",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-md">
      <h2 className="text-xl font-bold">Pilih jenis dashboard</h2>
      <label className="mt-5 block max-w-md text-sm font-medium">
        Nama dashboard
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2"
          placeholder="Contoh: Dashboard Pendaratan 2026"
        />
      </label>
      <label className="mt-5 block max-w-md text-sm font-medium">
        Mode analisis
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as typeof mode)}
          className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2"
        >
          <option value="single">Analisis tunggal</option>
          <option value="multiple">Beberapa analisis</option>
        </select>
      </label>
      <fieldset className="mt-6">
        <legend className="font-semibold">
          {mode === "single"
            ? "Pilih satu analisis"
            : "Pilih analisis yang disertakan"}
        </legend>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {ANALYSIS_OPTIONS.map(([value, label]) => {
            const checked =
              mode === "single" ? single === value : multiple.includes(value);
            return (
              <label
                key={value}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 ${checked ? "border-sky-700 bg-sky-50 ring-1 ring-sky-700" : "border-stone-200 hover:border-sky-400"}`}
              >
                <input
                  type={mode === "single" ? "radio" : "checkbox"}
                  name={mode === "single" ? "analysis" : undefined}
                  checked={checked}
                  onChange={() =>
                    mode === "single" ? setSingle(value) : toggle(value)
                  }
                  className="size-4 accent-sky-800"
                />
                <span className="font-medium">{label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <div className="mt-6 flex justify-end">
        <Button
          loading={saving}
          disabled={
            !name.trim() || (mode === "single" ? !single : multiple.length < 2)
          }
          onClick={submit}
        >
          Buat Dashboard
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
