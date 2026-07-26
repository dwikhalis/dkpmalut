import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kebijakan Privasi | DKP Malut",
  description: "Kebijakan privasi portal informasi DKP Maluku Utara.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-[70vh] w-full max-w-4xl space-y-6 p-6 md:p-10">
      <h1>Kebijakan Privasi</h1>
      <p>
        Dinas Kelautan dan Perikanan Provinsi Maluku Utara melindungi data
        pribadi yang diberikan melalui akun dan formulir kontak pada portal ini.
      </p>
      <p>
        Data digunakan untuk autentikasi, pengelolaan akun, komunikasi,
        keamanan, dan penyediaan data publik. Data hanya dibagikan kepada
        penyedia layanan yang diperlukan atau apabila diwajibkan oleh hukum.
      </p>
      <p>
        Pengguna dapat meminta akses, koreksi, atau penghapusan data pribadi
        melalui halaman Kontak, sesuai ketentuan yang berlaku.
      </p>
    </main>
  );
}
