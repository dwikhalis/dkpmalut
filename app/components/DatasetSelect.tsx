"use client";

import { useRouter } from "next/navigation";

type PageOption = {
  title: string;
  slug: string;
};

type Props = {
  datasets: PageOption[];
};

export default function DatasetSelect({ datasets }: Props) {
  const router = useRouter();

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const slug = event.target.value;

    if (!slug) return;

    router.push(`/data/${slug}`);
  };

  return (
    <div className="mt-6 w-full">
      <select
        defaultValue=""
        disabled={datasets.length === 0}
        onChange={handleChange}
        className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm shadow-sm disabled:cursor-not-allowed disabled:bg-stone-100"
      >
        <option value="" disabled>
          {datasets.length > 0
            ? "Pilih Dataset"
            : "Belum Ada Data Terpublikasi"}
        </option>

        {datasets.map((dataset, idx) => (
          <option key={idx} value={dataset.slug}>
            {dataset.title}
          </option>
        ))}
      </select>
    </div>
  );
}
