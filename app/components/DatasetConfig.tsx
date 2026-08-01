"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { supabase } from "@/lib/supabase/supabaseClient";
import type { ColumnConfig } from "./DatasetTable";
import AlertNotif from "./AlertNotif";
import DatasetConfigAdd from "./DatasetConfigAdd";
import DatasetConfigDelete from "./DatasetConfigDelete";
import DatasetConfigEdit from "./DatasetConfigEdit";
import SpinnerLoading from "./SpinnerLoading";

const Papa = (await import("papaparse")).default;

type Action = "add" | "edit" | "list" | "delete";
export type EditSource = "datasets";

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
  | "no-title"
  | "draft-title"
  | "no-delete"
  | "no-access"
  | "not-csv"
  | "failed";

type DataValue = string | number | boolean | null;

type DataJsonRow = {
  id: string;
  [key: string]: DataValue;
};

type UserRow = {
  id: string;
  username: string | null;
  organization: string | null;
  role: string | null;
};

type DatasetRow = {
  id: string;
  user_id: string | null;
  label: string | null;
  data: DataJsonRow[] | string | null;
  column_config: ColumnConfig[] | string | null;
  kind: "dataset" | "map" | "link" | "dashboard";
  feature_count?: number | null;
};

type DatasetConfigProps = {
  action: Action;
  saveData: number;
  onSignalAction: () => void;
  onAddReadyChange?: (ready: boolean) => void;
  onChangeCountChange?: (count: number) => void;
  userRole: string | null;
  userId: string | null;
  editDataset: EditSource;
  scopedOwnerId?: string | null;
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

  return {
    dataRows,
    columns,
  };
}

function getDraftExpiryDate() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  return expiresAt.toISOString();
}

function isTemporaryDraftTitle(value: string) {
  return value.trim().toLowerCase() === "draft";
}

