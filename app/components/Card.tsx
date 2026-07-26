"use client";

import Link from "next/link";
import React from "react";
import Image from "next/image";
import { RightChevron } from "@/public/icons/iconSets";
import SpinnerLoading from "./SpinnerLoading";
import TableConfigValue from "./TableConfigValue";

interface DataItem {
  id: string;
  slug?: string;
  image: string;
  tag: string;
  date: string;
  title: string;
  content: string;
}

interface Props {
  type: "news-desktop" | "news-tablet" | "news-mobile" | "open";
  data: DataItem[] | null;
  id: string;
  loading?: boolean; // optional flag
}

export default function Card({ type, data, id, loading }: Props) {
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

  if (type === "news-desktop") {
    const { tag, title, image } = select;
    return (
      <Link href={`/berita/${select.slug || select.id}`}>
        <div className="flex flex-col w-70 h-120 p-6 shadow-2xl hover:shadow-xl justify-between rounded-2xl bg-white">
          <div className="w-full">
            <div className="flex justify-center items-center h-50 mb-3 overflow-hidden">
              <Image
                src={image}
                alt="Gambar"
                width={800}
                height={600}
                className="object-cover w-full h-full"
                loading="eager"
              />
            </div>
            <p className="mb-1 text-sm text-stone-500"><TableConfigValue table="news" field="tag" value={tag} /></p>
            <h3 className="text-xl font-bold leading-snug xl:text-[22px] 2xl:text-2xl">
              {title}
            </h3>
          </div>
          <div className="flex items-center text-sky-500 hover:text-sky-300">
            <span className="py-6 text-base">Selengkapnya</span>
            <RightChevron className="w-3 h-3" />
          </div>
        </div>
      </Link>
    );
  } else if (type === "news-tablet") {
    const { tag, title, image } = select;
    return (
      <Link href={`/berita/${select.slug || select.id}`}>
        <div className="flex h-80 w-45 flex-col justify-between rounded-2xl bg-white p-3 shadow-2xl hover:shadow-xl">
          <div className="min-w-0 w-full">
            <div className="flex justify-center items-center h-30 mb-3 overflow-hidden">
              <Image
                src={image}
                alt="Gambar"
                width={800}
                height={600}
                className="object-cover w-full h-full"
                loading="eager"
              />
            </div>
            <p className="mb-1 text-sm text-stone-500"><TableConfigValue table="news" field="tag" value={tag} /></p>
            <h3 className="line-clamp-3 text-lg font-bold leading-snug [overflow-wrap:anywhere]">
              {title}
            </h3>
          </div>
          <div className="flex items-center text-sky-500 hover:text-sky-300">
            <span className="py-3 text-sm">Selengkapnya</span>
            <RightChevron className="w-3 h-3" />
          </div>
        </div>
      </Link>
    );
  } else if (type === "news-mobile") {
    const { tag, title, image } = select;
    return (
      <Link href={`/berita/${select.slug || select.id}`}>
        <div className="flex h-80 w-45 flex-col justify-between rounded-2xl bg-white p-3 shadow-2xl hover:shadow-xl">
          <div className="min-w-0 w-full">
            <div className="flex justify-center items-center h-35 mb-3 overflow-hidden">
              <Image
                src={image}
                alt="Gambar"
                width={800}
                height={600}
                className="object-cover w-full h-full"
                loading="eager"
              />
            </div>
            <p className="mb-1 text-xs text-stone-500"><TableConfigValue table="news" field="tag" value={tag} /></p>
            <h3 className="line-clamp-3 text-sm font-bold leading-tight [overflow-wrap:anywhere]">
              {title}
            </h3>
          </div>
          <div className="flex items-center text-sky-500 hover:text-sky-300">
            <span className="py-3 text-xs">Selengkapnya</span>
            <RightChevron className="w-3 h-3" />
          </div>
        </div>
      </Link>
    );
  } else if (type === "open") {
    const { tag, title, image, date } = select;
    return (
      <Link href={`/berita/${select.slug || select.id}`} className="block h-full">
        <article className="h-full overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-stone-200 transition duration-200 hover:-translate-y-1 hover:shadow-xl">
          <div className="flex h-50 items-center justify-center overflow-hidden bg-stone-100">
            <Image
              src={image ? image : "/assets/image_placeholder.png"}
              alt={title}
              width={800}
              height={600}
              className="h-full w-full object-cover transition duration-300 hover:scale-105"
            />
          </div>
          <div className="p-5">
            <p className="mb-2 text-sm text-stone-500">
              <TableConfigValue table="news" field="tag" value={tag} /> / {date}
            </p>
            <h3 className="text-lg font-bold leading-snug text-stone-900">{title}</h3>
          </div>
        </article>
      </Link>
    );
  }

  return null;
}
