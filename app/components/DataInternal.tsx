"use client";

import { useEffect, useMemo, useState } from "react";
import DataTable, { type ColumnConfig, type FilterConfig } from "./DataTable";
import { supabase } from "@/lib/supabase/supabaseClient";

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

export default function DataInternal({
  dataset,
  action,
  saveData,
  onSignalAction,
}: {
  dataset: string;
  action: "add" | "edit" | "list" | "delete";
  saveData: number;
  onSignalAction: (signal: string) => void;
}) {
  const [columns, setColumns] = useState<ColumnConfig[]>([]);
  const [filters, setFilters] = useState<FilterConfig[]>([]);
  const [mainColumnKeys, setMainColumnKeys] = useState<string[]>([]);
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<string[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(true);

  useEffect(() => {
    const fetchDataPages = async () => {
      setLoadingConfig(true);

      try {
        const { data: configData, error: configError } = await supabase
          .from("datasets")
          .select("column_config, filter_config, main_column_config")
          .eq("table", dataset)
          .maybeSingle();

        if (configError) throw configError;

        if (!configData) {
          setColumns([]);
          setFilters([]);
          setMainColumnKeys([]);
          setVisibleColumnKeys([]);
          throw new Error("Config data mitra tidak ditemukan.");
        }

        const parsedColumns = parseJsonArray<ColumnConfig>(
          configData.column_config,
        );

        const parsedFilters = parseJsonArray<FilterConfig>(
          configData.filter_config,
        );

        const parsedMainColumnKeys = parseJsonArray<string>(
          configData.main_column_config,
        );

        const availableColumnKeys = parsedColumns.map((column) => column.key);

        const validMainColumnKeys = parsedMainColumnKeys.filter((key) =>
          availableColumnKeys.includes(key),
        );

        setColumns(parsedColumns);
        setFilters(parsedFilters);
        setMainColumnKeys(validMainColumnKeys);

        setVisibleColumnKeys(
          validMainColumnKeys.length > 0
            ? validMainColumnKeys
            : availableColumnKeys,
        );
      } catch (err) {
        console.error("Fetching Datasets :", err);
      } finally {
        setLoadingConfig(false);
      }
    };

    fetchDataPages();
  }, [dataset]);

  const visibleColumns = useMemo(
    () => columns.filter((column) => visibleColumnKeys.includes(column.key)),
    [columns, visibleColumnKeys],
  );

  const toggleColumn = (key: string) => {
    setVisibleColumnKeys((prev) => {
      const isSelected = prev.includes(key);

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

  if (loadingConfig) {
    return (
      <div className="w-full rounded-md border border-gray-200 bg-white p-4 text-sm text-gray-500">
        Loading table configuration...
      </div>
    );
  }

  if (columns.length === 0) {
    return (
      <div className="w-full rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-600">
        Table configuration is empty.
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 max-w-full space-y-3 overflow-hidden">
      <details className="group relative w-full">
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

      <DataTable
        action={action}
        saveData={saveData}
        onSignalAction={onSignalAction}
        datasetName={dataset}
        columns={visibleColumns}
        filters={filters}
        defaultSortKey="year"
      />
    </div>
  );
}
