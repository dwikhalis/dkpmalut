"use client";

import { useMemo, useState } from "react";
import Button from "@/app/components/Button";
import { rowsToSafeCsv } from "@/lib/fisheries/lbiCsv";
import type { LBIValidationResult, ValidationSeverity } from "@/lib/fisheries/lbiTypes";

export default function LBIValidationResults({ result }: { result: LBIValidationResult }) {
  const [severity, setSeverity] = useState<ValidationSeverity | "all">("all");
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => result.issues.filter((item) =>
    (severity === "all" || item.severity === severity) &&
    `${item.message} ${item.column ?? ""} ${item.originalValue ?? ""}`.toLowerCase().includes(search.toLowerCase()),
  ), [result.issues, search, severity]);
  const download = () => {
    const csv = rowsToSafeCsv(result.issues.map((item) => ({
      row_number: item.rowNumber ?? "", column: item.column ?? "", original_value: item.originalValue ?? "",
      severity: item.severity, code: item.code, message: item.message, suggested_action: item.suggestedAction,
    })));
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    anchor.download = "laporan-validasi-lbi.csv"; anchor.click(); URL.revokeObjectURL(anchor.href);
  };
  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {[["Total", result.totalRows], ["Valid", result.summary.validRows], ["Baris error", result.summary.rowsWithErrors], ["Baris peringatan", result.summary.rowsWithWarnings], ["ID duplikat", result.duplicateSampleIds], ["Rentang", `${result.summary.minimumLength ?? "—"}–${result.summary.maximumLength ?? "—"}`]].map(([label, value]) =>
        <div key={String(label)} className="rounded-lg border bg-white p-3"><div className="text-xs text-stone-500">{label}</div><div className="text-lg font-bold">{value}</div></div>)}
    </div>
    <div className="flex flex-wrap gap-2">
      <label className="sr-only" htmlFor="validation-severity">Filter tingkat</label>
      <select id="validation-severity" value={severity} onChange={(event) => setSeverity(event.target.value as typeof severity)} className="rounded-md border px-3 py-2 text-sm"><option value="all">Semua tingkat</option><option value="error">Error</option><option value="warning">Peringatan</option><option value="info">Informasi</option></select>
      <label className="sr-only" htmlFor="validation-search">Cari pesan</label>
      <input id="validation-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari pesan validasi" className="min-w-60 rounded-md border px-3 py-2 text-sm" />
      <Button variant="outline" onClick={download}>Unduh laporan CSV</Button>
    </div>
    <div className="max-h-[28rem] overflow-auto rounded-lg border bg-white">
      <table className="min-w-full text-left text-sm"><thead className="sticky top-0 bg-sky-100"><tr>{["Baris","Kolom","Nilai asli","Tingkat","Pesan","Tindakan"].map((item) => <th key={item} className="p-2">{item}</th>)}</tr></thead>
        <tbody>{filtered.length ? filtered.map((item, index) => <tr key={`${item.code}-${item.rowNumber}-${index}`} className="border-t">
          <td className="p-2">{item.rowNumber ?? "File"}</td><td className="p-2">{item.column ?? "—"}</td><td className="max-w-40 break-words p-2">{item.originalValue ?? "—"}</td>
          <td className="p-2"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${item.severity === "error" ? "bg-red-100 text-red-800" : item.severity === "warning" ? "bg-amber-100 text-amber-800" : "bg-sky-100 text-sky-800"}`}>{item.severity}</span></td>
          <td className="p-2">{item.message}</td><td className="p-2">{item.suggestedAction}</td></tr>) : <tr><td colSpan={6} className="p-8 text-center text-stone-500">Tidak ada hasil untuk filter ini.</td></tr>}</tbody>
      </table>
    </div>
  </div>;
}

