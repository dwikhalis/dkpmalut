"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/supabaseClient";
import DataPublishTable, {
  type ColumnConfig,
  type FilterConfig,
} from "./DataPublishTable";
import DataPublishChart from "./DataPublishChart";
import DataPageDropdown from "./DataPageDropdown";
import AlertNotif from "./AlertNotif";
import { useAuthStore } from "../Stores/authStores";

type DataRow = Record<string, unknown>;

type DataMitraPublishedRow = {
  id: string;
  label: string | null;
  data: DataRow[] | string | null;
  column_config: ColumnConfig[] | string | null;
  filter_config: FilterConfig[] | string | null;
  main_column_config: string[] | string | null;
  published?: "approved" | "requested" | "rejected" | null;
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
  const [dataset, setDataset] = useState<DataMitraPublishedRow | null>(null);
  const [alertType, setAlertType] = useState<null | "login-required">(null);

  useEffect(() => {
    const fetchPublishedDataset = async () => {
      setLoading(true);

      try {
        const { data, error } = await supabase
          .from("data_mitra")
          .select(
            "id, label, data, column_config, filter_config, main_column_config, published",
          )
          .eq("published", "approved")
          .order("label", { ascending: true });

        if (error) throw error;

        const rows = (data ?? []) as DataMitraPublishedRow[];

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
    return parseJsonArray<FilterConfig>(dataset?.filter_config);
  }, [dataset]);

  const mainColumnKeys = useMemo(() => {
    return parseJsonArray<string>(dataset?.main_column_config);
  }, [dataset]);

  const tableRows = useMemo(() => {
    return parseJsonArray<DataRow>(dataset?.data);
  }, [dataset]);

  const defaultSortKey = mainColumnKeys[0] ?? columns[0]?.key ?? "";

  const downloadCsv = () => {
    if (!dataset || tableRows.length === 0 || columns.length === 0) return;

    const header = columns.map((column) => column.label || column.key);

    const body = tableRows.map((row) => {
      return columns.map((column) => row[column.key]);
    });

    const csv = toCsv(header, body);
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
    if (tableRows.length === 0 || columns.length === 0) return;

    if (!isLoggedIn) {
      setAlertType("login-required");
      return;
    }

    downloadCsv();
  };

  const handleLoginRedirect = () => {
    setAlertType(null);
    router.push("/masuk/");
  };

  if (loading) {
    return (
      <section className="flex min-h-[80vh] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-sky-600" />
          <p className="text-sm text-gray-500">Loading data...</p>
        </div>
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

  if (columns.length === 0) {
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
    <section className="flex min-h-[100vh] w-full flex-col px-8 md:px-10 lg:px-16">
      <DataPageDropdown pages={pages} />

      <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="font-bold">{dataset.label ?? "Dataset"}</h2>
        </div>

        <div className="flex w-full flex-col md:w-auto">
          <label className="mb-1 block font-medium text-[2.8vw] md:text-[1.5vw] lg:text-sm">
            Download
          </label>

          <button
            type="button"
            className={`w-full rounded border px-3 py-1 text-[2.8vw] md:text-[1.5vw] lg:text-sm ${
              tableRows.length === 0
                ? "cursor-not-allowed opacity-50"
                : "bg-sky-600 text-white hover:bg-sky-500"
            }`}
            onClick={handleCsvClick}
            disabled={tableRows.length === 0}
          >
            CSV
          </button>
        </div>
      </div>

      <DataPublishChart dataMitraId={dataset.id} columns={columns} />

      <DataPublishTable
        dataMitraId={dataset.id}
        columns={columns}
        filters={filters}
        defaultSortKey={defaultSortKey}
      />

      {alertType === "login-required" && (
        <AlertNotif
          type="double"
          msg="Log In terlebih dahulu untuk download data"
          yesText="Log In"
          noText="Batal"
          icon="warning"
          confirm={handleLoginRedirect}
        />
      )}
    </section>
  );
}
