"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "../globals.css";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";

interface ImageCarouselProps {
  pictures: [string, string][];
  type: "desktop" | "mobile";
}

export default function Carousel({ pictures, type }: ImageCarouselProps) {
  const [showImage, setShowImage] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

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
            <div
              className="relative z-[9999] flex w-full items-center justify-center"
              onClick={(event) => event.stopPropagation()}
            >
              <Swiper
                key={`popup-${activeIndex}-${type}`}
                initialSlide={activeIndex}
                className="h-full w-full"
              >
                {pictures.map((src, idx) => (
                  <SwiperSlide key={`popup-${idx}`}>
                    <div className="flex h-full w-full flex-col items-center justify-center">
                      <div className="flex max-h-[80dvh] w-full items-center justify-center">
                        <Image
                          src={
                            src[0] ? src[0] : "/assets/image_placeholder.png"
                          }
                          alt={src[1] || `Slide ${idx + 1}`}
                          width={1200}
                          height={900}
                          className="max-h-[75dvh] w-auto max-w-[92vw] object-contain"
                          priority
                        />
                      </div>

                      {src[1] && (
                        <h6 className="mt-4 max-w-[92vw] text-center text-white md:max-w-[70vw]">
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

  if (type === "desktop") {
    return (
      <>
        <Swiper
          modules={[Navigation, Pagination, Autoplay]}
          navigation
          pagination={{ clickable: true }}
          autoplay={{ delay: 5000 }}
          className="z-20 h-full w-full overflow-hidden rounded-2xl 2xl:h-160"
        >
          {pictures.map((src, idx) => (
            <SwiperSlide key={idx}>
              <Image
                src={src[0] ? src[0] : "/assets/image_placeholder.png"}
                alt={src[1] || `Slide ${idx + 1}`}
                width={800}
                height={600}
                className="mb-12 h-120 w-full cursor-pointer rounded-2xl object-cover md:h-80 lg:h-120 2xl:h-160"
                onClick={() => openPopup(idx)}
              />
            </SwiperSlide>
          ))}
        </Swiper>

        {popup}
      </>
    );
  }

  if (type === "mobile") {
    return (
      <>
        <Swiper
          modules={[Pagination, Autoplay]}
          pagination={{ clickable: true }}
          autoplay={{ delay: 5000 }}
          className="z-20 h-full w-full overflow-hidden"
        >
          {pictures.map((src, idx) => (
            <SwiperSlide key={idx}>
              <div className="mx-6">
                <Image
                  src={src[0] ? src[0] : "/assets/image_placeholder.png"}
                  alt={src[1] || `Slide ${idx + 1}`}
                  width={800}
                  height={600}
                  className="mb-12 h-60 w-full cursor-pointer rounded-xl bg-white p-3 object-cover"
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

  return null;
}
