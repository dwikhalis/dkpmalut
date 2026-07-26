import type { Metadata } from "next";
import {
  CmsPageCta,
  CmsPageHeader,
  CmsPageProvider,
  CmsParagraphs,
  CmsValue,
} from "../components/CmsPageContent";

export const metadata: Metadata = {
  title: "Syarat dan Ketentuan | Platform Data DKP Maluku Utara",
  description: "Ketentuan penggunaan Platform Data DKP Maluku Utara.",
};

const sections = [
  {
    title: "Penerimaan Ketentuan",
    content:
      "Dengan mengakses platform, pengguna menyetujui ketentuan ini dan Kebijakan Privasi yang berlaku.",
  },
  {
    title: "Akun dan Kewenangan",
    content:
      "Pengguna bertanggung jawab menjaga keamanan akun. Hak unggah, penyuntingan, peninjauan, dan publikasi data mengikuti peran yang diberikan pengelola.",
  },
  {
    title: "Kualitas dan Sumber Data",
    content:
      "Penerbit data wajib memastikan data akurat, sah, memiliki sumber yang dapat dipertanggungjawabkan, dan tidak melanggar hak pihak lain.",
  },
  {
    title: "Penggunaan Data",
    content:
      "Data publik dapat digunakan sesuai lisensi, atribusi, batasan, dan peraturan yang dicantumkan pada dataset terkait.",
  },
  {
    title: "Larangan",
    content:
      "Dilarang mengakses data tanpa izin, mengganggu layanan, melewati kontrol keamanan, memasukkan kode berbahaya, atau memublikasikan data pribadi dan rahasia tanpa dasar yang sah.",
  },
  {
    title: "Ketersediaan Layanan",
    content:
      "Pengelola berupaya menjaga layanan tetap tersedia, tetapi pemeliharaan, gangguan jaringan, atau keadaan darurat dapat menyebabkan gangguan sementara.",
  },
  {
    title: "Perubahan Ketentuan",
    content:
      "Ketentuan dapat diperbarui mengikuti perubahan layanan, teknologi, dan peraturan. Versi terbaru berlaku sejak dipublikasikan.",
  },
];

export default function TermsPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-7xl flex-col gap-9 p-6 leading-7 text-stone-700 md:p-10">
      <CmsPageProvider component="page_terms">
        <CmsPageHeader
          prefix="page_terms"
          eyebrowFallback="Ketentuan Platform Data"
          titleFallback="Syarat dan Ketentuan"
          subtitleFallback="Ketentuan penggunaan data, akun, publikasi, dan layanan Platform Data DKP Maluku Utara."
        />
        {sections.map((section, index) => (
          <section key={section.title} className="space-y-3">
            <CmsValue
              target={`page_terms_section_title_${index + 1}`}
              fallback={`${index + 1}. ${section.title}`}
              as="h2"
              className="text-xl font-bold md:text-2xl"
            />
            <CmsParagraphs
              target={`page_terms_section_content_${index + 1}`}
              fallback={section.content}
            />
          </section>
        ))}
        <CmsPageCta
          prefix="page_terms"
          titleFallback="Butuh bantuan?"
          contentFallback="Pertanyaan mengenai penggunaan platform dapat disampaikan melalui kanal resmi."
          button1LabelFallback="Hubungi Kami"
          button1PathFallback="/kontak"
        />
      </CmsPageProvider>
    </main>
  );
}
