import { supabase } from "@/lib/supabase/supabaseClient";
import ChartGeneric from "@/app/components/ChartGeneric";
import MapPublic from "@/app/components/Maps/MapPublic";

interface Props {
  params: Promise<{ slug: string }>;
}

type PageOption = {
  title: string;
  slug: string;
};

type PublishedMitraDataset = {
  label: string | null;
};

type PublishedMapDataset = {
  label: string | null;
};

export const dynamic = "force-dynamic";

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

async function getPublishedMitraPages(): Promise<PageOption[]> {
  const { data, error } = await supabase
    .from("datasets")
    .select("label")
    .eq("published", "approved")
    .order("label", { ascending: true });

  if (error) {
    console.error("Failed to fetch published datasets labels:", error);
    return [];
  }

  const rows = (data ?? []) as PublishedMitraDataset[];

  return rows
    .filter((row) => row.label && row.label.trim() !== "")
    .map((row) => {
      const label = row.label ?? "";

      return {
        title: label,
        slug: toSlug(label),
      };
    });
}

async function getPublishedMapPages(): Promise<PageOption[]> {
  const { data, error } = await supabase
    .from("map_datasets")
    .select("label")
    .eq("published", "approved")
    .order("label", { ascending: true });

  if (error) {
    console.error("Failed to fetch published map labels:", error);
    return [];
  }

  return ((data ?? []) as PublishedMapDataset[])
    .filter((row) => row.label && row.label.trim() !== "")
    .map((row) => {
      const label = row.label ?? "";

      return {
        title: label,
        slug: toSlug(label),
      };
    });
}

function mergePages(staticPages: PageOption[], dynamicPages: PageOption[]) {
  const pageMap = new Map<string, PageOption>();

  [...staticPages, ...dynamicPages].forEach((page) => {
    if (!pageMap.has(page.slug)) {
      pageMap.set(page.slug, page);
    }
  });

  return Array.from(pageMap.values());
}

export default async function Page({ params }: Props) {
  const { slug } = await params;

  const [publishedMitraPages, publishedMapPages] = await Promise.all([
    getPublishedMitraPages(),
    getPublishedMapPages(),
  ]);
  const pages = mergePages([], [
    ...publishedMitraPages,
    ...publishedMapPages,
  ]);

  if (publishedMapPages.some((page) => page.slug === slug)) {
    return <MapPublic slug={slug} pages={pages} />;
  }

  return <ChartGeneric slug={slug} pages={pages} />;
}
