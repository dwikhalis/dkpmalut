"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/supabaseClient";
import BarCharts from "./BarCharts";
import type { ColumnConfig } from "./DataTableMitra";

type DatasetValue = string | number | boolean | null | undefined;

type DatasetRow = {
  id?: string;
  [key: string]: DatasetValue;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseRows(value: unknown): DatasetRow[] {
  if (!value) return [];

  let parsed = value;

  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      return [];
    }
  }

  if (Array.isArray(parsed)) {
    return parsed.filter(isRecord) as DatasetRow[];
  }

  // Optional fallback if your JSON is shaped like: { rows: [...] }
  if (isRecord(parsed) && Array.isArray(parsed.rows)) {
    return parsed.rows.filter(isRecord) as DatasetRow[];
  }

  // Optional fallback if your JSON is shaped like: { data: [...] }
  if (isRecord(parsed) && Array.isArray(parsed.data)) {
    return parsed.data.filter(isRecord) as DatasetRow[];
  }

  return [];
}

function toNumber(value: DatasetValue) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  if (typeof value === "string") {
    const cleaned = value.replace(/,/g, "").trim();
    const numberValue = Number(cleaned);

    return Number.isFinite(numberValue) ? numberValue : 0;
  }

  return 0;
}

export default function DataMitraChart({
  dataMitraId,
  columns,
}: {
  dataMitraId: string;
  columns: ColumnConfig[];
}) {
  const [rows, setRows] = useState<DatasetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [labelKey, setLabelKey] = useState("");
  const [valueKey, setValueKey] = useState("");
  const [limit, setLimit] = useState("20");

  useEffect(() => {
    let cancelled = false;

    const fetchRows = async () => {
      try {
        setLoading(true);
        setErr(null);

        if (!dataMitraId) {
          setRows([]);
          return;
        }

        const { data, error } = await supabase
          .from("data_mitra")
          .select("data")
          .eq("id", dataMitraId)
          .maybeSingle();

        if (error) throw error;

        if (!cancelled) {
          setRows(parseRows(data?.data));
        }
      } catch (error) {
        console.error("Failed to fetch mitra chart data:", error);

        if (!cancelled) {
          setErr("Gagal memuat data grafik.");
          setRows([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchRows();

    return () => {
      cancelled = true;
    };
  }, [dataMitraId]);

  const categoryColumns = useMemo(
    () => columns.filter((column) => column.inputType !== "number"),
    [columns],
  );

  const numericColumns = useMemo(
    () => columns.filter((column) => column.inputType === "number"),
    [columns],
  );

  useEffect(() => {
    const firstCategoryKey = categoryColumns[0]?.key ?? columns[0]?.key ?? "";
    const firstNumericKey = numericColumns[0]?.key ?? "";

    if (!labelKey || !columns.some((column) => column.key === labelKey)) {
      setLabelKey(firstCategoryKey);
    }

    if (!valueKey || !columns.some((column) => column.key === valueKey)) {
      setValueKey(firstNumericKey);
    }
  }, [columns, categoryColumns, numericColumns, labelKey, valueKey]);

  const chartResult = useMemo(() => {
    if (!labelKey || !valueKey) {
      return {
        labels: [],
        values: [],
      };
    }

    const grouped = new Map<string, number>();

    rows.forEach((row) => {
      const rawLabel = row[labelKey];
      const label =
        rawLabel === null || rawLabel === undefined || rawLabel === ""
          ? "N/A"
          : String(rawLabel);

      grouped.set(label, (grouped.get(label) ?? 0) + toNumber(row[valueKey]));
    });

    const sorted = Array.from(grouped.entries()).sort((a, b) => b[1] - a[1]);

    const maxItems = Number(limit);

    const finalRows =
      Number.isFinite(maxItems) && maxItems > 0
        ? sorted.slice(0, maxItems)
        : sorted;

    return {
      labels: finalRows.map(([label]) => label),
      values: finalRows.map(([, value]) => value),
    };
  }, [rows, labelKey, valueKey, limit]);

  const labelColumn = columns.find((column) => column.key === labelKey);
  const valueColumn = columns.find((column) => column.key === valueKey);

  if (loading) {
    return (
      <div className="flex min-h-40 w-full items-center justify-center rounded border border-gray-200 bg-white">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-slate-300 border-t-transparent" />
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

  if (rows.length === 0) {
    return (
      <div className="rounded border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700">
        Data grafik belum tersedia.
      </div>
    );
  }

  if (numericColumns.length === 0) {
    return (
      <div className="rounded border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700">
        Grafik membutuhkan minimal satu kolom angka. Pastikan column_config
        memiliki inputType: "number".
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <select
          value={labelKey}
          onChange={(e) => setLabelKey(e.target.value)}
          className="w-full rounded border border-gray-400 px-3 py-2 text-xs"
        >
          {categoryColumns.map((column) => (
            <option key={column.key} value={column.key}>
              Label: {column.label}
            </option>
          ))}
        </select>

        <select
          value={valueKey}
          onChange={(e) => setValueKey(e.target.value)}
          className="w-full rounded border border-gray-400 px-3 py-2 text-xs"
        >
          {numericColumns.map((column) => (
            <option key={column.key} value={column.key}>
              Nilai: {column.label}
            </option>
          ))}
        </select>

        <select
          value={limit}
          onChange={(e) => setLimit(e.target.value)}
          className="w-full rounded border border-gray-400 px-3 py-2 text-xs"
        >
          <option value="10">Top 10</option>
          <option value="20">Top 20</option>
          <option value="50">Top 50</option>
          <option value="0">Semua</option>
        </select>
      </div>

      <div className="rounded border border-gray-200 bg-white p-3">
        <BarCharts
          labels={chartResult.labels}
          datasets={[
            {
              label: valueColumn?.label ?? valueKey,
              values: chartResult.values,
            },
          ]}
          stacked={false}
          chartTitle={`${valueColumn?.label ?? valueKey} berdasarkan ${
            labelColumn?.label ?? labelKey
          }`}
          datalabel={false}
          yAxis={true}
          rotateXLabels={chartResult.labels.length > 8 ? 45 : 0}
        />
      </div>
    </div>
  );
}
