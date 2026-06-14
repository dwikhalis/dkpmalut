import DataTable, { type ColumnConfig, type FilterConfig } from "./DataTable";

interface Props {
  action: "add" | "edit" | "list";
}

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
    inputType: "string",
    align: "left",
  },
  {
    key: "name",
    label: "Nama Ikan",
    editable: true,
    inputType: "string",
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

export default function DataTangkap({ action }: Props) {
  return (
    <DataTable
      action={action}
      datasetName="tangkap"
      columns={tangkapColumns}
      filters={tangkapFilters}
      defaultSortKey="kab"
    />
  );
}
