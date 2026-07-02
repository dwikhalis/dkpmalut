"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/supabaseClient";
import DataPublishTable, {
  type ColumnConfig,
  type FilterConfig,
} from "./DataPublishTable";
import DataPublishChart from "./DataPublishChart";

type DataMitraPublishedRow = {
  id: string;
  label: string | null;
  column_config: ColumnConfig[] | string | null;
  filter_config: FilterConfig[] | string | null;
  main_column_config: string[] | string | null;
  published?: boolean | string | null;
};

type Props = {
  slug: string;
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

export default function ChartGeneric({ slug }: Props) {
  const [loading, setLoading] = useState(true);
  const [dataset, setDataset] = useState<DataMitraPublishedRow | null>(null);

  useEffect(() => {
    const fetchPublishedDataset = async () => {
      setLoading(true);

      try {
        const { data, error } = await supabase
          .from("data_mitra")
          .select(
            "id, label, column_config, filter_config, main_column_config, published",
          )
          .eq("published", "true")
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

  const defaultSortKey = mainColumnKeys[0] ?? columns[0]?.key ?? "";

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
    <section className="flex min-h-[100vh] w-full flex-col px-4 py-8 md:px-10 lg:px-16">
      <div className="mb-8">
        <h2 className="font-bold">{dataset.label ?? "Dataset"}</h2>
      </div>

      <DataPublishChart dataMitraId={dataset.id} columns={columns} />

      <DataPublishTable
        dataMitraId={dataset.id}
        columns={columns}
        filters={filters}
        defaultSortKey={defaultSortKey}
      />
    </section>
  );
}
