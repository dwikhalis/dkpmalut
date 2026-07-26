"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLocaleStore } from "@/app/Stores/localeStore";
import { getAppComponentConfig } from "@/lib/supabase/supabaseHelper";
import AccordionToggleIcon from "../AccordionToggleIcon";

type AppLabels = Record<string, string>;

const fallbackByLocale: Record<"id" | "en", AppLabels> = {
  id: {
    secsix_eyebrow: "Panduan Pengunjung",
    secsix_title: "Pertanyaan yang Sering Diajukan",
    secsix_subtitle:
      "Temukan jawaban singkat mengenai layanan, tiket, dan kawasan konservasi.",
    secsix_question_1: "Bagaimana cara membeli tiket kawasan konservasi?",
    secsix_answer_1:
      "Pilih kawasan tujuan melalui halaman pembelian tiket, lengkapi data pengunjung, lalu selesaikan pembayaran melalui metode yang tersedia.",
    secsix_question_2: "Di mana saya dapat melihat tiket yang telah dibeli?",
    secsix_answer_2:
      "Pengguna yang telah masuk dapat melihat tiket pada menu Tiket Saya. Pembeli tanpa akun dapat menggunakan halaman verifikasi tiket.",
    secsix_question_3: "Apakah tiket dapat digunakan lebih dari satu kali?",
    secsix_answer_3:
      "Tidak. Setiap tiket memiliki kode unik dan status pemindaian yang digunakan untuk memvalidasi satu kunjungan sesuai ketentuan tiket.",
    secsix_question_4: "Apakah saya harus memiliki akun untuk membeli tiket?",
    secsix_answer_4:
      "Tidak. Anda dapat membeli tiket sebagai tamu. Namun, pengguna yang masuk ke akun dapat melihat riwayat dan tiket aktif melalui menu Tiket Saya.",
    secsix_question_5: "Metode pembayaran apa yang tersedia?",
    secsix_answer_5:
      "Pembayaran diproses melalui Midtrans. Pilihan metode yang tampil pada jendela pembayaran mengikuti metode yang sedang tersedia di Midtrans.",
    secsix_question_6: "Apa yang terjadi jika jendela pembayaran saya tutup?",
    secsix_answer_6:
      "Anda akan kembali ke halaman checkout dan dapat membuka pembayaran kembali tanpa langsung kehilangan detail pemesanan yang sedang diproses.",
    secsix_question_7:
      "Bisakah data tiket diubah setelah saya menekan Pembayaran?",
    secsix_answer_7:
      "Gunakan tombol Sebelumnya pada tahap checkout terakhir. Sistem akan meminta konfirmasi pembatalan pesanan sebelum Anda kembali mengubah detail tiket.",
    secsix_question_8:
      "Pembayaran berhasil tetapi tiket PDF tidak masuk ke email. Apa yang harus dilakukan?",
    secsix_answer_8:
      "Tiket tetap dapat dilihat melalui menu Tiket Saya jika Anda sudah masuk, atau melalui halaman verifikasi tiket bagi pembeli tamu. Simpan ID Pesanan untuk keperluan bantuan.",
    secsix_question_9: "Bagaimana tiket diperiksa di lokasi?",
    secsix_answer_9:
      "Petugas akan memindai kode QR pada tiket. Setelah berhasil dipindai, status penggunaan tiket akan berubah. Jangan membagikan QR tiket kepada orang lain.",
    secsix_question_10: "Sampai kapan tiket dapat digunakan?",
    secsix_answer_10:
      "Tanggal berlaku ditampilkan pada detail tiket. Gunakan tiket sebelum batas waktu tersebut dan periksa kembali ketentuan kunjungan untuk kawasan tujuan.",
    secsix_question_11: "Di mana saya dapat melihat harga dan biaya tambahan?",
    secsix_answer_11:
      "Harga tiket, jumlah pengunjung, pajak, dan komponen biaya aktif lainnya ditampilkan pada rincian transaksi sebelum pembayaran dikonfirmasi.",
    secsix_question_12:
      "Apakah satu tiket berlaku untuk semua kawasan konservasi?",
    secsix_answer_12:
      "Tidak. Tiket diterbitkan untuk kawasan konservasi yang dipilih saat pemesanan. Pastikan nama tujuan pada ringkasan transaksi dan tiket sudah benar.",
    secsix_question_13:
      "Di mana saya dapat mempelajari zonasi serta kegiatan yang boleh dan tidak boleh dilakukan?",
    secsix_answer_13:
      "Buka halaman Kawasan Konservasi, pilih kawasan tujuan, lalu lihat informasi zonasi, ketentuan kegiatan, peta interaktif, dan dokumen peraturan yang tersedia.",
    secsix_question_14: "Bagaimana data pribadi saya digunakan?",
    secsix_answer_14:
      "Data digunakan untuk menyediakan layanan, memproses transaksi, menerbitkan tiket, serta memenuhi kebutuhan administrasi dan keamanan. Rincian lengkap tersedia pada halaman Kebijakan Privasi.",
    secsix_question_15:
      "Bagaimana cara meminta bantuan terkait tiket atau pembayaran?",
    secsix_answer_15:
      "Gunakan halaman Kontak dan sertakan ID Pesanan serta penjelasan masalah. Jangan mengirim kata sandi, kode OTP, atau membagikan QR tiket secara terbuka.",
  },
  en: {
    secsix_eyebrow: "Visitor Guide",
    secsix_title: "Frequently Asked Questions",
    secsix_subtitle:
      "Find quick answers about services, tickets, and conservation areas.",
    secsix_question_1: "How do I purchase a conservation area ticket?",
    secsix_answer_1:
      "Select your destination on the ticket purchase page, complete the visitor information, and finish payment using an available method.",
    secsix_question_2: "Where can I find my purchased tickets?",
    secsix_answer_2:
      "Signed-in users can find tickets under My Tickets. Guest buyers can use the ticket verification page.",
    secsix_question_3: "Can a ticket be used more than once?",
    secsix_answer_3:
      "No. Every ticket has a unique code and scan status used to validate one visit according to the ticket terms.",
    secsix_question_4: "Do I need an account to purchase a ticket?",
    secsix_answer_4:
      "No. You can purchase as a guest. However, signed-in users can view their history and active tickets through My Tickets.",
    secsix_question_5: "Which payment methods are available?",
    secsix_answer_5:
      "Payments are processed through Midtrans. The options shown in the payment window depend on the methods currently available from Midtrans.",
    secsix_question_6: "What happens if I close the payment window?",
    secsix_answer_6:
      "You will return to checkout and can reopen payment without immediately losing the booking details currently being processed.",
    secsix_question_7: "Can I change ticket details after selecting Payment?",
    secsix_answer_7:
      "Use the Previous button on the final checkout step. The system will ask you to confirm cancellation of the order before returning to edit the ticket details.",
    secsix_question_8:
      "My payment succeeded, but the ticket PDF did not arrive by email. What should I do?",
    secsix_answer_8:
      "The ticket remains available under My Tickets for signed-in users or through ticket verification for guest buyers. Keep your Order ID when requesting assistance.",
    secsix_question_9: "How is my ticket checked at the destination?",
    secsix_answer_9:
      "An officer scans the QR code on your ticket. After a successful scan, its usage status changes. Do not share your ticket QR code with anyone else.",
    secsix_question_10: "How long is my ticket valid?",
    secsix_answer_10:
      "The validity date is shown in the ticket details. Use the ticket before that deadline and review the visitor rules for your destination.",
    secsix_question_11: "Where can I see ticket prices and additional charges?",
    secsix_answer_11:
      "The ticket price, visitor count, taxes, and other active charge components are displayed in the transaction details before payment is confirmed.",
    secsix_question_12: "Is one ticket valid for every conservation area?",
    secsix_answer_12:
      "No. A ticket is issued for the conservation area selected during checkout. Confirm that the destination in the transaction summary and ticket is correct.",
    secsix_question_13:
      "Where can I learn about zoning and permitted or prohibited activities?",
    secsix_answer_13:
      "Open Conservation Areas, select your destination, and review its zoning information, activity rules, interactive map, and available regulatory documents.",
    secsix_question_14: "How is my personal information used?",
    secsix_answer_14:
      "Information is used to provide services, process transactions, issue tickets, and meet administrative and security needs. Full details are available in the Privacy Policy.",
    secsix_question_15: "How can I request help with a ticket or payment?",
    secsix_answer_15:
      "Use the Contact page and include your Order ID and a description of the issue. Never send passwords or OTP codes, and do not share your ticket QR code publicly.",
  },
};

