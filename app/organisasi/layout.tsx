import "../globals.css";
export const metadata = {
  title: "Organisasi | UPTD BLUD KKPD Maluku Utara",
  description:
    "Profil UPTD BLUD Kawasan Konservasi Perairan Daerah Provinsi Maluku Utara.",
  keywords: ["UPTD", "BLUD", "KKPD", "Konservasi Perairan", "Maluku Utara"],
  authors: [{ name: "UPTD BLUD KKPD Maluku Utara" }],
};

export default function Page({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
