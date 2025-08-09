"use client";

import React from "react";
import Image from "next/image";

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
  loading?: boolean; // optional flag
}

export default function Gallery({ type, data, id, loading }: Props) {
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
    const { tag, title, image, date } = select;
    return (
      <div className="w-full">
        <div className="flex justify-center items-center h-50 mb-3 overflow-hidden">
          <Image
            src={image}
            alt="Gambar"
            width={800}
            height={600}
            className="object-cover w-full h-full"
          />
        </div>
        <h6 className="text-stone-500 mb-1">
          {tag} / {date}
        </h6>
        <h5 className="font-bold">{title}</h5>
      </div>
    );
  }

  return null;
}
