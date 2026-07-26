import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type SearchParamValue = string | string[] | undefined;

type PageProps = {
  searchParams: Promise<Record<string, SearchParamValue>>;
};

type ConfirmationReason =
  | "expired"
  | "invalid"
  | "missing"
  | "configuration"
  | "verification_failed";

function getStringParam(value: SearchParamValue): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function getConfirmationReason(
  code?: string,
  message?: string,
): ConfirmationReason {
  const errorText = `${code || ""} ${message || ""}`.toLowerCase();

  if (errorText.includes("otp_expired") || errorText.includes("expired")) {
    return "expired";
  }

  if (
    errorText.includes("invalid") ||
    errorText.includes("not found") ||
    errorText.includes("already used")
  ) {
    return "invalid";
  }

  return "verification_failed";
}

function getErrorContent(reason: ConfirmationReason) {
  switch (reason) {
    case "expired":
      return {
        title: "Tautan Sudah Kadaluarsa",
        description:
          "Tautan konfirmasi sudah kedaluwarsa atau telah digunakan sebelumnya. Silakan lakukan pendaftaran kembali untuk mendapatkan tautan baru.",
      };

    case "invalid":
      return {
        title: "Tautan Tidak Valid",
        description:
          "Tautan konfirmasi tidak valid, tidak lengkap, atau sudah pernah digunakan.",
      };

    case "missing":
      return {
        title: "Data Konfirmasi Tidak Ditemukan",
        description:
          "Tautan yang dibuka tidak memiliki informasi konfirmasi yang diperlukan. Pastikan Anda membuka tautan lengkap dari email.",
      };

    case "configuration":
      return {
        title: "Konfigurasi Sistem Bermasalah",
        description:
          "Konfirmasi belum dapat diproses karena konfigurasi autentikasi belum lengkap.",
      };

    default:
      return {
        title: "Konfirmasi Tidak Berhasil",
        description:
          "Terjadi masalah saat mengonfirmasi alamat email. Silakan lakukan pendaftaran kembali atau coba gunakan tautan konfirmasi terbaru.",
      };
  }
}

export default async function ConfirmationPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const status = getStringParam(params.status);
  const tokenHash = getStringParam(params.token_hash);
  const verificationType = getStringParam(params.type);
  const resultReason = getStringParam(params.reason) as
    | ConfirmationReason
    | undefined;

  /*
   * First visit from the email confirmation button.
   */
  if (!status) {
    if (!tokenHash || verificationType !== "email") {
      redirect("/masuk/confirm?status=error&reason=missing");
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      redirect("/masuk/confirm?status=error&reason=configuration");
    }

    /*
     * No persistent browser session is created here.
     * The email is verified, but the user must still log in
     * manually through /masuk.
     */
    const confirmationClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    const { error } = await confirmationClient.auth.verifyOtp({
      token_hash: tokenHash,
      type: "email",
    });

    if (error) {
      console.error("Email verification failed:", error);

      const reason = getConfirmationReason(error.code, error.message);

      redirect(`/masuk/confirm?status=error&reason=${reason}`);
    }

    /*
     * At this point:
     * - auth.users.email_confirmed_at is populated
     * - the database trigger updates
     *   public.users.email_confirmed = true
     *
     * Redirect removes the one-time token from the URL.
     */
    redirect("/masuk/confirm?status=success");
  }

  const isSuccess = status === "success";

  const reason: ConfirmationReason =
    resultReason &&
    [
      "expired",
      "invalid",
      "missing",
      "configuration",
      "verification_failed",
    ].includes(resultReason)
      ? resultReason
      : "verification_failed";

  const errorContent = getErrorContent(reason);

  return (
    <main className="flex min-h-screen items-center justify-center bg-transparent px-4 py-10">
      <section className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-md">
        <div
          className={`px-6 py-8 text-center ${
            isSuccess ? "bg-green-700" : "bg-red-700"
          }`}
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/15 text-3xl font-bold text-white">
            {isSuccess ? "✓" : "!"}
          </div>

          <h1 className="mt-4 text-2xl font-semibold text-white">
            {isSuccess ? "Email Berhasil Dikonfirmasi" : errorContent.title}
          </h1>
        </div>

        <div className="p-6 text-center sm:p-8">
          {isSuccess ? (
            <>
              <p className="text-sm leading-7 text-stone-600">
                Alamat email Anda telah berhasil dikonfirmasi dan akun Anda
                sudah aktif.
              </p>

              <p className="mt-3 text-sm leading-7 text-stone-600">
                Silakan masuk menggunakan email dan password yang telah Anda
                daftarkan.
              </p>

              <Link
                href="/masuk"
                className="mt-7 inline-flex w-full items-center justify-center rounded-xl bg-sky-800 px-5 py-3 font-medium text-white transition hover:bg-sky-900"
              >
                Masuk ke Akun
              </Link>
            </>
          ) : (
            <>
              <p className="text-sm leading-7 text-stone-600">
                {errorContent.description}
              </p>

              <Link
                href="/daftar"
                className="mt-7 inline-flex w-full items-center justify-center rounded-xl bg-sky-800 px-5 py-3 font-medium text-white transition hover:bg-sky-900"
              >
                Kembali ke Pendaftaran
              </Link>

              <Link
                href="/masuk"
                className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-stone-300 px-5 py-3 font-medium text-stone-700 transition hover:bg-stone-50"
              >
                Ke Halaman Masuk
              </Link>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
