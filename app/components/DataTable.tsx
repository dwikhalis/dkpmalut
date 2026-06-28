"use client";

import { useEffect, useRef, useState } from "react";
import type { ClipboardEvent, HTMLInputTypeAttribute } from "react";
import {
  addDataRows,
  updateDataRows,
  deleteDataRows,
  getDatasetPage,
  getDistinctColumnValues,
} from "@/lib/supabase/supabaseHelper";
import AlertNotif from "./AlertNotif";
import { LeftChevron, RightChevron } from "@/public/icons/iconSets";

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
  color?: string;
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

const createEmptyRows = (count: number) => {
  return Array.from(
    { length: count },
    (_, index) =>
      ({
        id: `new-${index}`,
      }) as DatasetRow,
  );
};

interface Props {
  action: "add" | "edit" | "list" | "delete";
  saveData: number;
  onSignalAction: (signal: string) => void;
  datasetName: string;
  columns: ColumnConfig[];
  filters?: FilterConfig[];
  defaultSortKey?: string;
}

export default function DataTable({
  action,
  saveData,
  onSignalAction,
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

  //! SORTING STATE
  const [sortBy, setSortBy] = useState(defaultSortKey ?? columns[0]?.key ?? "");

  //! EDIT STATE
  const [editedRows, setEditedRows] = useState<
    Record<string, Partial<DatasetRow>>
  >({});

  //! ADD STATE
  const [newRows, setNewRows] = useState<DatasetRow[]>(() =>
    createEmptyRows(10),
  );

  //! DELETE STATE
  const [selectedDeleteIds, setSelectedDeleteIds] = useState<string[]>([]);

  //! PAGINATION STATE
  const [page, setPage] = useState(0);
  const [pageSize] = useState(50);
  const [totalRows, setTotalRows] = useState(0);

  const [alertType, setAlertType] = useState<
    | "none"
    | "confirm-update"
    | "confirm-add"
    | "confirm-delete"
    | "success-update"
    | "success-add"
    | "success-delete"
    | "no-update"
    | "no-add"
    | "no-delete"
    | "failed"
  >("none");

  //! FILTER STATE
  const [filterOptions, setFilterOptions] = useState<Record<string, string[]>>(
    {},
  );

  const [saving, setSaving] = useState(false);
  const lastHandledSave = useRef(0);

  // ! FETCH DATASET
  const getSortDesc = () => {
    const sortColumn = columns.find((col) => col.key === sortBy);

    return sortColumn?.inputType === "number" || sortBy === "year";
  };

  const fetchDatasetPage = async () => {
    setLoading(true);

    try {
      const result = await getDatasetPage({
        datasetName,
        filters: selectedFilters,
        sortBy,
        sortDesc: getSortDesc(),
        page,
        pageSize,
      });

      setDataset((result.data ?? []) as DatasetRow[]);
      setTotalRows(result.count);
    } catch (err) {
      console.error(`Error fetching ${datasetName}:`, err);
      setDataset([]);
      setTotalRows(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (action === "add") return;

    fetchDatasetPage();
  }, [datasetName, selectedFilters, sortBy, page, pageSize, action]);

  // ! FETCH FILTER OPTIONS BASED ON DISTINCT VALUE
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const options: Record<string, string[]> = {};

        await Promise.all(
          filters.map(async (filter) => {
            const values = await getDistinctColumnValues(
              datasetName,
              filter.key,
            );

            if (filter.sort === "number-desc") {
              values.sort((a, b) => Number(b) - Number(a));
            } else if (filter.sort === "number-asc") {
              values.sort((a, b) => Number(a) - Number(b));
            } else {
              values.sort((a, b) => a.localeCompare(b));
            }

            options[filter.key] = values;
          }),
        );

        setFilterOptions(options);
      } catch (err) {
        console.error("Failed to fetch filter options:", err);
        setFilterOptions({});
      }
    };

    fetchFilterOptions();
  }, [datasetName, filters]);

  //! USE EFFECT TO RESET "ACTION" (ADD, UPDATE, DELETE) STATE
  useEffect(() => {
    if (action === "add") {
      setNewRows(createEmptyRows(10));
      setEditedRows({});
      setSelectedDeleteIds([]);
      setSelectedFilters({});
    }

    if (action === "edit") {
      setSelectedDeleteIds([]);
    }

    if (action === "delete") {
      setEditedRows({});
    }

    if (action === "list") {
      setEditedRows({});
      setSelectedDeleteIds([]);
    }
  }, [action, datasetName]);

  const normalizeInputValue = (
    value: string,
    inputType?: HTMLInputTypeAttribute,
  ) => {
    if (value === "") return "";

    return inputType === "number" ? Number(value) : value;
  };

  const getRowsToAdd = () => {
    return newRows
      .map((row) => {
        const rowToInsert: Record<string, string | number | null> = {};

        columns.forEach((col) => {
          if (col.key === "id") return;

          const value = row[col.key];

          if (!isMissingValue(value)) {
            rowToInsert[col.key] = value as string | number;
          }
        });

        return rowToInsert;
      })
      .filter((row) => Object.keys(row).length > 0);
  };

  useEffect(() => {
    if (saveData === 0) return;
    if (saveData === lastHandledSave.current) return;

    lastHandledSave.current = saveData;

    if (action === "edit") {
      const hasChanges = Object.keys(editedRows).length > 0;

      if (!hasChanges) {
        setAlertType("no-update");
        return;
      }

      setAlertType("confirm-update");
      return;
    }

    if (action === "add") {
      const rowsToAdd = getRowsToAdd();

      if (rowsToAdd.length === 0) {
        setAlertType("no-add");
        return;
      }

      setAlertType("confirm-add");
    }

    if (action === "delete") {
      if (selectedDeleteIds.length === 0) {
        setAlertType("no-delete");
        return;
      }

      setAlertType("confirm-delete");
    }
  }, [saveData, action, editedRows, newRows, selectedDeleteIds]);

  const handleCellChange = (
    rowId: string,
    key: string,
    value: string,
    inputType?: HTMLInputTypeAttribute,
  ) => {
    const finalValue = normalizeInputValue(value, inputType);

    setEditedRows((prev) => ({
      ...prev,
      [rowId]: {
        ...prev[rowId],
        [key]: finalValue,
      },
    }));
  };

  const handleNewCellChange = (
    rowIndex: number,
    key: string,
    value: string,
    inputType?: HTMLInputTypeAttribute,
  ) => {
    const finalValue = normalizeInputValue(value, inputType);

    setNewRows((prev) =>
      prev.map((row, index) =>
        index === rowIndex
          ? {
              ...row,
              [key]: finalValue,
            }
          : row,
      ),
    );
  };

  const handlePasteToEdit = (
    e: ClipboardEvent<HTMLInputElement>,
    startRowIndex: number,
    startColIndex: number,
  ) => {
    e.preventDefault();

    const pastedText = e.clipboardData.getData("text");

    const pastedRows = pastedText
      .trim()
      .split(/\r?\n/)
      .map((row) => row.split("\t"));

    setEditedRows((prev) => {
      const next = { ...prev };

      pastedRows.forEach((pastedRow, rowOffset) => {
        const targetRow = dataset[startRowIndex + rowOffset];

        if (!targetRow) return;

        pastedRow.forEach((cellValue, colOffset) => {
          const targetColumn = columns[startColIndex + colOffset];

          if (!targetColumn) return;
          if (!targetColumn.editable) return;

          next[targetRow.id] = {
            ...next[targetRow.id],
            [targetColumn.key]: normalizeInputValue(
              cellValue,
              targetColumn.inputType,
            ),
          };
        });
      });

      return next;
    });
  };

  const handlePasteToAdd = (
    e: ClipboardEvent<HTMLInputElement>,
    startRowIndex: number,
    startColIndex: number,
  ) => {
    e.preventDefault();

    const pastedText = e.clipboardData.getData("text");

    const pastedRows = pastedText
      .trim()
      .split(/\r?\n/)
      .map((row) => row.split("\t"));

    setNewRows((prev) => {
      const next = prev.map((row) => ({ ...row }));

      pastedRows.forEach((pastedRow, rowOffset) => {
        const targetRowIndex = startRowIndex + rowOffset;

        if (!next[targetRowIndex]) return;

        pastedRow.forEach((cellValue, colOffset) => {
          const targetColumn = columns[startColIndex + colOffset];

          if (!targetColumn) return;
          if (targetColumn.editable === false) return;

          next[targetRowIndex] = {
            ...next[targetRowIndex],
            [targetColumn.key]: normalizeInputValue(
              cellValue,
              targetColumn.inputType,
            ),
          };
        });
      });

      return next;
    });
  };

  //! HANDLE FUNCTION FOR ACTION CONFIRMATION
  const handleConfirmUpdate = async (confirmation: boolean) => {
    if (!confirmation) {
      setAlertType("none");
      return;
    }

    setSaving(true);

    try {
      const rowsToUpdate = Object.entries(editedRows).map(([id, changes]) => ({
        id,
        ...changes,
      }));

      await updateDataRows(datasetName, rowsToUpdate);

      await refreshDataset();

      setEditedRows({});
      setAlertType("success-update");
    } catch (err) {
      console.error("Failed to update data:", err);
      setAlertType("failed");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmAdd = async (confirmation: boolean) => {
    if (!confirmation) {
      setAlertType("none");
      return;
    }

    const rowsToAdd = getRowsToAdd();

    if (rowsToAdd.length === 0) {
      setAlertType("no-add");
      return;
    }

    setSaving(true);

    try {
      await addDataRows(datasetName, rowsToAdd);

      await refreshDataset();

      setNewRows(createEmptyRows(10));
      setAlertType("success-add");
    } catch (err) {
      console.error("Failed to add data:", err);
      setAlertType("failed");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async (confirmation: boolean) => {
    if (!confirmation) {
      setAlertType("none");
      return;
    }

    if (selectedDeleteIds.length === 0) {
      setAlertType("no-delete");
      return;
    }

    setSaving(true);

    try {
      await deleteDataRows(datasetName, selectedDeleteIds);

      await refreshDataset();

      setSelectedDeleteIds([]);
      setAlertType("success-delete");
    } catch (err) {
      console.error("Failed to delete data:", err);
      setAlertType("failed");
    } finally {
      setSaving(false);
    }
  };

  //! HANDLE FUNCTION FOR RESULT TO TRIGGER ALERT NOTIFICATION
  const handleResultAlert = () => {
    if (alertType === "success-update") {
      onSignalAction("Updated");
    }

    if (alertType === "success-add") {
      onSignalAction("Added");
    }

    if (alertType === "success-delete") {
      onSignalAction("Deleted");
    }

    setAlertType("none");
  };

  //! HANDLE SELECT ROW TO DELETE, OR, SELECT ALL THAT VISIBLE IN TABLE
  const handleSelectDeleteRow = (rowId: string) => {
    setSelectedDeleteIds((prev) =>
      prev.includes(rowId)
        ? prev.filter((id) => id !== rowId)
        : [...prev, rowId],
    );
  };

  const handleSelectAllDeleteRows = () => {
    const visibleIds = dataset.map((row) => row.id);

    const allSelected = visibleIds.every((id) =>
      selectedDeleteIds.includes(id),
    );

    if (allSelected) {
      setSelectedDeleteIds((prev) =>
        prev.filter((id) => !visibleIds.includes(id)),
      );
    } else {
      setSelectedDeleteIds((prev) =>
        Array.from(new Set([...prev, ...visibleIds])),
      );
    }
  };

  //! REFRESH DATASET AFTER CHANGES
  const refreshDataset = async () => {
    await fetchDatasetPage();
  };

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
    <>
      <div className="flex w-full min-w-0 max-w-full flex-col overflow-hidden">
        <div className="flex h-full w-full min-w-0 max-w-full flex-col overflow-hidden">
          {/* //! TABLE : ADDING NEW DATA */}
          {action === "add" ? (
            <div className="w-full min-w-0 max-w-full overflow-hidden">
              <div className="mb-6 w-full min-w-0 max-w-full overflow-x-auto rounded-sm border border-gray-950/20">
                <table className="w-max min-w-full border-collapse lg:text-sm md:text-[1.5vw] text-[2vw]">
                  <thead>
                    <tr>
                      {columns.map((col) => (
                        <th
                          key={col.key}
                          className={`${col.color ? col.color : "bg-sky-100"} px-3 py-2 border border-gray-400 whitespace-normal break-words`}
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {newRows.map((row, rowIndex) => (
                      <tr key={row.id}>
                        {columns.map((col, colIndex) => {
                          const alignClass =
                            col.align === "right"
                              ? "text-right"
                              : col.align === "center"
                                ? "text-center"
                                : "text-left";

                          return (
                            <td
                              key={col.key}
                              className={`border border-gray-400 p-0 ${alignClass}`}
                            >
                              <input
                                type={col.inputType ?? "text"}
                                value={String(row[col.key] ?? "")}
                                onChange={(e) =>
                                  handleNewCellChange(
                                    rowIndex,
                                    col.key,
                                    e.target.value,
                                    col.inputType,
                                  )
                                }
                                onPaste={(e) =>
                                  handlePasteToAdd(e, rowIndex, colIndex)
                                }
                                className={`w-full px-3 py-2 ${alignClass}`}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            //! TABLE : NORMAL, BUT CAN EDIT AND DELETE
            <div className="w-full min-w-0 max-w-full overflow-hidden">
              <div className="mb-4 flex flex-wrap gap-3">
                {/* //! SORT BY */}
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setPage(0);
                  }}
                  className="border grow border-gray-400 rounded px-3 py-2 text-xs"
                >
                  {columns.map((col) => (
                    <option key={col.key} value={col.key}>
                      Urutkan: {col.label}
                    </option>
                  ))}
                </select>

                {/* //! FILTERS */}
                {filters.map((filter) => (
                  <select
                    key={filter.key}
                    value={selectedFilters[filter.key] ?? "all"}
                    onChange={(e) => {
                      setSelectedFilters((prev) => ({
                        ...prev,
                        [filter.key]: e.target.value,
                      }));

                      setPage(0);
                    }}
                    className="min-w-0 grow truncate overflow-hidden whitespace-nowrap border border-gray-400 rounded px-3 py-2 text-xs"
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

              <div className="mb-6 w-full min-w-0 max-w-full overflow-x-auto rounded-sm border border-gray-950/20">
                <table className="w-max min-w-full border-collapse lg:text-sm md:text-[1.5vw] text-[2vw]">
                  <thead>
                    <tr>
                      {action === "delete" && (
                        <th className="px-3 py-2 border border-gray-400 text-center">
                          <input
                            type="checkbox"
                            checked={
                              dataset.length > 0 &&
                              dataset.every((row) =>
                                selectedDeleteIds.includes(row.id),
                              )
                            }
                            onChange={handleSelectAllDeleteRows}
                            className="h-5 w-5 cursor-pointer"
                          />
                        </th>
                      )}

                      {columns.map((col) => (
                        <th
                          key={col.key}
                          className={`${col.color ? col.color : "bg-sky-100"} min-w-32 px-3 py-2 border border-gray-400 whitespace-normal break-words`}
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {dataset.length > 0 ? (
                      dataset.map((row, rowIndex) => (
                        <tr key={row.id ?? rowIndex}>
                          {action === "delete" && (
                            <td className="border border-gray-400 px-3 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={selectedDeleteIds.includes(row.id)}
                                onChange={() => handleSelectDeleteRow(row.id)}
                                className="h-5 w-5 cursor-pointer"
                              />
                            </td>
                          )}
                          {columns.map((col, colIndex) => {
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
                                    value={String(
                                      editedRows[row.id]?.[col.key] ??
                                        (isMissingValue(value) ? "" : value),
                                    )}
                                    onChange={(e) =>
                                      handleCellChange(
                                        row.id,
                                        col.key,
                                        e.target.value,
                                        col.inputType,
                                      )
                                    }
                                    onPaste={(e) =>
                                      handlePasteToEdit(e, rowIndex, colIndex)
                                    }
                                    placeholder="N/A"
                                    className={`block w-full min-w-32 px-3 py-2 ${alignClass}`}
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
                          colSpan={
                            columns.length + (action === "delete" ? 1 : 0)
                          }
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
        </div>

        {action !== "add" && (
          <div className="mb-20 flex items-center justify-between gap-3 text-sm">
            <button
              disabled={page === 0}
              onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
              className="rounded bg-gray-600 px-4 py-2 text-white disabled:opacity-40"
            >
              <LeftChevron className="size-6" />
            </button>

            <p className="text-center text-gray-700">
              Page {page + 1} / {Math.max(Math.ceil(totalRows / pageSize), 1)}
              <br />
              <span className="text-xs text-gray-500">
                Total data: {totalRows}
              </span>
            </p>

            <button
              disabled={(page + 1) * pageSize >= totalRows}
              onClick={() => setPage((prev) => prev + 1)}
              className="rounded bg-sky-600 px-4 py-2 text-white disabled:opacity-40"
            >
              <RightChevron className="size-6" />
            </button>
          </div>
        )}
      </div>
      {alertType === "confirm-update" && (
        <AlertNotif
          type="double"
          msg="Apakah Anda yakin ingin mengupdate data?"
          yesText="Ya"
          noText="Tidak"
          icon="warning"
          loading={saving}
          confirm={handleConfirmUpdate}
        />
      )}

      {alertType === "confirm-add" && (
        <AlertNotif
          type="double"
          msg="Apakah Anda yakin ingin menambahkan data?"
          yesText="Ya"
          noText="Tidak"
          icon="warning"
          loading={saving}
          confirm={handleConfirmAdd}
        />
      )}

      {alertType === "confirm-delete" && (
        <AlertNotif
          type="double"
          msg={`Apakah Anda yakin ingin menghapus ${selectedDeleteIds.length} data?`}
          yesText="Ya"
          noText="Tidak"
          icon="warning"
          loading={saving}
          confirm={handleConfirmDelete}
        />
      )}

      {alertType === "success-update" && (
        <AlertNotif
          type="single"
          msg="Data telah diupdate"
          yesText="OK"
          icon="success"
          confirm={handleResultAlert}
        />
      )}

      {alertType === "success-add" && (
        <AlertNotif
          type="single"
          msg="Data telah ditambahkan"
          yesText="OK"
          icon="success"
          confirm={handleResultAlert}
        />
      )}

      {alertType === "success-delete" && (
        <AlertNotif
          type="single"
          msg="Data telah dihapus"
          yesText="OK"
          icon="success"
          confirm={handleResultAlert}
        />
      )}

      {alertType === "no-update" && (
        <AlertNotif
          type="single"
          msg="Data tidak ada perubahan"
          yesText="OK"
          icon="warning"
          confirm={() => setAlertType("none")}
        />
      )}

      {alertType === "no-add" && (
        <AlertNotif
          type="single"
          msg="Tidak ada data yang ditambahkan"
          yesText="OK"
          icon="warning"
          confirm={() => setAlertType("none")}
        />
      )}

      {alertType === "no-delete" && (
        <AlertNotif
          type="single"
          msg="Tidak ada data yang dipilih untuk dihapus"
          yesText="OK"
          icon="warning"
          confirm={() => setAlertType("none")}
        />
      )}

      {alertType === "failed" && (
        <AlertNotif
          type="single"
          msg="Penyimpanan data gagal"
          yesText="OK"
          icon="failed"
          confirm={() => setAlertType("none")}
        />
      )}
    </>
  );
}
