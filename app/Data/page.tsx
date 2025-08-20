"use client";

import React, { useState } from "react";
import ChartProductionKabFilter from "../components/ChartProductionKabFilter";
import ChartProductionYearFilter from "../components/ChartProductionYearFilter";
import ChartProductionClassFish from "../components/ChartProductionClassFish";
import ChartProductionCommonFish from "../components/ChartProductionCommonFish";
import ChartAquaculture from "../components/ChartAquaculture";
import { DownChevron, UpChevron } from "@/public/icons/iconSets";

export default function Page() {
  const [viewData, setViewData] = useState("Home");
  const [showDropDown, setShowDropDown] = useState(false);

  const title = [
    "Home",
    "Produksi Perikanan Tangkap dan Budidaya per Kabupaten",
    "Produksi Perikanan Tangkap dan Budidaya per Tahun",
    "Produksi Perikanan Tangkap per Kelas Komoditas",
    "Produksi Perikanan Tangkap per Jenis Komoditas",
    "Gambaran Umum Perikanan Budidaya Provinsi Maluku Utara",
  ];

  return (
    <section className="flex flex-col 2xl:mr-24 md:mr-12 mr-8 min-h-[70vh]">
      <div
        className={`${viewData === title[0] ? "flex" : "hidden"} flex-col gap-3 ml-12 mt-12`}
      >
        <h2>Data Kelautan Perikanan</h2>
        <h5>Data seputar Kelautan dan Perikanan di Provinsi Maluku Utara</h5>
      </div>
      <div className="relative flex flex-col justify-center items-center ml-12">
        <div
          onClick={() => setShowDropDown(!showDropDown)}
          className="flex items-center justify-between w-full h-10 mx-12 px-3 my-3 border rounded-lg mt-6 mb-6 cursor-pointer"
        >
          <p>{viewData === "Home" ? "Pilih Dataset" : viewData}</p>
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
          <div
            onClick={() => {
              setShowDropDown(false);
              setViewData(title[0]);
            }}
            className={`${viewData === title[0] ? "hidden" : "flex"} px-3 py-1.5 hover:bg-stone-100`}
          >
            {viewData !== title[0] ? "Home" : "Pilih Data"}
          </div>
          <div
            onClick={() => {
              setShowDropDown(false);
              setViewData(title[1]);
            }}
            className="px-3 py-1.5 hover:bg-stone-100"
          >
            {title[1]}
          </div>
          <div
            onClick={() => {
              setShowDropDown(false);
              setViewData(title[2]);
            }}
            className="px-3 py-1.5 hover:bg-stone-100"
          >
            {title[2]}
          </div>
          <div
            onClick={() => {
              setShowDropDown(false);
              setViewData(title[3]);
            }}
            className="px-3 py-1.5 hover:bg-stone-100"
          >
            {title[3]}
          </div>
          <div
            onClick={() => {
              setShowDropDown(false);
              setViewData(title[4]);
            }}
            className="px-3 py-1.5 hover:bg-stone-100"
          >
            {title[4]}
          </div>
          <div
            onClick={() => {
              setShowDropDown(false);
              setViewData(title[5]);
            }}
            className="px-3 py-1.5 hover:bg-stone-100"
          >
            {title[5]}
          </div>
        </div>
      </div>
      <div
        className={
          viewData === "Produksi Perikanan Tangkap dan Budidaya per Kabupaten"
            ? "flex"
            : "hidden"
        }
      >
        <ChartProductionKabFilter />
      </div>
      <div
        className={
          viewData === "Produksi Perikanan Tangkap dan Budidaya per Tahun"
            ? "flex"
            : "hidden"
        }
      >
        <ChartProductionYearFilter />
      </div>
      <div
        className={
          viewData === "Produksi Perikanan Tangkap per Kelas Komoditas"
            ? "flex"
            : "hidden"
        }
      >
        <ChartProductionClassFish />
      </div>
      <div
        className={
          viewData === "Produksi Perikanan Tangkap per Jenis Komoditas"
            ? "flex"
            : "hidden"
        }
      >
        <ChartProductionCommonFish />
      </div>
      <div
        className={
          viewData === "Gambaran Umum Perikanan Budidaya Provinsi Maluku Utara"
            ? "flex"
            : "hidden"
        }
      >
        <ChartAquaculture />
      </div>
    </section>
  );
}
