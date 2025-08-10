"use client";

import React, { useEffect, useState } from "react";
import Carousel from "./Carousel";
import Link from "next/link";
import { getGallery } from "@/lib/supabase/getHelper";

export default function SectionFour() {
  const [pictures, setPictures] = useState<[string, string][]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPictures = async () => {
      try {
        const data = await getGallery();

        const images: Array<[string, string]> = [];
        data.forEach((e) => {
          images.push([e.image, e.title]);
        });

        setPictures(images);
      } catch (err) {
        console.error("Error fetching news:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPictures();
  }, []);
  return (
    <div className="flex flex-col gap-6 py-12 md:px-12 px-6 xl:mx-24 justify-center items-center">
      <div className="flex flex-col mb-3 gap-6">
        <h2 className="text-center">GALERI</h2>
        <h5 className="text-center">
          Galeri Kelautan dan Perikanan Maluku Utara
        </h5>
      </div>
      {loading ? <p>Loading...</p> : <Carousel pictures={pictures} />}
      <button className="px-7 py-3 bg-black text-white rounded-full hover:bg-stone-400 hover:text-black cursor-pointer">
        <Link href="/Galeri">
          <h5>Lainnya</h5>
        </Link>
      </button>
    </div>
  );
}
