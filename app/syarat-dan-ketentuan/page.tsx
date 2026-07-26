import type { Metadata } from "next";
import {
  CmsPageCta,
  CmsPageHeader,
  CmsPageProvider,
  CmsParagraphs,
  CmsValue,
} from "../components/CmsPageContent";

export const metadata: Metadata = {
  title: "Syarat dan Ketentuan | DKP Maluku Utara",
  description:
    "Syarat dan ketentuan penggunaan layanan informasi dan tiket kawasan konservasi DKP Provinsi Maluku Utara.",
};

const sections = [
  {
    title: "Penerimaan Ketentuan",
    content: [
      "Dengan mengakses aplikasi atau menggunakan layanan tiket, pengguna menyatakan telah membaca dan menyetujui ketentuan ini serta Kebijakan Privasi yang berlaku.",
      "Pengguna yang memasukkan data untuk orang lain wajib memiliki kewenangan untuk melakukannya dan memastikan pihak tersebut memahami ketentuan layanan.",
    ],
  },
  {
    title: "Informasi dan Akun Pengguna",
    content: [
      "Informasi yang diberikan harus benar, lengkap, dan dapat dipertanggungjawabkan. Pengguna bertanggung jawab menjaga keamanan akun, email, perangkat, dan kredensialnya.",
      "Pengelola dapat membatasi atau menonaktifkan akses apabila terdapat penyalahgunaan, informasi palsu, pelanggaran keamanan, atau pelanggaran hukum.",
    ],
  },
  {
    title: "Pemesanan dan Pembayaran",
    content: [
      "Harga yang berlaku adalah harga yang ditampilkan pada halaman checkout ketika pesanan disiapkan. Total dapat mencakup tarif setiap kawasan, jumlah pengunjung, pajak, atau komponen resmi lainnya yang ditampilkan sebelum pembayaran.",
      "Pesanan belum dianggap berhasil sampai pembayaran dikonfirmasi oleh sistem. Bukti instruksi pembayaran bukan bukti bahwa transaksi telah lunas.",
      "Pengguna wajib memeriksa nama, email, pengunjung, tujuan, jumlah, dan total transaksi sebelum melanjutkan pembayaran.",
    ],
  },
  {
    title: "Tiket dan QR Code",
    content: [
      "Tiket hanya berlaku untuk tujuan, periode, dan ketentuan yang tercantum. QR Code, PDF tiket, token status, dan tautan verifikasi harus dijaga seperti dokumen akses.",
      "Tiket dapat ditolak apabila palsu, dimanipulasi, kedaluwarsa, dibatalkan, dikembalikan dananya, telah digunakan, atau tidak sesuai dengan data kunjungan.",
    ],
  },
  {
    title: "Ketentuan Kawasan Konservasi",
    content: [
      "Pengunjung wajib menaati zonasi, kuota, arahan petugas, ketentuan keselamatan, perlindungan biota, pengelolaan sampah, pembatasan aktivitas, dan peraturan lain yang berlaku di kawasan.",
      "Tiket bukan izin untuk melakukan aktivitas yang memerlukan izin khusus, termasuk penelitian, pengambilan biota, penangkapan ikan tertentu, kegiatan komersial, atau aktivitas lain yang dibatasi.",
    ],
  },
  {
    title: "Pembatalan, Penjadwalan Ulang, dan Pengembalian Dana",
    content: [
      "Pembatalan atau pengembalian dana mengikuti dasar hukum tarif, kebijakan instansi, status transaksi, dan alasan pembatalan. Pengguna harus menghubungi kanal resmi dengan menyertakan ID pesanan tanpa mengirim informasi pembayaran rahasia.",
      "Penutupan kawasan, cuaca buruk, keadaan darurat, atau kebijakan pemerintah dapat memengaruhi kunjungan. Bentuk penyelesaian akan ditentukan berdasarkan kebijakan yang berlaku untuk kejadian tersebut.",
    ],
  },
  {
    title: "Ketersediaan Layanan",
    content: [
      "Pengelola berupaya menjaga layanan tetap tersedia, tetapi pemeliharaan, gangguan jaringan, keadaan darurat, layanan pihak ketiga, atau kondisi di kawasan dapat menyebabkan gangguan sementara.",
      "Informasi operasional dapat berubah. Pengguna disarankan memeriksa informasi terbaru sebelum keberangkatan.",
    ],
  },
  {
    title: "Larangan Penggunaan",
    content: [
      "Dilarang mencoba mengakses data tanpa izin, mengganggu layanan, menghindari pembatasan keamanan, memalsukan transaksi atau tiket, memindai tiket tanpa kewenangan, menyalin data pribadi, atau menggunakan aplikasi untuk kegiatan melanggar hukum.",
    ],
  },
  {
    title: "Perubahan Ketentuan",
    content: [
      "Ketentuan dapat diperbarui karena perubahan layanan, tarif, teknologi, atau peraturan. Versi terbaru dan tanggal pembaruan akan ditampilkan pada halaman ini.",
    ],
  },
];

export default function TermsPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-7xl flex-col gap-9 bg-transparent p-6 leading-7 text-stone-700 md:p-10">
      <CmsPageProvider component="page_terms">
        <CmsPageHeader
          prefix="page_terms"
          eyebrowFallback="Ketentuan Layanan Publik"
          titleFallback="Syarat dan Ketentuan"
          subtitleFallback="Ketentuan penggunaan portal informasi, akun, pemesanan, pembayaran, dan tiket kawasan konservasi Dinas Kelautan dan Perikanan Provinsi Maluku Utara."
          updatedFallback="Terakhir diperbarui: 19 Juli 2026"
        />

        {sections.map((section, index) => (
          <section key={section.title} className="space-y-3">
            <h2 className="text-xl font-bold md:text-2xl">
              {index + 1}.{" "}
              <CmsValue
                target={`page_terms_section_title_${index + 1}`}
                fallback={section.title}
              />
            </h2>
            <CmsParagraphs
              target={`page_terms_section_content_${index + 1}`}
              fallback={section.content}
              className="space-y-3"
            />
          </section>
        ))}
        <CmsPageCta
          prefix="page_terms"
          titleFallback="Kontak"
          contentFallback="Pertanyaan, koreksi pesanan, atau pengaduan dapat disampaikan melalui kanal resmi. Lihat juga Kebijakan Privasi untuk informasi mengenai pemrosesan Data Pribadi."
          button1LabelFallback="Hubungi Kami"
          button1PathFallback="/kontak"
          button2LabelFallback="Kebijakan Privasi"
          button2PathFallback="/kebijakan-privasi"
        />
      </CmsPageProvider>
    </main>
  );
}
