import { after, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import {
  addOneCalendarMonth,
  mapMidtransPaymentStatus,
} from "@/lib/tickets/paymentSecurity";
import { processTicketEmailJob } from "@/lib/tickets/processTicketEmailJob";
import { logAdminTicketActivation } from "@/lib/tickets/logAdminTicketActivation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MidtransStatus = {
  status_code?: string;
  status_message?: string;
  order_id?: string;
  gross_amount?: string;
  transaction_status?: string;
  fraud_status?: string;
  payment_type?: string;
  transaction_id?: string;
  settlement_time?: string;
  transaction_time?: string;
  [key: string]: unknown;
};

type PaymentLinkDetails = {
  purchases?: Array<{ order_id?: string; created_at?: string }>;
};

function noStoreJson(data: Record<string, unknown>, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
  });
}

function getMidtransApiBaseUrl() {
  return process.env.MIDTRANS_IS_PRODUCTION === "true"
    ? "https://api.midtrans.com"
    : "https://api.sandbox.midtrans.com";
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return noStoreJson({ message: "Forbidden" }, 403);
  }

  const serverKey = process.env.MIDTRANS_SERVER_KEY?.trim();
  if (!serverKey) {
    return noStoreJson(
      { message: "MIDTRANS_SERVER_KEY belum dikonfigurasi." },
      500,
    );
  }

  const { id } = await context.params;
  const { data, error } = await supabaseAdmin
    .from("payments")
    .select(
      `
        id, order_id, status, amount, gross_amount, buyer_name, buyers_email,
        ticket_email_status, ticket_code, qr_token, issuance_source, issued_by,
        visiting_purpose, permit_documents, paid_at, expires_at
      `,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return noStoreJson({ message: error.message }, 500);
  }
  if (!data) {
    return noStoreJson({ message: "Tiket tidak ditemukan." }, 404);
  }

  const authorization = `Basic ${Buffer.from(`${serverKey}:`).toString("base64")}`;
  const fetchStatus = (orderId: string) =>
    fetch(`${getMidtransApiBaseUrl()}/v2/${encodeURIComponent(orderId)}/status`, {
      headers: {
        Accept: "application/json",
        Authorization: authorization,
      },
      cache: "no-store",
    });

  let midtransOrderId = data.order_id;
  let response = await fetchStatus(midtransOrderId);

  /*
   * Legacy admin tickets used Midtrans Payment Link. Its actual purchase
   * transaction ID is `${storedOrderId}-${timestamp}`. Recover that child ID
   * from the link details so old records can still be reconciled.
   */
  if (response.status === 404 && data.issuance_source === "admin_manual") {
    const linkResponse = await fetch(
      `${getMidtransApiBaseUrl()}/v1/payment-links/${encodeURIComponent(data.order_id)}`,
      {
        headers: { Accept: "application/json", Authorization: authorization },
        cache: "no-store",
      },
    );
    if (linkResponse.ok) {
      const link = (await linkResponse.json()) as PaymentLinkDetails;
      const purchase = [...(link.purchases ?? [])]
        .filter((item) => item.order_id)
        .sort((left, right) =>
          (right.created_at || "").localeCompare(left.created_at || ""),
        )[0];
      if (purchase?.order_id) {
        midtransOrderId = purchase.order_id;
        response = await fetchStatus(midtransOrderId);
      }
    }
  }

  const midtrans = (await response.json()) as MidtransStatus;

  if (!response.ok || !midtrans.transaction_status) {
    console.error("Admin Midtrans status refresh failed:", {
      orderId: data.order_id,
      status: response.status,
      midtrans,
    });
    return noStoreJson(
      {
        message:
          midtrans.status_message ||
          "Status pembayaran tidak dapat diperiksa di Midtrans.",
      },
      response.status === 404 ? 404 : 502,
    );
  }

  if (midtrans.order_id && midtrans.order_id !== midtransOrderId) {
    return noStoreJson({ message: "Order ID Midtrans tidak cocok." }, 409);
  }

  const paymentStatus = mapMidtransPaymentStatus(
    midtrans.transaction_status,
    midtrans.fraud_status,
  );
  const storedAmount = Number(data.gross_amount ?? data.amount);
  const midtransAmount = Number(midtrans.gross_amount);

  if (
    paymentStatus === "paid" &&
    (!Number.isFinite(midtransAmount) ||
      Math.round(midtransAmount) !== storedAmount)
  ) {
    console.error("Admin Midtrans refresh amount mismatch:", {
      orderId: data.order_id,
      storedAmount,
      midtransAmount,
    });
    return noStoreJson(
      { message: "Nominal pembayaran Midtrans tidak cocok dengan tiket." },
      409,
    );
  }

  const now = new Date().toISOString();
  const paidAt =
    data.paid_at ||
    (midtrans.settlement_time
      ? new Date(midtrans.settlement_time).toISOString()
      : midtrans.transaction_time
        ? new Date(midtrans.transaction_time).toISOString()
        : now);
  const expiresAt =
    data.expires_at || addOneCalendarMonth(new Date(paidAt)).toISOString();
  const update =
    paymentStatus === "paid"
      ? {
          order_id: midtransOrderId,
          status: "paid",
          payment_type: midtrans.payment_type || null,
          transaction_id: midtrans.transaction_id || null,
          paid_at: paidAt,
          expires_at: expiresAt,
          raw_notification: midtrans,
          updated_at: now,
        }
      : {
          order_id: midtransOrderId,
          status: paymentStatus,
          raw_notification: midtrans,
          updated_at: now,
        };

  const { error: updateError } = await supabaseAdmin
    .from("payments")
    .update(update)
    .eq("id", data.id);

  if (updateError) {
    return noStoreJson({ message: updateError.message }, 500);
  }

  if (paymentStatus === "paid" && data.status !== "paid") {
    const reconciledPayment = { ...data, order_id: midtransOrderId };
    try {
      await logAdminTicketActivation({
        payment: reconciledPayment,
        paymentType: midtrans.payment_type || null,
        transactionId: midtrans.transaction_id || null,
        activatedBy: "admin_status_refresh",
      });
    } catch (auditError) {
      console.error("Admin status refresh audit log failed:", auditError);
    }

    if (data.ticket_code && data.qr_token) {
      after(async () => {
        await processTicketEmailJob({
          payment: reconciledPayment,
          ticketCode: data.ticket_code!,
          qrToken: data.qr_token!,
          paidAt,
          expiresAt,
          claimStatuses: ["not_sent", "failed"],
          logContext: "admin payment refresh",
        });
      });
    }
  }

  return noStoreJson({
    status: paymentStatus,
    transactionStatus: midtrans.transaction_status,
    message:
      paymentStatus === "paid"
        ? "Pembayaran telah dikonfirmasi oleh Midtrans."
        : `Status Midtrans diperbarui: ${paymentStatus}.`,
  });
}
