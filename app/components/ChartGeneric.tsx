"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/supabaseClient";
import {
  createFiltersFromColumns,
  normalizeChartConfig,
  normalizeTableConfig,
  parsePublishedConfig,
  type PublishedConfig,
} from "@/lib/utils/publishedConfig";
import type { ColumnConfig } from "./DataPublishTable";
import DataPublishChart from "./DataPublishChart";
import DataPageDropdown from "./DataPageDropdown";
import AlertNotif from "./AlertNotif";
import SpinnerLoading from "./SpinnerLoading";
import { useAuthStore } from "../Stores/authStores";
import { VerticalThreeDot } from "@/public/icons/iconSets";

type DataRow = Record<string, unknown>;

type DatasetPublishedRow = {
  id: string;
  label: string | null;
  data: DataRow[] | string | null;
  column_config: ColumnConfig[] | string | null;
  published_config: PublishedConfig | string | null;
  published?: "approved" | "requested" | "rejected" | null;
  description: string | null;
};

type Props = {
  slug: string;
  pages: { title: string; slug: string }[];
};

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

function fileNameFromTitle(title: string) {
  return (
    title
      .trim()
      .replace(/[\/\\?%*:|"<>]/g, "")
      .replace(/\s+/g, "_") + ".csv"
  );
}

function csvCell(value: unknown) {
  if (value == null) return "";

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === "object") {
    const text = JSON.stringify(value);

    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  const text = String(value);

  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(header: string[], rows: unknown[][]) {
  const lines = [
    header.map(csvCell).join(","),
    ...rows.map((row) => row.map(csvCell).join(",")),
  ];

  return lines.join("\r\n");
}

export default function ChartGeneric({ slug, pages }: Props) {
  const router = useRouter();
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);

  const [loading, setLoading] = useState(true);
  const [dataset, setDataset] = useState<DatasetPublishedRow | null>(null);
  const [alertType, setAlertType] = useState<
    null | "download-login-required" | "table-login-required"
  >(null);
  const [publicFiltersState, setPublicFiltersState] = useState<
    Record<string, string>
  >({});
  const [publicSortBy, setPublicSortBy] = useState("");
  const [publicCsvData, setPublicCsvData] = useState<{
    headers: string[];
    rows: Array<Array<string | number>>;
  }>({
    headers: [],
    rows: [],
  });

  useEffect(() => {
    const fetchPublishedDataset = async () => {
      setLoading(true);

      try {
        const { data, error } = await supabase
          .from("datasets")
          .select(
            "id, label, data, column_config, published_config, published, description",
          )
          .eq("published", "approved")
          .order("label", { ascending: true });

        if (error) throw error;

        const rows = (data ?? []) as DatasetPublishedRow[];

        const matchedDataset =
          rows.find((row) => toSlug(row.label ?? "") === slug) ?? null;

        setDataset(matchedDataset);
      } catch (error) {
        console.error("Failed to fetch published dataset:", error);
        setDataset(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPublishedDataset();
  }, [slug]);

  const columns = useMemo(() => {
    return parseJsonArray<ColumnConfig>(dataset?.column_config);
  }, [dataset]);

  const filters = useMemo(() => {
    return createFiltersFromColumns(columns);
  }, [columns]);

  const publishedConfig = useMemo(() => {
    return parsePublishedConfig(dataset?.published_config);
  }, [dataset]);

  const tableConfig = useMemo(() => {
    return normalizeTableConfig(publishedConfig.table, columns, filters);
  }, [columns, filters, publishedConfig.table]);

  const chartConfig = useMemo(() => {
    return normalizeChartConfig(publishedConfig.chart, columns, tableConfig);
  }, [columns, publishedConfig.chart, tableConfig]);

  const publicColumns = useMemo(() => {
    return columns.filter((column) =>
      tableConfig.visibleColumnKeys.includes(column.key),
    );
  }, [columns, tableConfig.visibleColumnKeys]);
  const canDownloadCsv = publicCsvData.headers.length > 0;

  const tableRows = useMemo(() => {
    return parseJsonArray<DataRow>(dataset?.data);
  }, [dataset]);

  const defaultSortKey = tableConfig.sortKey || (publicColumns[0]?.key ?? "");

  useEffect(() => {
    setPublicFiltersState({});
    setPublicSortBy(defaultSortKey);
  }, [dataset?.id, defaultSortKey]);

  const updatePublicFilter = (key: string, value: string) => {
    setPublicFiltersState((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const downloadCsv = () => {
    if (!dataset || !canDownloadCsv) return;

    const csv = toCsv(publicCsvData.headers, publicCsvData.rows);
    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = fileNameFromTitle(dataset.label ?? "Dataset");

    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    URL.revokeObjectURL(url);
  };

  const handleCsvClick = () => {
    if (!canDownloadCsv) return;

    if (!isLoggedIn) {
      setAlertType("download-login-required");
      return;
    }

    downloadCsv();
  };

  const requestTableLogin = () => {
    setAlertType("table-login-required");
  };

  const handleLoginRedirect = () => {
    setAlertType(null);
    router.push("/masuk/");
  };

  if (loading) {
    return (
      <section className="flex min-h-[80vh] w-full items-center justify-center">
        <SpinnerLoading size="sm" color="black" />
      </section>
    );
  }

  if (!dataset) {
    return (
      <section className="flex min-h-[80vh] w-full items-center justify-center px-6 text-center">
        <div>
          <h2 className="font-bold">Dataset tidak ditemukan</h2>
          <p className="mt-2 text-sm text-gray-500">
            Dataset ini tidak tersedia atau belum dipublikasikan.
          </p>
        </div>
      </section>
    );
  }

  if (publicColumns.length === 0) {
    return (
      <section className="flex min-h-[80vh] w-full items-center justify-center px-6 text-center">
        <div>
          <h2 className="font-bold">{dataset.label ?? "Dataset"}</h2>
          <p className="mt-2 text-sm text-gray-500">
            Dataset ini belum memiliki konfigurasi kolom.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="flex min-h-[100vh] w-full flex-col px-6 pb-12 md:px-12">
      <DataPageDropdown pages={pages} />

      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="min-w-0 font-bold">{dataset.label ?? "Dataset"}</h2>

        <div className="shrink-0">
          <details three-dot-menu="true" className="group relative">
            <summary className="list-none cursor-pointer rounded-sm border-2 border-white bg-white px-1 py-1 text-xs hover:border-black group-open:border-2 group-open:border-black">
              <VerticalThreeDot className="size-6" />
            </summary>

            <div className="absolute right-0 z-30 mt-2 flex flex-col rounded-lg border border-gray-400 bg-white p-2 shadow-lg">
              <button
                type="button"
                className={`whitespace-nowrap px-2 p-2 text-left text-sm ${
                  canDownloadCsv
                    ? "hover:bg-sky-200"
                    : "cursor-not-allowed text-gray-400"
                }`}
                onClick={handleCsvClick}
                disabled={!canDownloadCsv}
              >
                Download CSV
              </button>
            </div>
          </details>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <DataPublishChart
          datasetId={dataset.id}
          columns={columns}
          filters={filters}
          tableConfig={tableConfig}
          chartConfig={chartConfig}
          selectedFilters={publicFiltersState}
          sortBy={publicSortBy || defaultSortKey}
          onFilterChange={updatePublicFilter}
          onSortChange={setPublicSortBy}
          isLoggedIn={isLoggedIn}
          onLoginRequired={requestTableLogin}
          onCsvDataChange={setPublicCsvData}
        />

        {dataset.description && (
          <p className="max-w-3xl text-sm text-stone-600">
            {dataset.description}
          </p>
        )}
      </div>

      {alertType && (
        <AlertNotif
          type="double"
          msg={
            alertType === "download-login-required"
              ? "Masuk untuk mendownload data, atau hubungi Admin. Masuk sekarang ?"
              : "Masuk untuk melihat data secara utuh, atau hubungi Admin. Masuk sekarang ?"
          }
          yesText="Ya"
          noText="Tidak"
          icon="warning"
          confirm={(confirmation) => {
            if (confirmation) {
              handleLoginRedirect();
              return;
            }

            setAlertType(null);
          }}
        />
      )}
    </section>
  );
}
