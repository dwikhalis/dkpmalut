import type { ColumnConfig, FilterConfig } from "@/app/components/DatasetTable";

export type SortDirection = "asc" | "desc";
export type ChartType = "bar" | "line" | "pie" | "stacked-bar" | "multiple-bar" | "multiple-line";
export type ChartValueMode = "count_rows" | "sum_column";
export type ChartSortMode = "value-desc" | "value-asc" | "label-asc" | "label-desc";
export type ChartSortField = "value" | "group" | "series";

export type PublishedTableConfig = {
  visibleColumnKeys: string[];
  filterKeys: string[];
  sortKeys: string[];
  sortKey: string;
  sortDirection: SortDirection;
};

export type PublishedChartConfig = {
  type: ChartType;
  categoryKey: string;
  categoryLabel: string;
  seriesKey: string | null;
  seriesLabel: string;
  valueMode: ChartValueMode;
  yKey: string | null;
  countValues: string[] | null;
  valueKey: string | null;
  xLabel: string;
  yLabel: string;
  colors: Record<string, string>;
  sliceColors: Record<string, string>;
  filterKeys: string[];
  sortField: ChartSortField;
  sortMode: ChartSortMode;
  showSortDirectionControl: boolean;
  limit: number;
};

export type PublishedConfig = {
  table: PublishedTableConfig;
  chart: PublishedChartConfig;
  snapshotPath?: string | null;
};

export function parsePublishedConfig(value: unknown): Partial<PublishedConfig> {
  if (!value) return {};

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return typeof parsed === "object" && parsed !== null ? parsed : {};
    } catch {
      return {};
    }
  }

  return typeof value === "object" && value !== null ? value : {};
}

export function createDefaultTableConfig(
  columns: ColumnConfig[],
  filters: FilterConfig[],
): PublishedTableConfig {
  return {
    visibleColumnKeys: columns.map((column) => column.key),
    filterKeys: filters.map((filter) => filter.key),
    sortKeys: columns.map((column) => column.key),
    sortKey: filters[0]?.key ?? columns[0]?.key ?? "",
    sortDirection: "asc",
  };
}

export function createFiltersFromColumns(
  columns: ColumnConfig[],
): FilterConfig[] {
  return columns.map((column) => ({
    key: column.key,
    label: column.label,
    allLabel: `Semua ${column.label}`,
    sort: column.inputType === "number" ? "number-desc" : "text-asc",
  }));
}

export function normalizeTableConfig(
  value: Partial<PublishedTableConfig> | undefined,
  columns: ColumnConfig[],
  filters: FilterConfig[],
): PublishedTableConfig {
  const columnKeys = columns.map((column) => column.key);
  const filterKeys = filters.map((filter) => filter.key);
  const defaultConfig = createDefaultTableConfig(columns, filters);

  const visibleColumnKeys =
    value?.visibleColumnKeys === undefined
      ? defaultConfig.visibleColumnKeys
      : value.visibleColumnKeys.filter((key) => columnKeys.includes(key));

  const selectedFilterKeys = (value?.filterKeys ?? []).filter((key) =>
    filterKeys.includes(key),
  );
  const sortKeys =
    value?.sortKeys === undefined
      ? defaultConfig.sortKeys
      : value.sortKeys.filter((key) => columnKeys.includes(key));

  const sortKey =
    value?.sortKey && columnKeys.includes(value.sortKey)
      ? value.sortKey
      : defaultConfig.sortKey;

  return {
    visibleColumnKeys,
    filterKeys: selectedFilterKeys,
    sortKeys,
    sortKey,
    sortDirection: value?.sortDirection === "desc" ? "desc" : "asc",
  };
}

export function createDefaultChartConfig(
  columns: ColumnConfig[],
  tableConfig: PublishedTableConfig,
): PublishedChartConfig {
  const visibleColumns = columns.filter((column) =>
    tableConfig.visibleColumnKeys.includes(column.key),
  );
  const categoryColumns = visibleColumns.filter(
    (column) => column.inputType !== "number",
  );
  const numericColumns = visibleColumns.filter(
    (column) => column.inputType === "number",
  );

  return {
    type: "bar",
    categoryKey: categoryColumns[0]?.key ?? visibleColumns[0]?.key ?? "",
    categoryLabel: categoryColumns[0]?.label ?? visibleColumns[0]?.label ?? "Kelompok",
    seriesKey: categoryColumns[1]?.key ?? null,
    seriesLabel: categoryColumns[1]?.label ?? "Pembanding",
    valueMode: "count_rows",
    yKey: categoryColumns[0]?.key ?? visibleColumns[0]?.key ?? null,
    countValues: null,
    valueKey: numericColumns[0]?.key ?? null,
    xLabel: categoryColumns[0]?.label ?? visibleColumns[0]?.label ?? "",
    yLabel: "Jumlah Data",
    colors: {},
    sliceColors: {},
    filterKeys: tableConfig.filterKeys,
    sortField: "value",
    sortMode: "value-desc",
    showSortDirectionControl: false,
    limit: 20,
  };
}

