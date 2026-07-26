import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import { processTicketEmailJob } from "@/lib/tickets/processTicketEmailJob";
import {
  addOneCalendarMonth,
  createMidtransSignature,
  isSuccessfulMidtransPayment,
  mapMidtransPaymentStatus,
  secureHexEqual,
} from "@/lib/tickets/paymentSecurity";
import { logAdminTicketActivation } from "@/lib/tickets/logAdminTicketActivation";

export const runtime = "nodejs";

type MidtransNotification = {
  order_id?: string;
  status_code?: string;
  gross_amount?: string;
  signature_key?: string;

  transaction_status?: string;
  fraud_status?: string;
  payment_type?: string;
  transaction_id?: string;

  transaction_time?: string;
  settlement_time?: string;

  [key: string]: unknown;
};

type PaymentRow = {
  id: string;
  order_id: string;
  status: string;

  amount: number;
  gross_amount: number | null;

  buyer_name: string | null;
  buyers_email: string | null;

  ticket_code: string | null;
  qr_token: string | null;
  issuance_source: string;
  issued_by: string | null;
  visiting_purpose: string;
  permit_documents: unknown[];
  paid_at: string | null;
  expires_at: string | null;

  ticket_email_status: "not_sent" | "sending" | "sent" | "failed";
};

function getServerKey() {
  const serverKey = process.env.MIDTRANS_SERVER_KEY?.trim();

  if (!serverKey) {
    throw new Error("MIDTRANS_SERVER_KEY belum dikonfigurasi.");
  }

  return serverKey;
}

/*
 * Adds one calendar month without allowing dates such
 * as January 31 to overflow unexpectedly into March.
 */
function jsonResponse(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
  });
}

