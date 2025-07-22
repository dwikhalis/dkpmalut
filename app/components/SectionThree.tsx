"use client";

import React from "react";
import Card from "./Card";
import DummyContent from "@/public/dummyDatabase.json";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";

import "swiper/css";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

export default function SectionThree() {
  return (
    <div className="flex flex-col gap-6 py-12 mx-6 justify-center items-center">
      <div className="flex flex-col mb-3 gap-6">
        <h2 className="text-center">BERITA TERKINI</h2>
        <h5 className="text-center">
          Kanal Informasi Kelautan dan Perikanan Maluku Utara
        </h5>
      </div>

      {/* //! DESKTOP */}
      <div className="hidden md:flex flex-wrap gap-6 xl:gap-12 2xl:gap-24 justify-center 2xl:mx-24 mb-12">
        <Card id={1} data={DummyContent} />
        <Card id={3} data={DummyContent} />
        <Card id={4} data={DummyContent} />
      </div>

      {/* //! MOBILE */}
      <div className="md:hidden flex w-full">
        <Swiper
          modules={[Pagination, Autoplay]}
          pagination={{ clickable: true }}
          autoplay={{ delay: 5000 }}
        >
          <SwiperSlide>
            <div className="flex justify-center items-center mb-16">
              <Card id={1} data={DummyContent} />
            </div>
          </SwiperSlide>
          <SwiperSlide>
            <div className="flex justify-center items-center mb-16">
              <Card id={2} data={DummyContent} />
            </div>
          </SwiperSlide>
          <SwiperSlide>
            <div className="flex justify-center items-center mb-16">
              <Card id={3} data={DummyContent} />
            </div>
          </SwiperSlide>
          <SwiperSlide>
            <div className="flex justify-center items-center mb-16">
              <Card id={4} data={DummyContent} />
            </div>
          </SwiperSlide>
        </Swiper>
      </div>
      <div>
        <button className="px-7 py-3 bg-black text-white rounded-full hover:bg-stone-400 hover:text-black cursor-pointer">
          <a href="/Berita">
            <h5>Lainnya</h5>
          </a>
        </button>
      </div>
    </div>
  );
}
