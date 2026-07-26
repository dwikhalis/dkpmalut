"use client";

import { useEffect, useMemo, useState } from "react";
import type { HTMLInputTypeAttribute } from "react";
import { supabase } from "@/lib/supabase/supabaseClient";
import { useUrlTableState } from "@/lib/hooks/useUrlTableState";
import { LeftChevron, RightChevron } from "@/public/icons/iconSets";
import SpinnerLoading from "./SpinnerLoading";

type DatasetValue = string | number | boolean | null | undefined;

type DatasetRow = {
  id: string;
  [key: string]: DatasetValue;
};

export type ColumnConfig = {
  key: string;
  label: string;
  editable?: boolean;
  inputType?: HTMLInputTypeAttribute;
  color?: string;
  align?: "left" | "center" | "right";
};

export type FilterConfig = {
  key: string;
  label: string;
  allLabel?: string;
  sort?: "text-asc" | "number-asc" | "number-desc";
};

type DatasetDbRow = {
  id: string;
  data: unknown;
};

interface Props {
  datasetId: string;
  columns: ColumnConfig[];
  filters?: FilterConfig[];
  defaultSortKey?: string;
  pageSize?: number;
  hideControls?: boolean;
  externalSelectedFilters?: Record<string, string>;
  externalSortBy?: string;
  embedded?: boolean;
  isLoggedIn?: boolean;
  onLoginRequired?: () => void;
}

const isMissingValue = (value: DatasetValue) => {
  return value === null || value === undefined || value === "";
};

const displayValue = (value: DatasetValue) => {
  return isMissingValue(value) ? "N/A" : String(value);
};

function toTitleCase(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\w\S*/g, (word) => {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    });
}