export function FAQs({ limit }: { limit?: number }) {
  const locale = useLocaleStore((state) => state.locale);
  const fallback = fallbackByLocale[locale];
  const [labels, setLabels] = useState<AppLabels>(fallback);
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});
  const [hasCmsRows, setHasCmsRows] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;

    void getAppComponentConfig("secsix", locale).then((config) => {
      if (!mounted) return;

      const hasRows = Object.keys(config.values).length > 0;
      setHasCmsRows(hasRows);
      setLabels(hasRows ? { ...fallback, ...config.values } : fallback);
      setVisibility(config.visibility);
      setOpenIndex(null);
    });

    return () => {
      mounted = false;
    };
  }, [fallback, locale]);

  const questions = useMemo(() => {
    return Array.from({ length: 15 }, (_, position) => {
      const index = position + 1;
      const questionTarget = `secsix_question_${index}`;
      const answerTarget = `secsix_answer_${index}`;

      return {
        index,
        question: labels[questionTarget]?.trim() || "",
        answer: labels[answerTarget]?.trim() || "",
        active:
          !hasCmsRows ||
          (visibility[questionTarget] !== false &&
            visibility[answerTarget] !== false),
      };
    }).filter((item) => item.active && item.question && item.answer);
  }, [hasCmsRows, labels, visibility]);

  if (questions.length === 0) return null;

  const displayedQuestions =
    typeof limit === "number" ? questions.slice(0, limit) : questions;
  const showTitle = !hasCmsRows || visibility.secsix_title !== false;
  const showSubtitle = !hasCmsRows || visibility.secsix_subtitle !== false;
  const showEyebrow = !hasCmsRows || visibility.secsix_eyebrow !== false;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      {(showEyebrow || showTitle || showSubtitle) && (
        <div className="flex flex-col gap-3 text-center">
          {showEyebrow && (
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-300">
              {labels.secsix_eyebrow || fallback.secsix_eyebrow}
            </p>
          )}
          {showTitle && <h2>{labels.secsix_title || fallback.secsix_title}</h2>}
          {showSubtitle &&
            (labels.secsix_subtitle || fallback.secsix_subtitle) && (
              <p className="text-base leading-relaxed md:text-lg">
                {labels.secsix_subtitle || fallback.secsix_subtitle}
              </p>
            )}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {displayedQuestions.map((item) => {
          const open = openIndex === item.index;
          const contentId = `faq-answer-${item.index}`;

          return (
            <article
              key={item.index}
              className="overflow-hidden rounded-xl bg-white shadow-md"
            >
              <button
                type="button"
                onClick={(event) => {
                  setOpenIndex(open ? null : item.index);
                  if (!open && window.innerWidth < 1024) {
                    const trigger = event.currentTarget;
                    window.setTimeout(() => trigger.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
                  }
                }}
                aria-expanded={open}
                aria-controls={contentId}
                className={`scroll-mt-24 flex w-full items-center justify-between gap-4 p-4 text-left font-bold text-slate-800 md:p-5 ${
                  open ? "border-b border-slate-200 bg-sky-50" : ""
                }`}
              >
                <span>{item.question}</span>
                <AccordionToggleIcon open={open} size="sm" />
              </button>

              <div
                id={contentId}
                className={`${open ? "visible" : "invisible h-0 pointer-events-none overflow-hidden"} whitespace-pre-line ${open ? "p-4 md:p-5" : "px-4 md:px-5"} text-sm leading-relaxed text-slate-700 md:text-base`}
              >
                {item.answer}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export default function SectionFAQ() {
  const locale = useLocaleStore((state) => state.locale);

  return (
    <section className="mx-6 my-12 rounded-4xl bg-gradient-to-br from-sky-950 via-blue-950 to-cyan-950 p-6 text-white shadow-2xl ring-1 ring-sky-800 md:mx-12 md:p-12 2xl:mx-auto 2xl:max-w-7xl">
      <FAQs limit={5} />

      <div className="mt-6 flex justify-center">
        <Link
          href="/faq"
          className="rounded-xl bg-sky-700 px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-sky-800"
        >
          {locale === "id" ? "Lainnya" : "More"}
        </Link>
      </div>
    </section>
  );
}
