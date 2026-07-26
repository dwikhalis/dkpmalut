import type { Metadata } from "next";

import TariffList from "./TariffList";
import {
  CmsPageCta,
  CmsPageHeader,
  CmsPageProvider,
  CmsValue,
} from "../components/CmsPageContent";

export const metadata: Metadata = {
  title: "Informasi Tarif | DKP Maluku Utara",
  description:
    "Informasi tarif tiket kunjungan kawasan konservasi DKP Provinsi Maluku Utara.",
};

export default function TariffInformationPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-7xl flex-col gap-9 bg-transparent p-6 leading-7 text-stone-700 md:p-10">
      <CmsPageProvider component="page_rates">
        <CmsPageHeader
          prefix="page_rates"
          eyebrowFallback="Informasi Layanan Tiket"
          titleFallback="Informasi Tarif"
          subtitleFallback="Tarif dasar tiket untuk setiap pengunjung dan kawasan yang dipilih. Daftar ini dimuat dari sumber harga yang sama dengan proses checkout."
        />

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">
            <CmsValue
              target="page_rates_section_title_1"
              fallback="Tarif Kawasan"
            />
          </h2>
          <CmsValue
            as="p"
            className="text-stone-600"
            target="page_rates_section_content_1"
            fallback="Daftar tarif dasar untuk setiap kawasan konservasi yang tersedia."
          />
          <TariffList />
        </section>

        <section className="space-y-3 rounded-xl bg-sky-50 p-5">
          <h2 className="text-xl font-bold">
            <CmsValue
              target="page_rates_section_title_2"
              fallback="Cara Perhitungan"
            />
          </h2>
          <CmsValue
            as="p"
            className="whitespace-pre-line text-stone-600"
            target="page_rates_section_content_2"
            fallback={
              "Tarif setiap kawasan dikalikan jumlah pengunjung.\nJika memilih lebih dari satu kawasan, tarif setiap kawasan dijumlahkan.\nPajak dan komponen biaya aktif dihitung otomatis dan ditampilkan secara terperinci sebelum pembayaran.\nTotal final yang mengikat adalah total pada halaman konfirmasi pembayaran."
            }
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">
            <CmsValue
              target="page_rates_section_title_3"
              fallback="Catatan Penting"
            />
          </h2>
          <CmsValue
            as="p"
            className="text-stone-600"
            target="page_rates_section_content_3"
            fallback="Tarif dapat berubah berdasarkan keputusan atau ketentuan resmi. Periksa kembali rincian tujuan, pengunjung, pajak, dan total sebelum melakukan pembayaran. Aktivitas yang memerlukan izin khusus dapat memiliki persyaratan atau biaya lain di luar tiket kunjungan."
          />
        </section>

        <CmsPageCta
          prefix="page_rates"
          titleFallback="Siap Mengunjungi Kawasan Konservasi?"
          contentFallback="Pilih kawasan tujuan, lengkapi data pengunjung, lalu periksa rincian tarif sebelum melanjutkan pembayaran."
          button1LabelFallback="Beli Tiket"
          button1PathFallback="/payment"
        />
      </CmsPageProvider>
    </main>
  );
}
