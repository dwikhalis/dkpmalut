"use client";

import Link from "next/link";
import React from "react";
import Image from "next/image";

interface Props {
  tag: string;
  title: string;
  image: string;
  link: string;
}

export default function CardData({ tag, title, image, link }: Props) {
  return (
    <Link href={link}>
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
        <h6 className="text-stone-500 mb-1">{tag}</h6>
        <h5 className="font-bold">{title}</h5>
      </div>
    </Link>
  );
}
