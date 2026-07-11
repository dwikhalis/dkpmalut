// app/components/MidtransPayButton.tsx

"use client";

import { useState } from "react";

declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        options?: {
          onSuccess?: (result: unknown) => void;
          onPending?: (result: unknown) => void;
          onError?: (result: unknown) => void;
          onClose?: () => void;
        },
      ) => void;
    };
  }
}

interface Props {
  userId?: string | null;
  itemId?: string;
  itemName: string;
  amount: number;
  customerName?: string;
  customerEmail?: string;
}

export default function MidtransPayButton({
  userId,
  itemId,
  itemName,
  amount,
  customerName,
  customerEmail,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handlePay = async () => {
    try {
      setLoading(true);
      setMsg(null);

      const response = await fetch("/api/midtrans/create-transaction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          itemId,
          itemName,
          amount,
          customerName,
          customerEmail,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create payment");
      }

      if (!window.snap) {
        throw new Error("Midtrans Snap is not loaded yet");
      }

      window.snap.pay(data.token, {
        onSuccess: () => {
          setMsg("Pembayaran berhasil. Status akan segera diperbarui.");
        },
        onPending: () => {
          setMsg("Pembayaran masih pending. Silakan selesaikan pembayaran.");
        },
        onError: () => {
          setMsg("Pembayaran gagal.");
        },
        onClose: () => {
          setMsg("Popup pembayaran ditutup.");
        },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unexpected error";

      setMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handlePay}
        disabled={loading}
        className="rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-60"
      >
        {loading ? "Memproses..." : `Bayar Rp${amount.toLocaleString("id-ID")}`}
      </button>

      {msg && <p className="mt-2 text-sm">{msg}</p>}
    </div>
  );
}
