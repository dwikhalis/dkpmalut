import type { Metadata } from "next";

import {
  CmsPageCta,
  CmsPageHeader,
  CmsPageProvider,
  CmsParagraphs,
  CmsValue,
} from "../components/CmsPageContent";

export const metadata: Metadata = {
  title: "Tentang Kami | UPTD BLUD KKPD Maluku Utara",
  description:
    "Profil UPTD BLUD Kawasan Konservasi Perairan Daerah Provinsi Maluku Utara.",
};

const focusAreas = [
  {
    title: "Informasi Kawasan",
    description:
      "Menyediakan informasi mengenai kawasan konservasi, zonasi, dan dokumen rujukan yang dapat diakses masyarakat.",
  },
  {
    title: "Layanan Kunjungan",
    description:
      "Mendukung perencanaan kunjungan melalui informasi tarif, pemesanan tiket, dan verifikasi tiket digital.",
  },
  {
    title: "Data dan Edukasi",
    description:
      "Menghadirkan data serta materi informasi untuk meningkatkan pemahaman tentang pengelolaan kawasan konservasi.",
  },
];

export default function OrganizationPage() {
  return (
    <main className="mx-auto min-h-[70vh] w-full max-w-6xl bg-transparent p-6 md:p-10">
      <CmsPageProvider component="page_organization">
        <CmsPageHeader
          prefix="page_organization"
          eyebrowFallback="Tentang Kami"
          titleFallback="UPTD BLUD Kawasan Konservasi Perairan Daerah"
          subtitleFallback="Unit Pelaksana Teknis Daerah (UPTD) Badan Layanan Umum Daerah (BLUD) Kawasan Konservasi Perairan Daerah (KKPD) Provinsi Maluku Utara."
        />

        <div className="mt-8 grid gap-7 lg:grid-cols-[1.35fr_0.65fr]">
          <section className="py-4 md:py-6">
            <CmsValue
              as="h2"
              className="text-2xl font-bold text-sky-950 md:text-3xl"
              target="page_organization_section_title_1"
              fallback="Siapa Kami"
            />
            <CmsParagraphs
              target="page_organization_section_content_1"
              fallback={[
                "UPTD BLUD Kawasan Konservasi Perairan Daerah merupakan unit layanan yang mendukung pengelolaan kawasan konservasi perairan di Provinsi Maluku Utara.",
                "Melalui portal ini, masyarakat dapat mengenal kawasan konservasi, mempelajari dokumen dan data pendukung, memperoleh informasi kunjungan, serta menggunakan layanan tiket yang tersedia.",
                "Kami mendorong akses informasi yang lebih mudah dan kunjungan yang bertanggung jawab agar pemanfaatan kawasan berjalan selaras dengan upaya menjaga lingkungan perairan Maluku Utara.",
              ]}
              className="mt-5 space-y-4 text-base leading-8 text-stone-600 md:text-lg"
            />
          </section>

          <aside className="rounded-3xl bg-amber-50 p-6 shadow-lg ring-1 ring-amber-200 md:p-9">
            <CmsValue
              as="h4"
              className="font-bold text-sky-950"
              target="page_organization_section_title_2"
              fallback="Nama Singkat"
            />
            <CmsValue
              as="p"
              className="mt-3 font-semibold leading-snug text-stone-700"
              target="page_organization_section_content_2"
              fallback="UPTD BLUD Kawasan Konservasi Perairan Daerah"
            />
            <div className="mt-7 border-t border-amber-200 pt-6">
              <CmsValue
                as="h4"
                className="font-bold text-sky-950"
                target="page_organization_section_title_3"
                fallback="Wilayah Layanan"
              />
              <CmsValue
                as="p"
                className="mt-2 whitespace-pre-line leading-7 text-stone-600"
                target="page_organization_section_content_3"
                fallback="Kawasan konservasi perairan daerah di Provinsi Maluku Utara."
              />
            </div>
          </aside>
        </div>

        <section className="mt-10 border-t border-stone-200 pt-10">
          <CmsValue
            as="p"
            className="text-sm font-bold uppercase tracking-[0.18em] text-sky-700"
            target="page_organization_focus_eyebrow"
            fallback="Fokus Layanan"
          />
          <CmsValue
            as="h2"
            className="mt-3 text-2xl font-bold text-sky-950 md:text-3xl"
            target="page_organization_focus_title"
            fallback="Informasi dan layanan dalam satu portal"
          />

          <div className="mt-7 grid gap-5 md:grid-cols-3">
            {focusAreas.map((area, index) => (
              <article
                key={area.title}
                className="rounded-2xl bg-sky-50 p-5 ring-1 ring-sky-100"
              >
                <p className="text-sm font-bold text-cyan-600">0{index + 1}</p>
                <CmsValue
                  as="h3"
                  className="mt-3 text-xl font-bold text-sky-950"
                  target={`page_organization_focus_item_title_${index + 1}`}
                  fallback={area.title}
                />
                <CmsValue
                  as="p"
                  className="mt-3 leading-7 text-stone-600"
                  target={`page_organization_focus_item_description_${index + 1}`}
                  fallback={area.description}
                />
              </article>
            ))}
          </div>
        </section>

        <CmsPageCta
          prefix="page_organization"
          eyebrowFallback="Tim Kami"
          titleFallback="Kenali staf UPTD BLUD KKPD"
          contentFallback="Lihat daftar staf berdasarkan bidang dan peran dalam organisasi."
          button1LabelFallback="Lihat Daftar Staf"
          button1PathFallback="/organisasi/staff"
        />
      </CmsPageProvider>
    </main>
  );
}
