import type { Metadata } from "next";
import {
  CmsOptionalContent,
  CmsPageCta,
  CmsPageHeader,
  CmsPageProvider,
  CmsValue,
} from "../components/CmsPageContent";

export const metadata: Metadata = {
  title: "Kebijakan Privasi | DKP Maluku Utara",
  description:
    "Kebijakan Privasi layanan digital Dinas Kelautan dan Perikanan Provinsi Maluku Utara.",
};

const LAST_UPDATED = "19 Juli 2026";

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-7xl flex-col gap-9 bg-transparent p-6 leading-7 text-stone-700 md:p-10">
      <CmsPageProvider component="page_privacy">
        <CmsPageHeader
          prefix="page_privacy"
          eyebrowFallback="Layanan Digital Pemerintah"
          titleFallback="Kebijakan Privasi"
          subtitleFallback="Dinas Kelautan dan Perikanan Provinsi Maluku Utara berkomitmen melindungi Data Pribadi dalam penyelenggaraan informasi publik, layanan akun, komunikasi, serta pemesanan dan verifikasi tiket kawasan konservasi."
          updatedFallback={`Terakhir diperbarui: ${LAST_UPDATED}`}
        />

        <nav
          aria-label="Daftar isi kebijakan privasi"
          className="rounded-xl bg-sky-50 p-5"
        >
          <h2 className="text-lg font-semibold">Daftar Isi</h2>
          <ol className="mt-3 grid list-decimal gap-x-8 gap-y-2 pl-5 text-sm text-sky-900 md:grid-cols-2">
            <li>
              <a href="#cakupan" className="hover:underline">
                Cakupan dan pengendali data
              </a>
            </li>
            <li>
              <a href="#data" className="hover:underline">
                Data yang diproses
              </a>
            </li>
            <li>
              <a href="#tujuan" className="hover:underline">
                Tujuan dan dasar pemrosesan
              </a>
            </li>
            <li>
              <a href="#pengungkapan" className="hover:underline">
                Pengungkapan data
              </a>
            </li>
            <li>
              <a href="#penyimpanan" className="hover:underline">
                Penyimpanan dan retensi
              </a>
            </li>
            <li>
              <a href="#hak" className="hover:underline">
                Hak subjek data
              </a>
            </li>
            <li>
              <a href="#keamanan" className="hover:underline">
                Keamanan data
              </a>
            </li>
            <li>
              <a href="#kontak" className="hover:underline">
                Kontak dan pengaduan
              </a>
            </li>
          </ol>
        </nav>

        <PolicySection
          id="cakupan"
          number="1"
          title="Cakupan dan Pengendali Data Pribadi"
        >
          <p>
            Kebijakan ini berlaku untuk situs, halaman akun, formulir kontak,
            layanan tiket, pembayaran, verifikasi tiket, dan fitur digital lain
            yang dikelola melalui aplikasi ini. Pengendali Data Pribadi untuk
            layanan ini adalah Dinas Kelautan dan Perikanan Provinsi Maluku
            Utara sesuai kewenangan dan tugas pemerintahan yang berlaku.
          </p>
          <p>
            Pemrosesan dilakukan dengan mengacu pada Undang-Undang Nomor 27
            Tahun 2022 tentang Perlindungan Data Pribadi, Peraturan Pemerintah
            Nomor 71 Tahun 2019 tentang Penyelenggaraan Sistem dan Transaksi
            Elektronik, serta ketentuan Sistem Pemerintahan Berbasis Elektronik
            yang relevan.
          </p>
        </PolicySection>

        <PolicySection id="data" number="2" title="Data Pribadi yang Diproses">
          <p>
            Data yang dapat diproses bergantung pada layanan yang digunakan:
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong>Data akun:</strong> nama pengguna, email, nomor telepon,
              organisasi, pekerjaan, jenis kelamin, foto profil, peran, dan
              informasi autentikasi.
            </li>
            <li>
              <strong>Data komunikasi:</strong> nama, email, nomor telepon, isi
              pesan, waktu pengiriman, dan status penanganan pesan.
            </li>
            <li>
              <strong>Data pemesanan:</strong> nama dan email pemesan, jenis
              pembelian, tujuan konservasi, jumlah pengunjung, serta waktu
              pemesanan.
            </li>
            <li>
              <strong>Data pengunjung:</strong> nama pengunjung dan negara atau
              kewarganegaraan yang diberikan dalam formulir tiket.
            </li>
            <li>
              <strong>Data operator dan kapal:</strong> nama dan email operator,
              jenis operator, serta nama kapal apabila digunakan.
            </li>
            <li>
              <strong>Data transaksi:</strong> ID pesanan, jumlah pembayaran,
              metode dan status pembayaran, waktu transaksi, serta referensi
              dari penyedia pembayaran. Aplikasi tidak menyimpan nomor kartu
              atau kredensial perbankan lengkap.
            </li>
            <li>
              <strong>Data tiket:</strong> kode atau token tiket, QR Code, masa
              berlaku, status pemindaian, petugas atau proses yang
              memverifikasi, dan waktu penggunaan.
            </li>
            <li>
              <strong>Data teknis dan keamanan:</strong> alamat IP yang telah
              diproses untuk keamanan atau pembatasan permintaan, jenis
              perangkat atau peramban, waktu akses, log kesalahan, dan aktivitas
              keamanan yang relevan.
            </li>
          </ul>
        </PolicySection>

        <PolicySection
          id="tujuan"
          number="3"
          title="Tujuan dan Dasar Pemrosesan"
        >
          <p>Data diproses secara terbatas untuk:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>memberikan layanan informasi, akun, kontak, dan tiket;</li>
            <li>memproses pembayaran dan menerbitkan bukti serta tiket;</li>
            <li>mengirim tiket dan pemberitahuan layanan melalui email;</li>
            <li>
              memverifikasi keabsahan, masa berlaku, dan penggunaan tiket;
            </li>
            <li>
              mencegah penipuan, serangan, transaksi ganda, dan penyalahgunaan
              layanan;
            </li>
            <li>
              menangani permintaan, pengaduan, sengketa, refund, dan dukungan
              pengguna;
            </li>
            <li>
              memenuhi kewajiban administrasi, keuangan, audit, kearsipan, dan
              penegakan hukum;
            </li>
            <li>
              menghasilkan statistik layanan atau konservasi dalam bentuk
              agregat atau teranonimkan.
            </li>
          </ul>
          <p>
            Dasar pemrosesan dapat berupa pelaksanaan kewenangan atau kewajiban
            hukum pemerintah, kepentingan umum, pelaksanaan layanan atau
            transaksi yang diminta pengguna, perlindungan kepentingan yang sah
            sesuai peraturan, atau persetujuan ketika persetujuan diwajibkan.
            Data tidak digunakan untuk pemasaran komersial tanpa dasar yang sah.
          </p>
        </PolicySection>

        <PolicySection
          id="anak"
          number="4"
          title="Data Anak dan Data Pihak Lain"
        >
          <p>
            Apabila pemesan memasukkan data anak atau orang lain, pemesan
            menyatakan memiliki kewenangan yang sah untuk memberikan data
            tersebut dan wajib menyampaikan informasi kebijakan ini kepada pihak
            terkait. Pemrosesan data anak harus memperhatikan kepentingan
            terbaik anak dan persetujuan orang tua atau wali sesuai ketentuan
            yang berlaku.
          </p>
        </PolicySection>

        <PolicySection
          id="pengungkapan"
          number="5"
          title="Pengungkapan dan Penyedia Layanan"
        >
          <p>
            Data tidak diperjualbelikan. Data hanya dapat diberikan secara
            terbatas kepada unit pemerintah yang berwenang, pengelola kawasan,
            auditor, aparat penegak hukum berdasarkan kewenangan, atau penyedia
            layanan yang diperlukan untuk menjalankan aplikasi.
          </p>
          <p>Penyedia tersebut dapat mencakup:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Supabase untuk autentikasi, database, dan penyimpanan;</li>
            <li>Vercel untuk hosting dan analitik operasional;</li>
            <li>Midtrans untuk pemrosesan pembayaran;</li>
            <li>penyedia email untuk pengiriman tiket dan pesan layanan;</li>
            <li>Cloudflare Turnstile untuk verifikasi keamanan; dan</li>
            <li>Google Maps untuk tampilan peta tertentu.</li>
          </ul>
          <p>
            Sebagian penyedia dapat memproses data menggunakan infrastruktur di
            luar wilayah Indonesia. Pemrosesan lintas batas harus dilakukan
            dengan perlindungan yang dipersyaratkan oleh peraturan perlindungan
            data yang berlaku.
          </p>
        </PolicySection>

        <PolicySection
          id="perangkat"
          number="6"
          title="Penyimpanan pada Perangkat dan Layanan Pihak Ketiga"
        >
          <p>
            Aplikasi menggunakan penyimpanan peramban untuk mempertahankan
            bahasa, sesi autentikasi, dan data formulir tiket selama proses
            checkout. Data checkout dibersihkan setelah pembayaran berhasil,
            tetapi dapat tetap tersedia selama sesi apabila proses belum
            selesai. Pengguna yang memakai perangkat bersama disarankan keluar
            dari akun dan menutup peramban setelah menggunakan layanan.
          </p>
          <p>
            Pembayaran, peta, verifikasi keamanan, dan tautan eksternal dapat
            membuka layanan pihak ketiga yang memiliki kebijakan privasinya
            sendiri.
          </p>
        </PolicySection>

        <PolicySection
          id="verifikasi"
          number="7"
          title="Tiket dan Tautan Verifikasi"
        >
          <p>
            QR Code dan tautan verifikasi berfungsi sebagai akses terhadap
            informasi tiket. Informasi yang diperlukan petugas dapat meliputi
            nama pengunjung, negara, tujuan, kapal, masa berlaku, dan status
            pemindaian. Jangan membagikan QR Code, PDF tiket, token status, atau
            tautan verifikasi kepada pihak yang tidak berkepentingan.
          </p>
        </PolicySection>

        <PolicySection
          id="penyimpanan"
          number="8"
          title="Penyimpanan dan Retensi"
        >
          <p>
            Data disimpan selama diperlukan untuk menyediakan layanan,
            menyelesaikan transaksi dan pengaduan, melaksanakan audit, memenuhi
            kewajiban keuangan atau kearsipan, menangani sengketa, serta menjaga
            keamanan sistem. Lamanya penyimpanan ditentukan berdasarkan jenis
            data, status transaksi, kebutuhan operasional, dan ketentuan hukum
            yang berlaku.
          </p>
          <p>
            Setelah tidak lagi diperlukan, data akan dihapus, dimusnahkan, atau
            dianonimkan sesuai jadwal retensi resmi. Data tertentu dapat
            disimpan lebih lama apabila diwajibkan oleh hukum, diperlukan untuk
            proses hukum, audit, atau kepentingan publik yang sah.
          </p>
        </PolicySection>

        <PolicySection id="hak" number="9" title="Hak Subjek Data Pribadi">
          <p>Sesuai ketentuan yang berlaku, subjek data dapat meminta:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>informasi mengenai identitas dan dasar pemrosesan;</li>
            <li>akses dan salinan Data Pribadi;</li>
            <li>perbaikan atau pembaruan data yang tidak akurat;</li>
            <li>penghentian, penghapusan, atau pemusnahan data;</li>
            <li>
              penarikan persetujuan apabila pemrosesan didasarkan pada
              persetujuan;
            </li>
            <li>
              keberatan atas keputusan yang hanya didasarkan pada pemrosesan
              otomatis;
            </li>
            <li>pembatasan pemrosesan atau penyampaian pengaduan; dan</li>
            <li>hak lain yang diberikan oleh peraturan perundang-undangan.</li>
          </ul>
          <p>
            Permintaan dapat dibatasi apabila penyimpanan atau pemrosesan masih
            diwajibkan oleh hukum. Untuk mencegah pengungkapan kepada pihak yang
            tidak berhak, identitas pemohon akan diverifikasi.
          </p>
        </PolicySection>

        <PolicySection id="keamanan" number="10" title="Keamanan Data">
          <p>
            Pengelola menerapkan upaya teknis dan organisasi yang wajar,
            termasuk pengendalian akses berbasis peran, pembatasan akses
            database, enkripsi dalam transmisi, validasi pembayaran, pembatasan
            permintaan, pencatatan operasional, pencadangan, dan pengelolaan
            kredensial. Tidak ada sistem yang sepenuhnya bebas risiko, sehingga
            pengamanan dievaluasi dan ditingkatkan secara berkala.
          </p>
          <p>
            Apabila terjadi kegagalan pelindungan Data Pribadi, pengelola akan
            melakukan penanganan dan pemberitahuan kepada pihak yang wajib
            diberitahu dalam jangka waktu serta tata cara yang ditentukan oleh
            peraturan perundang-undangan.
          </p>
        </PolicySection>

        <PolicySection id="perubahan" number="11" title="Perubahan Kebijakan">
          <p>
            Kebijakan ini dapat diperbarui apabila terdapat perubahan layanan,
            teknologi, penyedia, atau peraturan. Versi terbaru dan tanggal
            pembaruan akan ditampilkan pada halaman ini. Perubahan material
            dapat disampaikan melalui aplikasi atau kanal resmi lainnya.
          </p>
        </PolicySection>
        <CmsPageCta
          prefix="page_privacy"
          titleFallback="Kontak dan Pengaduan Privasi"
          contentFallback="Permintaan pelaksanaan hak, pertanyaan, atau pengaduan privasi dapat disampaikan kepada Dinas Kelautan dan Perikanan Provinsi Maluku Utara melalui halaman kontak resmi. Sertakan nama, informasi kontak, hubungan dengan data yang dimaksud, dan uraian permintaan. Jangan mengirim kata sandi, PIN, atau informasi pembayaran rahasia."
          button1LabelFallback="Hubungi Kami"
          button1PathFallback="/kontak"
        />
      </CmsPageProvider>
    </main>
  );
}

function PolicySection({
  id,
  number,
  title,
  children,
}: {
  id: string;
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28 space-y-3">
      <h2 className="text-xl font-bold leading-snug md:text-2xl">
        {number}.{" "}
        <CmsValue
          target={`page_privacy_section_title_${number}`}
          fallback={title}
        />
      </h2>
      <CmsOptionalContent
        target={`page_privacy_section_content_${number}`}
        className="space-y-4"
      >
        {children}
      </CmsOptionalContent>
    </section>
  );
}
