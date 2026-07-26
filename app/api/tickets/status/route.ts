import { after, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import { processTicketEmailJob } from "@/lib/tickets/processTicketEmailJob";
import { enforceRateLimit } from "@/lib/security/request";
import { logAdminTicketActivation } from "@/lib/tickets/logAdminTicketActivation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PaymentStatusRow = {
  id: string;
  order_id: string;
  status: string;
  amount: number;
  gross_amount: number | null;
  buyer_name: string | null;
  ticket_email_status: "not_sent" | "sending" | "sent" | "failed";
  buyers_email: string | null;
  ticket_email_error: string | null;
  ticket_code: string | null;
  qr_token: string | null;
  issuance_source: string;
  issued_by: string | null;
  visiting_purpose: string;
  permit_documents: unknown[];
  paid_at: string | null;
  expires_at: string | null;
};

type MidtransStatusResponse = {
  order_id?: string;
  status_code?: string;
  gross_amount?: string;
  transaction_status?: string;
  fraud_status?: string;
  payment_type?: string;
  transaction_id?: string;
  transaction_time?: string;
  settlement_time?: string;
  [key: string]: unknown;
};

function getMidtransApiBaseUrl() {
  const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";

  return isProduction
    ? "https://api.midtrans.com"
    : "https://api.sandbox.midtrans.com";
}

function getMidtransAuthHeader() {
  const serverKey = process.env.MIDTRANS_SERVER_KEY?.trim();

  if (!serverKey) {
    throw new Error("MIDTRANS_SERVER_KEY belum dikonfigurasi.");
  }

  return `Basic ${Buffer.from(`${serverKey}:`).toString("base64")}`;
}

function isSuccessfulMidtransStatus(status: MidtransStatusResponse) {
  if (status.status_code !== "200") {
    return false;
  }

  if (status.transaction_status === "settlement") {
    return true;
  }

  return (
    status.transaction_status === "capture" && status.fraud_status === "accept"
  );
}

function addOneCalendarMonth(sourceDate: Date) {
  const result = new Date(sourceDate);
  const originalDate = result.getUTCDate();

  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + 1);

  const lastDateOfTargetMonth = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();

  result.setUTCDate(Math.min(originalDate, lastDateOfTargetMonth));

  return result;
}

async function fetchMidtransStatus(orderId: string) {
  const response = await fetch(
    `${getMidtransApiBaseUrl()}/v2/${encodeURIComponent(orderId)}/status`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: getMidtransAuthHeader(),
      },
      cache: "no-store",
    },
  );

  const result = (await response.json()) as MidtransStatusResponse;

  if (!response.ok) {
    console.error("Midtrans status lookup failed:", {
      orderId,
      status: response.status,
      result,
    });

    return null;
  }

  return result;
}

async function reconcilePaidPayment(payment: PaymentStatusRow) {
  if (payment.status === "paid") {
    return;
  }

  const midtransStatus = await fetchMidtransStatus(payment.order_id);

  if (!midtransStatus || !isSuccessfulMidtransStatus(midtransStatus)) {
    return;
  }

  const storedAmount = Number(payment.gross_amount ?? payment.amount);
  const notifiedAmount = Number(midtransStatus.gross_amount);

  if (
    !Number.isFinite(notifiedAmount) ||
    Math.round(notifiedAmount) !== storedAmount
  ) {
    console.error("Midtrans status amount mismatch:", {
      orderId: payment.order_id,
      storedAmount,
      notifiedAmount,
    });

    return;
  }

  const now = new Date().toISOString();
  const paidAt =
    payment.paid_at ||
    (midtransStatus.settlement_time
      ? new Date(midtransStatus.settlement_time).toISOString()
      : now);
  const expiresAt =
    payment.expires_at || addOneCalendarMonth(new Date(paidAt)).toISOString();
  const { error: activateError } = await supabaseAdmin
    .from("payments")
    .update({
      status: "paid",
      payment_type: midtransStatus.payment_type || null,
      transaction_id: midtransStatus.transaction_id || null,
      paid_at: paidAt,
      expires_at: expiresAt,
      raw_notification: midtransStatus,
      updated_at: now,
    })
    .eq("id", payment.id);

  if (activateError) {
    console.error("Ticket activation from status reconciliation failed:", {
      orderId: payment.order_id,
      error: activateError,
    });

    return;
  }

  try {
    await logAdminTicketActivation({
      payment,
      paymentType: midtransStatus.payment_type || null,
      transactionId: midtransStatus.transaction_id || null,
      activatedBy: "status_reconciliation",
    });
  } catch (error) {
    console.error("Status reconciliation audit log failed:", error);
  }

  after(async () => {
    await processTicketEmailJob({
      payment,
      ticketCode: payment.ticket_code!,
      qrToken: payment.qr_token!,
      paidAt,
      expiresAt,
      claimStatuses: ["not_sent", "failed"],
      logContext: "status reconciliation",
    });
  });
}

function maskEmail(email: string | null) {
  if (!email) return null;

  const [localPart, domain] = email.split("@");

  if (!localPart || !domain) {
    return null;
  }

  const visibleCharacters =
    localPart.length <= 2 ? localPart.slice(0, 1) : localPart.slice(0, 2);

  return `${visibleCharacters}${"*".repeat(
    Math.max(localPart.length - visibleCharacters.length, 3),
  )}@${domain}`;
}

