"use client";

import React, { useState } from "react";
import { DownChevron, LeftChevron, UpChevron } from "@/public/icons/iconSets";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import MapKKD_dynamic from "./MapKKD_dynamic";

type Pages = { title: string; slug: string }[];

interface Props {
  pages: Pages;
}

// Legends = "All" | "Inti" | "Pariwisata Alam Perairan" | "Penangkapan Ikan" | "Rehabilitasi" | "Alur Kapal"

export default function ChartKKD({ pages }: Props) {
  const [showDropDown, setShowDropDown] = useState(false);
  const [legend, setLegend] = useState("All");
  const [kkd, setKkd] = useState("malut");
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [mapLoad, setMapLoad] = useState(true);

  const handleFromChild = (status: boolean) => {
    setMapLoad(status);
  };

  return (
    <div className="flex w-full">
      {/*//! ===== SIDEBAR =====  */}
      <aside
        className={`flex top-0 md:top-auto md:static fixed z-5 md:z-0 justify-between md:w-[30vw] w-[65%] md:grow md:h-auto h-[100vh] transition-transform duration-300 md:translate-x-0 ${
          showSideMenu ? "translate-x-0" : "-translate-x-75"
        }`}
      >
        <div className="flex flex-col gap-3 min-w-55 bg-sky-800 px-5 md:pt-8 lg:pt-12 pt-18 text-white pb-20 w-full h-full overflow-y-scroll scrollbar-hide">
          {/* //! LEGEND */}
          <h3 className="font-bold">Legenda</h3>
          <div className="flex flex-col gap-3">
            {/* //! ZONA INTI */}
            <div className="flex flex-col gap-3">
              <p className="text-sm">Zona Inti</p>
              {/* Item */}
              <div
                className="flex w-full justify-start items-center gap-3 cursor-pointer border-1 border-sky-600 px-2 py-1 rounded-xl hover:bg-sky-700"
                onClick={() => {
                  setLegend("Inti");
                }}
              >
                <div className="w-7.5 h-7.5 bg-red-600 rounded-4xl" />
                <p className="text-xs">Inti</p>
              </div>
            </div>

            {/* //! ZONA PEMANFAATAN TERBATAS */}
            <div className="flex flex-col gap-3">
              <p className="mt-3 text-sm">Zona Pemanfaatan Terbatas</p>
              <p className="mt-0 text-xs">Sub Zona</p>
              {/* Item */}
              <div className="flex flex-col w-full cursor-pointer border-1 border-sky-600 rounded-xl overflow-clip">
                <div
                  className="flex justify-start items-center gap-3 px-2 py-1 hover:bg-sky-700 w-full"
                  onClick={() => {
                    setLegend("Pariwisata Alam Perairan");
                  }}
                >
                  <div className="w-7.5 h-7.5 bg-green-600 rounded-4xl" />
                  <p className="text-xs">Pariwisata Alam</p>
                </div>
              </div>
              {/* Item */}
              <div className="flex flex-col w-full cursor-pointer border-1 border-sky-600 rounded-xl overflow-clip">
                <div
                  className="flex justify-start items-center gap-3 px-2 py-1 hover:bg-sky-700 w-full"
                  onClick={() => {
                    setLegend("Penangkapan Ikan");
                  }}
                >
                  <div className="w-7.5 h-7.5 bg-sky-600 rounded-4xl" />
                  <p className="text-xs">Perikanan Tangkap</p>
                </div>
              </div>
            </div>

            {/* //! ZONA LAINNYA */}
            <div
              className={`${kkd === "makian_moti" || kkd === "malut" ? "flex" : "hidden"} flex-col gap-3`}
            >
              <p className="mt-3 text-sm">Zona Lainnya</p>
              <p className="mt-0 text-xs">Sub Zona</p>
              {/* Item */}
              <div className="flex flex-col w-full cursor-pointer border-1 border-sky-600 rounded-xl overflow-clip">
                <div
                  className="flex justify-start items-center gap-3 px-2 py-1 hover:bg-sky-700 w-full"
                  onClick={() => {
                    setLegend("Rehabilitasi");
                  }}
                >
                  <div className="w-7.5 h-7.5 bg-neutral-500 rounded-4xl" />
                  <p className="text-xs">Rehabilitasi</p>
                </div>
              </div>
              {/* Item */}
              <div className="flex flex-col w-full cursor-pointer border-1 border-sky-600 rounded-xl overflow-clip">
                <div
                  className="flex justify-start items-center gap-3 px-2 py-1 hover:bg-sky-700 w-full"
                  onClick={() => {
                    setLegend("Alur Kapal");
                  }}
                >
                  <div className="w-7.5 h-7.5 bg-neutral-400 rounded-4xl" />
                  <p className="text-xs">Alur Kapal</p>
                </div>
              </div>
            </div>

            <button
              className="flex py-2 bg-sky-600 rounded-md text-xs text-white hover:bg-sky-700 cursor-pointer justify-center items-center mt-3"
              onClick={() => {
                setLegend("All");
              }}
            >
              Reset
            </button>

            {/* //! Download Buttons */}
            <div
              className={`${kkd === "malut" ? "hidden" : "flex"} flex-col gap-2`}
            >
              <h5 className="mt-6 font-bold">Download</h5>
              <div className="flex w-full justify-between items-center">
                <button
                  className="flex py-2 bg-sky-600 rounded-md text-xs text-white hover:bg-sky-700 cursor-pointer justify-center items-center w-[45%]"
                  onClick={() => {
                    const fileName = `/maps/map_${kkd}.png`;

                    const link = document.createElement("a");
                    link.href = fileName;
                    link.download = fileName.split("/").pop() || "map.png";
                    link.click();
                  }}
                >
                  Peta
                </button>

                <button
                  className="flex py-2 bg-sky-600 rounded-md text-xs text-white hover:bg-sky-700 cursor-pointer justify-center items-center w-[45%]"
                  onClick={() => {
                    const fileName = `/documents/rpz_${kkd}.pdf`;

                    const link = document.createElement("a");
                    link.href = fileName;
                    link.download = fileName.split("/").pop() || "rpz.pdf";
                    link.click();
                  }}
                >
                  RPZ
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* //! Close Side Menu */}
        <div
          className="flex justify-center items-center md:hidden cursor-pointer"
          onClick={() => setShowSideMenu(!showSideMenu)}
        >
          <div
            className="px-0 pb-3 -rotate-90 -translate-x-6"
            onClick={() => setShowSideMenu(!showSideMenu)}
          >
            <div className="flex justify-center items-center bg-sky-800 px-2 rounded-b-md">
              <p className="text-sm w-full text-white">Filters </p>
              <UpChevron className="w-6 h-6" color="white" />
            </div>
          </div>
        </div>
      </aside>

      {/* //! Open Side Menu */}
      <div
        className="flex fixed top-[50%] items-center justify-start md:hidden cursor-pointer
            -translate-x-12"
      >
        <div
          className="-rotate-90 pb-2 px-6"
          onClick={() => setShowSideMenu(!showSideMenu)}
        >
          <div className="flex justify-center items-center bg-stone-300 px-2 rounded-b-md">
            <p className="text-sm w-full text-white">Filters </p>
            <DownChevron className="w-6 h-6" color="white" />
          </div>
        </div>
      </div>

      {/* //! Pop Up Focus - Overlay */}
      <div
        className={`${
          showSideMenu ? "flex" : "hidden"
        } md:hidden fixed z-3 inset-0 bg-black/50 w-[100vw] h-[100vh]`}
        onClick={() => setShowSideMenu(false)}
      />

      {/* //! Main */}

      <div className="flex flex-col lg:mx-12 mx-8 w-500">
        <div className="flex w-full">
          {/* //! HEAD DROPDOWN */}
          <Link
            href={"/Data"}
            className="flex justify-center items-center md:pr-6 pr-3 md:py-3 py-0 cursor-pointer"
          >
            <LeftChevron className="lg:w-7 lg:h-7 w-5 h-5" />
          </Link>

          <div className="relative flex flex-col justify-center items-center md:my-3 my-0 w-full">
            <div
              onClick={() => setShowDropDown(!showDropDown)}
              className="flex items-center justify-between w-full lg:h-10 h-8 mx-12 px-3 my-3 rounded-lg mt-6 mb-6 border border-stone-100 cursor-pointer shadow-md"
            >
              <p className="lg:text-sm md:text-[1.5vw] text-[2.8vw]">
                Lihat Data Lainnya
              </p>
              <DownChevron
                className={`${showDropDown ? "hidden" : "flex"} lg:w-7 lg:h-7 w-4 h-4`}
              />
              <UpChevron
                className={`${showDropDown ? "flex" : "hidden"} lg:w-7 lg:h-7 w-4 h-4`}
              />
            </div>

            {/* //! DROPDOWN */}
            <div
              className={`${
                showDropDown ? "flex" : "hidden"
              } flex-col w-full py-1.5 border rounded-lg absolute z-10 top-17 bg-white cursor-pointer`}
            >
              {pages.map((e, idx) => {
                if (e.title === "Home") return;

                return (
                  <Link
                    href={`/Data/${e.slug}`}
                    key={idx}
                    onClick={() => {
                      setShowDropDown(false);
                    }}
                    className="px-3 py-1.5 hover:bg-stone-100 lg:text-sm md:text-[1.5vw] text-[2.8vw]"
                  >
                    <h5>{e.title}</h5>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* //! Title */}
        <h2 className="mb-3">Kawasan Konservasi Daerah</h2>

        <div className="flex justify-between mb-6">
          {/* //! Dropdown */}
          <form>
            <select
              className="w-full p-2 rounded-xl border border-stone-200"
              onChange={(e) => setKkd(e.target.value)}
              defaultValue={"malut"}
            >
              <option className="text-xs" value={"malut"}>
                Provinsi Maluku Utara
              </option>
              <option className="text-xs" value={"makian_moti"}>
                TWP Pulau Makian dan Pulau Moti
              </option>
              <option className="text-xs" value={"widi"}>
                TPK Kepulauan Widi
              </option>

              {/* //! Unavailable KKD */}
              {/* <option className="text-xs" value={"morotai"}>
                TWP Pulau Rao - Tanjung Dehegila
              </option> */}
              {/* <option className="text-xs" value={"mare"}>TWP Pulau Mare</option> */}
              {/* <option className="text-xs" value={"guraici"}>TPK Kepulauan Guraici</option> */}
            </select>
          </form>
        </div>

        {/* //! MAP */}
        <div className="relative z-0 min-h-[70vh]">
          {mapLoad && (
            <div className="absolute inset-0 z-[1000] flex flex-col justify-center items-center bg-white/80 backdrop-blur-sm">
              <div className="h-6 w-6 border-4 border-slate-300 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-600 text-sm mt-3">Loading map...</p>
            </div>
          )}
          <MapKKD_dynamic
            legend={legend}
            kkd={kkd}
            loadStatus={handleFromChild}
          />
          <div id="scrollToThis" className="flex flex-col w-full mt-6">
            <div></div>
          </div>
        </div>
      </div>
    </div>
  );
}
