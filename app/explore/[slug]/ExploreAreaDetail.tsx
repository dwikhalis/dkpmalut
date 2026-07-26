"use client";

import Image from "next/image";
import Link from "next/link";

import { useLocaleStore } from "@/app/Stores/localeStore";
import { PageCta } from "@/app/components/CmsPageContent";
import {
  localizedText,
  type ConservationAreaRow,
  type LocalizedText,
} from "@/lib/conservation/areas";

const PLACEHOLDER = "/assets/image_placeholder.png";

export default function ExploreAreaDetail({
  area,
  publicSlug,
}: {
  area: ConservationAreaRow;
  publicSlug: string;
}) {
  const locale = useLocaleStore((state) => state.locale);
  const text = (value: LocalizedText | null | undefined, fallback = "") =>
    localizedText(value, locale, fallback);
  const areaLabel = new Intl.NumberFormat(locale === "en" ? "en-US" : "id-ID", {
    maximumFractionDigits: 2,
  }).format(Number(area.area_hectares));

  return (
    <main className="min-h-[70vh] bg-transparent p-6 md:p-10">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/explore"
          className="inline-flex rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 shadow-sm hover:border-sky-500 hover:text-sky-800"
        >
          ←{" "}
          {locale === "en"
            ? "Back to Conservation Areas"
            : "Kembali ke Kawasan Konservasi"}
        </Link>
        <header className="mt-6 overflow-hidden rounded-2xl bg-sky-950 text-white shadow-lg">
          <div className="relative aspect-[16/8] min-h-64 bg-stone-200 md:aspect-[16/7]">
            <Image
              src={area.image_path || PLACEHOLDER}
              alt={text(area.short_name, area.name)}
              fill
              priority
              sizes="(min-width: 1280px) 1152px, 100vw"
              className="object-cover"
            />
          </div>
          <div className="p-6 md:p-9">
            <p className="font-semibold text-sky-200">{text(area.category)}</p>
            <h1 className="mt-2 text-3xl font-bold leading-tight md:text-4xl">
              {text(area.short_name, area.name)}
            </h1>
            <p className="mt-3 text-sky-100">{text(area.official_name)}</p>
          </div>
        </header>
        <div className="mt-5 flex justify-end">
          <Link
            href={`/explore/${publicSlug}/peta`}
            className="rounded-lg bg-sky-800 px-5 py-2.5 font-semibold text-white shadow-sm hover:bg-sky-900"
          >
            ⌖{" "}
            {locale === "en" ? "Open Interactive Map" : "Buka Peta Interaktif"}
          </Link>
        </div>
        <section className="mt-7 grid gap-5 sm:grid-cols-2">
          <InfoCard
            label={locale === "en" ? "Location" : "Lokasi"}
            value={text(area.location)}
          />
          <InfoCard
            label={locale === "en" ? "Area" : "Luas Kawasan"}
            value={`${areaLabel} ha`}
          />
        </section>
        <section className="mt-7 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200 md:p-8">
          <h2 className="text-2xl font-bold">
            {locale === "en" ? "About the Area" : "Tentang Kawasan"}
          </h2>
          <p className="mt-4 whitespace-pre-line leading-8 text-stone-700">
            {text(area.summary)}
          </p>
          <div className="mt-7 grid gap-7 md:grid-cols-2">
            <FeatureList
              title={locale === "en" ? "Primary Ecosystems" : "Ekosistem Utama"}
              items={area.ecosystems.map((item) => text(item)).filter(Boolean)}
              color="emerald"
            />
            <FeatureList
              title={
                locale === "en"
                  ? "Potential and Distinctive Features"
                  : "Potensi dan Kekhasan"
              }
              items={area.key_features
                .map((item) => text(item))
                .filter(Boolean)}
              color="sky"
            />
          </div>
        </section>
        <section className="mt-7 rounded-2xl border-l-4 border-sky-700 bg-white p-6 shadow-sm md:p-8">
          <h2 className="text-2xl font-bold">
            {locale === "en"
              ? "Management and Zoning"
              : "Pengelolaan dan Zonasi"}
          </h2>
          <p className="mt-4 whitespace-pre-line leading-8 text-stone-700">
            {text(area.zoning_summary)}
          </p>
          <div className="mt-6 divide-y divide-stone-200 overflow-hidden rounded-xl border border-stone-200">
            {area.zoning_details.map((zone, index) => (
              <article key={`${text(zone.name)}-${index}`} className="p-5">
                <div className="grid gap-3 md:grid-cols-[minmax(0,1.1fr)_140px_100px_minmax(0,2fr)]">
                  <h3 className="font-bold">{text(zone.name)}</h3>
                  <p>{zone.area}</p>
                  <p>{zone.percentage}</p>
                  <p className="text-sm leading-6 text-stone-600">
                    {text(zone.purpose)}
                  </p>
                </div>
                {(zone.allowed.length > 0 || zone.prohibited.length > 0) && (
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <Guidance
                      title={
                        locale === "en" ? "Allowed" : "Yang Boleh Dilakukan"
                      }
                      items={zone.allowed.map((item) => text(item))}
                      good
                    />
                    <Guidance
                      title={
                        locale === "en"
                          ? "Prohibited"
                          : "Yang Tidak Boleh Dilakukan"
                      }
                      items={zone.prohibited.map((item) => text(item))}
                    />
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
        <section className="mt-7 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200 md:p-8">
          <h2 className="text-2xl font-bold">
            {locale === "en" ? "Official Documents" : "Dokumen Resmi"}
          </h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {area.documents.map((document) => (
              <a
                key={document.path}
                href={document.path}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-stone-200 p-4 hover:border-sky-500 hover:bg-sky-50"
              >
                <span className="block font-bold text-sky-900">
                  {text(document.label)}
                </span>
                <span className="mt-1 block text-sm leading-6 text-stone-600">
                  {text(document.title)}
                </span>
              </a>
            ))}
          </div>
        </section>
        <PageCta
          className="mt-7"
          title={
            locale === "en"
              ? "Visit Responsibly"
              : "Kunjungi dengan Bertanggung Jawab"
          }
          content={
            locale === "en"
              ? "Follow zoning rules, officer guidance, and activity requirements to protect the area."
              : "Patuhi zonasi, arahan petugas, dan ketentuan aktivitas untuk menjaga kelestarian kawasan."
          }
          primaryAction={{
            label: locale === "en" ? "Buy Ticket" : "Beli Tiket",
            path: "/payment",
          }}
        />
      </div>
    </main>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
      <p className="text-sm font-semibold uppercase tracking-wide text-stone-500">
        {label}
      </p>
      <p className="mt-2 text-lg font-bold">{value}</p>
    </div>
  );
}

function FeatureList({
  title,
  items,
  color,
}: {
  title: string;
  items: string[];
  color: "emerald" | "sky";
}) {
  return (
    <div>
      <h3 className="text-lg font-bold">{title}</h3>
      <ul className="mt-3 flex flex-wrap gap-2">
        {items.map((item) => (
          <li
            key={item}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${color === "emerald" ? "bg-emerald-50 text-emerald-900" : "bg-sky-50 text-sky-900"}`}
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Guidance({
  title,
  items,
  good = false,
}: {
  title: string;
  items: string[];
  good?: boolean;
}) {
  return (
    <div className={`rounded-xl p-4 ${good ? "bg-emerald-50" : "bg-rose-50"}`}>
      <h4 className="font-bold">{title}</h4>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
        {items.filter(Boolean).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
