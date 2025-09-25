"use client";

import Link from "next/link";
import React from "react";
import Image from "next/image";
import { RightChevron } from "@/public/icons/iconSets";

interface DataItem {
  id: string;
  image: string;
  tag: string;
  date: string;
  title: string;
  content: string;
}

interface Props {
  type: "container" | "container-sm" | "container-mobile" | "open";
  data: DataItem[] | null;
  id: string;
  loading?: boolean; // optional flag
}

export default function Card({ type, data, id, loading }: Props) {
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

  if (type === "container") {
    const { tag, title, image } = select;
    return (
      <Link href={`/Berita/${id}`}>
        <div className="flex flex-col w-70 h-120 p-6 shadow-2xl hover:shadow-xl justify-between rounded-2xl bg-white">
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
            <h6 className="text-stone-500 mb-1">{tag}</h6>
            <h5 className="font-bold">{title}</h5>
          </div>
          <div className="flex items-center text-sky-500 hover:text-sky-300">
            <h5 className="py-6">Selengkapnya</h5>
            <RightChevron className="w-3 h-3" />
          </div>
        </div>
      </Link>
    );
  } else if (type === "container-sm") {
    const { tag, title, image } = select;
    return (
      <Link href={`/Berita/${id}`}>
        <div className="flex flex-col w-45 h-70 p-3 shadow-2xl hover:shadow-xl justify-between rounded-2xl bg-white">
          <div className="w-full">
            <div className="flex justify-center items-center h-30 mb-3 overflow-hidden">
              <Image
                src={image}
                alt="Gambar"
                width={800}
                height={600}
                className="object-cover w-full h-full"
              />
            </div>
            <h6 className="text-stone-500 mb-1">{tag}</h6>
            <h5 className="font-bold">{title}</h5>
          </div>
          <div className="flex items-center text-sky-500 hover:text-sky-300">
            <h5 className="py-6">Selengkapnya</h5>
            <RightChevron className="w-3 h-3" />
          </div>
        </div>
      </Link>
    );
  } else if (type === "container-mobile") {
    const { tag, title, image } = select;
    return (
      <Link href={`/Berita/${id}`}>
        <div className="flex flex-col w-full h-90 p-3 shadow-2xl hover:shadow-xl justify-between rounded-2xl bg-white">
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
            <h6 className="text-stone-500 mb-1">{tag}</h6>
            <h5 className="font-bold">{title}</h5>
          </div>
          <div className="flex items-center text-sky-500 hover:text-sky-300">
            <h5 className="py-6">Selengkapnya</h5>
            <RightChevron className="w-3 h-3" />
          </div>
        </div>
      </Link>
    );
  } else if (type === "open") {
    const { tag, title, image, date } = select;
    return (
      <Link href={`/Berita/${id}`}>
        <div className="w-full">
          <div className="flex justify-center items-center h-50 mb-3 overflow-hidden">
            <Image
              src={image ? image : "/assets/image_placeholder.png"}
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
      </Link>
    );
  }

  return null;
}
