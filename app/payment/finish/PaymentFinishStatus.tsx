"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import SpinnerLoading from "@/app/components/SpinnerLoading";
import { useTicketStore } from "@/app/Stores/ticketCheckoutStore";
import { supabase } from "@/lib/supabase/supabaseClient";
import { useRateLimitCountdown } from "@/app/hooks/useRateLimitCountdown";

type TicketStatusResponse = {
  orderId?: string;
  paymentStatus?: string;

  emailStatus?: "not_sent" | "sending" | "sent" | "failed";

  buyersEmailMasked?: string | null;
  emailDeliveryFailed?: boolean;
  ticketUrl?: string | null;
  ticketCode?: string | null;

  message?: string;
};

type DisplayState =
  | "checking"
  | "pending"
  | "paid"
  | "payment_failed"
  | "invalid";

const POLLING_INTERVAL = 10_000;

export default function PaymentFinishStatus() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams<{ token?: string | string[] }>();

  const resetTicketStore = useTicketStore((state) => state.resetTicketStore);

  const pathToken = Array.isArray(params.token) ? params.token[0] : params.token;
  /*
   * Older Midtrans transactions used ?token=... as the finish callback.
   * Midtrans appends its own query string with another "?", which can produce
   * token=<uuid>?status_code=200. Strip that suffix while those transactions
   * remain in circulation; new callbacks keep the token in the URL path.
   */
  const token = (pathToken || searchParams.get("token") || "")
    .split("?")[0]
    .trim();

  const [result, setResult] = useState<TicketStatusResponse | null>(null);

  const [displayState, setDisplayState] = useState<DisplayState>("checking");

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryingEmail, setRetryingEmail] = useState(false);
  const { captureRateLimit, rateLimitMessage } = useRateLimitCountdown();

  const hasClearedCompletedCheckout = useRef(false);

  const resolveDisplayState = useCallback(
    (statusResult: TicketStatusResponse): DisplayState => {
      const paymentStatus = statusResult.paymentStatus;

      if (paymentStatus === "paid") {
        return "paid";
      }

      if (
        ["failed", "cancelled", "expired", "refunded"].includes(
          paymentStatus || "",
        )
      ) {
        return "payment_failed";
      }

      return "pending";
    },
    [],
  );

  const checkStatus = useCallback(async () => {
    if (!token) {
      setDisplayState("invalid");
      setErrorMessage("Token status booking tidak ditemukan.");
      return true;
    }

    try {
      const response = await fetch(
        `/api/tickets/status?token=${encodeURIComponent(token)}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

      const statusResult = (await response.json()) as TicketStatusResponse;

      if (!response.ok) {
        const limited = captureRateLimit(
          response,
          statusResult.message || "Batas permintaan telah tercapai.",
        );
        if (limited) {
          setErrorMessage(
            statusResult.message || "Batas permintaan telah tercapai.",
          );
          return true;
        }
        throw new Error(
          statusResult.message || "Status booking belum dapat diperiksa.",
        );
      }

      setResult(statusResult);

      const nextDisplayState = resolveDisplayState(statusResult);

      setDisplayState(nextDisplayState);
      setErrorMessage(null);

      /*
       * Return true when polling can stop.
       */
      if (nextDisplayState === "payment_failed") return true;
      if (nextDisplayState === "paid") {
        return ["sent", "failed"].includes(statusResult.emailStatus || "");
      }
      return false;
    } catch (error) {
      console.error("Failed to check ticket status:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Status booking belum dapat diperiksa.",
      );

      /*
       * Keep polling because the error may only
       * be temporary.
       */
      return false;
    }
  }, [token, resolveDisplayState, captureRateLimit]);

  useEffect(() => {
    let active = true;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      if (!active) return;

      const shouldStop = await checkStatus();

      if (!active || shouldStop) {
        return;
      }

      timeoutId = setTimeout(poll, POLLING_INTERVAL);
    };

    void poll();

    return () => {
      active = false;

      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [checkStatus]);

  useEffect(() => {
    if (
      result?.paymentStatus === "paid" &&
      !hasClearedCompletedCheckout.current
    ) {
      hasClearedCompletedCheckout.current = true;
      resetTicketStore();
    }
  }, [result?.paymentStatus, resetTicketStore]);

  const handleBuyAgain = () => {
    resetTicketStore();

    router.push("/payment?step=1");
  };

  const handleViewTicket = async (ticketUrl: string) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    router.push(session ? "/profile/tickets" : ticketUrl);
  };

  const retryTicketEmail = async () => {
    if (!token || retryingEmail) return;
    setRetryingEmail(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/tickets/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const retryResult = (await response.json()) as TicketStatusResponse;

      if (!response.ok) {
        const limited = captureRateLimit(
          response,
          retryResult.message || "Email tiket belum dapat dikirim ulang.",
        );
        if (limited) return;
        throw new Error(
          retryResult.message || "Email tiket belum dapat dikirim ulang.",
        );
      }

      setResult((current) =>
        current
          ? {
              ...current,
              emailStatus: retryResult.emailStatus || current.emailStatus,
            }
          : current,
      );

      if (retryResult.emailStatus !== "sent") {
        setErrorMessage(
          retryResult.message ||
            "Email tiket belum berhasil dikirim. Silakan hubungi administrator.",
        );
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Email tiket belum dapat dikirim ulang.",
      );
    } finally {
      setRetryingEmail(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-50 via-stone-50 to-sky-100 px-4 py-12">
      <div className="w-full max-w-xl rounded-2xl border border-stone-100 bg-white p-7 text-center shadow-xl md:p-10">
        {displayState === "checking" && (
          <>
            <LoadingIndicator />

            <h1 className="mt-6 text-2xl font-semibold text-stone-800">
              Memeriksa Pembayaran
            </h1>

            <p className="mt-4 leading-7 text-stone-600">
              Kami sedang memeriksa status pembayaran dan mempersiapkan tiket
              Anda.
            </p>

            <p className="mt-2 text-sm text-stone-500">
              Mohon jangan menutup halaman ini.
            </p>
          </>
        )}

        {displayState === "pending" && (
          <>
            <LoadingIndicator />

            <h1 className="mt-6 text-2xl font-semibold text-stone-800">
              Menunggu Konfirmasi Pembayaran
            </h1>

            <span className="mt-3 inline-flex rounded-full bg-amber-100 px-4 py-1.5 text-sm font-bold text-amber-700">
              Pending
            </span>

            <p className="mt-4 leading-7 text-stone-600">
              Midtrans sedang menyelesaikan konfirmasi pembayaran. Halaman ini
              akan memperbarui status secara otomatis.
            </p>

            {result?.orderId && <BookingId orderId={result.orderId} />}
          </>
        )}

        {displayState === "paid" && (
          <>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-50 text-4xl font-bold text-green-700">
              ✓
            </div>

            <h1 className="mt-6 text-2xl font-semibold text-stone-800">
              Pembayaran Berhasil
            </h1>

            <span className="mt-3 inline-flex rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-bold text-emerald-700">
              Paid
            </span>

            <p className="mt-4 leading-7 text-stone-600">
              Pembayaran telah berhasil diverifikasi dan tiket Anda sudah
              aktif.
            </p>

            {result?.orderId && <BookingId orderId={result.orderId} />}
            {result?.ticketCode && <TicketCode code={result.ticketCode} />}

            {result?.emailStatus === "sent" && (
              <div className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-700">
                Tiket PDF telah dikirim ke{" "}
                {result.buyersEmailMasked || "email pembeli"}. Periksa folder
                spam atau promosi jika belum terlihat.
              </div>
            )}

            {result?.emailStatus === "failed" && (
              <div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                Pengiriman email belum berhasil, tetapi pembayaran tetap
                berstatus Paid dan tiket tetap aktif.

                <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
                  <button
                    type="button"
                    disabled={retryingEmail}
                    onClick={() => void retryTicketEmail()}
                    className="rounded-lg bg-amber-600 px-4 py-2 font-semibold text-white hover:bg-amber-700 disabled:cursor-wait disabled:opacity-60"
                  >
                    {retryingEmail ? "Mengirim..." : "Coba Kirim Email Lagi"}
                  </button>
                  <Link
                    href="/kontak"
                    className="rounded-lg border border-amber-600 px-4 py-2 font-semibold text-amber-800 hover:bg-amber-100"
                  >
                    Hubungi Admin
                  </Link>
                </div>
              </div>
            )}

            {["not_sent", "sending"].includes(result?.emailStatus || "") && (
              <div className="mt-5 rounded-xl bg-sky-50 p-4 text-sm leading-6 text-sky-800">
                Tiket aktif. Email tiket sedang dipersiapkan untuk dikirim.
              </div>
            )}
          </>
        )}

        {displayState === "payment_failed" && (
          <>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-4xl font-bold text-red-700">
              ×
            </div>

            <h1 className="mt-6 text-2xl font-semibold text-stone-800">
              Pembayaran Tidak Berhasil
            </h1>

            <p className="mt-4 leading-7 text-stone-600">
              Pembayaran gagal, dibatalkan, kedaluwarsa, atau tidak dapat
              diproses.
            </p>

            {result?.orderId && <BookingId orderId={result.orderId} />}
          </>
        )}

        {displayState === "invalid" && (
          <>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-4xl font-bold text-red-700">
              ×
            </div>

            <h1 className="mt-6 text-2xl font-semibold text-stone-800">
              Status Booking Tidak Ditemukan
            </h1>

            <p className="mt-4 leading-7 text-stone-600">
              Tautan status pembayaran tidak valid atau sudah tidak tersedia.
            </p>
          </>
        )}

        {errorMessage && displayState !== "invalid" && (
          <div
            role="alert"
            className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700"
          >
            <p>{rateLimitMessage || errorMessage}</p>

            <button
              type="button"
              onClick={() => {
                setDisplayState("checking");
                setErrorMessage(null);
                void checkStatus();
              }}
              className="mt-3 font-semibold underline"
            >
              Periksa kembali
            </button>
          </div>
        )}

        {displayState !== "checking" &&
          displayState !== "pending" && (
            <div className="mt-8 border-t border-stone-200 pt-7">
              <div className="flex flex-col justify-center gap-3 sm:flex-row">
                {result?.ticketUrl ? (
                  <button
                    type="button"
                    onClick={() => {
                      void handleViewTicket(result.ticketUrl || "");
                    }}
                    className="w-full rounded-xl bg-sky-800 px-7 py-3 font-medium text-white transition hover:bg-sky-900"
                  >
                    Lihat Tiket
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleBuyAgain}
                    className="w-full rounded-xl bg-sky-800 px-7 py-3 font-medium text-white transition hover:bg-sky-900"
                  >
                    Beli Lagi
                  </button>
                )}
              </div>
            </div>
          )}
      </div>
    </main>
  );
}

function LoadingIndicator() {
  return (
    <div aria-label="Memuat" className="mx-auto flex justify-center">
      <SpinnerLoading size="sm" color="black" />
    </div>
  );
}

function BookingId({ orderId }: { orderId: string }) {
  return (
    <div className="mt-6 rounded-xl bg-stone-50 p-4 ring-1 ring-stone-200">
      <p className="text-sm text-stone-500">Booking ID</p>

      <p className="mt-1 break-all font-semibold text-stone-800">{orderId}</p>
    </div>
  );
}

function TicketCode({ code }: { code: string }) {
  return (
    <div className="mt-4 rounded-xl bg-sky-50 p-4 ring-1 ring-sky-200">
      <p className="text-sm text-stone-600">Ticket Code</p>
      <p className="mt-1 font-mono text-lg font-bold tracking-wide text-sky-900">
        {code}
      </p>
    </div>
  );
}
