import DataTable, { type ColumnConfig, type FilterConfig } from "./DataTable";

const datasetsColumns: ColumnConfig[] = [
  { key: "year", label: "Tahun" },
  { key: "kab", label: "Kabupaten" },
  {
    key: "jum_rtp",
    label: "RTP",
    editable: true,
    inputType: "number",
    align: "right",
  },
  {
    key: "jum_pembudidaya",
    label: "Pembudidaya (org)",
    editable: true,
    inputType: "number",
    align: "right",
  },
  {
    key: "luas_lahan",
    label: "Luas Lahan (ha)",
    editable: true,
    inputType: "number",
    align: "right",
  },
  {
    key: "tot_produksi",
    label: "Produksi (ton)",
    editable: true,
    inputType: "number",
    align: "right",
  },
];

const datasetsFilters: FilterConfig[] = [
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
];

export default function DataDatasets({
  action,
  saveData,
  onSignalAction,
}: {
  action: "add" | "edit" | "list" | "delete";
  saveData: number;
  onSignalAction: (signal: string) => void;
}) {
  return (
    <DataTable
      action={action}
      saveData={saveData}
      onSignalAction={onSignalAction}
      datasetName="budidaya"
      columns={datasetsColumns}
      filters={datasetsFilters}
      defaultSortKey="kab"
    />
  );
}
