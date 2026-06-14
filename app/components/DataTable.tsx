"use client";

import { useEffect, useMemo, useState } from "react";
import type { HTMLInputTypeAttribute } from "react";
import { getDataset } from "@/lib/supabase/supabaseHelper";

type DatasetValue = string | number | null | undefined;

type DatasetRow = {
  id: string;
  [key: string]: DatasetValue;
};

export type ColumnConfig = {
  key: string;
  label: string;
  editable?: boolean;
  inputType?: HTMLInputTypeAttribute;
  align?: "left" | "center" | "right";
};

export type FilterConfig = {
  key: string;
  label: string;
  allLabel?: string;
  sort?: "text-asc" | "number-asc" | "number-desc";
};

const isMissingValue = (value: DatasetValue) => {
  return value === null || value === undefined || value === "";
};

const displayValue = (value: DatasetValue) => {
  return isMissingValue(value) ? "N/A" : String(value);
};

interface Props {
  action: "add" | "edit" | "list";
  datasetName: string;
  columns: ColumnConfig[];
  filters?: FilterConfig[];
  defaultSortKey?: string;
}

export default function DataTable({
  action,
  datasetName,
  columns,
  filters = [],
  defaultSortKey,
}: Props) {
  const [dataset, setDataset] = useState<DatasetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilters, setSelectedFilters] = useState<
    Record<string, string>
  >({});

  const [sortBy, setSortBy] = useState(defaultSortKey ?? columns[0]?.key ?? "");

  useEffect(() => {
    const fetchDataset = async () => {
      setLoading(true);

      try {
        const data = await getDataset(datasetName);
        setDataset((data ?? []) as DatasetRow[]);
      } catch (err) {
        console.error(`Error fetching ${datasetName}:`, err);
        setDataset([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDataset();
  }, [datasetName]);

  const filterOptions = useMemo(() => {
    const options: Record<string, (string | number)[]> = {};

    filters.forEach((filter) => {
      const uniqueValues = Array.from(
        new Set(
          dataset
            .map((row) => row[filter.key])
            .filter((value): value is string | number => {
              return value !== null && value !== undefined && value !== "";
            }),
        ),
      );

      if (filter.sort === "number-desc") {
        uniqueValues.sort((a, b) => Number(b) - Number(a));
      } else if (filter.sort === "number-asc") {
        uniqueValues.sort((a, b) => Number(a) - Number(b));
      } else {
        uniqueValues.sort((a, b) => String(a).localeCompare(String(b)));
      }

      options[filter.key] = uniqueValues;
    });

    return options;
  }, [dataset, filters]);

  const filteredData = useMemo(() => {
    return dataset
      .filter((row) => {
        return filters.every((filter) => {
          const selectedValue = selectedFilters[filter.key] ?? "all";

          if (selectedValue === "all") return true;

          return String(row[filter.key] ?? "") === selectedValue;
        });
      })
      .sort((a, b) => {
        if (!sortBy) return 0;

        const sortColumn = columns.find((col) => col.key === sortBy);

        if (sortColumn?.inputType === "number" || sortBy === "year") {
          return Number(b[sortBy] ?? 0) - Number(a[sortBy] ?? 0);
        }

        return String(a[sortBy] ?? "").localeCompare(String(b[sortBy] ?? ""));
      });
  }, [dataset, filters, selectedFilters, sortBy, columns]);

  if (loading) {
    return (
      <div className="w-full flex justify-center items-center py-16">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-sky-600" />
          <p className="text-sm text-gray-500">Loading data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col">
      {action === "add" ? (
        <h1>ADD : UNDER CONSTRUCTION</h1>
      ) : (
        <div className="w-full overflow-x-auto">
          <div className="mb-4 flex flex-wrap gap-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border grow border-gray-400 rounded px-3 py-2 text-xs"
            >
              {columns.map((col) => (
                <option key={col.key} value={col.key}>
                  Urutkan: {col.label}
                </option>
              ))}
            </select>

            {filters.map((filter) => (
              <select
                key={filter.key}
                value={selectedFilters[filter.key] ?? "all"}
                onChange={(e) =>
                  setSelectedFilters((prev) => ({
                    ...prev,
                    [filter.key]: e.target.value,
                  }))
                }
                className="border grow border-gray-400 rounded px-3 py-2 text-xs"
              >
                <option value="all">
                  {filter.allLabel ?? `Semua ${filter.label}`}
                </option>

                {(filterOptions[filter.key] ?? []).map((option) => (
                  <option key={String(option)} value={String(option)}>
                    {option}
                  </option>
                ))}
              </select>
            ))}
          </div>

          <div className="overflow-x-auto mb-6">
            <table className="min-w-full lg:text-sm md:text-[1.5vw] text-[2vw]">
              <thead className="bg-sky-100">
                <tr>
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className="px-3 py-2 border border-gray-400 whitespace-normal break-words"
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filteredData.length > 0 ? (
                  filteredData.map((row, idx) => (
                    <tr key={row.id ?? idx}>
                      {columns.map((col) => {
                        const value = row[col.key];
                        const editable = action === "edit" && col.editable;

                        const alignClass =
                          col.align === "right"
                            ? "text-right"
                            : col.align === "center"
                              ? "text-center"
                              : "text-left";

                        return (
                          <td
                            key={col.key}
                            className={`border border-gray-400 ${
                              editable ? "p-0" : "px-3 py-2"
                            } ${alignClass}`}
                          >
                            {editable ? (
                              <input
                                type={col.inputType ?? "text"}
                                defaultValue={
                                  isMissingValue(value) ? "" : String(value)
                                }
                                placeholder="N/A"
                                className={`w-full px-3 py-2 border-2 border-sky-600 ${alignClass}`}
                              />
                            ) : (
                              displayValue(value)
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="px-3 py-8 border border-gray-400 text-center text-gray-500"
                    >
                      Tidak ada data.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div
        className={`${
          action === "edit" ? "flex" : "hidden"
        } justify-center items-center sticky z-1 bottom-5 xl:h-[3vw] h-[5vh] bg-white w-full rounded-2xl transition-transform duration-300`}
      >
        <button className="bg-green-600 hover:bg-green-200 text-white hover:text-black w-full h-full rounded-2xl cursor-pointer text-sm xl:text-lg">
          Simpan
        </button>
      </div>
    </div>
  );
}
