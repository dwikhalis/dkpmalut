import type { Metadata } from "next";
import {
  CmsPageCta,
  CmsPageHeader,
  CmsPageProvider,
  CmsValue,
} from "../components/CmsPageContent";

export const metadata: Metadata = {
  title: "Syarat dan Ketentuan | DKP Malut",
  description: "Syarat penggunaan portal informasi DKP Maluku Utara.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-7xl flex-col gap-9 bg-transparent p-6 leading-7 text-stone-700 md:p-10">
      <CmsPageProvider component="page_terms">
        <CmsPageHeader
          prefix="page_terms"
          eyebrowFallback="Ketentuan Penggunaan"
          titleFallback="Syarat dan Ketentuan"
          subtitleFallback="Portal ini menyediakan informasi dan data kelautan serta perikanan Provinsi Maluku Utara."
        />

        <section className="space-y-3">
          <h2 className="text-xl font-bold md:text-2xl">
            <CmsValue
              target="page_terms_section_title_1"
              fallback="Penggunaan Informasi"
            />
          </h2>
          <CmsValue
            as="p"
            target="page_terms_section_content_1"
            fallback="Pengguna wajib menggunakan informasi secara bertanggung jawab, mematuhi hukum yang berlaku, dan mencantumkan sumber ketika menggunakan data yang dipublikasikan."
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold md:text-2xl">
            <CmsValue
              target="page_terms_section_title_2"
              fallback="Penggunaan yang Dilarang"
            />
          </h2>
          <CmsValue
            as="p"
            target="page_terms_section_content_2"
            fallback="Dilarang mengakses data tanpa izin, mengganggu layanan, memalsukan identitas, atau menggunakan portal untuk kegiatan yang melanggar hukum."
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold md:text-2xl">
            <CmsValue
              target="page_terms_section_title_3"
              fallback="Perubahan Ketentuan"
            />
          </h2>
          <CmsValue
            as="p"
            target="page_terms_section_content_3"
            fallback="Ketentuan dapat diperbarui untuk menyesuaikan perubahan layanan dan peraturan."
          />
        </section>

        <CmsPageCta
          prefix="page_terms"
          titleFallback="Ada Pertanyaan?"
          contentFallback="Pertanyaan mengenai syarat dan ketentuan penggunaan portal dapat disampaikan melalui halaman Kontak."
          button1LabelFallback="Hubungi Kami"
          button1PathFallback="/kontak"
        />
      </CmsPageProvider>
    </main>
  );
}
