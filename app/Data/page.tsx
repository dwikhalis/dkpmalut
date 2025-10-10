"use client";

import React, { useState } from "react";
import { DownChevron, UpChevron } from "@/public/icons/iconSets";
import Link from "next/link";
import CardData from "../components/CardData";

export default function Page() {
  const [viewData, setViewData] = useState("Home");
  const [showDropDown, setShowDropDown] = useState(false);

  const title = [
    { title: "Home", slug: "home" },
    {
      title: "Produksi Perikanan Tangkap dan Budidaya per Kabupaten",
      slug: "produksi-perikanan-kabupaten",
    },
    {
      title: "Produksi Perikanan Tangkap dan Budidaya per Tahun",
      slug: "produksi-perikanan-tahun",
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
  ];

  return (
    <section className="flex flex-col min-h-[100vh]">
      <div
        className={`${viewData === title[0].title ? "flex" : "hidden"} flex flex-col lg:mx-12 2xl:mx-24 mx-8 lg:my-12 my-8`}
      >
        <div>
          <h2>Data Kelautan Perikanan</h2>
          <h5>Data seputar Kelautan dan Perikanan di Provinsi Maluku Utara</h5>
        </div>

        {/* //! DROPDOWN HEAD */}
        <div
          className={`${viewData === title[0].title ? "flex" : "hidden"} relative flex flex-col justify-center items-center`}
        >
          <div
            onClick={() => setShowDropDown(!showDropDown)}
            className="flex items-center justify-between w-full h-10 mx-12 px-3 my-3 border rounded-lg mt-6 mb-6 cursor-pointer"
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
            className={`${showDropDown ? "flex" : "hidden"} flex-col w-full py-1.5 border rounded-lg absolute z-10 top-17 bg-white cursor-pointer`}
          >
            {title.map((e, idx) => {
              if (e.title === "Home") {
                return;
              } else if (e.title !== "Home") {
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setShowDropDown(false);
                      setViewData(e.title);
                    }}
                    className="px-3 py-1.5 hover:bg-stone-100"
                  >
                    <Link href={`Data/${e.slug}`}>
                      <h5>{e.title}</h5>
                    </Link>
                  </div>
                );
              }
            })}
          </div>
        </div>
        <div className="hidden md:flex flex-wrap lg:gap-10 gap-6 w-full mt-12">
          <div className="w-[30%]">
            <CardData
              tag="Tangkap, Budidaya"
              title="Produksi Perikanan Tangkap dan Budidaya per Kabupaten"
              image="/assets/pic_data_perikanan_kabupaten.png"
              link="/Data/produksi-perikanan-kabupaten"
            />
          </div>
          <div className="w-[30%]">
            <CardData
              tag="Tangkap"
              title="Produksi Perikanan Tangkap per Kelas Komoditas"
              image="/assets/pic_data_perikanan_kelas.png"
              link="/Data/produksi-kelas-komoditas"
            />
          </div>
          <div className="w-[30%]">
            <CardData
              tag="Budidaya"
              title="Gambaran Umum Perikanan Budidaya Provinsi Maluku Utara"
              image="/assets/pic_data_perikanan_budidaya.png"
              link="/Data/perikanan-budidaya-maluku-utara"
            />
          </div>
          <div className="w-[30%]">
            <CardData
              tag="Infrastruktur"
              title="Infrastruktur Rantai Dingin"
              image="/assets/pic_data_rantai_dingin.png"
              link="/Data/infrastruktur-rantai-dingin"
            />
          </div>
          <div className="w-[30%]">
            <CardData
              tag="Ruang Laut"
              title="Kawasan Konervasi Perairan Daerah"
              image="/assets/pic_data_kkd.png"
              link="/Data/kawasan-konservasi-daerah"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