export async function POST(request: Request) {
  try {
    const notification = (await request.json()) as MidtransNotification;

    const orderId = notification.order_id?.trim();

    const statusCode = notification.status_code?.trim();

    const grossAmount = notification.gross_amount?.trim();

    const receivedSignature = notification.signature_key?.trim();

    const transactionStatus = notification.transaction_status?.trim();

    if (
      !orderId ||
      !statusCode ||
      !grossAmount ||
      !receivedSignature ||
      !transactionStatus
    ) {
      return jsonResponse(
        {
          message: "Notifikasi Midtrans tidak lengkap.",
        },
        400,
      );
    }

    /*
     * =====================================================
     * 1. Verify Midtrans signature
     * =====================================================
     */

    const expectedSignature = createMidtransSignature(
      orderId,
      statusCode,
      grossAmount,
      getServerKey(),
    );

    if (!secureHexEqual(receivedSignature, expectedSignature)) {
      console.error("Invalid Midtrans signature:", orderId);

      return jsonResponse(
        {
          message: "Signature notifikasi tidak valid.",
        },
        403,
      );
    }

    /*
     * =====================================================
     * 2. Load the prepared booking
     * =====================================================
     */

    let { data: paymentData, error: paymentError } = await supabaseAdmin
      .from("payments")
      .select(
        `
          id,
          order_id,
          status,
          amount,
          gross_amount,
          buyer_name,
          buyers_email,
          ticket_code,
          qr_token,
          issuance_source,
          issued_by,
          visiting_purpose,
          permit_documents,
          paid_at,
          expires_at,
          ticket_email_status
        `,
      )
      .eq("order_id", orderId)
      .maybeSingle();

    /*
     * Backward compatibility for admin Payment Link transactions created
     * before admin checkout was moved to Snap. Midtrans appended a numeric
     * timestamp to the stored order ID when it created the actual purchase.
     */
    if (!paymentData && !paymentError) {
      const legacyOrderId = orderId.replace(/-\d{10,13}$/, "");
      if (legacyOrderId !== orderId) {
        const legacyResult = await supabaseAdmin
          .from("payments")
          .select(
            `
              id, order_id, status, amount, gross_amount, buyer_name,
              buyers_email, ticket_code, qr_token, issuance_source, issued_by,
              visiting_purpose, permit_documents, paid_at, expires_at,
              ticket_email_status
            `,
          )
          .eq("order_id", legacyOrderId)
          .eq("issuance_source", "admin_manual")
          .maybeSingle();
        paymentData = legacyResult.data;
        paymentError = legacyResult.error;
      }
    }

    if (paymentError) {
      console.error("Payment lookup failed:", paymentError);

      return jsonResponse(
        {
          message: "Booking belum dapat dimuat.",
        },
        500,
      );
    }

    if (!paymentData) {
      return jsonResponse(
        {
          message: "Booking tidak ditemukan.",
        },
        404,
      );
    }

    const payment = { ...paymentData, order_id: orderId } as PaymentRow;

    /*
     * =====================================================
     * 3. Verify notification amount
     * =====================================================
     */

    const storedAmount = Number(payment.gross_amount ?? payment.amount);

    const notifiedAmount = Number(grossAmount);

    if (
      !Number.isFinite(notifiedAmount) ||
      Math.round(notifiedAmount) !== storedAmount
    ) {
      console.error("Midtrans amount mismatch:", {
        orderId,
        storedAmount,
        notifiedAmount,
      });

      return jsonResponse(
        {
          message: "Jumlah pembayaran tidak sesuai.",
        },
        409,
      );
    }

    const newStatus = mapMidtransPaymentStatus(
      transactionStatus,
      notification.fraud_status,
    );

    const now = new Date().toISOString();

    /*
     * =====================================================
     * 4. Process non-paid notifications
     * =====================================================
     */

    if (!isSuccessfulMidtransPayment(notification)) {
      /*
       * Do not allow a delayed pending/error notification
       * to downgrade an already-paid transaction.
       *
       * A refund is a valid later transition and should
       * still be recorded.
       */
      const isLateDowngrade =
        payment.status === "paid" &&
        ["pending", "challenge", "failed", "expired", "cancelled"].includes(
          newStatus,
        );

      if (isLateDowngrade) {
        return jsonResponse({
          received: true,
          ignored: true,
          status: payment.status,
        });
      }

      const { error: statusUpdateError } = await supabaseAdmin
        .from("payments")
        .update({
          order_id: orderId,
          status: newStatus,

          payment_type: notification.payment_type || null,

          transaction_id: notification.transaction_id || null,

          raw_notification: notification,

          updated_at: now,
        })
        .eq("id", payment.id);

      if (statusUpdateError) {
        console.error("Payment status update failed:", statusUpdateError);

        return jsonResponse(
          {
            message: "Status pembayaran belum dapat diperbarui.",
          },
          500,
        );
      }

      return jsonResponse({
        received: true,
        status: newStatus,
      });
    }

    /*
     * =====================================================
     * 5. Activate the paid ticket
     * =====================================================
     */

    const paidAt = payment.paid_at || now;

    const expiresAt =
      payment.expires_at || addOneCalendarMonth(new Date(paidAt)).toISOString();

    const { error: activateError } = await supabaseAdmin
      .from("payments")
      .update({
        order_id: orderId,
        status: "paid",

        payment_type: notification.payment_type || null,

        transaction_id: notification.transaction_id || null,

        paid_at: paidAt,
        expires_at: expiresAt,

        raw_notification: notification,

        updated_at: now,
      })
      .eq("id", payment.id);

    if (activateError) {
      console.error("Ticket activation failed:", activateError);

      return jsonResponse(
        {
          message: "Tiket belum dapat diaktifkan.",
        },
        500,
      );
    }

    /*
     * =====================================================
     * 6. Claim the ticket-email job
     * =====================================================
     *
     * Only rows with not_sent or failed can become sending.
     * A duplicate webhook will therefore not send another
     * copy after the email has already been sent.
     */

    const emailJobResult = await processTicketEmailJob({
      payment,
      ticketCode: payment.ticket_code!,
      qrToken: payment.qr_token!,
      paidAt,
      expiresAt,
      claimStatuses: ["not_sent", "failed"],
      logContext: "midtrans notification",
    });

    if (!emailJobResult.claimed) {
      return jsonResponse({
        received: true,
        status: "paid",
        emailStatus: payment.ticket_email_status,
      });
    }

    if (emailJobResult.sent) {
      return jsonResponse({
        received: true,
        status: "paid",
        emailStatus: "sent",
      });
    }

    try {
      await logAdminTicketActivation({
        payment,
        paymentType: notification.payment_type || null,
        transactionId: notification.transaction_id || null,
        activatedBy: "midtrans_notification",
      });
    } catch (activationLogError) {
      console.error(
        "Admin ticket activation audit failed:",
        activationLogError,
      );
    }

    /*
     * Payment processing is complete at this point. Email delivery and audit
     * logging are downstream fulfillment concerns and must never make a
     * successfully settled payment appear unsuccessful to Midtrans or users.
     * Failed email delivery remains recorded for independent retry.
     */
    return jsonResponse({
      received: true,
      status: "paid",
      emailStatus: "failed",
      fulfillmentPending: true,
    });
  } catch (error) {
    console.error("Unexpected Midtrans webhook error:", error);

    return jsonResponse(
      {
        message:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan pada webhook.",
      },
      500,
    );
  }
}
