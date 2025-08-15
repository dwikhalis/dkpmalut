"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";

import { Swiper, SwiperSlide } from "swiper/react";
import { Swiper as SwiperType } from "swiper";

interface DataItem {
  id: string;
  image: string;
  tag: string;
  title: string;
  date: string;
  description: string;
}

interface Props {
  type: string;
  data: DataItem[] | null;
  id: string;
  loading?: boolean;
}

export default function Gallery({ type, data, id, loading }: Props) {
  const [showImage, setShowImage] = useState("hidden");

  // grab-to-scroll state
  const boxRef = useRef<HTMLDivElement>(null);
  const isDown = useRef(false);
  const startY = useRef(0);
  const startScrollTop = useRef(0);

  const onPointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (!boxRef.current) return;
    isDown.current = true;
    startY.current = e.clientY;
    startScrollTop.current = boxRef.current.scrollTop;
    boxRef.current.setPointerCapture?.(e.pointerId);
    boxRef.current.style.cursor = "grabbing";
    document.body.style.userSelect = "none";
  };

  const onPointerMove: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (!isDown.current || !boxRef.current) return;
    const dy = e.clientY - startY.current;
    boxRef.current.scrollTop = startScrollTop.current - dy;
  };

  const endDrag = (e?: React.PointerEvent<HTMLDivElement>) => {
    if (!boxRef.current) return;
    isDown.current = false;
    if (e) boxRef.current.releasePointerCapture?.(e.pointerId);
    boxRef.current.style.cursor = "";
    document.body.style.userSelect = "";
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <p>Loading...</p>
      </div>
    );
  }

  if (!data || data.length === 0) return null;

  const select = data.find((d) => d.id === id);
  if (!select) return null;

  if (type === "regular") {
    const { tag, title, image, date, description } = select;
    return (
      <>
        <div className="w-full">
          <div className="flex justify-center items-center h-50 mb-3 overflow-hidden">
            <Image
              src={image || "/assets/image_placeholder.png"}
              alt="Gambar"
              width={800}
              height={600}
              className="object-cover w-full h-full"
              onClick={() => setShowImage("fixed")}
            />
          </div>
          <h6 className="text-stone-500 mb-1">
            {tag} / {date}
          </h6>
          <h5 className="font-bold">{title}</h5>
        </div>

        {/* Popup */}
        <div
          className={`${showImage} fixed inset-0 flex bg-[rgba(0,0,0,0.8)] items-center justify-center z-20`}
          onClick={() => setShowImage("hidden")}
        >
          <div
            ref={boxRef}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onPointerLeave={endDrag}
            className="flex flex-col max-h-[70vh] max-w-[80%] xl:w-[50%] overflow-y-auto scrollbar-hide touch-pan-y cursor-grab"
          >
            <Image
              src={image || "/assets/image_placeholder.png"}
              alt="Gambar"
              width={800}
              height={600}
              className="max-h-[80vh] object-contain select-none"
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
            />
            <h6 className="text-white mx-3 pt-3 w-full">{title}</h6>
            <h6 className="text-white mx-3 pt-3 w-full">{description}</h6>
          </div>
        </div>
      </>
    );
  }

  return null;
}
