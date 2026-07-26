"use client";

import type { Dispatch, RefObject, SetStateAction } from "react";
import type { ColumnConfig } from "./DatasetTable";

type DataValue = string | number | boolean | null;

type DataJsonRow = {
  id: string;
  [key: string]: DataValue;
};

type ImportColumnConfig = {
  originalHeader: string;
  key: string;
  label: string;
  selected: boolean;
  inputType: "text" | "number";
  align: "left" | "right";
};

type DatasetConfigAddProps = {
  newLabel: string;
  setNewLabel: Dispatch<SetStateAction<string>>;

  hasImportedCsv: boolean;
  isDragging: boolean;
  setIsDragging: Dispatch<SetStateAction<boolean>>;
  fileInputRef: RefObject<HTMLInputElement | null>;

  handleCsvFile: (file: File) => void;
  resetImportedCsv: () => void;

  importColumns: ImportColumnConfig[];
  selectedImportCount: number;
  toggleAllImportColumns: () => void;
  toggleImportColumn: (key: string) => void;
  updateImportColumnLabel: (key: string, label: string) => void;

  newColumns: ColumnConfig[];

  newDataRows: DataJsonRow[];
};

export default function DatasetConfigAdd({
  newLabel,
  setNewLabel,
  hasImportedCsv,
  isDragging,
  setIsDragging,
  fileInputRef,
  handleCsvFile,
  resetImportedCsv,
  importColumns,
  selectedImportCount,
  toggleAllImportColumns,
  toggleImportColumn,
  updateImportColumnLabel,
  newColumns,
  newDataRows,
}: DatasetConfigAddProps) {
  return (
    <div className="space-y-5">
      <div className="flex w-full">
        <label className="flex w-full flex-col text-sm">
          <span className="font-medium">Judul Dataset</span>

          <input
            value={newLabel}
            onChange={(event) => setNewLabel(event.target.value)}
            placeholder="Contoh: Data Perikanan Tangkap Per Kabupaten"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
      </div>

      {!hasImportedCsv ? (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);

            const file = event.dataTransfer.files?.[0];

            if (file) {
              handleCsvFile(file);
            }
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`flex min-h-[50vh] cursor-pointer flex-col items-center justify-center rounded-lg border-5 border-dashed p-6 text-center text-sm transition ${
            isDragging
              ? "border-sky-500 bg-sky-50"
              : "border-gray-300 bg-white hover:bg-gray-50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];

              if (file) {
                handleCsvFile(file);
              }

              event.target.value = "";
            }}
          />

          <p className="font-medium text-gray-700 text-2xl">
            Drag CSV ke sini atau klik untuk pilih file
          </p>

          <p className="mt-1 text-gray-500 text-lg">
            Setelah file dipilih, Anda dapat memilih kolom yang akan diimpor dan
            mengganti nama kolom.
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={resetImportedCsv}
          className="w-full rounded-lg border border-gray-300 bg-sky-700 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-800"
        >
          Pilih Data Lain
        </button>
      )}

      {hasImportedCsv && (
        <div className="space-y-4">
          <div className="rounded-md border border-gray-300 bg-white p-3">
            <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-sm font-semibold">
                  Pilih Kolom yang Diimpor
                </h3>

                <p className="text-xs text-gray-500">
                  Dipilih: {selectedImportCount} dari {importColumns.length}{" "}
                  kolom.
                </p>
              </div>

              <button
                type="button"
                onClick={toggleAllImportColumns}
                className="rounded-md border border-gray-300 px-3 py-2 text-xs font-medium hover:bg-gray-100"
              >
                {selectedImportCount === importColumns.length
                  ? "Hapus Semua Pilihan"
                  : "Pilih Semua Kolom"}
              </button>
            </div>

            <div className="overflow-x-auto rounded-md border border-gray-300">
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th className="border border-gray-300 bg-sky-100 px-3 py-2 text-center">
                      Import
                    </th>
                    <th className="border border-gray-300 bg-sky-100 px-3 py-2">
                      Kolom Asli
                    </th>
                    <th className="border border-gray-300 bg-sky-100 px-3 py-2">
                      Nama Kolom
                    </th>
                    <th className="border border-gray-300 bg-sky-100 px-3 py-2">
                      Tipe
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {importColumns.map((column) => (
                    <tr key={column.key}>
                      <td className="border border-gray-300 px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={column.selected}
                          onChange={() => toggleImportColumn(column.key)}
                        />
                      </td>

                      <td className="border border-gray-300 px-3 py-2">
                        <div>{column.originalHeader}</div>
                        <div className="text-[10px] text-gray-500">
                          {column.key}
                        </div>
                      </td>

                      <td className="border border-gray-300 p-0">
                        <input
                          value={column.label}
                          disabled={!column.selected}
                          onChange={(event) =>
                            updateImportColumnLabel(
                              column.key,
                              event.target.value,
                            )
                          }
                          className="w-full px-3 py-2 disabled:bg-gray-100 disabled:text-gray-400"
                        />
                      </td>

                      <td className="border border-gray-300 px-3 py-2 text-center">
                        {column.inputType}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {newColumns.length === 0 && (
            <div className="rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-700">
              Pilih minimal satu kolom untuk diimpor.
            </div>
          )}

          {newColumns.length > 0 && (
            <>
              <div className="overflow-x-auto rounded-md border border-gray-300">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr>
                      {newColumns.map((column) => (
                        <th
                          key={column.key}
                          className="border border-gray-300 bg-sky-100 px-3 py-2"
                        >
                          <div>{column.label}</div>
                          <div className="text-[10px] font-normal text-gray-500">
                            {column.key} · {column.inputType}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {newDataRows.slice(0, 10).map((row) => (
                      <tr key={row.id}>
                        {newColumns.map((column) => (
                          <td
                            key={column.key}
                            className={`border border-gray-300 px-3 py-2 ${
                              column.align === "right"
                                ? "text-right"
                                : column.align === "center"
                                  ? "text-center"
                                  : "text-left"
                            }`}
                          >
                            {String(row[column.key] ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-gray-500">
                Preview menampilkan maksimal 10 baris pertama. Total data yang
                akan diimpor: {newDataRows.length} baris.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
