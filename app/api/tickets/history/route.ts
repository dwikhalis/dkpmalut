import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";

export const dynamic = "force-dynamic";

type PaymentHistoryRow = {
  id: string;
  order_id: string;
  item_name: string | null;
  amount: number | null;
  gross_amount: number | null;
  status: string;
  scanned: "unscanned" | "scanned" | null;
  ticket_code: string | null;
  qr_token: string | null;
  visitor_count: number | null;
  brings_boat: boolean | null;
  boat_name: string | null;
  buyer_name: string | null;
  buyers_email: string | null;
  paid_at: string | null;
  expires_at: string | null;
  created_at: string;
};

type PaymentAreaRow = {
  payment_id: string;
  area_name_snapshot: string;
};

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json(
        { message: "Missing auth token" },
        { status: 401 },
      );
    }

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from("payments")
      .select(
        `
        id,
        order_id,
        item_name,
        amount,
        gross_amount,
        status,
        scanned,
        ticket_code,
        qr_token,
        visitor_count,
        brings_boat,
        boat_name,
        buyer_name,
        buyers_email,
        paid_at,
        expires_at,
        created_at
      `,
      )
      .eq("buyers_email", user.email)
      .eq("status", "paid")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    const paymentRows = (data as PaymentHistoryRow[] | null) ?? [];
    const paymentIds = paymentRows.map((payment) => payment.id);
    const { data: areaData, error: areaError } = paymentIds.length
      ? await supabaseAdmin
          .from("payment_conservation_areas")
          .select("payment_id, area_name_snapshot")
          .in("payment_id", paymentIds)
      : { data: [], error: null };

    if (areaError) {
      return NextResponse.json({ message: areaError.message }, { status: 500 });
    }

    const zonesByPayment = ((areaData as PaymentAreaRow[] | null) ?? []).reduce<
      Record<string, string[]>
    >((zones, area) => {
      (zones[area.payment_id] ??= []).push(area.area_name_snapshot);
      return zones;
    }, {});

    const baseUrl = (
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      new URL(req.url).origin
    ).replace(/\/+$/, "");
    const payments = await Promise.all(
      paymentRows.map(async (payment) => ({
        id: payment.id,
        order_id: payment.order_id,
        item_name: payment.item_name || "Tiket Kawasan Konservasi",
        amount: Number(payment.gross_amount ?? payment.amount ?? 0),
        status: payment.status,
        scanned: payment.scanned || "unscanned",
        ticket_code: payment.ticket_code,
        qr_data_url: payment.qr_token
          ? await QRCode.toDataURL(
              `${baseUrl}/ticket/verify/${encodeURIComponent(payment.qr_token)}`,
              { margin: 2, width: 280 },
            )
          : null,
        ticket_count: payment.visitor_count ?? 0,
        visitor_names: [],
        nationality: "",
        selected_zones: zonesByPayment[payment.id] ?? [],
        use_own_boat: Boolean(payment.brings_boat),
        boat_name: payment.boat_name,
        customer_name: payment.buyer_name || "",
        customer_email: payment.buyers_email || "",
        paid_at: payment.paid_at,
        expires_at: payment.expires_at,
        created_at: payment.created_at,
      })),
    );

    return NextResponse.json(
      { tickets: payments },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";

    return NextResponse.json({ message }, { status: 500 });
  }
}
