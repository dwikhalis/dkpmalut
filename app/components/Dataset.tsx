"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/supabaseClient";
import {
  createDefaultTableConfig,
  createFiltersFromColumns,
  mergePublishedConfig,
  normalizeTableConfig,
  parsePublishedConfig,
  type PublishedChartConfig,
  type PublishedConfig,
  type PublishedTableConfig,
} from "@/lib/utils/publishedConfig";
import { invalidateDatasetListCache } from "@/lib/utils/datasetListCache";
import DatasetTable, {
  type ColumnConfig,
  type FilterConfig,
} from "./DatasetTable";
import DatasetConfiguration from "./DatasetConfiguration";
import DataChart from "./DataChart";
import AlertNotif from "./AlertNotif";
import Button from "./Button";
import {
  DATA_KKPD_OPTIONS,
  DATA_REGENCY_OPTIONS,
  DATA_SUBWPP_OPTIONS,
} from "./configAreaSelector";
import SpinnerLoading from "./SpinnerLoading";
import { getUploadTimestamp } from "@/lib/utils/uploadTimestamp";

type PublicationStatus = null | "requested" | "approved" | "rejected" | string;

type PublicationAlertType =
  | "none"
  | "confirm-submit"
  | "confirm-image-change"
  | "confirm-status-change"
  | "success-submit"
  | "success-table-config"
  | "success-chart-config"
  | "success-status-change"
  | "invalid-form"
  | "failed";

type EditablePublicationStatus = "requested" | "approved" | "rejected";
type DatasetView =
  | "dataset"
  | "visualization"
  | "publication"
  | "configuration";

type DatasetPublicationRow = {
  label: string | null;
  column_config: ColumnConfig[] | string | null;
  published_config: PublishedConfig | string | null;
  published: PublicationStatus;
  tag: string[] | string | null;
  data_regency: string[] | string | null;
  data_subwpp: string[] | string | null;
  data_kkpd: string[] | string | null;
  description: string | null;
  image_path: string | null;
  path_redirect: string | null;
};

const TAG_OPTIONS = [
  { label: "Tangkap", value: "tangkap" },
  { label: "Budidaya", value: "budidaya" },
  { label: "Ekologi", value: "ekologi" },
  { label: "Konservasi", value: "konservasi" },
  { label: "Sosial", value: "sosial" },
  { label: "Ekonomi", value: "ekonomi" },
  { label: "Lainnya", value: "lainnya" },
];

