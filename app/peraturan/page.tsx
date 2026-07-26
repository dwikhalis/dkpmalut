import type { Metadata } from "next";

import {
  conservationDocuments,
  type ConservationDocument,
} from "@/lib/conservation/publicDocuments";
import {
  CmsPageCta,
  CmsPageHeader,
  CmsPageProvider,
  CmsValue,
} from "../components/CmsPageContent";

export const metadata: Metadata = {
  title: "Peraturan dan Dokumen Konservasi | DKP Maluku Utara",
  description:
    "Keputusan Menteri Kelautan dan Perikanan serta dokumen rencana pengelolaan dan zonasi kawasan konservasi Maluku Utara.",
};

function DocumentGroup({
  targetPrefix,
  title,
  description,
  documents,
}: {
  targetPrefix: string;
  title: string;
  description: string;
  documents: Array<ConservationDocument & { zone: string }>;
}) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-lg md:p-8">
      <h2 className="text-2xl font-bold">
        <CmsValue target={`${targetPrefix}_title`} fallback={title} />
      </h2>
      <CmsValue
        as="p"
        className="mt-3 max-w-4xl leading-7 text-stone-600"
        target={`${targetPrefix}_content`}
        fallback={description}
      />

      <div className="mt-6 divide-y divide-stone-200 rounded-xl border border-stone-200">
        {documents.map((document) => (
          <article
            key={document.href}
            className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-sky-800">
                {document.zone}
              </p>
              <h3 className="mt-1 text-lg font-bold leading-snug">
                {document.label}
              </h3>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                {document.title}
              </p>
            </div>
            <a
              href={document.href}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-lg bg-sky-800 px-5 py-2.5 text-center text-sm font-semibold text-white hover:bg-sky-900"
            >
              <CmsValue
                target="page_regulations_detail_button"
                fallback="Buka PDF"
              />
              <span className="sr-only"> di tab baru</span>
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function RegulationsPage() {
  const decisions = conservationDocuments.filter(
    (document) => document.kind === "kepmen",
  );
  const managementPlans = conservationDocuments.filter(
    (document) => document.kind === "rpz",
  );

  return (
    <main className="mx-auto min-h-[70vh] w-full max-w-6xl bg-transparent p-6 md:p-10">
      <CmsPageProvider component="page_regulations">
        <CmsPageHeader
          prefix="page_regulations"
          eyebrowFallback="Dasar Hukum dan Pengelolaan"
          titleFallback="Peraturan dan Dokumen Konservasi"
          subtitleFallback="Kumpulan keputusan penetapan kawasan serta dokumen Rencana Pengelolaan dan Zonasi yang disediakan sebagai rujukan publik. Apabila terdapat perbedaan dengan sumber resmi terbaru, dokumen yang ditetapkan dan dipublikasikan oleh instansi berwenang tetap menjadi acuan."
        />

        <div className="mt-8 space-y-8">
          <DocumentGroup
            targetPrefix="page_regulations_section_1"
            title="Keputusan Menteri Kelautan dan Perikanan"
            description="Enam Keputusan Menteri tahun 2020 yang menetapkan kawasan konservasi di Provinsi Maluku Utara, termasuk nama, kategori, luas, batas, dan ketentuan pokok kawasan sebagaimana tercantum dalam masing-masing keputusan."
            documents={decisions}
          />
          <DocumentGroup
            targetPrefix="page_regulations_section_2"
            title="Rencana Pengelolaan dan Zonasi 2020–2040"
            description="Dokumen rencana jangka panjang yang memuat kondisi kawasan, tujuan pengelolaan, program, kelembagaan, serta pembagian zonasi. Dokumen RPZ Pulau Rao–Tanjung Dehegila tersimpan dengan nama berkas Morotai karena kawasan tersebut berada di Kabupaten Pulau Morotai."
            documents={managementPlans}
          />
        </div>
        <CmsPageCta
          prefix="page_regulations"
          titleFallback="Rencanakan Kunjungan"
          contentFallback="Pelajari ketentuan kawasan sebelum berkunjung, lalu pilih layanan yang Anda perlukan."
          button1LabelFallback="Beli Tiket"
          button1PathFallback="/payment"
          button2LabelFallback="Jelajahi Kawasan"
          button2PathFallback="/explore"
        />
      </CmsPageProvider>
    </main>
  );
}
