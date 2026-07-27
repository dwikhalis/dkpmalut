"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/supabaseClient";

type DatasetResult = {
  id: string;
  label: string | null;
  tag: string[] | string | null;
};

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function datasetTags(value: DatasetResult["tag"]): string[] {
  if (Array.isArray(value)) return value.filter(Boolean);
  return value?.trim() ? [value] : [];
}

export default function HeroDatasetResults() {
  const searchParams = useSearchParams();
  const [datasets, setDatasets] = useState<DatasetResult[]>([]);
  const [activeTag, setActiveTag] = useState("all");
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const showResults = searchParams.get("show_results") === "1";
  const mode = searchParams.get("filter_by");
  const kabupaten = searchParams.get("kabupaten");
  const subWpp = searchParams.get("sub_wpp");
  const kkpd = searchParams.get("kkpd");

  useEffect(() => {
    let cancelled = false;

    async function loadDatasets() {
      if (!showResults) {
        setDatasets([]);
        setFailed(false);
        return;
      }

      setLoading(true);
      setFailed(false);

      let query = supabase
        .from("datasets")
        .select("id, label, tag")
        .eq("published", "approved")
        .order("label", { ascending: true });

      if (mode === "kabupaten" && kabupaten) {
        query = query.contains("data_regency", [kabupaten]);
      } else if (mode === "kabupaten") {
        // "Tampilkan Semua" in Kabupaten mode includes every approved dataset.
      } else if (mode === "sub-wpp" && subWpp) {
        query = query.contains("data_subwpp", [subWpp]);
      } else if (mode === "sub-wpp") {
        query = query.not("data_subwpp", "is", null);
      } else if (mode === "kkpd" && kkpd) {
        query = query.contains("data_kkpd", [kkpd]);
      } else if (mode === "kkpd") {
        query = query.not("data_kkpd", "is", null);
      } else {
        setDatasets([]);
        setLoading(false);
        return;
      }

      const { data, error } = await query;
      if (cancelled) return;

      if (error) {
        console.error("Failed to fetch mapped Hero datasets:", error);
        setDatasets([]);
        setFailed(true);
      } else {
        setDatasets((data ?? []) as DatasetResult[]);
      }

      setLoading(false);
    }

    void loadDatasets();

    return () => {
      cancelled = true;
    };
  }, [kabupaten, kkpd, mode, showResults, subWpp]);

  const availableTags = useMemo(
    () =>
      Array.from(
        new Set(datasets.flatMap((dataset) => datasetTags(dataset.tag))),
      ).sort((a, b) => a.localeCompare(b, "id-ID")),
    [datasets],
  );

  const filteredDatasets = useMemo(
    () =>
      activeTag === "all"
        ? datasets
        : datasets.filter((dataset) =>
            datasetTags(dataset.tag).includes(activeTag),
          ),
    [activeTag, datasets],
  );

  useEffect(() => {
    if (activeTag !== "all" && !availableTags.includes(activeTag)) {
      setActiveTag("all");
    }
  }, [activeTag, availableTags]);

  if (!showResults) return null;

  return (
    <div className="mx-auto mt-12 max-w-6xl">
      <div className="mb-6">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-sky-700">
          Hasil Pencarian
        </p>
        <h3 className="mt-2 text-2xl font-semibold text-sky-950">
          Dataset Terkait
        </h3>

        {availableTags.length > 0 && (
          <div
            className="mt-4 flex flex-wrap gap-2"
            aria-label="Filter dataset berdasarkan tag"
          >
            <button
              type="button"
              aria-pressed={activeTag === "all"}
              onClick={() => setActiveTag("all")}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTag === "all"
                  ? "border-sky-700 bg-sky-700 text-white"
                  : "border-sky-200 bg-white text-sky-800 hover:bg-sky-100"
              }`}
            >
              Semua
            </button>
            {availableTags.map((tag) => (
              <button
                key={tag}
                type="button"
                aria-pressed={activeTag === tag}
                onClick={() => setActiveTag(tag)}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                  activeTag === tag
                    ? "border-sky-700 bg-sky-700 text-white"
                    : "border-sky-200 bg-white text-sky-800 hover:bg-sky-100"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && (
        <div
          className="h-32 animate-pulse rounded-2xl bg-sky-100"
          aria-label="Memuat dataset terkait"
        />
      )}

      {!loading && failed && (
        <p className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
          Dataset terkait gagal dimuat. Silakan coba kembali.
        </p>
      )}

      {!loading && !failed && datasets.length === 0 && (
        <p className="rounded-2xl border border-sky-200 bg-white p-5 text-stone-600">
          Belum ada dataset terpublikasi untuk wilayah yang dipilih.
        </p>
      )}

      {!loading && !failed && datasets.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredDatasets.map((dataset) => {
            const title = dataset.label?.trim() || "Dataset tanpa judul";
            const tags = datasetTags(dataset.tag);

            return (
              <Link
                key={dataset.id}
                href={`/data/${toSlug(title)}`}
                className="group block rounded-2xl bg-white p-5 shadow-md ring-1 ring-stone-200 transition duration-200 hover:-translate-y-1 hover:shadow-xl"
              >
                <article className="flex items-start justify-between gap-4">
                  <h4 className="min-w-0 text-lg font-bold leading-snug text-stone-900 group-hover:text-sky-800">
                    {title}
                  </h4>

                  {tags.length > 0 && (
                    <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold capitalize text-sky-800"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              </Link>
            );
          })}
        </div>
      )}

      {!loading &&
        !failed &&
        datasets.length > 0 &&
        filteredDatasets.length === 0 && (
          <p className="rounded-2xl border border-sky-200 bg-white p-5 text-stone-600">
            Tidak ada dataset dengan tag yang dipilih.
          </p>
        )}
    </div>
  );
}
