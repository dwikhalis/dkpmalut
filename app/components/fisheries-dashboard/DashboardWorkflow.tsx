"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "../Button";
import SpinnerLoading from "../SpinnerLoading";
import { supabase } from "@/lib/supabase/supabaseClient";
import { useAuthStore } from "@/app/Stores/authStores";
import { DASHBOARD_CONFIG, DASHBOARD_TAB_ORDER, FISHERIES_COLUMN_DESCRIPTIONS, getTemplateColumns, isDashboardTab, sortDashboardTabs, type DashboardTab } from "@/lib/fisheries-dashboard/config";
import { parseAndValidateDashboardCsv, validateTripCsvForTabs } from "@/lib/fisheries-dashboard/csv";
import type { DashboardSourceUpload, DashboardWorkflow, DashboardWorkflowMetadata, ValidationResult } from "@/lib/fisheries-dashboard/types";
import DashboardVisualizationPreview from "./DashboardVisualizationPreview";
import DatasetConfiguration from "../DatasetConfiguration";
import type { ColumnConfig } from "../DatasetTable";
import DashboardDataRows from "./DashboardDataRows";

type Props = {
  stage: "selection" | "upload" | "configuration" | "visualization" | "publication";
  onExit: () => void;
  workflowId?: string;
  detailPath?: string;
  action?: "add" | "edit" | "list" | "delete";
  onUploadReadinessChange?: (ready: boolean, missing: string[]) => void;
};
const statusLabels = { pending: "Belum diunggah", invalid: "Perlu diperbaiki", valid: "Validasi berhasil", saved: "Tersimpan" } as const;

