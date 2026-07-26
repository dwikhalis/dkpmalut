import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import { enforceRateLimit, rejectOversizedBody } from "@/lib/security/request";
import { getBaseUrl } from "@/lib/utils/getBaseUrl";

export const runtime = "nodejs";

type CreateTransactionBody = {
  orderId?: unknown;
  publicStatusToken?: unknown;
};

type PaymentRow = {
  id: string;
  order_id: string;
  status: string;

  amount: number;
  gross_amount: number | null;
  subtotal: number | null;
  tax_percentage: number | null;
  tax_amount: number | null;

  visitor_count: number | null;

  buyer_name: string | null;
  buyers_email: string | null;
  customer_phone: string | null;

  public_status_token: string | null;

  snap_token: string | null;
  snap_redirect_url: string | null;

  metadata: Record<string, unknown> | null;
};

type PaymentAreaRow = {
  area_name_snapshot: string;
  ticket_price_snapshot: number;
};

type MidtransResponse = {
  token?: string;
  redirect_url?: string;
  error_messages?: string[];
  status_code?: string;
  status_message?: string;
};

type ChargeSnapshot = { id: string; name: string; amount: number };

function getMidtransSnapUrl() {
  const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";

  return isProduction
    ? "https://app.midtrans.com/snap/v1/transactions"
    : "https://app.sandbox.midtrans.com/snap/v1/transactions";
}

function getBasicAuthHeader() {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;

  if (!serverKey) {
    throw new Error("MIDTRANS_SERVER_KEY belum dikonfigurasi.");
  }

  const encodedKey = Buffer.from(`${serverKey}:`).toString("base64");

  return `Basic ${encodedKey}`;
}

function getText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return value.slice(0, maxLength);
}

function jsonError(message: string, status = 400, detail?: unknown) {
  return NextResponse.json(
    {
      message,
      ...(detail !== undefined
        ? {
            detail,
          }
        : {}),
    },
    {
      status,
    },
  );
}

