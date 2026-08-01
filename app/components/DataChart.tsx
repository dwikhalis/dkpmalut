"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Chart as ChartJS } from "chart.js";
import { supabase } from "@/lib/supabase/supabaseClient";
import {
  DownChevron,
  LeftChevron,
  RightChevron,
} from "@/public/icons/iconSets";
import AccordionToggleIcon from "./AccordionToggleIcon";
import {
  createDefaultTableConfig,
  normalizeTableConfig,
  normalizeChartConfig,
  type ChartSortField,
  type ChartSortMode,
  type ChartValueMode,
  type PublishedChartConfig,
  type PublishedTableConfig,
} from "@/lib/utils/publishedConfig";
import { BarCharts, LineCharts, PieCharts } from "./Charts";
import Button from "./Button";
import SpinnerLoading from "./SpinnerLoading";
import type { ColumnConfig, FilterConfig } from "./DatasetTable";

type DatasetValue = string | number | boolean | null | undefined;

type DatasetRow = {
  id?: string;
  [key: string]: DatasetValue;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseRows(value: unknown): DatasetRow[] {
  if (!value) return [];

  let parsed = value;

  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      return [];
    }
  }

  if (Array.isArray(parsed)) {
    return parsed.filter(isRecord) as DatasetRow[];
  }

  // Optional fallback if your JSON is shaped like: { rows: [...] }
  if (isRecord(parsed) && Array.isArray(parsed.rows)) {
    return parsed.rows.filter(isRecord) as DatasetRow[];
  }

  // Optional fallback if your JSON is shaped like: { data: [...] }
  if (isRecord(parsed) && Array.isArray(parsed.data)) {
    return parsed.data.filter(isRecord) as DatasetRow[];
  }

  return [];
}

function toNumber(value: DatasetValue) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  if (typeof value === "string") {
    const cleaned = value.replace(/,/g, "").trim();
    const numberValue = Number(cleaned);

    return Number.isFinite(numberValue) ? numberValue : 0;
  }

  return 0;
}

function formatHistogramBoundary(value: number) {
  return value.toLocaleString("id-ID", {
    maximumFractionDigits: 2,
  });
}

function formatTableValue(value: string | number | undefined) {
  if (typeof value === "number") {
    return value.toLocaleString("id-ID", {
      maximumFractionDigits: 2,
    });
  }

  return String(value ?? "N/A");
}

function countChangedKeys(
  current: Record<string, unknown>,
  original: Record<string, unknown>,
) {
  return Array.from(
    new Set([...Object.keys(current), ...Object.keys(original)]),
  ).filter(
    (key) => JSON.stringify(current[key]) !== JSON.stringify(original[key]),
  ).length;
}

function withChangeCount(label: string, count: number) {
  return `${label} (${count})`;
}

function toChartLabel(value: DatasetValue) {
  return value === null || value === undefined || value === ""
    ? "N/A"
    : String(value);
}

function toTitleCase(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\w\S*/g, (word) => {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    });
}

function isMultiSeriesChart(type: PublishedChartConfig["type"]) {
  return (
    type === "multiple-bar" ||
    type === "stacked-bar" ||
    type === "multiple-line"
  );
}

function colorKey(value: string) {
  return value || "default";
}

function getSortDirection(sortMode: ChartSortMode) {
  return sortMode.endsWith("asc") ? "asc" : "desc";
}

function compareByDirection(a: number, b: number, direction: "asc" | "desc") {
  return direction === "asc" ? a - b : b - a;
}

function compareTextByDirection(
  a: string,
  b: string,
  direction: "asc" | "desc",
) {
  return direction === "asc" ? a.localeCompare(b) : b.localeCompare(a);
}

const COLOR_PICKER_FALLBACKS = [
  "#36a2eb",
  "#ff6384",
  "#4bc0c0",
  "#ff9f40",
  "#9966ff",
  "#ffcd56",
  "#36eba2",
  "#c9cbcf",
];

const VALUE_SORT_KEY = "__value__";

function FieldLabel({
  label,
  technical,
  help,
  helpKey,
  openHelpKey,
  onToggleHelp,
}: {
  label: string;
  technical: string;
  help: string;
  helpKey: string;
  openHelpKey: string | null;
  onToggleHelp: (key: string) => void;
}) {
  const isOpen = openHelpKey === helpKey;
  const [isHovered, setIsHovered] = useState(false);
  const showHelp = isOpen || isHovered;

  return (
    <div className="relative">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="block font-semibold text-gray-700">{label}</span>
          <span className="block text-[11px] text-gray-400">{technical}</span>
        </div>

        <span
          role="button"
          tabIndex={0}
          data-chart-help-trigger="true"
          aria-label={`Info ${label}`}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onToggleHelp(helpKey);
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") return;

            event.preventDefault();
            event.stopPropagation();
            onToggleHelp(helpKey);
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="relative flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-full border border-sky-800 bg-sky-800 text-[11px] font-bold text-white hover:bg-sky-700"
        >
          i
        </span>
      </div>

      {showHelp && (
        <div
          data-chart-help-popup="true"
          className="absolute right-0 top-7 z-50 w-56 rounded-md border border-gray-200 bg-white p-2 text-[11px] leading-relaxed text-gray-600 shadow-lg"
        >
          {help}
        </div>
      )}
    </div>
  );
}

