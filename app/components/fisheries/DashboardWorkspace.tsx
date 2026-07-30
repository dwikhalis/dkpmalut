"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/supabaseClient";
import SpinnerLoading from "@/app/components/SpinnerLoading";
import { useAuthStore } from "@/app/Stores/authStores";
import {
  changeSelectedAnalyses,
  type DashboardConfiguration,
  type FisheriesAnalysisType,
} from "@/lib/fisheries/dashboardOrchestration";
import { ANALYSIS_OPTIONS } from "./DashboardTypeSelector";
import FisheriesSourcePanel from "./FisheriesSourcePanel";
import FisheriesRequirementsPanel from "./FisheriesRequirementsPanel";

const STEPS = [
  ["Analisis", "Pilih analisis"],
  ["Kebutuhan", "Atur kebutuhan data"],
  ["Data", "Pilih sumber data"],
  ["Proses", "Jalankan analisis"],
  ["Publikasi", "Tinjau dan publikasi"],
] as const;

const ANALYSIS_STATUS_LABELS: Record<
  DashboardConfiguration["analysisProgress"][FisheriesAnalysisType]["status"],
  string
> = {
  not_started: "Belum dimulai",
  metadata: "Melengkapi informasi",
  upload: "Menyiapkan data",
  validation: "Memeriksa data",
  preview: "Siap ditinjau",
  completed: "Selesai",
};

function publicationLabel(
  status: "requested" | "approved" | "rejected" | null,
) {
  if (status === "requested") return "Menunggu persetujuan";
  if (status === "approved") return "Sudah dipublikasi";
  if (status === "rejected") return "Perlu diperbaiki";
  return "Draft";
}

function publicationClass(
  status: "requested" | "approved" | "rejected" | null,
) {
  if (status === "requested") return "bg-amber-100 text-amber-800";
  if (status === "approved") return "bg-green-100 text-green-800";
  if (status === "rejected") return "bg-red-100 text-red-800";
  return "bg-violet-100 text-violet-800";
}

