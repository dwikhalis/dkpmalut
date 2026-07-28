"use client";

import Link from "next/link";

type PageOption = {
  tag: string[];
};

type Props = {
  datasets: PageOption[];
  selectedTag?: string | null;
};

function formatTagLabel(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("id-ID")
    .replace(/[_-]+/g, " ")
    .replace(/(^|\s)\p{L}/gu, (letter) =>
      letter.toLocaleUpperCase("id-ID"),
    );
}

export default function DatasetSelect({ datasets, selectedTag = null }: Props) {
  const tags = Array.from(
    new Set(
      datasets
        .flatMap((dataset) => dataset.tag)
        .map((tag) => tag.trim())
        .filter((tag): tag is string => Boolean(tag)),
    ),
  ).sort((a, b) => a.localeCompare(b, "id-ID"));

  return (
    <div className="mt-6 w-full" aria-labelledby="dataset-selector-heading">
      <h2
        id="dataset-selector-heading"
        className="text-sm font-semibold text-stone-800"
      >
        Pilih Tag
      </h2>

      {tags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/data"
            aria-current={!selectedTag ? "page" : undefined}
            className={`rounded-full border px-4 py-2 text-sm font-medium shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 ${
              !selectedTag
                ? "border-sky-700 bg-sky-700 text-white"
                : "border-sky-200 bg-white text-sky-800 hover:border-sky-700 hover:bg-sky-700 hover:text-white"
            }`}
          >
            Semua
          </Link>

          {tags.map((tag) => (
            <Link
              key={tag}
              href={`/data?tag=${encodeURIComponent(tag)}`}
              aria-current={selectedTag === tag ? "page" : undefined}
              className={`rounded-full border px-4 py-2 text-sm font-medium shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 ${
                selectedTag === tag
                  ? "border-sky-700 bg-sky-700 text-white"
                  : "border-sky-200 bg-white text-sky-800 hover:border-sky-700 hover:bg-sky-700 hover:text-white"
              }`}
            >
              {formatTagLabel(tag)}
            </Link>
          ))}
        </div>
      ) : (
        <p className="mt-3 rounded-lg border border-stone-200 bg-stone-100 px-4 py-3 text-sm text-stone-500">
          Belum ada tag data terpublikasi
        </p>
      )}
    </div>
  );
}
