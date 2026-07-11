export default function page() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <h1 className="text-2xl font-semibold">Pembayaran Diproses</h1>
      <p className="mt-3 max-w-md">
        Terima kasih. Pembayaran Anda sedang diverifikasi. Status akan
        diperbarui secara otomatis setelah sistem menerima konfirmasi dari
        Midtrans.
      </p>
    </main>
  );
}
