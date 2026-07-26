import type { Metadata } from "next";
import {
  CmsList,
  CmsPageCta,
  CmsPageHeader,
  CmsPageProvider,
  CmsValue,
} from "../components/CmsPageContent";

export const metadata: Metadata = {
  title: "Aksesibilitas | DKP Maluku Utara",
  description:
    "Pernyataan dan komitmen aksesibilitas layanan digital DKP Provinsi Maluku Utara.",
};

export default function AccessibilityPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-7xl flex-col gap-9 bg-transparent p-6 leading-7 text-stone-700 md:p-10">
      <CmsPageProvider component="page_accessibility">
        <CmsPageHeader
          prefix="page_accessibility"
          eyebrowFallback="Pelayanan Publik Inklusif"
          titleFallback="Aksesibilitas"
          subtitleFallback="Dinas Kelautan dan Perikanan Provinsi Maluku Utara berkomitmen agar informasi dan layanan digital dapat digunakan oleh sebanyak mungkin orang, termasuk penyandang disabilitas dan pengguna dengan kondisi jaringan atau perangkat yang terbatas."
          updatedFallback="Terakhir diperbarui: 19 Juli 2026"
        />

        <section className="space-y-3">
          <h2 className="text-xl font-bold md:text-2xl">
            <CmsValue
              target="page_accessibility_section_title_1"
              fallback="Target Aksesibilitas"
            />
          </h2>
          <CmsValue
            as="p"
            target="page_accessibility_section_content_1"
            fallback="Pengembangan aplikasi mengacu pada prinsip Perceivable, Operable, Understandable, dan Robust, dengan WCAG 2.2 tingkat AA sebagai target teknis. Pemenuhan dilakukan secara bertahap melalui pengujian, perbaikan, dan masukan pengguna."
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold md:text-2xl">
            <CmsValue
              target="page_accessibility_section_title_2"
              fallback="Fitur yang Didukung"
            />
          </h2>
          <CmsList
            target="page_accessibility_section_content_2"
            fallback={[
              "struktur judul dan landmark halaman yang konsisten;",
              "navigasi menggunakan keyboard pada fungsi utama;",
              "label formulir, pesan kesalahan, dan status proses;",
              "teks alternatif untuk gambar informatif;",
              "tampilan responsif untuk telepon, tablet, dan komputer;",
              "dukungan pembesaran teks dan preferensi pengurangan animasi;",
              "informasi tiket dalam halaman web dan dokumen PDF; serta",
              "Bahasa Indonesia sebagai bahasa layanan utama.",
            ]}
            className="list-disc space-y-2 pl-6"
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold md:text-2xl">
            <CmsValue
              target="page_accessibility_section_title_3"
              fallback="Keterbatasan yang Diketahui"
            />
          </h2>
          <CmsValue
            as="p"
            target="page_accessibility_section_content_3"
            fallback="Beberapa peta interaktif, dokumen peraturan lama dalam format PDF, layanan pembayaran pihak ketiga, dan pemindaian kamera mungkin belum sepenuhnya memenuhi seluruh kebutuhan aksesibilitas. Pengguna dapat meminta informasi dalam bentuk alternatif melalui halaman kontak."
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold md:text-2xl">
            <CmsValue
              target="page_accessibility_section_title_4"
              fallback="Bantuan dan Format Alternatif"
            />
          </h2>
          <CmsValue
            as="p"
            target="page_accessibility_section_content_4"
            fallback="Apabila Anda kesulitan membeli tiket, membaca dokumen, menggunakan peta, atau mengakses informasi kawasan, sampaikan halaman atau fungsi yang bermasalah, perangkat yang digunakan, dan format yang dibutuhkan. Jangan menyertakan kata sandi atau informasi pembayaran rahasia."
          />
        </section>
        <CmsPageCta
          prefix="page_accessibility"
          titleFallback="Sampaikan Masukan"
          contentFallback="Masukan aksesibilitas akan digunakan untuk menentukan prioritas perbaikan layanan digital."
          button1LabelFallback="Hubungi Kami"
          button1PathFallback="/kontak"
        />
      </CmsPageProvider>
    </main>
  );
}
