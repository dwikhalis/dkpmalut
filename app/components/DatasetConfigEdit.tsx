"use client";

import type { Dispatch, SetStateAction } from "react";
import type { ColumnConfig, FilterConfig } from "./DataTableMitra";

type EditOption = {
  id: string;
  label: string;
};

type Props = {
  editOptions: EditOption[];

  selectedEditId: string;
  setSelectedEditId: Dispatch<SetStateAction<string>>;

  editName: string;
  setEditName: Dispatch<SetStateAction<string>>;

  editColumns: ColumnConfig[];
  editFilters: FilterConfig[];
  setEditFilters: Dispatch<SetStateAction<FilterConfig[]>>;

  editMainKeys: string[];
  setEditMainKeys: Dispatch<SetStateAction<string[]>>;

  updateColumn: (
    index: number,
    field: keyof ColumnConfig,
    value: string | boolean,
  ) => void;

  toggleFilter: (
    column: ColumnConfig,
    currentFilters: FilterConfig[],
    setCurrentFilters: Dispatch<SetStateAction<FilterConfig[]>>,
  ) => void;

  toggleMainKey: (
    key: string,
    currentKeys: string[],
    setCurrentKeys: Dispatch<SetStateAction<string[]>>,
  ) => void;
};

export default function DatasetConfigEdit({
  editOptions,
  selectedEditId,
  setSelectedEditId,
  editName,
  setEditName,
  editColumns,
  editFilters,
  setEditFilters,
  editMainKeys,
  setEditMainKeys,
  updateColumn,
  toggleFilter,
  toggleMainKey,
}: Props) {
  return (
    <div className="space-y-5">
      <div className="flex w-full">
        <label className="flex w-full flex-col text-sm">
          <span className="font-medium">Dataset</span>

          <select
            value={selectedEditId}
            onChange={(event) => setSelectedEditId(event.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            {editOptions.map((row) => (
              <option key={row.id} value={row.id}>
                {row.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex w-full flex-col text-sm">
        <span className="text-sm font-medium">Judul Dataset</span>

        <input
          value={editName}
          onChange={(event) => setEditName(event.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </label>

      <div className="overflow-x-auto rounded-md border border-gray-300">
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              <th className="border border-gray-300 bg-sky-100 px-3 py-2">
                Key
              </th>
              <th className="border border-gray-300 bg-sky-100 px-3 py-2">
                Label
              </th>
              <th className="border border-gray-300 bg-sky-100 px-3 py-2">
                Type
              </th>
              <th className="border border-gray-300 bg-sky-100 px-3 py-2">
                Align
              </th>
              <th className="border border-gray-300 bg-sky-100 px-3 py-2">
                Filter
              </th>
              <th className="border border-gray-300 bg-sky-100 px-3 py-2">
                Main
              </th>
            </tr>
          </thead>

          <tbody>
            {editColumns.map((column, index) => (
              <tr key={column.key}>
                <td className="border border-gray-300 px-3 py-2 text-xs text-gray-600">
                  {column.key}
                </td>

                <td className="border border-gray-300 p-0">
                  <input
                    value={column.label}
                    onChange={(event) =>
                      updateColumn(index, "label", event.target.value)
                    }
                    className="w-full px-3 py-2"
                  />
                </td>

                <td className="border border-gray-300 p-0">
                  <select
                    value={column.inputType}
                    onChange={(event) =>
                      updateColumn(index, "inputType", event.target.value)
                    }
                    className="w-full bg-white px-3 py-2"
                  >
                    <option value="text">text</option>
                    <option value="number">number</option>
                  </select>
                </td>

                <td className="border border-gray-300 p-0">
                  <select
                    value={column.align ?? "left"}
                    onChange={(event) =>
                      updateColumn(index, "align", event.target.value)
                    }
                    className="w-full bg-white px-3 py-2"
                  >
                    <option value="left">left</option>
                    <option value="center">center</option>
                    <option value="right">right</option>
                  </select>
                </td>

                <td className="border border-gray-300 px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={editFilters.some(
                      (filter) => filter.key === column.key,
                    )}
                    onChange={() =>
                      toggleFilter(column, editFilters, setEditFilters)
                    }
                  />
                </td>

                <td className="border border-gray-300 px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={editMainKeys.includes(column.key)}
                    onChange={() =>
                      toggleMainKey(
                        column.key,
                        editMainKeys,
                        setEditMainKeys,
                      )
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}