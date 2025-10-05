"use client";

import React, { useEffect, useState } from "react";
import { DownChevron, LeftChevron, UpChevron } from "@/public/icons/iconSets";
import "leaflet/dist/leaflet.css";
import MapColdChain_dynamic from "./MapColdChain_dynamic";
import Link from "next/link";
import Image from "next/image";
import { getColdChain } from "@/lib/supabase/supabaseHelper";

type Pages = { title: string; slug: string }[];

interface Props {
  pages: Pages;
}

type ColdChainRow = {
  id: string;
  created_at: string;
  area: string;
  kab: string;
  kec: string;
  kel: string;
  type: string;
  kodkws: string;
  tahun_ops: string;
  level: string;
  name: string;
  es_pabrik: number;
  es_pabrik_jum_unit: number;
  es_pabrik_kondisi: string;
  es_pabrik_tahun: string;
  abf: number;
  abf_jum_unit: number;
  abf_kondisi: string;
  abf_tahun: string;
  es_storage: number;
  es_storage_jum: number;
  es_storage_kondisi: string;
  es_storage_tahun: string;
  cs: number;
  cs_jum_unit: number;
  cs_kondisi: string;
  cs_tahun: string;
  cpf: number;
  cpf_jum_unit: number;
  cpf_kondisi: string;
  cpf_tahun: string;
  lon: number;
  lat: number;
  desc: string;
};

// Legends = "landing_sites" | "ports" | "companies" | "ice_factory" | "ice_storage" | "cs" | "abf" | "cpf"

