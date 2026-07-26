import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import { generateTicketPdf } from "@/lib/tickets/generateTicketPdf";

export const runtime = "nodejs";

export async function GET(
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
        id, order_id, buyer_name, status, ticket_code, qr_token, paid_at,
        expires_at, issuance_source
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
      { message: "PDF is available after successful payment." },
      { status: 409 },
    );
  }

  const [visitorsResult, areasResult] = await Promise.all([
    supabaseAdmin
      .from("ticket_visitors")
      .select("visitor_name, visitor_number")
      .eq("payment_id", id)
      .order("visitor_number", { ascending: true }),
    supabaseAdmin
      .from("payment_conservation_areas")
      .select("area_name_snapshot")
      .eq("payment_id", id),
  ]);

  if (visitorsResult.error || areasResult.error) {
    return NextResponse.json(
      {
        message:
          visitorsResult.error?.message ||
          areasResult.error?.message ||
          "Ticket details could not be loaded.",
      },
      { status: 500 },
    );
  }

  const baseUrl = (
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    new URL(request.url).origin
  ).replace(/\/+$/, "");
  const pdf = await generateTicketPdf({
    orderId: payment.order_id,
    buyerName: payment.buyer_name || "Visitor",
    ticketCode: payment.ticket_code,
    visitorNames: (visitorsResult.data ?? []).map((row) => row.visitor_name),
    conservationAreas: (areasResult.data ?? []).map(
      (row) => row.area_name_snapshot,
    ),
    paidAt: payment.paid_at,
    expiresAt: payment.expires_at,
    ticketUrl: `${baseUrl}/ticket/verify/${encodeURIComponent(payment.qr_token)}`,
  });

  await supabaseAdmin.from("activity_logs").insert({
    actor_id: admin.id,
    action: "admin_ticket_pdf_downloaded",
    entity_type: "payment",
    entity_id: payment.id,
    metadata: { order_id: payment.order_id },
  });

  const safeOrderId = payment.order_id.replace(/[^a-zA-Z0-9_-]/g, "-");
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="ticket-${safeOrderId}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
