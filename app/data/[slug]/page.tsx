import { supabase } from "@/lib/supabase/supabaseClient";
import ChartAquaculture from "@/app/components/ChartAquaculture";
import ChartColdChain from "@/app/components/ChartColdChain";
import ChartGeneric from "@/app/components/ChartGeneric";
import ChartKKD from "@/app/components/ChartKKD";
import ChartProductionClassFish from "@/app/components/ChartProductionClassFish";
import ChartProductionKabFilter from "@/app/components/ChartProductionKabFilter";

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

export const dynamic = "force-dynamic";

const STATIC_PAGES: PageOption[] = [
  {
    title: "Produksi Perikanan Tangkap dan Budidaya per Kabupaten",
    slug: "produksi-perikanan-kabupaten",
  },
  {
    title: "Produksi Perikanan Tangkap per Komoditas",
    slug: "produksi-komoditas",
  },
  {
    title: "Gambaran Umum Perikanan Budidaya Provinsi Maluku Utara",
    slug: "perikanan-budidaya-maluku-utara",
  },
  {
    title: "Infrastruktur Rantai Dingin",
    slug: "infrastruktur-rantai-dingin",
  },
  {
    title: "Kawasan Konservasi Daerah",
    slug: "kawasan-konservasi-daerah",
  },
];

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
    .from("data_mitra")
    .select("label")
    .eq("published", "approved")
    .order("label", { ascending: true });

  if (error) {
    console.error("Failed to fetch published data_mitra labels:", error);
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

  const publishedMitraPages = await getPublishedMitraPages();
  const pages = mergePages(STATIC_PAGES, publishedMitraPages);

  if (slug === "produksi-perikanan-kabupaten") {
    return <ChartProductionKabFilter pages={pages} />;
  }

  if (slug === "produksi-komoditas") {
    return <ChartProductionClassFish pages={pages} />;
  }

  if (slug === "perikanan-budidaya-maluku-utara") {
    return <ChartAquaculture pages={pages} />;
  }

  if (slug === "infrastruktur-rantai-dingin") {
    return <ChartColdChain pages={pages} />;
  }

  if (slug === "kawasan-konservasi-daerah") {
    return <ChartKKD pages={pages} />;
  }

  return <ChartGeneric slug={slug} pages={pages} />;
}
