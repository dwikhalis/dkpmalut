"use client";
import { useEffect, useState } from "react";
import Button from "@/app/components/Button";
import { supabase } from "@/lib/supabase/supabaseClient";
import {
  CAPTURE_FIELDS,
  duplicateMappedTargets,
  type CaptureFileRole,
} from "@/lib/fisheries/captureMapping";
type Inspected = {
  role: CaptureFileRole;
  filename: string;
  headers: string[];
  rowCount: number;
  preview: Record<string, string>[];
  suggestedMapping: Record<string, string>;
  parsingIssues: { row: number | null; message: string }[];
  truncated: boolean;
};
type ValidationResult = {
  summary: Record<string, number>;
  issues: Array<{
    role: string;
    row: number;
    column?: string;
    severity: string;
    message: string;
  }>;
  issueCount: number;
  reportTruncated: boolean;
  unresolvedSpecies: string[];
  preview: Record<string, Record<string, unknown>[]>;
};
type SpeciesOption = {
  id: string;
  scientific_name: string;
  common_name: string | null;
  local_name: string | null;
};
export default function FisheriesBatchMapper({ batchId }: { batchId: string }) {
  const [files, setFiles] = useState<Inspected[]>([]);
  const [mappings, setMappings] = useState<
    Partial<Record<CaptureFileRole, Record<string, string>>>
  >({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [speciesOptions, setSpeciesOptions] = useState<SpeciesOption[]>([]);
  const [speciesMappings, setSpeciesMappings] = useState<
    Record<string, string>
  >({});
  const [warningAcknowledged, setWarningAcknowledged] = useState(false);
  useEffect(() => {
    void (async () => {
      const session = await supabase.auth.getSession();
      const response = await fetch(
        `/api/fisheries-import-batches?batch_id=${encodeURIComponent(batchId)}`,
        {
          headers: {
            Authorization: `Bearer ${session.data.session?.access_token ?? ""}`,
          },
        },
      );
      const result = await response.json();
      if (response.ok) {
        setFiles(result.files);
        const next: typeof mappings = {};
        for (const file of result.files as Inspected[])
          next[file.role] =
            result.savedMapping?.[file.role] ?? file.suggestedMapping;
        setMappings(next);
        setSpeciesOptions(result.speciesOptions ?? []);
        setSpeciesMappings(result.confirmedSpeciesMappings ?? {});
      } else setMessage(result.message);
      setLoading(false);
    })();
  }, [batchId]);
  const duplicates = Object.values(mappings).flatMap((map) =>
    map ? duplicateMappedTargets(map) : [],
  );
  const save = async (action: "save" | "validate" | "import") => {
    setLoading(true);
    const session = await supabase.auth.getSession();
    const response = await fetch("/api/fisheries-import-batches", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.data.session?.access_token ?? ""}`,
      },
      body: JSON.stringify({
        batchId,
        mappings,
        action,
        warningAcknowledged,
      }),
    });
    const result = await response.json();
    setMessage(
      response.ok
        ? action === "import"
          ? "Dataset berhasil diimpor secara atomik dan siap digunakan."
          : action === "validate"
            ? "Validasi selesai."
            : "Pemetaan tersimpan."
        : result.message,
    );
    if (response.ok && result.validation) setValidation(result.validation);
    if (response.ok && action === "import") setValidation(null);
    setLoading(false);
  };
  const downloadReport = () => {
    if (!validation) return;
    const safeCell = (value: unknown) => {
      let text = String(value ?? "");
      if (/^[=+\-@]/.test(text)) text = `'${text}`;
      return `"${text.replaceAll('"', '""')}"`;
    };
    const rows = [
      ["file", "baris", "kolom", "tingkat", "pesan"],
      ...validation.issues.map((item) => [
        item.role,
        item.row,
        item.column ?? "",
        item.severity,
        item.message,
      ]),
    ];
    const blob = new Blob(
      ["\uFEFF", rows.map((row) => row.map(safeCell).join(",")).join("\r\n")],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `laporan-validasi-${batchId}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const confirmSpecies = async () => {
    setLoading(true);
    const session = await supabase.auth.getSession();
    const response = await fetch("/api/fisheries-import-batches", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.data.session?.access_token ?? ""}`,
      },
      body: JSON.stringify({
        batchId,
        action: "confirm_species",
        speciesMappings,
      }),
    });
    const result = await response.json();
    setMessage(
      response.ok
        ? "Pemetaan spesies tersimpan. Jalankan validasi kembali."
        : result.message,
    );
    setLoading(false);
  };
  return (
    <section className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-4">
      <h3 className="font-semibold">Pemetaan kolom batch</h3>
      {loading && !files.length ? (
        <p className="mt-2 text-sm">Memeriksa file…</p>
      ) : (
        files.map((file) => (
          <details
            key={file.role}
            className="mt-3 rounded-lg border bg-white p-3"
            open
          >
            <summary className="cursor-pointer font-medium">
              {file.filename} · {file.rowCount.toLocaleString("id-ID")} baris
            </summary>
            {file.truncated && (
              <p className="mt-2 text-xs text-amber-700">
                Pemeriksaan awal dibatasi 100.001 baris.
              </p>
            )}
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-sky-100">
                  <tr>
                    <th className="p-2 text-left">Kolom sumber</th>
                    <th className="p-2 text-left">Field tujuan</th>
                  </tr>
                </thead>
                <tbody>
                  {file.headers.map((header) => (
                    <tr key={header} className="border-t">
                      <td className="p-2">{header}</td>
                      <td className="p-2">
                        <select
                          value={mappings[file.role]?.[header] ?? ""}
                          onChange={(e) =>
                            setMappings({
                              ...mappings,
                              [file.role]: {
                                ...mappings[file.role],
                                [header]: e.target.value,
                              },
                            })
                          }
                          className="rounded-md border px-2 py-1"
                        >
                          <option value="">Abaikan</option>
                          {CAPTURE_FIELDS[file.role].map((field) => (
                            <option key={field} value={field}>
                              {field}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {file.parsingIssues.length > 0 && (
              <p className="mt-2 text-xs text-red-700">
                {file.parsingIssues.length} masalah parsing ditemukan pada
                pemeriksaan awal.
              </p>
            )}
          </details>
        ))
      )}
      {duplicates.length > 0 && (
        <p className="mt-3 text-sm text-red-700">
          Target duplikat: {[...new Set(duplicates)].join(", ")}
        </p>
      )}
      <div className="mt-4 flex justify-end">
        <div className="flex flex-wrap gap-2">
          <Button
            loading={loading}
            disabled={!files.length || duplicates.length > 0}
            variant="outline"
            onClick={() => void save("save")}
          >
            Simpan pemetaan
          </Button>
          <Button
            loading={loading}
            disabled={!files.length || duplicates.length > 0}
            onClick={() => void save("validate")}
          >
            Validasi data
          </Button>
        </div>
      </div>
      {message && (
        <p role="status" className="mt-3 text-sm text-sky-800">
          {message}
        </p>
      )}
      {validation && (
        <div className="mt-4 space-y-3">
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {Object.entries(validation.summary).map(([key, value]) => (
              <div key={key} className="rounded-lg border bg-white p-3">
                <div className="text-xs text-stone-500">{key}</div>
                <div className="font-bold">{value}</div>
              </div>
            ))}
          </div>
          {validation.unresolvedSpecies.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm">
              <b>Konfirmasi spesies yang belum terselesaikan</b>
              <div className="mt-3 space-y-2">
                {validation.unresolvedSpecies.map((name) => (
                  <label
                    key={name}
                    className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:items-center"
                  >
                    <span>{name}</span>
                    <select
                      value={speciesMappings[name] ?? ""}
                      onChange={(event) =>
                        setSpeciesMappings({
                          ...speciesMappings,
                          [name]: event.target.value,
                        })
                      }
                      className="rounded-md border bg-white px-3 py-2"
                    >
                      <option value="">Belum dipetakan</option>
                      {speciesOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.scientific_name}
                          {option.local_name ? ` — ${option.local_name}` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              <div className="mt-3 flex justify-end">
                <Button
                  size="sm"
                  loading={loading}
                  onClick={() => void confirmSpecies()}
                >
                  Simpan pemetaan spesies
                </Button>
              </div>
            </div>
          )}
          <div className="max-h-72 overflow-auto rounded-lg border bg-white">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-sky-100">
                <tr>
                  <th className="p-2 text-left">File</th>
                  <th className="p-2">Baris</th>
                  <th className="p-2 text-left">Tingkat</th>
                  <th className="p-2 text-left">Pesan</th>
                </tr>
              </thead>
              <tbody>
                {validation.issues.map((item, index) => (
                  <tr
                    key={`${item.role}-${item.row}-${index}`}
                    className="border-t"
                  >
                    <td className="p-2">{item.role}</td>
                    <td className="p-2 text-center">{item.row}</td>
                    <td className="p-2">{item.severity}</td>
                    <td className="p-2">{item.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border bg-white p-3">
            <Button variant="outline" onClick={downloadReport}>
              Unduh laporan validasi
            </Button>
            <div className="max-w-xl space-y-3">
              {validation.summary.warnings > 0 && (
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={warningAcknowledged}
                    onChange={(event) =>
                      setWarningAcknowledged(event.target.checked)
                    }
                    className="mt-1"
                  />
                  <span>
                    Saya telah meninjau {validation.summary.warnings} peringatan
                    dan menyetujui data tetap diimpor.
                  </span>
                </label>
              )}
              <div className="flex justify-end">
                <Button
                  loading={loading}
                  disabled={
                    validation.summary.errors > 0 ||
                    (validation.summary.warnings > 0 && !warningAcknowledged) ||
                    validation.unresolvedSpecies.length > 0
                  }
                  onClick={() => void save("import")}
                >
                  Impor dataset
                </Button>
              </div>
            </div>
          </div>
          {validation.reportTruncated && (
            <p className="text-xs text-amber-700">
              Laporan tampilan dibatasi 5.000 masalah dari{" "}
              {validation.issueCount}.
            </p>
          )}
          {Object.entries(validation.preview).map(
            ([role, rows]) =>
              rows.length > 0 && (
                <details key={role} className="rounded-lg border bg-white p-3">
                  <summary className="cursor-pointer font-medium">
                    Preview normalisasi: {role}
                  </summary>
                  <pre className="mt-2 max-h-56 overflow-auto text-xs">
                    {JSON.stringify(rows, null, 2)}
                  </pre>
                </details>
              ),
          )}
        </div>
      )}
    </section>
  );
}
