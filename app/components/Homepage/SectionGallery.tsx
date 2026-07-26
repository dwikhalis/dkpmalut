"use client";

import { useEffect, useState } from "react";
import Carousel from "../Carousel";
import {
  getAppComponentConfig,
  getGallery,
} from "@/lib/supabase/supabaseHelper";
import Button from "../Button";
import Reveal from "../Reveal";
import SpinnerLoading from "../SpinnerLoading";
import { useLocaleStore } from "@/app/Stores/localeStore";

type AppLabels = Record<string, string>;

type GalleryItem = {
  image: string;
  title: string;
};

type CarouselType = "desktop" | "mobile";

const fallbackLabels: AppLabels = {
  secfour_eyebrow: "Lihat Lebih Dekat",
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
    if (typeof value === "string") merged[key] = value;
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
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});
  const locale = useLocaleStore((state) => state.locale);
  const isMobile = useIsMobile();

  const carouselType: CarouselType = isMobile ? "mobile" : "desktop";
  const buttonSize = isMobile ? "mobile-xl" : "xl";

  useEffect(() => {
    let mounted = true;

    async function loadLabels() {
      try {
        const result = await getAppComponentConfig("secfour", locale);

        if (mounted) {
          setLabels(mergeLabelsWithFallback(fallbackLabels, result.values));
          setVisibility(result.visibility);
        }
      } catch (error) {
        console.error("Failed to load secfour labels:", error);

        if (mounted) {
          setLabels(fallbackLabels);
          setVisibility({});
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
        const data = await getGallery(locale);

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
  }, [locale]);

  return (
    <section className="bg-gradient-to-br from-sky-950 via-blue-950 to-cyan-950 px-6 py-14 md:px-12 md:py-20 2xl:px-24">
      <Reveal
        animation="fade-up"
        className="mx-auto max-w-7xl rounded-4xl bg-white/10 shadow-2xl ring-1 ring-white/15 backdrop-blur-sm"
      >
        <div className="flex flex-col items-center justify-center gap-4 rounded-4xl px-4 py-6 md:gap-6 md:px-12 md:py-12">
          {(visibility.secfour_eyebrow !== false ||
            visibility.secfour_title !== false ||
            visibility.secfour_subtitle_1 !== false ||
            visibility.secfour_subtitle_2 !== false) && (
            <Reveal
              animation="fade-up"
              delay={80}
              className="flex flex-col items-center gap-3 md:gap-4"
            >
              {visibility.secfour_eyebrow !== false && (
                <p className="text-center text-sm font-bold uppercase tracking-[0.2em] text-cyan-300">
                  {labels.secfour_eyebrow}
                </p>
              )}
              {visibility.secfour_title !== false && (
                <h2 className="text-center text-white">{labels.secfour_title}</h2>
              )}

              {visibility.secfour_subtitle_1 !== false &&
                labels.secfour_subtitle_1 && (
                  <p className="mx-auto max-w-[520px] text-center text-lg font-bold leading-relaxed text-white md:text-xl">
                    {labels.secfour_subtitle_1}
                  </p>
                )}

              {visibility.secfour_subtitle_2 !== false && (
                <p className="mx-auto max-w-[520px] text-center text-lg font-light leading-relaxed text-sky-100 md:text-xl">
                  {labels.secfour_subtitle_2}
                </p>
              )}
            </Reveal>
          )}

          <Reveal animation="scale-in" delay={180} className="w-full">
            {loading ? (
              <SpinnerLoading size="sm" color="white" />
            ) : pictures.length === 0 ? (
              <p className="w-full text-center text-sky-100">Tidak ada gambar.</p>
            ) : (
              <Carousel pictures={pictures} />
            )}
          </Reveal>

          {visibility.secfour_button_label !== false &&
          visibility.secfour_button_path !== false &&
          labels.secfour_button_label.trim() &&
          labels.secfour_button_path.trim() ? (
            <Reveal animation="fade-up" delay={320}>
              <Button
                size={buttonSize}
                text={labels.secfour_button_label}
                link={labels.secfour_button_path}
              />
            </Reveal>
          ) : null}
        </div>
      </Reveal>
    </section>
  );
}
