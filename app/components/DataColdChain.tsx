"use client";

import { useMemo, useState } from "react";
import DataTable, { type ColumnConfig, type FilterConfig } from "./DataTable";

const coldChainColumns: ColumnConfig[] = [
  {
    key: "year",
    label: "Tahun Ops",
    editable: true,
    inputType: "number",
    align: "center",
  },
  {
    key: "type",
    label: "Tipe Usaha",
    editable: true,
    inputType: "text",
    align: "center",
  },
  {
    key: "name",
    label: "Nama Usaha",
    editable: true,
    inputType: "text",
    align: "left",
  },
  {
    key: "kodkws",
    label: "Kode KWS",
    editable: true,
    inputType: "text",
    align: "center",
  },
  {
    key: "address",
    label: "Alamat",
    editable: true,
    inputType: "text",
    align: "left",
  },
  {
    key: "kel",
    label: "Kelurahan / Desa",
    editable: true,
    inputType: "text",
    align: "left",
  },
  {
    key: "kec",
    label: "Kecamatan",
    editable: true,
    inputType: "text",
    align: "left",
  },
  {
    key: "kab",
    label: "Kabupaten",
    editable: true,
    inputType: "text",
    align: "left",
  },
  {
    key: "prov",
    label: "Provinsi",
    editable: false,
    inputType: "text",
    align: "left",
  },
  {
    key: "es_pabrik",
    label: "Pabrik Es",
    editable: true,
    inputType: "number",
    color: "bg-gray-300",
    align: "center",
  },
  {
    key: "es_pabrik_jum_unit",
    label: "Jumlah Unit",
    editable: true,
    inputType: "number",
    color: "bg-gray-300",
    align: "center",
  },
  {
    key: "es_pabrik_kondisi",
    label: "Kondisi",
    editable: true,
    inputType: "text",
    color: "bg-gray-300",
    align: "center",
  },
  {
    key: "es_pabrik_tahun",
    label: "Tahun",
    editable: true,
    inputType: "number",
    color: "bg-gray-300",
    align: "center",
  },
  {
    key: "abf",
    label: "ABF",
    editable: true,
    inputType: "number",
    color: "bg-sky-200",
    align: "center",
  },
  {
    key: "abf_jum_unit",
    label: "Jumlah Unit",
    editable: true,
    inputType: "number",
    color: "bg-sky-200",
    align: "center",
  },
  {
    key: "abf_kondisi",
    label: "Kondisi",
    editable: true,
    inputType: "text",
    color: "bg-sky-200",
    align: "center",
  },
  {
    key: "abf_tahun",
    label: "Tahun",
    editable: true,
    inputType: "number",
    color: "bg-sky-200",
    align: "center",
  },
  {
    key: "es_storage",
    label: "Ice Storage",
    editable: true,
    inputType: "number",
    color: "bg-gray-300",
    align: "center",
  },
  {
    key: "es_storage_jum",
    label: "Jumlah Unit",
    editable: true,
    inputType: "number",
    color: "bg-gray-300",
    align: "center",
  },
  {
    key: "es_storage_kondisi",
    label: "Kondisi",
    editable: true,
    inputType: "text",
    color: "bg-gray-300",
    align: "center",
  },
  {
    key: "es_storage_tahun",
    label: "Tahun",
    editable: true,
    inputType: "number",
    color: "bg-gray-300",
    align: "center",
  },
  {
    key: "cs",
    label: "Cold Storage",
    editable: true,
    inputType: "number",
    color: "bg-sky-200",
    align: "center",
  },
  {
    key: "cs_jum_unit",
    label: "Jumlah Unit",
    editable: true,
    inputType: "number",
    color: "bg-sky-200",
    align: "center",
  },
  {
    key: "cs_kondisi",
    label: "Kondisi",
    editable: true,
    inputType: "text",
    color: "bg-sky-200",
    align: "center",
  },
  {
    key: "cs_tahun",
    label: "Tahun",
    editable: true,
    inputType: "number",
    color: "bg-sky-200",
    align: "center",
  },
  {
    key: "cpf",
    label: "Contact Plate Freezer",
    editable: true,
    inputType: "number",
    color: "bg-gray-300",
    align: "center",
  },
  {
    key: "cpf_jum_unit",
    label: "Jumlah Unit",
    editable: true,
    inputType: "number",
    color: "bg-gray-300",
    align: "center",
  },
  {
    key: "cpf_kondisi",
    label: "Kondisi",
    editable: true,
    inputType: "text",
    color: "bg-gray-300",
    align: "center",
  },
  {
    key: "cpf_tahun",
    label: "Tahun",
    editable: true,
    inputType: "number",
    color: "bg-gray-300",
    align: "center",
  },
  {
    key: "lat",
    label: "LAT",
    editable: true,
    inputType: "number",
    align: "center",
  },
  {
    key: "lon",
    label: "LON",
    editable: true,
    inputType: "number",
    align: "center",
  },
];

const coldChainFilters: FilterConfig[] = [
  {
    key: "year",
    label: "Tahun Ops",
    allLabel: "Semua Tahun",
    sort: "number-desc",
  },
  {
    key: "type",
    label: "Tipe Usaha",
    allLabel: "Semua Tipe",
    sort: "text-asc",
  },
  {
    key: "name",
    label: "Nama Usaha",
    allLabel: "Semua Usaha",
    sort: "text-asc",
  },
];

export default function DataColdChain({
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
    coldChainColumns.map((column) => column.key),
  );

  const visibleColumns = useMemo(
    () =>
      coldChainColumns.filter((column) =>
        visibleColumnKeys.includes(column.key),
      ),
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
    setVisibleColumnKeys(coldChainColumns.map((column) => column.key));
  };

  // ! CONFIGURE MAIN COLUMNS (KEY) TO SHOW
  const showMainColumnsOnly = () => {
    setVisibleColumnKeys(["year", "name", "kab"]);
  };

  return (
    <div className="space-y-3 w-full">
      <details className="group relative">
        <summary className="cursor-pointer rounded-sm border border-gray-400 bg-white px-3 py-2 text-xs group-open:border-2 group-open:border-black">
          Kolom ({visibleColumnKeys.length}/{coldChainColumns.length})
        </summary>

        <div className="absolute left-0 z-30 mt-2 w-full rounded-lg border-1 border-gray-400 bg-white shadow-lg">
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
              className="text-xs text-sky-600 hover:underline"
            >
              Kolom utama
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto p-2">
            {coldChainColumns.map((column) => (
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
        datasetName="cold_chain"
        columns={visibleColumns}
        filters={coldChainFilters}
        defaultSortKey="year"
      />
    </div>
  );
}
