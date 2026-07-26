import "server-only";

import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";

export async function logAdminTicketActivation({
  payment,
  paymentType,
  transactionId,
  activatedBy,
}: {
  payment: {
    id: string;
    order_id: string;
    issuance_source: string;
    issued_by: string | null;
    visiting_purpose: string;
    permit_documents: unknown[];
  };
  paymentType: string | null;
  transactionId: string | null;
  activatedBy: string;
}) {
  if (payment.issuance_source !== "admin_manual" || !payment.issued_by) {
    return;
  }

  const { data: existing } = await supabaseAdmin
    .from("activity_logs")
    .select("id")
    .eq("action", "admin_ticket_activated")
    .eq("entity_type", "payment")
    .eq("entity_id", payment.id)
    .limit(1)
    .maybeSingle();

  if (existing) return;

  const { error } = await supabaseAdmin.from("activity_logs").insert({
    actor_id: payment.issued_by,
    action: "admin_ticket_activated",
    entity_type: "payment",
    entity_id: payment.id,
    metadata: {
      order_id: payment.order_id,
      visiting_purpose: payment.visiting_purpose,
      permit_document_count: Array.isArray(payment.permit_documents)
        ? payment.permit_documents.length
        : 0,
      payment_type: paymentType,
      transaction_id: transactionId,
      activated_by: activatedBy,
    },
  });

  if (error) throw error;
}
