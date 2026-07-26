import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import { processTicketEmailJob } from "@/lib/tickets/processTicketEmailJob";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const { data: payment, error } = await supabaseAdmin
    .from("payments")
    .select(
      `
        id, order_id, buyer_name, buyers_email, status, ticket_email_status,
        ticket_code, qr_token, paid_at, expires_at, issuance_source
      `,
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !payment) {
    return NextResponse.json(
      { message: error?.message || "Ticket not found." },
      { status: error ? 500 : 404 },
    );
  }

  if (
    payment.status !== "paid" ||
    !payment.ticket_code ||
    !payment.qr_token ||
    !payment.paid_at ||
    !payment.expires_at
  ) {
    return NextResponse.json(
      { message: "Only an active paid ticket can be sent." },
      { status: 409 },
    );
  }

  if (!["failed", "not_sent"].includes(payment.ticket_email_status)) {
    return NextResponse.json(
      {
        message:
          payment.ticket_email_status === "sent"
            ? "The ticket has already been sent."
            : "Ticket delivery is already in progress.",
      },
      { status: 409 },
    );
  }

  const result = await processTicketEmailJob({
    payment,
    ticketCode: payment.ticket_code,
    qrToken: payment.qr_token,
    paidAt: payment.paid_at,
    expiresAt: payment.expires_at,
    claimStatuses: ["failed", "not_sent"],
    logContext: "admin manual resend",
  });

  if (!result.sent) {
    return NextResponse.json(
      { message: result.error || "Ticket email could not be sent." },
      { status: 502 },
    );
  }

  await supabaseAdmin.from("activity_logs").insert({
    actor_id: admin.id,
    action: "admin_ticket_email_resent",
    entity_type: "payment",
    entity_id: payment.id,
    metadata: {
      order_id: payment.order_id,
      recipient_email: payment.buyers_email,
    },
  });

  return NextResponse.json({ sent: true, emailStatus: "sent" });
}
