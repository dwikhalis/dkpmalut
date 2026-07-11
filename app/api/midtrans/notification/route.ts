import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";

function createSignatureKey({
  orderId,
  statusCode,
  grossAmount,
  serverKey,
}: {
  orderId: string;
  statusCode: string;
  grossAmount: string;
  serverKey: string;
}) {
  return crypto
    .createHash("sha512")
    .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
    .digest("hex");
}

function mapPaymentStatus(transactionStatus: string, fraudStatus?: string) {
  if (transactionStatus === "settlement") return "paid";

  if (transactionStatus === "capture") {
    return fraudStatus === "accept" ? "paid" : "challenge";
  }

  if (transactionStatus === "pending") return "pending";
  if (transactionStatus === "expire") return "expired";
  if (transactionStatus === "cancel") return "cancelled";
  if (transactionStatus === "deny") return "failed";
  if (transactionStatus === "failure") return "failed";
  if (transactionStatus === "refund") return "refunded";
  if (transactionStatus === "partial_refund") return "refunded";

  return "pending";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const serverKey = process.env.MIDTRANS_SERVER_KEY;

    if (!serverKey) {
      return NextResponse.json(
        { message: "MIDTRANS_SERVER_KEY is missing" },
        { status: 500 },
      );
    }

    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      fraud_status,
      payment_type,
      transaction_id,
    } = body;

    if (!order_id || !status_code || !gross_amount || !signature_key) {
      return NextResponse.json(
        { message: "Invalid notification payload" },
        { status: 400 },
      );
    }

    const expectedSignature = createSignatureKey({
      orderId: order_id,
      statusCode: status_code,
      grossAmount: gross_amount,
      serverKey,
    });

    if (expectedSignature !== signature_key) {
      return NextResponse.json(
        { message: "Invalid signature" },
        { status: 403 },
      );
    }

    const newStatus = mapPaymentStatus(transaction_status, fraud_status);

    const { error } = await supabaseAdmin
      .from("payments")
      .update({
        status: newStatus,
        payment_type: payment_type || null,
        transaction_id: transaction_id || null,
        raw_notification: body,
        updated_at: new Date().toISOString(),
      })
      .eq("order_id", order_id);

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: "Notification processed",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected webhook error";

    return NextResponse.json({ message }, { status: 500 });
  }
}
