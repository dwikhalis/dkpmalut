import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";

function getMidtransSnapUrl() {
  const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";

  return isProduction
    ? "https://app.midtrans.com/snap/v1/transactions"
    : "https://app.sandbox.midtrans.com/snap/v1/transactions";
}

function getBasicAuthHeader() {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;

  if (!serverKey) {
    throw new Error("MIDTRANS_SERVER_KEY is missing");
  }

  const encoded = Buffer.from(`${serverKey}:`).toString("base64");

  return `Basic ${encoded}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { userId, itemId, itemName, amount, customerName, customerEmail } =
      body;

    if (!itemName || !amount) {
      return NextResponse.json(
        { message: "itemName and amount are required" },
        { status: 400 },
      );
    }

    /*
      Important:
      For production, do not fully trust amount from frontend.
      Better: receive itemId only, then fetch price from Supabase.
    */

    const orderId = `ORDER-${Date.now()}`;

    const { error: insertError } = await supabaseAdmin.from("payments").insert({
      order_id: orderId,
      user_id: userId || null,
      item_id: itemId || null,
      item_name: itemName,
      amount,
      status: "pending",
    });

    if (insertError) {
      return NextResponse.json(
        { message: insertError.message },
        { status: 500 },
      );
    }

    const midtransPayload = {
      transaction_details: {
        order_id: orderId,
        gross_amount: amount,
      },
      item_details: [
        {
          id: itemId || "ITEM-001",
          price: amount,
          quantity: 1,
          name: itemName,
        },
      ],
      customer_details: {
        first_name: customerName || "Customer",
        email: customerEmail || undefined,
      },
      callbacks: {
        finish: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/finish?order_id=${orderId}`,
      },
    };

    const response = await fetch(getMidtransSnapUrl(), {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: getBasicAuthHeader(),
      },
      body: JSON.stringify(midtransPayload),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          message: "Failed to create Midtrans transaction",
          detail: data,
        },
        { status: response.status },
      );
    }

    return NextResponse.json({
      orderId,
      token: data.token,
      redirectUrl: data.redirect_url,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json({ message }, { status: 500 });
  }
}
