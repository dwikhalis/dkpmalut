"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type {
  ClipboardEvent,
  DragEvent,
  HTMLInputTypeAttribute,
} from "react";
import { supabase } from "@/lib/supabase/supabaseClient";
import { useUrlTableState } from "@/lib/hooks/useUrlTableState";
import AlertNotif from "./AlertNotif";
import { useDataEditStore } from "@/app/Stores/dataEditStores";
import SpinnerLoading from "./SpinnerLoading";
import {
  DownChevron,
  Draggable,
  Delete,
  LeftChevron,
  RightChevron,
} from "@/public/icons/iconSets";

const Papa = (await import("papaparse")).default;

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
  created_at: string;
  user_id: string | null;
};

type TableSort = {
  key: string;
  direction: "asc" | "desc";
} | null;

type DatasetImportBatch = {
  id: string;
  dataset_id: string;
  created_by: string | null;
  created_by_name: string;
  row_ids: string[];
  row_count: number;
  created_at: string;
};

const LEGACY_IMPORT_BATCH_ID = "__existing_rows__";

const formatImportBatchLabel = (batch: DatasetImportBatch) => {
  const dateParts = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Jayapura",
  })
    .format(new Date(batch.created_at))
    .replace(",", "");

  return `${dateParts} WIT - ${batch.created_by_name}`;
};

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

type CsvRow = Record<string, string | undefined>;

type CsvValidationResult = {
  rows: DatasetRow[];
  errors: string[];
};

const escapeCsvCell = (value: string) => `"${value.replaceAll('"', '""')}"`;

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
  onColumnsChange?: (columns: ColumnConfig[]) => void;
  filters?: FilterConfig[];
  defaultSortKey?: string;
  duplicateKeys?: string[];
  role?: "admin" | "partner" | null;
  canAdd?: boolean;
}

