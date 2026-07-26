"use client";

import Image from "next/image";
import Reveal from "../Reveal";
import CountUpNumber from "../CountUpNumber";
import { useEffect, useMemo, useState } from "react";
import { useLocaleStore } from "@/app/Stores/localeStore";
import {
  getAppComponentConfig,
  getImagePreviewUrl,
} from "@/lib/supabase/supabaseHelper";

type AppLabels = Record<string, string>;

const fallbackLabels: AppLabels = {
  sectwo_eyebrow: "Dampak yang Terukur",
  sectwo_title: "Kelautan dan perikanan untuk masyarakat",
  sectwo_subtitle:
    "Data menjadi dasar pengelolaan sumber daya dan penguatan ekonomi biru Maluku Utara.",
  sectwo_icon_path_1: "/assets/icon_fisher.png",
  sectwo_icon_path_2: "/assets/icon_boats.png",
  sectwo_icon_path_3: "/assets/icon_folder_1.png",
  sectwo_icon_path_4: "",
  sectwo_icon_path_5: "",
  sectwo_icon_path_6: "",

  sectwo_tab_num_1: "12300",
  sectwo_tab_num_2: "7",
  sectwo_tab_num_3: "1.5",
  sectwo_tab_num_4: "",
  sectwo_tab_num_5: "",
  sectwo_tab_num_6: "",

  sectwo_tab_num_suffix_1: "",
  sectwo_tab_num_suffix_2: "",
  sectwo_tab_num_suffix_3: "M",
  sectwo_tab_num_suffix_4: "",
  sectwo_tab_num_suffix_5: "",
  sectwo_tab_num_suffix_6: "",

  sectwo_tab_subtitle_1:
    "Nelayan terdaftar dari seluruh kabupaten di Provinsi Maluku Utara",
  sectwo_tab_subtitle_2:
    "Kabupaten dan kota yang terhubung dalam layanan data",
  sectwo_tab_subtitle_3:
    "Kontribusi DKP Malut terhadap Pendapatan Asli Daerah (PAD) 2025",
  sectwo_tab_subtitle_4: "",
  sectwo_tab_subtitle_5: "",
  sectwo_tab_subtitle_6: "",

  sectwo_tab_title_1: "Jumlah Nelayan Aktif",
  sectwo_tab_title_2: "Wilayah Layanan",
  sectwo_tab_title_3: "Capaian",
  sectwo_tab_title_4: "",
  sectwo_tab_title_5: "",
  sectwo_tab_title_6: "",
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

function getDecimalCount(value: string) {
  if (!value.includes(".")) return 0;

  return value.split(".")[1]?.length ?? 0;
}

function SectionNumberImage({
  src,
  fallbackSrc,
  index,
}: {
  src: string;
  fallbackSrc: string;
  index: number;
}) {
  const resolvedSrc = getImagePreviewUrl(src);
  const resolvedFallbackSrc = getImagePreviewUrl(fallbackSrc);
  const [imageSrc, setImageSrc] = useState(
    resolvedSrc || resolvedFallbackSrc,
  );

  useEffect(() => {
    setImageSrc(resolvedSrc || resolvedFallbackSrc);
  }, [resolvedSrc, resolvedFallbackSrc]);

  if (!src.trim() || !imageSrc) return null;

  const floatClass =
    index === 0
      ? "home-float-5"
      : index === 1
        ? "home-float-6"
        : index === 2
          ? "home-float-7"
          : "home-float";

  return (
    <Image
      src={imageSrc}
      width={800}
      height={600}
      alt="icon"
      className={`${floatClass} h-28 w-full object-contain`}
      priority={index < 3}
      loading={index < 3 ? "eager" : "lazy"}
      onError={() => {
        if (imageSrc !== resolvedFallbackSrc) {
          setImageSrc(resolvedFallbackSrc);
        }
      }}
    />
  );
}

export default function SectionNumber() {
  const [labels, setLabels] = useState<AppLabels>(fallbackLabels);
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});
  const locale = useLocaleStore((state) => state.locale);

  useEffect(() => {
    let mounted = true;

    async function loadLabels() {
      try {
        const result = await getAppComponentConfig("sectwo", locale);

        if (mounted) {
          setLabels(mergeLabelsWithFallback(fallbackLabels, result.values));
          setVisibility(result.visibility);
        }
      } catch (error) {
        console.error("Failed to load sectwo labels:", error);

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

  const cards = useMemo(() => {
    return Array.from({ length: 6 }, (_, index) => {
      const number = index + 1;

      const targets = {
        icon: `sectwo_icon_path_${number}`,
        value: `sectwo_tab_num_${number}`,
        suffix: `sectwo_tab_num_suffix_${number}`,
        title: `sectwo_tab_title_${number}`,
        subtitle: `sectwo_tab_subtitle_${number}`,
      };

      return {
        id: number,
        targets,
        iconPath: labels[targets.icon],
        fallbackIconPath: fallbackLabels[`sectwo_icon_path_${number}`],
        value: labels[targets.value],
        suffix: labels[targets.suffix],
        title: labels[targets.title],
        subtitle: labels[targets.subtitle],
      };
    }).filter((card) => {
      return Object.values(card.targets).some(
        (target) => visibility[target] !== false && labels[target]?.trim(),
      );
    });
  }, [labels, visibility]);

  return (
    <section className="bg-white/60 px-6 py-12 md:px-12 md:py-20 2xl:px-24">
      <Reveal
        animation="fade-up"
        className="mx-auto max-w-7xl rounded-4xl bg-gradient-to-br from-cyan-100 via-sky-100 to-blue-100 px-5 pb-10 pt-10 shadow-xl ring-1 ring-cyan-200/70 md:px-10 md:pb-12 md:pt-12"
      >
        <div className="mx-auto mb-16 flex max-w-3xl flex-col items-center gap-3 text-center">
          {visibility.sectwo_eyebrow !== false && (
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-sky-700">
              {labels.sectwo_eyebrow}
            </p>
          )}
          {visibility.sectwo_title !== false && <h2>{labels.sectwo_title}</h2>}
          {visibility.sectwo_subtitle !== false && (
            <p className="text-base leading-relaxed text-stone-600 md:text-lg">
              {labels.sectwo_subtitle}
            </p>
          )}
        </div>
        <div className="grid w-full gap-x-6 gap-y-20 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card, index) => {
            const numericValue = Number(card.value);
            const safeValue = Number.isFinite(numericValue) ? numericValue : 0;
            const decimals = getDecimalCount(card.value || "");
            const suffix =
              visibility[card.targets.suffix] !== false && card.suffix
                ? ` ${card.suffix}`
                : "";

            return (
              <Reveal
                key={card.id}
                animation="fade-up"
                delay={80 + index * 120}
                className="home-hover-lift relative flex min-w-0 flex-col items-center justify-between gap-3 overflow-visible rounded-3xl bg-white px-6 pb-8 pt-16 text-center shadow-xl"
              >
                {visibility[card.targets.icon] !== false && (
                  <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
                    <SectionNumberImage
                      src={card.iconPath}
                      fallbackSrc={card.fallbackIconPath}
                      index={index}
                    />
                  </div>
                )}

                {visibility[card.targets.value] !== false && (
                  <p className="mt-2 text-center text-4xl font-semibold leading-tight text-sky-600 md:mt-3 md:text-5xl">
                    <CountUpNumber
                      to={safeValue}
                      decimals={decimals}
                      suffix={suffix}
                      duration={index === 0 ? 1700 : index === 1 ? 1300 : 1600}
                    />
                  </p>
                )}

                {visibility[card.targets.title] !== false && (
                  <h3 className="text-center text-lg font-bold md:text-xl">
                    {card.title}
                  </h3>
                )}

                {visibility[card.targets.subtitle] !== false && (
                  <p className="mx-auto max-w-[220px] text-center text-base leading-relaxed">
                    {card.subtitle}
                  </p>
                )}
              </Reveal>
            );
          })}
        </div>
      </Reveal>
    </section>
  );
}
