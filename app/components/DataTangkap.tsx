"use client";

import { useMemo, useState } from "react";

import DataTable, { type ColumnConfig, type FilterConfig } from "./DataTable";

const tangkapColumns: ColumnConfig[] = [
  {
    key: "kab",
    label: "Kabupaten",
    align: "left",
  },
  {
    key: "year",
    label: "Tahun",
    align: "center",
  },
  {
    key: "semester",
    label: "Semester",
    editable: true,
    inputType: "number",
    align: "center",
  },
  {
    key: "landing",
    label: "Pendaratan",
    editable: true,
    inputType: "text",
    align: "left",
  },
  {
    key: "class",
    label: "Kelas",
    editable: true,
    inputType: "text",
    align: "left",
  },
  {
    key: "name",
    label: "Nama Ikan",
    editable: true,
    inputType: "text",
    align: "left",
  },
  {
    key: "common",
    label: "Nama Umum",
    editable: true,
    inputType: "text",
    align: "left",
  },
  {
    key: "alias",
    label: "Nama Lain",
    editable: true,
    inputType: "text",
    align: "left",
  },
  {
    key: "scientific",
    label: "Nama Ilmiah",
    editable: true,
    inputType: "text",
    align: "left",
  },
  {
    key: "genus",
    label: "Genus",
    editable: true,
    inputType: "text",
    align: "left",
  },
  {
    key: "species",
    label: "Spesies",
    editable: true,
    inputType: "text",
    align: "left",
  },
  {
    key: "weight",
    label: "Berat (kg)",
    editable: true,
    inputType: "number",
    align: "right",
  },
];

const tangkapFilters: FilterConfig[] = [
  {
    key: "year",
    label: "Tahun",
    allLabel: "Semua Tahun",
    sort: "number-desc",
  },
  {
    key: "kab",
    label: "Kabupaten",
    allLabel: "Semua Kabupaten",
    sort: "text-asc",
  },
  {
    key: "name",
    label: "Ikan",
    allLabel: "Semua Ikan",
    sort: "text-asc",
  },
  {
    key: "class",
    label: "Kelas",
    allLabel: "Semua Kelas",
    sort: "text-asc",
  },
];

export default function DataTangkap({
  action,
  saveData,
  onSignalAction,
}: {
  action: "add" | "edit" | "list" | "delete";
  saveData: number;
  onSignalAction: (signal: string) => void;
}) {
  // ! BUTTON SELECT VISIBLE COLUMNS

  const [visibleColumnKeys, setVisibleColumnKeys] = useState<string[]>(() =>
    tangkapColumns.map((column) => column.key),
  );

  const visibleColumns = useMemo(
    () =>
      tangkapColumns.filter((column) => visibleColumnKeys.includes(column.key)),
    [visibleColumnKeys],
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
    setVisibleColumnKeys(tangkapColumns.map((column) => column.key));
  };

  // ! CONFIGURE MAIN COLUMNS (KEY) TO SHOW
  const showMainColumnsOnly = () => {
    setVisibleColumnKeys([
      "kab",
      "year",
      "semester",
      "landing",
      "name",
      "weight",
    ]);
  };
  return (
    <div className="space-y-3 w-full">
      <details className="relative">
        <summary className="cursor-pointer rounded-sm border border-gray-400 bg-white px-3 py-2 text-xs font-medium">
          Kolom ({visibleColumnKeys.length}/{tangkapColumns.length})
        </summary>

        <div className="absolute left-0 z-30 mt-2 w-full  rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <button
              type="button"
              onClick={showAllColumns}
              className="text-xs font-medium text-sky-600 hover:underline"
            >
              Tampilkan semua
            </button>

            <button
              type="button"
              onClick={showMainColumnsOnly}
              className="text-xs font-medium text-sky-600 hover:underline"
            >
              Kolom utama
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto p-2">
            {tangkapColumns.map((column) => (
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
        datasetName="tangkap"
        columns={visibleColumns}
        filters={tangkapFilters}
        defaultSortKey="kab"
      />
    </div>
  );
}
