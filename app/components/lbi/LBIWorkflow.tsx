"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Button from "@/app/components/Button";
import SpinnerLoading from "@/app/components/SpinnerLoading";
import { useAuthStore } from "@/app/Stores/authStores";
import { supabase } from "@/lib/supabase/supabaseClient";
import { calculateLBIMetrics } from "@/lib/fisheries/calculateLBIMetrics";
import {
  createLbiTemplate,
  LBI_FIELDS,
  parseLbiCsv,
  suggestColumnMapping,
  type LBIField,
} from "@/lib/fisheries/lbiCsv";
import {
  LBI_CALCULATION_VERSION,
  LBI_TEMPLATE_VERSION,
  type LBIMetadata,
  type LBIObservation,
  type LBIValidationResult,
} from "@/lib/fisheries/lbiTypes";
import { validateLbiRows } from "@/lib/fisheries/validateLBIFile";
import LBIValidationResults from "./LBIValidationResults";
import LBIDashboard from "./LBIDashboard";

type Species = {
  id: string;
  scientific_name: string;
  common_name: string | null;
  local_name: string | null;
};
type Reference = {
  id: string;
  species_id: string;
  linf: number;
  lm: number;
  lopt: number;
  length_type: LBIMetadata["lengthType"];
  length_unit: LBIMetadata["lengthUnit"];
  sex_applicability: "combined" | "male" | "female";
  geographic_area: string | null;
  source_title: string;
  source_authors: string | null;
  source_year: number | null;
  source_url: string | null;
  doi: string | null;
  version: number;
  status: string;
};
type SavedDataset = {
  id: string;
  dataset_name: string;
  sampling_location: string;
  landing_site: string;
  fishing_gear: string;
  sampling_start_date: string;
  sampling_end_date: string;
  length_unit: "cm" | "mm";
  published: string | null;
  reference_snapshot: Parameters<
    typeof LBIDashboard
  >[0]["dataset"]["reference_snapshot"];
};

const initialMetadata: LBIMetadata = {
  datasetName: "",
  speciesId: "",
  biologicalReferenceId: "",
  samplingLocation: "",
  landingSite: "",
  samplingStartDate: "",
  samplingEndDate: "",
  fishingGear: "",
  samplingMethod: "unknown",
  catchScope: "landing_sample",
  marketSorting: false,
  collectorName: "",
  collectorOrganization: "",
  notes: "",
  lengthType: "total_length",
  lengthUnit: "cm",
};
const inputClass =
  "mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200";
const labelClass = "text-sm font-medium text-stone-800";