export async function POST(request: Request) {
  try {
    const oversized = rejectOversizedBody(request, 8 * 1024);
    if (oversized) return oversized;

    const rateLimited = await enforceRateLimit({
      request,
      scope: "midtrans-create",
      limit: 12,
      windowSeconds: 600,
    });
    if (rateLimited) return rateLimited;

    const body = (await request.json()) as CreateTransactionBody;

    const orderId = getText(body.orderId);
    const publicStatusToken = getText(body.publicStatusToken);

    if (!orderId || !publicStatusToken) {
      return jsonError("Booking ID dan token status wajib disertakan.");
    }

    /*
     * 1. Get the prepared booking.
     *
     * Do not trust customer data or payment amounts
     * supplied by the browser.
     */
    const { data: paymentData, error: paymentError } = await supabaseAdmin
      .from("payments")
      .select(
        `
          id,
          order_id,
          status,
          amount,
          gross_amount,
          subtotal,
          tax_percentage,
          tax_amount,
          visitor_count,
          buyer_name,
          buyers_email,
          customer_phone,
          public_status_token,
          snap_token,
          snap_redirect_url,
          metadata
        `,
      )
      .eq("order_id", orderId)
      .eq("public_status_token", publicStatusToken)
      .maybeSingle();

    if (paymentError) {
      console.error("Failed to load prepared payment:", paymentError);

      return jsonError("Booking belum dapat dimuat.", 500);
    }

    if (!paymentData) {
      return jsonError("Booking tidak ditemukan.", 404);
    }

    const payment = paymentData as PaymentRow;

    /*
     * 2. Refuse to create another Midtrans transaction
     * for a booking that is no longer pending.
     */
    if (payment.status !== "pending") {
      if (payment.status === "paid") {
        return jsonError("Booking ini sudah dibayar.", 409);
      }

      return jsonError(
        `Booking dengan status "${payment.status}" tidak dapat dibayar.`,
        409,
      );
    }

    /*
     * 3. Reuse the existing Snap token.
     *
     * This prevents repeated button clicks from creating
     * multiple transactions with the same order_id.
     */
    if (payment.snap_token) {
      return NextResponse.json({
        orderId: payment.order_id,
        token: payment.snap_token,
        redirectUrl: payment.snap_redirect_url,
        amount: payment.gross_amount ?? payment.amount,
        reused: true,
      });
    }

    if (!payment.buyer_name) {
      return jsonError("Nama pemesan pada booking tidak ditemukan.", 500);
    }

    if (!payment.buyers_email) {
      return jsonError("Email pemesan pada booking tidak ditemukan.", 500);
    }

    if (!payment.public_status_token) {
      return jsonError("Token status booking tidak ditemukan.", 500);
    }

    const visitorCount = payment.visitor_count;

    if (!visitorCount || !Number.isInteger(visitorCount) || visitorCount < 1) {
      return jsonError("Jumlah pengunjung pada booking tidak valid.", 500);
    }

    /*
     * 4. Load the selected conservation areas.
     */
    const { data: areaData, error: areasError } = await supabaseAdmin
      .from("payment_conservation_areas")
      .select(
        `
          area_name_snapshot,
          ticket_price_snapshot
        `,
      )
      .eq("payment_id", payment.id);

    if (areasError) {
      console.error("Failed to load payment areas:", areasError);

      return jsonError("Tujuan kawasan pada booking belum dapat dimuat.", 500);
    }

    const selectedAreas = (areaData as PaymentAreaRow[] | null) ?? [];

    if (selectedAreas.length === 0) {
      return jsonError("Booking belum memiliki kawasan konservasi.", 500);
    }

    /*
     * 5. Recalculate the transaction from database
     * snapshots.
     *
     * One area item:
     * ticket_price_snapshot × visitorCount
     */
    const calculatedSubtotal = selectedAreas.reduce((total, area) => {
      const areaPrice = Number(area.ticket_price_snapshot);

      if (!Number.isSafeInteger(areaPrice) || areaPrice <= 0) {
        throw new Error(
          `Harga tiket untuk ${area.area_name_snapshot} tidak valid.`,
        );
      }

      return total + areaPrice * visitorCount;
    }, 0);

    const taxAmount = Number(payment.tax_amount ?? 0);

    if (!Number.isSafeInteger(taxAmount) || taxAmount < 0) {
      return jsonError("Nilai pajak pada booking tidak valid.", 500);
    }

    const calculatedGrossAmount = calculatedSubtotal + taxAmount;

    const storedGrossAmount = Number(payment.gross_amount ?? payment.amount);

    if (!Number.isSafeInteger(storedGrossAmount) || storedGrossAmount <= 0) {
      return jsonError("Total pembayaran pada booking tidak valid.", 500);
    }

    /*
     * Stop the payment when stored and recalculated
     * totals do not match.
     */
    if (calculatedGrossAmount !== storedGrossAmount) {
      console.error("Payment amount mismatch:", {
        orderId,
        calculatedSubtotal,
        taxAmount,
        calculatedGrossAmount,
        storedGrossAmount,
      });

      return jsonError(
        "Perhitungan total booking tidak sesuai. Pembayaran dihentikan untuk keamanan.",
        409,
      );
    }

    if (
      payment.subtotal !== null &&
      Number(payment.subtotal) !== calculatedSubtotal
    ) {
      return jsonError("Subtotal booking tidak sesuai.", 409);
    }

    /*
     * 6. Build item_details.
     *
     * Each area becomes a separate Midtrans item,
     * multiplied by the number of visitors.
     */
    const itemDetails = selectedAreas.map((area, index) => ({
      id: `area-${index + 1}`,
      name: truncateText(area.area_name_snapshot, 50),
      price: Number(area.ticket_price_snapshot),
      quantity: visitorCount,
    }));

    const chargeItems = Array.isArray(payment.metadata?.charge_items)
      ? (payment.metadata.charge_items as ChargeSnapshot[])
      : [];

    if (chargeItems.length > 0) {
      for (const [index, charge] of chargeItems.entries()) {
        const amount = Number(charge.amount);
        if (!Number.isSafeInteger(amount) || amount < 0) return jsonError("Snapshot komponen biaya tidak valid.", 500);
        if (amount === 0) continue;
        itemDetails.push({ id: `charge-${index + 1}`, name: truncateText(charge.name, 50), price: amount, quantity: 1 });
      }
    } else if (taxAmount > 0) {
      const taxPercentage = Number(payment.tax_percentage ?? 20);
      itemDetails.push({ id: "tax", name: `Pajak ${taxPercentage}%`, price: taxAmount, quantity: 1 });
    }

    /*
     * Verify that Midtrans item_details equal
     * transaction_details.gross_amount.
     */
    const itemDetailsTotal = itemDetails.reduce(
      (total, item) => total + item.price * item.quantity,
      0,
    );

    if (itemDetailsTotal !== storedGrossAmount) {
      console.error("Midtrans item details mismatch:", {
        orderId,
        itemDetailsTotal,
        storedGrossAmount,
      });

      return jsonError(
        "Detail pembayaran tidak sesuai dengan total booking.",
        409,
      );
    }

    const baseUrl = getBaseUrl(request);

    const finishUrl = `${baseUrl}/payment/finish/${encodeURIComponent(
      payment.public_status_token,
    )}`;

    /*
     * 7. Create Midtrans transaction.
     */
    const midtransPayload = {
      transaction_details: {
        order_id: payment.order_id,
        gross_amount: storedGrossAmount,
      },

      item_details: itemDetails,

      customer_details: {
        first_name: payment.buyer_name,

        email: payment.buyers_email,

        ...(payment.customer_phone
          ? {
              phone: payment.customer_phone,
            }
          : {}),
      },

      callbacks: {
        finish: finishUrl,
      },

      custom_field1: payment.order_id,
    };

    const midtransResponse = await fetch(getMidtransSnapUrl(), {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: getBasicAuthHeader(),
      },
      body: JSON.stringify(midtransPayload),
    });

    const midtransData = (await midtransResponse.json()) as MidtransResponse;

    if (!midtransResponse.ok) {
      console.error("Midtrans transaction creation failed:", {
        orderId,
        status: midtransResponse.status,
        response: midtransData,
      });

      /*
       * Keep payment status as pending.
       *
       * A temporary Midtrans/API error should not mark
       * the prepared booking as permanently failed,
       * because the user can try again.
       */
      await supabaseAdmin
        .from("payments")
        .update({
          updated_at: new Date().toISOString(),

          metadata: {
            ...(payment.metadata ?? {}),

            last_midtrans_error: midtransData,

            last_midtrans_error_at: new Date().toISOString(),
          },
        })
        .eq("id", payment.id);

      return jsonError(
        "Midtrans belum dapat membuat transaksi.",
        midtransResponse.status,
        midtransData,
      );
    }

    if (!midtransData.token || !midtransData.redirect_url) {
      console.error("Incomplete Midtrans response:", midtransData);

      return jsonError("Respons Midtrans tidak lengkap.", 502);
    }

    /*
     * 8. Store the Snap result.
     */
    const now = new Date().toISOString();

    const { error: updateError } = await supabaseAdmin
      .from("payments")
      .update({
        snap_token: midtransData.token,

        snap_redirect_url: midtransData.redirect_url,

        updated_at: now,

        metadata: {
          ...(payment.metadata ?? {}),

          midtrans_transaction_created_at: now,

          midtrans_gross_amount: storedGrossAmount,
        },
      })
      .eq("id", payment.id);

    if (updateError) {
      console.error("Failed to store Snap token:", updateError);

      /*
       * The Midtrans transaction already exists at this
       * point, so return the token to the browser rather
       * than trying to create another order.
       */
    }

    return NextResponse.json({
      orderId: payment.order_id,

      token: midtransData.token,

      redirectUrl: midtransData.redirect_url,

      amount: storedGrossAmount,

      publicStatusToken: payment.public_status_token,

      reused: false,
    });
  } catch (error) {
    console.error("Unexpected Midtrans transaction error:", error);

    return jsonError(
      error instanceof Error ? error.message : "Terjadi kesalahan pada server.",
      500,
    );
  }
}
