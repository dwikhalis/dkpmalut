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
  tag: string | null;
};

type PublishedMitraDataset = {
  id: string;
  label: string | null;
  image_path: string;
  tag: string | null;
};

type PublishedMapDataset = {
  id: string;
  label: string | null;
  image_path: string | null;
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

async function DatasetContent() {
  const { data, error } = await supabase
    .from("datasets")
    .select("id, label, image_path, tag")
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

  const { data: mapData, error: mapError } = await supabase
    .from("map_datasets")
    .select("id, label, image_path, tag")
    .eq("published", "approved")
    .order("label", { ascending: true });

  if (mapError) {
    console.error("Failed to fetch published map datasets:", mapError);
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
      tag: row.tag,
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
      tag: Array.isArray(row.tag) ? (row.tag[0] ?? null) : row.tag,
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

  const pages = mergePages([], [
    ...publishedDatasets,
    ...publishedMaps,
  ]);

  if (publishedDatasets.length === 0 && publishedMaps.length === 0) {
    return <p className="mt-10">Belum ada data terpublikasi.</p>;
  }

  return (
    <>
      <DatasetSelect datasets={pages} />

      <div className="mt-12 flex w-full flex-col gap-6 md:flex-row md:flex-wrap lg:gap-10">
        {pages.map((dataset, idx) => (
          <div
            className="min-w-0 w-full md:flex-[1_1_calc(50%-0.75rem)] lg:flex-[1_1_calc(33.333%-1.667rem)]"
            key={idx}
          >
            <CardData
              tag={dataset.tag}
              title={dataset.title}
              image={getImagePreviewUrl(dataset.image) ?? ""}
              link={`/data/${dataset.slug}`}
            />
          </div>
        ))}
      </div>
    </>
  );
}

export default function Page() {
  return (
    <main className="mx-auto min-h-[70vh] w-full max-w-7xl p-6 md:p-10">
      <PageHeader
        eyebrow="Data Publik"
        title="Data Kelautan Perikanan"
        subtitle="Data seputar Kelautan dan Perikanan di Provinsi Maluku Utara."
      />

      <div className="mt-8">
        <Suspense fallback={<SpinnerLoading size="sm" color="black" />}>
          <DatasetContent />
        </Suspense>
      </div>
    </main>
  );
}
