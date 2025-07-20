"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import { Swiper as SwiperType } from "swiper";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { useRef, useState } from "react";

interface ImageCarouselProps {
  images: [];
}

export default function Carousel({ images }: ImageCarouselProps) {
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
        className="rounded-2xl h-120 2xl:h-160 overflow-hidden w-full z-20"
      >
        {images.map((src, idx) => (
          <SwiperSlide key={idx}>
            <img
              src={src[0]}
              alt={`Slide ${idx}`}
              className="w-full object-cover h-120 2xl:h-160"
              onClick={() => (
                swiperRef.current?.slideTo(idx), setShowImage("fixed")
              )}
            />
          </SwiperSlide>
        ))}
      </Swiper>

      {/* //! POP ON FOCUS */}
      <div
        className={`${showImage} inset-0 bg-[rgba(0,0,0,0.8)] flex items-center justify-center z-10`}
        onClick={() => setShowImage("hidden")}
      >
        <Swiper
          modules={[Navigation, Pagination]}
          navigation
          //! Disabled loop, swiper requires more pictures
          // loop={true}
          onSwiper={(swiper) => (swiperRef.current = swiper)}
          className="flex justify-center items-center"
        >
          {images.map((src, idx) => (
            <SwiperSlide key={idx}>
              <div className="flex flex-col justify-center items-center">
                <img
                  src={src[0]}
                  alt={`Slide ${idx}`}
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
