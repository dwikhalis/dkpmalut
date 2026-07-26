"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Image from "next/image";
import Reveal from "../Reveal";
import Button from "../Button";
import { useLocaleStore } from "@/app/Stores/localeStore";
import {
  getAppComponentConfig,
  getImagePreviewUrl,
} from "@/lib/supabase/supabaseHelper";

type AppLabels = Record<string, string>;

const fallbackLabels: AppLabels = {
  secfive_eyebrow: "Terhubung dengan Kami",
  secfive_button_label: "",
  secfive_button_path: "",
  secfive_subtitle_1:
    "Dinas Kelautan dan Perikanan (DKP) Provinsi Maluku Utara",
  secfive_subtitle_2:
    "Kelurahan Sofifi, Kecamatan Oba Utara, Kota Tidore Kepulauan, Provinsi Maluku Utara, Indonesia",
  secfive_title: "Kantor",
  secfive_image_path: "/assets/pic_office.png",
  secfive_map_path:
    "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3989.4869671137667!2d127.56658608966836!3d0.7384305905514934!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x329cbf3b84025b89%3A0x204563a8ed194488!2sDinas%20Kelautan%20Dan%20Perikanan%20Maluku%20Utara!5e0!3m2!1sid!2sus!4v1758953632235!5m2!1sid!2sus",
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

function getGoogleMapsEmbedUrl(value: string) {
  const trimmedValue = value.trim();
  if (!trimmedValue) return "";

  const iframeSrc = trimmedValue.match(
    /<iframe\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/i,
  )?.[1];

  return (iframeSrc ?? trimmedValue).replaceAll("&amp;", "&");
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
  style?: CSSProperties;
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
      alt={alt}
      src={imageSrc}
      width={800}
      height={600}
      className={className}
      style={style}
      priority={priority}
      onError={() => setImageSrc(fallbackSrc)}
    />
  );
}

export default function SectionAddr({
  previewMode = false,
}: {
  previewMode?: boolean;
}) {
  const [labels, setLabels] = useState<AppLabels>(fallbackLabels);
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});

  const locale = useLocaleStore((state) => state.locale);

  const mapSrc = getGoogleMapsEmbedUrl(labels.secfive_map_path);

  useEffect(() => {
    let mounted = true;

    async function loadLabels() {
      try {
        const result = await getAppComponentConfig("secfive", locale);

        if (mounted) {
          setLabels(mergeLabelsWithFallback(fallbackLabels, result.values));
          setVisibility(result.visibility);
        }
      } catch (error) {
        console.error("Failed to load secfive labels:", error);

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

  const showButton =
    visibility.secfive_button_label !== false &&
    visibility.secfive_button_path !== false &&
    labels.secfive_button_label.trim() &&
    labels.secfive_button_path.trim();
  const showContent =
    visibility.secfive_eyebrow !== false ||
    visibility.secfive_title !== false ||
    visibility.secfive_subtitle_1 !== false ||
    visibility.secfive_subtitle_2 !== false ||
    (visibility.secfive_image_path !== false &&
      Boolean(labels.secfive_image_path.trim())) ||
    (visibility.secfive_map_path !== false && Boolean(mapSrc.trim())) ||
    Boolean(showButton);

  if (!showContent) return null;

  return (
    <section className="px-6 py-12 md:px-12 md:py-16 2xl:px-24">
      <Reveal
        disabled={previewMode}
        animation="fade-up"
        className="mx-auto max-w-7xl rounded-4xl bg-gradient-to-br from-emerald-50 via-cyan-50 to-sky-100 shadow-xl ring-1 ring-emerald-100 md:px-10 md:py-10"
      >
        <div className="flex flex-col items-center gap-6 p-6">
          {(visibility.secfive_eyebrow !== false ||
            visibility.secfive_title !== false ||
            visibility.secfive_subtitle_1 !== false ||
            visibility.secfive_subtitle_2 !== false) && (
            <Reveal
              disabled={previewMode}
              animation="fade-up"
              delay={80}
              className="flex flex-col items-center gap-3 text-center md:gap-4"
            >
              {visibility.secfive_eyebrow !== false && (
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-700">
                  {labels.secfive_eyebrow}
                </p>
              )}
              {visibility.secfive_title !== false && (
                <h2>{labels.secfive_title}</h2>
              )}

              {visibility.secfive_subtitle_1 !== false &&
                labels.secfive_subtitle_1 && (
                  <p className="text-lg font-bold leading-relaxed md:text-xl">
                    {labels.secfive_subtitle_1}
                  </p>
                )}

              {visibility.secfive_subtitle_2 !== false && (
                <p className="text-lg font-light leading-relaxed md:text-xl">
                  {labels.secfive_subtitle_2}
                </p>
              )}
            </Reveal>
          )}

          <div className="flex w-full flex-wrap gap-6 p-3">
            {visibility.secfive_image_path !== false &&
            labels.secfive_image_path.trim() ? (
              <Reveal
                disabled={previewMode}
                animation="fade-right"
                delay={180}
                className="home-hover-lift min-w-[16rem] grow basis-[24rem] rounded-2xl bg-white p-3 shadow-xl"
              >
                <PreviewImage
                  alt="Gambar Kantor"
                  src={labels.secfive_image_path}
                  fallbackSrc={fallbackLabels.secfive_image_path}
                  priority
                  className="h-72 w-full rounded-xl object-cover md:h-96 lg:h-[24rem]"
                />
              </Reveal>
            ) : null}

            {visibility.secfive_map_path !== false && mapSrc.trim() ? (
              <Reveal
                disabled={previewMode}
                animation="fade-left"
                delay={260}
                className="home-hover-lift min-w-[16rem] grow basis-[24rem] rounded-2xl bg-white p-3 shadow-xl"
              >
                <div className="relative h-72 w-full overflow-hidden rounded-xl bg-white md:h-96 lg:h-[24rem]">
                  <iframe
                    key={mapSrc}
                    title="Lokasi Kantor DKP Maluku Utara"
                    src={mapSrc}
                    className="h-full w-full rounded-xl border-0"
                    loading={previewMode ? "eager" : "lazy"}
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                  />
                </div>
              </Reveal>
            ) : null}
          </div>

          {showButton && (
            <Reveal animation="fade-up" delay={320}>
              <Button
                size="xl"
                text={labels.secfive_button_label}
                link={labels.secfive_button_path}
              />
            </Reveal>
          )}
        </div>
      </Reveal>
    </section>
  );
}
