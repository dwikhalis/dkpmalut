"use client";

import { useEffect, useState } from "react";
import Button from "@/app/components/Button";
import { supabase } from "@/lib/supabase/supabaseClient";
import FisheriesBatchMapper from "./FisheriesBatchMapper";
import { compatibleAnalyses } from "@/lib/fisheries/datasetCompatibility";
import type { FisheriesAnalysisType } from "@/lib/fisheries/dashboardOrchestration";

type Source = {
  id: string;
  dataset_name: string;
  version: number;
  field_inventory: Record<string, unknown>;
  import_completed_at: string | null;
};

export default function FisheriesSourcePanel({
  dashboardId,
  attachedSourceId,
  onAttached,
  analyses,
  requirementSettings,
}: {
  dashboardId: string;
  attachedSourceId?: string | null;
  onAttached: (id: string | null) => void;
  analyses: FisheriesAnalysisType[];
  requirementSettings?: {
    cpueMethods: string[];
    compositionBases: string[];
    lbiMeasurementType?: "total_length" | "fork_length";
  };
}) {
  const [sources, setSources] = useState<Source[]>([]);
  const [selected, setSelected] = useState("");
  const [files, setFiles] = useState<Record<string, File | null>>({
    trips: null,
    catches: null,
    effort: null,
    lengths: null,
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [batchId, setBatchId] = useState<string | null>(null);
  const isCompatible = (source: Source) => {
    const inventory = source.field_inventory as Parameters<
      typeof compatibleAnalyses
    >[1];
    const baseCompatible = Object.values(
      compatibleAnalyses(analyses, inventory),
    ).every((result) => result.compatible);
    const available = (key: string) =>
      inventory[key]?.present && inventory[key].validCount > 0;
    const cpue = requirementSettings?.cpueMethods ?? [];
    const composition = requirementSettings?.compositionBases ?? [];
    return (
      baseCompatible &&
      (!cpue.some((method) => method !== "individuals_per_trip") ||
        available("catch_weight_kg")) &&
      (!cpue.includes("individuals_per_trip") ||
        available("individual_count")) &&
      (!cpue.includes("kg_per_hour") || available("fishing_duration_hours")) &&
      (!cpue.includes("kg_per_setting") || available("number_of_settings")) &&
      (!cpue.includes("kg_per_100_hooks") || available("number_of_hooks")) &&
      (!cpue.includes("kg_per_100m_net") || available("net_length")) &&
      (!composition.includes("weight") || available("catch_weight_kg")) &&
      (!composition.includes("individuals") || available("individual_count"))
    );
  };
  useEffect(() => {
    void Promise.all([
      supabase
        .from("fisheries_datasets")
        .select("id,dataset_name,version,field_inventory,import_completed_at")
        .not("import_completed_at", "is", null)
        .order("updated_at", { ascending: false }),
      supabase
        .from("fisheries_import_batches")
        .select("id")
        .eq("dashboard_id", dashboardId)
        .in("status", ["pending", "validating", "failed"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]).then(([sourceResult, batchResult]) => {
      setSources((sourceResult.data ?? []) as Source[]);
      setBatchId(batchResult.data?.id ?? null);
    });
  }, [dashboardId]);

  const attach = async () => {
    if (!selected) return;
    setBusy(true);
    setMessage("");
    const { error } = await supabase.rpc(
      "attach_fisheries_source_to_dashboard",
      {
        p_dashboard_id: dashboardId,
        p_fisheries_dataset_id: selected,
      },
    );
    if (error) {
      console.error("Attach fisheries source failed:", error);
      setMessage("Sumber data tidak dapat digunakan.");
    } else {
      onAttached(selected);
      setMessage("Sumber data berhasil digunakan.");
    }
    setBusy(false);
  };
  const detach = async () => {
    setBusy(true);
    setMessage("");
    const { error } = await supabase.rpc(
      "detach_fisheries_source_from_dashboard",
      { p_dashboard_id: dashboardId },
    );
    if (error) {
      console.error("Detach fisheries source failed:", error);
      setMessage("Sumber data tidak dapat dilepas.");
    } else {
      setSelected("");
      onAttached(null);
      setMessage(
        "Sumber data dilepas. Dataset asli tetap aman dan dapat digunakan kembali.",
      );
    }
    setBusy(false);
  };
  const exportOriginals = async () => {
    if (!attachedSourceId) return;
    setBusy(true);
    const session = await supabase.auth.getSession();
    const response = await fetch(
      `/api/fisheries-source-files?dataset_id=${encodeURIComponent(attachedSourceId)}`,
      {
        headers: {
          Authorization: `Bearer ${session.data.session?.access_token ?? ""}`,
        },
      },
    );
    const result = (await response.json()) as {
      message?: string;
      downloads?: Array<{ name: string; url: string }>;
    };
    if (!response.ok) setMessage(result.message ?? "Ekspor gagal.");
    else if (!result.downloads?.length)
      setMessage("Tidak ada file asli yang tersimpan.");
    else {
      result.downloads.forEach((file) => {
        const anchor = document.createElement("a");
        anchor.href = file.url;
        anchor.download = file.name;
        anchor.click();
      });
      setMessage("Tautan ekspor privat dibuat dan berlaku selama 60 detik.");
    }
    setBusy(false);
  };
  const upload = async () => {
    const chosen = Object.entries(files).filter(
      (entry): entry is [string, File] => entry[1] instanceof File,
    );
    if (!chosen.length) return;
    setBusy(true);
    setMessage("");
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token ?? "";
    const descriptors = chosen.map(([role, file]) => ({
      role,
      name: file.name,
      size: file.size,
      type: file.type || "text/csv",
    }));
    const response = await fetch("/api/fisheries-source-files", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: "initiate",
        dashboardId,
        files: descriptors,
      }),
    });
    const initiated = (await response.json()) as {
      message?: string;
      batchId?: string;
      uploads?: Array<{
        role: string;
        path: string;
        token: string;
        originalName: string;
        size: number;
        type: string;
      }>;
    };
    if (!response.ok || !initiated.batchId || !initiated.uploads) {
      setMessage(initiated.message ?? "Sesi unggah gagal dibuat.");
      setBusy(false);
      return;
    }
    for (const target of initiated.uploads) {
      const file = chosen.find(([role]) => role === target.role)?.[1];
      if (!file) continue;
      const { error } = await supabase.storage
        .from("fisheries-source-files")
        .uploadToSignedUrl(target.path, target.token, file, {
          contentType: target.type,
        });
      if (error) {
        console.error("Direct fisheries upload failed:", error);
        setMessage(
          "Salah satu file gagal diunggah. File yang berhasil tetap privat dan sesi dapat dicoba kembali.",
        );
        setBusy(false);
        return;
      }
    }
    const complete = await fetch("/api/fisheries-source-files", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: "complete",
        batchId: initiated.batchId,
        files: initiated.uploads.map((target) => ({
          role: target.role,
          name: target.originalName,
          size: target.size,
          type: target.type,
          path: target.path,
        })),
      }),
    });
    const result = (await complete.json()) as { message?: string };
    setMessage(
      complete.ok
        ? `File terverifikasi. Batch: ${initiated.batchId}`
        : (result.message ?? "Verifikasi unggahan gagal."),
    );
    if (complete.ok) setBatchId(initiated.batchId);
    setBusy(false);
  };

  return (
    <section className="mt-5 rounded-xl border border-stone-200 p-4">
      <h2 className="font-semibold">Sumber data bersama</h2>
      {attachedSourceId && (
        <p className="mt-2 rounded-lg bg-green-50 p-3 text-sm text-green-800">
          Dataset ternormalisasi terhubung: {attachedSourceId}
        </p>
      )}
      <>
        <div className="mt-3 flex flex-col gap-2 md:flex-row">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="min-w-0 flex-1 rounded-md border px-3 py-2 text-sm"
          >
            <option value="">Pilih data yang pernah diimpor</option>
            {sources.map((source) => (
              <option
                key={source.id}
                value={source.id}
                disabled={!isCompatible(source)}
              >
                {source.dataset_name} · v{source.version}
                {!isCompatible(source) ? " · tidak kompatibel" : ""}
              </option>
            ))}
          </select>
          <Button loading={busy} disabled={!selected} onClick={attach}>
            {attachedSourceId ? "Ganti data" : "Gunakan data"}
          </Button>
          {attachedSourceId && (
            <>
              <Button
                loading={busy}
                variant="outline"
                onClick={exportOriginals}
              >
                Ekspor file asli
              </Button>
              <Button loading={busy} variant="outline" onClick={detach}>
                Lepas data
              </Button>
            </>
          )}
        </div>
        <div className="my-5 border-t" />
        <p className="text-sm text-stone-600">
          Atau simpan file sumber baru. File belum dianggap terimpor sampai
          pemetaan dan validasi selesai.
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {(
            [
              ["trips", "Trips CSV"],
              ["catches", "Catches CSV"],
              ["effort", "Effort CSV (opsional)"],
              ["lengths", "Length CSV (opsional)"],
            ] as const
          ).map(([role, label]) => (
            <label key={role} className="text-sm font-medium">
              {label}
              <input
                type="file"
                accept=".csv"
                onChange={(e) =>
                  setFiles({ ...files, [role]: e.target.files?.[0] ?? null })
                }
                className="mt-1 block w-full rounded-md border p-2 text-sm"
              />
            </label>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <Button
            loading={busy}
            disabled={!Object.values(files).some(Boolean)}
            onClick={upload}
          >
            Simpan file sumber
          </Button>
        </div>
      </>
      {message && (
        <p role="status" className="mt-3 text-sm text-sky-800">
          {message}
        </p>
      )}
      {batchId && <FisheriesBatchMapper batchId={batchId} />}
    </section>
  );
}
