"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { useLocaleStore } from "@/app/Stores/localeStore";
import {
  getAppComponentConfig,
  getImagePreviewUrl,
} from "@/lib/supabase/supabaseHelper";
import Reveal from "../Reveal";

const conservationItems = [
  {
    image: "icon_images/icon_conservation_ecosystem.png",
    href: "/explore",
    title: { id: "Kawasan Konservasi", en: "Conservation Areas" },
    description: {
      id: "Jelajahi enam kawasan konservasi Maluku Utara beserta lokasi, peta zonasi, dan dokumen rujukannya.",
      en: "Explore North Maluku's six conservation areas, including their locations, zoning maps, and reference documents.",
    },
  },
  {
    image: "icon_images/icon_conservation_protect.png",
    href: "/peraturan",
    title: { id: "Peraturan & Dokumen", en: "Regulations & Documents" },
    description: {
      id: "Baca keputusan penetapan kawasan serta dokumen Rencana Pengelolaan dan Zonasi sebagai rujukan resmi.",
      en: "Read area-designation decisions and Management and Zoning Plan documents provided as official references.",
    },
  },
  {
    image: "icon_images/icon_conservation_surveilance.png",
    href: "/data",
    title: { id: "Data Kelautan & Perikanan", en: "Marine & Fisheries Data" },
    description: {
      id: "Telusuri data kawasan konservasi serta dataset kelautan dan perikanan Maluku Utara yang telah dipublikasikan.",
      en: "Browse published conservation-area, marine, and fisheries datasets for North Maluku.",
    },
  },
  {
    image: "icon_images/icon_conservation_education.png",
    href: "/faq",
    title: { id: "FAQ Layanan", en: "Service FAQ" },
    description: {
      id: "Temukan jawaban atas pertanyaan umum tentang layanan, tiket, dan kunjungan ke kawasan konservasi.",
      en: "Find answers to common questions about services, tickets, and conservation-area visits.",
    },
  },
] as const;

const visitorSteps = [
  {
    image: "icon_images/icon_conservation_island.png",
    href: "/explore",
    title: { id: "Pilih Kawasan", en: "Choose an Area" },
    description: {
      id: "Temukan pulau dan kawasan konservasi yang ingin Anda kunjungi.",
      en: "Find the island and conservation area you want to visit.",
    },
  },
  {
    image: "icon_images/icon_conservation_tourism.png",
    href: "/informasi-tarif",
    title: { id: "Lihat Tarif", en: "Review Rates" },
    description: {
      id: "Periksa tarif setiap kawasan dan cara total biaya kunjungan dihitung.",
      en: "Check each area's admission rate and how the total visit cost is calculated.",
    },
  },
  {
    image: "icon_images/icon_conservation_buyticket.png",
    href: "/payment",
    title: { id: "Beli Tiket", en: "Buy a Ticket" },
    description: {
      id: "Pesan tiket kawasan secara aman melalui layanan digital.",
      en: "Book your conservation-area ticket securely online.",
    },
  },
  {
    image: "icon_images/icon_conservation_ticket.png",
    href: "/masuk",
    title: { id: "Masuk ke Akun", en: "Sign In" },
    description: {
      id: "Masuk dengan email dan kata sandi untuk mengakses akun Anda.",
      en: "Sign in with your email and password to access your account.",
    },
  },
] as const;

