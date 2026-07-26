import crypto from "node:crypto";

import { NextResponse } from "next/server";

import { enforceRateLimit, rejectOversizedBody } from "@/lib/security/request";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import { isSuccessfulMidtransPayment } from "@/lib/tickets/paymentSecurity";

export const runtime = "nodejs";

type ResetBody = {
  orderId?: unknown;
  publicStatusToken?: unknown;
  mode?: unknown;
};
type MidtransResult = {
  status_code?: string;
  status_message?: string;
  transaction_status?: string;
  fraud_status?: string;
  error_messages?: string[];
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function apiBase() {
  return process.env.MIDTRANS_IS_PRODUCTION === "true"
    ? "https://api.midtrans.com"
    : "https://api.sandbox.midtrans.com";
}

function snapBase() {
  return process.env.MIDTRANS_IS_PRODUCTION === "true"
    ? "https://app.midtrans.com"
    : "https://app.sandbox.midtrans.com";
}

function serverKey() {
  const key = process.env.MIDTRANS_SERVER_KEY?.trim();
  if (!key) throw new Error("MIDTRANS_SERVER_KEY belum dikonfigurasi.");
  return key;
}

function basicAuthorization() {
  return `Basic ${Buffer.from(`${serverKey()}:`).toString("base64")}`;
}

async function midtransRequest(url: string, authorization: string) {
  const response = await fetch(url, {
    method: "POST",
    headers: { Accept: "application/json", Authorization: authorization },
    cache: "no-store",
  });
  const result = (await response.json().catch(() => ({}))) as MidtransResult;
  return { response, result };
}

export async function POST(request: Request) {
  try {
    const oversized = rejectOversizedBody(request, 8 * 1024);
    if (oversized) return oversized;

    const limited = await enforceRateLimit({
      request,
      scope: "midtrans-reset",
      limit: 5,
      windowSeconds: 600,
    });
    if (limited) return limited;

    const body = (await request.json()) as ResetBody;
    const orderId = text(body.orderId);
    const publicStatusToken = text(body.publicStatusToken);
    const cancelBooking = body.mode === "cancel-booking";
    if (!orderId || !publicStatusToken) {
      return NextResponse.json({ message: "Data booking tidak lengkap." }, { status: 400 });
    }

    const { data: payment, error } = await supabaseAdmin
      .from("payments")
      .select("id, order_id, status, snap_token, metadata")
      .eq("order_id", orderId)
      .eq("public_status_token", publicStatusToken)
      .maybeSingle();

    if (error || !payment) {
      return NextResponse.json({ message: "Booking tidak ditemukan." }, { status: 404 });
    }
    if (payment.status !== "pending") {
      return NextResponse.json(
        { message: "Metode pembayaran tidak dapat diubah untuk transaksi ini." },
        { status: 409 },
      );
    }

    const statusResponse = await fetch(
      `${apiBase()}/v2/${encodeURIComponent(orderId)}/status`,
      { headers: { Accept: "application/json", Authorization: basicAuthorization() }, cache: "no-store" },
    );
    const status = (await statusResponse.json().catch(() => ({}))) as MidtransResult;

    if (statusResponse.ok && isSuccessfulMidtransPayment(status)) {
      return NextResponse.json(
        { message: "Pembayaran sudah berhasil dan tidak dapat diganti." },
        { status: 409 },
      );
    }

    if (
      statusResponse.ok &&
      ["pending", "capture", "authorize"].includes(
        status.transaction_status ?? "",
      )
    ) {
      const cancellation = await midtransRequest(
        `${apiBase()}/v2/${encodeURIComponent(orderId)}/cancel`,
        basicAuthorization(),
      );
      if (!cancellation.response.ok || cancellation.result.status_code !== "200") {
        return NextResponse.json(
          { message: cancellation.result.status_message || "Transaksi lama belum dapat dibatalkan." },
          { status: 409 },
        );
      }
    } else if (
      !statusResponse.ok &&
      statusResponse.status === 404 &&
      payment.snap_token
    ) {
      const cancellation = await midtransRequest(
        `${snapBase()}/snap/v1/transactions/${encodeURIComponent(payment.snap_token)}/cancel`,
        serverKey(),
      );
      const alreadyCancelled = cancellation.result.error_messages?.some((message) =>
        message.toLowerCase().includes("already canceled"),
      );
      if (!cancellation.response.ok && !alreadyCancelled) {
        return NextResponse.json(
          { message: cancellation.result.error_messages?.[0] || "Sesi pembayaran lama belum dapat dibatalkan." },
          { status: 409 },
        );
      }
    } else if (!statusResponse.ok) {
      return NextResponse.json(
        { message: status.status_message || "Status transaksi lama belum dapat diperiksa." },
        { status: 502 },
      );
    }

    if (cancelBooking) {
      const { data: deletedPayment, error: deleteError } = await supabaseAdmin
        .from("payments")
        .delete()
        .eq("id", payment.id)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();

      if (deleteError || !deletedPayment) {
        return NextResponse.json(
          { message: "Pesanan tidak dapat dibatalkan karena statusnya telah berubah." },
          { status: deleteError ? 500 : 409 },
        );
      }

      return NextResponse.json({ cancelled: true });
    }

    const newOrderId = `${orderId.split("-R")[0]}-R${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const { error: updateError } = await supabaseAdmin
      .from("payments")
      .update({
        order_id: newOrderId,
        snap_token: null,
        snap_redirect_url: null,
        payment_type: null,
        transaction_id: null,
        raw_notification: null,
        updated_at: new Date().toISOString(),
        metadata: {
          ...(payment.metadata ?? {}),
          previous_midtrans_order_id: orderId,
          payment_method_reset_at: new Date().toISOString(),
        },
      })
      .eq("id", payment.id)
      .eq("status", "pending");

    if (updateError) {
      return NextResponse.json({ message: "Booking belum dapat diperbarui." }, { status: 500 });
    }

    return NextResponse.json({ orderId: newOrderId });
  } catch (error) {
    console.error("Midtrans transaction reset failed:", error);
    return NextResponse.json({ message: "Metode pembayaran belum dapat diganti." }, { status: 500 });
  }
}