export default function DatasetTable({
  action,
  saveData,
  onSignalAction,
  onChangeCountChange,
  datasetId,
  columns,
  onColumnsChange,
  filters = [],
  defaultSortKey,
  duplicateKeys = [],
  role = null,
  canAdd = false,
}: Props) {
  const searchParams = useSearchParams();
  const [allRows, setAllRows] = useState<DatasetRow[]>([]);
  const [dataset, setDataset] = useState<DatasetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { page, setPage, updatePage } = useUrlTableState({
    columns,
    filters,
    defaultSortKey,
  });

  const [editedRows, setEditedRows] = useState<
    Record<string, Partial<DatasetRow>>
  >({});
  const [editColumns, setEditColumns] = useState<ColumnConfig[]>(columns);
  const [editAddedRows, setEditAddedRows] = useState<DatasetRow[]>([]);
  const [editDeletedRowIds, setEditDeletedRowIds] = useState<string[]>([]);
  const [newColumnKeys, setNewColumnKeys] = useState<string[]>([]);
  const [validationMessage, setValidationMessage] = useState("");
  const editSessionKey = `dataset-edit:${datasetId}`;
  const restoredEditSessionRef = useRef("");

  const [newRows, setNewRows] = useState<DatasetRow[]>([]);
  const [isDraggingCsv, setIsDraggingCsv] = useState(false);
  const [uploadedCsvName, setUploadedCsvName] = useState("");
  const [csvValidationErrors, setCsvValidationErrors] = useState<string[]>([]);
  const csvFileInputRef = useRef<HTMLInputElement>(null);

  const [selectedDeleteIds, setSelectedDeleteIds] = useState<string[]>([]);

  const [pageSize] = useState(50);
  const [totalRows, setTotalRows] = useState(0);

  const [filterOptions, setFilterOptions] = useState<Record<string, string[]>>(
    {},
  );
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<string[]>(() =>
    columns.map((column) => column.key),
  );
  const [draggedColumnKey, setDraggedColumnKey] = useState<string | null>(null);
  const [columnDropTarget, setColumnDropTarget] = useState<{
    key: string;
    position: "before" | "after";
  } | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>(
    {},
  );
  const [tableSort, setTableSort] = useState<TableSort>(null);
  const [importBatches, setImportBatches] = useState<DatasetImportBatch[]>([]);
  const [initialImport, setInitialImport] = useState<{
    createdAt: string;
    createdByName: string;
    createdBy: string | null;
  } | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [pendingDeleteBatchId, setPendingDeleteBatchId] = useState<
    string | null
  >(null);
  const [selectedImportBatchIds, setSelectedImportBatchIds] = useState<
    string[] | null
  >(null);

  const [saving, setSaving] = useState(false);
  const lastHandledSave = useRef(0);
  const visibleColumnDatasetRef = useRef(datasetId);
  const hasInitializedVisibleColumns = useRef(false);

  const [alertType, setAlertType] = useState<
    | "none"
    | "confirm-update"
    | "confirm-add"
    | "confirm-delete"
    | "confirm-delete-batch"
    | "success-update"
    | "success-add"
    | "success-delete"
    | "success-delete-batch"
    | "no-update"
    | "no-add"
    | "no-delete"
    | "failed"
    | "validation"
  >("none");

  const tableColumns = useMemo(() => {
    if (action === "edit") return editColumns;
    if (action !== "list") return columns;

    const columnMap = new Map(columns.map((column) => [column.key, column]));
    return visibleColumnKeys
      .map((key) => columnMap.get(key))
      .filter((column): column is ColumnConfig => Boolean(column));
  }, [action, columns, editColumns, visibleColumnKeys]);

  const editDisplayRows = useMemo(
    () => [
      ...dataset.filter((row) => !editDeletedRowIds.includes(row.id)),
      ...editAddedRows,
    ],
    [dataset, editAddedRows, editDeletedRowIds],
  );

  const importColumns = useMemo(
    () => columns.filter((column) => column.key !== "id"),
    [columns],
  );

  const importBatchOptions = useMemo(() => {
    const importedRowIds = new Set(
      importBatches.flatMap((batch) => batch.row_ids),
    );
    const existingRowCount = allRows.filter(
      (row) => !importedRowIds.has(row.id),
    ).length;
    const options = importBatches.map((batch) => ({
      id: batch.id,
      label: formatImportBatchLabel(batch),
      rowCount: batch.row_count,
      createdBy: batch.created_by,
      isInitial: false,
    }));

    if (existingRowCount > 0) {
      const initialBatchLabel = initialImport
        ? formatImportBatchLabel({
            id: LEGACY_IMPORT_BATCH_ID,
            dataset_id: datasetId,
            created_by: null,
            created_by_name: initialImport.createdByName,
            row_ids: [],
            row_count: existingRowCount,
            created_at: initialImport.createdAt,
          })
        : "Data impor awal";

      options.push({
        id: LEGACY_IMPORT_BATCH_ID,
        label: initialBatchLabel,
        rowCount: existingRowCount,
        createdBy: initialImport?.createdBy ?? null,
        isInitial: true,
      });
    }

    return options;
  }, [allRows, datasetId, importBatches, initialImport]);

  const csvTemplateHref = useMemo(() => {
    const header = importColumns
      .map((column) => escapeCsvCell(column.key))
      .join(",");

    return `data:text/csv;charset=utf-8,%EF%BB%BF${encodeURIComponent(`${header}\r\n`)}`;
  }, [importColumns]);

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

    if (selectedImportBatchIds !== null) {
      const allImportedRowIds = new Set(
        importBatches.flatMap((batch) => batch.row_ids),
      );
      const selectedRowIds = new Set(
        importBatches
          .filter((batch) => selectedImportBatchIds.includes(batch.id))
          .flatMap((batch) => batch.row_ids),
      );
      const includeExistingRows = selectedImportBatchIds.includes(
        LEGACY_IMPORT_BATCH_ID,
      );

      result = result.filter(
        (row) =>
          selectedRowIds.has(row.id) ||
          (includeExistingRows && !allImportedRowIds.has(row.id)),
      );
    }

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
        new Set(rows.map((row) => String(row[column.key] ?? ""))),
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
        setInitialImport(null);
        setImportBatches([]);
        return;
      }

      const { data, error } = await supabase
        .from("datasets")
        .select("id, data, created_at, user_id")
        .eq("id", datasetId)
        .maybeSingle();

      if (error) throw error;

      const dbRow = data as DatasetDbRow | null;
      const rows = normalizeJsonbRows(dbRow?.data);
      let initialCreatedByName = "Pengguna";

      if (dbRow?.user_id) {
        const { data: uploaderName, error: uploaderError } = await supabase.rpc(
          "get_dataset_uploader_name",
          { p_dataset_id: datasetId },
        );

        if (uploaderError) {
          console.warn("Dataset uploader name is unavailable:", uploaderError);
        } else if (typeof uploaderName === "string" && uploaderName.trim()) {
          initialCreatedByName = uploaderName.trim();
        }
      }

      const { data: batchRows, error: batchError } = await supabase
        .from("dataset_import_batches")
        .select(
          "id, dataset_id, created_by, created_by_name, row_ids, row_count, created_at",
        )
        .eq("dataset_id", datasetId)
        .order("created_at", { ascending: false });

      if (batchError) {
        console.warn("Dataset import history is unavailable:", batchError);
      }

      const { data: tablePreference, error: preferenceError } = await supabase
        .from("table_view_preferences")
        .select("column_order")
        .eq("resource_kind", "dataset")
        .eq("resource_id", datasetId)
        .maybeSingle();

      if (preferenceError) {
        console.warn("Dataset column order is unavailable:", preferenceError);
      } else if (Array.isArray(tablePreference?.column_order)) {
        const availableKeys = columns.map((column) => column.key);
        const savedKeys = tablePreference.column_order.filter((key: string) =>
          availableKeys.includes(key),
        );
        setVisibleColumnKeys([
          ...savedKeys,
          ...availableKeys.filter((key) => !savedKeys.includes(key)),
        ]);
      }

      setAllRows(rows);
      setInitialImport(
        dbRow?.created_at
          ? {
              createdAt: dbRow.created_at,
              createdByName: initialCreatedByName,
              createdBy: dbRow.user_id,
            }
          : null,
      );
      setImportBatches((batchRows ?? []) as DatasetImportBatch[]);
      setSelectedImportBatchIds(null);
      buildFilterOptions(rows);
      applyRowsToPage(rows);
    } catch (err) {
      console.error("Error fetching dataset rows:", err);
      setAllRows([]);
      setDataset([]);
      setTotalRows(0);
      setFilterOptions({});
      setInitialImport(null);
      setImportBatches([]);
    } finally {
      setLoading(false);
    }
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
    const fetchCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);
    };

    void fetchCurrentUser();
  }, []);

  useEffect(() => {
    applyRowsToPage(allRows);
    buildFilterOptions(allRows);
  }, [
    allRows,
    columnFilters,
    tableSort,
    page,
    pageSize,
    columns,
    importBatches,
    selectedImportBatchIds,
  ]);

  const addEditRow = () => {
    const row: DatasetRow = { id: createRowId() };
    editColumns.forEach((column) => {
      if (column.key !== "id") row[column.key] = "";
    });
    setEditAddedRows((rows) => [...rows, row]);
  };

  const addEditColumn = () => {
    let index = 1;
    let key = "kolom_baru";
    while (editColumns.some((column) => column.key === key)) {
      index += 1;
      key = `kolom_baru_${index}`;
    }
    setEditColumns((current) => [
      ...current,
      { key, label: "Kolom Baru", editable: true, inputType: "text", align: "left" },
    ]);
    setNewColumnKeys((keys) => [...keys, key]);
  };

  const deleteEditColumn = (key: string) => {
    setEditColumns((current) => current.filter((column) => column.key !== key));
    setNewColumnKeys((keys) => keys.filter((columnKey) => columnKey !== key));
  };

  const deleteEditRow = (rowId: string) => {
    if (editAddedRows.some((row) => row.id === rowId)) {
      setEditAddedRows((rows) => rows.filter((row) => row.id !== rowId));
    } else {
      setEditDeletedRowIds((ids) => [...new Set([...ids, rowId])]);
    }
  };

  useEffect(() => {
    if (action !== "edit") return;
    if (restoredEditSessionRef.current === editSessionKey) return;

    restoredEditSessionRef.current = editSessionKey;
    const saved = useDataEditStore.getState().drafts[editSessionKey] as
      | {
          editedRows?: Record<string, Partial<DatasetRow>>;
          addedRows?: DatasetRow[];
          deletedRowIds?: string[];
          editColumns?: ColumnConfig[];
          newColumnKeys?: string[];
        }
      | undefined;

    setEditedRows(saved?.editedRows ?? {});
    setEditAddedRows(saved?.addedRows ?? []);
    setEditDeletedRowIds(saved?.deletedRowIds ?? []);
    setEditColumns(saved?.editColumns?.length ? saved.editColumns : columns);
    setNewColumnKeys(saved?.newColumnKeys ?? []);
  }, [action, columns, editSessionKey]);

  useEffect(() => {
    if (action !== "edit" || restoredEditSessionRef.current !== editSessionKey)
      return;

    const timeout = window.setTimeout(() => {
      useDataEditStore.getState().setDraft(editSessionKey, {
        editedRows,
        addedRows: editAddedRows,
        deletedRowIds: editDeletedRowIds,
        editColumns,
        newColumnKeys,
      });
    }, 150);

    return () => window.clearTimeout(timeout);
  }, [
    action,
    editAddedRows,
    editColumns,
    editDeletedRowIds,
    editedRows,
    editSessionKey,
    newColumnKeys,
  ]);

  useEffect(() => {
    if (searchParams.get("action") === "edit") return;
    useDataEditStore.getState().clearDraft(editSessionKey);
    restoredEditSessionRef.current = "";
    setEditAddedRows([]);
    setEditDeletedRowIds([]);
    setNewColumnKeys([]);
    setEditColumns(columns);
  }, [action, columns, editSessionKey, searchParams]);

  useEffect(() => {
    if (action !== "edit") return;
    let pageIsUnloading = false;
    const markPageUnload = () => {
      pageIsUnloading = true;
    };
    const clearForLinkNavigation = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement).closest("a[href]");
      if (!anchor) return;
      const destination = new URL(
        (anchor as HTMLAnchorElement).href,
        window.location.href,
      );
      if (
        destination.pathname !== window.location.pathname ||
        destination.search !== window.location.search
      ) {
        useDataEditStore.getState().clearDraft(editSessionKey);
      }
    };
    window.addEventListener("beforeunload", markPageUnload);
    window.addEventListener("pagehide", markPageUnload);
    document.addEventListener("click", clearForLinkNavigation, true);
    return () => {
      window.removeEventListener("beforeunload", markPageUnload);
      window.removeEventListener("pagehide", markPageUnload);
      document.removeEventListener("click", clearForLinkNavigation, true);
      if (!pageIsUnloading)
        useDataEditStore.getState().clearDraft(editSessionKey);
    };
  }, [action, editSessionKey]);

  useEffect(() => {
    if (action === "add") {
      setNewRows([]);
      setUploadedCsvName("");
      setCsvValidationErrors([]);
      setIsDraggingCsv(false);
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

  const persistColumnOrder = async (visibleOrder: string[]) => {
    const allKeys = columns.map((column) => column.key);
    const columnOrder = [
      ...visibleOrder,
      ...allKeys.filter((key) => !visibleOrder.includes(key)),
    ];
    const { error } = await supabase.from("table_view_preferences").upsert(
      {
        resource_kind: "dataset",
        resource_id: datasetId,
        column_order: columnOrder,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,resource_kind,resource_id" },
    );

    if (error) {
      console.error("Failed to save dataset column order:", error);
    }
  };

  const moveVisibleColumn = (key: string, direction: -1 | 1) => {
    const index = visibleColumnKeys.indexOf(key);
    const targetIndex = index + direction;
    if (
      index < 0 ||
      targetIndex < 0 ||
      targetIndex >= visibleColumnKeys.length
    ) {
      return;
    }

    const next = [...visibleColumnKeys];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    setVisibleColumnKeys(next);
    void persistColumnOrder(next);
  };

  const handleColumnDragStart = (
    event: DragEvent<HTMLElement>,
    key: string,
  ) => {
    if (!window.matchMedia("(min-width: 1024px)").matches) {
      event.preventDefault();
      return;
    }

    setDraggedColumnKey(key);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", key);
  };

  const handleColumnDrop = (
    event: DragEvent<HTMLTableCellElement>,
    targetKey: string,
    position: "before" | "after",
  ) => {
    event.preventDefault();
    const sourceKey =
      draggedColumnKey || event.dataTransfer.getData("text/plain");

    if (!sourceKey || sourceKey === targetKey) {
      setDraggedColumnKey(null);
      setColumnDropTarget(null);
      return;
    }

    const sourceIndex = visibleColumnKeys.indexOf(sourceKey);
    const targetIndex = visibleColumnKeys.indexOf(targetKey);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const next = [...visibleColumnKeys];
    const [moved] = next.splice(sourceIndex, 1);
    const adjustedTargetIndex =
      sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
    next.splice(
      position === "after" ? adjustedTargetIndex + 1 : adjustedTargetIndex,
      0,
      moved,
    );
    setVisibleColumnKeys(next);
    void persistColumnOrder(next);
    setDraggedColumnKey(null);
    setColumnDropTarget(null);
  };

  const toggleImportBatch = (id: string) => {
    setSelectedImportBatchIds((prev) => {
      const current = prev ?? importBatchOptions.map((option) => option.id);
      const next = current.includes(id)
        ? current.filter((batchId) => batchId !== id)
        : [...current, id];

      return next.length === importBatchOptions.length ? null : next;
    });
    setPage(0);
  };

  const setAllImportBatches = (selected: boolean) => {
    setSelectedImportBatchIds(selected ? null : []);
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

  const validateCsvRows = (
    rows: CsvRow[],
    fields: string[],
  ): CsvValidationResult => {
    const errors: string[] = [];
    const expectedKeys = importColumns.map((column) => column.key);
    const expectedKeySet = new Set(expectedKeys);
    const actualFields = fields.map((field) => field.trim()).filter(Boolean);
    const actualFieldSet = new Set(actualFields);
    const duplicateFields = actualFields.filter(
      (field, index) => actualFields.indexOf(field) !== index,
    );
    const missingFields = expectedKeys.filter(
      (key) => !actualFieldSet.has(key),
    );
    const unexpectedFields = actualFields.filter(
      (field) => !expectedKeySet.has(field),
    );

    if (duplicateFields.length > 0) {
      errors.push(
        `Nama kolom duplikat: ${Array.from(new Set(duplicateFields)).join(", ")}.`,
      );
    }

    if (missingFields.length > 0) {
      errors.push(`Kolom wajib tidak ditemukan: ${missingFields.join(", ")}.`);
    }

    if (unexpectedFields.length > 0) {
      errors.push(
        `Kolom tidak dikenali: ${Array.from(new Set(unexpectedFields)).join(", ")}.`,
      );
    }

    if (
      actualFields.length !== expectedKeys.length &&
      missingFields.length === 0 &&
      unexpectedFields.length === 0
    ) {
      errors.push(
        `Jumlah kolom tidak sesuai. Diperlukan ${expectedKeys.length} kolom, tetapi ditemukan ${actualFields.length}.`,
      );
    }

    if (errors.length > 0) {
      return { rows: [], errors };
    }

    const parsedRows: DatasetRow[] = [];

    rows.forEach((row, rowIndex) => {
      const parsedRow: DatasetRow = { id: createRowId() };
      let hasValue = false;

      importColumns.forEach((column) => {
        const rawValue = row[column.key] ?? "";
        const value = rawValue.trim();

        if (!value) {
          parsedRow[column.key] = null;
          return;
        }

        hasValue = true;

        if (column.inputType === "number") {
          const numberValue = Number(value.replaceAll(",", ""));

          if (!Number.isFinite(numberValue)) {
            errors.push(
              `Baris ${rowIndex + 2}, kolom "${column.label}" (${column.key}): "${value}" bukan angka yang valid.`,
            );
            return;
          }

          parsedRow[column.key] = numberValue;
          return;
        }

        parsedRow[column.key] = value;
      });

      if (hasValue) {
        parsedRows.push(parsedRow);
      }
    });

    if (parsedRows.length === 0 && errors.length === 0) {
      errors.push("CSV tidak berisi baris data. Isi minimal satu baris.");
    }

    if (errors.length === 0 && duplicateKeys.length > 0) {
      const normalizeKeyValue = (value: DatasetValue) =>
        String(value ?? "")
          .trim()
          .toLocaleLowerCase("id-ID");
      const compositeKey = (row: DatasetRow) =>
        JSON.stringify(
          duplicateKeys.map((key) => normalizeKeyValue(row[key])),
        );
      const describeKey = (row: DatasetRow) =>
        duplicateKeys
          .map((key) => {
            const label =
              columns.find((column) => column.key === key)?.label ?? key;
            return `${label}: ${displayValue(row[key])}`;
          })
          .join(", ");
      const existingKeys = new Map(
        allRows.map((row) => [compositeKey(row), row] as const),
      );
      const uploadedKeys = new Map<string, number>();

      parsedRows.forEach((row, index) => {
        const key = compositeKey(row);
        const existingRow = existingKeys.get(key);
        const previousUploadRow = uploadedKeys.get(key);

        if (existingRow) {
          errors.push(
            `Baris ${index + 2} duplikat dengan data yang sudah tersimpan (${describeKey(row)}).`,
          );
        } else if (previousUploadRow !== undefined) {
          errors.push(
            `Baris ${index + 2} duplikat dengan baris ${previousUploadRow + 2} dalam CSV ini (${describeKey(row)}).`,
          );
        } else {
          uploadedKeys.set(key, index);
        }
      });
    }

    return {
      rows: errors.length === 0 ? parsedRows : [],
      errors,
    };
  };

  const handleCsvFile = (file: File) => {
    const isCsvFile =
      file.name.toLowerCase().endsWith(".csv") &&
      (!file.type ||
        ["text/csv", "application/vnd.ms-excel", "text/plain"].includes(
          file.type,
        ));

    setUploadedCsvName(file.name);
    setNewRows([]);
    setCsvValidationErrors([]);

    if (!isCsvFile) {
      setCsvValidationErrors([
        `File "${file.name}" bukan dokumen CSV. Gunakan template dan simpan dokumen dengan ekstensi .csv.`,
      ]);
      return;
    }

    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: "greedy",
      complete: (result) => {
        const parserErrors = result.errors.map(
          (error) =>
            `Baris ${error.row === undefined ? "tidak diketahui" : error.row + 1}: ${error.message}`,
        );
        const validation = validateCsvRows(
          result.data,
          result.meta.fields ?? [],
        );
        const errors = [...parserErrors, ...validation.errors];

        setCsvValidationErrors(errors);
        setNewRows(errors.length === 0 ? validation.rows : []);
      },
      error: (error) => {
        setCsvValidationErrors([`CSV gagal dibaca: ${error.message}`]);
      },
    });
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

  const getEffectiveEditRows = () =>
    [
      ...allRows
        .filter((row) => !editDeletedRowIds.includes(row.id))
        .map((row) => ({ ...row, ...editedRows[row.id] })),
      ...editAddedRows,
    ];

  const validateEditDraft = () => {
    const labels = editColumns.map((column) => column.label.trim());
    if (labels.some((label) => !label))
      return "Nama header tidak boleh kosong.";
    if (new Set(labels.map((label) => label.toLocaleLowerCase("id-ID"))).size !== labels.length)
      return "Nama header tidak boleh duplikat.";

    if (
      editAddedRows.length > 0 &&
      !editAddedRows.some((row) =>
        editColumns.some(
          (column) =>
            column.key !== "id" && !isMissingValue(row[column.key]),
        ),
      )
    ) {
      return "Baris baru masih kosong. Isi setidaknya satu sel sebelum menyimpan.";
    }

    for (const column of editColumns) {
      if (column.inputType !== "number") continue;
      const invalid = getEffectiveEditRows().some((row) => {
        const value = row[column.key];
        return !isMissingValue(value) && !Number.isFinite(Number(value));
      });
      if (invalid) return `Kolom "${column.label}" hanya menerima angka.`;
    }
    return "";
  };

  const editChangeCount =
    Object.values(editedRows).reduce(
      (count, changes) => count + Object.keys(changes).length,
      0,
    ) +
    editAddedRows.length +
    editDeletedRowIds.length +
    newColumnKeys.length +
    editColumns.filter((column, index) => columns[index]?.label !== column.label || columns[index]?.inputType !== column.inputType).length;

  useEffect(() => {
    if (saveData === 0) return;
    if (saveData === lastHandledSave.current) return;

    lastHandledSave.current = saveData;

    if (action === "edit") {
      const invalidMessage = validateEditDraft();
      if (invalidMessage) {
        setValidationMessage(invalidMessage);
        setAlertType("validation");
        return;
      }
      const hasChanges = editChangeCount > 0;

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
  }, [saveData, action, editedRows, newRows, selectedDeleteIds, editChangeCount]);

  const handleCellChange = (
    rowId: string,
    key: string,
    value: string,
    inputType?: HTMLInputTypeAttribute,
  ) => {
    const finalValue = normalizeInputValue(value, inputType);

    if (editAddedRows.some((row) => row.id === rowId)) {
      setEditAddedRows((rows) =>
        rows.map((row) => (row.id === rowId ? { ...row, [key]: finalValue } : row)),
      );
      return;
    }

    setEditedRows((prev) => ({
      ...prev,
      [rowId]: {
        ...prev[rowId],
        [key]: finalValue,
      },
    }));
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

  const handleConfirmUpdate = async (confirmation: boolean) => {
    if (!confirmation) {
      setAlertType("none");
      return;
    }

    setSaving(true);

    try {
      const effectiveRows = getEffectiveEditRows();
      const savedColumns = editColumns.filter(
        (column) =>
          !newColumnKeys.includes(column.key) ||
          effectiveRows.some((row) => !isMissingValue(row[column.key])),
      );
      const rowsToAppend = editAddedRows.filter((row) =>
        savedColumns.some(
          (column) => column.key !== "id" && !isMissingValue(row[column.key]),
        ),
      );
      const allowedKeys = new Set(savedColumns.map((column) => column.key));
      const committedRows = allRows
        .map((row) => ({ ...row, ...editedRows[row.id] }))
        .filter((row) => !editDeletedRowIds.includes(row.id))
        .concat(rowsToAppend)
        .map((row) =>
          Object.fromEntries(
            Object.entries(row).filter(
              ([key]) => key === "id" || allowedKeys.has(key),
            ),
          ),
        ) as DatasetRow[];
      const { error: saveError } = await supabase.rpc(
        "save_dataset_table_edit",
        {
          p_dataset_id: datasetId,
          p_rows: committedRows,
          p_column_config: savedColumns,
        },
      );
      if (saveError?.code === "PGRST202") {
        // Compatibility path for databases that have not received the atomic
        // editor RPC yet. Use the existing row RPCs so additions and removals
        // are persisted instead of relying on a full JSON table update.
        const { data: configData, error: configError } = await supabase
          .from("datasets")
          .update({ column_config: savedColumns })
          .eq("id", datasetId)
          .select("id")
          .maybeSingle();
        if (configError) throw configError;
        if (!configData) {
          throw new Error(
            "Migration save_dataset_table_edit belum diterapkan dan akun ini tidak memiliki akses update langsung.",
          );
        }

        const existingIds = new Set(allRows.map((row) => row.id));
        const existingChanges = committedRows.filter((row) =>
          existingIds.has(row.id),
        );
        if (existingChanges.length > 0) {
          const { error } = await supabase.rpc("update_dataset_data_rows", {
            p_dataset_id: datasetId,
            p_changes: existingChanges,
          });
          if (error) throw error;
        }
        if (editDeletedRowIds.length > 0) {
          const { error } = await supabase.rpc("delete_dataset_data_rows", {
            p_dataset_id: datasetId,
            p_row_ids: editDeletedRowIds,
          });
          if (error) throw error;
        }
        if (rowsToAppend.length > 0) {
          const { error } = await supabase.rpc(
            "append_dataset_rows_with_batch",
            { p_dataset_id: datasetId, p_rows: rowsToAppend },
          );
          if (error) throw error;
        }
      } else if (saveError) {
        throw saveError;
      }
      const { data: persistedDataset, error: readbackError } = await supabase
        .from("datasets")
        .select("data")
        .eq("id", datasetId)
        .maybeSingle();
      if (readbackError) throw readbackError;
      const persistedRows = normalizeJsonbRows(persistedDataset?.data);
      const persistedIds = new Set(persistedRows.map((row) => row.id));
      const missingAddedRow = rowsToAppend.find(
        (row) => !persistedIds.has(row.id),
      );
      if (missingAddedRow) {
        throw new Error(
          `Baris baru ${missingAddedRow.id} tidak ditemukan setelah penyimpanan database.`,
        );
      }

      setColumnFilters({});
      setTableSort(null);
      setSelectedImportBatchIds(null);
      if (rowsToAppend.length > 0) {
        updatePage(
          Math.max(Math.ceil(persistedRows.length / pageSize) - 1, 0),
        );
      }
      setAllRows(persistedRows);
      buildFilterOptions(persistedRows);
      setEditColumns(savedColumns);
      onColumnsChange?.(savedColumns);

      setEditedRows({});
      setEditAddedRows([]);
      setEditDeletedRowIds([]);
      setNewColumnKeys([]);
      useDataEditStore.getState().clearDraft(editSessionKey);
      restoredEditSessionRef.current = "";
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

      const { data: createdBatchData, error } = await supabase.rpc(
        "append_dataset_rows_with_batch",
        {
          p_dataset_id: datasetId,
          p_rows: rowsWithIds,
        },
      );

      if (error) throw error;

      const createdBatch = (Array.isArray(createdBatchData)
        ? createdBatchData[0]
        : createdBatchData) as DatasetImportBatch | null;
      const nextRows = [...allRows, ...rowsWithIds];

      setAllRows(nextRows);
      if (createdBatch) {
        setImportBatches((prev) => [createdBatch, ...prev]);
      }
      setSelectedImportBatchIds(null);
      applyRowsToPage(nextRows);
      buildFilterOptions(nextRows);

      setNewRows([]);
      setUploadedCsvName("");
      setCsvValidationErrors([]);
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

      const { error } = await supabase.rpc("delete_dataset_data_rows", {
        p_dataset_id: datasetId,
        p_row_ids: selectedDeleteIds,
      });

      if (error) throw error;

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

  const canDeleteImportBatch = (createdBy: string | null) => {
    if (role === "admin") return true;

    return (
      role === "partner" &&
      canAdd &&
      Boolean(currentUserId) &&
      createdBy === currentUserId
    );
  };

  const requestDeleteImportBatch = (batchId: string) => {
    setPendingDeleteBatchId(batchId);
    setOpenMenu(null);
    setAlertType("confirm-delete-batch");
  };

  const handleConfirmDeleteBatch = async (confirmation: boolean) => {
    if (!confirmation) {
      setPendingDeleteBatchId(null);
      setAlertType("none");
      return;
    }
    if (!pendingDeleteBatchId) return;

    setSaving(true);

    try {
      const isInitial = pendingDeleteBatchId === LEGACY_IMPORT_BATCH_ID;
      const targetBatch = importBatches.find(
        (batch) => batch.id === pendingDeleteBatchId,
      );
      const allImportedRowIds = new Set(
        importBatches.flatMap((batch) => batch.row_ids),
      );
      const removedRowIds = new Set(targetBatch?.row_ids ?? []);
      const nextRows = allRows.filter((row) =>
        isInitial
          ? allImportedRowIds.has(row.id)
          : !removedRowIds.has(row.id),
      );

      const { error } = await supabase.rpc("delete_dataset_import_batch", {
        p_dataset_id: datasetId,
        p_batch_id: isInitial ? null : pendingDeleteBatchId,
        p_delete_initial: isInitial,
      });

      if (error) throw error;

      setAllRows(nextRows);
      if (isInitial) {
        setInitialImport(null);
      } else {
        setImportBatches((current) =>
          current.filter((batch) => batch.id !== pendingDeleteBatchId),
        );
      }
      setSelectedImportBatchIds(null);
      setPendingDeleteBatchId(null);
      setAlertType("success-delete-batch");
    } catch (error) {
      console.error("Failed to delete import batch:", error);
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

  const addChangeCount = useMemo(
    () => getRowsToAdd().length,
    [newRows, columns],
  );

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

  const renderColumnHeaderMenu = (col: ColumnConfig, columnIndex: number) => {
    const options = filterOptions[col.key] ?? [];
    const selectedValues = columnFilters[col.key] ?? options;
    const allSelected =
      options.length > 0 && selectedValues.length === options.length;

    return (
      <div className="relative" data-table-menu-root>
        <div className="flex items-center justify-between lg:hidden">
          <button
            type="button"
            aria-label={`Geser ${col.label} ke kiri`}
            disabled={columnIndex === 0}
            onClick={() => moveVisibleColumn(col.key, -1)}
            className="shrink-0 rounded p-1 hover:bg-sky-200 disabled:opacity-25"
          >
            <LeftChevron className="size-4" />
          </button>
          <button
            type="button"
            onClick={() =>
              setOpenMenu((prev) => (prev === col.key ? null : col.key))
            }
            className="min-w-0 grow rounded py-1 text-center hover:bg-sky-200"
          >
            {col.label}
          </button>
          <button
            type="button"
            aria-label={`Geser ${col.label} ke kanan`}
            disabled={columnIndex === tableColumns.length - 1}
            onClick={() => moveVisibleColumn(col.key, 1)}
            className="shrink-0 rounded p-1 hover:bg-sky-200 disabled:opacity-25"
          >
            <RightChevron className="size-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={() =>
            setOpenMenu((prev) => (prev === col.key ? null : col.key))
          }
          className="relative hidden w-full items-center justify-center gap-2 rounded px-7 py-1 text-left hover:bg-sky-200 lg:flex [&_.text-xs]:hidden"
        >
          <span
            draggable
            aria-label={`Geser kolom ${col.label}`}
            title="Geser kolom"
            onClick={(event) => event.stopPropagation()}
            onDragStart={(event) => {
              event.stopPropagation();
              handleColumnDragStart(event, col.key);
            }}
            onDragEnd={() => {
              setDraggedColumnKey(null);
              setColumnDropTarget(null);
            }}
            className="absolute left-0 cursor-grab rounded p-0.5 active:cursor-grabbing"
          >
            <Draggable className="size-4" />
          </span>
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
            <div className="mb-8 w-full space-y-5">
              <section className="rounded-xl border border-sky-200 bg-sky-50 p-5">
                <h2 className="text-lg font-semibold text-sky-950">
                  Gunakan template dataset
                </h2>
                <p className="mt-2 text-sm leading-6 text-stone-700">
                  Unduh template berikut, isi data tanpa mengubah nama kolom,
                  lalu simpan dan unggah kembali sebagai CSV.
                </p>
                <a
                  href={csvTemplateHref}
                  download={`template-dataset-${datasetId}.csv`}
                  className="mt-4 inline-flex rounded-lg bg-sky-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-2"
                >
                  Unduh Template CSV
                </a>

                <div className="mt-5 overflow-x-auto rounded-lg border border-sky-200 bg-white">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-sky-100 text-sky-950">
                      <tr>
                        <th className="px-3 py-2">Kolom CSV</th>
                        <th className="px-3 py-2">Nama Data</th>
                        <th className="px-3 py-2">Tipe</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200">
                      {importColumns.map((column) => (
                        <tr key={column.key}>
                          <td className="px-3 py-2 font-mono text-xs">
                            {column.key}
                          </td>
                          <td className="px-3 py-2">{column.label}</td>
                          <td className="px-3 py-2">
                            {column.inputType === "number" ? "Angka" : "Teks"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDraggingCsv(true);
                }}
                onDragLeave={(event) => {
                  if (
                    !(event.relatedTarget instanceof Node) ||
                    !event.currentTarget.contains(event.relatedTarget)
                  ) {
                    setIsDraggingCsv(false);
                  }
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setIsDraggingCsv(false);

                  const file = event.dataTransfer.files?.[0];
                  if (file) handleCsvFile(file);
                }}
                onClick={() => csvFileInputRef.current?.click()}
                className={`flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-xl border-4 border-dashed p-6 text-center transition ${
                  isDraggingCsv
                    ? "border-sky-500 bg-sky-50"
                    : "border-stone-300 bg-white hover:border-sky-400 hover:bg-sky-50"
                }`}
              >
                <input
                  ref={csvFileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) handleCsvFile(file);
                    event.target.value = "";
                  }}
                />
                <p className="text-xl font-semibold text-stone-800">
                  Jatuhkan CSV di sini atau klik untuk memilih file
                </p>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-500">
                  Sistem akan memeriksa nama dan jumlah kolom serta memastikan
                  nilai pada kolom angka menggunakan format yang benar.
                </p>
              </div>

              {uploadedCsvName && (
                <p className="text-sm text-stone-600">
                  File dipilih:{" "}
                  <span className="font-semibold">{uploadedCsvName}</span>
                </p>
              )}

              {csvValidationErrors.length > 0 && (
                <section
                  role="alert"
                  className="rounded-xl border border-red-300 bg-red-50 p-5 text-red-900"
                >
                  <h2 className="font-semibold">
                    CSV tidak sesuai dengan struktur dataset
                  </h2>
                  <p className="mt-1 text-sm">
                    Perbaiki masalah berikut, kemudian unggah kembali file CSV.
                  </p>
                  <ul className="mt-3 max-h-72 list-disc space-y-2 overflow-y-auto pl-5 text-sm">
                    {csvValidationErrors.slice(0, 100).map((error, index) => (
                      <li key={`${index}-${error}`}>{error}</li>
                    ))}
                  </ul>
                  {csvValidationErrors.length > 100 && (
                    <p className="mt-3 text-sm font-medium">
                      Ditampilkan 100 dari {csvValidationErrors.length} masalah.
                    </p>
                  )}
                </section>
              )}

              {newRows.length > 0 && csvValidationErrors.length === 0 && (
                <section
                  role="status"
                  className="flex flex-col items-start justify-between gap-4 rounded-xl border border-emerald-300 bg-emerald-50 p-5 text-emerald-900 sm:flex-row sm:items-center"
                >
                  <div>
                    <h2 className="font-semibold">CSV siap ditambahkan</h2>
                    <p className="mt-1 text-sm">
                      {newRows.length} baris lolos pemeriksaan. Pilih Simpan
                      untuk menambahkan data ke dataset ini.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAlertType("confirm-add")}
                    disabled={saving}
                    className="inline-flex shrink-0 items-center justify-center rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
                  >
                    {saving ? "Menyimpan…" : `Simpan (${newRows.length})`}
                  </button>
                </section>
              )}
            </div>
          ) : (
            //! TABLE : NORMAL AND EDIT, UPDATE, DELETE
            <div className="w-full">
              {action === "list" && (
                <div className="mb-4 flex w-full min-w-0 flex-wrap gap-3">
                  <details
                    open={openMenu === "columns"}
                    className="group relative min-w-64 grow text-xs"
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
                                checked={visibleColumnKeys.includes(column.key)}
                                onChange={() => toggleVisibleColumn(column.key)}
                              />
                              <span>{toTitleCase(column.label)}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </details>

                  {importBatchOptions.length > 0 && (
                    <details
                      open={openMenu === "imports"}
                      className="group relative min-w-64 grow text-xs"
                      data-table-menu-root
                    >
                      <summary
                        onClick={(event) => {
                          event.preventDefault();
                          setOpenMenu((prev) =>
                            prev === "imports" ? null : "imports",
                          );
                        }}
                        className="cursor-pointer rounded-sm border border-gray-400 bg-white px-3 py-2 text-xs group-open:border-2 group-open:border-black"
                      >
                        Riwayat Data (
                        {selectedImportBatchIds?.length ??
                          importBatchOptions.length}
                        /{importBatchOptions.length})
                      </summary>

                      {openMenu === "imports" && (
                        <div className="absolute left-0 top-full z-30 mt-1 w-80 max-w-[calc(100vw-2rem)] rounded-md border border-gray-300 bg-white p-3 text-xs text-gray-700 shadow-lg">
                          <div className="mb-2 flex gap-2">
                            {selectedImportBatchIds !== null && (
                              <button
                                type="button"
                                onClick={() => setAllImportBatches(true)}
                                className="rounded border border-gray-300 px-2 py-1 hover:bg-gray-100"
                              >
                                Pilih Semua
                              </button>
                            )}

                            {(selectedImportBatchIds?.length ??
                              importBatchOptions.length) > 0 && (
                              <button
                                type="button"
                                onClick={() => setAllImportBatches(false)}
                                className="rounded border border-gray-300 px-2 py-1 hover:bg-gray-100"
                              >
                                Hapus Semua
                              </button>
                            )}
                          </div>

                          <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                            {importBatchOptions.map((option) => (
                              <div
                                key={option.id}
                                className="flex items-start justify-between gap-2"
                              >
                                <label className="flex min-w-0 grow items-start gap-2">
                                  <input
                                    type="checkbox"
                                    checked={
                                      selectedImportBatchIds === null ||
                                      selectedImportBatchIds.includes(option.id)
                                    }
                                    onChange={() =>
                                      toggleImportBatch(option.id)
                                    }
                                    className="mt-0.5"
                                  />
                                  <span className="min-w-0">
                                    {option.label}
                                    <span className="ml-1 text-gray-500">
                                      ({option.rowCount} baris)
                                    </span>
                                  </span>
                                </label>

                                {canDeleteImportBatch(option.createdBy) && (
                                  <button
                                    type="button"
                                    aria-label={`Hapus riwayat ${option.label}`}
                                    title="Hapus batch dan datanya"
                                    disabled={saving}
                                    onClick={() =>
                                      requestDeleteImportBatch(option.id)
                                    }
                                    className="shrink-0 rounded p-1 text-red-600 hover:bg-red-50 hover:text-red-800 disabled:opacity-50"
                                  >
                                    <Delete className="size-4" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </details>
                  )}
                </div>
              )}

              <div className="relative mb-6 min-h-[60vh] rounded-sm border border-gray-950/20">
                <div className="min-h-[60vh] overflow-x-auto">
                  <table className="min-w-full lg:text-sm md:text-[1.5vw] text-[2vw]">
                    <thead>
                      <tr>
                        {action === "delete" && (
                          <th className="px-0 py-2 border border-gray-400 text-center">
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

                        {tableColumns.map((col, columnIndex) => (
                          <th
                            key={col.key}
                            onDragOver={(event) => {
                              if (action !== "list" || !draggedColumnKey) return;
                              event.preventDefault();
                              const bounds =
                                event.currentTarget.getBoundingClientRect();
                              setColumnDropTarget({
                                key: col.key,
                                position:
                                  event.clientX < bounds.left + bounds.width / 2
                                    ? "before"
                                    : "after",
                              });
                            }}
                            onDrop={(event) =>
                              handleColumnDrop(
                                event,
                                col.key,
                                columnDropTarget?.key === col.key
                                  ? columnDropTarget.position
                                  : "before",
                              )
                            }
                            className={`min-w-44 ${
                              col.color ? col.color : "bg-sky-100"
                            } px-0 py-2 border border-gray-400 whitespace-normal break-words ${
                              draggedColumnKey === col.key
                                ? "lg:opacity-50"
                                : ""
                            } ${
                              columnDropTarget?.key === col.key &&
                              columnDropTarget.position === "before"
                                ? "lg:shadow-[inset_4px_0_0_#0369a1]"
                                : ""
                            } ${
                              columnDropTarget?.key === col.key &&
                              columnDropTarget.position === "after"
                                ? "lg:shadow-[inset_-4px_0_0_#0369a1]"
                                : ""
                            }`}
                          >
                            {action === "list" ? (
                              renderColumnHeaderMenu(col, columnIndex)
                            ) : action === "edit" ? (
                              <div className="flex items-start gap-2 px-2">
                                <div className="flex min-w-32 flex-1 flex-col gap-1">
                                  <input
                                    value={col.label}
                                    onChange={(event) =>
                                      setEditColumns((current) =>
                                        current.map((column) =>
                                          column.key === col.key
                                            ? { ...column, label: event.target.value }
                                            : column,
                                        ),
                                      )
                                    }
                                    className="w-full rounded-md border border-gray-400 bg-white px-2 py-1 text-center font-semibold text-stone-800 focus:border-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-200"
                                    aria-label={`Nama header ${col.label}`}
                                  />
                                  {newColumnKeys.includes(col.key) && (
                                  <div className="grid grid-cols-2 gap-1">
                                    {(["text", "number"] as const).map((type) => (
                                      <button key={type} type="button" onClick={() => setEditColumns((current) => current.map((column) => column.key === col.key ? { ...column, inputType: type } : column))} className={`rounded border px-2 py-1 text-xs font-medium transition ${col.inputType === type ? "border-sky-700 bg-sky-700 text-white" : "border-gray-300 bg-white text-stone-700 hover:bg-sky-50"}`}>
                                        {type === "text" ? "Text" : "Angka"}
                                      </button>
                                    ))}
                                  </div>
                                  )}
                                </div>
                                <button type="button" onClick={() => deleteEditColumn(col.key)} aria-label={`Hapus kolom ${col.label}`} title={`Hapus kolom ${col.label}`} className="shrink-0 rounded-md p-1.5 text-rose-700 transition hover:bg-rose-100">
                                  <Delete className="size-4" />
                                </button>
                              </div>
                            ) : (
                              col.label
                            )}
                          </th>
                        ))}
                        {action === "edit" && (
                          <th className="w-36 min-w-36 border border-gray-400 bg-stone-50 px-2 py-2 align-middle">
                            <button type="button" onClick={addEditColumn} className="w-full rounded-md border border-sky-700 bg-white px-3 py-2 text-sm font-semibold text-sky-800 transition hover:bg-sky-50">+ Tambah Kolom</button>
                          </th>
                        )}
                      </tr>
                    </thead>

                    <tbody>
                      {(action === "edit" ? editDisplayRows : dataset).length > 0 &&
                        tableColumns.length > 0 &&
                        (action === "edit" ? editDisplayRows : dataset).map((row, rowIndex) => (
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
                              const editable = action === "edit";

                              const alignClass =
                                col.align === "right"
                                  ? "text-right"
                                  : col.align === "center"
                                    ? "text-center"
                                    : "text-left";

                              return (
                                <td
                                  key={col.key}
                                  className={`border border-gray-400 px-3 py-2 align-top ${alignClass}`}
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
                                      className={`w-full min-w-32 rounded border border-gray-300 px-2 py-1 text-inherit ${alignClass}`}
                                    />
                                  ) : (
                                    displayValue(value)
                                  )}
                                </td>
                              );
                            })}
                            {action === "edit" && (
                              <td className="border border-gray-400 bg-stone-50 px-2 py-1 text-center">
                                <button type="button" onClick={() => deleteEditRow(row.id)} aria-label={`Hapus baris ${rowIndex + 1}`} title={`Hapus baris ${rowIndex + 1}`} className="rounded-md p-2 text-rose-700 transition hover:bg-rose-100"><Delete className="size-4" /></button>
                              </td>
                            )}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                {action === "edit" && (
                  <div className="border-t border-gray-300 bg-stone-50 p-3">
                    <button type="button" onClick={addEditRow} className="w-full rounded-md border border-sky-700 bg-white px-4 py-2 text-sm font-semibold text-sky-800 transition hover:bg-sky-50">+ Tambah Baris</button>
                    <p className="mt-2 text-center text-xs text-stone-500">Baris atau kolom baru hanya disimpan jika setidaknya satu sel berisi data.</p>
                  </div>
                )}

                {((action === "edit" ? editDisplayRows : dataset).length === 0 || tableColumns.length === 0) && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-gray-500">
                    Tidak ada data.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {action !== "add" && totalRows > pageSize && (
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

      {alertType === "confirm-delete-batch" && (
        <AlertNotif
          type="double"
          msg="Hapus batch riwayat ini beserta seluruh data yang ditambahkan melalui batch tersebut?"
          yesText="Hapus"
          noText="Batal"
          icon="warning"
          loading={saving}
          confirm={handleConfirmDeleteBatch}
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

      {alertType === "success-delete-batch" && (
        <AlertNotif
          type="single"
          msg="Batch riwayat dan datanya telah dihapus"
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

      {alertType === "validation" && (
        <AlertNotif
          type="single"
          msg={validationMessage}
          yesText="OK"
          icon="warning"
          confirm={() => setAlertType("none")}
        />
      )}
    </>
  );
}
