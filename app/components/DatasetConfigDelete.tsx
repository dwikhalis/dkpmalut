"use client";

type DeleteRow = {
  id: string;
  label: string;
  ownerName: string;
  dataCount: number;
};

type Props = {
  deleteRows: DeleteRow[];
  selectedDeleteIds: string[];
  toggleDeleteId: (id: string) => void;
  toggleSelectAllDelete: () => void;
};

export default function DatasetConfigDelete({
  deleteRows,
  selectedDeleteIds,
  toggleDeleteId,
  toggleSelectAllDelete,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-md border border-gray-300">
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              <th className="border border-gray-300 bg-sky-100 px-3 py-2 text-center">
                <input
                  type="checkbox"
                  checked={
                    deleteRows.length > 0 &&
                    selectedDeleteIds.length === deleteRows.length
                  }
                  onChange={toggleSelectAllDelete}
                />
              </th>
              <th className="border border-gray-300 bg-sky-100 px-3 py-2">
                Label
              </th>
              <th className="border border-gray-300 bg-sky-100 px-3 py-2">
                Pemilik
              </th>
              <th className="border border-gray-300 bg-sky-100 px-3 py-2">
                Jumlah Data
              </th>
            </tr>
          </thead>

          <tbody>
            {deleteRows.map((row) => (
              <tr key={row.id}>
                <td className="border border-gray-300 px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={selectedDeleteIds.includes(row.id)}
                    onChange={() => toggleDeleteId(row.id)}
                  />
                </td>

                <td className="border border-gray-300 px-3 py-2">
                  {row.label}
                </td>

                <td className="border border-gray-300 px-3 py-2">
                  {row.ownerName}
                </td>

                <td className="border border-gray-300 px-3 py-2 text-right">
                  {row.dataCount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
