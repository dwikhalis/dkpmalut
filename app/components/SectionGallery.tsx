"use client";

import React, { useEffect, useState } from "react";
import Carousel from "./Carousel";
import { getGallery } from "@/lib/supabase/supabaseHelper";
import Button from "./Button";

export default function SectionGallery() {
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
    <>
      {/* // ! DESKTOP & TABLET */}
      <section className="hidden md:block bg-gradient-to-r from-sky-700 to-sky-200 pt-12">
        <div className="flex flex-col gap-6 py-12 md:px-12 px-6 mx-12 2xl:mx-24 justify-center items-center bg-sky-100 rounded-4xl shadow-2xl">
          <div className="flex flex-col mb-3 gap-6">
            <h2 className="text-center">GALERI</h2>
            <h5 className="text-center">
              Galeri Kelautan dan Perikanan Maluku Utara
            </h5>
          </div>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <Carousel type="desktop" pictures={pictures} />
          )}
          <Button size="xl" text="Lainnya" link="/Galeri" />
        </div>
      </section>

      {/* // ! MOBILE */}
      <section className="md:hidden bg-sky-300 pb-10">
        <div className="flex flex-col gap-3 py-6 mx-6 justify-center items-center bg-sky-100 rounded-4xl shadow-xl">
          <div className="flex flex-col mb-3 gap-3">
            <h2 className="text-center">GALERI</h2>
            <h5 className="text-center mx-12">
              Galeri Kelautan dan Perikanan Maluku Utara
            </h5>
          </div>
          <div className="w-full">
            {loading ? (
              <p>Loading...</p>
            ) : (
              <Carousel type="mobile" pictures={pictures} />
            )}
          </div>
          <Button size="mobile-xl" text="Lainnya" link="/Galeri" />
        </div>
      </section>
    </>
  );
}
