"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useRateLimitCountdown } from "@/app/hooks/useRateLimitCountdown";

type MidtransResult = {
  order_id?: string;
  transaction_id?: string;
  transaction_status?: string;
  payment_type?: string;
  gross_amount?: string;
  status_code?: string;
  status_message?: string;
};

declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        options?: {
          onSuccess?: (result: MidtransResult) => void;
          onPending?: (result: MidtransResult) => void;
          onError?: (result: MidtransResult) => void;
          onClose?: () => void;
        },
      ) => void;
    };
  }
}

type CreateTransactionResponse = {
  token?: string;
  redirectUrl?: string;
  message?: string;
  detail?: {
    status_message?: string;
    error_messages?: string[];
  };
};

interface Props {
  orderId: string;
  publicStatusToken: string;

  /*
   * Use an existing token when the booking has already
   * prepared a Midtrans transaction.
   */
  snapToken?: string | null;

  /*
   * Allows TicketForm to save a newly returned token
   * into Zustand.
   */
  onSnapTokenReceived?: (token: string) => void;
  onTransactionReset?: (orderId: string) => void;

  disabled?: boolean;
}

export default function MidtransPaymentButton({
  orderId,
  publicStatusToken,
  snapToken = null,
  onSnapTokenReceived,
  onTransactionReset,
  disabled = false,
}: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { captureRateLimit, rateLimitMessage } = useRateLimitCountdown();

  const openFinishPage = () => {
    router.push(
      `/payment/finish?token=${encodeURIComponent(publicStatusToken)}`,
    );
  };

  const getSnapToken = async () => {
    /*
     * Reuse the token stored in Zustand when available.
     */
    if (snapToken) {
      return snapToken;
    }

    const response = await fetch("/api/midtrans/create-transaction", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        orderId,
        publicStatusToken,
      }),
    });

    const result = (await response.json()) as CreateTransactionResponse;

    if (!response.ok) {
      const providerMessage =
        result.detail?.error_messages?.filter(Boolean).join(" ") ||
        result.detail?.status_message;

      captureRateLimit(
        response,
        result.message || "Batas permintaan telah tercapai.",
      );

      throw new Error(
        providerMessage || result.message || "Pembayaran belum dapat dibuat.",
      );
    }

    if (!result.token) {
      throw new Error("Token pembayaran Midtrans tidak ditemukan.");
    }

    onSnapTokenReceived?.(result.token);

    return result.token;
  };

  const handlePay = async () => {
    if (loading || disabled) return;

    setLoading(true);
    setMessage(null);

    try {
      if (!orderId) {
        throw new Error("Booking ID belum tersedia.");
      }

      if (!publicStatusToken) {
        throw new Error("Token status booking belum tersedia.");
      }

      if (!window.snap) {
        throw new Error(
          "Midtrans Snap belum dimuat. Silakan muat ulang halaman.",
        );
      }

      const token = await getSnapToken();

      window.snap.pay(token, {
        onSuccess: (result) => {
          console.info("Midtrans Snap success:", result);

          setLoading(false);

          /*
           * Do not update payments.status here.
           * The finish page will wait for the webhook.
           */
          openFinishPage();
        },

        onPending: (result) => {
          console.info("Midtrans Snap pending:", result);

          setLoading(false);

          /*
           * The finish page can show that payment
           * is still waiting for completion.
           */
          openFinishPage();
        },

        onError: (result) => {
          console.error("Midtrans Snap error:", result);

          setLoading(false);

          setMessage("Pembayaran gagal diproses. Silakan mencoba kembali.");
        },

        onClose: () => {
          setLoading(false);
          router.replace("/payment?step=4");
        },
      });
    } catch (error) {
      console.error("Midtrans payment error:", error);

      setLoading(false);

      setMessage(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat membuka pembayaran.",
      );
    }
  };

  const handleChangePaymentMethod = async () => {
    if (loading) return;

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/midtrans/reset-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, publicStatusToken }),
      });
      const result = (await response.json()) as {
        orderId?: string;
        message?: string;
      };

      if (!response.ok || !result.orderId) {
        captureRateLimit(
          response,
          result.message || "Batas permintaan telah tercapai.",
        );
        throw new Error(
          result.message || "Metode pembayaran belum dapat diganti.",
        );
      }

      onTransactionReset?.(result.orderId);
      setMessage("Silakan pilih metode pembayaran yang baru.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Metode pembayaran belum dapat diganti.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={handlePay}
        disabled={disabled || loading || !orderId || !publicStatusToken}
        className="w-full rounded-xl bg-sky-800 px-6 py-3 font-medium text-white shadow-sm transition hover:bg-sky-900 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-600 disabled:shadow-none"
      >
        {loading ? "Membuka Pembayaran..." : "Pembayaran"}
      </button>

      {snapToken && (
        <button
          type="button"
          onClick={handleChangePaymentMethod}
          disabled={loading}
          className="mt-3 w-full rounded-xl border border-sky-800 px-6 py-3 font-medium text-sky-800 transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Ganti Metode Pembayaran
        </button>
      )}

      {message && (
        <p
          role="status"
          className="mt-3 rounded-xl bg-sky-50 p-3 text-center text-sm leading-6 text-stone-700"
        >
          {rateLimitMessage || message}
        </p>
      )}
    </div>
  );
}
