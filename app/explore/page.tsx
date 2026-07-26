import type { Metadata } from "next";

import { supabase } from "@/lib/supabase/supabaseClient";
import {
  CONSERVATION_AREA_SELECT,
  type ConservationAreaRow,
} from "@/lib/conservation/areas";
import {
  CmsPageCta,
  CmsPageHeader,
  CmsPageProvider,
} from "../components/CmsPageContent";
import ExploreAreaList from "./ExploreAreaList";

export const metadata: Metadata = {
  title: "Kawasan Konservasi | DKP Maluku Utara",
  description:
    "Informasi kawasan konservasi perairan, pesisir, dan pulau-pulau kecil di Provinsi Maluku Utara.",
};
export const dynamic = "force-dynamic";

export default async function ExplorePage() {
  const { data, error } = await supabase
    .from("conservation_areas")
    .select(CONSERVATION_AREA_SELECT)
    .eq("is_active", true)
    .order("display_order", { ascending: true });
  if (error)
    console.error("Fetching conservation areas failed:", error.message);
  return (
    <main className="mx-auto min-h-[70vh] w-full max-w-7xl bg-transparent p-6 md:p-10">
      <CmsPageProvider component="page_explore">
        <CmsPageHeader
          prefix="page_explore"
          eyebrowFallback="Informasi Resmi"
          titleFallback="Kawasan Konservasi"
          subtitleFallback="Kawasan konservasi perairan, pesisir, dan pulau-pulau kecil Maluku Utara."
        />
        <ExploreAreaList areas={(data ?? []) as ConservationAreaRow[]} />
        <CmsPageCta
          prefix="page_explore"
          titleFallback="Rencanakan Kunjungan"
          contentFallback="Periksa kondisi kawasan, zonasi, ketentuan aktivitas, dan arahan petugas sebelum berkunjung."
          button1LabelFallback="Beli Tiket"
          button1PathFallback="/payment"
          button2LabelFallback="Lihat Semua Peraturan"
          button2PathFallback="/peraturan"
        />
      </CmsPageProvider>
    </main>
  );
}
