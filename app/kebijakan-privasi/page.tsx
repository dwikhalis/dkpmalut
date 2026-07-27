import type { Metadata } from "next";
import {
  CmsPageCta,
  CmsPageHeader,
  CmsPageProvider,
  CmsValue,
} from "../components/CmsPageContent";

export const metadata: Metadata = {
  title: "Kebijakan Privasi | DKP Malut",
  description: "Kebijakan privasi portal informasi DKP Maluku Utara.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-7xl flex-col gap-9 bg-transparent p-6 leading-7 text-stone-700 md:p-10">
      <CmsPageProvider component="page_privacy">
        <CmsPageHeader
          prefix="page_privacy"
          eyebrowFallback="Perlindungan Data Pribadi"
          titleFallback="Kebijakan Privasi"
          subtitleFallback="Dinas Kelautan dan Perikanan Provinsi Maluku Utara melindungi data pribadi yang diberikan melalui akun dan formulir kontak pada portal ini."
        />

        <section className="space-y-3">
          <h2 className="text-xl font-bold md:text-2xl">
            <CmsValue
              target="page_privacy_section_title_1"
              fallback="Penggunaan Data"
            />
          </h2>
          <CmsValue
            as="p"
            target="page_privacy_section_content_1"
            fallback="Data digunakan untuk autentikasi, pengelolaan akun, komunikasi, keamanan, dan penyediaan data publik."
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold md:text-2xl">
            <CmsValue
              target="page_privacy_section_title_2"
              fallback="Pembagian Data"
            />
          </h2>
          <CmsValue
            as="p"
            target="page_privacy_section_content_2"
            fallback="Data hanya dibagikan kepada penyedia layanan yang diperlukan atau apabila diwajibkan oleh hukum."
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold md:text-2xl">
            <CmsValue
              target="page_privacy_section_title_3"
              fallback="Hak Pengguna"
            />
          </h2>
          <CmsValue
            as="p"
            target="page_privacy_section_content_3"
            fallback="Pengguna dapat meminta akses, koreksi, atau penghapusan data pribadi melalui halaman Kontak, sesuai ketentuan yang berlaku."
          />
        </section>

        <CmsPageCta
          prefix="page_privacy"
          titleFallback="Pertanyaan tentang Privasi"
          contentFallback="Hubungi kami apabila Anda memiliki pertanyaan mengenai penggunaan atau perlindungan data pribadi."
          button1LabelFallback="Hubungi Kami"
          button1PathFallback="/kontak"
        />
      </CmsPageProvider>
    </main>
  );
}