export default function DatasetConfig({
  action,
  saveData,
  onSignalAction,
  onAddReadyChange,
  onChangeCountChange,
  userRole,
  userId,
  editDataset,
  scopedOwnerId = null,
}: DatasetConfigProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastHandledSave = useRef(saveData);

  const isPartner = userRole === "partner";
  const isAdmin = userRole === "admin";
  const targetOwnerId =
    isAdmin && action !== "add" ? (scopedOwnerId ?? userId) : userId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [alertType, setAlertType] = useState<AlertType>("none");

  const [userRows, setUserRows] = useState<UserRow[]>([]);
  const [datasetRows, setDatasetRows] = useState<DatasetRow[]>([]);
  const [newLabel, setNewLabel] = useState("");
  const [csvRawRows, setCsvRawRows] = useState<CsvRawRow[]>([]);
  const [importColumns, setImportColumns] = useState<ImportColumnConfig[]>([]);
  const [newDataRows, setNewDataRows] = useState<DataJsonRow[]>([]);
  const [newColumns, setNewColumns] = useState<ColumnConfig[]>([]);
  const [draftDatasetId, setDraftDatasetId] = useState<string | null>(null);

  const [selectedEditId, setSelectedEditId] = useState("");
  const [editName, setEditName] = useState("");
  const [editColumns, setEditColumns] = useState<ColumnConfig[]>([]);

  const [selectedDeleteIds, setSelectedDeleteIds] = useState<string[]>([]);

  const hasImportedCsv = csvRawRows.length > 0 && importColumns.length > 0;

  useEffect(() => {
    if (action !== "add") {
      onAddReadyChange?.(false);
      return;
    }

    onAddReadyChange?.(hasImportedCsv && newDataRows.length > 0);
  }, [action, hasImportedCsv, newDataRows.length, onAddReadyChange]);

  const selectedImportCount = useMemo(() => {
    return importColumns.filter((column) => column.selected).length;
  }, [importColumns]);

  const userNameMap = useMemo(() => {
    return userRows.reduce<Record<string, string>>((acc, row) => {
      acc[row.id] = row.organization || row.username || "Pengguna tanpa nama";

      return acc;
    }, {});
  }, [userRows]);

  const selectedEditRow = useMemo(() => {
    if (editDataset === "datasets") {
      return (
        datasetRows.find(
          (row) => `${row.kind}:${row.id}` === selectedEditId,
        ) ?? null
      );
    }

    return null;
  }, [datasetRows, editDataset, selectedEditId]);

  const editOptions = useMemo(() => {
    return datasetRows.filter((row) => row.kind === "dataset" || row.kind === "map").map((row) => ({
      id: `${row.kind}:${row.id}`,
      label: `${row.kind === "map" ? "Peta" : row.kind === "link" ? "Link" : "Dataset"} - ${
        row.label ?? "Tanpa Label"
      } - ${
        userNameMap[row.user_id ?? ""] ?? "Tanpa Pemilik"
      }`,
    }));
  }, [datasetRows, userNameMap]);

  const deleteRows = useMemo(() => {
    return datasetRows.map((row) => ({
      id: `${row.kind}:${row.id}`,
      label: `${row.kind === "map" ? "Peta" : row.kind === "dashboard" ? "Dashboard" : row.kind === "link" ? "Link" : "Dataset"} - ${row.label ?? "-"}`,
      ownerName: userNameMap[row.user_id ?? ""] ?? "-",
      dataCount:
        row.kind === "map"
          ? (row.feature_count ?? 0)
          : parseJsonArray<DataJsonRow>(row.data).length,
    }));
  }, [datasetRows, userNameMap]);

  const syncImportedColumnsToState = useCallback(
    (rows: CsvRawRow[], columnsToImport: ImportColumnConfig[]) => {
      const parsed = buildConfigFromSelectedImportColumns(
        rows,
        columnsToImport,
      );

      setNewDataRows(parsed.dataRows);
      setNewColumns(parsed.columns);
    },
    [],
  );

  const saveDraftDataset = useCallback(
    async (
      rows: DataJsonRow[],
      columns: ColumnConfig[],
      labelValue: string,
      draftId = draftDatasetId,
    ) => {
      if (!targetOwnerId || rows.length === 0 || columns.length === 0) return null;

      const payload = {
        user_id: targetOwnerId,
        label: labelValue.trim() || "Draft",
        data: rows,
        column_config: columns,
        import_status: "draft",
        draft_expires_at: getDraftExpiryDate(),
      };

      if (draftId) {
        const { error } = await supabase
          .from("datasets")
          .update(payload)
          .eq("id", draftId);

        if (error) throw error;

        return draftId;
      }

      const { data, error } = await supabase
        .from("datasets")
        .insert(payload)
        .select("id")
        .single();

      if (error) throw error;

      const nextDraftId = data?.id ?? null;
      setDraftDatasetId(nextDraftId);

      return nextDraftId;
    },
    [draftDatasetId, targetOwnerId],
  );

  useEffect(() => {
    if (action !== "add" || !draftDatasetId || newDataRows.length === 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void saveDraftDataset(newDataRows, newColumns, newLabel).catch((error) =>
        console.error("Failed to update draft dataset:", error),
      );
    }, 500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    action,
    draftDatasetId,
    newColumns,
    newDataRows,
    newLabel,
    saveDraftDataset,
  ]);

  const resetImportedCsv = useCallback(() => {
    setCsvRawRows([]);
    setImportColumns([]);
    setNewDataRows([]);
    setNewColumns([]);
    setMessage("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const refreshData = useCallback(async () => {
    setLoading(true);
    setMessage("");

    if ((isPartner || isAdmin) && !userId) {
      setUserRows([]);
      setDatasetRows([]);
      setMessage("User ID tidak ditemukan.");
      setLoading(false);
      return;
    }

    try {
      let usersQuery = supabase
        .from("users")
        .select("id, username, organization, role")
        .in("role", ["admin", "partner"])
        .order("organization", { ascending: true });

      let datasetQuery = supabase
        .from("datasets")
        .select("id, user_id, label, data, column_config, kind")
        .order("created_at", { ascending: false });
      let mapDatasetQuery = supabase
        .from("map_datasets")
        .select("id, user_id, label, geojson_feature_count")
        .order("created_at", { ascending: false });

      if (isPartner) {
        usersQuery = usersQuery.eq("id", userId);
        datasetQuery = datasetQuery.eq("user_id", userId);
        mapDatasetQuery = mapDatasetQuery.eq("user_id", userId);
      } else if (scopedOwnerId) {
        usersQuery = usersQuery.eq("id", scopedOwnerId);
        datasetQuery = datasetQuery.eq("user_id", scopedOwnerId);
        mapDatasetQuery = mapDatasetQuery.eq("user_id", scopedOwnerId);
      }

      const [usersResult, datasetResult, mapDatasetResult] = await Promise.all([
        usersQuery,
        datasetQuery,
        mapDatasetQuery,
      ]);

      if (usersResult.error) throw usersResult.error;
      if (datasetResult.error) throw datasetResult.error;
      if (mapDatasetResult.error) throw mapDatasetResult.error;

      setUserRows((usersResult.data ?? []) as UserRow[]);
      setDatasetRows([
        ...((datasetResult.data ?? []) as DatasetRow[]).map(
          (row) => ({
            ...row,
            kind: row.kind === "dashboard" || row.kind === "link" ? row.kind : "dataset" as const,
          }),
        ),
        ...((mapDatasetResult.data ?? []) as Array<{
          id: string;
          user_id: string | null;
          label: string | null;
          geojson_feature_count: number | null;
        }>).map((row) => ({
          id: row.id,
          user_id: row.user_id,
          label: row.label,
          data: null,
          column_config: null,
          kind: "map" as const,
          feature_count: row.geojson_feature_count,
        })),
      ]);
    } catch (error) {
      console.error("Failed to fetch dataset config:", error);
      if (action !== "add") {
        setMessage("Gagal memuat data konfigurasi.");
      }
    } finally {
      setLoading(false);
    }
  }, [action, userId, scopedOwnerId, isAdmin, isPartner]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  useEffect(() => {
    const availableRows = datasetRows;

    if (availableRows.length === 0) {
      setSelectedEditId("");
      return;
    }

    const stillExists = availableRows.some((row) => row.id === selectedEditId);

    if (!stillExists) {
      setSelectedEditId(availableRows[0].id);
    }
  }, [datasetRows, editDataset, selectedEditId]);

  useEffect(() => {
    if (!selectedEditRow) {
      setEditName("");
      setEditColumns([]);
      return;
    }

    const parsedColumns = parseJsonArray<ColumnConfig>(
      selectedEditRow.column_config,
    );

    setEditName(
      selectedEditRow.label ?? "",
    );

    setEditColumns(parsedColumns);
  }, [editDataset, selectedEditRow]);

  const isEditChanged = useMemo(() => {
    if (!selectedEditRow) return false;

    const originalName =
      selectedEditRow.label ?? "";

    const originalColumns = parseJsonArray<ColumnConfig>(
      selectedEditRow.column_config,
    );

    if (selectedEditRow.kind === "map") {
      return originalName !== editName;
    }

    return (
      JSON.stringify({
        name: originalName,
        columns: originalColumns,
      }) !==
      JSON.stringify({
        name: editName,
        columns: editColumns,
      })
    );
  }, [editColumns, editDataset, editName, selectedEditRow]);

  useEffect(() => {
    if (!onChangeCountChange) return;

    let nextCount = 0;

    if (action === "add") {
      nextCount = hasImportedCsv && newDataRows.length > 0 ? 1 : 0;
    } else if (action === "edit") {
      nextCount = selectedEditId && isEditChanged ? 1 : 0;
    } else if (action === "delete") {
      nextCount = selectedDeleteIds.length;
    }

    const timeout = window.setTimeout(() => onChangeCountChange(nextCount), 0);

    return () => window.clearTimeout(timeout);
  }, [
    action,
    hasImportedCsv,
    isEditChanged,
    newDataRows.length,
    onChangeCountChange,
    selectedDeleteIds.length,
    selectedEditId,
  ]);

  const handleCsvFile = (file: File) => {
    const isCsvFile =
      file.name.toLowerCase().endsWith(".csv") &&
      (!file.type ||
        ["text/csv", "application/vnd.ms-excel", "text/plain"].includes(
          file.type,
        ));

    if (!isCsvFile) {
      resetImportedCsv();
      setAlertType("not-csv");
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
        setNewLabel((prev) => prev || "Draft");
        const parsed = buildConfigFromSelectedImportColumns(
          validRows,
          parsedImportColumns,
        );

        setNewDataRows(parsed.dataRows);
        setNewColumns(parsed.columns);

        setMessage(`CSV berhasil dibaca: ${validRows.length} baris.`);

        void saveDraftDataset(
          parsed.dataRows,
          parsed.columns,
          newLabel || "Draft",
        ).catch((error) => {
          console.error("Failed to save draft dataset:", error);
          setMessage("CSV terbaca, tetapi draft gagal disimpan.");
        });
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
    const parsed = buildConfigFromSelectedImportColumns(csvRawRows, nextColumns);
    setNewDataRows(parsed.dataRows);
    setNewColumns(parsed.columns);
    void saveDraftDataset(parsed.dataRows, parsed.columns, newLabel).catch(
      (error) => console.error("Failed to update draft dataset:", error),
    );
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
    const parsed = buildConfigFromSelectedImportColumns(csvRawRows, nextColumns);
    setNewDataRows(parsed.dataRows);
    setNewColumns(parsed.columns);
    void saveDraftDataset(parsed.dataRows, parsed.columns, newLabel).catch(
      (error) => console.error("Failed to update draft dataset:", error),
    );
  };

  const toggleAllImportColumns = () => {
    const shouldSelectAll = selectedImportCount !== importColumns.length;

    const nextColumns = importColumns.map((column) => ({
      ...column,
      selected: shouldSelectAll,
    }));

    setImportColumns(nextColumns);
    const parsed = buildConfigFromSelectedImportColumns(csvRawRows, nextColumns);
    setNewDataRows(parsed.dataRows);
    setNewColumns(parsed.columns);
    void saveDraftDataset(parsed.dataRows, parsed.columns, newLabel).catch(
      (error) => console.error("Failed to update draft dataset:", error),
    );
  };

  const verifyDatasetAccess = useCallback(async () => {
    if (!userId) {
      setAlertType("no-access");
      return false;
    }

    const { data, error } = await supabase
      .from("users")
      .select("id, role")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("Failed to verify dataset access:", error);
      setAlertType("no-access");
      return false;
    }

    if (!data || (data.role !== "admin" && data.role !== "partner")) {
      setAlertType("no-access");
      return false;
    }

    return true;
  }, [userId]);

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

  const handleRequestAdd = useCallback(async () => {
    const hasAccess = await verifyDatasetAccess();

    if (!hasAccess) return;

    if (isAdmin && scopedOwnerId && scopedOwnerId !== userId) {
      setAlertType("no-access");
      return;
    }

    if (!newLabel.trim()) {
      setAlertType("no-title");
      return;
    }

    if (isTemporaryDraftTitle(newLabel)) {
      setAlertType("draft-title");
      return;
    }

    if (!userId || !targetOwnerId || newDataRows.length === 0 || newColumns.length === 0) {
      setAlertType("no-add");
      return;
    }

    setAlertType("confirm-add");
  }, [
    newColumns.length,
    newDataRows.length,
    newLabel,
    isAdmin,
    scopedOwnerId,
    targetOwnerId,
    userId,
    verifyDatasetAccess,
  ]);

  const handleRequestUpdate = useCallback(async () => {
    const hasAccess = await verifyDatasetAccess();

    if (!hasAccess) return;

    if (isPartner && editDataset !== "datasets") {
      setAlertType("failed");
      return;
    }

    if (!selectedEditId || !isEditChanged) {
      setAlertType("no-update");
      return;
    }

    if (
      !editName.trim() ||
      (selectedEditRow?.kind !== "map" && editColumns.length === 0)
    ) {
      setAlertType("no-update");
      return;
    }

    setAlertType("confirm-update");
  }, [
    editColumns.length,
    editName,
    editDataset,
    isEditChanged,
    isPartner,
    selectedEditId,
    selectedEditRow?.kind,
    verifyDatasetAccess,
  ]);

  const handleRequestDelete = useCallback(async () => {
    const hasAccess = await verifyDatasetAccess();

    if (!hasAccess) return;

    if (selectedDeleteIds.length === 0) {
      setAlertType("no-delete");
      return;
    }

    setAlertType("confirm-delete");
  }, [selectedDeleteIds.length, verifyDatasetAccess]);

  const handleConfirmAdd = useCallback(async () => {
    if (
      !userId ||
      !targetOwnerId ||
      !newLabel.trim() ||
      newDataRows.length === 0 ||
      newColumns.length === 0
    ) {
      setAlertType("no-add");
      return;
    }

    if (isAdmin && scopedOwnerId && scopedOwnerId !== userId) {
      setAlertType("no-access");
      return;
    }

    if (!newLabel.trim()) {
      setAlertType("no-title");
      return;
    }

    if (isTemporaryDraftTitle(newLabel)) {
      setAlertType("draft-title");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        user_id: targetOwnerId,
        label: newLabel.trim(),
        data: newDataRows,
        column_config: newColumns,
      };

      const { error } = draftDatasetId
        ? await supabase.from("datasets").update(payload).eq("id", draftDatasetId)
        : await supabase.from("datasets").insert({
            ...payload,
            import_status: "draft",
            draft_expires_at: getDraftExpiryDate(),
          });

      if (error) throw error;

      setNewLabel("");
      setDraftDatasetId(null);
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
    newLabel,
    draftDatasetId,
    refreshData,
    resetImportedCsv,
    isAdmin,
    scopedOwnerId,
    targetOwnerId,
    userId,
  ]);

  const handleConfirmUpdate = useCallback(async () => {
    if (isPartner && editDataset !== "datasets") {
      setAlertType("failed");
      return;
    }

    if (!selectedEditId || !isEditChanged) {
      setAlertType("no-update");
      return;
    }

    if (
      !editName.trim() ||
      (selectedEditRow?.kind !== "map" && editColumns.length === 0)
    ) {
      setAlertType("no-update");
      return;
    }

    setSaving(true);

    try {
      const selectedKind = selectedEditRow?.kind ?? "dataset";
      const selectedId = selectedEditRow?.id ?? selectedEditId;
      const configPayload = {
        column_config: editColumns,
      };
      const tableName = selectedKind === "map" ? "map_datasets" : "datasets";
      const updatePayload =
        selectedKind === "map"
          ? {
              label: editName.trim(),
            }
          : {
              label: editName.trim(),
              ...configPayload,
            };

      if (isPartner) {
        if (!userId) {
          setAlertType("failed");
          return;
        }

        const updateQuery = supabase
          .from(tableName)
          .update(updatePayload)
          .eq("id", selectedId)
          .eq("user_id", userId);

        const { data, error } = await updateQuery.select("id");

        if (error) throw error;

        if (!data || data.length === 0) {
          setAlertType("failed");
          return;
        }
      } else {
        let updateQuery = supabase
          .from(tableName)
          .update(updatePayload)
          .eq("id", selectedId);

        if (scopedOwnerId) {
          updateQuery = updateQuery.eq("user_id", scopedOwnerId);
        }

        const { data, error } = await updateQuery.select("id");

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
    editName,
    isEditChanged,
    isPartner,
    refreshData,
    selectedEditId,
    selectedEditRow,
    scopedOwnerId,
  ]);

  const handleConfirmDelete = useCallback(async () => {
    if (selectedDeleteIds.length === 0) {
      setAlertType("no-delete");
      return;
    }

    setSaving(true);

    try {
      const selectedRows = datasetRows.filter((row) =>
        selectedDeleteIds.includes(`${row.kind}:${row.id}`),
      );
      const datasetDeleteIds = selectedRows
        .filter((row) => row.kind !== "map")
        .map((row) => row.id);
      const mapDeleteIds = selectedRows
        .filter((row) => row.kind === "map")
        .map((row) => row.id);

      if (isPartner) {
        if (!userId) {
          setAlertType("failed");
          return;
        }

        const deleteResults = await Promise.all([
          datasetDeleteIds.length > 0
            ? supabase.rpc("delete_authorized_datasets", {
                p_dataset_ids: datasetDeleteIds,
                p_owner_id: userId,
              }).then(({ data, error }) => ({ data: Array.from({ length: Number(data ?? 0) }), error }))
            : Promise.resolve({ data: [], error: null }),
          mapDeleteIds.length > 0
            ? supabase
                .from("map_datasets")
                .delete()
                .in("id", mapDeleteIds)
                .eq("user_id", userId)
                .select("id")
            : Promise.resolve({ data: [], error: null }),
        ]);

        const error = deleteResults.find((result) => result.error)?.error;
        const deletedCount = deleteResults.reduce(
          (total, result) => total + (result.data?.length ?? 0),
          0,
        );

        if (error) throw error;

        if (deletedCount === 0) {
          setAlertType("failed");
          return;
        }
      } else {
        const deleteQueries = [];

        if (datasetDeleteIds.length > 0) {
          deleteQueries.push(
            supabase.rpc("delete_authorized_datasets", {
              p_dataset_ids: datasetDeleteIds,
              p_owner_id: scopedOwnerId || null,
            }),
          );
        }

        if (mapDeleteIds.length > 0) {
          let deleteQuery = supabase
            .from("map_datasets")
            .delete()
            .in("id", mapDeleteIds);

          if (scopedOwnerId) {
            deleteQuery = deleteQuery.eq("user_id", scopedOwnerId);
          }

          deleteQueries.push(deleteQuery);
        }

        const deleteResults = await Promise.all(deleteQueries);
        const error = deleteResults.find((result) => result.error)?.error;

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
  }, [
    datasetRows,
    userId,
    isPartner,
    refreshData,
    scopedOwnerId,
    selectedDeleteIds,
  ]);

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
    if (selectedDeleteIds.length === deleteRows.length) {
      setSelectedDeleteIds([]);
      return;
    }

    setSelectedDeleteIds(deleteRows.map((row) => row.id));
  };

  if (loading) {
    return (
      <div className="flex min-h-40 w-full items-center justify-center">
        <SpinnerLoading size="sm" color="black" />
      </div>
    );
  }

  return (
    <>
      <div className="w-full space-y-5">
        {message && (action !== "add" || hasImportedCsv) && (
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
            newDataRows={newDataRows}
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
            selectedKind={selectedEditRow?.kind === "map" ? "map" : "dataset"}
            updateColumn={updateColumn}
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
              <h3 className="font-semibold">Dataset</h3>

              <div className="overflow-x-auto rounded-md border border-gray-300">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr>
                      <th className="border border-gray-300 bg-sky-100 px-3 py-2">
                        Label
                      </th>
                      <th className="border border-gray-300 bg-sky-100 px-3 py-2">
                        Pemilik
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
                          {row.label}
                        </td>

                        <td className="border border-gray-300 px-3 py-2">
                          {userNameMap[row.user_id ?? ""] ?? "-"}
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
          </div>
        )}
      </div>

      {alertType === "confirm-update" && (
        <AlertNotif
          type="double"
          msg={`Apakah Anda yakin ingin mengupdate ${isEditChanged ? 1 : 0} data?`}
          yesText="Ya"
          noText="Tidak"
          icon="warning"
          loading={saving}
          confirm={(confirmed) => {
            if (confirmed) {
              void handleConfirmUpdate();
              return;
            }

            setAlertType("none");
          }}
        />
      )}

      {alertType === "confirm-add" && (
        <AlertNotif
          type="double"
          msg={`Apakah Anda yakin ingin menambahkan ${
            hasImportedCsv && newDataRows.length > 0 ? 1 : 0
          } data?`}
          yesText="Ya"
          noText="Tidak"
          icon="warning"
          loading={saving}
          confirm={(confirmed) => {
            if (confirmed) {
              void handleConfirmAdd();
              return;
            }

            setAlertType("none");
          }}
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
          confirm={(confirmed) => {
            if (confirmed) {
              void handleConfirmDelete();
              return;
            }

            setAlertType("none");
          }}
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

      {alertType === "no-title" && (
        <AlertNotif
          type="single"
          msg="Judul Dataset wajib diisi sebelum menyimpan."
          yesText="OK"
          icon="warning"
          confirm={() => setAlertType("none")}
        />
      )}

      {alertType === "draft-title" && (
        <AlertNotif
          type="single"
          msg='Judul Dataset masih menggunakan nama sementara "Draft". Silakan ubah judul sebelum menyimpan.'
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

      {alertType === "no-access" && (
        <AlertNotif
          type="single"
          msg="Anda tidak memiliki akses ini"
          yesText="OK"
          icon="failed"
          confirm={handleResultAlert}
        />
      )}

      {alertType === "not-csv" && (
        <AlertNotif
          type="single"
          msg="Dokumen yang diupload bukan dokumen CSV."
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
