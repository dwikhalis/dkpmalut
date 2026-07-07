"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Image from "next/image";
import Reveal from "./Reveal";
import Button from "./Button";
import SpinnerLoading from "./SpinnerLoading";
import { useLocaleStore } from "../Stores/localeStore";
import {
  getAppLabelComponent,
  getImagePreviewUrl,
} from "@/lib/supabase/supabaseHelper";

type AppLabels = Record<string, string>;

const fallbackLabels: AppLabels = {
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
  style?: CSSProperties;
}) {
  const [imageSrc, setImageSrc] = useState(
    getImagePreviewUrl(src) || fallbackSrc,
  );

  useEffect(() => {
    setImageSrc(getImagePreviewUrl(src) || fallbackSrc);
  }, [src, fallbackSrc]);

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

export default function SectionAddr() {
  const [labels, setLabels] = useState<AppLabels>(fallbackLabels);
  const [mapLoading, setMapLoading] = useState(true);

  const locale = useLocaleStore((state) => state.locale);

  const mapSrc = labels.secfive_map_path || fallbackLabels.secfive_map_path;

  useEffect(() => {
    let mounted = true;

    async function loadLabels() {
      try {
        const result = await getAppLabelComponent("secfive", locale);

        if (mounted) {
          setLabels(mergeLabelsWithFallback(fallbackLabels, result));
        }
      } catch (error) {
        console.error("Failed to load secfive labels:", error);

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
    setMapLoading(true);
  }, [mapSrc]);

  const showButton =
    labels.secfive_button_label.trim() && labels.secfive_button_path.trim();

  return (
    <section className="pb-10 pt-0 md:py-6 mb-12">
      <Reveal
        animation="fade-up"
        className="mx-6 rounded-4xl bg-sky-100 shadow-xl md:mx-12 md:shadow-2xl 2xl:mx-24 md:px-12 md:py-12"
      >
        <div className="flex flex-col items-center gap-6">
          <Reveal
            animation="fade-up"
            delay={80}
            className="flex flex-col items-center gap-3 text-center md:gap-4"
          >
            <h2>{labels.secfive_title}</h2>

            {labels.secfive_subtitle_1 && (
              <h4 className="font-bold leading-relaxed">
                {labels.secfive_subtitle_1}
              </h4>
            )}

            <h4 className="font-light leading-relaxed">
              {labels.secfive_subtitle_2}
            </h4>
          </Reveal>

          <div className="flex flex-wrap w-full gap-6 lg:grid-cols-2 p-3">
            <Reveal
              animation="fade-right"
              delay={180}
              className="home-hover-lift grow rounded-2xl bg-white p-3 shadow-xl"
            >
              <PreviewImage
                alt="Gambar Kantor"
                src={labels.secfive_image_path}
                fallbackSrc={fallbackLabels.secfive_image_path}
                priority
                className="h-[55vw] w-full rounded-xl object-cover md:h-[42vw] lg:h-[22vw]"
              />
            </Reveal>

            <Reveal
              animation="fade-left"
              delay={260}
              className="home-hover-lift grow rounded-2xl bg-white p-3 shadow-xl"
            >
              <div className="relative h-[55vw] w-full overflow-hidden rounded-xl bg-white md:h-[42vw] lg:h-[22vw]">
                {mapLoading && <SpinnerLoading size="md" color="black" />}

                <iframe
                  key={mapSrc}
                  title="Lokasi Kantor DKP Maluku Utara"
                  src={mapSrc}
                  className={`h-full w-full rounded-xl transition-opacity ${
                    mapLoading ? "opacity-0" : "opacity-100"
                  }`}
                  loading="lazy"
                  onLoad={() => setMapLoading(false)}
                />
              </div>
            </Reveal>
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
