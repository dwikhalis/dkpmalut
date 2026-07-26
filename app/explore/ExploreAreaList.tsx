"use client";

import Image from "next/image";
import Link from "next/link";

import { useLocaleStore } from "@/app/Stores/localeStore";
import {
  localizedText,
  type ConservationAreaRow,
} from "@/lib/conservation/areas";
import { CmsValue } from "@/app/components/CmsPageContent";

const PLACEHOLDER = "/assets/image_placeholder.png";

export default function ExploreAreaList({
  areas,
}: {
  areas: ConservationAreaRow[];
}) {
  const locale = useLocaleStore((state) => state.locale);
  return (
    <div className="mt-8 grid gap-7 lg:grid-cols-2">
      {areas.map((area) => (
        <article
          key={area.id}
          className="overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-stone-200"
        >
          <div className="relative aspect-[16/9] bg-stone-100">
            <Image
              src={area.image_path || PLACEHOLDER}
              alt={localizedText(area.short_name, locale, area.name)}
              fill
              sizes="(min-width: 1024px) 45vw, 90vw"
              className="object-cover"
            />
          </div>
          <div className="p-6">
            <p className="text-sm font-semibold text-sky-800">
              {localizedText(area.category, locale)}
            </p>
            <h2 className="mt-2 text-2xl font-bold leading-snug">
              {localizedText(area.short_name, locale, area.name)}
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              {localizedText(area.location, locale)}
            </p>
            <p className="mt-4 whitespace-pre-line leading-7 text-stone-700">
              {localizedText(area.summary, locale)}
            </p>
            <Link
              href={`/explore/${area.slug}`}
              className="mt-5 inline-flex rounded-lg bg-sky-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-900"
            >
              <CmsValue
                target="page_explore_detail_button"
                fallback="Lihat Detail Kawasan"
              />
            </Link>
            <div className="mt-5 rounded-xl bg-stone-50 p-4">
              <h3 className="text-base font-semibold">
                <CmsValue
                  target="page_explore_document_title"
                  fallback="Dokumen Rujukan"
                />
              </h3>
              <div className="mt-3 flex flex-col gap-2">
                {area.documents.map((document) => (
                  <a
                    key={document.path}
                    href={document.path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-sky-900 hover:border-sky-400 hover:bg-sky-50"
                  >
                    {localizedText(document.label, locale)}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
