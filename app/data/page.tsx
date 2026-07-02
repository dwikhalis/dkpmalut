"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CardData from "../components/CardData";
import { supabase } from "@/lib/supabase/supabaseClient";

export type DataPageOption = {
  title: string;
  slug: string;
};

export type PublishedMitraDataset = {
  id: string;
  label: string | null;
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

export default function Page() {
  const router = useRouter();

  const [publishedDatasets, setPublishedDatasets] = useState<DataPageOption[]>(
    [],
  );

  const title: DataPageOption[] = useMemo(
    () => [
      { title: "Home", slug: "home" },
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
    ],
    [],
  );

  useEffect(() => {
    const fetchPublishedDatasets = async () => {
      try {
        const { data, error } = await supabase
          .from("data_mitra")
          .select("id, label")
          .eq("published", "approved")
          .order("label", { ascending: true });

        if (error) throw error;

        const rows = (data ?? []) as PublishedMitraDataset[];

        const parsedRows = rows
          .filter((row) => row.label && row.label.trim() !== "")
          .map((row) => ({
            title: row.label ?? "",
            slug: toSlug(row.label ?? ""),
          }));

        setPublishedDatasets(parsedRows);
      } catch (error) {
        console.error("Failed to fetch published datasets:", error);
        setPublishedDatasets([]);
      }
    };

    fetchPublishedDatasets();
  }, []);

  const dropdownOptions = useMemo(() => {
    const staticSlugs = new Set(title.map((item) => item.slug));

    const uniquePublishedDatasets = publishedDatasets.filter(
      (item) => !staticSlugs.has(item.slug),
    );

    return [...title, ...uniquePublishedDatasets];
  }, [title, publishedDatasets]);

  return (
    <section className="flex min-h-[100vh] flex-col">
      <div className="flex flex-col lg:mx-12 2xl:mx-24 mx-8 lg:my-12 my-8">
        <div>
          <h2>Data Kelautan Perikanan</h2>
          <h5>Data seputar Kelautan dan Perikanan di Provinsi Maluku Utara</h5>
        </div>

        {/* Regular Dropdown */}
        <div className="mt-6 w-full">
          <select
            defaultValue=""
            onChange={(event) => {
              const slug = event.target.value;

              if (!slug) return;

              router.push(`/data/${slug}`);
            }}
            className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm shadow-sm"
          >
            <option value="" disabled>
              Pilih Dataset
            </option>

            {dropdownOptions.map((item) => {
              if (item.title === "Home") return null;

              return (
                <option key={item.slug} value={item.slug}>
                  {item.title}
                </option>
              );
            })}
          </select>
        </div>

        <div className="mt-12 flex w-full flex-wrap justify-between gap-6 md:justify-start lg:gap-10">
          <div className="w-[45%] md:w-[30%]">
            <CardData
              tag="Tangkap, Budidaya"
              title="Produksi Perikanan Tangkap dan Budidaya per Kabupaten"
              image="/assets/pic_data_perikanan_kabupaten.png"
              link="/data/produksi-perikanan-kabupaten"
            />
          </div>

          <div className="w-[45%] md:w-[30%]">
            <CardData
              tag="Tangkap"
              title="Produksi Perikanan Tangkap per Komoditas"
              image="/assets/pic_data_perikanan_kelas.png"
              link="/data/produksi-komoditas"
            />
          </div>

          <div className="w-[45%] md:w-[30%]">
            <CardData
              tag="Budidaya"
              title="Gambaran Umum Perikanan Budidaya Provinsi Maluku Utara"
              image="/assets/pic_data_perikanan_budidaya.png"
              link="/data/perikanan-budidaya-maluku-utara"
            />
          </div>

          <div className="w-[45%] md:w-[30%]">
            <CardData
              tag="Infrastruktur"
              title="Infrastruktur Rantai Dingin"
              image="/assets/pic_data_rantai_dingin.png"
              link="/data/infrastruktur-rantai-dingin"
            />
          </div>

          <div className="w-[45%] md:w-[30%]">
            <CardData
              tag="Ruang Laut"
              title="Kawasan Konervasi Perairan Daerah"
              image="/assets/pic_data_kkd.png"
              link="/data/kawasan-konservasi-daerah"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
