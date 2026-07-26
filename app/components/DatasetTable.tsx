"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ClipboardEvent, HTMLInputTypeAttribute } from "react";
import { supabase } from "@/lib/supabase/supabaseClient";
import { useUrlTableState } from "@/lib/hooks/useUrlTableState";
import AlertNotif from "./AlertNotif";
import SpinnerLoading from "./SpinnerLoading";
import { DownChevron, LeftChevron, RightChevron } from "@/public/icons/iconSets";

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

type DatasetDbRow = {
  id: string;
  data: unknown;
};

type TableSort = {
  key: string;
  direction: "asc" | "desc";
} | null;

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

const createEmptyRows = (count: number) => {
  return Array.from(
    { length: count },
    (_, index) =>
      ({
        id: `new-${index}`,
      }) as DatasetRow,
  );
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

interface Props {
  action: "add" | "edit" | "list" | "delete";
  saveData: number;
  onSignalAction: (signal: string) => void;
  onChangeCountChange?: (count: number) => void;

  datasetId: string;

  columns: ColumnConfig[];
  filters?: FilterConfig[];
  defaultSortKey?: string;
}

export default function DatasetTable({
  action,
  saveData,
  onSignalAction,
  onChangeCountChange,
  datasetId,
  columns,
  filters = [],
  defaultSortKey,
}: Props) {
  const [allRows, setAllRows] = useState<DatasetRow[]>([]);
  const [dataset, setDataset] = useState<DatasetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const {
    page,
    setPage,
    updatePage,
  } = useUrlTableState({
    columns,
    filters,
    defaultSortKey,
  });

  const [editedRows, setEditedRows] = useState<
    Record<string, Partial<DatasetRow>>
  >({});

  const [newRows, setNewRows] = useState<DatasetRow[]>(() =>
    createEmptyRows(10),
  );

  const [selectedDeleteIds, setSelectedDeleteIds] = useState<string[]>([]);

  const [pageSize] = useState(50);
  const [totalRows, setTotalRows] = useState(0);

  const [filterOptions, setFilterOptions] = useState<Record<string, string[]>>(
    {},
  );
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<string[]>(() =>
    columns.map((column) => column.key),
  );
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>(
    {},
  );
  const [tableSort, setTableSort] = useState<TableSort>(null);

  const [saving, setSaving] = useState(false);
  const lastHandledSave = useRef(0);
  const visibleColumnDatasetRef = useRef(datasetId);
  const hasInitializedVisibleColumns = useRef(false);

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

  const tableColumns = useMemo(() => {
    if (action !== "list") return columns;

    const visibleKeys = new Set(visibleColumnKeys);
    return columns.filter((column) => visibleKeys.has(column.key));
  }, [action, columns, visibleColumnKeys]);

  const compareColumnValues = (
    aValue: DatasetValue,
    bValue: DatasetValue,
    column?: ColumnConfig,
  ) => {
    const shouldSortAsNumber =
      column?.inputType === "number" ||
      column?.key === "year" ||
      column?.key === "tahun";

    if (shouldSortAsNumber) {
      const aNumber = Number(aValue ?? 0);
      const bNumber = Number(bValue ?? 0);

      return aNumber - bNumber;
    }

    return String(aValue ?? "").localeCompare(String(bValue ?? ""), "id", {
      numeric: true,
      sensitivity: "base",
    });
  };

  const applyFiltersAndSort = (rows: DatasetRow[]) => {
    let result = [...rows];

    Object.entries(columnFilters).forEach(([key, selectedValues]) => {
      if (selectedValues === undefined) return;

      result = result.filter((row) =>
        selectedValues.includes(String(row[key] ?? "")),
      );
    });

    if (tableSort) {
      const sortColumn = columns.find((column) => column.key === tableSort.key);

      result.sort((a, b) => {
        const compared = compareColumnValues(
          a[tableSort.key],
          b[tableSort.key],
          sortColumn,
        );

        return tableSort.direction === "asc" ? compared : -compared;
      });
    }

    return result;
  };

  const applyRowsToPage = (rows: DatasetRow[]) => {
    const filteredRows = applyFiltersAndSort(rows);
    const from = page * pageSize;
    const to = from + pageSize;

    setDataset(filteredRows.slice(from, to));
    setTotalRows(filteredRows.length);
  };

  const buildFilterOptions = (rows: DatasetRow[]) => {
    const options: Record<string, string[]> = {};

    columns.forEach((column) => {
      const values = Array.from(
        new Set(
          rows.map((row) => String(row[column.key] ?? "")),
        ),
      );

      values.sort((a, b) => compareColumnValues(a, b, column));

      options[column.key] = values;
    });

    setFilterOptions(options);
  };

  const fetchDatasetRows = async () => {
    setLoading(true);

    try {
      if (!datasetId) {
        setAllRows([]);
        setDataset([]);
        setTotalRows(0);
        setFilterOptions({});
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
      buildFilterOptions(rows);
      applyRowsToPage(rows);
    } catch (err) {
      console.error("Error fetching dataset rows:", err);
      setAllRows([]);
      setDataset([]);
      setTotalRows(0);
      setFilterOptions({});
    } finally {
      setLoading(false);
    }
  };

  const saveDatasetRows = async (rows: DatasetRow[]) => {
    if (!datasetId) {
      throw new Error("datasetId is required.");
    }

    const { error } = await supabase
      .from("datasets")
      .update({
        data: rows,
      })
      .eq("id", datasetId);

    if (error) throw error;
  };

  useEffect(() => {
    const nextColumnKeys = columns.map((column) => column.key);
    const shouldResetVisibleColumns =
      !hasInitializedVisibleColumns.current ||
      visibleColumnDatasetRef.current !== datasetId;

    visibleColumnDatasetRef.current = datasetId;
    hasInitializedVisibleColumns.current = true;

    setVisibleColumnKeys((prev) => {
      if (shouldResetVisibleColumns) return nextColumnKeys;

      return prev.filter((key) => nextColumnKeys.includes(key));
    });

    setColumnFilters((prev) => {
      const nextFilters: Record<string, string[]> = {};

      Object.entries(prev).forEach(([key, value]) => {
        if (nextColumnKeys.includes(key)) {
          nextFilters[key] = value;
        }
      });

      return nextFilters;
    });

    setTableSort((prev) =>
      prev && nextColumnKeys.includes(prev.key) ? prev : null,
    );
  }, [columns, datasetId]);

  useEffect(() => {
    setPage(0);
    fetchDatasetRows();
  }, [datasetId]);

  useEffect(() => {
    applyRowsToPage(allRows);
    buildFilterOptions(allRows);
  }, [allRows, columnFilters, tableSort, page, pageSize, columns]);

  useEffect(() => {
    if (action === "add") {
      setNewRows(createEmptyRows(10));
      setEditedRows({});
      setSelectedDeleteIds([]);
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
  }, [action, datasetId]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;

      if (!(target instanceof Element)) return;
      if (target.closest("[data-table-menu-root]")) return;

      setOpenMenu(null);
    };

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  const toggleVisibleColumn = (key: string) => {
    setVisibleColumnKeys((prev) =>
      prev.includes(key)
        ? prev.filter((columnKey) => columnKey !== key)
        : [...prev, key],
    );
    setPage(0);
  };

  const setAllVisibleColumns = (selected: boolean) => {
    setVisibleColumnKeys(selected ? columns.map((column) => column.key) : []);
    setPage(0);
  };

  const toggleColumnFilterValue = (key: string, value: string) => {
    const options = filterOptions[key] ?? [];

    setColumnFilters((prev) => {
      const current = prev[key] ?? options;
      const next = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];

      return {
        ...prev,
        [key]: next,
      };
    });
    setPage(0);
  };

  const selectAllColumnFilterValues = (key: string, selected: boolean) => {
    setColumnFilters((prev) => ({
      ...prev,
      [key]: selected ? [...(filterOptions[key] ?? [])] : [],
    }));
    setPage(0);
  };

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
      return;
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

  const handleConfirmUpdate = async (confirmation: boolean) => {
    if (!confirmation) {
      setAlertType("none");
      return;
    }

    setSaving(true);

    try {
      const nextRows = allRows.map((row) => {
        const changes = editedRows[row.id];

        return changes ? { ...row, ...changes } : row;
      });

      await saveDatasetRows(nextRows);

      setAllRows(nextRows);
      applyRowsToPage(nextRows);
      buildFilterOptions(nextRows);

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
      const rowsWithIds = rowsToAdd.map((row) => ({
        id: createRowId(),
        ...row,
      })) as DatasetRow[];

      const nextRows = [...allRows, ...rowsWithIds];

      await saveDatasetRows(nextRows);

      setAllRows(nextRows);
      applyRowsToPage(nextRows);
      buildFilterOptions(nextRows);

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
      const nextRows = allRows.filter(
        (row) => !selectedDeleteIds.includes(row.id),
      );

      await saveDatasetRows(nextRows);

      setAllRows(nextRows);
      applyRowsToPage(nextRows);
      buildFilterOptions(nextRows);

      setSelectedDeleteIds([]);
      setAlertType("success-delete");
    } catch (err) {
      console.error("Failed to delete data:", err);
      setAlertType("failed");
    } finally {
      setSaving(false);
    }
  };

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

  const editChangeCount = useMemo(
    () =>
      Object.values(editedRows).reduce(
        (count, changes) => count + Object.keys(changes).length,
        0,
      ),
    [editedRows],
  );

  const addChangeCount = useMemo(() => getRowsToAdd().length, [newRows, columns]);

  useEffect(() => {
    if (!onChangeCountChange) return;

    let nextCount = 0;

    if (action === "add") {
      nextCount = addChangeCount;
    } else if (action === "edit") {
      nextCount = editChangeCount;
    } else if (action === "delete") {
      nextCount = selectedDeleteIds.length;
    }

    const timeout = window.setTimeout(() => onChangeCountChange(nextCount), 0);

    return () => window.clearTimeout(timeout);
  }, [
    action,
    addChangeCount,
    editChangeCount,
    onChangeCountChange,
    selectedDeleteIds.length,
  ]);

  const renderColumnHeaderMenu = (col: ColumnConfig) => {
    const options = filterOptions[col.key] ?? [];
    const selectedValues = columnFilters[col.key] ?? options;
    const allSelected =
      options.length > 0 && selectedValues.length === options.length;

    return (
      <div className="relative" data-table-menu-root>
        <button
          type="button"
          onClick={() =>
            setOpenMenu((prev) => (prev === col.key ? null : col.key))
          }
          className="flex w-full items-center justify-center gap-2 rounded px-2 py-1 text-left hover:bg-sky-200 [&_.text-xs]:hidden"
        >
          <span>{col.label}</span>
          <DownChevron className="h-3 w-3 shrink-0" />
          <span className="text-xs">▾</span>
        </button>

        {openMenu === col.key && (
          <div className="absolute left-0 top-full z-30 mt-1 w-64 rounded-md border border-gray-300 bg-white p-3 text-left text-xs text-gray-700 shadow-lg">
            <div className="mb-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setTableSort({ key: col.key, direction: "asc" });
                  setOpenMenu(null);
                  setPage(0);
                }}
                className="rounded border border-sky-600 px-2 py-1 font-medium text-sky-700 hover:bg-sky-50"
              >
                Sort A-Z
              </button>

              <button
                type="button"
                onClick={() => {
                  setTableSort({ key: col.key, direction: "desc" });
                  setOpenMenu(null);
                  setPage(0);
                }}
                className="rounded border border-sky-600 px-2 py-1 font-medium text-sky-700 hover:bg-sky-50"
              >
                Sort Z-A
              </button>
            </div>

            <div className="mb-2 flex items-center gap-2">
              {!allSelected && (
                <button
                  type="button"
                  onClick={() => selectAllColumnFilterValues(col.key, true)}
                  className="rounded border border-gray-300 px-2 py-1 hover:bg-gray-100"
                >
                  Pilih Semua
                </button>
              )}

              {selectedValues.length > 0 && (
                <button
                  type="button"
                  onClick={() => selectAllColumnFilterValues(col.key, false)}
                  className="rounded border border-gray-300 px-2 py-1 hover:bg-gray-100"
                >
                  Hapus Semua
                </button>
              )}
            </div>

            <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
              {options.map((option) => (
                <label
                  key={`${col.key}-${option}`}
                  className="flex items-center gap-2"
                >
                  <input
                    type="checkbox"
                    checked={selectedValues.includes(option)}
                    onChange={() => toggleColumnFilterValue(col.key, option)}
                  />
                  <span className="break-words">
                    {option === "" ? "N/A" : toTitleCase(option)}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="w-full flex justify-center items-center py-16">
        <SpinnerLoading size="sm" color="black" />
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col w-full">
        <div className="w-full h-full flex flex-col">
          {/* //! TABLE : ADD NEW DATA */}
          {action === "add" ? (
            <div className="w-full overflow-x-auto">
              <div className="overflow-x-auto mb-6">
                <div className="border-1 border-gray-950/20 rounded-sm overflow-x-auto mb-6">
                  <table className="min-w-full lg:text-sm md:text-[1.5vw] text-[2vw]">
                    <thead>
                      <tr>
                        {columns.map((col) => (
                          <th
                            key={col.key}
                            className={`${
                              col.color ? col.color : "bg-sky-100"
                            } px-3 py-2 border border-gray-400 whitespace-normal break-words`}
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
            </div>
          ) : (
            //! TABLE : NORMAL AND EDIT, UPDATE, DELETE
            <div className="w-full">
              {action === "list" && (
                <div className="mb-4 flex min-w-0 flex-wrap gap-3">
                  <details
                    open={openMenu === "columns"}
                    className="group relative min-w-0 flex-1 text-xs md:max-w-xs"
                    data-table-menu-root
                  >
                    <summary
                      onClick={(event) => {
                        event.preventDefault();
                        setOpenMenu((prev) =>
                          prev === "columns" ? null : "columns",
                        );
                      }}
                      className="cursor-pointer rounded-sm border border-gray-400 bg-white px-3 py-2 text-xs group-open:border-2 group-open:border-black"
                    >
                      Kolom ({visibleColumnKeys.length}/{columns.length})
                    </summary>

                    {openMenu === "columns" && (
                      <div className="absolute left-0 top-full z-30 mt-1 w-72 rounded-md border border-gray-300 bg-white p-3 text-xs text-gray-700 shadow-lg">
                        <div className="mb-2 flex gap-2">
                          {visibleColumnKeys.length < columns.length && (
                            <button
                              type="button"
                              onClick={() => setAllVisibleColumns(true)}
                              className="rounded border border-gray-300 px-2 py-1 hover:bg-gray-100"
                            >
                              Pilih Semua
                            </button>
                          )}

                          {visibleColumnKeys.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setAllVisibleColumns(false)}
                              className="rounded border border-gray-300 px-2 py-1 hover:bg-gray-100"
                            >
                              Hapus Semua
                            </button>
                          )}
                        </div>

                        <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                          {columns.map((column) => (
                            <label
                              key={column.key}
                              className="flex items-center gap-2"
                            >
                              <input
                                type="checkbox"
                                checked={visibleColumnKeys.includes(
                                  column.key,
                                )}
                                onChange={() => toggleVisibleColumn(column.key)}
                              />
                              <span>{toTitleCase(column.label)}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </details>
                </div>
              )}

              <div className="relative mb-6 min-h-[60vh] rounded-sm border border-gray-950/20">
                <div className="min-h-[60vh] overflow-x-auto">
                  <table className="min-w-full lg:text-sm md:text-[1.5vw] text-[2vw]">
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

                        {tableColumns.map((col) => (
                          <th
                            key={col.key}
                            className={`${
                              col.color ? col.color : "bg-sky-100"
                            } px-3 py-2 border border-gray-400 whitespace-normal break-words`}
                          >
                            {action === "list"
                              ? renderColumnHeaderMenu(col)
                              : col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {dataset.length > 0 &&
                        tableColumns.length > 0 &&
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

                            {tableColumns.map((col, colIndex) => {
                              const value = row[col.key];
                              const editable =
                                action === "edit" && col.editable;

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
                                      className={`w-full px-3 py-2 ${alignClass}`}
                                    />
                                  ) : (
                                    displayValue(value)
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                {(dataset.length === 0 || tableColumns.length === 0) && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-gray-500">
                    Tidak ada data.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {action !== "add" && (
          <div className="mb-20 flex items-center justify-between gap-3 text-sm">
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
              Page {page + 1} / {Math.max(Math.ceil(totalRows / pageSize), 1)}
              <br />
              <span className="text-xs text-gray-500">
                Total data: {totalRows}
              </span>
            </p>

            <button
              disabled={(page + 1) * pageSize >= totalRows}
              onClick={() => {
                const nextPage = page + 1;

                updatePage(nextPage);
              }}
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
          msg={`Apakah Anda yakin ingin menyimpan ${editChangeCount} perubahan?`}
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
          msg={`Apakah Anda yakin ingin menambahkan ${addChangeCount} data?`}
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