function download(
  filename: string,
  content: string,
  type = "text/csv;charset=utf-8",
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
function slug(value: string) {
  return `${value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}-${Date.now().toString(36)}`;
}

export default function LBIWorkflow() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const role = useAuthStore((state) => state.role);
  const userId = useAuthStore((state) => state.userId);
  const profile = useAuthStore((state) => state.profile);
  const [species, setSpecies] = useState<Species[]>([]);
  const [references, setReferences] = useState<Reference[]>([]);
  const [metadata, setMetadata] = useState<LBIMetadata>({
    ...initialMetadata,
    collectorOrganization: profile?.organization ?? "",
  });
  const [step, setStepState] = useState(() =>
    Math.min(5, Math.max(1, Number(searchParams.get("step")) || 1)),
  );
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, LBIField | "">>({});
  const [fileMeta, setFileMeta] = useState<{
    name: string;
    size: number;
    type?: string;
  } | null>(null);
  const [parseIssues, setParseIssues] = useState<
    ReturnType<typeof parseLbiCsv>["parseIssues"]
  >([]);
  const [validation, setValidation] = useState<LBIValidationResult | null>(
    null,
  );
  const [warningConfirmed, setWarningConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState<{
    dataset: SavedDataset;
    observations: LBIObservation[];
  } | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const draftKey = `lbi-dashboard-draft:${userId ?? "anonymous"}`;

  const setStep = (nextStep: number) => {
    const safeStep = Math.min(5, Math.max(1, nextStep));
    setStepState(safeStep);
    const params = new URLSearchParams(searchParams.toString());
    params.set("action", "dashboardadd");
    params.set("type", "lbi");
    params.set("step", String(safeStep));
    params.delete("manage");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    if (!userId || draftRestored) return;
    try {
      const raw = sessionStorage.getItem(draftKey);
      if (raw) {
        const draft = JSON.parse(raw) as {
          metadata?: LBIMetadata;
          headers?: string[];
          rows?: Record<string, string>[];
          mapping?: Record<string, LBIField | "">;
          fileMeta?: { name: string; size: number; type?: string };
          parseIssues?: ReturnType<typeof parseLbiCsv>["parseIssues"];
          validation?: LBIValidationResult | null;
          warningConfirmed?: boolean;
          saved?: {
            dataset: SavedDataset;
            observations: LBIObservation[];
          } | null;
        };
        if (draft.metadata) setMetadata(draft.metadata);
        if (draft.headers) setHeaders(draft.headers);
        if (draft.rows) setRows(draft.rows);
        if (draft.mapping) setMapping(draft.mapping);
        if (draft.fileMeta) setFileMeta(draft.fileMeta);
        if (draft.parseIssues) setParseIssues(draft.parseIssues);
        if (draft.validation) setValidation(draft.validation);
        if (draft.warningConfirmed) setWarningConfirmed(true);
        if (draft.saved) setSaved(draft.saved);
      }
    } catch (error) {
      console.warn("LBI draft could not be restored:", error);
    } finally {
      setDraftRestored(true);
    }
  }, [draftKey, draftRestored, userId]);

  useEffect(() => {
    if (!draftRestored || !userId) return;
    try {
      sessionStorage.setItem(
        draftKey,
        JSON.stringify({
          metadata,
          headers,
          rows,
          mapping,
          fileMeta,
          parseIssues,
          validation,
          warningConfirmed,
          saved,
        }),
      );
    } catch (error) {
      console.warn("LBI draft could not be saved:", error);
    }
  }, [
    draftKey,
    draftRestored,
    fileMeta,
    headers,
    mapping,
    metadata,
    parseIssues,
    rows,
    saved,
    userId,
    validation,
    warningConfirmed,
  ]);

  useEffect(() => {
    const urlStep = Math.min(
      5,
      Math.max(1, Number(searchParams.get("step")) || 1),
    );
    setStepState(urlStep);

    if (!searchParams.get("step")) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("step", String(urlStep));
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [pathname, router, searchParams]);

  useEffect(() => {
    const load = async () => {
      const [{ data: speciesRows }, { data: referenceRows }] =
        await Promise.all([
          supabase
            .from("species")
            .select("id, scientific_name, common_name, local_name")
            .eq("is_active", true)
            .order("scientific_name"),
          supabase
            .from("species_biological_references")
            .select("*")
            .eq("status", "approved")
            .order("version", { ascending: false }),
        ]);
      setSpecies((speciesRows ?? []) as Species[]);
      setReferences((referenceRows ?? []) as Reference[]);
    };
    void load();
  }, []);
  const reference = references.find(
    (item) => item.id === metadata.biologicalReferenceId,
  );
  const selectedSpecies = species.find(
    (item) => item.id === metadata.speciesId,
  );
  const availableReferences = references.filter(
    (item) => item.species_id === metadata.speciesId,
  );
  const requiredMetadata =
    metadata.datasetName &&
    metadata.speciesId &&
    reference &&
    metadata.samplingLocation &&
    metadata.samplingStartDate &&
    metadata.samplingEndDate &&
    metadata.landingSite &&
    metadata.fishingGear &&
    metadata.collectorName &&
    metadata.samplingEndDate >= metadata.samplingStartDate &&
    reference.length_type === metadata.lengthType &&
    reference.length_unit === metadata.lengthUnit;
  const mappedRequired = ["sample_id", "sampling_date", "length"].every(
    (field) => Object.values(mapping).includes(field as LBIField),
  );
  const hasErrors =
    validation?.issues.some((item) => item.severity === "error") ?? false;
  const hasWarnings =
    validation?.issues.some((item) => item.severity === "warning") ?? false;
  const steps = [
    "Metadata",
    "Unggah Dataset",
    "Validasi",
    "Preview",
    "Dashboard",
  ];

  const selectReference = (id: string) => {
    const next = references.find((item) => item.id === id);
    setMetadata((current) => ({
      ...current,
      biologicalReferenceId: id,
      ...(next
        ? { lengthType: next.length_type, lengthUnit: next.length_unit }
        : {}),
    }));
  };
  const handleFile = async (nextFile: File) => {
    setMessage("");
    if (nextFile.size > 5 * 1024 * 1024) {
      setMessage("Ukuran file melebihi batas 5 MB.");
      return;
    }
    let text: string;
    try {
      text = await nextFile.text();
    } catch {
      setMessage("File tidak dapat dibaca sebagai UTF-8.");
      return;
    }
    const cleaned = text.replace(/^# LBI_TEMPLATE_VERSION=[^\r\n]*\r?\n/, "");
    const parsed = parseLbiCsv(cleaned);
    setFileMeta({
      name: nextFile.name,
      size: nextFile.size,
      type: nextFile.type,
    });
    setHeaders(parsed.headers);
    setRows(parsed.rows);
    setParseIssues(parsed.parseIssues);
    setMapping(suggestColumnMapping(parsed.headers));
    setValidation(null);
    setWarningConfirmed(false);
  };
  const runValidation = () => {
    if (!reference) return;
    const result = validateLbiRows({
      rows,
      mapping,
      metadata,
      reference: {
        linf: Number(reference.linf),
        lm: Number(reference.lm),
        lopt: Number(reference.lopt),
        lengthType: reference.length_type,
        lengthUnit: reference.length_unit,
      },
      file: fileMeta ?? undefined,
      parseIssues,
    });
    setValidation(result);
    setStep(3);
  };
  const snapshot = useMemo(
    () =>
      reference && selectedSpecies
        ? {
            referenceId: reference.id,
            referenceVersion: reference.version,
            speciesId: selectedSpecies.id,
            scientificName: selectedSpecies.scientific_name,
            commonName:
              selectedSpecies.common_name ??
              selectedSpecies.local_name ??
              undefined,
            linf: Number(reference.linf),
            lm: Number(reference.lm),
            lopt: Number(reference.lopt),
            lengthType: reference.length_type,
            lengthUnit: reference.length_unit,
            sexApplicability: reference.sex_applicability,
            geographicArea: reference.geographic_area ?? undefined,
            sourceTitle: reference.source_title,
            sourceAuthors: reference.source_authors ?? undefined,
            sourceYear: reference.source_year ?? undefined,
            sourceUrl: reference.source_url ?? undefined,
            doi: reference.doi ?? undefined,
            templateVersion: LBI_TEMPLATE_VERSION,
            calculationVersion: LBI_CALCULATION_VERSION,
            capturedAt: new Date().toISOString(),
          }
        : null,
    [reference, selectedSpecies],
  );
  const confirmImport = async () => {
    if (
      !validation ||
      !snapshot ||
      !reference ||
      hasErrors ||
      (hasWarnings && !warningConfirmed)
    )
      return;
    setBusy(true);
    setMessage("");
    try {
      const metrics = calculateLBIMetrics(
        validation.validRows.map((row) => row.length),
        reference,
        metadata.lengthUnit === "mm" ? 10 : 1,
      );
      const payload = {
        dataset_name: metadata.datasetName,
        slug: slug(metadata.datasetName),
        species_id: metadata.speciesId,
        biological_reference_id: metadata.biologicalReferenceId,
        sampling_location: metadata.samplingLocation,
        latitude: metadata.latitude ?? "",
        longitude: metadata.longitude ?? "",
        landing_site: metadata.landingSite,
        sampling_start_date: metadata.samplingStartDate,
        sampling_end_date: metadata.samplingEndDate,
        fishing_gear: metadata.fishingGear,
        sampling_method: metadata.samplingMethod,
        catch_scope: metadata.catchScope,
        market_sorting: metadata.marketSorting,
        collector_name: metadata.collectorName,
        collector_organization: metadata.collectorOrganization ?? "",
        notes: metadata.notes ?? "",
        length_type: metadata.lengthType,
        length_unit: metadata.lengthUnit,
        template_version: LBI_TEMPLATE_VERSION,
        calculation_version: LBI_CALCULATION_VERSION,
        reference_snapshot: snapshot,
        validation_summary: {
          ...validation.summary,
          excludedRows: validation.excludedRows,
          warningCount: validation.issues.filter(
            (item) => item.severity === "warning",
          ).length,
        },
        analysis_result: metrics,
        validation_report: validation.issues,
      };
      const observations = validation.validRows.map((row) => ({
        sample_id: row.sampleId,
        sampling_date: row.samplingDate,
        length: row.length,
        sex: row.sex,
        weight: row.weight ?? null,
        maturity_stage: row.maturityStage ?? null,
        notes: row.notes ?? null,
        source_row_number: row.sourceRowNumber,
      }));
      const { data: id, error } = await supabase.rpc("import_lbi_dataset", {
        p_dataset: payload,
        p_observations: observations,
      });
      if (error) throw error;
      setSaved({
        dataset: {
          id: String(id),
          dataset_name: metadata.datasetName,
          sampling_location: metadata.samplingLocation,
          landing_site: metadata.landingSite,
          fishing_gear: metadata.fishingGear,
          sampling_start_date: metadata.samplingStartDate,
          sampling_end_date: metadata.samplingEndDate,
          length_unit: metadata.lengthUnit,
          published: null,
          reference_snapshot: snapshot,
        },
        observations: validation.validRows,
      });
      setStep(5);
      setMessage("Dataset LBI berhasil disimpan.");
    } catch (error) {
      console.error("LBI import failed:", error);
      setMessage("Impor gagal. Tidak ada data parsial yang disimpan.");
    } finally {
      setBusy(false);
    }
  };
  const requestPublication = async () => {
    if (!saved) return;
    setBusy(true);
    const { error } = await supabase
      .from("lbi_datasets")
      .update({ published: "requested" })
      .eq("id", saved.dataset.id);
    if (error) {
      console.error("LBI publication request failed:", error);
      setMessage("Permintaan publikasi gagal.");
    } else {
      setSaved({
        ...saved,
        dataset: { ...saved.dataset, published: "requested" },
      });
      setMessage("Permintaan publikasi dikirim.");
    }
    setBusy(false);
  };

  return (
    <div className="min-w-0 flex-1 space-y-5 overflow-y-auto rounded-2xl border border-stone-200 bg-white p-4 shadow-md md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Generator Dashboard LBI</h1>
          <p className="text-sm text-stone-600">
            Indikator berbasis struktur panjang ikan
          </p>
        </div>
        {role === "admin" && (
          <Button
            href="/profile/data?action=dashboardadd&type=lbi&manage=references"
            variant="outline"
          >
            Kelola referensi
          </Button>
        )}
      </div>
      <ol
        className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-5"
        aria-label="Tahapan impor"
      >
        {steps.map((label, index) => (
          <li
            key={label}
            className={`rounded-full px-3 py-2 text-center font-medium ${step === index + 1 ? "bg-sky-800 text-white" : step > index + 1 ? "bg-green-100 text-green-800" : "bg-stone-200 text-stone-600"}`}
          >
            {index + 1}. {label}
          </li>
        ))}
      </ol>
      {message && (
        <div
          role="status"
          className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900"
        >
          {message}
        </div>
      )}

      {step === 1 && (
        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (requiredMetadata) setStep(2);
          }}
        >
          <label className={labelClass}>
            Nama dataset *
            <input
              required
              value={metadata.datasetName}
              onChange={(e) =>
                setMetadata({ ...metadata, datasetName: e.target.value })
              }
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Spesies *
            <select
              required
              value={metadata.speciesId}
              onChange={(e) =>
                setMetadata({
                  ...metadata,
                  speciesId: e.target.value,
                  biologicalReferenceId: "",
                })
              }
              className={inputClass}
            >
              <option value="">Pilih spesies</option>
              {species.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.scientific_name}
                  {item.local_name ? ` — ${item.local_name}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className={`${labelClass} md:col-span-2`}>
            Referensi biologis disetujui *
            <select
              required
              value={metadata.biologicalReferenceId}
              onChange={(e) => selectReference(e.target.value)}
              className={inputClass}
            >
              <option value="">Pilih referensi</option>
              {availableReferences.map((item) => (
                <option key={item.id} value={item.id}>
                  v{item.version} · {item.source_title}
                  {item.source_year ? ` (${item.source_year})` : ""} · Lm{" "}
                  {item.lm}, Lopt {item.lopt}, L∞ {item.linf} {item.length_unit}
                </option>
              ))}
            </select>
            {reference && (
              <span className="mt-1 block text-xs font-normal text-stone-600">
                Sumber:{" "}
                {reference.source_authors
                  ? `${reference.source_authors}. `
                  : ""}
                {reference.source_title}
              </span>
            )}
          </label>
          <label className={labelClass}>
            Lokasi sampling *
            <input
              required
              value={metadata.samplingLocation}
              onChange={(e) =>
                setMetadata({ ...metadata, samplingLocation: e.target.value })
              }
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Tempat pendaratan *
            <input
              required
              value={metadata.landingSite}
              onChange={(e) =>
                setMetadata({ ...metadata, landingSite: e.target.value })
              }
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Mulai sampling *
            <input
              required
              type="date"
              value={metadata.samplingStartDate}
              onChange={(e) =>
                setMetadata({ ...metadata, samplingStartDate: e.target.value })
              }
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Selesai sampling *
            <input
              required
              type="date"
              min={metadata.samplingStartDate}
              value={metadata.samplingEndDate}
              onChange={(e) =>
                setMetadata({ ...metadata, samplingEndDate: e.target.value })
              }
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Alat tangkap *
            <input
              required
              value={metadata.fishingGear}
              onChange={(e) =>
                setMetadata({ ...metadata, fishingGear: e.target.value })
              }
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Metode sampling *
            <select
              value={metadata.samplingMethod}
              onChange={(e) =>
                setMetadata({
                  ...metadata,
                  samplingMethod: e.target
                    .value as LBIMetadata["samplingMethod"],
                })
              }
              className={inputClass}
            >
              <option value="random">Acak</option>
              <option value="systematic">Sistematis</option>
              <option value="opportunistic">Oportunistik</option>
              <option value="census">Sensus</option>
              <option value="unknown">Tidak diketahui</option>
            </select>
          </label>
          <label className={labelClass}>
            Cakupan tangkapan *
            <select
              value={metadata.catchScope}
              onChange={(e) =>
                setMetadata({
                  ...metadata,
                  catchScope: e.target.value as LBIMetadata["catchScope"],
                })
              }
              className={inputClass}
            >
              <option value="retained_catch">Tangkapan dipertahankan</option>
              <option value="total_catch">Total tangkapan</option>
              <option value="landing_sample">Sampel pendaratan</option>
              <option value="market_sample">Sampel pasar</option>
              <option value="other">Lainnya</option>
            </select>
          </label>
          <label className={labelClass}>
            Tipe panjang *
            <select
              value={metadata.lengthType}
              disabled={Boolean(reference)}
              onChange={(e) =>
                setMetadata({
                  ...metadata,
                  lengthType: e.target.value as LBIMetadata["lengthType"],
                })
              }
              className={inputClass}
            >
              <option value="total_length">Panjang total</option>
              <option value="fork_length">Panjang cagak</option>
              <option value="standard_length">Panjang standar</option>
            </select>
          </label>
          <label className={labelClass}>
            Satuan *
            <select
              value={metadata.lengthUnit}
              disabled={Boolean(reference)}
              onChange={(e) =>
                setMetadata({
                  ...metadata,
                  lengthUnit: e.target.value as "cm" | "mm",
                })
              }
              className={inputClass}
            >
              <option value="cm">cm</option>
              <option value="mm">mm</option>
            </select>
          </label>
          <label className={labelClass}>
            Pengumpul data *
            <input
              required
              value={metadata.collectorName}
              onChange={(e) =>
                setMetadata({ ...metadata, collectorName: e.target.value })
              }
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Organisasi
            <input
              value={metadata.collectorOrganization}
              onChange={(e) =>
                setMetadata({
                  ...metadata,
                  collectorOrganization: e.target.value,
                })
              }
              className={inputClass}
            />
          </label>
          <label className={`${labelClass} flex items-center gap-2`}>
            <input
              type="checkbox"
              checked={metadata.marketSorting}
              onChange={(e) =>
                setMetadata({ ...metadata, marketSorting: e.target.checked })
              }
            />{" "}
            Terjadi penyortiran pasar
          </label>
          <label className={`${labelClass} md:col-span-2`}>
            Catatan
            <textarea
              value={metadata.notes}
              onChange={(e) =>
                setMetadata({ ...metadata, notes: e.target.value })
              }
              className={inputClass}
            />
          </label>
          <div className="flex justify-end md:col-span-2">
            <Button type="submit" disabled={!requiredMetadata}>
              Lanjut ke unggah
            </Button>
          </div>
        </form>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <div className="rounded-lg border bg-white p-4">
            <h2 className="font-semibold">
              Template resmi v{LBI_TEMPLATE_VERSION}
            </h2>
            <p className="text-sm text-stone-600">
              {selectedSpecies?.scientific_name} · {metadata.lengthType} ·{" "}
              {metadata.lengthUnit} · referensi v{reference?.version}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  download("template-lbi-kosong.csv", createLbiTemplate(false))
                }
              >
                Template kosong
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  download("template-lbi-contoh.csv", createLbiTemplate(true))
                }
              >
                Template contoh
              </Button>
            </div>
          </div>
          <label className="block cursor-pointer rounded-lg border-4 border-dashed border-stone-300 bg-white p-10 text-center hover:bg-stone-50">
            <span className="text-lg font-semibold">
              Pilih atau jatuhkan file CSV
            </span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(e) =>
                e.target.files?.[0] && void handleFile(e.target.files[0])
              }
            />
          </label>
          {headers.length > 0 && (
            <div className="overflow-x-auto rounded-lg border bg-white p-4">
              <h2 className="mb-3 font-semibold">Pemetaan kolom</h2>
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-sky-100">
                    <th className="p-2 text-left">Kolom unggahan</th>
                    <th className="p-2 text-left">Field LBI</th>
                  </tr>
                </thead>
                <tbody>
                  {headers.map((header) => (
                    <tr key={header} className="border-t">
                      <td className="p-2">{header}</td>
                      <td className="p-2">
                        <select
                          value={mapping[header] ?? ""}
                          onChange={(e) =>
                            setMapping({
                              ...mapping,
                              [header]: e.target.value as LBIField | "",
                            })
                          }
                          className="rounded-md border px-3 py-2"
                        >
                          <option value="">Abaikan</option>
                          {LBI_FIELDS.map((field) => (
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
              <p className="mt-2 text-xs text-stone-500">
                Field wajib: sample_id, sampling_date, length. Satu kolom target
                hanya boleh digunakan sekali.
              </p>
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(1)}>
              Kembali
            </Button>
            <Button
              onClick={runValidation}
              disabled={!fileMeta || !mappedRequired}
            >
              Validasi file
            </Button>
          </div>
        </div>
      )}

      {step === 3 && validation && (
        <div className="space-y-4">
          <LBIValidationResults result={validation} />
          {hasWarnings && !hasErrors && (
            <label className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
              <input
                type="checkbox"
                checked={warningConfirmed}
                onChange={(e) => setWarningConfirmed(e.target.checked)}
              />
              <span>
                Saya telah meninjau peringatan dan ingin melanjutkan tanpa
                mengubah nilai ilmiah yang tidak biasa.
              </span>
            </label>
          )}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setStep(2)}>
              Unggah file yang diperbaiki
            </Button>
            <Button
              disabled={hasErrors || (hasWarnings && !warningConfirmed)}
              onClick={() => setStep(4)}
            >
              Lanjut ke preview
            </Button>
          </div>
        </div>
      )}
      {step === 4 && validation && snapshot && (
        <div className="space-y-4">
          <div className="rounded-lg border bg-white p-4">
            <h2 className="font-semibold">Konfirmasi impor</h2>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-stone-500">Dataset</dt>
                <dd>{metadata.datasetName}</dd>
              </div>
              <div>
                <dt className="text-stone-500">Referensi</dt>
                <dd>
                  v{snapshot.referenceVersion} · {snapshot.sourceTitle}
                </dd>
              </div>
              <div>
                <dt className="text-stone-500">Diterima</dt>
                <dd>{validation.validRows.length} baris</dd>
              </div>
              <div>
                <dt className="text-stone-500">Dikecualikan</dt>
                <dd>{validation.excludedRows} baris</dd>
              </div>
              <div>
                <dt className="text-stone-500">Periode</dt>
                <dd>
                  {metadata.samplingStartDate}–{metadata.samplingEndDate}
                </dd>
              </div>
              <div>
                <dt className="text-stone-500">Pengukuran</dt>
                <dd>
                  {metadata.lengthType}, {metadata.lengthUnit}
                </dd>
              </div>
            </dl>
          </div>
          <div className="overflow-x-auto rounded-lg border bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-sky-100">
                <tr>
                  {[
                    "sample_id",
                    "sampling_date",
                    "length",
                    "sex",
                    "weight",
                  ].map((key) => (
                    <th key={key} className="p-2">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {validation.validRows.slice(0, 15).map((row) => (
                  <tr key={row.sampleId} className="border-t">
                    <td className="p-2">{row.sampleId}</td>
                    <td className="p-2">{row.samplingDate}</td>
                    <td className="p-2">{row.length}</td>
                    <td className="p-2">{row.sex}</td>
                    <td className="p-2">{row.weight ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(3)}>
              Kembali
            </Button>
            <Button loading={busy} onClick={confirmImport}>
              Konfirmasi dan simpan
            </Button>
          </div>
        </div>
      )}
      {step === 5 && saved && (
        <div className="space-y-4">
          <LBIDashboard
            dataset={saved.dataset}
            observations={saved.observations}
            canExport
          />
          <div className="flex flex-wrap gap-2">
            <Button
              loading={busy}
              disabled={saved.dataset.published === "requested"}
              onClick={requestPublication}
            >
              {saved.dataset.published === "requested"
                ? "Publikasi diminta"
                : "Minta publikasi"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                sessionStorage.removeItem(draftKey);
                setMetadata(initialMetadata);
                setRows([]);
                setHeaders([]);
                setFileMeta(null);
                setValidation(null);
                setSaved(null);
                setStep(1);
              }}
            >
              Buat dataset LBI baru
            </Button>
          </div>
        </div>
      )}
      {busy && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
          aria-live="polite"
        >
          <div className="rounded-xl bg-white p-6">
            <SpinnerLoading size="sm" color="black" />
          </div>
        </div>
      )}
    </div>
  );
}
