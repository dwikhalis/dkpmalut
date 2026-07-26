import "server-only";

type CreatePaymentLinkOptions = {
  orderId: string;
  grossAmount: number;
  buyerName: string;
  buyerEmail: string;
  finishUrl: string;
};

function getApiBaseUrl() {
  return process.env.MIDTRANS_IS_PRODUCTION === "true"
    ? "https://app.midtrans.com"
    : "https://app.sandbox.midtrans.com";
}

export async function createMidtransPaymentLink({
  orderId,
  grossAmount,
  buyerName,
  buyerEmail,
  finishUrl,
}: CreatePaymentLinkOptions) {
  const serverKey = process.env.MIDTRANS_SERVER_KEY?.trim();
  if (!serverKey) throw new Error("MIDTRANS_SERVER_KEY belum dikonfigurasi.");

  /*
   * Use a Snap transaction instead of the Payment Link API. Payment Link
   * creates a child purchase whose transaction order ID is suffixed by
   * Midtrans, so it no longer matches our canonical payments.order_id.
   * Snap keeps the submitted order ID unchanged and still supplies a URL
   * that an admin can send to the customer.
   */
  const response = await fetch(`${getApiBaseUrl()}/snap/v1/transactions`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${serverKey}:`).toString("base64")}`,
    },
    body: JSON.stringify({
      transaction_details: {
        order_id: orderId,
        gross_amount: grossAmount,
      },
      customer_details: {
        first_name: buyerName.slice(0, 50),
        email: buyerEmail,
      },
      item_details: [
        {
          id: "conservation-ticket",
          name: "Tiket Kawasan Konservasi",
          price: grossAmount,
          quantity: 1,
        },
      ],
      title: "Pembayaran Tiket Konservasi",
      callbacks: {
        finish: finishUrl,
      },
      custom_field1: orderId,
    }),
    cache: "no-store",
  });

  const result = (await response.json()) as {
    redirect_url?: string;
    error_messages?: string | string[];
  };
  if (!response.ok || !result.redirect_url) {
    const details = Array.isArray(result.error_messages)
      ? result.error_messages.join(" ")
      : result.error_messages;
    throw new Error(details || "Transaksi Midtrans gagal dibuat.");
  }

  return result.redirect_url;
}