export default function SectionConservation() {
  const locale = useLocaleStore((state) => state.locale);
  const fallbackLabels = {
    sectionconservation_eyebrow:
      locale === "id" ? "Konservasi & Pariwisata Bahari" : "Marine Conservation & Tourism",
    sectionconservation_title:
      locale === "id" ? "Jelajahi keindahan laut, ikut menjaganya" : "Explore the ocean, help protect it",
    sectionconservation_subtitle:
      locale === "id"
        ? "Setiap kunjungan adalah kesempatan untuk mengenal, menghargai, dan mendukung kelestarian kawasan konservasi Maluku Utara."
        : "Every visit is an opportunity to understand, respect, and support North Maluku's marine conservation areas.",
    sectionconservation_journey_eyebrow:
      locale === "id" ? "Rencanakan Kunjungan" : "Plan Your Visit",
    sectionconservation_journey_title:
      locale === "id" ? "Dari kawasan hingga tiket" : "From destination to ticket",
    ...Object.fromEntries(
      conservationItems.flatMap((item, index) => [
        [`sectionconservation_pillar_title_${index + 1}`, item.title[locale]],
        [
          `sectionconservation_pillar_description_${index + 1}`,
          item.description[locale],
        ],
      ]),
    ),
    ...Object.fromEntries(
      visitorSteps.flatMap((item, index) => [
        [`sectionconservation_step_title_${index + 1}`, item.title[locale]],
        [
          `sectionconservation_step_description_${index + 1}`,
          item.description[locale],
        ],
      ]),
    ),
  } as Record<string, string>;
  const [labels, setLabels] = useState<Record<string, string>>(fallbackLabels);
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let mounted = true;

    void getAppComponentConfig("sectionconservation", locale).then((config) => {
      if (!mounted) return;
      setLabels({ ...fallbackLabels, ...config.values });
      setVisibility(config.visibility);
    });

    return () => {
      mounted = false;
    };
    // The fallback object is derived from locale; config only needs reloading
    // when that locale changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  const isVisible = (target: string) => visibility[target] !== false;

  return (
    <section className="bg-gradient-to-b from-sky-50 via-white/60 to-cyan-50/70 px-6 py-12 md:px-12 md:py-20 2xl:px-24">
      <div className="mx-auto max-w-7xl">
        <Reveal animation="fade-up" className="mx-auto max-w-3xl text-center">
          {isVisible("sectionconservation_eyebrow") && (
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-sky-700">
              {labels.sectionconservation_eyebrow}
            </p>
          )}
          {isVisible("sectionconservation_title") && (
            <h2 className="mt-3 text-stone-900">{labels.sectionconservation_title}</h2>
          )}
          {isVisible("sectionconservation_subtitle") && (
            <p className="mt-4 text-base leading-relaxed text-stone-600 md:text-lg">
              {labels.sectionconservation_subtitle}
            </p>
          )}
        </Reveal>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {conservationItems.map((item, index) => (
            <Reveal key={item.title.id} animation="fade-up" delay={80 + index * 90}>
              <Link
                href={item.href}
                className="group flex h-full flex-col overflow-hidden rounded-3xl border border-sky-100 bg-white/90 p-5 shadow-lg transition duration-300 hover:-translate-y-1 hover:border-sky-300 hover:shadow-xl"
              >
                <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-gradient-to-br from-sky-50 to-cyan-50 p-3">
                  <Image
                    src={getImagePreviewUrl(item.image)}
                    alt=""
                    width={1200}
                    height={1200}
                    className="h-full w-full object-contain transition duration-300 group-hover:scale-105"
                  />
                </div>
                {isVisible(`sectionconservation_pillar_title_${index + 1}`) && (
                  <h3 className="mt-5 text-xl font-bold text-sky-950">
                    {labels[`sectionconservation_pillar_title_${index + 1}`]}
                  </h3>
                )}
                {isVisible(`sectionconservation_pillar_description_${index + 1}`) && (
                  <p className="mt-2 text-sm leading-relaxed text-stone-600">
                    {labels[`sectionconservation_pillar_description_${index + 1}`]}
                  </p>
                )}
              </Link>
            </Reveal>
          ))}
        </div>

        <Reveal
          animation="fade-up"
          delay={180}
          className="mt-12 overflow-hidden rounded-4xl bg-sky-950 px-6 py-9 text-white shadow-2xl md:px-10 md:py-12"
        >
          <div className="flex flex-col gap-2 text-center md:text-left">
            {isVisible("sectionconservation_journey_eyebrow") && (
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-300">
                {labels.sectionconservation_journey_eyebrow}
              </p>
            )}
            {isVisible("sectionconservation_journey_title") && (
              <h2>{labels.sectionconservation_journey_title}</h2>
            )}
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {visitorSteps.map((item, index) => (
              <Link
                key={item.title.id}
                href={item.href}
                className="group flex min-w-0 items-center gap-4 rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 transition hover:bg-white/15"
              >
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-white p-1.5">
                  <Image
                    src={getImagePreviewUrl(item.image)}
                    alt=""
                    width={1200}
                    height={1200}
                    className="h-full w-full object-contain transition group-hover:scale-105"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-cyan-300">0{index + 1}</p>
                  {isVisible(`sectionconservation_step_title_${index + 1}`) && (
                    <h3 className="mt-1 text-base font-bold text-white">
                      {labels[`sectionconservation_step_title_${index + 1}`]}
                    </h3>
                  )}
                  {isVisible(`sectionconservation_step_description_${index + 1}`) && (
                    <p className="mt-1 text-xs leading-relaxed text-sky-100">
                      {labels[`sectionconservation_step_description_${index + 1}`]}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