export default function DataChart({
  datasetId,
  columns,
  filters = [],
  tableConfig,
  chartConfig,
  saving = false,
  onBack,
  onSave,
  readOnly = false,
  externalSelectedFilters,
  externalSortBy,
  onExternalFilterChange,
  onExternalSortChange,
  isLoggedIn = true,
  onLoginRequired,
  onReadOnlyCsvDataChange,
  saveButtonLabel = "Simpan Visualisasi",
  showSaveChangeCount = true,
  previewOnly = false,
}: {
  datasetId: string;
  columns: ColumnConfig[];
  filters?: FilterConfig[];
  tableConfig?: PublishedTableConfig;
  chartConfig?: Partial<PublishedChartConfig>;
  saving?: boolean;
  onBack?: () => void;
  onSave?: (
    config: PublishedChartConfig,
    snapshotDataUrl: string | null,
    tableConfig: PublishedTableConfig,
  ) => void;
  readOnly?: boolean;
  externalSelectedFilters?: Record<string, string>;
  externalSortBy?: string;
  onExternalFilterChange?: (key: string, value: string) => void;
  onExternalSortChange?: (value: string) => void;
  isLoggedIn?: boolean;
  onLoginRequired?: () => void;
  onReadOnlyCsvDataChange?: (data: {
    headers: string[];
    rows: Array<Array<string | number>>;
  }) => void;
  saveButtonLabel?: string;
  showSaveChangeCount?: boolean;
  previewOnly?: boolean;
}) {
  const barChartRef = useRef<ChartJS<"bar"> | undefined>(undefined);
  const lineChartRef = useRef<ChartJS<"line"> | undefined>(undefined);
  const pieChartRef = useRef<ChartJS<"pie"> | undefined>(undefined);
  const seriesSettingsRef = useRef<HTMLParagraphElement | null>(null);
  const seriesHighlightTimerRef = useRef<number | null>(null);
  const smartDefaultsDatasetRef = useRef<string | null>(null);
  const [rows, setRows] = useState<DatasetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const normalizedTableConfig = useMemo(
    () => tableConfig ?? createDefaultTableConfig(columns, filters),
    [columns, filters, tableConfig],
  );
  const [draftTableConfig, setDraftTableConfig] =
    useState<PublishedTableConfig>(normalizedTableConfig);
  const [showDataConfig, setShowDataConfig] = useState(true);
  const [showChartConfig, setShowChartConfig] = useState(false);
  const [showGraphConfig, setShowGraphConfig] = useState(false);

  const visibleColumns = useMemo(
    () =>
      columns.filter((column) =>
        draftTableConfig.visibleColumnKeys.includes(column.key),
      ),
    [columns, draftTableConfig.visibleColumnKeys],
  );

  const initialChartConfig = useMemo(
    () => normalizeChartConfig(chartConfig, columns, normalizedTableConfig),
    [chartConfig, columns, normalizedTableConfig],
  );
  const hasSavedChartConfig = Boolean(
    chartConfig && Object.keys(chartConfig).length > 0,
  );

  const [draftChartConfig, setDraftChartConfig] =
    useState<PublishedChartConfig>(initialChartConfig);
  const [previewFilters, setPreviewFilters] = useState<Record<string, string>>(
    {},
  );
  const [previewSortKey, setPreviewSortKey] = useState("");
  const [previewSortMode, setPreviewSortMode] = useState<ChartSortMode | "">(
    "",
  );
  const [readOnlyTablePage, setReadOnlyTablePage] = useState(0);
  const [openHelpKey, setOpenHelpKey] = useState<string | null>(null);
  const [openDropdownKey, setOpenDropdownKey] = useState<string | null>(null);
  const [openTableHeaderMenu, setOpenTableHeaderMenu] = useState<string | null>(
    null,
  );
  const [tableHeaderMenuPosition, setTableHeaderMenuPosition] = useState({
    left: 0,
    top: 0,
  });
  const [tableColumnFilters, setTableColumnFilters] = useState<
    Record<string, string[]>
  >({});
  const [highlightSeriesSettings, setHighlightSeriesSettings] = useState(false);

  const toggleConfigSection = (
    section: "data" | "chart" | "graph",
    trigger: HTMLButtonElement,
  ) => {
    const willOpen =
      section === "data"
        ? !showDataConfig
        : section === "chart"
          ? !showChartConfig
          : !showGraphConfig;

    if (section === "data") {
      setShowDataConfig((prev) => !prev);
    } else if (section === "chart") {
      setShowChartConfig((prev) => !prev);
    } else {
      setShowGraphConfig((prev) => !prev);
    }

    if (willOpen && window.innerWidth < 1024) {
      window.setTimeout(
        () => trigger.scrollIntoView({ behavior: "smooth", block: "start" }),
        100,
      );
    }
  };

  const openSeriesSettings = () => {
    setShowChartConfig(true);
    setHighlightSeriesSettings(true);

    if (seriesHighlightTimerRef.current !== null) {
      window.clearTimeout(seriesHighlightTimerRef.current);
    }

    seriesHighlightTimerRef.current = window.setTimeout(() => {
      setHighlightSeriesSettings(false);
      seriesHighlightTimerRef.current = null;
    }, 1400);

    window.setTimeout(() => {
      seriesSettingsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 100);
  };

  useEffect(() => {
    return () => {
      if (seriesHighlightTimerRef.current !== null) {
        window.clearTimeout(seriesHighlightTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchRows = async () => {
      try {
        setLoading(true);
        setErr(null);

        if (!datasetId) {
          setRows([]);
          return;
        }

        const { data, error } = await supabase
          .from("datasets")
          .select("data")
          .eq("id", datasetId)
          .maybeSingle();

        if (error) throw error;

        if (!cancelled) {
          setRows(parseRows(data?.data));
        }
      } catch (error) {
        console.error("Failed to fetch dataset chart data:", error);

        if (!cancelled) {
          setErr("Gagal memuat data grafik.");
          setRows([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchRows();

    return () => {
      cancelled = true;
    };
  }, [datasetId]);

  const categoryColumns = useMemo(
    () => visibleColumns.filter((column) => column.inputType !== "number"),
    [visibleColumns],
  );

  const numericColumns = useMemo(
    () => visibleColumns.filter((column) => column.inputType === "number"),
    [visibleColumns],
  );

  const suggestChartConfig = useCallback(
    (
      type: PublishedChartConfig["type"],
      current: PublishedChartConfig,
    ): PublishedChartConfig => {
      const valueCount = (key: string) =>
        new Set(
          rows
            .map((row) => row[key])
            .filter(
              (value) =>
                value !== null && value !== undefined && value !== "",
            )
            .map(String),
        ).size;
      const isTimeColumn = (column: ColumnConfig) =>
        /tahun|year|tanggal|date|bulan|month|waktu|time/i.test(
          `${column.key} ${column.label}`,
        );
      const measureScore = (column: ColumnConfig) => {
        const name = `${column.key} ${column.label}`;

        return (
          (/jumlah|total|nilai|value|produksi|cpue|luas|berat|volume|harga|pendapatan/i.test(
            name,
          )
            ? 10
            : 0) -
          (isTimeColumn(column) ? 20 : 0) +
          Math.min(valueCount(column.key), 20) / 20
        );
      };
      const orderedColumns = visibleColumns.filter(
        (column) => isTimeColumn(column) || column.inputType === "number",
      );
      const categoricalColumns = visibleColumns
        .filter((column) => column.inputType !== "number")
        .filter((column) => valueCount(column.key) >= 2)
        .sort((a, b) => {
          const aCount = valueCount(a.key);
          const bCount = valueCount(b.key);
          const aPreferred = aCount <= 20 ? 0 : 1;
          const bPreferred = bCount <= 20 ? 0 : 1;

          return aPreferred - bPreferred || aCount - bCount;
        });
      const measures = visibleColumns
        .filter((column) => column.inputType === "number")
        .sort((a, b) => measureScore(b) - measureScore(a));

      const categoryColumn =
        type === "histogram"
          ? measures[0]
          : type === "line" || type === "multiple-line"
            ? (orderedColumns.find(isTimeColumn) ??
              categoricalColumns[0] ??
              orderedColumns[0] ??
              visibleColumns[0])
            : (categoricalColumns[0] ??
              orderedColumns.find(isTimeColumn) ??
              visibleColumns[0]);
      const valueColumn = measures.find(
        (column) => column.key !== categoryColumn?.key,
      );
      const seriesColumn =
        type === "multiple-bar" ||
        type === "stacked-bar" ||
        type === "multiple-line"
          ? categoricalColumns.find(
              (column) =>
                column.key !== categoryColumn?.key &&
                valueCount(column.key) <= 12,
            )
          : undefined;
      const usesNumericValue = type !== "histogram" && Boolean(valueColumn);
      const valueMode: ChartValueMode = usesNumericValue
        ? type === "line" || type === "multiple-line"
          ? "show_value"
          : "sum_column"
        : "count_rows";
      const sortField: ChartSortField =
        type === "histogram" ||
        type === "line" ||
        type === "multiple-line"
          ? "group"
          : "value";
      const sortMode: ChartSortMode =
        sortField === "group" ? "label-asc" : "value-desc";

      return normalizeChartConfig(
        {
          ...current,
          type,
          categoryKey: categoryColumn?.key ?? current.categoryKey,
          categoryLabel: categoryColumn?.label ?? current.categoryLabel,
          xLabel: categoryColumn?.label ?? current.xLabel,
          seriesKey: seriesColumn?.key ?? null,
          seriesLabel: seriesColumn?.label ?? current.seriesLabel,
          valueMode,
          yKey:
            valueMode === "count_rows"
              ? (categoryColumn?.key ?? current.yKey)
              : (valueColumn?.key ?? null),
          valueKey: usesNumericValue ? (valueColumn?.key ?? null) : null,
          countValues: null,
          yLabel: usesNumericValue
            ? valueMode === "sum_column"
              ? `Total ${valueColumn?.label ?? "Nilai"}`
              : (valueColumn?.label ?? "Nilai")
            : "Jumlah Data",
          sortField,
          sortMode,
        },
        columns,
        draftTableConfig,
      );
    },
    [columns, draftTableConfig, rows, visibleColumns],
  );

  const defaultSortColumns = useMemo(() => {
    const keys = (
      draftChartConfig.type === "histogram"
        ? [draftChartConfig.categoryKey]
        : [
            draftChartConfig.categoryKey,
            draftChartConfig.type === "pie"
              ? null
              : draftChartConfig.seriesKey,
            draftChartConfig.valueMode === "count_rows"
              ? draftChartConfig.yKey
              : draftChartConfig.valueKey,
          ]
    ).filter((key): key is string => Boolean(key));

    return visibleColumns.filter((column) => keys.includes(column.key));
  }, [
    draftChartConfig.categoryKey,
    draftChartConfig.seriesKey,
    draftChartConfig.type,
    draftChartConfig.valueKey,
    draftChartConfig.valueMode,
    draftChartConfig.yKey,
    visibleColumns,
  ]);

  useEffect(() => {
    setDraftTableConfig(normalizedTableConfig);
  }, [normalizedTableConfig]);

  useEffect(() => {
    setDraftChartConfig(initialChartConfig);
    setPreviewFilters({});
    setPreviewSortKey(normalizedTableConfig.sortKey);
    setPreviewSortMode("");
  }, [initialChartConfig, normalizedTableConfig.sortKey]);

  useEffect(() => {
    if (
      rows.length === 0 ||
      smartDefaultsDatasetRef.current === datasetId
    ) {
      return;
    }

    smartDefaultsDatasetRef.current = datasetId;

    if (hasSavedChartConfig) return;

    const suggested = suggestChartConfig(
      draftChartConfig.type,
      draftChartConfig,
    );

    setDraftChartConfig(suggested);
    setDraftTableConfig((prev) => ({
      ...prev,
      sortKey: suggested.categoryKey,
      sortDirection: suggested.sortMode.endsWith("asc") ? "asc" : "desc",
    }));
    setPreviewSortKey(suggested.categoryKey);
    setPreviewSortMode(suggested.sortMode);
  }, [
    datasetId,
    draftChartConfig,
    hasSavedChartConfig,
    rows.length,
    suggestChartConfig,
  ]);

  useEffect(() => {
    if (
      defaultSortColumns.length === 0 ||
      defaultSortColumns.some(
        (column) => column.key === draftTableConfig.sortKey,
      )
    ) {
      return;
    }

    const sortKey = defaultSortColumns[0].key;
    const sortMode: ChartSortMode =
      draftTableConfig.sortDirection === "asc" ? "label-asc" : "label-desc";

    setDraftTableConfig((prev) => ({ ...prev, sortKey }));
    setDraftChartConfig((prev) => ({
      ...prev,
      sortField: "group",
      sortMode,
    }));
    setPreviewSortKey(sortKey);
    setPreviewSortMode(sortMode);
  }, [
    defaultSortColumns,
    draftTableConfig.sortDirection,
    draftTableConfig.sortKey,
  ]);

  const visualizationChangeCount = useMemo(() => {
    return (
      countChangedKeys(
        draftTableConfig as unknown as Record<string, unknown>,
        normalizedTableConfig as unknown as Record<string, unknown>,
      ) +
      countChangedKeys(
        draftChartConfig as unknown as Record<string, unknown>,
        initialChartConfig as unknown as Record<string, unknown>,
      )
    );
  }, [
    draftChartConfig,
    draftTableConfig,
    initialChartConfig,
    normalizedTableConfig,
  ]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;

      if (!target?.closest("[data-chart-dropdown='true']")) {
        setOpenDropdownKey(null);
      }

      if (!target?.closest("[data-chart-table-menu='true']")) {
        setOpenTableHeaderMenu(null);
      }

      if (
        !target?.closest("[data-chart-help-trigger='true']") &&
        !target?.closest("[data-chart-help-popup='true']")
      ) {
        setOpenHelpKey(null);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  const chartFilters = useMemo(
    () =>
      filters
        .filter((filter) => draftTableConfig.filterKeys.includes(filter.key))
        .map((filter) => {
          const label =
            filter.key === draftChartConfig.categoryKey
              ? draftChartConfig.categoryLabel.trim()
              : filter.key === draftChartConfig.seriesKey
                ? draftChartConfig.seriesLabel.trim()
                : "";

          if (!label) return filter;

          return {
            ...filter,
            label,
            allLabel: `Semua ${label}`,
          };
        }),
    [
      filters,
      draftChartConfig.categoryKey,
      draftChartConfig.categoryLabel,
      draftChartConfig.seriesKey,
      draftChartConfig.seriesLabel,
      draftTableConfig.filterKeys,
    ],
  );

  const filterOptions = useMemo(() => {
    const options: Record<string, string[]> = {};

    chartFilters.forEach((filter) => {
      const values = Array.from(
        new Set(
          rows
            .map((row) => row[filter.key])
            .filter(
              (value) => value !== null && value !== undefined && value !== "",
            )
            .map((value) => String(value)),
        ),
      ).sort((a, b) => a.localeCompare(b));

      options[filter.key] = values;
    });

    return options;
  }, [chartFilters, rows]);

  const countValueOptions = useMemo(() => {
    if (!draftChartConfig.yKey) return [];

    return Array.from(
      new Set(
        rows
          .map((row) => row[draftChartConfig.yKey ?? ""])
          .filter(
            (value) => value !== null && value !== undefined && value !== "",
          )
          .map((value) => String(value)),
      ),
    ).sort((a, b) => a.localeCompare(b));
  }, [draftChartConfig.yKey, rows]);

  const selectedCountValues = useMemo(() => {
    if (draftChartConfig.valueMode !== "count_rows") return [];
    if (draftChartConfig.countValues === null) return countValueOptions;

    return draftChartConfig.countValues.filter((value) =>
      countValueOptions.includes(value),
    );
  }, [
    countValueOptions,
    draftChartConfig.countValues,
    draftChartConfig.valueMode,
  ]);

  const chartSuitabilityWarning = useMemo(() => {
    const categoryColumn = columns.find(
      (column) => column.key === draftChartConfig.categoryKey,
    );
    const categoryValues = rows
      .map((row) => row[draftChartConfig.categoryKey])
      .filter(
        (value) => value !== null && value !== undefined && value !== "",
      );
    const distinctCategoryCount = new Set(
      categoryValues.map((value) => String(value)),
    ).size;

    if (draftChartConfig.type === "histogram") {
      if (categoryColumn?.inputType !== "number") {
        return "Histogram membutuhkan kolom numerik.";
      }

      const numericValues = categoryValues
        .map((value) => Number(String(value).replace(/,/g, "")))
        .filter(Number.isFinite);
      const distinctNumericCount = new Set(numericValues).size;

      if (numericValues.length < 5) {
        return "Histogram kurang informatif karena tersedia kurang dari 5 nilai numerik.";
      }

      if (distinctNumericCount < 2) {
        return "Histogram tidak cocok karena semua nilai numerik sama.";
      }

      if (distinctNumericCount <= 3) {
        return "Histogram mungkin kurang cocok karena variasi nilai numeriknya sangat sedikit.";
      }

      return "";
    }

    if (draftChartConfig.type === "pie") {
      if (distinctCategoryCount > 10) {
        return `Pie kurang mudah dibaca karena memiliki ${distinctCategoryCount} kategori. Pertimbangkan Bar atau batasi data.`;
      }

      if (distinctCategoryCount < 2) {
        return "Pie membutuhkan setidaknya 2 kategori untuk menunjukkan perbandingan.";
      }

      if (
        draftChartConfig.valueMode !== "count_rows" &&
        draftChartConfig.valueKey &&
        rows.some(
          (row) => toNumber(row[draftChartConfig.valueKey ?? ""]) < 0,
        )
      ) {
        return "Pie tidak cocok untuk nilai negatif. Gunakan Bar atau Line.";
      }

      return "";
    }

    if (
      draftChartConfig.type === "line" ||
      draftChartConfig.type === "multiple-line"
    ) {
      const looksOrdered =
        categoryColumn?.inputType === "number" ||
        /tahun|year|tanggal|date|bulan|month|waktu|time/i.test(
          `${categoryColumn?.key ?? ""} ${categoryColumn?.label ?? ""}`,
        );

      if (!looksOrdered) {
        return "Line paling cocok untuk data berurutan seperti tahun, tanggal, bulan, waktu, atau angka.";
      }
    }

    if (
      (draftChartConfig.type === "multiple-bar" ||
        draftChartConfig.type === "stacked-bar" ||
        draftChartConfig.type === "multiple-line") &&
      !draftChartConfig.seriesKey
    ) {
      return "Jenis grafik ini membutuhkan Pembanding agar dapat menampilkan beberapa seri.";
    }

    if (
      (draftChartConfig.type === "bar" ||
        draftChartConfig.type === "multiple-bar" ||
        draftChartConfig.type === "stacked-bar") &&
      distinctCategoryCount > 50
    ) {
      return `Grafik dapat sulit dibaca karena memiliki ${distinctCategoryCount} kategori. Pertimbangkan membatasi data atau menggunakan filter.`;
    }

    return "";
  }, [
    columns,
    draftChartConfig.categoryKey,
    draftChartConfig.seriesKey,
    draftChartConfig.type,
    draftChartConfig.valueKey,
    draftChartConfig.valueMode,
    rows,
  ]);

  const filteredRows = useMemo(() => {
    const activeFilters = externalSelectedFilters ?? previewFilters;

    return rows.filter((row) => {
      return Object.entries(activeFilters).every(([key, value]) => {
        if (!value || value === "all") return true;

        return String(row[key]) === value;
      });
    });
  }, [rows, externalSelectedFilters, previewFilters]);

  const activeSortKey =
    externalSortBy ?? previewSortKey ?? draftTableConfig.sortKey;
  const activeSortField: ChartSortField =
    activeSortKey === VALUE_SORT_KEY
      ? "value"
      : activeSortKey && activeSortKey === draftChartConfig.seriesKey
        ? "series"
        : activeSortKey && activeSortKey === draftChartConfig.categoryKey
          ? "group"
          : "value";

  const chartResult = useMemo(() => {
    const activeSortMode = previewSortMode || draftChartConfig.sortMode;
    const sortDirection = getSortDirection(activeSortMode);

    if (
      visibleColumns.length === 0 ||
      !visibleColumns.some(
        (column) => column.key === draftChartConfig.categoryKey,
      )
    ) {
      return {
        labels: [],
        datasets: [],
      };
    }

    if (draftChartConfig.type === "histogram") {
      const values = filteredRows
        .map((row) => {
          const rawValue = row[draftChartConfig.categoryKey];
          const normalized =
            typeof rawValue === "string"
              ? rawValue.replace(/,/g, "").trim()
              : rawValue;
          const value = Number(normalized);

          return Number.isFinite(value) ? value : null;
        })
        .filter((value): value is number => value !== null);

      if (values.length === 0) return { labels: [], datasets: [] };

      const minimum = Math.min(...values);
      const maximum = Math.max(...values);
      const requestedBins = Math.max(2, draftChartConfig.histogramBins);
      const binCount = minimum === maximum ? 1 : requestedBins;
      const binWidth = binCount === 1 ? 1 : (maximum - minimum) / binCount;
      const counts = Array.from({ length: binCount }, () => 0);

      values.forEach((value) => {
        const index =
          binCount === 1
            ? 0
            : Math.min(Math.floor((value - minimum) / binWidth), binCount - 1);

        counts[index] += 1;
      });

      const labels = counts.map((_, index) => {
        if (binCount === 1) return formatHistogramBoundary(minimum);

        const start = minimum + index * binWidth;
        const end = minimum + (index + 1) * binWidth;

        return `${formatHistogramBoundary(start)}–${formatHistogramBoundary(end)}`;
      });

      return {
        labels,
        datasets: [
          {
            label: "Frekuensi",
            backgroundColor:
              draftChartConfig.colors[colorKey("Frekuensi")],
            borderColor: draftChartConfig.colors[colorKey("Frekuensi")],
            values: counts,
          },
        ],
      };
    }

    if (
      draftChartConfig.valueMode === "count_rows" &&
      draftChartConfig.yKey === draftChartConfig.categoryKey
    ) {
      const grouped = new Map<string, number>();

      filteredRows.forEach((row) => {
        const label = toChartLabel(row[draftChartConfig.categoryKey]);
        const countedValue = toChartLabel(row[draftChartConfig.yKey ?? ""]);

        if (!selectedCountValues.includes(countedValue)) return;

        grouped.set(label, (grouped.get(label) ?? 0) + 1);
      });

      const sorted = Array.from(grouped.entries()).sort((a, b) => {
        if (
          activeSortField === "group" &&
          (activeSortMode === "label-asc" || activeSortMode === "label-desc")
        ) {
          return compareTextByDirection(a[0], b[0], sortDirection);
        }

        return compareByDirection(a[1], b[1], sortDirection);
      });

      const maxItems = Number(draftChartConfig.limit);
      const finalRows =
        Number.isFinite(maxItems) && maxItems > 0
          ? sorted.slice(0, maxItems)
          : sorted;

      return {
        labels: finalRows.map(([label]) => label),
        datasets: [
          {
            label: "Jumlah",
            backgroundColor: draftChartConfig.colors[colorKey("Jumlah")],
            borderColor: draftChartConfig.colors[colorKey("Jumlah")],
            values: finalRows.map(([, value]) => value),
          },
        ],
      };
    }

    const multiSeries =
      isMultiSeriesChart(draftChartConfig.type) &&
      Boolean(draftChartConfig.seriesKey) &&
      draftChartConfig.yKey !== draftChartConfig.categoryKey;

    if (multiSeries && draftChartConfig.seriesKey) {
      const grouped = new Map<string, Map<string, number>>();
      const seriesLabels = new Set<string>();

      filteredRows.forEach((row) => {
        if (draftChartConfig.valueMode === "count_rows") {
          const countedValue = toChartLabel(row[draftChartConfig.yKey ?? ""]);

          if (!selectedCountValues.includes(countedValue)) return;
        }

        const label = toChartLabel(row[draftChartConfig.categoryKey]);
        const seriesLabel = toChartLabel(row[draftChartConfig.seriesKey ?? ""]);
        const nextValue =
          draftChartConfig.valueMode === "count_rows"
            ? 1
            : toNumber(row[draftChartConfig.valueKey ?? ""]);

        seriesLabels.add(seriesLabel);

        const currentSeriesMap =
          grouped.get(label) ?? new Map<string, number>();
        currentSeriesMap.set(
          seriesLabel,
          draftChartConfig.valueMode === "show_value"
            ? nextValue
            : (currentSeriesMap.get(seriesLabel) ?? 0) + nextValue,
        );
        grouped.set(label, currentSeriesMap);
      });

      const labelTotals = Array.from(grouped.entries()).map(
        ([label, seriesMap]) => ({
          label,
          total: Array.from(seriesMap.values()).reduce(
            (sum, value) => sum + value,
            0,
          ),
        }),
      );

      const sortedLabels = labelTotals.sort((a, b) => {
        if (
          activeSortField === "group" &&
          (activeSortMode === "label-asc" || activeSortMode === "label-desc")
        ) {
          return compareTextByDirection(a.label, b.label, sortDirection);
        }

        return compareByDirection(a.total, b.total, sortDirection);
      });

      const maxItems = Number(draftChartConfig.limit);
      const finalLabels =
        Number.isFinite(maxItems) && maxItems > 0
          ? sortedLabels.slice(0, maxItems)
          : sortedLabels;
      const labels = finalLabels.map((item) => item.label);
      const orderedSeriesLabels = Array.from(seriesLabels).sort((a, b) => {
        if (
          activeSortField === "series" &&
          (activeSortMode === "label-asc" || activeSortMode === "label-desc")
        ) {
          return compareTextByDirection(a, b, sortDirection);
        }

        if (activeSortField === "series") {
          const totalA = labels.reduce(
            (sum, label) => sum + (grouped.get(label)?.get(a) ?? 0),
            0,
          );
          const totalB = labels.reduce(
            (sum, label) => sum + (grouped.get(label)?.get(b) ?? 0),
            0,
          );

          return compareByDirection(totalA, totalB, sortDirection);
        }

        return a.localeCompare(b);
      });

      return {
        labels,
        datasets: orderedSeriesLabels.map((seriesLabel) => ({
          label: seriesLabel,
          backgroundColor: draftChartConfig.colors[colorKey(seriesLabel)],
          borderColor: draftChartConfig.colors[colorKey(seriesLabel)],
          values: labels.map(
            (label) => grouped.get(label)?.get(seriesLabel) ?? 0,
          ),
        })),
      };
    }

    const grouped = new Map<string, number>();

    filteredRows.forEach((row) => {
      if (draftChartConfig.valueMode === "count_rows") {
        const countedValue = toChartLabel(row[draftChartConfig.yKey ?? ""]);

        if (!selectedCountValues.includes(countedValue)) return;
      }

      const label = toChartLabel(row[draftChartConfig.categoryKey]);

      const nextValue =
        draftChartConfig.valueMode === "count_rows"
          ? 1
          : toNumber(row[draftChartConfig.valueKey ?? ""]);

      grouped.set(
        label,
        draftChartConfig.valueMode === "show_value"
          ? nextValue
          : (grouped.get(label) ?? 0) + nextValue,
      );
    });

    const sorted = Array.from(grouped.entries()).sort((a, b) => {
      if (
        activeSortField === "group" &&
        (activeSortMode === "label-asc" || activeSortMode === "label-desc")
      ) {
        return compareTextByDirection(a[0], b[0], sortDirection);
      }

      return compareByDirection(a[1], b[1], sortDirection);
    });

    const maxItems = Number(draftChartConfig.limit);

    const finalRows =
      Number.isFinite(maxItems) && maxItems > 0
        ? sorted.slice(0, maxItems)
        : sorted;

    return {
      labels: finalRows.map(([label]) => label),
      datasets: [
        {
          label:
            draftChartConfig.valueMode === "count_rows"
              ? "Jumlah Data"
              : (draftChartConfig.valueKey ?? ""),
          backgroundColor:
            draftChartConfig.colors[
              colorKey(
                draftChartConfig.valueMode === "count_rows"
                  ? "Jumlah Data"
                  : (draftChartConfig.valueKey ?? ""),
              )
            ],
          borderColor:
            draftChartConfig.colors[
              colorKey(
                draftChartConfig.valueMode === "count_rows"
                  ? "Jumlah Data"
                  : (draftChartConfig.valueKey ?? ""),
              )
            ],
          values: finalRows.map(([, value]) => value),
        },
      ],
    };
  }, [
    filteredRows,
    activeSortField,
    draftChartConfig,
    previewSortMode,
    selectedCountValues,
    visibleColumns,
  ]);

  const labelColumn = columns.find(
    (column) => column.key === draftChartConfig.categoryKey,
  );
  const seriesColumn = columns.find(
    (column) => column.key === draftChartConfig.seriesKey,
  );
  const valueColumn = columns.find(
    (column) => column.key === draftChartConfig.valueKey,
  );
  const isMultiSeries =
    isMultiSeriesChart(draftChartConfig.type) &&
    Boolean(draftChartConfig.seriesKey) &&
    draftChartConfig.yKey !== draftChartConfig.categoryKey;
  const valueLabel =
    draftChartConfig.type === "histogram"
      ? "Frekuensi"
      : draftChartConfig.yLabel ||
        (draftChartConfig.valueMode === "count_rows"
          ? "Jumlah Data"
          : (valueColumn?.label ?? draftChartConfig.valueKey ?? ""));
  const xAxisLabel =
    draftChartConfig.categoryLabel ||
    draftChartConfig.xLabel ||
    labelColumn?.label ||
    draftChartConfig.categoryKey;
  const seriesAxisLabel =
    draftChartConfig.seriesLabel ||
    seriesColumn?.label ||
    draftChartConfig.seriesKey ||
    "Pembanding";
  const chartTitle =
    draftChartConfig.type === "histogram"
      ? `Distribusi ${xAxisLabel}`
      : isMultiSeries
        ? `${valueLabel} berdasarkan ${xAxisLabel} dan ${seriesAxisLabel}`
        : `${valueLabel} berdasarkan ${xAxisLabel}`;

  const updateValueMode = (valueMode: ChartValueMode) => {
    setDraftChartConfig((prev) =>
      normalizeChartConfig(
        {
          ...prev,
          valueMode,
          yKey:
            valueMode !== "count_rows"
              ? (prev.valueKey ?? numericColumns[0]?.key ?? null)
              : (prev.yKey ??
                categoryColumns[0]?.key ??
                visibleColumns[0]?.key),
          valueKey:
            valueMode !== "count_rows"
              ? (prev.valueKey ?? numericColumns[0]?.key ?? null)
              : null,
          countValues: valueMode === "count_rows" ? prev.countValues : null,
          yLabel:
            valueMode !== "count_rows"
              ? `${valueMode === "sum_column" ? "Total " : ""}${
                  numericColumns.find(
                    (column) =>
                      column.key === (prev.valueKey ?? numericColumns[0]?.key),
                  )?.label ?? "Nilai"
                }`
              : "Jumlah Data",
        },
        columns,
        draftTableConfig,
      ),
    );
  };

  const toggleCountValue = (value: string) => {
    setDraftChartConfig((prev) => {
      const current =
        prev.countValues === null ? countValueOptions : prev.countValues;
      const nextValues = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];

      return {
        ...prev,
        countValues:
          nextValues.length === countValueOptions.length ? null : nextValues,
      };
    });
  };

  const selectAllCountValues = () => {
    setDraftChartConfig((prev) => ({
      ...prev,
      countValues: null,
    }));
  };

  const unselectAllCountValues = () => {
    setDraftChartConfig((prev) => ({
      ...prev,
      countValues: [],
    }));
  };

  const toggleTableColumn = (key: string) => {
    setDraftTableConfig((prev) => {
      const exists = prev.visibleColumnKeys.includes(key);

      return normalizeTableConfig(
        {
          ...prev,
          visibleColumnKeys: exists
            ? prev.visibleColumnKeys.filter((item) => item !== key)
            : [...prev.visibleColumnKeys, key],
        },
        columns,
        filters,
      );
    });
  };

  const toggleTableFilter = (key: string) => {
    setDraftTableConfig((prev) =>
      normalizeTableConfig(
        {
          ...prev,
          filterKeys: prev.filterKeys.includes(key)
            ? prev.filterKeys.filter((item) => item !== key)
            : [...prev.filterKeys, key],
        },
        columns,
        filters,
      ),
    );
  };

  const selectAllColumns = () => {
    setDraftTableConfig((prev) =>
      normalizeTableConfig(
        {
          ...prev,
          visibleColumnKeys: columns.map((column) => column.key),
        },
        columns,
        filters,
      ),
    );
  };

  const unselectAllColumns = () => {
    setDraftTableConfig((prev) =>
      normalizeTableConfig(
        {
          ...prev,
          visibleColumnKeys: [],
        },
        columns,
        filters,
      ),
    );
  };

  const selectAllFilters = () => {
    setDraftTableConfig((prev) =>
      normalizeTableConfig(
        {
          ...prev,
          filterKeys: filters.map((filter) => filter.key),
        },
        columns,
        filters,
      ),
    );
  };

  const unselectAllFilters = () => {
    setDraftTableConfig((prev) =>
      normalizeTableConfig({ ...prev, filterKeys: [] }, columns, filters),
    );
  };

  const sortedPreviewRows = useMemo(() => {
    const activeSortBy =
      externalSortBy ?? previewSortKey ?? draftTableConfig.sortKey;
    const nextRows = [...filteredRows];

    if (!activeSortBy) return nextRows;

    nextRows.sort((a, b) => {
      const column = columns.find((item) => item.key === activeSortBy);

      if (column?.inputType === "number") {
        return toNumber(b[activeSortBy]) - toNumber(a[activeSortBy]);
      }

      return String(a[activeSortBy] ?? "").localeCompare(
        String(b[activeSortBy] ?? ""),
      );
    });

    return nextRows;
  }, [
    columns,
    draftTableConfig.sortKey,
    externalSortBy,
    filteredRows,
    previewSortKey,
  ]);

  const previewTableRows = sortedPreviewRows.slice(0, 20);
  const seriesTableLabel = draftChartConfig.seriesLabel || "Pembanding";

  const aggregatedPreviewRows = useMemo(() => {
    const rows: Array<Record<string, string | number>> = [];
    const xLabel = xAxisLabel || "Sumbu X";
    const yLabel =
      draftChartConfig.type === "histogram"
        ? "Frekuensi"
        : draftChartConfig.yLabel || "Jumlah";
    const activeSortMode = previewSortMode || draftChartConfig.sortMode;
    const sortDirection = getSortDirection(activeSortMode);
    const sortRows = () => {
      if (activeSortMode === "value-asc" || activeSortMode === "value-desc") {
        rows.sort((a, b) =>
          compareByDirection(
            Number(a.Jumlah ?? a[yLabel] ?? 0),
            Number(b.Jumlah ?? b[yLabel] ?? 0),
            sortDirection,
          ),
        );
        return;
      }

      if (activeSortField === "series") {
        rows.sort((a, b) =>
          compareTextByDirection(
            String(a[seriesTableLabel] ?? ""),
            String(b[seriesTableLabel] ?? ""),
            sortDirection,
          ),
        );
        return;
      }

      rows.sort((a, b) =>
        compareTextByDirection(
          String(a[xLabel] ?? ""),
          String(b[xLabel] ?? ""),
          sortDirection,
        ),
      );
    };

    if (
      isMultiSeries &&
      draftChartConfig.yKey !== draftChartConfig.categoryKey
    ) {
      if (activeSortField === "series") {
        chartResult.datasets.forEach((dataset) => {
          chartResult.labels.forEach((label, labelIndex) => {
            const value = dataset.values[labelIndex] ?? 0;

            if (value === 0) return;

            rows.push({
              [xLabel]: label,
              [seriesTableLabel]: dataset.label,
              Jumlah: value,
            });
          });
        });

        sortRows();
        return rows;
      }

      chartResult.labels.forEach((label, labelIndex) => {
        chartResult.datasets.forEach((dataset) => {
          const value = dataset.values[labelIndex] ?? 0;

          if (value === 0) return;

          rows.push({
            [xLabel]: label,
            [seriesTableLabel]: dataset.label,
            Jumlah: value,
          });
        });
      });

      sortRows();
      return rows;
    }

    chartResult.labels.forEach((label, labelIndex) => {
      rows.push({
        [xLabel]: label,
        [yLabel]: chartResult.datasets[0]?.values[labelIndex] ?? 0,
      });
    });

    sortRows();
    return rows;
  }, [
    chartResult.datasets,
    chartResult.labels,
    draftChartConfig.yKey,
    draftChartConfig.categoryKey,
    draftChartConfig.yLabel,
    draftChartConfig.type,
    draftChartConfig.sortMode,
    activeSortField,
    isMultiSeries,
    previewSortMode,
    seriesTableLabel,
    xAxisLabel,
  ]);

  const aggregatedPreviewColumns = useMemo(() => {
    const firstRow = aggregatedPreviewRows[0];

    return firstRow ? Object.keys(firstRow) : [xAxisLabel, "Jumlah"];
  }, [aggregatedPreviewRows, xAxisLabel]);

  const tableHeaderFilterOptions = useMemo(() => {
    const options: Record<string, string[]> = {};

    aggregatedPreviewColumns.forEach((column) => {
      options[column] = Array.from(
        new Set(
          aggregatedPreviewRows.map((row) => String(row[column] ?? "")),
        ),
      ).sort((a, b) =>
        a.localeCompare(b, "id", { numeric: true, sensitivity: "base" }),
      );
    });

    return options;
  }, [aggregatedPreviewColumns, aggregatedPreviewRows]);

  const tablePreviewRows = useMemo(() => {
    return aggregatedPreviewRows.filter((row) =>
      Object.entries(tableColumnFilters).every(([column, selectedValues]) =>
        selectedValues.includes(String(row[column] ?? "")),
      ),
    );
  }, [aggregatedPreviewRows, tableColumnFilters]);

  const readOnlyTablePageSize = 20;
  const readOnlyTableTotalPages = Math.max(
    Math.ceil(tablePreviewRows.length / readOnlyTablePageSize),
    1,
  );
  const readOnlyTableRows = useMemo(() => {
    const from = readOnlyTablePage * readOnlyTablePageSize;
    const to = from + readOnlyTablePageSize;

    return tablePreviewRows.slice(from, to);
  }, [tablePreviewRows, readOnlyTablePage]);

  useEffect(() => {
    setReadOnlyTablePage(0);
  }, [
    datasetId,
    externalSelectedFilters,
    externalSortBy,
    draftChartConfig,
    previewFilters,
    previewSortMode,
    tableColumnFilters,
  ]);

  useEffect(() => {
    if (readOnlyTablePage > readOnlyTableTotalPages - 1) {
      setReadOnlyTablePage(Math.max(readOnlyTableTotalPages - 1, 0));
    }
  }, [readOnlyTablePage, readOnlyTableTotalPages]);

  useEffect(() => {
    if (!readOnly || !onReadOnlyCsvDataChange) return;

    onReadOnlyCsvDataChange({
      headers: aggregatedPreviewColumns.map((column) => toTitleCase(column)),
      rows: tablePreviewRows.map((row) =>
        aggregatedPreviewColumns.map((column) => row[column] ?? "N/A"),
      ),
    });
  }, [
    aggregatedPreviewColumns,
    tablePreviewRows,
    onReadOnlyCsvDataChange,
    readOnly,
  ]);

  const getPreviewColumnSortKey = (column: string) => {
    if (column === xAxisLabel) return draftChartConfig.categoryKey;
    if (column === seriesTableLabel) return draftChartConfig.seriesKey;
    if (column === "Jumlah" || column === draftChartConfig.yLabel) {
      return VALUE_SORT_KEY;
    }

    return "";
  };

  const getPreviewSortIndicator = (column: string) => {
    const sortKey = getPreviewColumnSortKey(column);

    if (!sortKey || sortKey !== activeSortKey) return "";

    return getSortDirection(previewSortMode || draftChartConfig.sortMode) ===
      "asc"
      ? "↑"
      : "↓";
  };

  const setPreviewColumnSort = (
    column: string,
    direction: "asc" | "desc",
  ) => {
    const sortKey = getPreviewColumnSortKey(column);
    if (!sortKey) return;

    setPreviewSortKey(sortKey);
    setPreviewSortMode(
      sortKey === VALUE_SORT_KEY
        ? direction === "asc"
          ? "value-asc"
          : "value-desc"
        : direction === "asc"
          ? "label-asc"
          : "label-desc",
    );
    onExternalSortChange?.(sortKey);
    setOpenTableHeaderMenu(null);
  };

  const toggleTableColumnFilterValue = (column: string, value: string) => {
    const options = tableHeaderFilterOptions[column] ?? [];

    setTableColumnFilters((prev) => {
      const current = prev[column] ?? options;
      const next = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];

      return { ...prev, [column]: next };
    });
  };

  const selectAllTableColumnFilterValues = (
    column: string,
    selected: boolean,
  ) => {
    setTableColumnFilters((prev) => ({
      ...prev,
      [column]: selected ? [...(tableHeaderFilterOptions[column] ?? [])] : [],
    }));
  };

  const renderTableHeaderMenu = (column: string) => {
    const options = tableHeaderFilterOptions[column] ?? [];
    const selectedValues = tableColumnFilters[column] ?? options;
    const allSelected =
      options.length > 0 && selectedValues.length === options.length;

    return (
      <div className="relative" data-chart-table-menu="true">
        <button
          type="button"
          onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();

            setTableHeaderMenuPosition({
              left: Math.min(
                Math.max(rect.left + window.scrollX, window.scrollX + 8),
                Math.max(
                  window.scrollX + 8,
                  window.scrollX + window.innerWidth - 272,
                ),
              ),
              top: rect.bottom + window.scrollY + 4,
            });
            setOpenTableHeaderMenu((prev) =>
              prev === column ? null : column,
            );
          }}
          className="flex w-full items-center justify-center gap-2 rounded px-2 py-1 text-left font-semibold text-sky-900 hover:bg-sky-200"
        >
          <span>{toTitleCase(column)}</span>
          {getPreviewSortIndicator(column) && (
            <span>{getPreviewSortIndicator(column)}</span>
          )}
          <DownChevron className="h-3 w-3 shrink-0" />
        </button>

        {openTableHeaderMenu === column &&
          typeof document !== "undefined" &&
          createPortal(
          <div
            data-chart-table-menu="true"
            style={{
              left: tableHeaderMenuPosition.left,
              top: tableHeaderMenuPosition.top,
            }}
            className="absolute z-[100] w-64 rounded-md border border-gray-300 bg-white p-3 text-left text-xs font-normal text-gray-700 shadow-lg"
          >
            <div className="mb-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPreviewColumnSort(column, "asc")}
                className="rounded border border-sky-600 px-2 py-1 font-medium text-sky-700 hover:bg-sky-50"
              >
                Sort A-Z
              </button>
              <button
                type="button"
                onClick={() => setPreviewColumnSort(column, "desc")}
                className="rounded border border-sky-600 px-2 py-1 font-medium text-sky-700 hover:bg-sky-50"
              >
                Sort Z-A
              </button>
            </div>

            <div className="mb-2 flex items-center gap-2">
              {!allSelected && (
                <button
                  type="button"
                  onClick={() =>
                    selectAllTableColumnFilterValues(column, true)
                  }
                  className="rounded border border-gray-300 px-2 py-1 hover:bg-gray-100"
                >
                  Pilih Semua
                </button>
              )}
              {selectedValues.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    selectAllTableColumnFilterValues(column, false)
                  }
                  className="rounded border border-gray-300 px-2 py-1 hover:bg-gray-100"
                >
                  Hapus Semua
                </button>
              )}
            </div>

            <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
              {options.map((option) => (
                <label
                  key={`${column}-${option}`}
                  className="flex items-center gap-2"
                >
                  <input
                    type="checkbox"
                    checked={selectedValues.includes(option)}
                    onChange={() =>
                      toggleTableColumnFilterValue(column, option)
                    }
                  />
                  <span className="break-words">
                    {option === "" ? "N/A" : toTitleCase(option)}
                  </span>
                </label>
              ))}
            </div>
          </div>,
          document.body,
        )}
      </div>
    );
  };

  const updatePreviewFilter = (key: string, value: string) => {
    setPreviewFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const updateSeriesColor = (key: string, color: string) => {
    setDraftChartConfig((prev) => ({
      ...prev,
      colors: {
        ...prev.colors,
        [colorKey(key)]: color,
      },
    }));
  };

  const updateSliceColor = (key: string, color: string) => {
    setDraftChartConfig((prev) => ({
      ...prev,
      sliceColors: {
        ...prev.sliceColors,
        [colorKey(key)]: color,
      },
    }));
  };

  const handleSave = () => {
    const snapshotDataUrl =
      draftChartConfig.type === "line" ||
      draftChartConfig.type === "multiple-line"
        ? (lineChartRef.current?.toBase64Image() ?? null)
        : draftChartConfig.type === "pie"
          ? (pieChartRef.current?.toBase64Image() ?? null)
          : (barChartRef.current?.toBase64Image() ?? null);

    const nextTableConfig = {
      ...draftTableConfig,
      sortKey:
        previewSortKey && previewSortKey !== VALUE_SORT_KEY
          ? previewSortKey
          : draftTableConfig.sortKey,
    };

    onSave?.(
      {
        ...draftChartConfig,
        sortField: activeSortField,
        sortMode: previewSortMode || draftChartConfig.sortMode,
      },
      snapshotDataUrl,
      nextTableConfig,
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-40 w-full items-center justify-center rounded border border-gray-200 bg-white">
        <SpinnerLoading size="sm" color="black" />
      </div>
    );
  }

  if (err) {
    return (
      <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        {err}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700">
        Data grafik belum tersedia.
      </div>
    );
  }

  if (readOnly) {
    return (
      <div className="flex w-full min-w-0 flex-col gap-6">
        {chartFilters.length > 0 && (
          <div className="grid gap-3 md:grid-cols-3">
            {chartFilters.map((filter) => (
              <label key={filter.key} className="flex flex-col gap-1 text-xs">
                <span className="font-semibold text-gray-700">
                  {toTitleCase(filter.label)}
                </span>

                <select
                  value={
                    externalSelectedFilters?.[filter.key] ??
                    previewFilters[filter.key] ??
                    "all"
                  }
                  onChange={(event) => {
                    if (onExternalFilterChange) {
                      onExternalFilterChange(filter.key, event.target.value);
                      return;
                    }

                    updatePreviewFilter(filter.key, event.target.value);
                  }}
                  className="w-full rounded border border-gray-400 px-3 py-2 text-xs"
                >
                  <option value="all">
                    {filter.allLabel ?? `Semua ${toTitleCase(filter.label)}`}
                  </option>

                  {(filterOptions[filter.key] ?? []).map((option) => (
                    <option key={option} value={option}>
                      {toTitleCase(option)}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-6">
          <div className="min-w-0">
            {draftChartConfig.type === "line" ||
            draftChartConfig.type === "multiple-line" ? (
              <LineCharts
                ref={lineChartRef}
                labels={chartResult.labels}
                datasets={chartResult.datasets}
                chartTitle={chartTitle}
                datalabel={false}
                yAxis={true}
                xAxisTitle={xAxisLabel}
                showLegend={draftChartConfig.showLegend}
                rotateXLabels={chartResult.labels.length > 8 ? 45 : 0}
                heightClassName="h-[30vh]"
              />
            ) : draftChartConfig.type === "pie" ? (
              <PieCharts
                ref={pieChartRef}
                labels={chartResult.labels}
                datasets={[
                  {
                    ...(chartResult.datasets[0] ?? {
                      label: valueLabel,
                      values: [],
                    }),
                    backgroundColors: chartResult.labels.map(
                      (label, index) =>
                        draftChartConfig.sliceColors[colorKey(label)] ??
                        COLOR_PICKER_FALLBACKS[
                          index % COLOR_PICKER_FALLBACKS.length
                        ],
                    ),
                  },
                ]}
                chartTitle={chartTitle}
                datalabel={false}
                showLegend={draftChartConfig.showLegend}
                heightClassName="h-[30vh]"
              />
            ) : (
              <BarCharts
                ref={barChartRef}
                labels={chartResult.labels}
                datasets={chartResult.datasets}
                stacked={draftChartConfig.type === "stacked-bar"}
                histogram={draftChartConfig.type === "histogram"}
                chartTitle={chartTitle}
                datalabel={false}
                yAxis={true}
                xAxisTitle={xAxisLabel}
                showLegend={draftChartConfig.showLegend}
                rotateXLabels={chartResult.labels.length > 8 ? 45 : 0}
                heightClassName="h-[30vh]"
              />
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr>
                  {aggregatedPreviewColumns.map((column) => (
                    <th
                      key={column}
                      className="border border-stone-200 bg-sky-100 px-3 py-2 text-left"
                    >
                      {renderTableHeaderMenu(column)}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {readOnlyTableRows.length > 0 ? (
                  readOnlyTableRows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {aggregatedPreviewColumns.map((column) => (
                        <td
                          key={column}
                          className={`border border-stone-200 px-3 py-2 ${
                            column === "Jumlah" ||
                            column === draftChartConfig.yLabel
                              ? "text-right"
                              : "text-left"
                          }`}
                        >
                          {formatTableValue(row[column])}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={Math.max(aggregatedPreviewColumns.length, 1)}
                      className="border border-stone-200 px-3 py-6 text-center text-gray-500"
                    >
                      Tidak ada data.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {readOnlyTableTotalPages > 1 && (
          <div className="flex items-center justify-between gap-3 text-sm">
            <button
              type="button"
              disabled={readOnlyTablePage === 0}
              onClick={() =>
                setReadOnlyTablePage((prev) => Math.max(prev - 1, 0))
              }
              className="rounded bg-gray-600 px-4 py-2 text-white disabled:opacity-40"
            >
              <LeftChevron className="size-6" />
            </button>

            <p className="text-center text-gray-700">
              Page {readOnlyTablePage + 1} / {readOnlyTableTotalPages}
              <br />
              <span className="text-xs text-gray-500">
                Total data: {tablePreviewRows.length}
              </span>
            </p>

            <button
              type="button"
              disabled={readOnlyTablePage + 1 >= readOnlyTableTotalPages}
              onClick={() => {
                if (!isLoggedIn) {
                  onLoginRequired?.();
                  return;
                }

                setReadOnlyTablePage((prev) =>
                  Math.min(prev + 1, readOnlyTableTotalPages - 1),
                );
              }}
              className="rounded bg-sky-600 px-4 py-2 text-white disabled:opacity-40"
            >
              <RightChevron className="size-6" />
            </button>
          </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-6 lg:flex-row">
      {!previewOnly && (
      <div className="flex w-full min-w-0 flex-col gap-6 lg:w-[35%]">
        <div className="rounded-lg border border-stone-200 bg-white shadow-md">
          <button
            type="button"
            onClick={(event) =>
              toggleConfigSection("data", event.currentTarget)
            }
            className="scroll-mt-24 flex w-full items-center justify-between rounded-t-lg bg-sky-800 px-3 py-2 text-left text-sm font-semibold text-white"
          >
            <span>Data</span>
            <AccordionToggleIcon open={showDataConfig} size="sm" />
          </button>

          <div
            className={`${showDataConfig ? "visible" : "invisible h-0 pointer-events-none overflow-hidden"} flex flex-row flex-wrap gap-3 ${showDataConfig ? "border-t border-gray-200 p-3" : "px-3"}`}
          >
            <label className="flex min-w-48 grow basis-full flex-col gap-2 text-xs">
              <span className="font-semibold text-gray-700">Jenis Grafik</span>
              <select
                value={draftChartConfig.type}
                onChange={(event) => {
                  const type = event.target
                    .value as PublishedChartConfig["type"];
                  const suggested = hasSavedChartConfig
                    ? normalizeChartConfig(
                        { ...draftChartConfig, type },
                        columns,
                        draftTableConfig,
                      )
                    : suggestChartConfig(type, draftChartConfig);

                  setDraftChartConfig(suggested);

                  if (!hasSavedChartConfig) {
                    setDraftTableConfig((prev) => ({
                      ...prev,
                      sortKey: suggested.categoryKey,
                      sortDirection: suggested.sortMode.endsWith("asc")
                        ? "asc"
                        : "desc",
                    }));
                    setPreviewSortKey(suggested.categoryKey);
                    setPreviewSortMode(suggested.sortMode);
                  }
                }}
                className="h-10 w-full rounded border border-gray-400 px-3 py-2 text-xs"
              >
                <option value="bar">Bar</option>
                <option value="multiple-bar">Multiple Bar</option>
                <option value="stacked-bar">Stacked Bar</option>
                <option value="line">Line</option>
                <option value="multiple-line">Multiple Line</option>
                <option value="pie">Pie</option>
                <option value="histogram" disabled={numericColumns.length === 0}>
                  Histogram
                </option>
              </select>
              {chartSuitabilityWarning && (
                <p
                  role="status"
                  className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800"
                >
                  {chartSuitabilityWarning}
                  {chartSuitabilityWarning ===
                    "Jenis grafik ini membutuhkan Pembanding agar dapat menampilkan beberapa seri." && (
                    <>
                      {" "}
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          openSeriesSettings();
                        }}
                        onKeyDown={(event) => {
                          if (
                            event.key !== "Enter" &&
                            event.key !== " "
                          ) {
                            return;
                          }

                          event.preventDefault();
                          event.stopPropagation();
                          openSeriesSettings();
                        }}
                        className="cursor-pointer font-semibold text-sky-700 underline hover:text-sky-900"
                      >
                        Atur Pembanding
                      </span>
                    </>
                  )}
                </p>
              )}
            </label>

            <details
              data-chart-dropdown="true"
              open={openDropdownKey === "columns"}
              className="group relative min-w-48 grow"
            >
              <summary
                onClick={(event) => {
                  event.preventDefault();
                  setOpenDropdownKey((prev) =>
                    prev === "columns" ? null : "columns",
                  );
                }}
                className="flex h-10 cursor-pointer items-center rounded-sm border border-gray-400 bg-white px-3 py-2 text-xs group-open:border-2 group-open:border-black"
              >
                Kolom ({draftTableConfig.visibleColumnKeys.length}/
                {columns.length})
              </summary>

              <div className="absolute left-0 z-30 mt-2 w-full rounded-lg border border-gray-400 bg-white shadow-lg">
                <div className="flex items-center justify-end gap-3 border-b px-3 py-2">
                  {draftTableConfig.visibleColumnKeys.length <
                    columns.length && (
                    <button
                      type="button"
                      onClick={selectAllColumns}
                      className="text-xs text-sky-600 hover:underline"
                    >
                      Pilih Semua
                    </button>
                  )}

                  {draftTableConfig.visibleColumnKeys.length > 0 && (
                    <button
                      type="button"
                      onClick={unselectAllColumns}
                      className="text-xs text-sky-600 hover:underline"
                    >
                      Hapus Semua
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto p-2">
                  {columns.map((column) => (
                    <label
                      key={column.key}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-gray-100"
                    >
                      <input
                        type="checkbox"
                        checked={draftTableConfig.visibleColumnKeys.includes(
                          column.key,
                        )}
                        onChange={() => toggleTableColumn(column.key)}
                        className="h-4 w-4"
                      />

                      <span>{toTitleCase(column.label)}</span>
                    </label>
                  ))}
                </div>
              </div>
            </details>

            <details
              data-chart-dropdown="true"
              open={openDropdownKey === "filters"}
              className="group relative min-w-48 grow"
            >
              <summary
                onClick={(event) => {
                  event.preventDefault();
                  setOpenDropdownKey((prev) =>
                    prev === "filters" ? null : "filters",
                  );
                }}
                className="flex h-10 cursor-pointer items-center rounded-sm border border-gray-400 bg-white px-3 py-2 text-xs group-open:border-2 group-open:border-black"
              >
                Filter ({draftTableConfig.filterKeys.length}/{filters.length})
              </summary>

              <div className="absolute left-0 z-30 mt-2 w-full rounded-lg border border-gray-400 bg-white shadow-lg">
                <div className="flex items-center justify-end gap-3 border-b px-3 py-2">
                  {draftTableConfig.filterKeys.length < filters.length && (
                    <button
                      type="button"
                      onClick={selectAllFilters}
                      className="text-xs text-sky-600 hover:underline"
                    >
                      Pilih Semua
                    </button>
                  )}

                  {draftTableConfig.filterKeys.length > 0 && (
                    <button
                      type="button"
                      onClick={unselectAllFilters}
                      className="text-xs text-sky-600 hover:underline"
                    >
                      Hapus Semua
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto p-2">
                  {filters.map((filter) => (
                    <label
                      key={filter.key}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-gray-100"
                    >
                      <input
                        type="checkbox"
                        checked={draftTableConfig.filterKeys.includes(
                          filter.key,
                        )}
                        onChange={() => toggleTableFilter(filter.key)}
                        className="h-4 w-4"
                      />

                      <span>{toTitleCase(filter.label)}</span>
                    </label>
                  ))}
                </div>
              </div>
            </details>
          </div>
        </div>

        <div className="rounded-lg border border-stone-200 bg-white shadow-md">
          <button
            type="button"
            onClick={(event) =>
              toggleConfigSection("chart", event.currentTarget)
            }
            className="scroll-mt-24 flex w-full items-center justify-between rounded-t-lg bg-sky-800 px-3 py-2 text-left text-sm font-semibold text-white"
          >
            <span>Pengaturan</span>
            <AccordionToggleIcon open={showChartConfig} size="sm" />
          </button>

          <div
            className={`${showChartConfig ? "visible" : "invisible h-0 pointer-events-none overflow-hidden"} flex flex-row flex-wrap gap-6 ${showChartConfig ? "border-t border-gray-200 p-3" : "px-3"}`}
          >
            <div className="flex min-w-0 grow basis-full flex-row flex-wrap gap-3 rounded-md border border-stone-200 bg-white p-3 shadow-sm">
              <p className="w-full text-xs font-semibold text-sky-800">
                {draftChartConfig.type === "pie"
                  ? "Kategori Irisan"
                  : "Kategori / Sumbu X"}
              </p>

              <label className="flex min-w-48 grow flex-col gap-2 text-xs">
                <FieldLabel
                  label={
                    draftChartConfig.type === "histogram"
                      ? "Kolom Numerik"
                      : draftChartConfig.type === "pie"
                        ? "Kategori Irisan"
                        : "Kategori Data"
                  }
                  technical="Dimension / X Axis"
                  help="Pilih kolom yang menjadi kelompok utama, misalnya Tahun, Kabupaten, Zona Konservasi, atau Pekerjaan."
                  helpKey="category"
                  openHelpKey={openHelpKey}
                  onToggleHelp={(key) =>
                    setOpenHelpKey((prev) => (prev === key ? null : key))
                  }
                />
                <select
                  value={draftChartConfig.categoryKey}
                  onChange={(event) =>
                    setDraftChartConfig((prev) => {
                      const nextCategoryKey = event.target.value;
                      const nextCategoryColumn = columns.find(
                        (column) => column.key === nextCategoryKey,
                      );
                      const nextSeriesKey =
                        prev.seriesKey === nextCategoryKey
                          ? (visibleColumns.find(
                              (column) => column.key !== nextCategoryKey,
                            )?.key ?? null)
                          : prev.seriesKey;

                      return {
                        ...prev,
                        categoryKey: nextCategoryKey,
                        categoryLabel:
                          nextCategoryColumn?.label ?? prev.categoryLabel,
                        xLabel: nextCategoryColumn?.label ?? prev.xLabel,
                        seriesKey: nextSeriesKey,
                      };
                    })
                  }
                  className="h-10 w-full rounded border border-gray-400 px-3 py-2 text-xs"
                >
                  {(draftChartConfig.type === "histogram"
                    ? numericColumns
                    : [...categoryColumns, ...numericColumns]
                  ).map((column) => (
                    <option key={column.key} value={column.key}>
                      {toTitleCase(column.label)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex min-w-48 grow flex-col gap-2 text-xs">
                <FieldLabel
                  label="Nama Kategori"
                  technical="X Axis Label"
                  help="Nama yang tampil untuk kelompok data pada grafik dan tabel preview."
                  helpKey="x-label"
                  openHelpKey={openHelpKey}
                  onToggleHelp={(key) =>
                    setOpenHelpKey((prev) => (prev === key ? null : key))
                  }
                />
                <input
                  value={draftChartConfig.categoryLabel}
                  onChange={(event) =>
                    setDraftChartConfig((prev) => ({
                      ...prev,
                      categoryLabel: event.target.value,
                      xLabel: event.target.value,
                    }))
                  }
                  className="h-10 w-full rounded border border-gray-400 px-3 py-2 text-xs"
                />
              </label>

              <label className="flex min-w-48 grow basis-full cursor-pointer items-center gap-2 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={draftChartConfig.showLegend}
                  onChange={(event) =>
                    setDraftChartConfig((prev) => ({
                      ...prev,
                      showLegend: event.target.checked,
                    }))
                  }
                  className="h-4 w-4"
                />
                <span className="font-semibold">Tampilkan Legenda</span>
              </label>

              {draftChartConfig.type === "histogram" && (
                <label className="flex min-w-48 grow flex-col gap-2 text-xs">
                  <FieldLabel
                    label="Jumlah Interval"
                    technical="Histogram Bins"
                    help="Tentukan berapa banyak rentang nilai yang digunakan untuk mengelompokkan data numerik."
                    helpKey="histogram-bins"
                    openHelpKey={openHelpKey}
                    onToggleHelp={(key) =>
                      setOpenHelpKey((prev) => (prev === key ? null : key))
                    }
                  />
                  <select
                    value={String(draftChartConfig.histogramBins)}
                    onChange={(event) =>
                      setDraftChartConfig((prev) => ({
                        ...prev,
                        histogramBins: Number(event.target.value),
                      }))
                    }
                    className="h-10 w-full rounded border border-gray-400 px-3 py-2 text-xs"
                  >
                    <option value="5">5 Interval</option>
                    <option value="10">10 Interval</option>
                    <option value="15">15 Interval</option>
                    <option value="20">20 Interval</option>
                  </select>
                </label>
              )}

              {draftChartConfig.type !== "histogram" &&
                draftChartConfig.type !== "pie" && (
                <div
                  className={`flex w-full flex-wrap gap-3 rounded-md border p-2 transition-colors duration-700 ${
                    highlightSeriesSettings
                      ? "border-amber-300 bg-amber-50"
                      : "border-transparent bg-transparent"
                  }`}
                >
                  <p
                    ref={seriesSettingsRef}
                    className="scroll-mt-24 mt-2 w-full border-t border-stone-200 pt-3 text-xs font-semibold text-sky-800"
                  >
                    Pembanding (Opsional)
                  </p>

                  <label className="flex min-w-48 grow flex-col gap-2 text-xs">
                <FieldLabel
                  label="Pembanding"
                  technical="Series / Breakdown"
                  help="Opsional. Pisahkan hasil menjadi beberapa kelompok, misalnya berdasarkan Jenis Kelamin, Pekerjaan, atau Jawaban."
                  helpKey="series"
                  openHelpKey={openHelpKey}
                  onToggleHelp={(key) =>
                    setOpenHelpKey((prev) => (prev === key ? null : key))
                  }
                />
                <select
                  value={draftChartConfig.seriesKey ?? ""}
                  onChange={(event) =>
                    setDraftChartConfig((prev) => {
                      const nextSeriesKey = event.target.value || null;
                      const nextSeriesColumn = columns.find(
                        (column) => column.key === nextSeriesKey,
                      );

                      return {
                        ...prev,
                        seriesKey: nextSeriesKey,
                        seriesLabel:
                          nextSeriesColumn?.label ?? prev.seriesLabel,
                        sortField:
                          !event.target.value && prev.sortField === "series"
                            ? "value"
                            : prev.sortField,
                      };
                    })
                  }
                  className="h-10 w-full rounded border border-gray-400 px-3 py-2 text-xs"
                >
                  <option value="">Tidak Ada</option>

                  {visibleColumns
                    .filter(
                      (column) => column.key !== draftChartConfig.categoryKey,
                    )
                    .map((column) => (
                      <option key={column.key} value={column.key}>
                        {toTitleCase(column.label)}
                      </option>
                    ))}
                </select>
                  </label>

                  {draftChartConfig.seriesKey && (
                    <label className="flex min-w-48 grow flex-col gap-2 text-xs">
                  <FieldLabel
                    label="Nama Pembanding"
                    technical="Series Filter Label"
                    help="Nama ini dipakai sebagai label filter untuk kolom Pembanding, misalnya Pekerjaan atau Jenis Kelamin."
                    helpKey="series-label"
                    openHelpKey={openHelpKey}
                    onToggleHelp={(key) =>
                      setOpenHelpKey((prev) => (prev === key ? null : key))
                    }
                  />
                  <input
                    value={draftChartConfig.seriesLabel}
                    onChange={(event) =>
                      setDraftChartConfig((prev) => ({
                        ...prev,
                        seriesLabel: event.target.value,
                      }))
                    }
                    className="h-10 w-full rounded border border-gray-400 px-3 py-2 text-xs"
                  />
                    </label>
                  )}
                </div>
              )}
            </div>

            <div
              className={`${draftChartConfig.type === "histogram" ? "hidden" : "flex"} min-w-0 grow basis-full flex-row flex-wrap gap-3 rounded-md border border-stone-200 bg-white p-3 shadow-sm`}
            >
              <p className="w-full text-xs font-semibold text-sky-800">
                {draftChartConfig.type === "pie"
                  ? "Nilai Irisan"
                  : "Nilai / Sumbu Y"}
              </p>

              <label className="flex min-w-48 grow flex-col gap-2 text-xs">
                <FieldLabel
                  label="Cara Menghitung"
                  technical="Measure / Metric"
                  help="Pilih apakah grafik menghitung banyaknya baris, menjumlahkan kolom angka, atau menampilkan nilai angka apa adanya."
                  helpKey="value-mode"
                  openHelpKey={openHelpKey}
                  onToggleHelp={(key) =>
                    setOpenHelpKey((prev) => (prev === key ? null : key))
                  }
                />
                <select
                  value={draftChartConfig.valueMode}
                  onChange={(event) =>
                    updateValueMode(event.target.value as ChartValueMode)
                  }
                  className="h-10 w-full rounded border border-gray-400 px-3 py-2 text-xs"
                >
                  <option value="count_rows">Jumlah Baris</option>
                  <option value="sum_column">Jumlahkan Angka</option>
                  <option value="show_value">Tampilkan Nilai</option>
                </select>
              </label>

              {draftChartConfig.valueMode === "count_rows" ? (
                <>
                  <label className="flex min-w-48 grow flex-col gap-2 text-xs">
                    <FieldLabel
                      label="Kolom Yang Dihitung"
                      technical="Count Field / Value Field"
                      help="Pilih kolom kategori yang nilainya ingin dihitung, misalnya Jawaban, Jenis Kelamin, atau Pekerjaan."
                      helpKey="count-field"
                      openHelpKey={openHelpKey}
                      onToggleHelp={(key) =>
                        setOpenHelpKey((prev) => (prev === key ? null : key))
                      }
                    />
                    <select
                      value={draftChartConfig.yKey ?? ""}
                      onChange={(event) => {
                        const nextKey = event.target.value;
                        const nextColumn = columns.find(
                          (column) => column.key === nextKey,
                        );

                        setDraftChartConfig((prev) =>
                          normalizeChartConfig(
                            {
                              ...prev,
                              yKey: nextKey,
                              valueMode: "count_rows",
                              valueKey: null,
                              countValues: null,
                              yLabel: `Jumlah ${nextColumn?.label ?? nextKey}`,
                            },
                            columns,
                            draftTableConfig,
                          ),
                        );
                      }}
                      className="h-10 w-full rounded border border-gray-400 px-3 py-2 text-xs"
                    >
                      {visibleColumns.map((column) => (
                        <option key={column.key} value={column.key}>
                          {toTitleCase(column.label)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="flex min-w-48 grow flex-col gap-2 text-xs">
                    <FieldLabel
                      label="Nilai Yang Dihitung"
                      technical="Included Values"
                      help="Pilih nilai mana saja yang masuk ke grafik dan tabel, misalnya hanya Yes, atau Yes dan No sekaligus."
                      helpKey="included-values"
                      openHelpKey={openHelpKey}
                      onToggleHelp={(key) =>
                        setOpenHelpKey((prev) => (prev === key ? null : key))
                      }
                    />

                    <details
                      data-chart-dropdown="true"
                      open={openDropdownKey === "count-values"}
                      className="group relative"
                    >
                      <summary
                        onClick={(event) => {
                          event.preventDefault();
                          setOpenDropdownKey((prev) =>
                            prev === "count-values" ? null : "count-values",
                          );
                        }}
                        className="flex h-10 cursor-pointer items-center rounded-sm border border-gray-400 bg-white px-3 py-2 text-xs group-open:border-2 group-open:border-black"
                      >
                        Nilai ({selectedCountValues.length}/
                        {countValueOptions.length})
                      </summary>

                      <div className="absolute left-0 z-30 mt-2 w-full rounded-lg border border-gray-400 bg-white shadow-lg">
                        <div className="flex items-center justify-end gap-3 border-b px-3 py-2">
                          {selectedCountValues.length <
                            countValueOptions.length && (
                            <button
                              type="button"
                              onClick={selectAllCountValues}
                              className="text-xs text-sky-600 hover:underline"
                            >
                              Pilih Semua
                            </button>
                          )}

                          {selectedCountValues.length > 0 && (
                            <button
                              type="button"
                              onClick={unselectAllCountValues}
                              className="text-xs text-sky-600 hover:underline"
                            >
                              Hapus Semua
                            </button>
                          )}
                        </div>

                        <div className="max-h-72 overflow-y-auto p-2">
                          {countValueOptions.length > 0 ? (
                            countValueOptions.map((value) => (
                              <label
                                key={value}
                                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-gray-100"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedCountValues.includes(value)}
                                  onChange={() => toggleCountValue(value)}
                                  className="h-4 w-4"
                                />

                                <span>{toTitleCase(value)}</span>
                              </label>
                            ))
                          ) : (
                            <p className="px-2 py-3 text-xs text-gray-500">
                              Tidak ada nilai tersedia.
                            </p>
                          )}
                        </div>
                      </div>
                    </details>
                  </div>
                </>
              ) : (
                <label className="flex min-w-48 grow flex-col gap-2 text-xs">
                  <FieldLabel
                    label="Kolom Angka"
                    technical="Numeric Measure"
                    help="Pilih kolom angka yang akan dijumlahkan, misalnya Pendapatan atau Jumlah Produksi."
                    helpKey="numeric-field"
                    openHelpKey={openHelpKey}
                    onToggleHelp={(key) =>
                      setOpenHelpKey((prev) => (prev === key ? null : key))
                    }
                  />
                  <select
                    value={draftChartConfig.valueKey ?? ""}
                    onChange={(event) => {
                      const nextKey = event.target.value;
                      const nextColumn = columns.find(
                        (column) => column.key === nextKey,
                      );

                      setDraftChartConfig((prev) =>
                        normalizeChartConfig(
                          {
                            ...prev,
                            yKey: nextKey,
                            valueMode: prev.valueMode,
                            valueKey: nextKey,
                            yLabel: `${
                              prev.valueMode === "sum_column" ? "Total " : ""
                            }${nextColumn?.label ?? nextKey}`,
                          },
                          columns,
                          draftTableConfig,
                        ),
                      );
                    }}
                    className="h-10 w-full rounded border border-gray-400 px-3 py-2 text-xs"
                  >
                    {numericColumns.map((column) => (
                      <option key={column.key} value={column.key}>
                        {toTitleCase(column.label)}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label className="flex min-w-48 grow flex-col gap-2 text-xs">
                <FieldLabel
                  label="Nama Nilai"
                  technical="Y Axis Label / Value Label"
                  help="Nama yang tampil untuk angka hasil perhitungan pada grafik dan tabel."
                  helpKey="value-label"
                  openHelpKey={openHelpKey}
                  onToggleHelp={(key) =>
                    setOpenHelpKey((prev) => (prev === key ? null : key))
                  }
                />
                <input
                  value={draftChartConfig.yLabel}
                  onChange={(event) =>
                    setDraftChartConfig((prev) => ({
                      ...prev,
                      yLabel: event.target.value,
                    }))
                  }
                  className="h-10 w-full rounded border border-gray-400 px-3 py-2 text-xs"
                />
              </label>
            </div>

            <div
              className={`${draftChartConfig.type === "histogram" ? "hidden" : "flex"} min-w-0 grow basis-full flex-row flex-wrap gap-3 rounded-md border border-stone-200 bg-white p-3 shadow-sm`}
            >
              <p className="w-full text-xs font-semibold text-sky-800">
                Urutan
              </p>

              <label className="flex min-w-48 grow flex-col gap-2 text-xs">
                <FieldLabel
                  label="Urutkan Berdasarkan"
                  technical="Default Sort Column"
                  help="Pilih kolom yang dipakai sebagai urutan awal saat visualisasi dibuka."
                  helpKey="default-sort-column"
                  openHelpKey={openHelpKey}
                  onToggleHelp={(key) =>
                    setOpenHelpKey((prev) => (prev === key ? null : key))
                  }
                />
                <select
                  value={draftTableConfig.sortKey}
                  onChange={(event) => {
                    const sortKey = event.target.value;
                    const sortField: ChartSortField =
                      sortKey === draftChartConfig.categoryKey
                        ? "group"
                        : sortKey === draftChartConfig.seriesKey
                          ? "series"
                          : "value";
                    const sortMode: ChartSortMode =
                      sortField === "value"
                        ? draftTableConfig.sortDirection === "asc"
                          ? "value-asc"
                          : "value-desc"
                        : draftTableConfig.sortDirection === "asc"
                          ? "label-asc"
                          : "label-desc";

                    setDraftTableConfig((prev) => ({
                      ...prev,
                      sortKey,
                    }));
                    setDraftChartConfig((prev) => ({
                      ...prev,
                      sortField,
                      sortMode,
                    }));
                    setPreviewSortKey(sortKey);
                    setPreviewSortMode(sortMode);
                  }}
                  className="h-10 w-full rounded border border-gray-400 px-3 py-2 text-xs"
                >
                  {defaultSortColumns.map((column) => (
                    <option key={column.key} value={column.key}>
                      {toTitleCase(column.label)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex min-w-48 grow flex-col gap-2 text-xs">
                <FieldLabel
                  label="Arah Urutan"
                  technical="Default Sort Direction"
                  help="Pilih urutan menaik (A-Z) atau menurun (Z-A). Kolom angka mengikuti urutan kecil-besar atau besar-kecil."
                  helpKey="default-sort-direction"
                  openHelpKey={openHelpKey}
                  onToggleHelp={(key) =>
                    setOpenHelpKey((prev) => (prev === key ? null : key))
                  }
                />
                <select
                  value={draftTableConfig.sortDirection}
                  onChange={(event) => {
                    const direction = event.target.value as "asc" | "desc";
                    const sortField = draftChartConfig.sortField;
                    const sortMode: ChartSortMode =
                      sortField === "value"
                        ? direction === "asc"
                          ? "value-asc"
                          : "value-desc"
                        : direction === "asc"
                          ? "label-asc"
                          : "label-desc";

                    setDraftTableConfig((prev) => ({
                      ...prev,
                      sortDirection: direction,
                    }));
                    setDraftChartConfig((prev) => ({
                      ...prev,
                      sortMode,
                    }));
                    setPreviewSortKey(draftTableConfig.sortKey);
                    setPreviewSortMode(sortMode);
                  }}
                  className="h-10 w-full rounded border border-gray-400 px-3 py-2 text-xs"
                >
                  <option value="asc">A-Z / Kecil-Besar</option>
                  <option value="desc">Z-A / Besar-Kecil</option>
                </select>
              </label>
            </div>

            <div
              className={`${draftChartConfig.type === "histogram" ? "hidden" : "flex"} min-w-0 grow basis-full flex-row flex-wrap gap-3 rounded-md border border-stone-200 bg-white p-3 shadow-sm`}
            >
              <p className="w-full text-xs font-semibold text-sky-800">
                Batas Data
              </p>
              <label className="flex min-w-48 grow flex-col gap-2 text-xs">
                <FieldLabel
                  label="Jumlah Ditampilkan"
                  technical="Result Limit"
                  help="Batasi jumlah kelompok yang ditampilkan agar grafik tetap mudah dibaca."
                  helpKey="limit"
                  openHelpKey={openHelpKey}
                  onToggleHelp={(key) =>
                    setOpenHelpKey((prev) => (prev === key ? null : key))
                  }
                />
                <select
                  value={String(draftChartConfig.limit)}
                  onChange={(event) =>
                    setDraftChartConfig((prev) => ({
                      ...prev,
                      limit: Number(event.target.value),
                    }))
                  }
                  className="h-10 w-full rounded border border-gray-400 px-3 py-2 text-xs"
                >
                  <option value="10">Top 10</option>
                  <option value="20">Top 20</option>
                  <option value="50">Top 50</option>
                  <option value="0">Semua Data</option>
                </select>
              </label>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-stone-200 bg-white shadow-md">
          <button
            type="button"
            onClick={(event) =>
              toggleConfigSection("graph", event.currentTarget)
            }
            className="scroll-mt-24 flex w-full items-center justify-between rounded-t-lg bg-sky-800 px-3 py-2 text-left text-sm font-semibold text-white"
          >
            <span>Tampilan</span>
            <AccordionToggleIcon open={showGraphConfig} size="sm" />
          </button>

          <div
            className={`${showGraphConfig ? "visible" : "invisible h-0 pointer-events-none overflow-hidden"} flex flex-col gap-6 ${showGraphConfig ? "border-t border-gray-200 p-3" : "px-3"}`}
          >
            {draftChartConfig.type === "pie" &&
              chartResult.labels.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold text-gray-700">
                    Warna Irisan
                  </p>

                  <div className="flex flex-col gap-2">
                    {chartResult.labels.map((label, index) => {
                      const key = colorKey(label);
                      const value =
                        draftChartConfig.sliceColors[key] ??
                        COLOR_PICKER_FALLBACKS[
                          index % COLOR_PICKER_FALLBACKS.length
                        ];

                      return (
                        <label
                          key={key}
                          className="flex min-w-0 grow items-center justify-between gap-3 rounded border border-gray-200 px-3 py-2 text-xs"
                        >
                          <span className="min-w-0 truncate">{label}</span>

                          <input
                            type="color"
                            value={value}
                            onChange={(event) =>
                              updateSliceColor(label, event.target.value)
                            }
                            className="h-8 w-10 cursor-pointer rounded border border-gray-300 bg-white p-0"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

            {draftChartConfig.type !== "pie" &&
              chartResult.datasets.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold text-gray-700">
                    Warna Seri
                  </p>

                  <div className="flex flex-col gap-2">
                    {chartResult.datasets.map((dataset, index) => {
                      const key = colorKey(dataset.label);
                      const value =
                        draftChartConfig.colors[key] ??
                        COLOR_PICKER_FALLBACKS[
                          index % COLOR_PICKER_FALLBACKS.length
                        ];

                      return (
                        <label
                          key={key}
                          className="flex min-w-0 grow items-center justify-between gap-3 rounded border border-gray-200 px-3 py-2 text-xs"
                        >
                          <span className="min-w-0 truncate">
                            {dataset.label}
                          </span>

                          <input
                            type="color"
                            value={value}
                            onChange={(event) =>
                              updateSeriesColor(
                                dataset.label,
                                event.target.value,
                              )
                            }
                            className="h-8 w-10 cursor-pointer rounded border border-gray-300 bg-white p-0"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
          </div>
        </div>

        {onSave && (
          <div className="hidden xl:block">
            <Button
              type="button"
              onClick={handleSave}
              loading={saving}
              disabled={saving}
              fullWidth
              className="shadow-sm"
            >
              {showSaveChangeCount
                ? withChangeCount(saveButtonLabel, visualizationChangeCount)
                : saveButtonLabel}
            </Button>
          </div>
        )}
      </div>
      )}

      <div
        className={`w-full min-w-0 ${previewOnly ? "" : "lg:w-[65%]"}`}
      >
        <div className="rounded-lg border border-stone-200 bg-white shadow-md">
          <div className="flex w-full items-center justify-between rounded-t-lg bg-sky-800 px-3 py-2 text-left text-sm font-semibold text-white">
            <span>Preview</span>
          </div>

          <div className="flex flex-row flex-wrap gap-3 p-3">
            {chartFilters.map((filter) => (
              <label
                key={filter.key}
                className="flex min-w-48 grow flex-col gap-2 text-xs"
              >
                <span className="font-semibold text-gray-700">
                  {toTitleCase(filter.label)}
                </span>
                <select
                  value={previewFilters[filter.key] ?? "all"}
                  onChange={(event) =>
                    updatePreviewFilter(filter.key, event.target.value)
                  }
                  className="h-10 w-full rounded border border-gray-400 px-3 py-2 text-xs"
                >
                  <option value="all">
                    {filter.allLabel ?? `Semua ${toTitleCase(filter.label)}`}
                  </option>

                  {(filterOptions[filter.key] ?? []).map((option) => (
                    <option key={option} value={option}>
                      {toTitleCase(option)}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          <div className="flex flex-col gap-6 px-3 pb-3">
            <div className="rounded-md border border-stone-200 bg-white p-3 shadow-sm">
              {draftChartConfig.type === "line" ||
              draftChartConfig.type === "multiple-line" ? (
                <LineCharts
                  ref={lineChartRef}
                  labels={chartResult.labels}
                  datasets={chartResult.datasets}
                  chartTitle={chartTitle}
                  datalabel={false}
                  yAxis={true}
                  xAxisTitle={xAxisLabel}
                  showLegend={draftChartConfig.showLegend}
                  rotateXLabels={chartResult.labels.length > 8 ? 45 : 0}
                  heightClassName="min-h-[75vh]"
                />
              ) : draftChartConfig.type === "pie" ? (
                <PieCharts
                  ref={pieChartRef}
                  labels={chartResult.labels}
                  datasets={[
                    {
                      ...(chartResult.datasets[0] ?? {
                        label: valueLabel,
                        values: [],
                      }),
                      backgroundColors: chartResult.labels.map(
                        (label, index) =>
                          draftChartConfig.sliceColors[colorKey(label)] ??
                          COLOR_PICKER_FALLBACKS[
                            index % COLOR_PICKER_FALLBACKS.length
                          ],
                      ),
                    },
                  ]}
                  chartTitle={chartTitle}
                  datalabel={false}
                  showLegend={draftChartConfig.showLegend}
                  heightClassName="min-h-[75vh]"
                />
              ) : (
                <BarCharts
                  ref={barChartRef}
                  labels={chartResult.labels}
                  datasets={chartResult.datasets}
                  stacked={draftChartConfig.type === "stacked-bar"}
                  histogram={draftChartConfig.type === "histogram"}
                  chartTitle={chartTitle}
                  datalabel={false}
                  yAxis={true}
                  xAxisTitle={xAxisLabel}
                  showLegend={draftChartConfig.showLegend}
                  rotateXLabels={chartResult.labels.length > 8 ? 45 : 0}
                  heightClassName="min-h-[75vh]"
                />
              )}
            </div>

            <div className="overflow-x-auto rounded-md border border-stone-200 bg-white shadow-sm">
              <table className="min-w-full text-xs">
                <thead>
                  <tr>
                    {aggregatedPreviewColumns.map((column) => (
                      <th
                        key={column}
                        className="border border-stone-200 bg-sky-100 px-3 py-2 text-left"
                      >
                        {renderTableHeaderMenu(column)}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {tablePreviewRows.length > 0 ? (
                    tablePreviewRows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {aggregatedPreviewColumns.map((column) => (
                          <td
                            key={column}
                            className={`border border-stone-200 px-3 py-2 ${
                              column === "Jumlah" ||
                              column === draftChartConfig.yLabel
                                ? "text-right"
                                : "text-left"
                            }`}
                          >
                            {formatTableValue(row[column])}
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={Math.max(aggregatedPreviewColumns.length, 1)}
                        className="border border-stone-200 px-3 py-8 text-center text-gray-500"
                      >
                        Tidak ada data.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {onSave && (
            <div className="px-3 pb-3 xl:hidden">
              <Button
                type="button"
                onClick={handleSave}
                loading={saving}
                disabled={saving}
                fullWidth
              >
                {showSaveChangeCount
                  ? withChangeCount(saveButtonLabel, visualizationChangeCount)
                  : saveButtonLabel}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
