import type { Metadata } from "next";

import ListManager from "../../components/ListManager";
import { PageHeader } from "../../components/CmsPageContent";

export const metadata: Metadata = {
  title: "Daftar Staf | UPTD BLUD KKPD Maluku Utara",
  description:
    "Daftar staf UPTD BLUD Kawasan Konservasi Perairan Daerah Provinsi Maluku Utara.",
};

export const revalidate = 0;

export default function StaffPage() {
  return (
    <main className="min-h-[70vh] bg-gradient-to-b from-sky-50 via-white to-cyan-50 p-6 md:p-10">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          eyebrow="Organisasi"
          title="Daftar Staf"
          subtitle="Staf UPTD BLUD Kawasan Konservasi Perairan Daerah Provinsi Maluku Utara berdasarkan bidang dan peran dalam organisasi."
        />

        <section className="mt-8">
          <ListManager admin={false} type="staff" />
        </section>
      </div>
    </main>
  );
}
