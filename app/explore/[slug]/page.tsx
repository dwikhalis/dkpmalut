import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { supabase } from "@/lib/supabase/supabaseClient";
import {
  CONSERVATION_AREA_SELECT,
  localizedText,
  type ConservationAreaRow,
} from "@/lib/conservation/areas";
import ExploreAreaDetail from "./ExploreAreaDetail";

type PageProps = { params: Promise<{ slug: string }> };
export const dynamic = "force-dynamic";

async function getArea(publicSlug: string) {
  const { data } = await supabase
    .from("conservation_areas")
    .select(CONSERVATION_AREA_SELECT)
    .eq("slug", publicSlug)
    .eq("is_active", true)
    .maybeSingle();
  return data as ConservationAreaRow | null;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const area = await getArea(slug);
  return area
    ? {
        title: `${localizedText(area.short_name, "id", area.name)} | Kawasan Konservasi`,
        description: localizedText(area.summary, "id"),
      }
    : {};
}

export default async function ExploreZonePage({ params }: PageProps) {
  const { slug } = await params;
  const area = await getArea(slug);
  if (!area) notFound();
  return <ExploreAreaDetail area={area} publicSlug={slug} />;
}