function parseJsonArray<T>(value: T[] | string | null | undefined): T[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value;
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getFileExtension(file: File) {
  const fromName = file.name.split(".").pop();

  if (fromName && fromName.length <= 5) {
    return fromName.toLowerCase();
  }

  const fromType = file.type.split("/")[1];

  return fromType || "png";
}

function getSafeView(value: string | null): DatasetView {
  if (value === "chart" || value === "visualization") {
    return "visualization";
  }

  if (value === "publication") {
    return "publication";
  }

  if (value === "configuration") {
    return "configuration";
  }

  return "dataset";
}

function getStatusBar(status: PublicationStatus) {
  if (status === "requested") {
    return {
      className: "border-yellow-200 bg-yellow-50 text-yellow-700",
      content: "Publikasi ini menunggu persetujuan.",
    };
  }

  if (status === "approved") {
    return {
      className: "border-green-200 bg-green-50 text-green-700",
      content: "Data telah dipublikasikan.",
    };
  }

  if (status === "rejected") {
    return {
      className: "border-red-200 bg-red-50 text-red-700",
      content: "Publikasi data ini ditolak.",
    };
  }

  return {
    className: "border-yellow-200 bg-yellow-50 text-yellow-700",
    content: "Data belum dipublikasikan.",
  };
}

export default function Dataset({
  datasetId,
  action,
  saveData,
  onSignalAction,
  onChangeCountChange,
  role,
  canAdd = false,
  previewOnly = false,
  linkMode = false,
  onVisualizationSaved,
}: {
  datasetId: string;
  action: "add" | "edit" | "list" | "delete";
  saveData: number;
  onSignalAction: (signal: string) => void;
  onChangeCountChange?: (count: number) => void;
  role: "admin" | "partner" | null;
  canAdd?: boolean;
  previewOnly?: boolean;
  linkMode?: boolean;
  onVisualizationSaved?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [columns, setColumns] = useState<ColumnConfig[]>([]);
  const [duplicateKeys, setDuplicateKeys] = useState<string[]>([]);
  const [filters, setFilters] = useState<FilterConfig[]>([]);
  const [publishedConfig, setPublishedConfig] = useState<
    Partial<PublishedConfig>
  >({});
  const [tableConfig, setTableConfig] = useState<PublishedTableConfig>(() =>
    createDefaultTableConfig([], []),
  );
  const [activeView, setActiveView] = useState<DatasetView>(() =>
    getSafeView(searchParams.get("view")),
  );

  const [originalLabel, setOriginalLabel] = useState("");
  const [publicationStatus, setPublicationStatus] =
    useState<PublicationStatus>(null);
  const [publicationTitle, setPublicationTitle] = useState("");
  const [publicationTags, setPublicationTags] = useState<string[]>([]);
  const [publicationDataRegencies, setPublicationDataRegencies] = useState<
    string[]
  >([]);
  const [publicationInSubWpp, setPublicationInSubWpp] = useState(false);
  const [publicationDataSubWpp, setPublicationDataSubWpp] = useState<string[]>(
    [],
  );
  const [publicationInKkpd, setPublicationInKkpd] = useState(false);
  const [publicationDataKkpd, setPublicationDataKkpd] = useState<string[]>([]);
  const [publicationDescription, setPublicationDescription] = useState("");
  const [publicationLink, setPublicationLink] = useState("");
  const [publicationImagePath, setPublicationImagePath] = useState<
    string | null
  >(null);
  const [publicationImageUrl, setPublicationImageUrl] = useState<string | null>(
    null,
  );
  const [publicationImageEditing, setPublicationImageEditing] = useState(false);
  const [publicationImageFile, setPublicationImageFile] = useState<File | null>(
    null,
  );
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [showPublicationForm, setShowPublicationForm] = useState(false);
  const [publicationSaving, setPublicationSaving] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  const [publicationMessage, setPublicationMessage] = useState("");
  const [publicationRedirectPath, setPublicationRedirectPath] = useState<
    string | null
  >(null);
  const [publicationAlert, setPublicationAlert] =
    useState<PublicationAlertType>("none");
  const [pendingPublicationStatus, setPendingPublicationStatus] =
    useState<EditablePublicationStatus | null>(null);

  const fetchImageUrl = useCallback(async (path: string | null) => {
    if (!path) {
      setPublicationImageUrl(null);
      return;
    }

    const { data, error } = await supabase.storage
      .from("images")
      .createSignedUrl(path, 60 * 60);

    if (!error && data?.signedUrl) {
      setPublicationImageUrl(data.signedUrl);
      return;
    }

    const publicResult = supabase.storage.from("images").getPublicUrl(path);

    setPublicationImageUrl(publicResult.data.publicUrl || null);
  }, []);

  const setView = useCallback(
    (nextView: DatasetView) => {
      setActiveView(nextView);

      const params = new URLSearchParams(searchParams.toString());
      params.set("view", nextView);

      router.replace(`${pathname}?${params.toString()}`, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    setActiveView(getSafeView(searchParams.get("view")));
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;

    const fetchConfig = async () => {
      try {
        setLoading(true);
        setErr(null);

        if (!datasetId) {
          throw new Error("Dataset ID tidak tersedia.");
        }

        const { data: configData, error: configError } = await supabase
          .from("datasets")
          .select(
            "label, column_config, published_config, published, tag, data_regency, data_subwpp, data_kkpd, description, image_path, path_redirect",
          )
          .eq("id", datasetId)
          .maybeSingle();

        if (configError) throw configError;
        if (!configData) throw new Error("Config dataset tidak ditemukan.");

        const row = configData as DatasetPublicationRow;

        const columnConfig = parseJsonArray<ColumnConfig>(row.column_config);
        const filterConfig = createFiltersFromColumns(columnConfig);

        const parsedPublishedConfig = parsePublishedConfig(
          row.published_config,
        );
        const normalizedTableConfig = normalizeTableConfig(
          parsedPublishedConfig.table,
          columnConfig,
          filterConfig,
        );

        const parsedTags = parseJsonArray<string>(row.tag);
        const { data: validationConfig, error: validationError } =
          await supabase
            .from("dataset_validation_configs")
            .select("duplicate_keys")
            .eq("dataset_id", datasetId)
            .maybeSingle();

        if (validationError) {
          console.warn(
            "Dataset duplicate validation is unavailable:",
            validationError,
          );
        }

        if (cancelled) return;

        setColumns(columnConfig);
        setDuplicateKeys(
          Array.isArray(validationConfig?.duplicate_keys)
            ? validationConfig.duplicate_keys
            : [],
        );
        setFilters(filterConfig);
        setPublishedConfig(parsedPublishedConfig);
        setTableConfig(normalizedTableConfig);

        setOriginalLabel(row.label ?? "");
        setPublicationTitle(row.label ?? "");
        setPublicationStatus(row.published ?? null);
        setPublicationTags(parsedTags);
        const configuredRegencyValues = new Set<string>(
          DATA_REGENCY_OPTIONS.map((regency) => regency.value),
        );
        setPublicationDataRegencies(
          parseJsonArray<string>(row.data_regency).filter((regency) =>
            configuredRegencyValues.has(regency),
          ),
        );
        const configuredSubWppValues = new Set<string>(
          DATA_SUBWPP_OPTIONS.map((subWpp) => subWpp.value),
        );
        const parsedDataSubWpp = parseJsonArray<string>(row.data_subwpp).filter(
          (subWpp) => configuredSubWppValues.has(subWpp),
        );
        setPublicationDataSubWpp(parsedDataSubWpp);
        setPublicationInSubWpp(parsedDataSubWpp.length > 0);
        const configuredKkpdValues = new Set<string>(
          DATA_KKPD_OPTIONS.map((area) => area.value),
        );
        const parsedDataKkpd = parseJsonArray<string>(row.data_kkpd).filter(
          (area) => configuredKkpdValues.has(area),
        );
        setPublicationDataKkpd(parsedDataKkpd);
        setPublicationInKkpd(parsedDataKkpd.length > 0);
        setPublicationDescription(row.description ?? "");
        setPublicationLink(row.path_redirect ?? "");
        setPublicationImagePath(row.image_path ?? null);
        setPublicationImageEditing(!row.image_path);
        setPublicationImageFile(null);
        setPendingImageFile(null);
        setPublicationMessage("");
        setPublicationRedirectPath(null);
        setShowPublicationForm(row.published !== null);

        await fetchImageUrl(row.image_path ?? null);
      } catch (error) {
        console.error("Failed to fetch dataset config:", error);

        if (!cancelled) {
          setErr("Gagal memuat konfigurasi dataset.");
          setColumns([]);
          setFilters([]);
          setPublishedConfig({});
          setTableConfig(createDefaultTableConfig([], []));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchConfig();

    return () => {
      cancelled = true;
    };
  }, [datasetId, fetchImageUrl]);

  const defaultSortKey = filters[0]?.key ?? columns[0]?.key ?? "";

  const dataUrlToBlob = (dataUrl: string) => {
    const separatorIndex = dataUrl.indexOf(",");

    if (separatorIndex === -1) {
      throw new Error("Format snapshot grafik tidak valid.");
    }

    const metadata = dataUrl.slice(0, separatorIndex);
    const encodedData = dataUrl.slice(separatorIndex + 1);
    const mimeType =
      metadata.match(/^data:([^;,]+)/i)?.[1] ?? "application/octet-stream";
    const bytes = metadata.includes(";base64")
      ? Uint8Array.from(atob(encodedData), (character) =>
          character.charCodeAt(0),
        )
      : new TextEncoder().encode(decodeURIComponent(encodedData));

    return new Blob([bytes], { type: mimeType });
  };

  const uploadChartSnapshot = async (snapshotDataUrl: string | null) => {
    if (!snapshotDataUrl) return publicationImagePath;

    const blob = dataUrlToBlob(snapshotDataUrl);
    const fileNameBase = toSlug(publicationTitle || originalLabel || datasetId);
    const dateStamp = getUploadTimestamp();
    const path = `charts/${fileNameBase}-${dateStamp}.png`;

    const { error } = await supabase.storage.from("images").upload(path, blob, {
      upsert: true,
      contentType: "image/png",
    });

    if (error) throw error;

    return path;
  };

  const saveChartConfig = async (
    chartConfig: PublishedChartConfig,
    snapshotDataUrl: string | null,
    nextTableConfig: PublishedTableConfig,
  ) => {
    setConfigSaving(true);

    try {
      const imagePath = await uploadChartSnapshot(snapshotDataUrl);
      const nextPublishedConfig = mergePublishedConfig(publishedConfig, {
        table: nextTableConfig,
        chart: chartConfig,
        snapshotPath: imagePath,
      });

      const { error } = await supabase
        .from("datasets")
        .update({
          published_config: nextPublishedConfig,
          image_path: imagePath,
          import_status: "ready",
          draft_expires_at: null,
        })
        .eq("id", datasetId);

      if (error) throw error;

      setPublishedConfig(nextPublishedConfig);
      setTableConfig(nextTableConfig);
      setPublicationImagePath(imagePath ?? null);
      setPublicationImageEditing(false);
      await fetchImageUrl(imagePath ?? null);
      setPublicationAlert("success-chart-config");
      onVisualizationSaved?.();
    } catch (error) {
      console.error("Failed to save chart publication config:", error);
      setPublicationAlert("failed");
    } finally {
      setConfigSaving(false);
    }
  };

  const togglePublicationTag = (tag: string) => {
    setPublicationTags((prev) => {
      if (prev.includes(tag)) {
        return prev.filter((item) => item !== tag);
      }

      return [...prev, tag];
    });
  };

  const togglePublicationDataKkpd = (area: string) => {
    setPublicationDataKkpd((current) =>
      current.includes(area)
        ? current.filter((item) => item !== area)
        : [...current, area],
    );
  };

  const togglePublicationDataSubWpp = (subWpp: string) => {
    setPublicationDataSubWpp((current) =>
      current.includes(subWpp)
        ? current.filter((item) => item !== subWpp)
        : [...current, subWpp],
    );
  };

  const togglePublicationDataRegency = (regency: string) => {
    setPublicationDataRegencies((current) =>
      current.includes(regency)
        ? current.filter((item) => item !== regency)
        : [...current, regency],
    );
  };

  const applySelectedImage = (file: File) => {
    setPublicationImageFile(file);
    setPublicationImageEditing(true);

    const previewUrl = URL.createObjectURL(file);
    setPublicationImageUrl(previewUrl);
    setPublicationMessage("");
  };

  const restorePublicationImage = () => {
    if (publicationImageUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(publicationImageUrl);
    }

    setPublicationImageFile(null);
    setPendingImageFile(null);
    setPublicationImageEditing(false);
    void fetchImageUrl(publicationImagePath);
  };

  const handleSelectedImage = (file: File) => {
    if (
      linkMode
        ? !["image/jpeg", "image/png"].includes(file.type)
        : !file.type.startsWith("image/")
    ) {
      setPublicationMessage(
        linkMode
          ? "Gambar harus berformat JPG, JPEG, atau PNG."
          : "File harus berupa gambar.",
      );
      return;
    }

    const hasExistingUploadedImage = Boolean(publicationImagePath);

    if (hasExistingUploadedImage) {
      setPendingImageFile(file);
      setPublicationAlert("confirm-image-change");
      return;
    }

    applySelectedImage(file);
  };

  const handleDropImage = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();

    const file = event.dataTransfer.files?.[0];

    if (file) {
      handleSelectedImage(file);
    }
  };

  const validatePublicationForm = () => {
    if (!publicationTitle.trim()) {
      setPublicationMessage("Judul data wajib diisi.");
      setPublicationAlert("invalid-form");
      return false;
    }

    if (linkMode) {
      try {
        const url = new URL(publicationLink.trim());
        if (url.protocol !== "http:" && url.protocol !== "https:") {
          throw new Error("invalid protocol");
        }
      } catch {
        setPublicationMessage("Link tujuan harus berupa URL HTTP atau HTTPS yang valid.");
        setPublicationAlert("invalid-form");
        return false;
      }
    }

    if (publicationTags.length === 0) {
      setPublicationMessage("Pilih minimal satu tag.");
      setPublicationAlert("invalid-form");
      return false;
    }

    if (publicationDataRegencies.length === 0) {
      setPublicationMessage(
        "Pilih minimal satu Wilayah Administratif Kabupaten / Kota.",
      );
      setPublicationAlert("invalid-form");
      return false;
    }

    if (!publicationImagePath && !publicationImageFile) {
      setPublicationMessage("Gambar publikasi wajib diunggah.");
      setPublicationAlert("invalid-form");
      return false;
    }

    return true;
  };

  const requestPublicationSubmit = () => {
    if (!validatePublicationForm()) return;

    setPublicationAlert("confirm-submit");
  };

  const uploadPublicationImage = async () => {
    const imageFile = publicationImageFile;

    if (!imageFile) {
      return publicationImagePath;
    }

    const extension = getFileExtension(imageFile);
    const fileNameBase = toSlug(publicationTitle || originalLabel || datasetId);
    const dateStamp = getUploadTimestamp();

    const path = `charts/${fileNameBase}-${dateStamp}.${extension}`;

    const { error } = await supabase.storage
      .from("images")
      .upload(path, imageFile, {
        upsert: true,
        contentType: imageFile.type || undefined,
      });

    if (error) throw error;

    return path;
  };

  const handleConfirmPublicationSubmit = async (confirmation?: boolean) => {
    if (confirmation === false) {
      setPublicationAlert("none");
      return;
    }

    setPublicationAlert("none");

    if (!validatePublicationForm()) return;

    setPublicationSaving(true);

    try {
      const imagePath = await uploadPublicationImage();

      const { error } = await supabase
        .from("datasets")
        .update({
          label: publicationTitle.trim(),
          tag: publicationTags,
          data_regency: publicationDataRegencies,
          data_subwpp:
            publicationInSubWpp && publicationDataSubWpp.length > 0
              ? publicationDataSubWpp
              : null,
          data_kkpd:
            publicationInKkpd && publicationDataKkpd.length > 0
              ? publicationDataKkpd
              : null,
          description: publicationDescription.trim(),
          ...(linkMode
            ? { path_redirect: new URL(publicationLink.trim()).toString() }
            : {}),
          image_path: imagePath,
          published: "requested",
        })
        .eq("id", datasetId);

      if (error) throw error;

      setOriginalLabel(publicationTitle.trim());
      setPublicationStatus("requested");
      setPublicationImagePath(imagePath ?? null);
      setPublicationImageEditing(false);
      setPublicationImageFile(null);
      setShowPublicationForm(true);
      setPublicationMessage("");
      invalidateDatasetListCache();

      await fetchImageUrl(imagePath ?? null);

      if (linkMode) {
        router.replace(
          `/profile/data/${toSlug(publicationTitle.trim())}?view=publication`,
          { scroll: false },
        );
      } else {
        setPublicationRedirectPath(
          `/profile/data/${toSlug(publicationTitle.trim())}?view=publication`,
        );
      }

      setPublicationAlert("success-submit");
    } catch (error) {
      console.error("Failed to submit publication:", error);
      setPublicationAlert("failed");
    } finally {
      setPublicationSaving(false);
    }
  };

  const handleConfirmImageChange = (confirmation?: boolean) => {
    if (confirmation === false) {
      setPendingImageFile(null);
      setPublicationAlert("none");
      return;
    }

    if (pendingImageFile) {
      applySelectedImage(pendingImageFile);
    }

    setPendingImageFile(null);
    setPublicationAlert("none");
  };

  const requestPublicationStatusChange = (
    nextStatus: EditablePublicationStatus,
  ) => {
    if (nextStatus === publicationStatus) return;

    setPendingPublicationStatus(nextStatus);
    setPublicationAlert("confirm-status-change");
  };

  const handleConfirmPublicationStatusChange = async (
    confirmation?: boolean,
  ) => {
    if (confirmation === false) {
      setPendingPublicationStatus(null);
      setPublicationAlert("none");
      return;
    }

    if (!pendingPublicationStatus) {
      setPublicationAlert("none");
      return;
    }

    setPublicationSaving(true);

    try {
      const { error } = await supabase
        .from("datasets")
        .update({
          published: pendingPublicationStatus,
        })
        .eq("id", datasetId);

      if (error) throw error;

      setPublicationStatus(pendingPublicationStatus);
      setPendingPublicationStatus(null);
      setPublicationAlert("success-status-change");
    } catch (error) {
      console.error("Failed to update publication status:", error);
      setPublicationAlert("failed");
    } finally {
      setPublicationSaving(false);
    }
  };

  const statusBar = getStatusBar(publicationStatus);

  if (loading) {
    return (
      <div className="flex min-h-40 w-full items-center justify-center">
        <SpinnerLoading size="sm" color="black" />
      </div>
    );
  }

  if (err) {
    return (
      <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        {err}
      </div>
    );
  }

  if (!datasetId || (!linkMode && columns.length === 0)) {
    return (
      <div className="rounded border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700">
        Konfigurasi data belum tersedia.
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-3">
      {activeView === "dataset" && (
        <>
          <DatasetTable
            action={action}
            saveData={saveData}
            onSignalAction={onSignalAction}
            onChangeCountChange={onChangeCountChange}
            datasetId={datasetId}
            columns={columns}
            filters={filters}
            defaultSortKey={defaultSortKey}
            duplicateKeys={duplicateKeys}
            role={role}
            canAdd={canAdd}
          />
        </>
      )}

      {activeView === "configuration" && role === "admin" && (
        <DatasetConfiguration
          datasetId={datasetId}
          columns={columns}
          onValidationChange={setDuplicateKeys}
        />
      )}

      {activeView === "visualization" && (
        <DataChart
          datasetId={datasetId}
          columns={columns}
          filters={filters}
          tableConfig={tableConfig}
          chartConfig={publishedConfig.chart}
          saving={configSaving}
          saveButtonLabel={
            publicationStatus !== null
              ? "Update Visualisasi"
              : "Simpan Visualisasi"
          }
          showSaveChangeCount={publicationStatus !== null}
          previewOnly={previewOnly}
          onSave={(chartConfig, snapshotDataUrl, nextTableConfig) =>
            void saveChartConfig(chartConfig, snapshotDataUrl, nextTableConfig)
          }
        />
      )}

      {activeView === "publication" && !previewOnly && (
        <div className="min-h-[70vh] space-y-4">
          <div className={`rounded border p-3 text-sm ${statusBar.className}`}>
            <div className="flex items-center justify-between gap-2">
              <span>
                {publicationStatus === "rejected" ? (
                  <>
                    Publikasi data ini ditolak.{" "}
                    <Link href="/kontak" className="underline">
                      Hubungi Admin
                    </Link>
                  </>
                ) : (
                  statusBar.content
                )}
              </span>

              {role === "admin" && publicationStatus !== null && (
                <select
                  value={
                    publicationStatus === "requested" ||
                    publicationStatus === "approved" ||
                    publicationStatus === "rejected"
                      ? publicationStatus
                      : ""
                  }
                  disabled={publicationSaving}
                  onChange={(event) =>
                    requestPublicationStatusChange(
                      event.target.value as EditablePublicationStatus,
                    )
                  }
                  className="ml-2 rounded border border-gray-300 bg-white px-2 py-1 text-sm text-black disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="" disabled>
                    Pilih Status
                  </option>
                  <option value="requested">Tangguhkan</option>
                  <option value="approved">Setujui</option>
                  <option value="rejected">Tolak</option>
                </select>
              )}
            </div>
          </div>

          {!showPublicationForm && publicationStatus === null && (
            <Button
              type="button"
              onClick={() => setShowPublicationForm(true)}
              fullWidth
              className="rounded-md"
            >
              Publikasikan Data Ini
            </Button>
          )}

          {showPublicationForm && (
            <div className="space-y-4 rounded-md border border-gray-300 bg-white p-4">
              {publicationMessage && (
                <div className="rounded border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700">
                  {publicationMessage}
                </div>
              )}

              <div
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDropImage}
                onClick={() => {
                  if (linkMode) {
                    fileInputRef.current?.click();
                    return;
                  }

                  if (publicationImageEditing || !publicationImageUrl) {
                    fileInputRef.current?.click();
                  }
                }}
                className={`flex min-h-[260px] flex-col items-center justify-center overflow-hidden rounded-lg border-4 border-dashed border-gray-300 bg-gray-50 p-4 text-center ${
                  publicationImageEditing || !publicationImageUrl
                    ? "cursor-pointer hover:bg-gray-100"
                    : ""
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={
                    linkMode
                      ? ".jpg,.jpeg,.png,image/jpeg,image/png"
                      : "image/*"
                  }
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];

                    if (file) {
                      handleSelectedImage(file);
                    }

                    event.target.value = "";
                  }}
                />

                {publicationImageUrl &&
                (linkMode || !publicationImageEditing) ? (
                  <img
                    src={publicationImageUrl}
                    alt={publicationTitle || "Preview publikasi"}
                    className="max-h-[320px] w-full rounded object-contain"
                  />
                ) : (
                  <>
                    <p className="max-w-xl text-2xl font-semibold text-gray-700">
                      {linkMode
                        ? publicationImageFile
                          ? `${publicationImageFile.name} dipilih`
                          : "Jatuhkan gambar JPG, JPEG, atau PNG di sini"
                        : "Lakukan screenshot grafik, dan drag file tersebut kesini"}
                    </p>

                    <p className="mt-2 text-sm text-gray-500">
                      {linkMode
                        ? "atau klik untuk mencari dari perangkat"
                        : "Klik untuk memilih gambar"}
                    </p>
                  </>
                )}
              </div>

              {!linkMode && publicationImageUrl && (
                <Button
                  type="button"
                  onClick={() => {
                    if (publicationImageEditing) {
                      restorePublicationImage();
                      return;
                    }

                    setPublicationImageEditing(true);
                  }}
                  variant="outline"
                  fullWidth
                  className="rounded-md"
                >
                  {publicationImageEditing ? "Kembali" : "Ubah Gambar"}
                </Button>
              )}

              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">
                  {linkMode ? "Judul Link" : "Judul Dataset"}
                </span>

                <input
                  value={publicationTitle}
                  onChange={(event) => setPublicationTitle(event.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </label>

              {linkMode && (
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium">Link</span>

                  <input
                    type="url"
                    value={publicationLink}
                    onChange={(event) =>
                      setPublicationLink(event.target.value)
                    }
                    placeholder="https://example.com"
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </label>
              )}

              <div className="space-y-2">
                <p className="text-sm font-medium">Tag Data</p>

                <div className="grid gap-2 md:grid-cols-3">
                  {TAG_OPTIONS.map((tag) => (
                    <label
                      key={tag.value}
                      className="flex cursor-pointer items-center gap-2 rounded border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={publicationTags.includes(tag.value)}
                        onChange={() => togglePublicationTag(tag.value)}
                      />

                      <span>{tag.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <fieldset className="space-y-3 rounded-lg border border-gray-200 bg-gray-50/60 p-4">
                <legend className="px-1 text-sm font-semibold text-gray-900">
                  Wilayah Administratif — Kabupaten / Kota{" "}
                  <span className="text-red-600" aria-hidden="true">
                    *
                  </span>
                </legend>

                <div className="flex flex-wrap gap-2">
                  {DATA_REGENCY_OPTIONS.map((regency) => {
                    const selected = publicationDataRegencies.includes(
                      regency.value,
                    );

                    return (
                      <button
                        key={regency.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() =>
                          togglePublicationDataRegency(regency.value)
                        }
                        className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 ${
                          selected
                            ? "border-sky-700 bg-sky-700 text-white hover:bg-sky-800"
                            : "border-gray-300 bg-white text-gray-700 hover:border-sky-400 hover:bg-sky-50"
                        }`}
                      >
                        {regency.label}
                      </button>
                    );
                  })}
                </div>

                <p className="text-xs leading-relaxed text-gray-500">
                  Wajib pilih minimal satu kabupaten atau kota yang dicakup
                  oleh dataset.
                </p>
              </fieldset>

              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm transition-colors hover:bg-sky-50">
                <input
                  type="checkbox"
                  checked={publicationInKkpd}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setPublicationInKkpd(checked);

                    if (!checked) {
                      setPublicationDataKkpd([]);
                    }
                  }}
                  className="h-4 w-4 accent-sky-700"
                />

                <span>
                  <span className="block font-medium text-gray-900">
                    Data Kawasan Konservasi Perairan
                  </span>
                  <span className="block text-xs text-gray-500">
                    Dataset mencakup salah satu kawasan konservasi.
                  </span>
                </span>
              </label>

              {publicationInKkpd && (
                <fieldset className="space-y-3 rounded-lg border border-gray-200 bg-gray-50/60 p-4">
                  <legend className="px-1 text-sm font-semibold text-gray-900">
                    Kawasan Konservasi — KKD
                  </legend>

                  <div className="flex flex-wrap gap-2">
                    {DATA_KKPD_OPTIONS.map((area) => {
                      const selected = publicationDataKkpd.includes(area.value);

                      return (
                        <button
                          key={area.id}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => togglePublicationDataKkpd(area.value)}
                          className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 ${
                            selected
                              ? "border-sky-700 bg-sky-700 text-white hover:bg-sky-800"
                              : "border-gray-300 bg-white text-gray-700 hover:border-sky-400 hover:bg-sky-50"
                          }`}
                        >
                          {area.label}
                        </button>
                      );
                    })}
                  </div>

                  <p className="text-xs leading-relaxed text-gray-500">
                    Pilih kawasan konservasi yang dicakup oleh dataset.
                  </p>
                </fieldset>
              )}

              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm transition-colors hover:bg-sky-50">
                <input
                  type="checkbox"
                  checked={publicationInSubWpp}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setPublicationInSubWpp(checked);

                    if (!checked) {
                      setPublicationDataSubWpp([]);
                    }
                  }}
                  className="h-4 w-4 accent-sky-700"
                />

                <span>
                  <span className="block font-medium text-gray-900">
                    Data Sub-WPP
                  </span>
                  <span className="block text-xs text-gray-500">
                    Dataset mencakup salah satu wilayah Sub-WPP.
                  </span>
                </span>
              </label>

              {publicationInSubWpp && (
                <fieldset className="space-y-3 rounded-lg border border-gray-200 bg-gray-50/60 p-4">
                  <legend className="px-1 text-sm font-semibold text-gray-900">
                    Wilayah Perikanan — Sub-WPP
                  </legend>

                  <div className="flex flex-wrap gap-2">
                    {DATA_SUBWPP_OPTIONS.map((subWpp) => {
                      const selected = publicationDataSubWpp.includes(
                        subWpp.value,
                      );

                      return (
                        <button
                          key={subWpp.id}
                          type="button"
                          aria-pressed={selected}
                          onClick={() =>
                            togglePublicationDataSubWpp(subWpp.value)
                          }
                          className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 ${
                            selected
                              ? "border-sky-700 bg-sky-700 text-white hover:bg-sky-800"
                              : "border-gray-300 bg-white text-gray-700 hover:border-sky-400 hover:bg-sky-50"
                          }`}
                        >
                          {subWpp.label}
                        </button>
                      );
                    })}
                  </div>

                  <p className="text-xs leading-relaxed text-gray-500">
                    Pilih Sub-WPP yang dicakup oleh dataset.
                  </p>
                </fieldset>
              )}

              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">Deskripsi</span>

                <textarea
                  value={publicationDescription}
                  onChange={(event) =>
                    setPublicationDescription(event.target.value)
                  }
                  rows={5}
                  className="resize-y rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Tuliskan deskripsi singkat tentang data ini."
                />
              </label>

              <Button
                type="button"
                disabled={publicationSaving}
                loading={publicationSaving}
                onClick={requestPublicationSubmit}
                variant="primary"
                fullWidth
                className="rounded-md"
              >
                {publicationStatus !== null
                  ? "Update Publikasi"
                  : "Ajukan Publikasi"}
              </Button>
            </div>
          )}
        </div>
      )}

      {publicationAlert === "confirm-submit" && (
        <AlertNotif
          type="double"
          msg={
            publicationStatus === null
              ? "Apakah Anda yakin ingin mengajukan publikasi data ini?"
              : "Apakah Anda yakin ingin mengupdate publikasi data ini?"
          }
          yesText="Ya"
          noText="Tidak"
          icon="warning"
          loading={publicationSaving}
          confirm={handleConfirmPublicationSubmit}
        />
      )}

      {publicationAlert === "confirm-image-change" && (
        <AlertNotif
          type="double"
          msg="Apakah Anda yakin ingin mengganti gambar publikasi?"
          yesText="Ya"
          noText="Tidak"
          icon="warning"
          confirm={handleConfirmImageChange}
        />
      )}

      {publicationAlert === "success-submit" && (
        <AlertNotif
          type="single"
          msg="Publikasi berhasil diajukan dan menunggu persetujuan admin."
          yesText="OK"
          icon="success"
          confirm={() => {
            if (publicationRedirectPath) {
              window.location.assign(publicationRedirectPath);
              return;
            }

            setPublicationAlert("none");
          }}
        />
      )}

      {publicationAlert === "success-table-config" && (
        <AlertNotif
          type="single"
          msg="Konfigurasi tabel publik berhasil disimpan."
          yesText="OK"
          icon="success"
          confirm={() => setPublicationAlert("none")}
        />
      )}

      {publicationAlert === "success-chart-config" && (
        <AlertNotif
          type="single"
          msg="Konfigurasi grafik publik berhasil disimpan."
          yesText="OK"
          icon="success"
          confirm={() => setPublicationAlert("none")}
        />
      )}

      {publicationAlert === "invalid-form" && (
        <AlertNotif
          type="single"
          msg={publicationMessage || "Lengkapi data publikasi terlebih dahulu."}
          yesText="OK"
          icon="warning"
          confirm={() => setPublicationAlert("none")}
        />
      )}

      {publicationAlert === "failed" && (
        <AlertNotif
          type="single"
          msg="Gagal menyimpan data publikasi."
          yesText="OK"
          icon="failed"
          confirm={() => setPublicationAlert("none")}
        />
      )}

      {publicationAlert === "confirm-status-change" && (
        <AlertNotif
          type="double"
          msg="Ubah status publikasi?"
          yesText="Ya"
          noText="Tidak"
          icon="warning"
          loading={publicationSaving}
          confirm={handleConfirmPublicationStatusChange}
        />
      )}

      {publicationAlert === "success-status-change" && (
        <AlertNotif
          type="single"
          msg="Status publikasi berhasil diubah."
          yesText="OK"
          icon="success"
          confirm={() => setPublicationAlert("none")}
        />
      )}
    </div>
  );
}
