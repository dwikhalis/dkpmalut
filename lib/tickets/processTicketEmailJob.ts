import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import { sendTicketEmail } from "@/lib/tickets/sendTicketEmail";

type TicketEmailStatus = "not_sent" | "sending" | "sent" | "failed";

export type TicketEmailPayment = {
  id: string;
  order_id: string;
  buyer_name: string | null;
  buyers_email: string | null;
  ticket_email_status: TicketEmailStatus;
};

type TicketEmailJobOptions = {
  payment: TicketEmailPayment;
  ticketCode: string;
  qrToken: string;
  paidAt: string;
  expiresAt: string;
  claimStatuses?: TicketEmailStatus[];
  logContext?: string;
};

type TicketVisitorRow = {
  visitor_name: string;
};

type TicketAreaRow = {
  area_name_snapshot: string;
};

type TicketEmailJobResult = {
  claimed: boolean;
  sent: boolean;
  emailStatus: TicketEmailStatus;
  error?: string;
};

async function markTicketEmailFailed(paymentId: string, error: string) {
  await supabaseAdmin
    .from("payments")
    .update({
      ticket_email_status: "failed",
      ticket_email_error: error,
      updated_at: new Date().toISOString(),
    })
    .eq("id", paymentId);
}

export async function processTicketEmailJob({
  payment,
  ticketCode,
  qrToken,
  paidAt,
  expiresAt,
  claimStatuses = ["not_sent", "failed"],
  logContext = "ticket email job",
}: TicketEmailJobOptions): Promise<TicketEmailJobResult> {
  const now = new Date().toISOString();

  const { data: claimedPayment, error: claimError } = await supabaseAdmin
    .from("payments")
    .update({
      ticket_email_status: "sending",
      ticket_email_error: null,
      updated_at: now,
    })
    .eq("id", payment.id)
    .in("ticket_email_status", claimStatuses)
    .select("id")
    .maybeSingle();

  if (claimError) {
    console.error(`Ticket email claim failed (${logContext}):`, {
      orderId: payment.order_id,
      error: claimError,
    });

    return {
      claimed: false,
      sent: false,
      emailStatus: payment.ticket_email_status,
      error: claimError.message,
    };
  }

  if (!claimedPayment) {
    return {
      claimed: false,
      sent: false,
      emailStatus: payment.ticket_email_status,
    };
  }

  if (!payment.buyer_name || !payment.buyers_email) {
    const error = "Nama atau email pembeli tidak ditemukan.";

    await markTicketEmailFailed(payment.id, error);

    return {
      claimed: true,
      sent: false,
      emailStatus: "failed",
      error,
    };
  }

  const [visitorResult, areaResult] = await Promise.all([
    supabaseAdmin
      .from("ticket_visitors")
      .select("visitor_name")
      .eq("payment_id", payment.id)
      .order("visitor_number", {
        ascending: true,
      }),
    supabaseAdmin
      .from("payment_conservation_areas")
      .select("area_name_snapshot")
      .eq("payment_id", payment.id),
  ]);

  if (visitorResult.error || areaResult.error) {
    const error =
      visitorResult.error?.message ||
      areaResult.error?.message ||
      "Detail tiket tidak dapat dimuat.";

    console.error(`Ticket details lookup failed (${logContext}):`, {
      orderId: payment.order_id,
      visitorError: visitorResult.error,
      areaError: areaResult.error,
    });

    await markTicketEmailFailed(payment.id, error);

    return {
      claimed: true,
      sent: false,
      emailStatus: "failed",
      error,
    };
  }

  const visitorNames =
    ((visitorResult.data as TicketVisitorRow[] | null) ?? []).map(
      (visitor) => visitor.visitor_name,
    );

  const conservationAreas =
    ((areaResult.data as TicketAreaRow[] | null) ?? []).map(
      (area) => area.area_name_snapshot,
    );

  try {
    const emailResult = await sendTicketEmail({
      orderId: payment.order_id,
      buyerName: payment.buyer_name,
      buyerEmail: payment.buyers_email,
      ticketCode,
      qrToken,
      visitorNames,
      conservationAreas,
      paidAt,
      expiresAt,
    });

    await supabaseAdmin
      .from("payments")
      .update({
        ticket_email_status: "sent",
        ticket_email_sent_at: new Date().toISOString(),
        ticket_email_message_id: emailResult.messageId,
        ticket_email_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.id);

    return {
      claimed: true,
      sent: true,
      emailStatus: "sent",
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Email tiket gagal dikirim.";

    console.error(`Ticket email delivery failed (${logContext}):`, {
      orderId: payment.order_id,
      error,
    });

    await markTicketEmailFailed(payment.id, message);

    return {
      claimed: true,
      sent: false,
      emailStatus: "failed",
      error: message,
    };
  }
}