export default function DashboardWorkflowView({ stage, onExit, workflowId: suppliedWorkflowId, detailPath, action = "list", onUploadReadinessChange }: Props) {
  const router = useRouter(); const params = useSearchParams();
  const ownerId = useAuthStore((state) => state.userId); const role = useAuthStore((state) => state.role);
  const workflowId = suppliedWorkflowId ?? params.get("workflow");
  const [workflow, setWorkflow] = useState<DashboardWorkflow | null>(null);
  const [selected, setSelected] = useState<DashboardTab[]>([]);
  const [validations, setValidations] = useState<Partial<Record<DashboardTab, ValidationResult>>>({});
  const [sourceUploads, setSourceUploads] = useState<DashboardSourceUpload[]>([]);
  const [sourcePartnerId, setSourcePartnerId] = useState<string | undefined>();
  const [fileNames, setFileNames] = useState<Partial<Record<"trip" | "length", string>>>({});
  const [activeSourceType, setActiveSourceType] = useState<"trip" | "length">("trip");
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const activeImportBatchRef = useRef<string | null>(null);
  const sourceFileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDraggingSource, setIsDraggingSource] = useState(false);
  const requestedTab = params.get("tab");
  const requestedSource = params.get("source");
  const activeTab = isDashboardTab(requestedTab) && selected.includes(requestedTab) ? requestedTab : selected[0];

  const loadWorkflow = async (id: string) => {
    const { data, error } = await supabase.from("datasets").select("id,user_id,label,column_config,chart_config,published,created_at,updated_at").eq("id", id).eq("kind", "dashboard").single();
    if (error) throw error;
    const container = (data.column_config && typeof data.column_config === "object" ? data.column_config : {}) as { dashboardWorkflow?: DashboardWorkflowMetadata };
    const meta = container.dashboardWorkflow ?? { selectedTabs: [], currentStage: "selection", activeTab: null, uploadStatus: {}, visualizationStatus: {} };
    const row: DashboardWorkflow = { id: data.id, user_id: data.user_id, label: data.label, selected_tabs: meta.selectedTabs, current_stage: meta.currentStage, active_tab: meta.activeTab, upload_status: meta.uploadStatus, visualization_status: meta.visualizationStatus, publication_status: data.published, created_at: data.created_at, updated_at: data.updated_at };
    setWorkflow(row); setSelected(sortDashboardTabs(row.selected_tabs)); setSourcePartnerId(meta.sourcePartnerId);
    const { data: sources } = await supabase.from("dataset_import_batches").select("id,dataset_id,source_type,row_count,compatible_tabs,created_at").eq("dataset_id", id).not("source_type", "is", null);
    const mapped = (sources ?? []).map((source) => ({ id: source.id, workflow_id: source.dataset_id, source_type: source.source_type, source_table: source.source_type === "trip" ? "dataset_fish_trip" : "dataset_fish_length", row_count: source.row_count, compatible_tabs: source.compatible_tabs, created_at: source.created_at })) as DashboardSourceUpload[];
    if (meta.sourcePartnerId && mapped.length === 0) {
      const now = data.updated_at; mapped.push({ id: `partner:${meta.sourcePartnerId}:trip`, workflow_id: id, source_type: "trip", source_table: "dataset_fish_trip", row_count: 0, compatible_tabs: ["cpue","totallanding","composition"], created_at: now }, { id: `partner:${meta.sourcePartnerId}:length`, workflow_id: id, source_type: "length", source_table: "dataset_fish_length", row_count: 0, compatible_tabs: ["lengthfrequency"], created_at: now });
    }
    setSourceUploads(mapped);
  };
  useEffect(() => { if (!workflowId) return; void loadWorkflow(workflowId).catch((error) => setMessage(error.message)); }, [workflowId]);
  useEffect(() => () => {
    if (activeImportBatchRef.current) {
      void supabase.rpc("abort_fisheries_dashboard_import", { p_batch_id: activeImportBatchRef.current });
    }
  }, []);
  useEffect(() => { if (!workflow || !selected.length) return; if (isDashboardTab(requestedTab) && selected.includes(requestedTab)) return; const next = new URLSearchParams(params.toString()); next.set("tab", selected[0]); router.replace(`${detailPath ?? "/profile/data"}?${next}`); }, [detailPath, params, requestedTab, router, selected, workflow]);

  const navigate = (routeAction: string, id: string, tab?: DashboardTab) => {
    const next = new URLSearchParams();
    if (detailPath) {
      if (routeAction === "dashboardvisualize") next.set("view", "visualization");
      if (routeAction === "dashboardpublish") next.set("view", "publication");
      if (routeAction === "dashboardadd" && action === "add") next.set("action", "add");
    } else {
      next.set("action", routeAction);
      next.set("workflow", id);
    }
    if (tab) next.set("tab", tab);
    router.push(`${detailPath ?? "/profile/data"}?${next}`);
  };
  const saveSelection = async () => {
    if (!ownerId || !selected.length) return; setBusy(true); setMessage("");
    try {
      const uploadStatus = Object.fromEntries(selected.map((tab) => [tab, workflow?.upload_status?.[tab] ?? "pending"]));
      const visualizationStatus = Object.fromEntries(selected.map((tab) => [tab, workflow?.visualization_status?.[tab] ?? "pending"]));
      if (workflow) {
        const { error } = await supabase.from("datasets").update({ column_config: { dashboardWorkflow: { selectedTabs: selected, currentStage: "upload", activeTab: selected[0], uploadStatus, visualizationStatus, sourcePartnerId } } }).eq("id", workflow.id); if (error) throw error;
        navigate("dashboardadd", workflow.id, selected[0]);
      } else {
        const { data, error } = await supabase.from("datasets").insert({ user_id: ownerId, label: "Dashboard Perikanan", kind: "dashboard", data: [], column_config: { dashboardWorkflow: { selectedTabs: selected, currentStage: "upload", activeTab: selected[0], uploadStatus, visualizationStatus } }, chart_config: {}, published_config: {} }).select("id").single(); if (error) throw error;
        navigate("dashboardadd", data.id, selected[0]);
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : "Workflow gagal disimpan."); } finally { setBusy(false); }
  };

  const sourceTabs = (type: "trip" | "length") => selected.filter((tab) => DASHBOARD_CONFIG[tab].templateType === type);
  const sourceRequiredColumns = (type: "trip" | "length") => Array.from(new Set([
    ...sourceTabs(type).flatMap((tab) => [...DASHBOARD_CONFIG[tab].requiredColumns]),
  ]));
  const sourceTemplateHref = (type: "trip" | "length") => {
    const columns = sourceRequiredColumns(type);
    return `data:text/csv;charset=utf-8,${encodeURIComponent(`${columns.join(",")}\r\n`)}`;
  };
  const downloadTemplate = (tab: DashboardTab) => {
    const anchor = document.createElement("a");
    anchor.href = sourceTemplateHref(DASHBOARD_CONFIG[tab].templateType);
    anchor.download = `template-data-${DASHBOARD_CONFIG[tab].templateType}.csv`;
    anchor.click();
  };
  const handleFile = async (file: File, type: "trip" | "length" = activeTab ? DASHBOARD_CONFIG[activeTab].templateType : "trip") => {
    if (!file.name.toLowerCase().endsWith(".csv")) { setMessage("Pilih file CSV UTF-8."); return; }
    const text = await file.text();
    setFileNames((current) => ({ ...current, [type]: file.name }));
    const next = type === "trip" ? validateTripCsvForTabs(text, selected) : { lengthfrequency: parseAndValidateDashboardCsv(text, "lengthfrequency") };
    setValidations((current) => ({ ...current, ...next }));
    if (workflow) {
      const statuses = { ...workflow.upload_status }; Object.entries(next).forEach(([tab, result]) => { statuses[tab as DashboardTab] = result?.valid ? "valid" : "invalid"; });
      await supabase.from("datasets").update({ column_config: { dashboardWorkflow: { selectedTabs: selected, currentStage: workflow.current_stage, activeTab, uploadStatus: statuses, visualizationStatus: workflow.visualization_status, sourcePartnerId } } }).eq("id", workflow.id); await loadWorkflow(workflow.id);
    }
  };
  const activeValidation = validations[sourceTabs(activeSourceType)[0]];
  const saveSource = async (typeOrEvent?: unknown) => {
    const type: "trip" | "length" = typeOrEvent === "trip" || typeOrEvent === "length" ? typeOrEvent : activeSourceType;
    const validation = validations[sourceTabs(type)[0]];
    if (!workflow || !validation?.valid) return;
    const compatible = selected.filter((tab) => DASHBOARD_CONFIG[tab].templateType === type && validations[tab]?.valid);
    setBusy(true); setUploadProgress(0);
    let batchId: string | null = null;
    let finalized = false;
    let uploadPhase = "memulai sesi upload";
    try {
      const { data: startedBatchId, error: beginError } = await supabase.rpc("begin_fisheries_dashboard_import", {
        p_dataset_id: workflow.id, p_source_type: type,
        p_compatible_tabs: compatible, p_total_rows: validation.rows.length,
      });
      if (beginError) throw beginError;
      batchId = startedBatchId as string;
      activeImportBatchRef.current = batchId;
      const chunkSize = 100;
      for (let offset = 0; offset < validation.rows.length; offset += chunkSize) {
        const chunk = validation.rows.slice(offset, offset + chunkSize);
        uploadPhase = `menyimpan baris ${offset + 1}-${offset + chunk.length}`;
        const { error: chunkError } = await supabase.rpc("append_fisheries_dashboard_import_chunk", {
          p_batch_id: batchId, p_offset: offset, p_rows: chunk,
        });
        if (chunkError) throw chunkError;
        setUploadProgress(Math.min(95, Math.round(Math.min(offset + chunk.length, validation.rows.length) / validation.rows.length * 95)));
      }
      uploadPhase = "menyelesaikan upload";
      const { error: finalizeError } = await supabase.rpc("finalize_fisheries_dashboard_import", { p_batch_id: batchId });
      if (finalizeError) throw finalizeError;
      finalized = true;
      activeImportBatchRef.current = null;
      setUploadProgress(100);
      setMessage(`Data ${type === "trip" ? "trip" : "panjang"} tersimpan satu kali untuk ${compatible.map((tab) => DASHBOARD_CONFIG[tab].label).join(", ")}.`);
      try { await loadWorkflow(workflow.id); } catch { setMessage("Data berhasil disimpan. Muat ulang halaman untuk memperbarui status workflow."); }
    } catch (error) {
      let cleanupSucceeded = true;
      if (batchId && !finalized) {
        const { error: cleanupError } = await supabase.rpc("abort_fisheries_dashboard_import", { p_batch_id: batchId });
        cleanupSucceeded = !cleanupError;
      }
      activeImportBatchRef.current = null;
      setUploadProgress(0);
      setValidations((current) => {
        const next = { ...current };
        sourceTabs(type).forEach((tab) => { delete next[tab]; });
        return next;
      });
      setFileNames((current) => {
        const next = { ...current };
        delete next[type];
        return next;
      });
      const errorMessage = error instanceof Error ? error.message : typeof error === "object" && error !== null && "message" in error ? String(error.message) : "Data gagal disimpan.";
      const cleanupMessage = cleanupSucceeded ? "Semua chunk parsial telah dibersihkan." : "Pembersihan otomatis juga mengalami timeout; hapus batch upload yang belum selesai sebelum mencoba lagi.";
      setMessage(finalized ? `Data berhasil disimpan, tetapi pembaruan tampilan gagal: ${errorMessage}` : `Gagal saat ${uploadPhase}: ${errorMessage} ${cleanupMessage}`);
    } finally { setBusy(false); }
  };
  const allUploadsSaved = selected.length > 0 && selected.every((tab) => workflow?.upload_status?.[tab] === "saved");
  const allVisualizationsSaved = selected.length > 0 && selected.every((tab) => workflow?.visualization_status?.[tab] === "saved");
  useEffect(() => {
    if (!workflow) return;
    const requiredTypes = (["trip", "length"] as const).filter((type) => selected.some((tab) => DASHBOARD_CONFIG[tab].templateType === type));
    const missing = requiredTypes.filter((type) => selected.filter((tab) => DASHBOARD_CONFIG[tab].templateType === type).some((tab) => workflow.upload_status?.[tab] !== "saved")).map((type) => type === "trip" ? "Data Trip" : "Data Panjang");
    onUploadReadinessChange?.(missing.length === 0, missing);
  }, [onUploadReadinessChange, selected, workflow]);

  const saveVisualization = async () => {
    if (!workflow || !activeTab) return;
    setBusy(true); try {
      const config = { chartType: DASHBOARD_CONFIG[activeTab].defaultChart, binWidth: 1, measurementType: "TL", compositionThreshold: 2, showLegend: true, showTooltip: true };
      const { data: current } = await supabase.from("datasets").select("chart_config").eq("id", workflow.id).single();
      const chartConfig = { ...((current?.chart_config && typeof current.chart_config === "object") ? current.chart_config : {}), [activeTab]: { sourceUserId: workflow.user_id, title: DASHBOARD_CONFIG[activeTab].label, description: DASHBOARD_CONFIG[activeTab].description, config, filters: {}, status: "saved" } };
      const statuses = { ...workflow.visualization_status, [activeTab]: "saved" }; const { error } = await supabase.from("datasets").update({ chart_config: chartConfig, column_config: { dashboardWorkflow: { selectedTabs: selected, currentStage: "visualization", activeTab, uploadStatus: workflow.upload_status, visualizationStatus: statuses, sourcePartnerId } } }).eq("id", workflow.id); if (error) throw error; await loadWorkflow(workflow.id); setMessage("Visualisasi tersimpan.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Visualisasi gagal disimpan."); } finally { setBusy(false); }
  };
  const submitPublication = async () => { if (!workflow || !allUploadsSaved || !allVisualizationsSaved) return; setBusy(true); const { error } = await supabase.from("datasets").update({ published: "requested", column_config: { dashboardWorkflow: { selectedTabs: selected, currentStage: "publication", activeTab, uploadStatus: workflow.upload_status, visualizationStatus: workflow.visualization_status, sourcePartnerId } }, published_config: { dashboard: { selectedTabs: selected } } }).eq("id", workflow.id); setBusy(false); setMessage(error ? error.message : "Dashboard dikirim untuk persetujuan publikasi."); if (!error) await loadWorkflow(workflow.id); };
  const updatePublicationStatus = async (status: "requested" | "approved" | "rejected") => { if (!workflow || role !== "admin") return; setBusy(true); const { error } = await supabase.from("datasets").update({ published: status }).eq("id", workflow.id); setBusy(false); setMessage(error ? error.message : "Status publikasi diperbarui."); if (!error) await loadWorkflow(workflow.id); };

  if (workflowId && !workflow) return <div className="flex justify-center rounded-2xl border bg-white p-8 shadow-md"><SpinnerLoading size="sm" color="black" /></div>;
  if (stage === "selection" && (!workflowId || !workflow || workflow.current_stage === "selection")) return <section className="space-y-5"><h2 className="text-lg font-bold">Pilih Dashboard Perikanan</h2><div className="grid gap-3 md:grid-cols-2">{DASHBOARD_TAB_ORDER.map((tab) => <label key={tab} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 shadow-md ${selected.includes(tab) ? "border-sky-700 bg-sky-50" : "border-stone-200 bg-white"}`}><input type="checkbox" checked={selected.includes(tab)} onChange={() => setSelected((current) => current.includes(tab) ? current.filter((item) => item !== tab) : sortDashboardTabs([...current, tab]))} className="mt-1 size-4"/><span><strong>{DASHBOARD_CONFIG[tab].label}</strong><span className="block text-sm text-stone-600">{DASHBOARD_CONFIG[tab].description}</span></span></label>)}</div>{message && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{message}</p>}<div className="flex gap-3"><Button variant="neutral" onClick={onExit}>Batal</Button><Button disabled={!selected.length || busy} loading={busy} onClick={saveSelection}>Lanjutkan</Button></div></section>;
  if (!workflow || !activeTab) return <p className="rounded-xl bg-rose-50 p-4">Workflow atau tab tidak valid.</p>;

  const configurationColumns = Array.from(
    new Set(selected.flatMap((tab) => getTemplateColumns(tab))),
  ).map((key): ColumnConfig => ({
    key,
    label: key.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
  }));

  if (stage === "configuration") {
    return (
      <DatasetConfiguration
        datasetId={workflow.id}
        columns={configurationColumns}
        resourceKind="dataset"
        showValidation
      />
    );
  }

  if (String(stage) === "upload") {
    const requiredSources = (["trip", "length"] as const).filter((type) => sourceTabs(type).length > 0);
    const urlSource = requestedSource === "trip" || requestedSource === "length" ? requestedSource : null;
    const type = urlSource && requiredSources.includes(urlSource) ? urlSource : requiredSources.includes(activeSourceType) ? activeSourceType : requiredSources[0];
    const validation = validations[sourceTabs(type)[0]];
    const sourceSaved = sourceTabs(type).every((tab) => workflow.upload_status?.[tab] === "saved");
    return <section className="space-y-5">
      <div className="flex flex-wrap gap-2">{requiredSources.map((sourceType) => <button key={sourceType} type="button" onClick={() => { setActiveSourceType(sourceType); const next = new URLSearchParams(params.toString()); next.set("source", sourceType); router.push(`${detailPath ?? "/profile/data"}?${next}`); }} className={`rounded-lg border px-4 py-2 text-sm shadow-sm ${type === sourceType ? "border-sky-800 bg-sky-800 text-white" : "bg-white"}`}>{sourceType === "trip" ? "Data Trip" : "Data Panjang"}<span className="ml-2 text-xs">{sourceTabs(sourceType).every((tab) => workflow.upload_status?.[tab] === "saved") ? "tersimpan" : "belum tersimpan"}</span></button>)}</div>
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-md">
        <h2 className="text-lg font-bold">{type === "trip" ? "Data Trip" : "Data Panjang"}</h2>
        <p className="mt-1 text-sm text-stone-600">Digunakan untuk: {sourceTabs(type).map((tab) => DASHBOARD_CONFIG[tab].label).join(", ")}.</p>
        <div className="mt-4"><p className="text-sm font-semibold">Data minimum</p><div className="mt-2 overflow-x-auto rounded-xl border border-stone-200"><table className="min-w-full text-left text-sm"><thead className="bg-sky-100 text-sky-950"><tr><th className="px-4 py-3">Parameter</th><th className="px-4 py-3">Deskripsi</th></tr></thead><tbody className="divide-y divide-stone-200 bg-white">{sourceRequiredColumns(type).map((column) => <tr key={column}><td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold">{column}</td><td className="px-4 py-3 text-stone-700">{FISHERIES_COLUMN_DESCRIPTIONS[column] ?? "Parameter data perikanan."}</td></tr>)}</tbody></table></div></div>
        <div className="mt-4"><Button variant="primary" href={sourceTemplateHref(type)} download={`template-data-${type}.csv`}>Download Template CSV</Button></div>
        <div
          onDragOver={(event) => { event.preventDefault(); setIsDraggingSource(true); }}
          onDragLeave={(event) => { if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setIsDraggingSource(false); }}
          onDrop={(event) => { event.preventDefault(); setIsDraggingSource(false); const file = event.dataTransfer.files?.[0]; if (file) void handleFile(file, type); }}
          onClick={() => sourceFileInputRef.current?.click()}
          className={`mt-5 flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-xl border-4 border-dashed p-6 text-center transition ${isDraggingSource ? "border-sky-500 bg-sky-50" : "border-stone-300 bg-white hover:border-sky-400 hover:bg-sky-50"}`}
        >
          <input ref={sourceFileInputRef} className="hidden" type="file" accept=".csv,text/csv" onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleFile(file, type); event.target.value = ""; }} />
          <p className="text-xl font-semibold text-stone-800">Jatuhkan CSV di sini atau klik untuk memilih file</p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-500">Gunakan template yang dibuat di atas. Sistem akan memvalidasi struktur dan isi data sebelum disimpan.</p>
          {fileNames[type] && <p className="mt-4 text-sm text-stone-700">File dipilih: <span className="font-semibold">{fileNames[type]}</span></p>}
        </div>
        {validation && <div className={`mt-4 rounded-xl p-4 ${validation.valid ? "bg-emerald-50" : "bg-rose-50"}`}><p>Total {validation.totalRows} · Valid {validation.validRows} · Tidak valid {validation.invalidRows} · Diabaikan {validation.ignoredEmptyRows}</p>{validation.issues.slice(0, 20).map((entry, index) => <p key={index} className="mt-1 text-sm">{entry.row ? `Baris ${entry.row} — ` : ""}{entry.column ? `${entry.column}: ` : ""}{entry.reason}</p>)}{busy && <div className="mt-4" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={uploadProgress}><div className="mb-1 flex justify-between text-xs font-semibold"><span>Mengunggah dan memproses data</span><span>{uploadProgress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-emerald-100"><div className="h-full rounded-full bg-emerald-700 transition-[width] duration-300" style={{ width: `${uploadProgress}%` }} /></div></div>}{validation.valid && !sourceSaved && <Button className="mt-3" variant="success" disabled={busy} onClick={() => void saveSource(type)}>{busy ? `Mengunggah ${uploadProgress}%` : `Simpan Data ${type === "trip" ? "Trip" : "Panjang"}`}</Button>}</div>}
      </div>
      {message && <p className="rounded-xl bg-sky-50 p-3 text-sm">{message}</p>}
      {allUploadsSaved ? <Button onClick={() => navigate("dashboardvisualize", workflow.id, selected[0])}>Lanjut ke Visualisasi</Button> : (() => { const nextType = requiredSources.find((sourceType) => sourceType !== type); return nextType ? <Button onClick={() => { setActiveSourceType(nextType); const next = new URLSearchParams(params.toString()); next.set("source", nextType); router.push(`${detailPath ?? "/profile/data"}?${next}`); }}>Upload Data {nextType === "trip" ? "Trip" : "Panjang"}</Button> : null; })()}
    </section>;
  }

  const tabs = <div className="flex flex-wrap gap-2">{selected.map((tab) => <button key={tab} onClick={() => navigate(stage === "visualization" ? "dashboardvisualize" : stage === "publication" ? "dashboardpublish" : "dashboardadd", workflow.id, tab)} className={`rounded-lg border px-3 py-2 text-sm shadow-sm ${activeTab === tab ? "border-sky-800 bg-sky-800 text-white" : "bg-white"}`}>{DASHBOARD_CONFIG[tab].label}<span className="ml-2 text-xs">{stage === "visualization" ? workflow.visualization_status?.[tab] ?? "pending" : statusLabels[workflow.upload_status?.[tab] ?? "pending"]}</span></button>)}</div>;
  if (detailPath && action === "add") {
    return <div className="space-y-4">{tabs}<DashboardDataRows tab={activeTab} userId={workflow.user_id} /></div>;
  }
  if (stage === "upload") return <section className="space-y-5">{tabs}<div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-md"><h2 className="text-lg font-bold">{DASHBOARD_CONFIG[activeTab].label}</h2><p className="text-sm text-stone-600">Kolom wajib: {DASHBOARD_CONFIG[activeTab].requiredColumns.join(", ")}</p><p className="text-sm text-stone-500">Kolom opsional: {DASHBOARD_CONFIG[activeTab].optionalColumns.join(", ")}</p><div className="mt-4 flex flex-wrap gap-3"><Button variant="outline" onClick={() => downloadTemplate(activeTab)}>Unduh Template CSV</Button><label className="cursor-pointer rounded-lg border-2 border-dashed border-stone-300 px-5 py-3 text-sm hover:bg-stone-50"><input className="hidden" type="file" accept=".csv,text/csv" onChange={(event) => event.target.files?.[0] && void handleFile(event.target.files[0])}/>{fileNames[DASHBOARD_CONFIG[activeTab].templateType] ?? "Drag CSV atau klik untuk memilih"}</label></div>{activeValidation && <div className={`mt-4 rounded-xl p-4 ${activeValidation.valid ? "bg-emerald-50" : "bg-rose-50"}`}><p>Total {activeValidation.totalRows} Â· Valid {activeValidation.validRows} Â· Tidak valid {activeValidation.invalidRows} Â· Diabaikan {activeValidation.ignoredEmptyRows}</p>{activeValidation.issues.slice(0, 20).map((entry, index) => <p key={index} className="mt-1 text-sm">{entry.row ? `Baris ${entry.row} â€” ` : ""}{entry.column ? `${entry.column}: ` : ""}{entry.reason}</p>)}{activeValidation.valid && <Button className="mt-3" variant="success" loading={busy} onClick={saveSource}>Simpan</Button>}</div>}</div>{message && <p className="rounded-xl bg-sky-50 p-3 text-sm">{message}</p>}<Button disabled={!allUploadsSaved} onClick={() => navigate("dashboardvisualize", workflow.id, selected[0])}>Lanjut ke Visualisasi</Button></section>;
  if (stage === "visualization" && !allUploadsSaved) {
    const missingTypes = (["trip", "length"] as const).filter((type) => sourceTabs(type).length > 0 && sourceTabs(type).some((tab) => workflow.upload_status?.[tab] !== "saved"));
    const firstMissing = missingTypes[0];
    return <section className="space-y-4"><div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">Visualisasi belum tersedia. Upload {missingTypes.map((type) => type === "trip" ? "Data Trip" : "Data Panjang").join(" dan ")} terlebih dahulu.</div>{firstMissing && <Button onClick={() => { const next = new URLSearchParams(); next.set("source", firstMissing); router.push(`${detailPath ?? "/profile/data"}?${next}`); }}>Upload Data {firstMissing === "trip" ? "Trip" : "Panjang"}</Button>}</section>;
  }
  if (stage === "visualization") { return <section className="space-y-5">{tabs}<div className="rounded-2xl border bg-white p-5 shadow-md"><h2 className="text-lg font-bold">{DASHBOARD_CONFIG[activeTab].label}</h2><p className="mt-2 text-sm">Visualisasi otomatis: {DASHBOARD_CONFIG[activeTab].defaultChart}. Konfigurasi tidak mengubah data mentah.</p><div className="mt-4"><DashboardVisualizationPreview tab={activeTab} userId={workflow.user_id} /></div><Button className="mt-4" variant="success" loading={busy} onClick={saveVisualization}>Simpan Visualisasi</Button></div><Button disabled={!allVisualizationsSaved} onClick={() => navigate("dashboardpublish", workflow.id, selected[0])}>Lanjut ke Publikasi</Button>{message && <p className="rounded-xl bg-sky-50 p-3 text-sm">{message}</p>}</section>; }
  return <section className="space-y-5">{tabs}<div className="rounded-2xl border bg-white p-5 shadow-md"><h2 className="text-lg font-bold">Publikasi Dashboard Perikanan</h2>{selected.map((tab) => <article key={tab} className="mt-3 rounded-xl border p-4"><strong>{DASHBOARD_CONFIG[tab].label}</strong><p className="text-sm text-stone-600">{DASHBOARD_CONFIG[tab].description}</p></article>)}<p className="mt-4 text-sm">Status: {workflow.publication_status ?? "draft"}</p>{role === "admin" && workflow.publication_status && <label className="mt-4 flex max-w-xs flex-col gap-1 text-sm font-semibold">Persetujuan<select value={workflow.publication_status} onChange={(event) => void updatePublicationStatus(event.target.value as "requested" | "approved" | "rejected")} className="rounded-lg border px-3 py-2 font-normal"><option value="requested">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></label>}</div>{workflow.publication_status === null && <Button disabled={!allUploadsSaved || !allVisualizationsSaved || busy} loading={busy} onClick={submitPublication}>Kirim untuk Publikasi</Button>}{message && <p className="rounded-xl bg-sky-50 p-3 text-sm">{message}</p>}</section>;
}

