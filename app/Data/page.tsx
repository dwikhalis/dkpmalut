"use client";

import React, { useState } from "react";
import ChartProductionKabFilter from "../components/ChartProductionKabFilter";
import ChartProductionYearFilter from "../components/ChartProductionYearFilter";
import ChartProductionClassFish from "../components/ChartProductionClassFish";
import ChartProductionCommonFish from "../components/ChartProductionCommonFish";
import ChartAquaculture from "../components/ChartAquaculture";

export default function Page() {
  const [viewData, setViewData] = useState("");

  return (
    <section className="flex flex-col 2xl:mr-24 md:mr-12 mr-8">
      <select
        onChange={(e) => setViewData(e.target.value)}
        className="grow h-10 ml-12 px-3 my-3 border rounded-lg mt-6 mb-6"
      >
        <option value={"ChartProductionKabFilter"}>
          Produksi Perikanan Tangkap dan Budidaya Provinsi Maluku Utara per
          Kabupaten
        </option>
        <option value={"ChartProductionYearFilter"}>
          Produksi Perikanan Tangkap dan Budidaya Provinsi Maluku Utara per
          Tahun
        </option>
        <option value={"ChartProductionClassFish"}>
          Produksi Perikanan Tangkap Provinsi Maluku Utara per Kelas Komoditas
        </option>
        <option value={"ChartProductionCommonFish"}>
          Produksi Perikanan Tangkap Provinsi Maluku Utara per Jenis Komoditas
        </option>
        <option value={"ChartAquaculture"}>
          Gambaran Umum Perikanan Budidaya Provinsi Maluku Utara
        </option>
      </select>
      <div
        className={viewData === "ChartProductionKabFilter" ? "flex" : "hidden"}
      >
        <ChartProductionKabFilter />
      </div>
      <div
        className={viewData === "ChartProductionYearFilter" ? "flex" : "hidden"}
      >
        <ChartProductionYearFilter />
      </div>
      <div
        className={viewData === "ChartProductionClassFish" ? "flex" : "hidden"}
      >
        <ChartProductionClassFish />
      </div>
      <div
        className={viewData === "ChartProductionCommonFish" ? "flex" : "hidden"}
      >
        <ChartProductionCommonFish />
      </div>
      <div className={viewData === "ChartAquaculture" ? "flex" : "hidden"}>
        <ChartAquaculture />
      </div>
    </section>
  );
}
