import DataTable, { type ColumnConfig, type FilterConfig } from "./DataTable";

const tangkapColumns: ColumnConfig[] = [
  {
    key: "kab",
    label: "Kabupaten",
    align: "left",
  },
  {
    key: "year",
    label: "Tahun",
    align: "center",
  },
  {
    key: "semester",
    label: "Semester",
    editable: true,
    inputType: "number",
    align: "center",
  },
  {
    key: "landing",
    label: "Pendaratan",
    editable: true,
    inputType: "text",
    align: "left",
  },
  {
    key: "name",
    label: "Nama Ikan",
    editable: true,
    inputType: "text",
    align: "left",
  },
  {
    key: "weight",
    label: "Berat (kg)",
    editable: true,
    inputType: "number",
    align: "right",
  },
];

const tangkapFilters: FilterConfig[] = [
  {
    key: "year",
    label: "Tahun",
    allLabel: "Semua Tahun",
    sort: "number-desc",
  },
  {
    key: "kab",
    label: "Kabupaten",
    allLabel: "Semua Kabupaten",
    sort: "text-asc",
  },
  {
    key: "name",
    label: "Ikan",
    allLabel: "Semua Ikan",
    sort: "text-asc",
  },
];

export default function DataTangkap({
  action,
  saveData,
  onSignalUpdated,
}: {
  action: "add" | "edit" | "list" | "delete";
  saveData: number;
  onSignalUpdated: (signal: string) => void;
}) {
  return (
    <DataTable
      action={action}
      saveData={saveData}
      onSignalUpdated={onSignalUpdated}
      datasetName="tangkap"
      columns={tangkapColumns}
      filters={tangkapFilters}
      defaultSortKey="kab"
    />
  );
}
