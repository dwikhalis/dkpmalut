"use client";

import { useEffect, useState } from "react";
import Carousel from "./Carousel";
import {
  getAppLabelComponent,
  getGallery,
} from "@/lib/supabase/supabaseHelper";
import Button from "./Button";
import Reveal from "./Reveal";
import { useLocaleStore } from "../Stores/localeStore";

type AppLabels = Record<string, string>;

type GalleryItem = {
  image: string;
  title: string;
};

type CarouselType = "desktop" | "mobile";

const fallbackLabels: AppLabels = {
  secfour_button_label: "Lainnya",
  secfour_button_path: "/galeri",
  secfour_subtitle_1: "",
  secfour_subtitle_2: "Galeri Kelautan dan Perikanan Maluku Utara",
  secfour_title: "Galeri",
};

function mergeLabelsWithFallback(
  fallback: AppLabels,
  result: Partial<AppLabels> | null | undefined,
) {
  const merged = { ...fallback };

  Object.entries(result ?? {}).forEach(([key, value]) => {
    const cleanValue = typeof value === "string" ? value.trim() : "";

    if (cleanValue) {
      merged[key] = cleanValue;
    }
  });

  return merged;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");

    const updateIsMobile = () => {
      setIsMobile(mediaQuery.matches);
    };

    updateIsMobile();

    mediaQuery.addEventListener("change", updateIsMobile);

    return () => {
      mediaQuery.removeEventListener("change", updateIsMobile);
    };
  }, []);

  return isMobile;
}

export default function SectionGallery() {
  const [pictures, setPictures] = useState<[string, string][]>([]);
  const [loading, setLoading] = useState(true);

  const [labels, setLabels] = useState<AppLabels>(fallbackLabels);
  const locale = useLocaleStore((state) => state.locale);
  const isMobile = useIsMobile();

  const carouselType: CarouselType = isMobile ? "mobile" : "desktop";
  const buttonSize = isMobile ? "mobile-xl" : "xl";

  useEffect(() => {
    let mounted = true;

    async function loadLabels() {
      try {
        const result = await getAppLabelComponent("secfour", locale);

        if (mounted) {
          setLabels(mergeLabelsWithFallback(fallbackLabels, result));
        }
      } catch (error) {
        console.error("Failed to load secfour labels:", error);

        if (mounted) {
          setLabels(fallbackLabels);
        }
      }
    }

    loadLabels();

    return () => {
      mounted = false;
    };
  }, [locale]);

  useEffect(() => {
    let mounted = true;

    async function fetchPictures() {
      try {
        const data = await getGallery();

        const images: [string, string][] = (data as GalleryItem[]).map(
          (item) => [item.image, item.title],
        );

        if (mounted) {
          setPictures(images);
        }
      } catch (err) {
        console.error("Error fetching gallery:", err);

        if (mounted) {
          setPictures([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchPictures();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section className="pb-10 pt-0 md:py-6">
      <Reveal
        animation="fade-up"
        className="mx-6 rounded-4xl bg-sky-100 shadow-xl md:mx-12 md:shadow-2xl 2xl:mx-24"
      >
        <div className="flex flex-col items-center justify-center gap-4 rounded-4xl px-4 py-6 md:gap-6 md:px-12 md:py-12">
          <Reveal
            animation="fade-up"
            delay={80}
            className="flex flex-col items-center gap-3 md:gap-4"
          >
            <h2 className="text-center">{labels.secfour_title}</h2>

            {labels.secfour_subtitle_1 && (
              <h4 className="mx-auto max-w-[520px] text-center font-bold leading-relaxed">
                {labels.secfour_subtitle_1}
              </h4>
            )}

            <h4 className="mx-auto max-w-[520px] text-center font-light leading-relaxed">
              {labels.secfour_subtitle_2}
            </h4>
          </Reveal>

          <Reveal animation="scale-in" delay={180} className="w-full">
            {loading ? (
              <p className="w-full text-center">Loading...</p>
            ) : pictures.length === 0 ? (
              <p className="w-full text-center">Tidak ada gambar.</p>
            ) : (
              <Carousel type={carouselType} pictures={pictures} />
            )}
          </Reveal>

          <Reveal animation="fade-up" delay={320}>
            <Button
              size={buttonSize}
              text={labels.secfour_button_label}
              link={labels.secfour_button_path}
            />
          </Reveal>
        </div>
      </Reveal>
    </section>
  );
}
