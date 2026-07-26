import "server-only";

import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import { isTicketCode } from "@/lib/tickets/ticketIdentifiers";

export type TicketLookupMethod = "qr" | "manual";

export class TicketValidationError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function normalizeQrToken(value: string) {
  try {
    const url = new URL(value);
    return url.pathname.split("/").filter(Boolean).pop()?.trim() || "";
  } catch {
    return value.trim();
  }
}

export async function validateAndConsumeTicket({
  credential,
  method,
  scannerUserId,
}: {
  credential: string;
  method: TicketLookupMethod;
  scannerUserId: string;
}) {
  const normalized =
    method === "manual"
      ? credential.trim().toUpperCase()
      : normalizeQrToken(credential);

  if (!normalized) {
    throw new TicketValidationError("Ticket credential is required", 400);
  }

  if (method === "manual" && !isTicketCode(normalized)) {
    throw new TicketValidationError(
      "Format Ticket Code harus MALUT-XXXX-XXXX",
      400,
    );
  }

  const lookupColumn = method === "manual" ? "ticket_code" : "qr_token";
  const { data: ticket, error } = await supabaseAdmin
    .from("payments")
    .select("*")
    .eq(lookupColumn, normalized)
    .maybeSingle();

  if (error) throw new TicketValidationError("Ticket lookup failed", 500);
  if (!ticket) throw new TicketValidationError("Ticket not found", 404);

  const now = new Date();
  const expiresAt = ticket.expires_at ? new Date(ticket.expires_at) : null;
  let ticketStatus: "Active" | "Expired" | "Unpaid" | "Already Scanned";

  if (ticket.status !== "paid") {
    ticketStatus = "Unpaid";
  } else if (!expiresAt || expiresAt < now) {
    ticketStatus = "Expired";
  } else if (ticket.scanned === "scanned") {
    ticketStatus = "Already Scanned";
  } else {
    const timestamp = now.toISOString();
    const { data: consumed, error: consumeError } = await supabaseAdmin
      .from("payments")
      .update({
        scanned: "scanned",
        scanned_at: timestamp,
        scanned_by: scannerUserId,
        updated_at: timestamp,
      })
      .eq("id", ticket.id)
      .or("scanned.is.null,scanned.neq.scanned")
      .select("id")
      .maybeSingle();

    if (consumeError) {
      throw new TicketValidationError("Ticket could not be validated", 500);
    }

    ticketStatus = consumed ? "Active" : "Already Scanned";
  }

  const [visitorResult, areaResult] = await Promise.all([
    supabaseAdmin
      .from("ticket_visitors")
      .select("visitor_name, country")
      .eq("payment_id", ticket.id)
      .order("visitor_number", { ascending: true }),
    supabaseAdmin
      .from("payment_conservation_areas")
      .select("area_name_snapshot")
      .eq("payment_id", ticket.id),
  ]);

  if (visitorResult.error || areaResult.error) {
    throw new TicketValidationError(
      "Ticket details could not be loaded",
      500,
    );
  }

  const visitors = visitorResult.data ?? [];
  return {
    ticketStatus,
    ticket: {
      id: ticket.id,
      orderId: ticket.order_id,
      ticketCode: ticket.ticket_code,
      customerName: ticket.buyer_name || ticket.customer_name || "",
      customerEmail: ticket.buyers_email || ticket.customer_email || "",
      ticketCount: ticket.visitor_count || ticket.ticket_count || 0,
      visitorNames: visitors.map((visitor) => visitor.visitor_name),
      nationality: [
        ...new Set(visitors.map((visitor) => visitor.country).filter(Boolean)),
      ].join(", "),
      selectedZones:
        areaResult.data?.map((area) => area.area_name_snapshot) ?? [],
      useOwnBoat: Boolean(ticket.brings_boat ?? ticket.use_own_boat),
      boatName: ticket.boat_name,
      amount: ticket.gross_amount ?? ticket.amount,
      paymentStatus: ticket.status,
      scanned:
        ticketStatus === "Active" ? "scanned" : ticket.scanned || "not scanned",
      paidAt: ticket.paid_at,
      expiresAt: ticket.expires_at,
    },
  };
}
