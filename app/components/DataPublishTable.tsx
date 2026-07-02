"use client";

import { useEffect, useMemo, useState } from "react";
import type { HTMLInputTypeAttribute } from "react";
import { supabase } from "@/lib/supabase/supabaseClient";
import { LeftChevron, RightChevron } from "@/public/icons/iconSets";

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

type DataMitraDbRow = {
  id: string;
  data: unknown;
};

interface Props {
  dataMitraId: string;
  columns: ColumnConfig[];
  filters?: FilterConfig[];
  defaultSortKey?: string;
  pageSize?: number;
}

const isMissingValue = (value: DatasetValue) => {
  return value === null || value === undefined || value === "";
};

const displayValue = (value: DatasetValue) => {
  return isMissingValue(value) ? "N/A" : String(value);
};

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
  dataMitraId,
  columns,
  filters = [],
  defaultSortKey,
  pageSize = 50,
}: Props) {
  const [allRows, setAllRows] = useState<DatasetRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedFilters, setSelectedFilters] = useState<
    Record<string, string>
  >({});

  const [sortBy, setSortBy] = useState(defaultSortKey ?? columns[0]?.key ?? "");
  const [page, setPage] = useState(0);

  const sortColumn = useMemo(() => {
    return columns.find((column) => column.key === sortBy);
  }, [columns, sortBy]);

  const shouldSortDesc = useMemo(() => {
    return (
      sortColumn?.inputType === "number" ||
      sortBy === "year" ||
      sortBy === "tahun" ||
      sortBy === "tahun_ops"
    );
  }, [sortColumn, sortBy]);

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

    Object.entries(selectedFilters).forEach(([key, value]) => {
      if (!value || value === "all") return;

      result = result.filter((row) => String(row[key]) === String(value));
    });

    if (sortBy) {
      result.sort((a, b) => {
        const aValue = a[sortBy];
        const bValue = b[sortBy];

        if (shouldSortDesc) {
          return Number(bValue ?? 0) - Number(aValue ?? 0);
        }

        return String(aValue ?? "").localeCompare(String(bValue ?? ""));
      });
    }

    return result;
  }, [allRows, selectedFilters, sortBy, shouldSortDesc]);

  const totalRows = filteredSortedRows.length;
  const totalPages = Math.max(Math.ceil(totalRows / pageSize), 1);

  const dataset = useMemo(() => {
    const from = page * pageSize;
    const to = from + pageSize;

    return filteredSortedRows.slice(from, to);
  }, [filteredSortedRows, page, pageSize]);

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
  }, [dataMitraId, selectedFilters, sortBy]);

  useEffect(() => {
    if (page > totalPages - 1) {
      setPage(Math.max(totalPages - 1, 0));
    }
  }, [page, totalPages]);

  useEffect(() => {
    const fetchDataMitraRows = async () => {
      setLoading(true);

      try {
        if (!dataMitraId) {
          setAllRows([]);
          return;
        }

        const { data, error } = await supabase
          .from("data_mitra")
          .select("id, data")
          .eq("id", dataMitraId)
          .maybeSingle();

        if (error) throw error;

        const dbRow = data as DataMitraDbRow | null;
        const rows = normalizeJsonbRows(dbRow?.data);

        setAllRows(rows);
      } catch (error) {
        console.error("Error fetching published table:", error);
        setAllRows([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDataMitraRows();
  }, [dataMitraId]);

  if (loading) {
    return (
      <div className="flex w-full items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-sky-600" />
          <p className="text-sm text-gray-500">Loading data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full min-w-0 flex-col">
      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value)}
          className="grow rounded border border-gray-400 px-3 py-2 text-xs"
        >
          {columns.map((column) => (
            <option key={column.key} value={column.key}>
              Urutkan: {column.label}
            </option>
          ))}
        </select>

        {filters.map((filter) => (
          <select
            key={filter.key}
            value={selectedFilters[filter.key] ?? "all"}
            onChange={(event) => {
              setSelectedFilters((prev) => ({
                ...prev,
                [filter.key]: event.target.value,
              }));
            }}
            className="min-w-0 grow truncate overflow-hidden whitespace-nowrap rounded border border-gray-400 px-3 py-2 text-xs"
          >
            <option value="all">
              {filter.allLabel ?? `Semua ${filter.label}`}
            </option>

            {(filterOptions[filter.key] ?? []).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        ))}
      </div>

      <div className="mb-6 w-full overflow-x-auto rounded-sm border border-gray-950/20">
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

      <div className="mb-20 flex items-center justify-between gap-3 text-sm">
        <button
          disabled={page === 0}
          onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
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
          disabled={(page + 1) * pageSize >= totalRows}
          onClick={() => setPage((prev) => prev + 1)}
          className="rounded bg-sky-600 px-4 py-2 text-white disabled:opacity-40"
        >
          <RightChevron className="size-6" />
        </button>
      </div>
    </div>
  );
}
