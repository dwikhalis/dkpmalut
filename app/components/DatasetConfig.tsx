"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { supabase } from "@/lib/supabase/supabaseClient";
import type { ColumnConfig, FilterConfig } from "./DataTableMitra";
import AlertNotif from "./AlertNotif";
import DatasetConfigAdd from "./DatasetConfigAdd";
import DatasetConfigDelete from "./DatasetConfigDelete";
import DatasetConfigEdit from "./DatasetConfigEdit";

const Papa = (await import("papaparse")).default;

type Action = "add" | "edit" | "list" | "delete";
export type EditSource = "data_mitra" | "datasets";

type AlertType =
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
  | "failed";

type DataValue = string | number | boolean | null;

type DataJsonRow = {
  id: string;
  [key: string]: DataValue;
};

type MitraRow = {
  id: string;
  name_mitra: string | null;
  name_mitra_short: string | null;
  type: string | null;
};

type DataMitraRow = {
  id: string;
  mitra_id: string | null;
  label: string | null;
  data: DataJsonRow[] | string | null;
  column_config: ColumnConfig[] | string | null;
  filter_config: FilterConfig[] | string | null;
  main_column_config: string[] | string | null;
};

type DatasetRow = {
  id: string;
  name: string | null;
  table: string | null;
  column_config: ColumnConfig[] | string | null;
  filter_config: FilterConfig[] | string | null;
  main_column_config: string[] | string | null;
};

type DatasetConfigProps = {
  action: Action;
  saveData: number;
  onSignalAction: () => void;
  userRole: string | null;
  userId: string | null;
  editDataset: EditSource;
};

type CsvRawRow = Record<string, unknown>;

type ImportColumnConfig = {
  originalHeader: string;
  key: string;
  label: string;
  selected: boolean;
  inputType: "text" | "number";
  align: "left" | "right";
};

