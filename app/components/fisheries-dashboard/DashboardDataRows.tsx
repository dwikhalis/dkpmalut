"use client";

import { useRef, useState, type DragEvent } from "react";
import { supabase } from "@/lib/supabase/supabaseClient";
import { DASHBOARD_CONFIG, type DashboardTab } from "@/lib/fisheries-dashboard/config";
import { createDashboardTemplate, parseAndValidateDashboardCsv } from "@/lib/fisheries-dashboard/csv";
import type { ValidationResult } from "@/lib/fisheries-dashboard/types";

export default function DashboardDataRows({ tab, userId }: { tab: DashboardTab; userId: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [fileName, setFileName] = useState(""); const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false); const [message, setMessage] = useState("");
  const config = DASHBOARD_CONFIG[tab];

  const downloadTemplate = () => {
    const blob = new Blob([createDashboardTemplate(tab)], { type: "text/csv;charset=utf-8" });
    const anchor = document.createElement("a"); anchor.href = URL.createObjectURL(blob); anchor.download = `template-${tab}.csv`; anchor.click(); URL.revokeObjectURL(anchor.href);
  };
  const readFile = async (file: File) => {
    setFileName(file.name); setMessage("");
    setValidation(parseAndValidateDashboardCsv(await file.text(), tab));
  };
  const drop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault(); setDragging(false);
    const file = event.dataTransfer.files?.[0]; if (file) void readFile(file);
  };
  const save = async () => {
    if (!validation?.valid || !userId) return;
    setSaving(true); setMessage("");
    const payload = validation.rows.map((row) => ({ ...row, user_id: userId }));
    const { error } = await supabase.from(config.sourceTable).insert(payload);
    setSaving(false);
    if (error) { setMessage(error.message); return; }
    setMessage(`${payload.length} baris berhasil ditambahkan.`); setValidation(null); setFileName("");
  };
  const previewColumns = validation?.rows[0] ? Object.keys(validation.rows[0]) : [];

  return <div className="mb-8 w-full space-y-5">
    <section className="rounded-xl border border-sky-200 bg-sky-50 p-5">
      <h2 className="text-lg font-semibold text-sky-950">Gunakan template dataset</h2>
      <p className="mt-2 text-sm leading-6 text-stone-700">Unduh template berikut, isi data tanpa mengubah nama kolom, lalu unggah kembali sebagai CSV.</p>
      <button type="button" onClick={downloadTemplate} className="mt-4 inline-flex rounded-lg bg-sky-800 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-900">Unduh Template CSV</button>
      <div className="mt-5 overflow-x-auto rounded-lg border border-sky-200 bg-white"><table className="min-w-full text-left text-sm"><thead className="bg-sky-100 text-sky-950"><tr><th className="px-3 py-2">Kolom CSV</th><th className="px-3 py-2">Nama Data</th><th className="px-3 py-2">Tipe</th></tr></thead><tbody className="divide-y divide-stone-200">{[...config.requiredColumns, ...config.optionalColumns].map((column) => <tr key={column}><td className="px-3 py-2 font-mono text-xs">{column}</td><td className="px-3 py-2">{column.replaceAll("_", " ")}</td><td className="px-3 py-2">{column.includes("tanggal") ? "Tanggal" : "Teks/angka"}</td></tr>)}</tbody></table></div>
    </section>
    <div onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={drop} onClick={() => inputRef.current?.click()} className={`flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-xl border-4 border-dashed p-6 text-center transition ${dragging ? "border-sky-500 bg-sky-50" : "border-stone-300 bg-white hover:border-sky-400 hover:bg-sky-50"}`}>
      <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void readFile(file); event.target.value = ""; }} />
      <p className="text-xl font-semibold text-stone-800">Jatuhkan CSV di sini atau klik untuk memilih file</p><p className="mt-2 max-w-2xl text-sm leading-6 text-stone-500">Sistem memeriksa struktur kolom, nilai wajib, tanggal, dan angka sebelum penyimpanan.</p>
    </div>
    {fileName && <p className="text-sm text-stone-600">File dipilih: <strong>{fileName}</strong></p>}
    {validation && !validation.valid && <section role="alert" className="rounded-xl border border-red-300 bg-red-50 p-5 text-red-900"><h2 className="font-semibold">CSV tidak sesuai dengan struktur dataset</h2><ul className="mt-3 max-h-72 list-disc space-y-2 overflow-y-auto pl-5 text-sm">{validation.issues.slice(0, 100).map((issue, index) => <li key={index}>{issue.row ? `Baris ${issue.row} — ` : ""}{issue.column ? `${issue.column}: ` : ""}{issue.reason}</li>)}</ul></section>}
    {validation?.valid && <><section className="rounded-xl border border-emerald-300 bg-emerald-50 p-5 text-emerald-900"><h2 className="font-semibold">CSV siap ditambahkan</h2><p className="mt-1 text-sm">{validation.validRows} baris lolos pemeriksaan.</p></section><div className="max-h-[430px] overflow-auto rounded-xl border border-stone-300"><table className="min-w-max text-left text-xs"><thead className="sticky top-0 bg-stone-100"><tr>{previewColumns.map((column) => <th key={column} className="border-b border-r px-3 py-2">{column}</th>)}</tr></thead><tbody>{validation.rows.map((row, index) => <tr key={index}>{previewColumns.map((column) => <td key={column} className="border-b border-r px-3 py-2">{String(row[column] ?? "")}</td>)}</tr>)}</tbody></table></div><button type="button" disabled={saving} onClick={() => void save()} className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Menyimpan…" : `Simpan (${validation.validRows})`}</button></>}
    {message && <p className="rounded-xl bg-sky-50 p-3 text-sm">{message}</p>}
  </div>;
}
