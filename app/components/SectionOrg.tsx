"use client";

import Image from "next/image";
import Reveal from "./Reveal";
import { useEffect, useMemo, useState } from "react";
import { useLocaleStore } from "../Stores/localeStore";
import {
  getAppLabelComponent,
  getImagePreviewUrl,
} from "@/lib/supabase/supabaseHelper";

type AppLabels = Record<string, string>;

const fallbackLabels: AppLabels = {
  secone_right_title: "Maju Bersama Membangun Daerah",
  secone_left_title: "Kepala DKP Provinsi Maluku Utara",
  secone_right_button_label: "Struktur Organisasi",
  secone_right_tab_subtitle_1:
    "Kami memiliki Visi untuk mewujudkan: 1. Visi Pertama 2. Visi Kedua 3. Visi Ketiga",
  secone_right_button_path: "/organisasi",
  secone_left_subtitle: "Fauzi Momole, S.Pi",
  secone_right_tab_subtitle_2:
    "Melalui program kerja Dinas Kelautan dan Perikanan 1. Misi Pertama 2. Misi Kedua 3. Misi Ketiga",
  secone_right_tab_title_1: "Visi",
  secone_right_tab_title_2: "Misi",
  secone_left_image_path: "/assets/pic_kadis.png",
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

function PreviewImage({
  src,
  fallbackSrc,
  alt,
  className,
  priority = false,
  style,
}: {
  src: string;
  fallbackSrc: string;
  alt: string;
  className?: string;
  priority?: boolean;
  style?: React.CSSProperties;
}) {
  const [imageSrc, setImageSrc] = useState(
    getImagePreviewUrl(src) || fallbackSrc,
  );

  useEffect(() => {
    setImageSrc(getImagePreviewUrl(src) || fallbackSrc);
  }, [src, fallbackSrc]);

  return (
    <Image
      src={imageSrc}
      width={800}
      height={600}
      className={className}
      style={style}
      alt={alt}
      priority={priority}
      onError={() => setImageSrc(fallbackSrc)}
    />
  );
}

export default function SectionOrg() {
  const [labels, setLabels] = useState<AppLabels>(fallbackLabels);
  const locale = useLocaleStore((state) => state.locale);

  useEffect(() => {
    let mounted = true;

    async function loadLabels() {
      try {
        const result = await getAppLabelComponent("secone", locale);

        if (mounted) {
          setLabels(mergeLabelsWithFallback(fallbackLabels, result));
        }
      } catch (error) {
        console.error("Failed to load secone labels:", error);

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

  const tabs = useMemo(
    () => [
      {
        title: labels.secone_right_tab_title_1,
        subtitle: labels.secone_right_tab_subtitle_1,
        icon: "/assets/icon_vision.png",
        alt: "Ikon Visi",
        delay: 220,
      },
      {
        title: labels.secone_right_tab_title_2,
        subtitle: labels.secone_right_tab_subtitle_2,
        icon: "/assets/icon_mission.png",
        alt: "Ikon Misi",
        delay: 340,
      },
    ],
    [labels],
  );

  return (
    <Reveal
      animation="fade-up"
      className="mb-8 rounded-t-4xl bg-sky-100 px-6 py-10 md:mb-0 md:px-8 md:py-14 lg:px-12 lg:py-20"
    >
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-10 md:flex-row md:items-start md:justify-between lg:gap-16">
        {/* Left Side */}
        <div className="flex w-full flex-col items-center text-center md:w-[45%]">
          <Reveal animation="scale-in" delay={120}>
            <div className="relative flex w-full max-w-[360px] items-center justify-center md:max-w-none">
              <svg
                viewBox="0 0 120 120"
                className="absolute h-full w-full"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="currentColor"
                  className="text-sky-300"
                />
              </svg>

              <PreviewImage
                src={labels.secone_left_image_path}
                fallbackSrc={fallbackLabels.secone_left_image_path}
                alt="Kepala Dinas"
                priority
                className="home-float relative z-10 mb-5 w-[70%] object-contain sm:w-[55%] md:w-[80%] lg:w-[75%] xl:w-[70%]"
                style={{
                  filter: "drop-shadow(-15px 10px 9px rgba(0,0,0,0.3))",
                }}
              />
            </div>
          </Reveal>

          <Reveal animation="fade-up" delay={220}>
            <h4 className="font-bold text-center md:text-left">
              {labels.secone_left_title}
            </h4>

            <h4 className="text-center md:text-left">
              {labels.secone_left_subtitle}
            </h4>
          </Reveal>
        </div>

        {/* Right Side */}
        <div className="flex w-full flex-col gap-6 md:w-[50%]">
          <Reveal animation="fade-left" delay={100}>
            <h2 className="text-center md:text-left">
              {labels.secone_right_title}
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-10 lg:gap-12">
            {tabs.map((tab) => (
              <Reveal
                key={tab.title}
                animation="fade-up"
                delay={tab.delay}
                className="home-hover-lift rounded-2xl bg-white p-5 text-center shadow-xl md:bg-transparent md:p-0 md:text-left md:shadow-none"
              >
                <div className="flex justify-center md:justify-start">
                  <Image
                    src={tab.icon}
                    width={800}
                    height={600}
                    className="h-12 w-12 object-contain pb-3 md:h-[5vw] md:w-[4vw] lg:h-16 lg:w-16"
                    alt={tab.alt}
                  />
                </div>

                <h3 className="font-bold">{tab.title}</h3>

                <h5 className="mb-3 whitespace-pre-line leading-relaxed">
                  {tab.subtitle}
                </h5>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </Reveal>
  );
}
