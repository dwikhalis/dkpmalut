import NavigationButton from "@/app/components/NavigationButton";

export default function PaymentUnfinishPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-50 via-stone-50 to-sky-100 px-4 py-12">
      <section className="w-full max-w-xl rounded-2xl border border-stone-100 bg-white p-7 text-center shadow-xl md:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-3xl font-bold text-amber-700">
          !
        </div>

        <h1 className="mt-6 text-2xl font-semibold text-stone-900">
          Pembayaran Belum Selesai
        </h1>

        <p className="mt-4 leading-7 text-stone-600">
          Anda belum menyelesaikan pembayaran. Silakan kembali ke halaman
          ticketing jika ingin mencoba lagi.
        </p>

        <NavigationButton
          href="/payment"
          className="mt-7 w-full rounded-xl bg-sky-800 px-7 py-3 font-medium text-white transition hover:bg-sky-900"
        >
          Lanjutkan Pembayaran
        </NavigationButton>
      </section>
    </main>
  );
}