export default function ChartColdChain({ pages }: Props) {
  const [showDropDown, setShowDropDown] = useState(false);
  const [legend, setLegend] = useState("landing_sites");
  const [loading, setLoading] = useState(true);

  const [dataColdChain, setDataColdChain] = useState<ColdChainRow[]>([]);
  const [selected, setSelected] = useState<ColdChainRow | null>(null);
  const [mapLoad, setMapLoad] = useState(true);

  const [showSideMenu, setShowSideMenu] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const data = await getColdChain();

        setDataColdChain((data ?? []) as ColdChainRow[]);
      } catch (e) {
        console.error("getColdChain failed:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const handleFromChild = (id: string) => {
    dataColdChain.find((e) => e.id === id && setSelected(e));
    document.getElementById("scrollToThis")?.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });
  };

  const downloadCSV = () => {
    if (!dataColdChain || dataColdChain.length === 0) return;

    // 1. Extract headers
    const headers = Object.keys(dataColdChain[0]).filter(
      (h) => h !== "id" && h !== "created_at"
    );

    // 2. Build CSV content
    const rows = dataColdChain.map((row) =>
      headers
        .map((h) => JSON.stringify(row[h as keyof ColdChainRow] ?? ""))
        .join(",")
    );

    const csvContent = [headers.join(","), ...rows].join("\n");

    // 3. Create a Blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "cold_chain_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLoadMap = (status: boolean) => {
    setMapLoad(status);
  };

  if (loading) {
    return (
      <div className="w-full h-[70vh] flex items-center justify-center">
        <div className="h-6 w-6 border-4 border-slate-300 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex w-full">
      {/*//! ===== SIDEBAR =====  */}
      <aside
        className={`flex top-0 md:top-auto md:static fixed z-5 md:z-0 justify-between md:w-[30vw] w-[65%] md:grow md:h-auto h-[100vh] transition-transform duration-300 md:translate-x-0 ${
          showSideMenu ? "translate-x-0" : "-translate-x-60"
        }`}
      >
        <div className="flex flex-col gap-3 min-w-50 bg-sky-800 px-5 md:pt-8 lg:pt-12 pt-18 text-white pb-20 w-full h-full overflow-y-scroll scrollbar-hide">
          <h3 className="font-bold">Legenda</h3>
          <div className="flex flex-col mt-3 gap-3 w-full">
            <p className="text-sm">Pendaratan</p>
            <div
              className="flex w-full justify-start items-center gap-3 cursor-pointer border-1 border-sky-600 px-2 py-1 rounded-xl hover:bg-sky-700"
              onClick={() => {
                setLegend("ports");
                setSelected(null);
              }}
            >
              <Image
                src={"/assets/pin_port.png"}
                width={30}
                height={30}
                alt="pin"
              />
              <p className="text-xs">Pelabuhan Perikanan</p>
            </div>
            <div
              className="flex w-full justify-start items-center gap-3 cursor-pointer border-1 border-sky-600 px-2 py-1 rounded-xl hover:bg-sky-700"
              onClick={() => {
                setLegend("companies");
                setSelected(null);
              }}
            >
              <Image
                src={"/assets/pin_company.png"}
                width={30}
                height={30}
                alt="pin"
              />
              <p className="text-xs">Perusahaan Perikanan</p>
            </div>
            <p className="mt-6 text-sm">Fasilitas Pendukung</p>
            <div
              className="flex w-full justify-start items-center gap-3 cursor-pointer border-1 border-sky-600 px-2 py-1 rounded-xl hover:bg-sky-700"
              onClick={() => {
                setLegend("ice_factory");
                setSelected(null);
              }}
            >
              <Image
                src={"/assets/pin_ice_factory.png"}
                width={30}
                height={30}
                alt="pin"
              />
              <p className="text-xs">Pabrik Es</p>
            </div>
            <div
              className="flex w-full justify-start items-center gap-3 cursor-pointer border-1 border-sky-600 px-2 py-1 rounded-xl hover:bg-sky-700"
              onClick={() => {
                setLegend("ice_storage");
                setSelected(null);
              }}
            >
              <Image
                src={"/assets/pin_ice_storage.png"}
                width={30}
                height={30}
                alt="pin"
              />
              <p className="text-xs">Penyimpanan Es</p>
            </div>
            <div
              className="flex w-full justify-start items-center gap-3 cursor-pointer border-1 border-sky-600 px-2 py-1 rounded-xl hover:bg-sky-700"
              onClick={() => {
                setLegend("cs");
                setSelected(null);
              }}
            >
              <Image
                src={"/assets/pin_cs.png"}
                width={30}
                height={30}
                alt="pin"
              />
              <p className="text-xs">Cold Storage</p>
            </div>
            <div
              className="flex w-full justify-start items-center gap-3 cursor-pointer border-1 border-sky-600 px-2 py-1 rounded-xl hover:bg-sky-700"
              onClick={() => {
                setLegend("abf");
                setSelected(null);
              }}
            >
              <Image
                src={"/assets/pin_abf.png"}
                width={30}
                height={30}
                alt="pin"
              />
              <p className="text-xs">Air Blast Freezer (ABF)</p>
            </div>
            <div
              className="flex w-full justify-start items-center gap-3 cursor-pointer border-1 border-sky-600 px-2 py-1 rounded-xl hover:bg-sky-700"
              onClick={() => {
                setLegend("cpf");
                setSelected(null);
              }}
            >
              <Image
                src={"/assets/pin_cpf.png"}
                width={30}
                height={30}
                alt="pin"
              />
              <p className="text-xs">Contact Plate Freezer (CPF)</p>
            </div>

            <button
              className="flex py-2 bg-sky-600 rounded-md text-xs text-white hover:bg-sky-700 cursor-pointer justify-center items-center mt-6"
              onClick={() => {
                setLegend("landing_sites");
                setSelected(null);
              }}
            >
              Reset
            </button>
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

        {/* Title */}
        <h2 className="md:mb-3 mb-3">Infrastruktur Rantai Dingin</h2>

        <div>
          <button
            className="px-3 py-1 mb-3 rounded-lg border lg:text-sm md:text-[1.5vw] text-[2.8vw] bg-sky-600 text-white hover:bg-sky-500"
            onClick={downloadCSV}
          >
            Download CSV
          </button>
        </div>

        {/* //! MAP */}
        {mapLoad && (
          <div className="absolute inset-0 z-[1000] flex flex-col justify-center items-center bg-white/80 backdrop-blur-sm">
            <div className="h-6 w-6 border-4 border-slate-300 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-600 text-sm mt-3">Loading map...</p>
          </div>
        )}
        <div className="z-0 mb-8">
          <MapColdChain_dynamic
            legend={legend}
            data={dataColdChain}
            fromChild={handleFromChild}
            loadStatus={handleLoadMap}
          />
          <div id="scrollToThis" className="flex flex-col w-full mt-6">
            {selected && (
              <div className="overflow-x-auto mb-12">
                <h4 className="mb-6">{selected.name}</h4>
                <table className="min-w-full lg:text-sm md:text-[1.5vw] text-[2vw]">
                  <thead className="bg-sky-100">
                    <tr>
                      <th className="border px-3 py-2 text-left border-gray-400">
                        Fasilitas
                      </th>
                      <th className="border px-3 py-2 text-left border-gray-400">
                        Jumlah (unit)
                      </th>
                      <th className="border px-3 py-2 text-left border-gray-400">
                        Kapasitas
                      </th>
                      <th className="border px-3 py-2 text-left border-gray-400">
                        Tahun Operasi
                      </th>
                      <th className="border px-3 py-2 text-left border-gray-400">
                        Kondisi
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Pabrik Es */}
                    <tr>
                      <td className="px-3 py-2 border border-gray-400">
                        Pabrik Es
                      </td>
                      <td className="px-3 py-2 border border-gray-400">
                        {selected.es_pabrik_jum_unit || "-"}
                      </td>
                      <td className="px-3 py-2 border border-gray-400">
                        {selected.es_pabrik || "-"}
                      </td>
                      <td className="px-3 py-2 border border-gray-400">
                        {selected.es_pabrik_tahun || "-"}
                      </td>
                      <td className="px-3 py-2 border border-gray-400">
                        {selected.es_pabrik_kondisi || "-"}
                      </td>
                    </tr>

                    {/* Penyimpanan Es */}
                    <tr>
                      <td className="px-3 py-2 border border-gray-400">
                        Penyimpanan Es
                      </td>
                      <td className="px-3 py-2 border border-gray-400">
                        {selected.es_storage_jum || "-"}
                      </td>
                      <td className="px-3 py-2 border border-gray-400">
                        {selected.es_storage || "-"}
                      </td>
                      <td className="px-3 py-2 border border-gray-400">
                        {selected.es_storage_tahun || "-"}
                      </td>
                      <td className="px-3 py-2 border border-gray-400">
                        {selected.es_storage_kondisi || "-"}
                      </td>
                    </tr>

                    {/* Cold Storage */}
                    <tr>
                      <td className="px-3 py-2 border border-gray-400">
                        Cold Storage
                      </td>
                      <td className="px-3 py-2 border border-gray-400">
                        {selected.cs_jum_unit || "-"}
                      </td>
                      <td className="px-3 py-2 border border-gray-400">
                        {selected.cs || "-"}
                      </td>
                      <td className="px-3 py-2 border border-gray-400">
                        {selected.cs_tahun || "-"}
                      </td>
                      <td className="px-3 py-2 border border-gray-400">
                        {selected.cs_kondisi || "-"}
                      </td>
                    </tr>

                    {/* ABF */}
                    <tr>
                      <td className="px-3 py-2 border border-gray-400">ABF</td>
                      <td className="px-3 py-2 border border-gray-400">
                        {selected.abf_jum_unit || "-"}
                      </td>
                      <td className="px-3 py-2 border border-gray-400">
                        {selected.abf || "-"}
                      </td>
                      <td className="px-3 py-2 border border-gray-400">
                        {selected.abf_tahun || "-"}
                      </td>
                      <td className="px-3 py-2 border border-gray-400">
                        {selected.abf_kondisi || "-"}
                      </td>
                    </tr>

                    {/* CPF */}
                    <tr>
                      <td className="px-3 py-2 border border-gray-400">CPF</td>
                      <td className="px-3 py-2 border border-gray-400">
                        {selected.cpf_jum_unit || "-"}
                      </td>
                      <td className="px-3 py-2 border border-gray-400">
                        {selected.cpf || "-"}
                      </td>
                      <td className="px-3 py-2 border border-gray-400">
                        {selected.cpf_tahun || "-"}
                      </td>
                      <td className="px-3 py-2 border border-gray-400">
                        {selected.cpf_kondisi || "-"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
