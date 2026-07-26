"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";
import SpinnerLoading from "./SpinnerLoading";
import TableConfigValue from "./TableConfigValue";

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
        <SpinnerLoading size="sm" color="black" />
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
        <article className="h-full w-full overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-stone-200 transition duration-200 hover:-translate-y-1 hover:shadow-xl">
          <div className="flex h-50 items-center justify-center overflow-hidden bg-stone-100">
            <Image
              src={image || "/assets/image_placeholder.png"}
              alt={title}
              width={800}
              height={600}
              className="h-full w-full object-cover transition duration-300 hover:scale-105"
              onClick={() => setShowImage("fixed")}
            />
          </div>
          <div className="p-5">
            <p className="mb-2 text-sm text-stone-500">
              <TableConfigValue table="gallery" field="tag" value={tag} /> / {date}
            </p>
            <h3 className="text-lg font-bold leading-snug text-stone-900">{title}</h3>
          </div>
        </article>

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
            <h2 className="mx-3 w-full pt-3 text-xl text-white">{title}</h2>
            <p className="mx-3 w-full pt-3 text-base text-white">
              {description}
            </p>
          </div>
        </div>
      </>
    );
  }

  return null;
}
