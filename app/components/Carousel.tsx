// components/ImageCarousel.tsx
"use client"; // or 'use client' if in app/ directory

import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

interface ImageCarouselProps {
  images: string[];
}

export default function Carousel({ images }: ImageCarouselProps) {
  return (
    <div className="w-full">
      <Swiper
        modules={[Navigation, Pagination, Autoplay]}
        navigation
        pagination={{ clickable: true }}
        autoplay={{ delay: 5000 }}
        loop={true}
        className="rounded-2xl h-120 2xl:h-160 overflow-hidden shadow"
      >
        {images.map((src, idx) => (
          <SwiperSlide key={idx}>
            <div className="flex flex-col">
              <img
                src={src}
                alt={`Slide ${idx}`}
                className="w-full object-cover h-120 2xl:h-160"
              />
              <div className="flex items-center z-10 absolute bottom-0 bg-[rgba(0,0,0,0.3)] w-full h-12">
                <h6 className="text-white ml-5">LOREM IPSUM</h6>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
