import DataTable, { type ColumnConfig, type FilterConfig } from "./DataTable";

const coldChainColumns: ColumnConfig[] = [
  {
    key: "year",
    label: "Tahun Ops",
    editable: true,
    inputType: "number",
    align: "center",
  },
  {
    key: "type",
    label: "Tipe Usaha",
    editable: true,
    inputType: "text",
    align: "center",
  },
  {
    key: "name",
    label: "Nama Usaha",
    editable: true,
    inputType: "text",
    align: "left",
  },
  {
    key: "area",
    label: "Area",
    editable: true,
    inputType: "text",
    align: "center",
  },
  {
    key: "kodkws",
    label: "Kode KWS",
    editable: true,
    inputType: "text",
    align: "center",
  },
  {
    key: "kab",
    label: "Kabupaten",
    editable: true,
    inputType: "text",
    align: "left",
  },
];

const coldChainFilters: FilterConfig[] = [
  {
    key: "year",
    label: "Tahun Ops",
    allLabel: "Semua Tahun",
    sort: "number-desc",
  },
  {
    key: "type",
    label: "Tipe Usaha",
    allLabel: "Semua Tipe",
    sort: "text-asc",
  },
  {
    key: "name",
    label: "Nama Usaha",
    allLabel: "Semua Usaha",
    sort: "text-asc",
  },
];

export default function DataColdChain({
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
      datasetName="cold_chain"
      columns={coldChainColumns}
      filters={coldChainFilters}
      defaultSortKey="year"
    />
  );
}
