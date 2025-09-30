"use client";

import React, { useState } from "react";
// import { supabase } from "@/lib/supabase/supabaseClient";
import { DownChevron, LeftChevron, UpChevron } from "@/public/icons/iconSets";
import "leaflet/dist/leaflet.css";
import Map_dynamic from "./Map_dynamic";
import Link from "next/link";

type Pages = { title: string; slug: string }[];

interface Props {
  pages: Pages;
}

export default function ChartColdChain({ pages }: Props) {
  const [showDropDown, setShowDropDown] = useState(false);

  return (
    <div className="flex w-full">
      {/*//! ===== SIDEBAR =====  */}
      <aside>
        <div className="flex flex-col gap-3 min-w-60 bg-sky-800 px-5 md:pt-8 lg:pt-12 pt-18 text-white pb-20 w-full h-full">
          <h3 className="font-bold">Area</h3>
          <label className="flex items-center gap-2 py-0.5">
            <input type="checkbox" />
            <h5 className="text-sm">
              Wilayah I :<br />
              Morotai
            </h5>
          </label>
          <label className="flex items-center gap-2 py-0.5">
            <input type="checkbox" />
            <h5 className="text-sm">
              Wilayah II :<br />
              Halmahera Utara
            </h5>
          </label>
          <label className="flex items-center gap-2 py-0.5">
            <input type="checkbox" />
            <h5 className="text-sm">
              Wilayah III :<br />
              Ternate
            </h5>
          </label>
          <label className="flex items-center gap-2 py-0.5">
            <input type="checkbox" />
            <h5 className="text-sm">
              Wilayah IV :<br />
              Tidore Kepulauan
            </h5>
          </label>
          <label className="flex items-center gap-2 py-0.5">
            <input type="checkbox" />
            <h5 className="text-sm">
              Wilayah V :<br />
              Halmahera Selatan
            </h5>
          </label>
        </div>
      </aside>

      {/* Main */}
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

        {/* //! MAP */}
        <div className="z-0 mb-8">
          <Map_dynamic />
        </div>
      </div>
    </div>
  );
}
