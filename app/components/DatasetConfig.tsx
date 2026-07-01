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
import Papa from "papaparse";
import { supabase } from "@/lib/supabase/supabaseClient";
import type { ColumnConfig, FilterConfig } from "./DataTableMitra";
import AlertNotif from "./AlertNotif";

type Action = "add" | "edit" | "list" | "delete";
type EditSource = "data_mitra" | "datasets";

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
  mitraId: string | null;
};

type CsvRawRow = Record<string, unknown>;

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

function makeLabel(value: string): string {
  const cleaned = value.replace(/_/g, " ").replace(/\s+/g, " ").trim();

  if (!cleaned) return "Kolom";

  return cleaned
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
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

function inferConfigFromCsv(rows: CsvRawRow[]) {
  const firstRow = rows[0];

  if (!firstRow) {
    return {
      dataRows: [] as DataJsonRow[],
      columns: [] as ColumnConfig[],
      filters: [] as FilterConfig[],
      mainKeys: [] as string[],
    };
  }

  const originalHeaders = Object.keys(firstRow).filter(
    (key) => cleanText(key) !== "",
  );

  const keys = makeUniqueKeys(originalHeaders);

  const columns: ColumnConfig[] = originalHeaders.map((header, index) => {
    const values = rows.map((row) => row[header]);
    const inputType = getColumnType(values);

    return {
      key: keys[index],
      label: makeLabel(header),
      editable: true,
      inputType,
      align: inputType === "number" ? "right" : "left",
    };
  });

  const dataRows: DataJsonRow[] = rows
    .map((row) => {
      const parsedRow: DataJsonRow = {
        id: crypto.randomUUID(),
      };

      originalHeaders.forEach((header, index) => {
        const column = columns[index];

        parsedRow[column.key] = toDataValue(
          row[header],
          column.inputType === "number" ? "number" : "text",
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
  mitraId,
}: DatasetConfigProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastHandledSave = useRef(saveData);

  const isPartner = userRole === "partner";
  const isAdmin = userRole === "admin";
  const activeMitraId = isPartner ? mitraId || "" : "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [alertType, setAlertType] = useState<AlertType>("none");

  const [mitraRows, setMitraRows] = useState<MitraRow[]>([]);
  const [dataMitraRows, setDataMitraRows] = useState<DataMitraRow[]>([]);
  const [datasetRows, setDatasetRows] = useState<DatasetRow[]>([]);

  const [selectedMitraId, setSelectedMitraId] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newDataRows, setNewDataRows] = useState<DataJsonRow[]>([]);
  const [newColumns, setNewColumns] = useState<ColumnConfig[]>([]);
  const [newFilters, setNewFilters] = useState<FilterConfig[]>([]);
  const [newMainKeys, setNewMainKeys] = useState<string[]>([]);

  const [editSource, setEditSource] = useState<EditSource>("data_mitra");
  const [selectedEditId, setSelectedEditId] = useState("");
  const [editName, setEditName] = useState("");
  const [editColumns, setEditColumns] = useState<ColumnConfig[]>([]);
  const [editFilters, setEditFilters] = useState<FilterConfig[]>([]);
  const [editMainKeys, setEditMainKeys] = useState<string[]>([]);

  const [selectedDeleteIds, setSelectedDeleteIds] = useState<string[]>([]);

  const selectedAddMitraId = isPartner ? activeMitraId : selectedMitraId;

  const mitraNameMap = useMemo(() => {
    return mitraRows.reduce<Record<string, string>>((acc, row) => {
      acc[row.id] =
        row.name_mitra_short || row.name_mitra || "Mitra tanpa nama";
      return acc;
    }, {});
  }, [mitraRows]);

  const selectedEditRow = useMemo(() => {
    if (editSource === "data_mitra") {
      return dataMitraRows.find((row) => row.id === selectedEditId) ?? null;
    }

    return datasetRows.find((row) => row.id === selectedEditId) ?? null;
  }, [dataMitraRows, datasetRows, editSource, selectedEditId]);

  //! ====== FORCE PARTNER TO DATA MITRA ONLY ====== //
  useEffect(() => {
    if (!isPartner) return;

    setEditSource("data_mitra");
    setSelectedMitraId(activeMitraId);
  }, [activeMitraId, isPartner]);

  //! ====== FETCH CONFIG DATA ====== //
  const refreshData = useCallback(async () => {
    setLoading(true);
    setMessage("");

    if (isPartner && !activeMitraId) {
      setMitraRows([]);
      setDataMitraRows([]);
      setDatasetRows([]);
      setSelectedMitraId("");
      setMessage("Mitra ID tidak ditemukan.");
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
        mitraQuery = mitraQuery.eq("id", activeMitraId);
        dataMitraQuery = dataMitraQuery.eq("mitra_id", activeMitraId);
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

      const mitraData = (mitraResult.data ?? []) as MitraRow[];
      const dataMitraData = (dataMitraResult.data ?? []) as DataMitraRow[];
      const datasetsData = (datasetsResult.data ?? []) as DatasetRow[];

      setMitraRows(mitraData);
      setDataMitraRows(dataMitraData);
      setDatasetRows(datasetsData);

      if (isPartner) {
        setSelectedMitraId(activeMitraId);
      } else {
        setSelectedMitraId((prev) => prev || mitraData[0]?.id || "");
      }
    } catch (error) {
      console.error("Failed to fetch dataset config:", error);
      setMessage("Gagal memuat data konfigurasi.");
    } finally {
      setLoading(false);
    }
  }, [activeMitraId, isAdmin, isPartner]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  //! ====== SYNC SELECTED EDIT DATASET ====== //
  useEffect(() => {
    const availableRows =
      editSource === "data_mitra" ? dataMitraRows : datasetRows;

    if (availableRows.length === 0) {
      setSelectedEditId("");
      return;
    }

    const stillExists = availableRows.some((row) => row.id === selectedEditId);

    if (!stillExists) {
      setSelectedEditId(availableRows[0].id);
    }
  }, [dataMitraRows, datasetRows, editSource, selectedEditId]);

  //! ====== LOAD SELECTED EDIT CONFIG ====== //
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
      editSource === "data_mitra"
        ? ((selectedEditRow as DataMitraRow).label ?? "")
        : ((selectedEditRow as DatasetRow).name ?? ""),
    );

    setEditColumns(parsedColumns);
    setEditFilters(parsedFilters);
    setEditMainKeys(parsedMainKeys);
  }, [editSource, selectedEditRow]);

  //! ====== CHECK EDIT CHANGES ====== //
  const isEditChanged = useMemo(() => {
    if (!selectedEditRow) return false;

    const originalName =
      editSource === "data_mitra"
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
    editFilters,
    editMainKeys,
    editName,
    editSource,
    selectedEditRow,
  ]);

  //! ====== CSV HANDLER ====== //
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
        const parsed = inferConfigFromCsv(result.data);

        if (parsed.dataRows.length === 0 || parsed.columns.length === 0) {
          setMessage("CSV tidak memiliki data yang valid.");
          return;
        }

        setNewDataRows(parsed.dataRows);
        setNewColumns(parsed.columns);
        setNewFilters(parsed.filters);
        setNewMainKeys(parsed.mainKeys);

        setMessage(`CSV berhasil dibaca: ${parsed.dataRows.length} baris.`);
      },
      error: (error) => {
        console.error(error);
        setMessage("Gagal membaca file CSV.");
      },
    });
  };

  //! ====== CONFIG TOGGLE HANDLERS ====== //
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

  //! ====== REQUEST ADD ====== //
  const handleRequestAdd = useCallback(() => {
    if (
      !selectedAddMitraId ||
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
    selectedAddMitraId,
  ]);

  //! ====== REQUEST UPDATE ====== //
  const handleRequestUpdate = useCallback(() => {
    if (isPartner && editSource !== "data_mitra") {
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
    editSource,
    isEditChanged,
    isPartner,
    selectedEditId,
  ]);

  //! ====== REQUEST DELETE ====== //
  const handleRequestDelete = useCallback(() => {
    if (selectedDeleteIds.length === 0) {
      setAlertType("no-delete");
      return;
    }

    setAlertType("confirm-delete");
  }, [selectedDeleteIds.length]);

  //! ====== CONFIRM ADD - PARTNER FORCED TO OWN MITRA ID ====== //
  const handleConfirmAdd = useCallback(async () => {
    if (
      !selectedAddMitraId ||
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
        mitra_id: selectedAddMitraId,
        label: newLabel.trim(),
        data: newDataRows,
        column_config: newColumns,
        filter_config: newFilters,
        main_column_config: normalizeMainKeys(newMainKeys, newColumns),
      });

      if (error) throw error;

      setNewLabel("");
      setNewDataRows([]);
      setNewColumns([]);
      setNewFilters([]);
      setNewMainKeys([]);

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
    selectedAddMitraId,
  ]);

  //! ====== CONFIRM UPDATE - PARTNER ONLY OWN DATA MITRA ====== //
  const handleConfirmUpdate = useCallback(async () => {
    if (isPartner && editSource !== "data_mitra") {
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
        if (!activeMitraId) {
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
          .eq("mitra_id", activeMitraId)
          .select("id");

        if (error) throw error;

        if (!data || data.length === 0) {
          setAlertType("failed");
          return;
        }
      } else {
        const payload =
          editSource === "data_mitra"
            ? {
                label: editName.trim(),
                ...configPayload,
              }
            : {
                name: editName.trim(),
                ...configPayload,
              };

        const { error } = await supabase
          .from(editSource)
          .update(payload)
          .eq("id", selectedEditId);

        if (error) throw error;
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
    activeMitraId,
    editColumns,
    editFilters,
    editMainKeys,
    editName,
    editSource,
    isEditChanged,
    isPartner,
    refreshData,
    selectedEditId,
  ]);

  //! ====== CONFIRM DELETE - PARTNER ONLY OWN DATA MITRA ====== //
  const handleConfirmDelete = useCallback(async () => {
    if (selectedDeleteIds.length === 0) {
      setAlertType("no-delete");
      return;
    }

    setSaving(true);

    try {
      if (isPartner) {
        if (!activeMitraId) {
          setAlertType("failed");
          return;
        }

        const { data, error } = await supabase
          .from("data_mitra")
          .delete()
          .in("id", selectedDeleteIds)
          .eq("mitra_id", activeMitraId)
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
  }, [activeMitraId, isPartner, refreshData, selectedDeleteIds]);

  //! ====== RESULT ALERT HANDLER ====== //
  const handleResultAlert = () => {
    setAlertType("none");
    onSignalAction();
  };

  //! ====== SAVE BY ACTION ====== //
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

  //! ====== DELETE SELECTION HANDLERS ====== //
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

  //! ====== LOADING ====== //
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

        {/* //! ====== ADD DATASET ====== // */}
        {action === "add" && (
          <div className="space-y-5">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="font-medium">Mitra</span>

                <select
                  value={selectedAddMitraId}
                  disabled={isPartner}
                  onChange={(event) => setSelectedMitraId(event.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-500"
                >
                  <option value="">Pilih mitra</option>

                  {mitraRows.map((mitra) => (
                    <option key={mitra.id} value={mitra.id}>
                      {mitra.name_mitra_short || mitra.name_mitra || mitra.id}
                    </option>
                  ))}
                </select>

                {isPartner && (
                  <p className="text-xs text-gray-500">
                    Mitra otomatis menggunakan akun Anda.
                  </p>
                )}
              </label>

              <label className="space-y-1 text-sm">
                <span className="font-medium">Label Dataset</span>

                <input
                  value={newLabel}
                  onChange={(event) => setNewLabel(event.target.value)}
                  placeholder="Contoh: Data Ikan WCS"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
            </div>

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
              className={`flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center text-sm transition ${
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

              <p className="font-medium text-gray-700">
                Drag CSV ke sini atau klik untuk pilih file
              </p>

              <p className="mt-1 text-xs text-gray-500">
                Header CSV akan otomatis menjadi column_config.
              </p>
            </div>

            {newColumns.length > 0 && (
              <div className="space-y-4">
                <div className="rounded-md border border-gray-300 bg-white p-3">
                  <h3 className="mb-2 text-sm font-semibold">Filter Config</h3>

                  <div className="grid gap-2 md:grid-cols-3">
                    {newColumns.map((column) => (
                      <label
                        key={column.key}
                        className="flex items-center gap-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={newFilters.some(
                            (filter) => filter.key === column.key,
                          )}
                          onChange={() =>
                            toggleFilter(column, newFilters, setNewFilters)
                          }
                        />

                        <span>{column.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="rounded-md border border-gray-300 bg-white p-3">
                  <h3 className="mb-2 text-sm font-semibold">
                    Main Column Config
                  </h3>

                  <div className="grid gap-2 md:grid-cols-3">
                    {newColumns.map((column) => (
                      <label
                        key={column.key}
                        className="flex items-center gap-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={newMainKeys.includes(column.key)}
                          onChange={() =>
                            toggleMainKey(
                              column.key,
                              newMainKeys,
                              setNewMainKeys,
                            )
                          }
                        />

                        <span>{column.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

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
                  Preview menampilkan maksimal 10 baris pertama. Total data:{" "}
                  {newDataRows.length} baris.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={handleRequestAdd}
              disabled={saving}
              className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {saving ? "Menyimpan..." : "Tambah Dataset"}
            </button>
          </div>
        )}

        {/* //! ====== EDIT DATASET ====== // */}
        {action === "edit" && (
          <div className="space-y-5">
            <div className="grid gap-3 md:grid-cols-3">
              <label className="space-y-1 text-sm">
                <span className="font-medium">Sumber Dataset</span>

                <select
                  value={editSource}
                  disabled={isPartner}
                  onChange={(event) => {
                    setEditSource(event.target.value as EditSource);
                    setSelectedEditId("");
                  }}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-500"
                >
                  <option value="data_mitra">Data Mitra</option>

                  {isAdmin && (
                    <option value="datasets">Dataset Internal</option>
                  )}
                </select>
              </label>

              <label className="space-y-1 text-sm md:col-span-2">
                <span className="font-medium">Dataset</span>

                <select
                  value={selectedEditId}
                  onChange={(event) => setSelectedEditId(event.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  {(editSource === "data_mitra"
                    ? dataMitraRows
                    : datasetRows
                  ).map((row) => (
                    <option key={row.id} value={row.id}>
                      {editSource === "data_mitra"
                        ? `${(row as DataMitraRow).label ?? "Tanpa Label"} - ${
                            mitraNameMap[
                              (row as DataMitraRow).mitra_id ?? ""
                            ] ?? "Tanpa Mitra"
                          }`
                        : `${(row as DatasetRow).name ?? "Tanpa Nama"} (${
                            (row as DatasetRow).table ?? "-"
                          })`}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block space-y-1 text-sm">
              <span className="font-medium">
                {editSource === "data_mitra" ? "Label" : "Nama Dataset"}
              </span>

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
                      Input Type
                    </th>
                    <th className="border border-gray-300 bg-sky-100 px-3 py-2">
                      Align
                    </th>
                    <th className="border border-gray-300 bg-sky-100 px-3 py-2">
                      Editable
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
                          value={column.inputType ?? "text"}
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
                          checked={Boolean(column.editable)}
                          onChange={(event) =>
                            updateColumn(
                              index,
                              "editable",
                              event.target.checked,
                            )
                          }
                        />
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

            <button
              type="button"
              onClick={handleRequestUpdate}
              disabled={saving}
              className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {saving ? "Menyimpan..." : "Update Config"}
            </button>
          </div>
        )}

        {/* //! ====== DELETE DATASET ====== // */}
        {action === "delete" && (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-md border border-gray-300">
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th className="border border-gray-300 bg-sky-100 px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={
                          dataMitraRows.length > 0 &&
                          selectedDeleteIds.length === dataMitraRows.length
                        }
                        onChange={toggleSelectAllDelete}
                      />
                    </th>
                    <th className="border border-gray-300 bg-sky-100 px-3 py-2">
                      Label
                    </th>
                    <th className="border border-gray-300 bg-sky-100 px-3 py-2">
                      Mitra
                    </th>
                    <th className="border border-gray-300 bg-sky-100 px-3 py-2">
                      Jumlah Data
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {dataMitraRows.map((row) => {
                    const parsedData = parseJsonArray<DataJsonRow>(row.data);

                    return (
                      <tr key={row.id}>
                        <td className="border border-gray-300 px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={selectedDeleteIds.includes(row.id)}
                            onChange={() => toggleDeleteId(row.id)}
                          />
                        </td>

                        <td className="border border-gray-300 px-3 py-2">
                          {row.label ?? "-"}
                        </td>

                        <td className="border border-gray-300 px-3 py-2">
                          {mitraNameMap[row.mitra_id ?? ""] ?? "-"}
                        </td>

                        <td className="border border-gray-300 px-3 py-2 text-right">
                          {parsedData.length}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              onClick={handleRequestDelete}
              disabled={saving}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {saving
                ? "Menghapus..."
                : `Hapus Dataset (${selectedDeleteIds.length})`}
            </button>
          </div>
        )}

        {/* //! ====== LIST DATASET CONFIG ====== // */}
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

      {/* //! ====== ALERTS ====== // */}
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