export default function DashboardWorkspace({ id }: { id: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const role = useAuthStore((state) => state.role);
  const [row, setRow] = useState<{
    label: string;
    dashboard_config: DashboardConfiguration;
    fisheries_dataset_id: string | null;
    published: "requested" | "approved" | "rejected" | null;
  } | null>(null);
  const [error, setError] = useState("");

  const requestedStep = Number(searchParams.get("step") ?? "1");
  const hasExplicitStep =
    searchParams.has("step") &&
    Number.isInteger(requestedStep) &&
    requestedStep >= 1 &&
    requestedStep <= 5
      ? true
      : false;
  const stepHref = (step: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", "dashboard");
    params.set("step", String(step));
    return `${pathname}?${params.toString()}`;
  };

  useEffect(() => {
    void (async () => {
      const { data, error } = await supabase
        .from("datasets")
        .select("label,dashboard_config,fisheries_dataset_id,published")
        .eq("id", id)
        .eq("kind", "dashboard")
        .maybeSingle();
      if (error || !data)
        setError("Dashboard tidak ditemukan atau tidak dapat diakses.");
      else setRow(data as typeof row);
    })();
  }, [id]);

  if (error)
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
        {error}
      </div>
    );
  if (!row)
    return (
      <div className="flex flex-1 justify-center rounded-2xl bg-white p-10 shadow-md">
        <SpinnerLoading size="sm" color="black" />
      </div>
    );

  const config = row.dashboard_config;
  const requirementsReady = config.sharedDatasetStatus !== "not_started";
  const dataReady = config.sharedDatasetStatus === "imported";
  const completedCount = config.selectedAnalyses.filter((type) =>
    config.completedAnalyses.includes(type),
  ).length;
  const analysesReady = completedCount === config.selectedAnalyses.length;
  const currentStep = hasExplicitStep
    ? requestedStep
    : !requirementsReady
      ? 2
      : !dataReady
        ? 3
        : !analysesReady
          ? 4
          : 5;
  const unlockedSteps = [
    true,
    true,
    requirementsReady,
    dataReady,
    analysesReady,
  ];
  const progressPercentage = Math.round(
    ((Number(requirementsReady) + Number(dataReady) + completedCount) /
      (config.selectedAnalyses.length + 2)) *
      100,
  );

  const toggleAnalysis = async (type: FisheriesAnalysisType) => {
    const selected = config.selectedAnalyses.includes(type)
      ? config.selectedAnalyses.filter((item) => item !== type)
      : [...config.selectedAnalyses, type];
    if (!selected.length) return;
    const nextConfig = changeSelectedAnalyses(config, selected);
    const { error } = await supabase
      .from("datasets")
      .update({ dashboard_config: nextConfig })
      .eq("id", id);
    if (error) {
      console.error("Dashboard analysis membership save failed:", error);
      setError("Daftar analisis tidak dapat disimpan.");
      return;
    }
    setRow({ ...row, dashboard_config: nextConfig });
  };

  const setPublication = async (
    published: "requested" | "approved" | "rejected",
  ) => {
    const { error } = await supabase
      .from("datasets")
      .update({ published })
      .eq("id", id);
    if (error) {
      console.error("Dashboard publication update failed:", error);
      setError("Status publikasi tidak dapat disimpan.");
      return;
    }
    setRow({ ...row, published });
  };

  return (
    <section className="min-w-0 flex-1 rounded-2xl border border-stone-200 bg-white p-4 shadow-md md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${publicationClass(row.published)}`}
            >
              {publicationLabel(row.published)}
            </span>
            <span className="text-xs text-stone-500">Tersimpan otomatis</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold">{row.label}</h1>
          <p className="mt-1 text-sm text-stone-600">
            Selesaikan langkah berikut secara berurutan. Anda dapat keluar dan
            melanjutkannya kembali kapan saja.
          </p>
        </div>
        <Link
          href="/profile/data"
          className="rounded-full border border-sky-800 px-4 py-2 text-sm font-medium text-sky-800 hover:bg-sky-50"
        >
          Simpan draft &amp; keluar
        </Link>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="font-medium text-stone-700">
            Progres pembuatan dashboard
          </span>
          <span className="font-semibold text-sky-900">
            {progressPercentage}%
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-stone-100">
          <div
            className="h-full rounded-full bg-sky-700 transition-[width]"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      <nav aria-label="Langkah pembuatan dashboard" className="mt-6">
        <ol className="grid gap-2 sm:grid-cols-5">
          {STEPS.map(([shortLabel, label], index) => {
            const step = index + 1;
            const unlocked = unlockedSteps[index];
            const active = currentStep === step;
            const complete =
              step === 1
                ? true
                : step === 2
                  ? requirementsReady
                  : step === 3
                    ? dataReady
                    : step === 4
                      ? analysesReady
                      : row.published !== null;
            const content = (
              <>
                <span
                  className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    active
                      ? "bg-sky-900 text-white"
                      : complete
                        ? "bg-green-100 text-green-800"
                        : "bg-stone-100 text-stone-500"
                  }`}
                >
                  {complete && !active ? "✓" : step}
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold">
                    {shortLabel}
                  </span>
                  <span className="hidden text-[11px] text-stone-500 lg:block">
                    {label}
                  </span>
                </span>
              </>
            );
            return (
              <li key={shortLabel}>
                {unlocked ? (
                  <Link
                    href={stepHref(step)}
                    aria-current={active ? "step" : undefined}
                    className={`flex h-full items-center gap-2 rounded-xl border p-2.5 ${
                      active
                        ? "border-sky-800 bg-sky-50"
                        : "border-stone-200 hover:border-sky-400"
                    }`}
                  >
                    {content}
                  </Link>
                ) : (
                  <div
                    aria-disabled="true"
                    className="flex h-full items-center gap-2 rounded-xl border border-stone-100 bg-stone-50 p-2.5 opacity-60"
                  >
                    {content}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="mt-6 rounded-2xl border border-stone-200 bg-stone-50/60 p-4 md:p-5">
        <div className="mb-5">
          <p className="text-xs font-semibold text-sky-800">
            LANGKAH {currentStep} DARI 5
          </p>
          <h2 className="mt-1 text-xl font-bold">
            {STEPS[currentStep - 1][1]}
          </h2>
        </div>

        {currentStep === 1 && (
          <div>
            <p className="text-sm text-stone-600">
              Pilih satu atau beberapa analisis. Semua analisis akan memakai
              sumber data bersama yang sama.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {ANALYSIS_OPTIONS.map(([type, label]) => {
                const checked = config.selectedAnalyses.includes(type);
                return (
                  <label
                    key={type}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border bg-white p-4 ${
                      checked
                        ? "border-sky-700 ring-1 ring-sky-700"
                        : "border-stone-200 hover:border-sky-400"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={
                        config.selectedAnalyses.length === 1 &&
                        config.selectedAnalyses[0] === type
                      }
                      onChange={() => void toggleAnalysis(type)}
                      className="size-4 accent-sky-800"
                    />
                    <span className="font-medium">{label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div id="kebutuhan-data">
            <FisheriesRequirementsPanel
              analyses={config.selectedAnalyses}
              initialSettings={config.requirementSettings}
              onSave={async (settings) => {
                const nextConfig = {
                  ...config,
                  requirementSettings: settings,
                  sharedDatasetStatus:
                    config.sharedDatasetStatus === "not_started"
                      ? ("requirements_configured" as const)
                      : config.sharedDatasetStatus,
                };
                const { error } = await supabase
                  .from("datasets")
                  .update({ dashboard_config: nextConfig })
                  .eq("id", id);
                if (error) {
                  console.error("Dashboard requirements save failed:", error);
                  return;
                }
                setRow({ ...row, dashboard_config: nextConfig });
              }}
            />
          </div>
        )}

        {currentStep === 3 && (
          <div id="sumber-data">
            <FisheriesSourcePanel
              dashboardId={id}
              analyses={config.selectedAnalyses}
              requirementSettings={config.requirementSettings}
              attachedSourceId={row.fisheries_dataset_id}
              onAttached={(sourceId) =>
                setRow({
                  ...row,
                  fisheries_dataset_id: sourceId,
                  dashboard_config: {
                    ...row.dashboard_config,
                    sharedDatasetStatus: sourceId
                      ? "imported"
                      : "requirements_configured",
                  },
                })
              }
            />
          </div>
        )}

        {currentStep === 4 && (
          <div>
            <p className="text-sm text-stone-600">
              Buka setiap analisis, periksa hasilnya, lalu tandai selesai.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {config.selectedAnalyses.map((type) => {
                const option = ANALYSIS_OPTIONS.find(
                  ([value]) => value === type,
                );
                const progress = config.analysisProgress[type];
                const complete = progress.status === "completed";
                return (
                  <Link
                    key={type}
                    href={`/profile/data?action=dashboardanalysis&id=${id}&type=${type}`}
                    className="rounded-xl border border-stone-200 bg-white p-4 hover:border-sky-600 hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-semibold">{option?.[1]}</span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          complete
                            ? "bg-green-100 text-green-800"
                            : "bg-stone-100 text-stone-600"
                        }`}
                      >
                        {ANALYSIS_STATUS_LABELS[progress.status]}
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-medium text-sky-800">
                      {complete ? "Tinjau kembali" : "Buka analisis"} →
                    </p>
                  </Link>
                );
              })}
            </div>
            <p className="mt-4 text-sm text-stone-600">
              {completedCount} dari {config.selectedAnalyses.length} analisis
              selesai.
            </p>
          </div>
        )}

        {currentStep === 5 && (
          <div>
            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
              <h3 className="font-semibold text-green-900">
                Dashboard siap ditinjau
              </h3>
              <p className="mt-1 text-sm text-green-800">
                Semua analisis telah selesai. Tinjau hasil sebelum mengajukan
                publikasi.
              </p>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href={`/profile/data?action=dashboardanalysis&id=${id}&type=${config.selectedAnalyses[0]}`}
                className="rounded-full border border-sky-800 px-4 py-2 text-sm font-medium text-sky-800 hover:bg-sky-50"
              >
                Tinjau hasil
              </Link>
              {role === "admin" && row.published === "requested" ? (
                <>
                  <button
                    className="rounded-full bg-green-700 px-4 py-2 text-sm text-white"
                    onClick={() => void setPublication("approved")}
                  >
                    Setujui publikasi
                  </button>
                  <button
                    className="rounded-full border border-red-700 px-4 py-2 text-sm text-red-700"
                    onClick={() => void setPublication("rejected")}
                  >
                    Tolak
                  </button>
                </>
              ) : (
                <button
                  className="rounded-full bg-sky-800 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={
                    row.published === "requested" ||
                    row.published === "approved" ||
                    !analysesReady
                  }
                  onClick={() => void setPublication("requested")}
                >
                  {row.published === "approved"
                    ? "Sudah dipublikasi"
                    : row.published === "requested"
                      ? "Menunggu persetujuan"
                      : "Ajukan publikasi"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        {currentStep > 1 ? (
          <Link
            href={stepHref(currentStep - 1)}
            className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-50"
          >
            ← Sebelumnya
          </Link>
        ) : (
          <span />
        )}
        {currentStep < 5 && (
          <Link
            href={
              unlockedSteps[currentStep]
                ? stepHref(currentStep + 1)
                : stepHref(currentStep)
            }
            aria-disabled={!unlockedSteps[currentStep]}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              unlockedSteps[currentStep]
                ? "bg-sky-800 text-white hover:bg-sky-900"
                : "cursor-not-allowed bg-stone-200 text-stone-500"
            }`}
            onClick={(event) => {
              if (!unlockedSteps[currentStep]) event.preventDefault();
            }}
          >
            Selanjutnya →
          </Link>
        )}
      </div>
    </section>
  );
}
