import type { Metadata } from "next";
import {
  CmsPageCta,
  CmsPageHeader,
  CmsPageProvider,
  CmsParagraphs,
  CmsValue,
} from "../components/CmsPageContent";

export const metadata: Metadata = {
  title: "Kebijakan Privasi | Platform Data DKP Maluku Utara",
  description: "Kebijakan privasi Platform Data DKP Maluku Utara.",
};

const sections = [
  {
    title: "Data yang Diproses",
    content:
      "Platform dapat memproses identitas akun, email, profil organisasi, riwayat aktivitas, pesan kontak, metadata teknis, serta data yang diunggah oleh pengguna berwenang.",
  },
  {
    title: "Tujuan Pemrosesan",
    content:
      "Data digunakan untuk autentikasi, pengelolaan akses, publikasi dataset, moderasi, keamanan, dukungan pengguna, audit, dan peningkatan layanan.",
  },
  {
    title: "Publikasi Dataset",
    content:
      "Pengguna wajib memastikan dataset yang diajukan untuk publikasi tidak memuat data pribadi, rahasia, atau data yang penggunaannya tidak memiliki dasar yang sah.",
  },
  {
    title: "Penyimpanan dan Keamanan",
    content:
      "Pengelola menerapkan kontrol akses, pembatasan peran, pencatatan aktivitas, validasi masukan, dan perlindungan transmisi untuk mengurangi risiko akses tidak sah.",
  },
  {
    title: "Hak Pengguna",
    content:
      "Permintaan akses, koreksi, pembatasan, atau penghapusan data pribadi dapat disampaikan melalui halaman kontak dan akan ditangani sesuai ketentuan yang berlaku.",
  },
];

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-7xl flex-col gap-9 p-6 leading-7 text-stone-700 md:p-10">
      <CmsPageProvider component="page_privacy">
        <CmsPageHeader
          prefix="page_privacy"
          eyebrowFallback="Perlindungan Data"
          titleFallback="Kebijakan Privasi"
          subtitleFallback="Cara Platform Data DKP Maluku Utara memproses dan melindungi data pengguna."
        />
        {sections.map((section, index) => (
          <section key={section.title} className="space-y-3">
            <CmsValue
              target={`page_privacy_section_title_${index + 1}`}
              fallback={`${index + 1}. ${section.title}`}
              as="h2"
              className="text-xl font-bold md:text-2xl"
            />
            <CmsParagraphs
              target={`page_privacy_section_content_${index + 1}`}
              fallback={section.content}
            />
          </section>
        ))}
        <CmsPageCta
          prefix="page_privacy"
          titleFallback="Pertanyaan privasi"
          contentFallback="Hubungi pengelola untuk pertanyaan atau permintaan terkait data pribadi."
          button1LabelFallback="Hubungi Kami"
          button1PathFallback="/kontak"
        />
      </CmsPageProvider>
    </main>
  );
}
