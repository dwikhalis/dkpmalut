import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Syarat dan Ketentuan | DKP Malut",
  description: "Syarat penggunaan portal informasi DKP Maluku Utara.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto min-h-[70vh] w-full max-w-4xl space-y-6 p-6 md:p-10">
      <h1>Syarat dan Ketentuan</h1>
      <p>
        Portal ini menyediakan informasi dan data kelautan serta perikanan
        Provinsi Maluku Utara. Pengguna wajib menggunakan informasi secara
        bertanggung jawab, mematuhi hukum yang berlaku, dan mencantumkan sumber
        ketika menggunakan data yang dipublikasikan.
      </p>
      <p>
        Dilarang mengakses data tanpa izin, mengganggu layanan, memalsukan
        identitas, atau menggunakan portal untuk kegiatan yang melanggar hukum.
      </p>
      <p>
        Ketentuan dapat diperbarui untuk menyesuaikan perubahan layanan dan
        peraturan. Pertanyaan dapat disampaikan melalui halaman Kontak.
      </p>
    </main>
  );
}
