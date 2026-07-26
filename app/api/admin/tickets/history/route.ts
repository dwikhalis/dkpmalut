import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";

export const dynamic = "force-dynamic";

type AreaRow = {
  payment_id: string;
  area_name_snapshot: string;
};

type VisitorRow = {
  payment_id: string;
  visitor_name: string;
};

type IssuerRow = {
  id: string;
  role: "admin" | "partner" | "user";
};

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from("payments")
    .select(
      `
        id, order_id, item_name, amount, gross_amount, status, scanned,
        ticket_code, visitor_count, buyer_name, buyers_email, paid_at,
        expires_at, created_at, visiting_purpose, permit_documents,
        payment_link_url, payment_link_sent_at, ticket_email_status,
        ticket_email_sent_at, ticket_email_error, issuance_source, issued_by
      `,
    )
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  const paymentIds = (data ?? []).map((row) => row.id);
  const issuerIds = [
    ...new Set(
      (data ?? [])
        .map((row) => row.issued_by)
        .filter((value): value is string => Boolean(value)),
    ),
  ];
  const [areasResult, visitorsResult, issuersResult] = paymentIds.length
    ? await Promise.all([
        supabaseAdmin
          .from("payment_conservation_areas")
          .select("payment_id, area_name_snapshot")
          .in("payment_id", paymentIds),
        supabaseAdmin
          .from("ticket_visitors")
          .select("payment_id, visitor_name, visitor_number")
          .in("payment_id", paymentIds)
          .order("visitor_number", { ascending: true }),
        issuerIds.length
          ? supabaseAdmin.from("users").select("id, role").in("id", issuerIds)
          : Promise.resolve({
              data: [] as IssuerRow[],
              error: null,
            }),
      ])
    : [
        { data: [] as AreaRow[], error: null },
        { data: [] as VisitorRow[], error: null },
        { data: [] as IssuerRow[], error: null },
      ];

  if (areasResult.error || visitorsResult.error || issuersResult.error) {
    return NextResponse.json(
      {
        message:
          areasResult.error?.message ||
          visitorsResult.error?.message ||
          issuersResult.error?.message ||
          "Ticket details could not be loaded.",
      },
      { status: 500 },
    );
  }

  const areasByPayment = ((areasResult.data as AreaRow[] | null) ?? []).reduce<
    Record<string, string[]>
  >((result, row) => {
    (result[row.payment_id] ??= []).push(row.area_name_snapshot);
    return result;
  }, {});
  const visitorsByPayment = (
    (visitorsResult.data as VisitorRow[] | null) ?? []
  ).reduce<Record<string, string[]>>((result, row) => {
    (result[row.payment_id] ??= []).push(row.visitor_name);
    return result;
  }, {});
  const roleByIssuer = ((issuersResult.data as IssuerRow[] | null) ?? []).reduce<
    Record<string, IssuerRow["role"]>
  >((result, row) => {
    result[row.id] = row.role;
    return result;
  }, {});

  const tickets = (data ?? []).map((row) => ({
    id: row.id,
    order_id: row.order_id,
    item_name: row.item_name || "Tiket Kawasan Konservasi",
    amount: Number(row.gross_amount ?? row.amount ?? 0),
    status: row.status,
    scanned: row.scanned || "unscanned",
    ticket_code: row.ticket_code,
    visitor_count: row.visitor_count ?? 0,
    visitor_names: visitorsByPayment[row.id] ?? [],
    selected_zones: areasByPayment[row.id] ?? [],
    customer_name: row.buyer_name || "",
    customer_email: row.buyers_email || "",
    paid_at: row.paid_at,
    expires_at: row.expires_at,
    created_at: row.created_at,
    visiting_purpose: row.visiting_purpose || "",
    permit_document_count: Array.isArray(row.permit_documents)
      ? row.permit_documents.length
      : 0,
    payment_link_url: row.payment_link_url,
    payment_link_sent_at: row.payment_link_sent_at,
    ticket_email_status: row.ticket_email_status || "not_sent",
    ticket_email_sent_at: row.ticket_email_sent_at,
    ticket_email_error: row.ticket_email_error,
    origin:
      row.issuance_source === "public_checkout"
        ? "user"
        : roleByIssuer[row.issued_by || ""] === "partner"
          ? "partner"
          : "admin",
  }));

  return NextResponse.json(
    { tickets },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } },
  );
}
