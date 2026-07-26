"use client";

import type {
  PublishedChartConfig,
  PublishedTableConfig,
} from "@/lib/utils/publishedConfig";
import DataChart from "./DataChart";
import type { ColumnConfig, FilterConfig } from "./DataPublishTable";

type Props = {
  datasetId: string;
  columns: ColumnConfig[];
  filters?: FilterConfig[];
  tableConfig?: PublishedTableConfig;
  chartConfig?: Partial<PublishedChartConfig>;
  selectedFilters?: Record<string, string>;
  sortBy?: string;
  onFilterChange?: (key: string, value: string) => void;
  onSortChange?: (value: string) => void;
  isLoggedIn?: boolean;
  onLoginRequired?: () => void;
  onCsvDataChange?: (data: {
    headers: string[];
    rows: Array<Array<string | number>>;
  }) => void;
};

export default function DataPublishChart({
  datasetId,
  columns,
  filters = [],
  tableConfig,
  chartConfig,
  selectedFilters,
  sortBy,
  onFilterChange,
  onSortChange,
  isLoggedIn,
  onLoginRequired,
  onCsvDataChange,
}: Props) {
  return (
    <DataChart
      datasetId={datasetId}
      columns={columns}
      filters={filters}
      tableConfig={tableConfig}
      chartConfig={chartConfig}
      readOnly
      externalSelectedFilters={selectedFilters}
      externalSortBy={sortBy}
      onExternalFilterChange={onFilterChange}
      onExternalSortChange={onSortChange}
      isLoggedIn={isLoggedIn}
      onLoginRequired={onLoginRequired}
      onReadOnlyCsvDataChange={onCsvDataChange}
    />
  );
}
