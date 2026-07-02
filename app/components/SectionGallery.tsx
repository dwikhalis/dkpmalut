"use client";

import { useEffect, useState } from "react";
import Carousel from "./Carousel";
import { getGallery } from "@/lib/supabase/supabaseHelper";
import Button from "./Button";
import Reveal from "./Reveal";

export default function SectionGallery() {
  const [pictures, setPictures] = useState<[string, string][]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPictures = async () => {
      try {
        const data = await getGallery();

        const images: Array<[string, string]> = [];

        data.forEach((item) => {
          images.push([item.image, item.title]);
        });

        setPictures(images);
      } catch (err) {
        console.error("Error fetching gallery:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPictures();
  }, []);

  return (
    <>
      {/* Desktop & Tablet */}
      <Reveal
        animation="fade-up"
        className="hidden md:block bg-gradient-to-r from-sky-700 to-sky-200 pt-12"
      >
        <div className="flex flex-col gap-6 py-12 md:px-12 px-6 mx-12 2xl:mx-24 justify-center items-center bg-sky-100 rounded-4xl shadow-2xl">
          <Reveal
            animation="fade-up"
            delay={80}
            className="flex flex-col mb-3 gap-6"
          >
            <h2 className="text-center">GALERI</h2>
            <h5 className="text-center">
              Galeri Kelautan dan Perikanan Maluku Utara
            </h5>
          </Reveal>

          <Reveal animation="scale-in" delay={180} className="w-full">
            {loading ? (
              <p>Loading...</p>
            ) : (
              <Carousel type="desktop" pictures={pictures} />
            )}
          </Reveal>

          <Reveal animation="fade-up" delay={320}>
            <Button size="xl" text="Lainnya" link="/galeri" />
          </Reveal>
        </div>
      </Reveal>

      {/* Mobile */}
      <Reveal animation="fade-up" className="md:hidden bg-sky-300 pb-10">
        <div className="flex flex-col gap-3 py-6 mx-6 justify-center items-center bg-sky-100 rounded-4xl shadow-xl">
          <Reveal
            animation="fade-up"
            delay={80}
            className="flex flex-col mb-3 gap-3"
          >
            <h2 className="text-center">GALERI</h2>
            <h5 className="text-center mx-12">
              Galeri Kelautan dan Perikanan Maluku Utara
            </h5>
          </Reveal>

          <Reveal animation="scale-in" delay={180} className="w-full">
            {loading ? (
              <p>Loading...</p>
            ) : (
              <Carousel type="mobile" pictures={pictures} />
            )}
          </Reveal>

          <Reveal animation="fade-up" delay={280}>
            <Button size="mobile-xl" text="Lainnya" link="/galeri" />
          </Reveal>
        </div>
      </Reveal>
    </>
  );
}