function noStoreJson(data: Record<string, unknown>, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

function getTicketUrl(payment: PaymentStatusRow) {
  if (payment.status !== "paid" || !payment.qr_token) {
    return null;
  }

  return `/ticket/verify/${encodeURIComponent(payment.qr_token)}`;
}

export async function GET(request: Request) {
  try {
    const rateLimited = await enforceRateLimit({
      request,
      scope: "ticket-status",
      limit: 60,
      windowSeconds: 600,
    });
    if (rateLimited) return rateLimited;

    const url = new URL(request.url);
    const token = url.searchParams.get("token")?.split("?")[0].trim();

    if (!token) {
      return noStoreJson(
        {
          message: "Token status booking tidak ditemukan.",
        },
        400,
      );
    }

    const { data, error } = await supabaseAdmin
      .from("payments")
      .select(
        `
            id,
            order_id,
            status,
            amount,
            gross_amount,
            buyer_name,
            ticket_email_status,
            buyers_email,
            ticket_email_error,
            ticket_code,
            qr_token,
            issuance_source,
            issued_by,
            visiting_purpose,
            permit_documents,
            paid_at,
            expires_at
          `,
      )
      .eq("public_status_token", token)
      .maybeSingle();

    if (error) {
      console.error("Ticket status lookup failed:", error);

      return noStoreJson(
        {
          message: "Status booking belum dapat dimuat.",
        },
        500,
      );
    }

    if (!data) {
      return noStoreJson(
        {
          message: "Booking tidak ditemukan.",
        },
        404,
      );
    }

    const payment = data as PaymentStatusRow;

    if (payment.status !== "paid" && payment.status !== "refunded") {
      await reconcilePaidPayment(payment);
    }

    const { data: refreshedData, error: refreshedError } = await supabaseAdmin
      .from("payments")
      .select(
        `
            order_id,
            status,
            ticket_email_status,
            buyers_email,
            ticket_email_error,
            ticket_code,
            qr_token
          `,
      )
      .eq("id", payment.id)
      .maybeSingle();

    if (refreshedError) {
      console.error("Ticket status refresh failed:", refreshedError);

      return noStoreJson(
        {
          message: "Status booking belum dapat dimuat.",
        },
        500,
      );
    }

    const refreshedPayment = (refreshedData || data) as PaymentStatusRow;

    return noStoreJson({
      orderId: refreshedPayment.order_id,
      paymentStatus: refreshedPayment.status,
      emailStatus: refreshedPayment.ticket_email_status,
      buyersEmailMasked: maskEmail(refreshedPayment.buyers_email),
      ticketCode: refreshedPayment.ticket_code,
      ticketUrl: getTicketUrl(refreshedPayment),

      /*
       * Do not expose internal SMTP errors publicly.
       */
      emailDeliveryFailed: refreshedPayment.ticket_email_status === "failed",
    });
  } catch (error) {
    console.error("Unexpected ticket status error:", error);

    return noStoreJson(
      {
        message: "Terjadi kesalahan saat memeriksa status booking.",
      },
      500,
    );
  }
}

export async function POST(request: Request) {
  try {
    const rateLimited = await enforceRateLimit({
      request,
      scope: "ticket-email-retry",
      limit: 3,
      windowSeconds: 600,
    });
    if (rateLimited) return rateLimited;

    const body = (await request.json()) as { token?: unknown };
    const token =
      typeof body.token === "string"
        ? body.token.split("?")[0].trim()
        : "";

    if (!token) {
      return noStoreJson({ message: "Token status booking tidak ditemukan." }, 400);
    }

    const { data, error } = await supabaseAdmin
      .from("payments")
      .select(
        `
          id, order_id, status, amount, gross_amount, buyer_name,
          ticket_email_status, buyers_email, ticket_email_error, ticket_code,
          qr_token, issuance_source, issued_by, visiting_purpose,
          permit_documents, paid_at, expires_at
        `,
      )
      .eq("public_status_token", token)
      .maybeSingle();

    if (error || !data) {
      return noStoreJson({ message: "Booking tidak ditemukan." }, 404);
    }

    const payment = data as PaymentStatusRow;
    if (
      payment.status !== "paid" ||
      !payment.ticket_code ||
      !payment.qr_token ||
      !payment.paid_at ||
      !payment.expires_at
    ) {
      return noStoreJson(
        { message: "Tiket belum siap untuk dikirim ulang." },
        409,
      );
    }

    if (payment.ticket_email_status === "sent") {
      return noStoreJson({ emailStatus: "sent" });
    }

    const result = await processTicketEmailJob({
      payment,
      ticketCode: payment.ticket_code,
      qrToken: payment.qr_token,
      paidAt: payment.paid_at,
      expiresAt: payment.expires_at,
      claimStatuses: ["not_sent", "failed"],
      logContext: "customer retry",
    });

    return noStoreJson({
      emailStatus: result.sent ? "sent" : result.emailStatus,
      message: result.sent
        ? "Email tiket berhasil dikirim."
        : "Email tiket belum berhasil dikirim. Silakan hubungi administrator.",
    });
  } catch (error) {
    console.error("Unexpected ticket email retry error:", error);
    return noStoreJson(
      { message: "Email tiket belum dapat dikirim ulang." },
      500,
    );
  }
}
