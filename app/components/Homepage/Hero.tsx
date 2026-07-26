"use client";

import Image from "next/image";
import Button from "../Button";
import { useEffect, useState } from "react";
import { useLocaleStore } from "@/app/Stores/localeStore";
import {
  getAppComponentConfig,
  getImagePreviewUrl,
} from "@/lib/supabase/supabaseHelper";

type AppLabels = Record<string, string>;

const fallbackLabels: AppLabels = {
  hero_eyebrow: "Kawasan Konservasi Maluku Utara",
  hero_title: "Jelajahi Laut, Jaga Kehidupan",
  hero_button_label: "Jelajahi Kawasan",
  hero_subtitle:
    "Temukan kawasan konservasi dan wisata bahari Maluku Utara. Berkunjung dengan bijak, menikmati alam, dan ikut menjaga laut untuk generasi mendatang.",
  hero_button_path: "/explore",
  hero_secondary_button_label: "Beli Tiket",
  hero_secondary_button_path: "/payment",
  hero_image_desktop: "icon_images/icon_conservation_tourism.png",
  hero_image_mobile: "icon_images/icon_conservation_island.png",
};

export default function Hero() {
  const [labels, setLabels] = useState<AppLabels>(fallbackLabels);
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});
  const locale = useLocaleStore((state) => state.locale);

  //! GET APP LABELS
  useEffect(() => {
    let mounted = true;

    async function loadLabels() {
      const result = await getAppComponentConfig("hero", locale);

      if (mounted) {
        setLabels({
          ...fallbackLabels,
          ...result.values,
        });
        setVisibility(result.visibility);
      }
    }

    loadLabels();

    return () => {
      mounted = false;
    };
  }, [locale]);

  return (
    <section className="relative">
      {/* Desktop Hero */}
      <div className="relative z-10 hidden min-h-[36rem] grid-cols-[minmax(0,1.08fr)_minmax(16rem,0.92fr)] items-center overflow-hidden bg-gradient-to-br from-sky-950 via-sky-800 to-cyan-600 lg:grid 2xl:min-h-[42rem]">
        <div className="z-10 flex min-w-0 flex-col justify-center gap-7 px-12 pb-28 pt-12 lg:pb-40 lg:pt-24 2xl:px-24">
          {visibility.hero_eyebrow !== false && (
            <p className="home-animate home-animate-in home-fade-right text-sm font-bold uppercase tracking-[0.22em] text-cyan-200">
              {labels.hero_eyebrow}
            </p>
          )}
          {visibility.hero_title !== false && (
            <h1 className="home-animate home-animate-in home-fade-right whitespace-pre-line text-5xl font-semibold leading-tight text-white lg:text-6xl 2xl:text-7xl">
              {labels.hero_title}
            </h1>
          )}

          {visibility.hero_subtitle !== false && (
            <p
              className="home-animate home-animate-in home-fade-up text-xl leading-relaxed text-white md:w-[50%] lg:w-full lg:text-2xl"
              style={{ animationDelay: "360ms" }}
            >
              {labels.hero_subtitle}
            </p>
          )}

          {visibility.hero_button_label !== false &&
          visibility.hero_button_path !== false &&
          labels.hero_button_label.trim() &&
          labels.hero_button_path.trim() ? (
            <div
              className="home-animate home-animate-in home-fade-up flex flex-wrap gap-3"
              style={{ animationDelay: "520ms" }}
            >
              <Button
                size="custom"
                className="border border-white bg-amber-400 px-8 py-4 text-base text-sky-950 hover:bg-amber-300 lg:text-lg"
                text={labels.hero_button_label}
                link={labels.hero_button_path}
              />
              {visibility.hero_secondary_button_label !== false &&
              visibility.hero_secondary_button_path !== false &&
              labels.hero_secondary_button_label?.trim() &&
              labels.hero_secondary_button_path?.trim() ? (
                <Button
                  size="custom"
                  variant="outline"
                  className="border-white/70 bg-white/10 px-8 py-4 text-base text-white backdrop-blur-sm hover:bg-white hover:text-sky-950 lg:text-lg"
                  text={labels.hero_secondary_button_label}
                  link={labels.hero_secondary_button_path}
                />
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="absolute inset-0 -z-1 bg-[radial-gradient(circle_at_78%_45%,rgba(255,255,255,0.24),transparent_34%)]" />

        {visibility.hero_image_desktop !== false &&
          labels.hero_image_desktop?.trim() && (
            <div className="z-10 flex items-center justify-center">
              <Image
                alt="Wisata bahari bertanggung jawab di kawasan konservasi"
                src={getImagePreviewUrl(labels.hero_image_desktop)}
                width={1200}
                height={1200}
                className="home-soft-zoom w-full object-contain"
                priority
              />
            </div>
          )}
      </div>

      {/*//! Mobile Hero */}
      <div className="overflow-hidden bg-gradient-to-b from-sky-950 via-sky-700 to-cyan-500 lg:hidden">
        <div className="mx-6 flex min-h-[23rem] flex-col items-center justify-center gap-6 pb-6 pt-10">
          {visibility.hero_eyebrow !== false && (
            <p className="home-animate home-animate-in home-fade-up text-center text-xs font-bold uppercase tracking-[0.2em] text-cyan-100">
              {labels.hero_eyebrow}
            </p>
          )}
          {visibility.hero_title !== false && (
            <h1 className="home-animate home-animate-in home-fade-up text-center text-4xl font-semibold leading-tight text-white">
              {labels.hero_title}
            </h1>
          )}

          {visibility.hero_subtitle !== false && (
            <p
              className="home-animate home-animate-in home-fade-up text-center text-lg leading-relaxed text-white"
              style={{ animationDelay: "140ms" }}
            >
              {labels.hero_subtitle}
            </p>
          )}

          {visibility.hero_button_label !== false &&
          visibility.hero_button_path !== false &&
          labels.hero_button_label.trim() &&
          labels.hero_button_path.trim() ? (
            <div
              className="home-animate home-animate-in home-fade-up flex w-full flex-wrap justify-center gap-3"
              style={{ animationDelay: "280ms" }}
            >
              <Button
                size="custom"
                className="border border-white bg-amber-400 px-8 py-4 text-base text-sky-950 hover:bg-amber-300"
                text={labels.hero_button_label}
                link={labels.hero_button_path}
              />
              {visibility.hero_secondary_button_label !== false &&
              visibility.hero_secondary_button_path !== false &&
              labels.hero_secondary_button_label?.trim() &&
              labels.hero_secondary_button_path?.trim() ? (
                <Button
                  size="custom"
                  variant="outline"
                  className="border-white/70 bg-white/10 px-8 py-4 text-base text-white hover:bg-white hover:text-sky-950"
                  text={labels.hero_secondary_button_label}
                  link={labels.hero_secondary_button_path}
                />
              ) : null}
            </div>
          ) : null}
        </div>

        {visibility.hero_image_mobile !== false &&
          labels.hero_image_mobile?.trim() && (
            <Image
              alt="Perjalanan menuju kawasan konservasi pulau"
              src={getImagePreviewUrl(labels.hero_image_mobile)}
              width={1200}
              height={1200}
              className="home-soft-zoom"
              priority
            />
          )}
      </div>

      <div
        className="pointer-events-none absolute inset-x-0 bottom-[-1px] z-20 h-20 overflow-hidden lg:h-32"
        aria-hidden="true"
      >
        <svg
          className="home-wave-track absolute inset-x-0 bottom-0 z-10 h-full w-[200%]"
          viewBox="0 0 2880 120"
          preserveAspectRatio="none"
        >
          <path
            d="M0 58 C240 0 480 116 720 58 C960 0 1200 116 1440 58 C1680 0 1920 116 2160 58 C2400 0 2640 116 2880 58 L2880 120 L0 120 Z"
            fill="#f0f9ff"
          />
        </svg>
        <svg
          className="home-wave-track-reverse absolute inset-x-0 bottom-0 h-[88%] w-[200%] opacity-55"
          viewBox="0 0 2880 120"
          preserveAspectRatio="none"
        >
          <path
            d="M0 58 C240 116 480 0 720 58 C960 116 1200 0 1440 58 C1680 116 1920 0 2160 58 C2400 116 2640 0 2880 58 L2880 120 L0 120 Z"
            fill="#bae6fd"
          />
        </svg>
      </div>
    </section>
  );
}