const createRowId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `row-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const normalizeJsonbRows = (value: unknown): DatasetRow[] => {
  if (!Array.isArray(value)) return [];

  return value
    .filter((row): row is Record<string, unknown> => {
      return typeof row === "object" && row !== null && !Array.isArray(row);
    })
    .map((row) => {
      const normalizedRow: DatasetRow = {
        id: typeof row.id === "string" && row.id ? row.id : createRowId(),
      };

      Object.entries(row).forEach(([key, value]) => {
        if (key === "id") return;

        if (
          typeof value === "string" ||
          typeof value === "number" ||
          typeof value === "boolean" ||
          value === null ||
          value === undefined
        ) {
          normalizedRow[key] = value;
        } else {
          normalizedRow[key] = String(value);
        }
      });

      return normalizedRow;
    });
};

export default function DataPublishTable({
  datasetId,
  columns,
  filters = [],
  defaultSortKey,
  pageSize = 50,
  hideControls = false,
  externalSelectedFilters,
  externalSortBy,
  embedded = false,
  isLoggedIn = true,
  onLoginRequired,
}: Props) {
  const [allRows, setAllRows] = useState<DatasetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const {
    sortBy,
    setSortBy,
    updateSortBy,
    selectedFilters,
    updateFilter,
    page,
    setPage,
    updatePage,
  } = useUrlTableState({
    columns,
    filters,
    defaultSortKey,
  });

  const sortColumn = useMemo(() => {
    return columns.find((column) => column.key === (externalSortBy ?? sortBy));
  }, [columns, externalSortBy, sortBy]);

  const shouldSortDesc = useMemo(() => {
    return (
      sortColumn?.inputType === "number" ||
      (externalSortBy ?? sortBy) === "year" ||
      (externalSortBy ?? sortBy) === "tahun" ||
      (externalSortBy ?? sortBy) === "tahun_ops"
    );
  }, [sortColumn, externalSortBy, sortBy]);

  const filterOptions = useMemo(() => {
    const options: Record<string, string[]> = {};

    filters.forEach((filter) => {
      const values = Array.from(
        new Set(
          allRows
            .map((row) => row[filter.key])
            .filter((value) => !isMissingValue(value))
            .map((value) => String(value)),
        ),
      );

      if (filter.sort === "number-desc") {
        values.sort((a, b) => Number(b) - Number(a));
      } else if (filter.sort === "number-asc") {
        values.sort((a, b) => Number(a) - Number(b));
      } else {
        values.sort((a, b) => a.localeCompare(b));
      }

      options[filter.key] = values;
    });

    return options;
  }, [allRows, filters]);

  const filteredSortedRows = useMemo(() => {
    let result = [...allRows];
    const activeFilters = externalSelectedFilters ?? selectedFilters;
    const activeSortBy = externalSortBy ?? sortBy;

    Object.entries(activeFilters).forEach(([key, value]) => {
      if (!value || value === "all") return;

      result = result.filter((row) => String(row[key]) === String(value));
    });

    if (activeSortBy) {
      result.sort((a, b) => {
        const aValue = a[activeSortBy];
        const bValue = b[activeSortBy];

        if (shouldSortDesc) {
          return Number(bValue ?? 0) - Number(aValue ?? 0);
        }

        return String(aValue ?? "").localeCompare(String(bValue ?? ""));
      });
    }

    return result;
  }, [allRows, externalSelectedFilters, externalSortBy, selectedFilters, sortBy, shouldSortDesc]);

  const effectivePageSize = Math.min(pageSize, 20);
  const totalRows = filteredSortedRows.length;
  const totalPages = Math.max(Math.ceil(totalRows / effectivePageSize), 1);

  const dataset = useMemo(() => {
    const from = page * effectivePageSize;
    const to = from + effectivePageSize;

    return filteredSortedRows.slice(from, to);
  }, [filteredSortedRows, page, effectivePageSize]);

  useEffect(() => {
    const nextSortKey =
      defaultSortKey && columns.some((column) => column.key === defaultSortKey)
        ? defaultSortKey
        : (columns[0]?.key ?? "");

    const currentSortStillExists = columns.some(
      (column) => column.key === sortBy,
    );

    if (!currentSortStillExists) {
      setSortBy(nextSortKey);
    }
  }, [columns, defaultSortKey, sortBy]);

  useEffect(() => {
    setPage(0);
  }, [datasetId, setPage]);

  useEffect(() => {
    if (page > totalPages - 1) {
      setPage(Math.max(totalPages - 1, 0));
    }
  }, [page, totalPages]);

  useEffect(() => {
    const fetchDatasetRows = async () => {
      setLoading(true);

      try {
        if (!datasetId) {
          setAllRows([]);
          return;
        }

        const { data, error } = await supabase
          .from("datasets")
          .select("id, data")
          .eq("id", datasetId)
          .maybeSingle();

        if (error) throw error;

        const dbRow = data as DatasetDbRow | null;
        const rows = normalizeJsonbRows(dbRow?.data);

        setAllRows(rows);
      } catch (error) {
        console.error("Error fetching published table:", error);
        setAllRows([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDatasetRows();
  }, [datasetId]);

  if (loading) {
    return (
      <div className="flex w-full items-center justify-center py-16">
        <SpinnerLoading size="sm" color="black" />
      </div>
    );
  }

  return (
    <div
      className={
        embedded
          ? "flex w-full min-w-0 flex-col"
          : "flex w-full min-w-0 flex-col rounded-lg border border-stone-200 bg-white p-3 shadow-md"
      }
    >
      {!hideControls && (
      <div className="mb-4 flex min-w-0 flex-wrap gap-3">
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs">
          <span className="font-semibold text-gray-700">Urutan</span>

          <select
            value={sortBy}
            onChange={(event) => {
              updateSortBy(event.target.value);
            }}
            className="min-w-0 truncate rounded border border-gray-400 px-3 py-2 text-xs"
          >
            {columns.map((column) => (
              <option key={column.key} value={column.key}>
                {toTitleCase(column.label)}
              </option>
            ))}
          </select>
        </label>

        {filters.map((filter) => (
          <label
            key={filter.key}
            className="flex min-w-0 flex-1 flex-col gap-1 text-xs"
          >
            <span className="font-semibold text-gray-700">
              {toTitleCase(filter.label)}
            </span>

            <select
              value={selectedFilters[filter.key] ?? "all"}
              onChange={(event) => {
                updateFilter(filter.key, event.target.value);
              }}
              className="min-w-0 truncate overflow-hidden whitespace-nowrap rounded border border-gray-400 px-3 py-2 text-xs"
            >
              <option value="all">
                {filter.allLabel
                  ? toTitleCase(filter.allLabel)
                  : `Semua ${toTitleCase(filter.label)}`}
              </option>

              {(filterOptions[filter.key] ?? []).map((option) => (
                <option key={option} value={option}>
                  {toTitleCase(option)}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      )}

      <div className="w-full overflow-x-auto rounded-sm border border-gray-950/20">
        <table className="min-w-full border text-[2vw] md:text-[1.5vw] lg:text-sm">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`${
                    column.color ? column.color : "bg-sky-100"
                  } whitespace-normal break-words border border-gray-400 px-3 py-2`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {dataset.length > 0 ? (
              dataset.map((row, rowIndex) => (
                <tr key={row.id ?? rowIndex}>
                  {columns.map((column) => {
                    const alignClass =
                      column.align === "right"
                        ? "text-right"
                        : column.align === "center"
                          ? "text-center"
                          : "text-left";

                    return (
                      <td
                        key={column.key}
                        className={`border border-gray-400 px-3 py-2 ${alignClass}`}
                      >
                        {displayValue(row[column.key])}
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={Math.max(columns.length, 1)}
                  className="border border-gray-400 px-3 py-8 text-center text-gray-500"
                >
                  Tidak ada data.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3 text-sm">
        <button
          disabled={page === 0}
          onClick={() => {
            const nextPage = Math.max(page - 1, 0);

            updatePage(nextPage);
          }}
          className="rounded bg-gray-600 px-4 py-2 text-white disabled:opacity-40"
        >
          <LeftChevron className="size-6" />
        </button>

        <p className="text-center text-gray-700">
          Page {page + 1} / {totalPages}
          <br />
          <span className="text-xs text-gray-500">Total data: {totalRows}</span>
        </p>

        <button
          disabled={(page + 1) * effectivePageSize >= totalRows}
          onClick={() => {
            if (!isLoggedIn) {
              onLoginRequired?.();
              return;
            }

            const nextPage = page + 1;

            updatePage(nextPage);
          }}
          className="rounded bg-sky-600 px-4 py-2 text-white disabled:opacity-40"
        >
          <RightChevron className="size-6" />
        </button>
      </div>
    </div>
  );
}
