import { Suspense } from "react";
import CardData from "../components/CardData";
import DatasetSelect from "../components/DatasetSelect";
import SpinnerLoading from "../components/SpinnerLoading";
import { supabase } from "@/lib/supabase/supabaseClient";
import { getImagePreviewUrl } from "@/lib/supabase/supabaseHelper";
import { PageHeader } from "../components/CmsPageContent";

export const revalidate = 0;

export type DataPageOption = {
  id?: string;
  title: string;
  slug: string;
  image: string;
  tag: string[];
  pathRedirect?: string | null;
};

type PublishedMitraDataset = {
  id: string;
  label: string | null;
  image_path: string;
  tag: string[] | string | null;
  path_redirect: string | null;
};

type PublishedMapDataset = {
  id: string;
  label: string | null;
  image_path: string | null;
  tag: string[] | string | null;
};

type PublishedLbiDataset = {
  id: string;
  dataset_name: string;
  slug: string;
  image_path: string | null;
  tag: string[] | string | null;
};

const STATIC_PAGES: DataPageOption[] = [];

function normalizeTags(value: string[] | string | null): string[] {
  if (Array.isArray(value)) return value.filter(Boolean);
  return value?.trim() ? [value] : [];
}

function formatTagLabel(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("id-ID")
    .replace(/[_-]+/g, " ")
    .replace(/(^|\s)\p{L}/gu, (letter) =>
      letter.toLocaleUpperCase("id-ID"),
    );
}

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

async function DatasetContent({ selectedTag }: { selectedTag: string | null }) {
  const { data, error } = await supabase
    .from("datasets")
    .select("id, label, image_path, tag, path_redirect")
    .eq("published", "approved")
    .order("label", { ascending: true });

  if (error) {
    console.error("Failed to fetch published datasets:", error);

    return (
      <p className="mt-10 text-red-600">
        Data gagal dimuat. Silakan coba kembali.
      </p>
    );
  }

  const rows = (data ?? []) as PublishedMitraDataset[];

  const [{ data: mapData, error: mapError }, { data: lbiData, error: lbiError }] =
    await Promise.all([
      supabase
        .from("map_datasets")
        .select("id, label, image_path, tag")
        .eq("published", "approved")
        .order("label", { ascending: true }),
      supabase
        .from("lbi_datasets")
        .select("id, dataset_name, slug, image_path, tag")
        .eq("published", "approved")
        .order("dataset_name", { ascending: true }),
    ]);

  if (mapError) {
    console.error("Failed to fetch published map datasets:", mapError);
  }
  if (lbiError) {
    console.error("Failed to fetch published LBI datasets:", lbiError);
  }

  const publishedDatasets: DataPageOption[] = rows
    .filter(
      (
        row,
      ): row is PublishedMitraDataset & {
        label: string;
      } => Boolean(row.label?.trim()),
    )
    .map((row) => ({
      id: row.id,
      title: row.label,
      slug: toSlug(row.label),
      image: row.image_path,
      tag: normalizeTags(row.tag),
      pathRedirect: row.path_redirect,
    }));

  const publishedMaps: DataPageOption[] = (
    (mapData ?? []) as PublishedMapDataset[]
  )
    .filter((row) => Boolean(row.label?.trim()))
    .map((row) => ({
      id: row.id,
      title: row.label ?? "",
      slug: toSlug(row.label ?? ""),
      image: row.image_path || "charts/pic_data_kkd.png",
      tag: normalizeTags(row.tag),
    }));

  const publishedLbi: DataPageOption[] = (
    (lbiData ?? []) as PublishedLbiDataset[]
  ).map((row) => ({
    id: row.id,
    title: row.dataset_name,
    slug: `lbi/${row.slug}`,
    image: row.image_path || "charts/pic_data_perikanan_kelas.png",
    tag: normalizeTags(row.tag),
  }));

  function mergePages(
    staticPages: DataPageOption[],
    dynamicPages: DataPageOption[],
  ) {
    const pageMap = new Map<string, DataPageOption>();

    [...staticPages, ...dynamicPages].forEach((page) => {
      if (!pageMap.has(page.slug)) {
        pageMap.set(page.slug, page);
      }
    });

    return Array.from(pageMap.values());
  }

  const pages = mergePages(STATIC_PAGES, [
    ...publishedDatasets,
    ...publishedMaps,
    ...publishedLbi,
  ]);
  const filteredPages = selectedTag
    ? pages.filter((page) => page.tag.includes(selectedTag))
    : pages;

  if (
    publishedDatasets.length === 0 &&
    publishedMaps.length === 0 &&
    publishedLbi.length === 0
  ) {
    return <p className="mt-10">Belum ada data terpublikasi.</p>;
  }

  return (
    <>
      <DatasetSelect datasets={pages} selectedTag={selectedTag} />

      <div className="mt-12 flex w-full flex-col gap-6 md:flex-row md:flex-wrap lg:gap-10">
        {filteredPages.map((dataset, idx) => (
          <div
            className="min-w-0 w-full md:flex-[1_1_calc(50%-0.75rem)] lg:flex-[1_1_calc(33.333%-1.667rem)]"
            key={idx}
          >
            <CardData
              tag={
                dataset.tag.length > 0
                  ? dataset.tag.map(formatTagLabel).join(", ")
                  : null
              }
              title={dataset.title}
              image={getImagePreviewUrl(dataset.image) ?? ""}
              link={dataset.pathRedirect || `/data/${dataset.slug}`}
              external={Boolean(dataset.pathRedirect)}
              resourceId={dataset.id}
            />
          </div>
        ))}
      </div>

      {filteredPages.length === 0 && (
        <p className="mt-10 rounded-xl border border-sky-200 bg-sky-50 p-5 text-stone-600">
          Tidak ada dataset dengan tag yang dipilih.
        </p>
      )}
    </>
  );
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string | string[] }>;
}) {
  const params = await searchParams;
  const selectedTag =
    typeof params.tag === "string" && params.tag.trim()
      ? params.tag.trim()
      : null;

  return (
    <main className="mx-auto min-h-[70vh] w-full max-w-7xl p-6 md:p-10">
      <PageHeader
        eyebrow="Data Publik"
        title="Data Kelautan Perikanan"
        subtitle="Data seputar Kelautan dan Perikanan di Provinsi Maluku Utara."
      />

      <div className="mt-8">
        <Suspense fallback={<SpinnerLoading size="sm" color="black" />}>
          <DatasetContent selectedTag={selectedTag} />
        </Suspense>
      </div>
    </main>
  );
}
