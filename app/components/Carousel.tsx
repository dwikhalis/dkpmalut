"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";

import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "../globals.css";

interface ImageCarouselProps {
  pictures: [string, string][];
}

export default function Carousel({ pictures }: ImageCarouselProps) {
  const [showImage, setShowImage] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  const slides =
    pictures.length > 0
      ? pictures
      : [["/assets/image_placeholder.png", ""] as [string, string]];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!showImage) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowImage(false);
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [showImage]);

  const openPopup = (index: number) => {
    setActiveIndex(index);
    setShowImage(true);
  };

  const popup =
    mounted && showImage
      ? createPortal(
          <div
            className="fixed inset-0 z-[9999] flex h-dvh w-screen items-center justify-center bg-black/90 px-4 py-6"
            onClick={() => setShowImage(false)}
          >
            <button
              type="button"
              aria-label="Close image preview"
              className="absolute right-4 top-4 z-[10000] rounded-full bg-white/20 px-4 py-2 text-xl text-white backdrop-blur-sm hover:bg-white/30"
              onClick={() => setShowImage(false)}
            >
              ×
            </button>

            <div
              className="relative z-[9999] flex h-full w-full items-center justify-center"
              onClick={(event) => event.stopPropagation()}
            >
              <Swiper
                key={`popup-${activeIndex}`}
                modules={[Navigation, Pagination]}
                initialSlide={activeIndex}
                navigation
                pagination={{ clickable: true }}
                className="h-full w-full"
              >
                {slides.map((src, idx) => (
                  <SwiperSlide key={`popup-${idx}`}>
                    <div className="flex h-full w-full flex-col items-center justify-center">
                      <div className="flex max-h-[80dvh] w-full items-center justify-center">
                        <Image
                          src={src[0] || "/assets/image_placeholder.png"}
                          alt={src[1] || `Slide ${idx + 1}`}
                          width={1200}
                          height={900}
                          className="max-h-[75dvh] w-auto max-w-[92vw] object-contain"
                          priority={idx === activeIndex}
                        />
                      </div>

                      {src[1] && (
                        <h6 className="mt-4 max-w-[92vw] text-center text-sm text-white md:max-w-[70vw] md:text-base">
                          {src[1]}
                        </h6>
                      )}
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <Swiper
        modules={[Navigation, Pagination, Autoplay]}
        navigation
        pagination={{ clickable: true }}
        autoplay={{
          delay: 5000,
          disableOnInteraction: false,
        }}
        className="
          z-20 h-full w-full overflow-hidden
          rounded-xl md:rounded-2xl
          [&_.swiper-button-next]:hidden
          [&_.swiper-button-prev]:hidden
          md:[&_.swiper-button-next]:flex
          md:[&_.swiper-button-prev]:flex
        "
        speed={3000}
      >
        {slides.map((src, idx) => (
          <SwiperSlide key={idx}>
            <div className="mx-6 md:mx-0 px-6">
              <Image
                src={src[0] || "/assets/image_placeholder.png"}
                alt={src[1] || `Slide ${idx + 1}`}
                width={800}
                height={600}
                priority={idx === 0}
                className="
                  mb-12 w-full cursor-pointer object-cover
                  rounded-xl bg-white p-3
                  h-60
                  sm:h-72
                  md:h-80
                  lg:h-[30rem]
                  2xl:h-[40rem]
                  shadow-xl
                "
                onClick={() => openPopup(idx)}
              />
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      {popup}
    </>
  );
}
