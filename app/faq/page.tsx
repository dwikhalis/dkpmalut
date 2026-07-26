import type { Metadata } from "next";
import { FAQs } from "../components/Homepage/SectionFAQ";

export const metadata: Metadata = {
  title: "FAQ | DKP Malut",
  description:
    "Pertanyaan yang sering diajukan mengenai layanan, tiket, dan kawasan konservasi DKP Maluku Utara.",
};

export default function FaqPage() {
  return (
    <main className="mx-auto min-h-[70vh] w-full max-w-7xl p-6 md:p-10">
      <section className="rounded-4xl p-6 shadow-xl md:p-10 md:shadow-2xl">
        <FAQs />
      </section>
    </main>
  );
}