export function normalizeChartConfig(
  value: Partial<PublishedChartConfig> | undefined,
  columns: ColumnConfig[],
  tableConfig: PublishedTableConfig,
): PublishedChartConfig {
  const defaultConfig = createDefaultChartConfig(columns, tableConfig);
  const visibleColumnKeys = new Set(tableConfig.visibleColumnKeys);
  const availableColumns = columns.filter((column) =>
    visibleColumnKeys.has(column.key),
  );
  const availableColumnKeys = availableColumns.map((column) => column.key);
  const numericKeys = availableColumns
    .filter((column) => column.inputType === "number")
    .map((column) => column.key);
  const tableFilterKeys = new Set(tableConfig.filterKeys);

  const valueMode =
    value?.valueMode === "sum_column" ? "sum_column" : "count_rows";
  const yKey =
    value?.yKey && availableColumnKeys.includes(value.yKey)
      ? value.yKey
      : defaultConfig.yKey;

  const categoryKey =
    value?.categoryKey && availableColumnKeys.includes(value.categoryKey)
      ? value.categoryKey
      : defaultConfig.categoryKey;
  const categoryColumn = availableColumns.find(
    (column) => column.key === categoryKey,
  );

  const seriesKey =
    value?.seriesKey && availableColumnKeys.includes(value.seriesKey)
      ? value.seriesKey
      : defaultConfig.seriesKey;
  const seriesColumn = availableColumns.find(
    (column) => column.key === seriesKey,
  );

  const valueKey =
    valueMode === "sum_column" &&
    value?.valueKey &&
    numericKeys.includes(value.valueKey)
      ? value.valueKey
      : valueMode === "sum_column"
        ? defaultConfig.valueKey
        : null;
  const countValues = Array.isArray(value?.countValues)
    ? value.countValues.map((item) => String(item))
    : null;

  const sortMode: ChartSortMode =
    value?.sortMode === "value-asc" ||
    value?.sortMode === "label-asc" ||
    value?.sortMode === "label-desc"
      ? value.sortMode
      : "value-desc";
  const sortField: ChartSortField =
    value?.sortField === "group" || value?.sortField === "series"
      ? value.sortField
      : "value";

  const limit = Number(value?.limit);
  const chartType: ChartType =
    value?.type === "line" ||
    value?.type === "pie" ||
    value?.type === "stacked-bar" ||
    value?.type === "multiple-bar" ||
    value?.type === "multiple-line"
      ? value.type
      : "bar";

  return {
    type: chartType,
    categoryKey,
    categoryLabel:
      typeof value?.categoryLabel === "string" && value.categoryLabel.trim()
        ? value.categoryLabel
        : typeof value?.xLabel === "string" && value.xLabel.trim()
          ? value.xLabel
          : categoryColumn?.label ?? defaultConfig.categoryLabel,
    seriesKey,
    seriesLabel:
      typeof value?.seriesLabel === "string" && value.seriesLabel.trim()
        ? value.seriesLabel
        : seriesColumn?.label ?? defaultConfig.seriesLabel,
    valueMode,
    yKey,
    countValues,
    valueKey,
    xLabel: value?.xLabel ?? defaultConfig.xLabel,
    yLabel:
      value?.yLabel ??
      (valueMode === "count_rows"
        ? "Jumlah Data"
        : availableColumns.find((column) => column.key === valueKey)?.label ??
          defaultConfig.yLabel),
    colors:
      value?.colors && typeof value.colors === "object" ? value.colors : {},
    sliceColors:
      value?.sliceColors && typeof value.sliceColors === "object"
        ? value.sliceColors
        : {},
    filterKeys: (value?.filterKeys ?? defaultConfig.filterKeys).filter((key) =>
      tableFilterKeys.has(key),
    ),
    sortField,
    sortMode,
    showSortDirectionControl: Boolean(value?.showSortDirectionControl),
    limit: Number.isFinite(limit) && limit >= 0 ? limit : defaultConfig.limit,
  };
}

export function mergePublishedConfig(
  current: unknown,
  next: Partial<PublishedConfig>,
): PublishedConfig {
  const parsed = parsePublishedConfig(current);

  return {
    ...parsed,
    ...next,
    table: {
      ...(parsed.table ?? {}),
      ...(next.table ?? {}),
    } as PublishedTableConfig,
    chart: {
      ...(parsed.chart ?? {}),
      ...(next.chart ?? {}),
    } as PublishedChartConfig,
  };
}