function parseJsonArray<T>(value: T[] | string | null | undefined): T[] {
  if (!value) return [];

  if (Array.isArray(value)) return value;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function cleanText(value: unknown): string {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function normalizeKey(value: string, index: number): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || `column_${index + 1}`;
}

function makeUniqueKeys(headers: string[]): string[] {
  const used: Record<string, number> = {};

  return headers.map((header, index) => {
    const baseKey = normalizeKey(header, index);

    used[baseKey] = (used[baseKey] ?? 0) + 1;

    if (used[baseKey] === 1) {
      return baseKey;
    }

    return `${baseKey}_${used[baseKey]}`;
  });
}

function isNumericValue(value: unknown): boolean {
  const text = cleanText(value);

  if (!text) return false;

  const normalized = text.replaceAll(",", "");

  return !Number.isNaN(Number(normalized));
}

function toDataValue(value: unknown, inputType: "text" | "number"): DataValue {
  const text = cleanText(value);

  if (!text) return null;

  if (inputType === "number") {
    const numberValue = Number(text.replaceAll(",", ""));
    return Number.isNaN(numberValue) ? null : numberValue;
  }

  return text;
}

function getColumnType(values: unknown[]): "text" | "number" {
  const filledValues = values.filter((value) => cleanText(value) !== "");

  if (filledValues.length === 0) return "text";

  return filledValues.every(isNumericValue) ? "number" : "text";
}

function createFilterFromColumn(column: ColumnConfig): FilterConfig {
  const isNumber = column.inputType === "number";

  return {
    key: column.key,
    sort: isNumber ? "number-desc" : "text-asc",
    label: column.label,
    allLabel: `Semua ${column.label}`,
  };
}

function normalizeMainKeys(keys: string[], columns: ColumnConfig[]): string[] {
  const availableKeys = columns.map((column) => column.key);

  return keys.filter((key) => availableKeys.includes(key));
}

function getValidCsvRows(rows: CsvRawRow[]) {
  return rows.filter((row) =>
    Object.values(row).some((value) => cleanText(value) !== ""),
  );
}

function createImportColumnsFromCsv(rows: CsvRawRow[]): ImportColumnConfig[] {
  const firstRow = rows[0];

  if (!firstRow) return [];

  const originalHeaders = Object.keys(firstRow).filter(
    (key) => cleanText(key) !== "",
  );

  const uniqueKeys = makeUniqueKeys(originalHeaders);

  return originalHeaders.map((header, index) => {
    const values = rows.map((row) => row[header]);
    const inputType = getColumnType(values);

    return {
      originalHeader: header,
      key: uniqueKeys[index],
      label: header,
      selected: true,
      inputType,
      align: inputType === "number" ? "right" : "left",
    };
  });
}

function buildConfigFromSelectedImportColumns(
  rows: CsvRawRow[],
  importColumns: ImportColumnConfig[],
) {
  const selectedColumns = importColumns.filter((column) => column.selected);

  const columns: ColumnConfig[] = selectedColumns.map((column) => ({
    key: column.key,
    label: cleanText(column.label) || column.originalHeader,
    editable: true,
    inputType: column.inputType,
    align: column.align,
  }));

  const dataRows: DataJsonRow[] = rows
    .map((row) => {
      const parsedRow: DataJsonRow = {
        id: crypto.randomUUID(),
      };

      selectedColumns.forEach((column) => {
        parsedRow[column.key] = toDataValue(
          row[column.originalHeader],
          column.inputType,
        );
      });

      return parsedRow;
    })
    .filter((row) =>
      Object.entries(row).some(
        ([key, value]) => key !== "id" && value !== null && value !== "",
      ),
    );

  const defaultFilterColumns = columns.slice(0, Math.min(3, columns.length));
  const filters = defaultFilterColumns.map(createFilterFromColumn);

  const mainKeys = columns
    .slice(0, Math.min(6, columns.length))
    .map((column) => column.key);

  return {
    dataRows,
    columns,
    filters,
    mainKeys,
  };
}

export default function DatasetConfig({
  action,
  saveData,
  onSignalAction,
  userRole,
  userId,
  editDataset,
}: DatasetConfigProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastHandledSave = useRef(saveData);

  const isPartner = userRole === "partner";
  const isAdmin = userRole === "admin";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [alertType, setAlertType] = useState<AlertType>("none");

  const [mitraRows, setMitraRows] = useState<MitraRow[]>([]);
  const [dataMitraRows, setDataMitraRows] = useState<DataMitraRow[]>([]);
  const [datasetRows, setDatasetRows] = useState<DatasetRow[]>([]);

  const [newLabel, setNewLabel] = useState("");
  const [csvRawRows, setCsvRawRows] = useState<CsvRawRow[]>([]);
  const [importColumns, setImportColumns] = useState<ImportColumnConfig[]>([]);
  const [newDataRows, setNewDataRows] = useState<DataJsonRow[]>([]);
  const [newColumns, setNewColumns] = useState<ColumnConfig[]>([]);
  const [newFilters, setNewFilters] = useState<FilterConfig[]>([]);
  const [newMainKeys, setNewMainKeys] = useState<string[]>([]);

  const [selectedEditId, setSelectedEditId] = useState("");
  const [editName, setEditName] = useState("");
  const [editColumns, setEditColumns] = useState<ColumnConfig[]>([]);
  const [editFilters, setEditFilters] = useState<FilterConfig[]>([]);
  const [editMainKeys, setEditMainKeys] = useState<string[]>([]);

  const [selectedDeleteIds, setSelectedDeleteIds] = useState<string[]>([]);

  const hasImportedCsv = csvRawRows.length > 0 && importColumns.length > 0;

  const selectedImportCount = useMemo(() => {
    return importColumns.filter((column) => column.selected).length;
  }, [importColumns]);

  const mitraNameMap = useMemo(() => {
    return mitraRows.reduce<Record<string, string>>((acc, row) => {
      acc[row.id] =
        row.name_mitra_short || row.name_mitra || "Mitra tanpa nama";

      return acc;
    }, {});
  }, [mitraRows]);

  const selectedEditRow = useMemo(() => {
    if (editDataset === "data_mitra") {
      return dataMitraRows.find((row) => row.id === selectedEditId) ?? null;
    }

    return datasetRows.find((row) => row.id === selectedEditId) ?? null;
  }, [dataMitraRows, datasetRows, editDataset, selectedEditId]);

  const editOptions = useMemo(() => {
    const rows = editDataset === "data_mitra" ? dataMitraRows : datasetRows;

    return rows.map((row) => ({
      id: row.id,
      label:
        editDataset === "data_mitra"
          ? `${(row as DataMitraRow).label ?? "Tanpa Label"} - ${
              mitraNameMap[(row as DataMitraRow).mitra_id ?? ""] ??
              "Tanpa Mitra"
            }`
          : `${(row as DatasetRow).name ?? "Tanpa Nama"} (${
              (row as DatasetRow).table ?? "-"
            })`,
    }));
  }, [dataMitraRows, datasetRows, editDataset, mitraNameMap]);

  const deleteRows = useMemo(() => {
    return dataMitraRows.map((row) => ({
      id: row.id,
      label: row.label ?? "-",
      mitraName: mitraNameMap[row.mitra_id ?? ""] ?? "-",
      dataCount: parseJsonArray<DataJsonRow>(row.data).length,
    }));
  }, [dataMitraRows, mitraNameMap]);

  const syncImportedColumnsToState = useCallback(
    (
      rows: CsvRawRow[],
      columnsToImport: ImportColumnConfig[],
      preserveCurrentConfig: boolean,
    ) => {
      const parsed = buildConfigFromSelectedImportColumns(
        rows,
        columnsToImport,
      );

      setNewDataRows(parsed.dataRows);
      setNewColumns(parsed.columns);

      if (!preserveCurrentConfig) {
        setNewFilters(parsed.filters);
        setNewMainKeys(parsed.mainKeys);
        return;
      }

      const columnMap = new Map(
        parsed.columns.map((column) => [column.key, column]),
      );

      setNewFilters((prev) =>
        prev
          .filter((filter) => columnMap.has(filter.key))
          .map((filter) => {
            const column = columnMap.get(filter.key);

            if (!column) return filter;

            const updatedFilter = createFilterFromColumn(column);

            return {
              ...filter,
              label: updatedFilter.label,
              allLabel: updatedFilter.allLabel,
              sort: updatedFilter.sort,
            };
          }),
      );

      setNewMainKeys((prev) =>
        prev.filter((key) =>
          parsed.columns.some((column) => column.key === key),
        ),
      );
    },
    [],
  );

  const resetImportedCsv = useCallback(() => {
    setCsvRawRows([]);
    setImportColumns([]);
    setNewDataRows([]);
    setNewColumns([]);
    setNewFilters([]);
    setNewMainKeys([]);
    setMessage("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const refreshData = useCallback(async () => {
    setLoading(true);
    setMessage("");

    if (isPartner && !userId) {
      setMitraRows([]);
      setDataMitraRows([]);
      setDatasetRows([]);
      setMessage("User ID tidak ditemukan.");
      setLoading(false);
      return;
    }

    try {
      let mitraQuery = supabase
        .from("mitra")
        .select("id, name_mitra, name_mitra_short, type")
        .order("name_mitra", { ascending: true });

      let dataMitraQuery = supabase
        .from("data_mitra")
        .select(
          "id, mitra_id, label, data, column_config, filter_config, main_column_config",
        )
        .order("created_at", { ascending: false });

      if (isPartner) {
        mitraQuery = mitraQuery.eq("id", userId);
        dataMitraQuery = dataMitraQuery.eq("mitra_id", userId);
      }

      const [mitraResult, dataMitraResult, datasetsResult] = await Promise.all([
        mitraQuery,
        dataMitraQuery,
        isAdmin
          ? supabase
              .from("datasets")
              .select(
                "id, name, table, column_config, filter_config, main_column_config",
              )
              .order("name", { ascending: true })
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (mitraResult.error) throw mitraResult.error;
      if (dataMitraResult.error) throw dataMitraResult.error;
      if (datasetsResult.error) throw datasetsResult.error;

      setMitraRows((mitraResult.data ?? []) as MitraRow[]);
      setDataMitraRows((dataMitraResult.data ?? []) as DataMitraRow[]);
      setDatasetRows((datasetsResult.data ?? []) as DatasetRow[]);
    } catch (error) {
      console.error("Failed to fetch dataset config:", error);
      setMessage("Gagal memuat data konfigurasi.");
    } finally {
      setLoading(false);
    }
  }, [userId, isAdmin, isPartner]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  useEffect(() => {
    const availableRows =
      editDataset === "data_mitra" ? dataMitraRows : datasetRows;

    if (availableRows.length === 0) {
      setSelectedEditId("");
      return;
    }

    const stillExists = availableRows.some((row) => row.id === selectedEditId);

    if (!stillExists) {
      setSelectedEditId(availableRows[0].id);
    }
  }, [dataMitraRows, datasetRows, editDataset, selectedEditId]);

  useEffect(() => {
    if (!selectedEditRow) {
      setEditName("");
      setEditColumns([]);
      setEditFilters([]);
      setEditMainKeys([]);
      return;
    }

    const parsedColumns = parseJsonArray<ColumnConfig>(
      selectedEditRow.column_config,
    );

    const parsedFilters = parseJsonArray<FilterConfig>(
      selectedEditRow.filter_config,
    );

    const parsedMainKeys = normalizeMainKeys(
      parseJsonArray<string>(selectedEditRow.main_column_config),
      parsedColumns,
    );

    setEditName(
      editDataset === "data_mitra"
        ? ((selectedEditRow as DataMitraRow).label ?? "")
        : ((selectedEditRow as DatasetRow).name ?? ""),
    );

    setEditColumns(parsedColumns);
    setEditFilters(parsedFilters);
    setEditMainKeys(parsedMainKeys);
  }, [editDataset, selectedEditRow]);

  const isEditChanged = useMemo(() => {
    if (!selectedEditRow) return false;

    const originalName =
      editDataset === "data_mitra"
        ? ((selectedEditRow as DataMitraRow).label ?? "")
        : ((selectedEditRow as DatasetRow).name ?? "");

    const originalColumns = parseJsonArray<ColumnConfig>(
      selectedEditRow.column_config,
    );

    const originalFilters = parseJsonArray<FilterConfig>(
      selectedEditRow.filter_config,
    );

    const originalMainKeys = normalizeMainKeys(
      parseJsonArray<string>(selectedEditRow.main_column_config),
      originalColumns,
    );

    return (
      JSON.stringify({
        name: originalName,
        columns: originalColumns,
        filters: originalFilters,
        mainKeys: originalMainKeys,
      }) !==
      JSON.stringify({
        name: editName,
        columns: editColumns,
        filters: editFilters,
        mainKeys: normalizeMainKeys(editMainKeys, editColumns),
      })
    );
  }, [
    editColumns,
    editDataset,
    editFilters,
    editMainKeys,
    editName,
    selectedEditRow,
  ]);

  const handleCsvFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setMessage("File harus berformat CSV.");
      return;
    }

    setMessage("");

    Papa.parse<CsvRawRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const validRows = getValidCsvRows(result.data);
        const parsedImportColumns = createImportColumnsFromCsv(validRows);

        if (validRows.length === 0 || parsedImportColumns.length === 0) {
          resetImportedCsv();
          setMessage("CSV tidak memiliki data yang valid.");
          return;
        }

        setCsvRawRows(validRows);
        setImportColumns(parsedImportColumns);
        syncImportedColumnsToState(validRows, parsedImportColumns, false);

        setMessage(`CSV berhasil dibaca: ${validRows.length} baris.`);
      },
      error: (error) => {
        console.error(error);
        resetImportedCsv();
        setMessage("Gagal membaca file CSV.");
      },
    });
  };

  const updateImportColumnLabel = (key: string, label: string) => {
    const nextColumns = importColumns.map((column) =>
      column.key === key
        ? {
            ...column,
            label,
          }
        : column,
    );

    setImportColumns(nextColumns);
    syncImportedColumnsToState(csvRawRows, nextColumns, true);
  };

  const toggleImportColumn = (key: string) => {
    const nextColumns = importColumns.map((column) =>
      column.key === key
        ? {
            ...column,
            selected: !column.selected,
          }
        : column,
    );

    setImportColumns(nextColumns);
    syncImportedColumnsToState(csvRawRows, nextColumns, false);
  };

  const toggleAllImportColumns = () => {
    const shouldSelectAll = selectedImportCount !== importColumns.length;

    const nextColumns = importColumns.map((column) => ({
      ...column,
      selected: shouldSelectAll,
    }));

    setImportColumns(nextColumns);
    syncImportedColumnsToState(csvRawRows, nextColumns, false);
  };

  const toggleFilter = (
    column: ColumnConfig,
    currentFilters: FilterConfig[],
    setCurrentFilters: Dispatch<SetStateAction<FilterConfig[]>>,
  ) => {
    const exists = currentFilters.some((filter) => filter.key === column.key);

    if (exists) {
      setCurrentFilters((prev) =>
        prev.filter((filter) => filter.key !== column.key),
      );
      return;
    }

    setCurrentFilters((prev) => [...prev, createFilterFromColumn(column)]);
  };

  const toggleMainKey = (
    key: string,
    currentKeys: string[],
    setCurrentKeys: Dispatch<SetStateAction<string[]>>,
  ) => {
    if (currentKeys.includes(key)) {
      setCurrentKeys((prev) => prev.filter((item) => item !== key));
      return;
    }

    setCurrentKeys((prev) => [...prev, key]);
  };

  const updateColumn = (
    index: number,
    field: keyof ColumnConfig,
    value: string | boolean,
  ) => {
    const currentColumn = editColumns[index];

    if (!currentColumn) return;

    if (field === "label") {
      setEditColumns((prev) =>
        prev.map((column, columnIndex) =>
          columnIndex === index
            ? {
                ...column,
                label: String(value),
              }
            : column,
        ),
      );

      setEditFilters((prev) =>
        prev.map((filter) =>
          filter.key === currentColumn.key
            ? {
                ...filter,
                label: String(value),
                allLabel: `Semua ${String(value)}`,
              }
            : filter,
        ),
      );

      return;
    }

    if (field === "inputType") {
      const inputType = value === "number" ? "number" : "text";

      setEditColumns((prev) =>
        prev.map((column, columnIndex) =>
          columnIndex === index
            ? {
                ...column,
                inputType,
                align: inputType === "number" ? "right" : "left",
              }
            : column,
        ),
      );

      setEditFilters((prev) =>
        prev.map((filter) =>
          filter.key === currentColumn.key
            ? {
                ...filter,
                sort: inputType === "number" ? "number-desc" : "text-asc",
              }
            : filter,
        ),
      );

      return;
    }

    setEditColumns((prev) =>
      prev.map((column, columnIndex) =>
        columnIndex === index
          ? {
              ...column,
              [field]: value,
            }
          : column,
      ),
    );
  };

  const handleRequestAdd = useCallback(() => {
    if (
      !userId ||
      !newLabel.trim() ||
      newDataRows.length === 0 ||
      newColumns.length === 0 ||
      newMainKeys.length === 0
    ) {
      setAlertType("no-add");
      return;
    }

    setAlertType("confirm-add");
  }, [
    newColumns.length,
    newDataRows.length,
    newLabel,
    newMainKeys.length,
    userId,
  ]);

  const handleRequestUpdate = useCallback(() => {
    if (isPartner && editDataset !== "data_mitra") {
      setAlertType("failed");
      return;
    }

    if (!selectedEditId || !isEditChanged) {
      setAlertType("no-update");
      return;
    }

    if (
      !editName.trim() ||
      editColumns.length === 0 ||
      editMainKeys.length === 0
    ) {
      setAlertType("no-update");
      return;
    }

    setAlertType("confirm-update");
  }, [
    editColumns.length,
    editMainKeys.length,
    editName,
    editDataset,
    isEditChanged,
    isPartner,
    selectedEditId,
  ]);

  const handleRequestDelete = useCallback(() => {
    if (selectedDeleteIds.length === 0) {
      setAlertType("no-delete");
      return;
    }

    setAlertType("confirm-delete");
  }, [selectedDeleteIds.length]);

  const handleConfirmAdd = useCallback(async () => {
    if (
      !userId ||
      !newLabel.trim() ||
      newDataRows.length === 0 ||
      newColumns.length === 0 ||
      newMainKeys.length === 0
    ) {
      setAlertType("no-add");
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.from("data_mitra").insert({
        mitra_id: userId,
        label: newLabel.trim(),
        data: newDataRows,
        column_config: newColumns,
        filter_config: newFilters,
        main_column_config: normalizeMainKeys(newMainKeys, newColumns),
      });

      if (error) throw error;

      setNewLabel("");
      resetImportedCsv();

      await refreshData();

      setAlertType("success-add");
    } catch (error) {
      console.error("Failed to add dataset:", error);
      setAlertType("failed");
    } finally {
      setSaving(false);
    }
  }, [
    newColumns,
    newDataRows,
    newFilters,
    newLabel,
    newMainKeys,
    refreshData,
    resetImportedCsv,
    userId,
  ]);

  const handleConfirmUpdate = useCallback(async () => {
    if (isPartner && editDataset !== "data_mitra") {
      setAlertType("failed");
      return;
    }

    if (!selectedEditId || !isEditChanged) {
      setAlertType("no-update");
      return;
    }

    if (
      !editName.trim() ||
      editColumns.length === 0 ||
      editMainKeys.length === 0
    ) {
      setAlertType("no-update");
      return;
    }

    setSaving(true);

    try {
      const configPayload = {
        column_config: editColumns,
        filter_config: editFilters,
        main_column_config: normalizeMainKeys(editMainKeys, editColumns),
      };

      if (isPartner) {
        if (!userId) {
          setAlertType("failed");
          return;
        }

        const { data, error } = await supabase
          .from("data_mitra")
          .update({
            label: editName.trim(),
            ...configPayload,
          })
          .eq("id", selectedEditId)
          .eq("mitra_id", userId)
          .select("id");

        if (error) throw error;

        if (!data || data.length === 0) {
          setAlertType("failed");
          return;
        }
      } else {
        const payload =
          editDataset === "data_mitra"
            ? {
                label: editName.trim(),
                ...configPayload,
              }
            : {
                name: editName.trim(),
                ...configPayload,
              };

        const { data, error } = await supabase
          .from(editDataset)
          .update(payload)
          .eq("id", selectedEditId)
          .select("id");

        if (error) throw error;

        if (!data || data.length === 0) {
          setAlertType("failed");
          return;
        }
      }

      await refreshData();

      setAlertType("success-update");
    } catch (error) {
      console.error("Failed to update config:", error);
      setAlertType("failed");
    } finally {
      setSaving(false);
    }
  }, [
    userId,
    editColumns,
    editDataset,
    editFilters,
    editMainKeys,
    editName,
    isEditChanged,
    isPartner,
    refreshData,
    selectedEditId,
  ]);

  const handleConfirmDelete = useCallback(async () => {
    if (selectedDeleteIds.length === 0) {
      setAlertType("no-delete");
      return;
    }

    setSaving(true);

    try {
      if (isPartner) {
        if (!userId) {
          setAlertType("failed");
          return;
        }

        const { data, error } = await supabase
          .from("data_mitra")
          .delete()
          .in("id", selectedDeleteIds)
          .eq("mitra_id", userId)
          .select("id");

        if (error) throw error;

        if (!data || data.length === 0) {
          setAlertType("failed");
          return;
        }
      } else {
        const { error } = await supabase
          .from("data_mitra")
          .delete()
          .in("id", selectedDeleteIds);

        if (error) throw error;
      }

      setSelectedDeleteIds([]);

      await refreshData();

      setAlertType("success-delete");
    } catch (error) {
      console.error("Failed to delete dataset:", error);
      setAlertType("failed");
    } finally {
      setSaving(false);
    }
  }, [userId, isPartner, refreshData, selectedDeleteIds]);

  const handleResultAlert = () => {
    setAlertType("none");
    onSignalAction();
  };

  const handleSaveByAction = useCallback(() => {
    if (action === "add") {
      handleRequestAdd();
      return;
    }

    if (action === "edit") {
      handleRequestUpdate();
      return;
    }

    if (action === "delete") {
      handleRequestDelete();
    }
  }, [action, handleRequestAdd, handleRequestDelete, handleRequestUpdate]);

  useEffect(() => {
    if (saveData === lastHandledSave.current) return;

    lastHandledSave.current = saveData;

    if (saveData <= 0) return;

    handleSaveByAction();
  }, [handleSaveByAction, saveData]);

  const toggleDeleteId = (id: string) => {
    setSelectedDeleteIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const toggleSelectAllDelete = () => {
    if (selectedDeleteIds.length === dataMitraRows.length) {
      setSelectedDeleteIds([]);
      return;
    }

    setSelectedDeleteIds(dataMitraRows.map((row) => row.id));
  };

  if (loading) {
    return (
      <div className="flex min-h-40 w-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-slate-300 border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      <div className="w-full space-y-5">
        {message && (
          <div className="rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-700">
            {message}
          </div>
        )}

        {action === "add" && (
          <DatasetConfigAdd
            newLabel={newLabel}
            setNewLabel={setNewLabel}
            hasImportedCsv={hasImportedCsv}
            isDragging={isDragging}
            setIsDragging={setIsDragging}
            fileInputRef={fileInputRef}
            handleCsvFile={handleCsvFile}
            resetImportedCsv={resetImportedCsv}
            importColumns={importColumns}
            selectedImportCount={selectedImportCount}
            toggleAllImportColumns={toggleAllImportColumns}
            toggleImportColumn={toggleImportColumn}
            updateImportColumnLabel={updateImportColumnLabel}
            newColumns={newColumns}
            newFilters={newFilters}
            setNewFilters={setNewFilters}
            newMainKeys={newMainKeys}
            setNewMainKeys={setNewMainKeys}
            newDataRows={newDataRows}
            toggleFilter={toggleFilter}
            toggleMainKey={toggleMainKey}
          />
        )}

        {action === "edit" && (
          <DatasetConfigEdit
            editOptions={editOptions}
            selectedEditId={selectedEditId}
            setSelectedEditId={setSelectedEditId}
            editName={editName}
            setEditName={setEditName}
            editColumns={editColumns}
            editFilters={editFilters}
            setEditFilters={setEditFilters}
            editMainKeys={editMainKeys}
            setEditMainKeys={setEditMainKeys}
            updateColumn={updateColumn}
            toggleFilter={toggleFilter}
            toggleMainKey={toggleMainKey}
          />
        )}

        {action === "delete" && (
          <DatasetConfigDelete
            deleteRows={deleteRows}
            selectedDeleteIds={selectedDeleteIds}
            toggleDeleteId={toggleDeleteId}
            toggleSelectAllDelete={toggleSelectAllDelete}
          />
        )}

        {action === "list" && (
          <div className={`grid gap-5 ${isAdmin ? "xl:grid-cols-2" : ""}`}>
            <div className="space-y-2">
              <h3 className="font-semibold">Data Mitra</h3>

              <div className="overflow-x-auto rounded-md border border-gray-300">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr>
                      <th className="border border-gray-300 bg-sky-100 px-3 py-2">
                        Label
                      </th>
                      <th className="border border-gray-300 bg-sky-100 px-3 py-2">
                        Mitra
                      </th>
                      <th className="border border-gray-300 bg-sky-100 px-3 py-2">
                        Kolom
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {dataMitraRows.map((row) => (
                      <tr key={row.id}>
                        <td className="border border-gray-300 px-3 py-2">
                          {row.label}
                        </td>

                        <td className="border border-gray-300 px-3 py-2">
                          {mitraNameMap[row.mitra_id ?? ""] ?? "-"}
                        </td>

                        <td className="border border-gray-300 px-3 py-2 text-right">
                          {
                            parseJsonArray<ColumnConfig>(row.column_config)
                              .length
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {isAdmin && (
              <div className="space-y-2">
                <h3 className="font-semibold">Dataset Internal</h3>

                <div className="overflow-x-auto rounded-md border border-gray-300">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr>
                        <th className="border border-gray-300 bg-sky-100 px-3 py-2">
                          Nama
                        </th>
                        <th className="border border-gray-300 bg-sky-100 px-3 py-2">
                          Table
                        </th>
                        <th className="border border-gray-300 bg-sky-100 px-3 py-2">
                          Kolom
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {datasetRows.map((row) => (
                        <tr key={row.id}>
                          <td className="border border-gray-300 px-3 py-2">
                            {row.name}
                          </td>

                          <td className="border border-gray-300 px-3 py-2">
                            {row.table}
                          </td>

                          <td className="border border-gray-300 px-3 py-2 text-right">
                            {
                              parseJsonArray<ColumnConfig>(row.column_config)
                                .length
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
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
          msg="Penyimpanan data gagal atau Anda tidak memiliki akses ke data ini."
          yesText="OK"
          icon="failed"
          confirm={() => setAlertType("none")}
        />
      )}
    </>
  );
}
