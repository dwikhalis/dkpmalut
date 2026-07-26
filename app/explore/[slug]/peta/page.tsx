import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import ChartKKD from "@/app/components/ChartKKD";
import type { KkdId } from "@/app/components/configKKD";
import { conservationZones } from "@/lib/conservation/publicDocuments";

type PageProps = { params: Promise<{ slug: string }> };

const mapIds: Record<string, KkdId> = {
  widi: "widi",
  "makian-moti": "makian_moti",
  guraici: "guraici",
  mare: "mare",
  "rao-dehegila": "rao_dehegila",
  sula: "sula",
};

export function generateStaticParams() {
  return conservationZones.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const zone = conservationZones.find((item) => item.slug === slug);

  return zone
    ? {
        title: `Peta Interaktif ${zone.shortName} | Kawasan Konservasi`,
        description: `Jelajahi zonasi ${zone.shortName} melalui peta interaktif.`,
      }
    : {};
}

export default async function ExploreMapPage({ params }: PageProps) {
  const { slug } = await params;
  const zone = conservationZones.find((item) => item.slug === slug);
  const mapId = mapIds[slug];

  if (!zone || !mapId) notFound();

  return (
    <main className="min-h-[70vh] bg-transparent py-6">
      <div className="px-5 md:px-12 lg:px-24">
        <div className="mx-auto mb-5 max-w-7xl">
          <Link
            href={`/explore/${zone.slug}`}
            className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 shadow-sm transition hover:border-sky-500 hover:text-sky-800"
          >
            <span aria-hidden="true">←</span>
            Kembali ke {zone.shortName}
          </Link>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-stone-600">
            Pilih legenda untuk menyorot zona tertentu. Klik area pada peta untuk melihat informasi zonasinya.
          </p>
        </div>
      </div>

      <ChartKKD initialKkd={mapId} showDataNavigation={false} />
    </main>
  );
}
