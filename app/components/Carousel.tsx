"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import { Swiper as SwiperType } from "swiper";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "../globals.css";
import { useRef, useState } from "react";
import Image from "next/image";

interface ImageCarouselProps {
  pictures: [string, string][];
}

export default function Carousel({ pictures }: ImageCarouselProps) {
  const [showImage, setShowImage] = useState("hidden");
  const swiperRef = useRef<SwiperType | null>(null);

  return (
    <>
      <Swiper
        modules={[Navigation, Pagination, Autoplay]}
        navigation
        pagination={{ clickable: true }}
        autoplay={{ delay: 5000 }}
        //! Disabled loop, swiper requires more pictures
        // loop={true}
        className="rounded-2xl h-full 2xl:h-160 overflow-hidden w-full z-20"
      >
        {pictures.map((src, idx) => (
          <SwiperSlide key={idx}>
            <Image
              src={src[0]}
              alt={`Slide ${idx}`}
              width={800}
              height={600}
              className="w-full object-cover h-120 2xl:h-160 mb-12 rounded-2xl"
              onClick={() => (
                swiperRef.current?.slideTo(idx), setShowImage("fixed")
              )}
            />
          </SwiperSlide>
        ))}
      </Swiper>

      {/* //! POP ON FOCUS */}
      <div
        className={`${showImage} inset-0 flex bg-[rgba(0,0,0,0.8)] items-center justify-center z-20`}
        onClick={() => setShowImage("hidden")}
      >
        <Swiper
          //! Disabled loop, swiper requires more pictures
          // loop={true}
          onSwiper={(swiper) => (swiperRef.current = swiper)}
          className="flex justify-center items-center"
        >
          {pictures.map((src, idx) => (
            <SwiperSlide key={idx}>
              <div className="flex flex-col justify-center items-center">
                <Image
                  src={src[0]}
                  alt={`Slide ${idx}`}
                  width={800}
                  height={600}
                  className="w-[90%] xl:w-[50%]"
                />
                <h6 className="text-white mx-3 pt-3 w-[90%] xl:w-[50%]">
                  {src[1]}
                </h6>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </>
  );
}
