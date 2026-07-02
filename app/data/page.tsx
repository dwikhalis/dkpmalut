"use client";

import { useEffect, useMemo, useState } from "react";
import { DownChevron, UpChevron } from "@/public/icons/iconSets";
import Link from "next/link";
import CardData from "../components/CardData";
import { supabase } from "@/lib/supabase/supabaseClient";

type DataPageOption = {
  title: string;
  slug: string;
};

type PublishedMitraDataset = {
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
  const [viewData, setViewData] = useState("Home");
  const [showDropDown, setShowDropDown] = useState(false);
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
        title: "Produksi Perikanan Tangkap per Kelas Komoditas",
        slug: "produksi-kelas-komoditas",
      },
      {
        title: "Produksi Perikanan Tangkap per Jenis Komoditas",
        slug: "produksi-jenis-komoditas",
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
          .eq("published", "true")
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
    <section className="flex flex-col min-h-[100vh]">
      <div
        className={`${
          viewData === title[0].title ? "flex" : "hidden"
        } flex flex-col lg:mx-12 2xl:mx-24 mx-8 lg:my-12 my-8`}
      >
        <div>
          <h2>Data Kelautan Perikanan</h2>
          <h5>Data seputar Kelautan dan Perikanan di Provinsi Maluku Utara</h5>
        </div>

        {/* //! DROPDOWN HEAD */}
        <div
          className={`${
            viewData === title[0].title ? "flex" : "hidden"
          } relative flex flex-col justify-center items-center`}
        >
          <div
            onClick={() => setShowDropDown((prev) => !prev)}
            className="flex items-center justify-between w-full h-10 mx-12 px-3 border rounded-lg mt-6 cursor-pointer"
          >
            <h5>{viewData === "Home" ? "Pilih Dataset" : viewData}</h5>

            <DownChevron
              width={20}
              height={20}
              className={showDropDown ? "hidden" : "flex"}
            />

            <UpChevron
              width={20}
              height={20}
              className={showDropDown ? "flex" : "hidden"}
            />
          </div>

          {/* //! DROPDOWN */}
          <div
            className={`${
              showDropDown ? "flex" : "hidden"
            } flex-col w-full py-1.5 border rounded-lg absolute z-10 top-17 bg-white cursor-pointer`}
          >
            {dropdownOptions.map((item) => {
              if (item.title === "Home") return null;

              return (
                <Link
                  key={item.slug}
                  href={`/data/${item.slug}`}
                  onClick={() => {
                    setShowDropDown(false);
                    setViewData(item.title);
                  }}
                  className="px-3 py-1.5 hover:bg-stone-100"
                >
                  <h5>{item.title}</h5>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap justify-between md:justify-start lg:gap-10 gap-6 w-full mt-12">
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
              title="Produksi Perikanan Tangkap per Kelas Komoditas"
              image="/assets/pic_data_perikanan_kelas.png"
              link="/data/produksi-kelas-komoditas"
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
