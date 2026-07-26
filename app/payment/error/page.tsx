import NavigationButton from "@/app/components/NavigationButton";

export default function PaymentErrorPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-50 via-stone-50 to-sky-100 px-4 py-12">
      <section className="w-full max-w-xl rounded-2xl border border-stone-100 bg-white p-7 text-center shadow-xl md:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-3xl font-bold text-red-700">
          !
        </div>

        <h1 className="mt-6 text-2xl font-semibold text-stone-900">
          Pembayaran Gagal
        </h1>

        <p className="mt-4 leading-7 text-stone-600">
          Terjadi masalah saat memproses pembayaran. Silakan coba kembali atau
          gunakan metode pembayaran lain.
        </p>

        <NavigationButton
          href="/payment"
          className="mt-7 w-full rounded-xl bg-sky-800 px-7 py-3 font-medium text-white transition hover:bg-sky-900"
        >
          Coba Lagi
        </NavigationButton>
      </section>
    </main>
  );
}
