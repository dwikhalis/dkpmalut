"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/supabaseClient";
import DataTableMitra, {
  type ColumnConfig,
  type FilterConfig,
} from "./DataTableMitra";
import DataMitraChart from "./DataMitraChart";

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

export default function DataMitra({
  dataMitraId,
  action,
  saveData,
  onSignalAction,
}: {
  dataMitraId: string;
  action: "add" | "edit" | "list" | "delete";
  saveData: number;
  onSignalAction: (signal: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [columns, setColumns] = useState<ColumnConfig[]>([]);
  const [filters, setFilters] = useState<FilterConfig[]>([]);
  const [mainColumnKeys, setMainColumnKeys] = useState<string[]>([]);
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<string[]>([]);
  const [activeView, setActiveView] = useState<
    "table" | "chart" | "publication"
  >("table");

  useEffect(() => {
    let cancelled = false;

    const fetchConfig = async () => {
      try {
        setLoading(true);
        setErr(null);

        if (!dataMitraId) {
          throw new Error("Data mitra ID tidak tersedia.");
        }

        const { data: configData, error: configError } = await supabase
          .from("data_mitra")
          .select("column_config, filter_config, main_column_config")
          .eq("id", dataMitraId)
          .maybeSingle();

        if (configError) throw configError;
        if (!configData) throw new Error("Config data mitra tidak ditemukan.");

        const columnConfig = parseJsonArray<ColumnConfig>(
          configData.column_config,
        );

        const filterConfig = parseJsonArray<FilterConfig>(
          configData.filter_config,
        );

        const parsedMainColumnKeys = parseJsonArray<string>(
          configData.main_column_config,
        );

        const availableColumnKeys = columnConfig.map((column) => column.key);

        const validMainColumnKeys = parsedMainColumnKeys.filter((key) =>
          availableColumnKeys.includes(key),
        );

        if (cancelled) return;

        setColumns(columnConfig);
        setFilters(filterConfig);
        setMainColumnKeys(validMainColumnKeys);
        setVisibleColumnKeys(
          validMainColumnKeys.length > 0
            ? validMainColumnKeys
            : availableColumnKeys,
        );
      } catch (error) {
        console.error("Failed to fetch data mitra config:", error);

        if (!cancelled) {
          setErr("Gagal memuat konfigurasi data mitra.");
          setColumns([]);
          setFilters([]);
          setVisibleColumnKeys([]);
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
  }, [dataMitraId]);

  const visibleColumns = useMemo(
    () => columns.filter((column) => visibleColumnKeys.includes(column.key)),
    [columns, visibleColumnKeys],
  );

  const toggleColumn = (key: string) => {
    setVisibleColumnKeys((prev) => {
      const isSelected = prev.includes(key);

      // Prevent empty table
      if (isSelected && prev.length === 1) {
        return prev;
      }

      if (isSelected) {
        return prev.filter((item) => item !== key);
      }

      return [...prev, key];
    });
  };

  const showAllColumns = () => {
    setVisibleColumnKeys(columns.map((column) => column.key));
  };

  const showMainColumnsOnly = () => {
    if (mainColumnKeys.length === 0) return;

    setVisibleColumnKeys(mainColumnKeys);
  };

  const defaultSortKey = filters[0]?.key ?? columns[0]?.key ?? "";

  if (loading) {
    return (
      <div className="flex min-h-40 w-full items-center justify-center">
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

  if (!dataMitraId || columns.length === 0) {
    return (
      <div className="rounded border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700">
        Konfigurasi data belum tersedia.
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-3">
      <div className="flex w-full justify-between gap-2">
        <button
          type="button"
          onClick={() => setActiveView("table")}
          className={`w-[30%] rounded-md border border-gray-500 p-2 text-center text-sm cursor-pointer ${
            activeView === "table"
              ? "bg-sky-800 text-white"
              : "bg-white hover:bg-sky-200"
          }`}
        >
          Tabel
        </button>

        <button
          type="button"
          onClick={() => setActiveView("chart")}
          className={`w-[30%] rounded-md border border-gray-500 p-2 text-center text-sm cursor-pointer ${
            activeView === "chart"
              ? "bg-sky-800 text-white"
              : "bg-white hover:bg-sky-200"
          }`}
        >
          Grafik
        </button>

        <button
          type="button"
          onClick={() => setActiveView("publication")}
          className={`w-[30%] rounded-md border border-gray-500 p-2 text-center text-sm cursor-pointer ${
            activeView === "publication"
              ? "bg-sky-800 text-white"
              : "bg-white hover:bg-sky-200"
          }`}
        >
          Publikasi
        </button>
      </div>

      {activeView === "table" && (
        <>
          <details className="group relative">
            <summary className="cursor-pointer rounded-sm border border-gray-400 bg-white px-3 py-2 text-xs group-open:border-2 group-open:border-black">
              Kolom ({visibleColumnKeys.length}/{columns.length})
            </summary>

            <div className="absolute left-0 z-30 mt-2 w-full rounded-lg border border-gray-400 bg-white shadow-lg">
              <div className="flex items-center justify-between border-b px-3 py-2">
                <button
                  type="button"
                  onClick={showAllColumns}
                  className="text-xs text-sky-600 hover:underline"
                >
                  Tampilkan semua
                </button>

                <button
                  type="button"
                  onClick={showMainColumnsOnly}
                  disabled={mainColumnKeys.length === 0}
                  className="text-xs text-sky-600 hover:underline disabled:cursor-not-allowed disabled:text-gray-400 disabled:no-underline"
                >
                  Kolom utama
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto p-2">
                {columns.map((column) => (
                  <label
                    key={column.key}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-gray-100"
                  >
                    <input
                      type="checkbox"
                      checked={visibleColumnKeys.includes(column.key)}
                      onChange={() => toggleColumn(column.key)}
                      className="h-4 w-4"
                    />

                    <span>{column.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </details>

          <DataTableMitra
            action={action}
            saveData={saveData}
            onSignalAction={onSignalAction}
            dataMitraId={dataMitraId}
            columns={visibleColumns}
            filters={filters}
            defaultSortKey={defaultSortKey}
          />
        </>
      )}

      {activeView === "chart" && (
        <DataMitraChart dataMitraId={dataMitraId} columns={columns} />
      )}

      {activeView === "publication" && (
        <div className="rounded border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700">
          Fitur publikasi belum tersedia.
        </div>
      )}
    </div>
  );
}
