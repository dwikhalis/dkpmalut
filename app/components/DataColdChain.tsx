import DataTable, { type ColumnConfig, type FilterConfig } from "./DataTable";

const coldChainColumns: ColumnConfig[] = [
  {
    key: "tahun_ops",
    label: "Tahun Beroperasi",
    editable: true,
    inputType: "number",
    align: "center",
  },
  {
    key: "type",
    label: "Tipe Usaha",
    editable: true,
    inputType: "string",
    align: "center",
  },
  {
    key: "name",
    label: "Nama Usaha",
    editable: true,
    inputType: "string",
    align: "left",
  },
  {
    key: "area",
    label: "Area",
    editable: true,
    inputType: "string",
    align: "center",
  },
  {
    key: "kodkws",
    label: "Kode KWS",
    editable: true,
    inputType: "string",
    align: "center",
  },
  {
    key: "kab",
    label: "Kabupaten",
    editable: true,
    inputType: "string",
    align: "left",
  },
];

const coldChainFilters: FilterConfig[] = [
  {
    key: "tahun_ops",
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
}: {
  action: "add" | "edit" | "list";
}) {
  return (
    <DataTable
      action={action}
      datasetName="cold_chain"
      columns={coldChainColumns}
      filters={coldChainFilters}
      defaultSortKey="year"
    />
  );
}
