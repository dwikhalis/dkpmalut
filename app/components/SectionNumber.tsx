"use client";

import Image from "next/image";
import Reveal from "./Reveal";
import CountUpNumber from "./CountUpNumber";
import { useEffect, useMemo, useState } from "react";
import { useLocaleStore } from "../Stores/localeStore";
import {
  getAppLabelComponent,
  getImagePreviewUrl,
} from "@/lib/supabase/supabaseHelper";

type AppLabels = Record<string, string>;

const fallbackLabels: AppLabels = {
  sectwo_icon_path_1: "/assets/icon_fisher.png",
  sectwo_icon_path_2: "/assets/icon_boats.png",
  sectwo_icon_path_3: "/assets/icon_phinisi.png",
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
    "Menjaga kelestarian ekosistem untuk perikanan berkelanjutan",
  sectwo_tab_subtitle_3:
    "Kontribusi DKP Malut terhadap Pendapatan Asli Daerah (PAD) 2025",
  sectwo_tab_subtitle_4: "",
  sectwo_tab_subtitle_5: "",
  sectwo_tab_subtitle_6: "",

  sectwo_tab_title_1: "Jumlah Nelayan Aktif",
  sectwo_tab_title_2: "Kawasan Konservasi",
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
    const cleanValue = typeof value === "string" ? value.trim() : "";

    if (cleanValue) {
      merged[key] = cleanValue;
    }
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
  const [imageSrc, setImageSrc] = useState(
    getImagePreviewUrl(src) || fallbackSrc,
  );

  useEffect(() => {
    setImageSrc(getImagePreviewUrl(src) || fallbackSrc);
  }, [src, fallbackSrc]);

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
      onError={() => setImageSrc(fallbackSrc)}
    />
  );
}

export default function SectionNumber() {
  const [labels, setLabels] = useState<AppLabels>(fallbackLabels);
  const locale = useLocaleStore((state) => state.locale);

  useEffect(() => {
    let mounted = true;

    async function loadLabels() {
      try {
        const result = await getAppLabelComponent("sectwo", locale);

        if (mounted) {
          setLabels(mergeLabelsWithFallback(fallbackLabels, result));
        }
      } catch (error) {
        console.error("Failed to load sectwo labels:", error);

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

  const cards = useMemo(() => {
    return Array.from({ length: 6 }, (_, index) => {
      const number = index + 1;

      return {
        id: number,
        iconPath: labels[`sectwo_icon_path_${number}`],
        fallbackIconPath: fallbackLabels[`sectwo_icon_path_${number}`],
        value: labels[`sectwo_tab_num_${number}`],
        suffix: labels[`sectwo_tab_num_suffix_${number}`],
        title: labels[`sectwo_tab_title_${number}`],
        subtitle: labels[`sectwo_tab_subtitle_${number}`],
      };
    }).filter((card) => {
      return card.iconPath || card.value || card.title || card.subtitle;
    });
  }, [labels]);

  return (
    <Reveal
      animation="fade-up"
      className="flex bg-sky-100 px-4 pb-10 pt-20 md:pt-10 rounded-b-4xl md:px-6"
    >
      <div className="flex w-full mx-auto">
        <div className="flex w-full flex-wrap justify-center gap-y-20">
          {cards.map((card, index) => {
            const numericValue = Number(card.value);
            const safeValue = Number.isFinite(numericValue) ? numericValue : 0;
            const decimals = getDecimalCount(card.value || "");
            const suffix = card.suffix ? ` ${card.suffix}` : "";

            return (
              <Reveal
                key={card.id}
                animation="fade-up"
                delay={80 + index * 120}
                className="home-hover-lift relative flex w-full grow gap-3 flex-col items-center justify-between overflow-visible rounded-4xl bg-white px-6 pb-8 pt-16 mx-3 text-center shadow-2xl md:px-3 md:max-w-[23vw]"
              >
                <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
                  <SectionNumberImage
                    src={card.iconPath}
                    fallbackSrc={card.fallbackIconPath}
                    index={index}
                  />
                </div>

                <h1 className="mt-2 text-center text-sky-600 md:mt-3">
                  <CountUpNumber
                    to={safeValue}
                    decimals={decimals}
                    suffix={suffix}
                    duration={index === 0 ? 1700 : index === 1 ? 1300 : 1600}
                  />
                </h1>

                <h5 className="font-bold text-center">{card.title}</h5>

                <h5 className="mx-auto max-w-[220px] text-center">
                  {card.subtitle}
                </h5>
              </Reveal>
            );
          })}
        </div>
      </div>
    </Reveal>
  );
}
