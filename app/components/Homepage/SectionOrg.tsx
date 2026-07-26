"use client";

import Image from "next/image";
import Reveal from "../Reveal";
import Button from "../Button";
import { useEffect, useMemo, useState } from "react";
import { useLocaleStore } from "@/app/Stores/localeStore";
import {
  getAppComponentConfig,
  getImagePreviewUrl,
} from "@/lib/supabase/supabaseHelper";

type AppLabels = Record<string, string>;

const fallbackLabels: AppLabels = {
  secone_eyebrow: "Penggerak Konservasi",
  secone_right_title: "Maju Bersama Membangun Daerah",
  secone_left_title: "Kepala DKP Provinsi Maluku Utara",
  secone_button_label: "Struktur Organisasi",
  secone_right_tab_subtitle_1: "",
  secone_button_path: "/organisasi",
  secone_left_subtitle: "Nama Kadis",
  secone_right_tab_subtitle_2: "",
  secone_right_tab_title_1: "",
  secone_right_tab_title_2: "",
  secone_left_image_path: "/assets/transparent_img_placeholder.png",
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

  if (!src.trim()) return null;

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
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});
  const locale = useLocaleStore((state) => state.locale);

  useEffect(() => {
    let mounted = true;

    async function loadLabels() {
      try {
        const result = await getAppComponentConfig("secone", locale);

        if (mounted) {
          const nextLabels = mergeLabelsWithFallback(fallbackLabels, result.values);
          setLabels(nextLabels);
          setVisibility(result.visibility);
        }
      } catch (error) {
        console.error("Failed to load secone labels:", error);

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

  const isVisible = (target: string) => visibility[target] !== false;
  const leftVisible = [
    "secone_left_image_path",
    "secone_left_title",
    "secone_left_subtitle",
  ].some(isVisible);
  const leftImageOnly =
    isVisible("secone_left_image_path") &&
    !isVisible("secone_left_title") &&
    !isVisible("secone_left_subtitle");
  const firstTabVisible = [
    "secone_right_tab_title_1",
    "secone_right_tab_subtitle_1",
  ].some(isVisible);
  const secondTabVisible = [
    "secone_right_tab_title_2",
    "secone_right_tab_subtitle_2",
  ].some(isVisible);
  const rightVisible =
    isVisible("secone_right_title") || firstTabVisible || secondTabVisible;
  const buttonVisible =
    isVisible("secone_button_label") &&
    isVisible("secone_button_path") &&
    Boolean(labels.secone_button_label.trim()) &&
    Boolean(labels.secone_button_path.trim());

  if (
    !isVisible("secone_eyebrow") &&
    !leftVisible &&
    !rightVisible &&
    !buttonVisible
  )
    return null;

  return (
    <Reveal
      animation="fade-up"
      className="mx-6 my-12 rounded-4xl bg-gradient-to-br from-amber-50 via-white to-sky-100 px-6 py-10 shadow-xl ring-1 ring-amber-100 md:mx-12 md:px-10 md:py-14 2xl:mx-auto 2xl:max-w-7xl"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-10">
        {isVisible("secone_eyebrow") && (
          <p className="text-center text-sm font-bold uppercase tracking-[0.2em] text-sky-700 md:text-left">
            {labels.secone_eyebrow}
          </p>
        )}
        <div className="flex w-full flex-col items-start gap-10 md:flex-row md:justify-between lg:gap-16">
          {/* Left Side */}
          {leftVisible && <div className={`flex w-full flex-col items-center text-center md:min-w-0 md:grow md:basis-0 ${leftImageOnly ? "self-stretch" : ""}`}>
          {isVisible("secone_left_image_path") && <Reveal animation="scale-in" delay={120} className={`flex w-full items-center justify-center ${leftImageOnly ? "h-full grow self-stretch" : ""}`}>
            <div className={`relative flex w-full items-center justify-center ${leftImageOnly ? "h-full grow self-stretch" : "max-w-[360px]"}`}>
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
                className={`home-float relative z-10 h-auto max-h-full max-w-full object-contain ${leftImageOnly ? "w-auto" : "mb-5 w-[70%] sm:w-[55%] md:w-[80%] lg:w-[75%] xl:w-[70%]"}`}
                style={{
                  filter: "drop-shadow(-15px 10px 9px rgba(0,0,0,0.3))",
                }}
              />
            </div>
          </Reveal>}

          {(isVisible("secone_left_title") || isVisible("secone_left_subtitle")) && <Reveal animation="fade-up" delay={220}>
            {isVisible("secone_left_title") && <p className="text-center text-lg font-bold leading-relaxed md:text-left md:text-xl">
              {labels.secone_left_title}
            </p>}

            {isVisible("secone_left_subtitle") && <p className="text-center text-lg leading-relaxed md:text-left md:text-xl">
              {labels.secone_left_subtitle}
            </p>}
          </Reveal>}
          </div>}

          {/* Right Side */}
          {rightVisible && <div className="flex w-full flex-col gap-6 md:min-w-0 md:grow md:basis-0">
          {isVisible("secone_right_title") && <Reveal animation="fade-left" delay={100}>
            <h2 className="text-center md:text-left">
              {labels.secone_right_title}
            </h2>
          </Reveal>}

          <div className="flex flex-wrap justify-start gap-6 lg:gap-12">
            {firstTabVisible && (
              <Reveal
                animation="fade-up"
                delay={220}
                className="home-hover-lift min-w-[16rem] grow basis-[calc(50%_-_1.5rem)] rounded-2xl bg-white p-5 text-center shadow-xl md:bg-transparent md:p-0 md:text-left md:shadow-none"
              >
                <div className="flex justify-center md:justify-start">
                  <Image
                    src={getImagePreviewUrl(
                      "icon_images/icon_conservation_protect.png",
                    )}
                    width={800}
                    height={600}
                    className="h-12 w-12 object-contain pb-3 md:h-14 md:w-14 lg:h-16 lg:w-16"
                    alt="icon_1"
                  />
                </div>
                <div className="flex justify-center md:justify-start"></div>

                {isVisible("secone_right_tab_title_1") && <h3 className="text-xl font-bold lg:text-2xl">
                  {labels.secone_right_tab_title_1}
                </h3>}

                {isVisible("secone_right_tab_subtitle_1") && <p className="mb-3 whitespace-pre-line text-base leading-relaxed md:text-lg">
                  {labels.secone_right_tab_subtitle_1}
                </p>}
              </Reveal>
            )}

            {secondTabVisible && (
              <Reveal
                animation="fade-up"
                delay={340}
                className="home-hover-lift min-w-[16rem] grow basis-[calc(50%_-_1.5rem)] rounded-2xl bg-white p-5 text-center shadow-xl md:bg-transparent md:p-0 md:text-left md:shadow-none"
              >
                <div className="flex justify-center md:justify-start">
                  <Image
                    src={getImagePreviewUrl(
                      "icon_images/icon_conservation_education.png",
                    )}
                    width={800}
                    height={600}
                    className="h-12 w-12 object-contain pb-3 md:h-14 md:w-14 lg:h-16 lg:w-16"
                    alt="icon_2"
                  />
                </div>
                <div className="flex justify-center md:justify-start"></div>

                {isVisible("secone_right_tab_title_2") && <h3 className="text-xl font-bold lg:text-2xl">
                  {labels.secone_right_tab_title_2}
                </h3>}

                {isVisible("secone_right_tab_subtitle_2") && <p className="mb-3 whitespace-pre-line text-base leading-relaxed md:text-lg">
                  {labels.secone_right_tab_subtitle_2}
                </p>}
              </Reveal>
            )}
          </div>

          </div>}
        </div>

        {buttonVisible ? (
            <Reveal
              animation="fade-up"
              delay={420}
              className="flex w-full justify-center"
            >
              <Button
                size="xl"
                text={labels.secone_button_label}
                link={labels.secone_button_path}
              />
            </Reveal>
          ) : null}
      </div>
    </Reveal>
  );
}
