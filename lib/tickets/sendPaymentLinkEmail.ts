import "server-only";

import { sendResendEmail } from "@/lib/email/resendApi";

function requiredEnv(names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  throw new Error(`${names.join(" atau ")} belum dikonfigurasi.`);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function sendPaymentLinkEmail({
  orderId,
  buyerName,
  buyerEmail,
  paymentUrl,
  grossAmount,
}: {
  orderId: string;
  buyerName: string;
  buyerEmail: string;
  paymentUrl: string;
  grossAmount: number;
}) {
  const fromEmail = requiredEnv([
    "TICKET_FROM_EMAIL",
    "SMTP_TICKET_FROM_EMAIL",
  ]);
  const fromName =
    process.env.SMTP_ADMIN_NAME?.trim() || "Tiket Kawasan Konservasi";
  const amount = `Rp${grossAmount.toLocaleString("id-ID")}`;
  const safeName = escapeHtml(buyerName);
  const safeOrderId = escapeHtml(orderId);
  const safeAmount = escapeHtml(amount);
  const safeUrl = escapeHtml(paymentUrl);

  return sendResendEmail({
    from: `${fromName} <${fromEmail}>`,
    to: buyerEmail,
    subject: `Payment Link Tiket Kawasan Konservasi - ${orderId}`,
    text: `
Halo ${buyerName},

Silakan selesaikan pembayaran tiket kawasan konservasi Anda.

Booking ID: ${orderId}
Total pembayaran: ${amount}

Payment Link:
${paymentUrl}

Link ini hanya untuk pemesan dan tidak boleh dibagikan kepada pihak lain.
    `.trim(),
    html: `
      <!doctype html>
      <html lang="id">
        <body style="margin:0;background:#f5f5f4;font-family:Arial,sans-serif;color:#1c1917">
          <div style="max-width:600px;margin:0 auto;padding:32px 16px">
            <div style="background:#fff;border-radius:16px;padding:28px;border:1px solid #e7e5e4">
              <h1 style="font-size:22px;margin:0 0 16px;color:#075985">Pembayaran Tiket Kawasan Konservasi</h1>
              <p>Halo ${safeName},</p>
              <p>Silakan selesaikan pembayaran agar tiket Anda dapat diterbitkan.</p>
              <div style="background:#f0f9ff;border-radius:10px;padding:16px;margin:20px 0">
                <p style="margin:0 0 8px"><strong>Booking ID:</strong> ${safeOrderId}</p>
                <p style="margin:0"><strong>Total pembayaran:</strong> ${safeAmount}</p>
              </div>
              <p style="margin:24px 0">
                <a href="${safeUrl}" style="display:inline-block;background:#0369a1;color:#fff;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:10px">Bayar Sekarang</a>
              </p>
              <p style="font-size:13px;color:#78716c">Jika tombol tidak dapat dibuka, salin tautan berikut ke browser:</p>
              <p style="font-size:13px;word-break:break-all"><a href="${safeUrl}">${safeUrl}</a></p>
              <p style="font-size:12px;color:#78716c;margin-top:24px">Jangan bagikan tautan pembayaran ini kepada pihak yang tidak berkepentingan.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    idempotencyKey: `payment-link-${orderId}`,
  });
}
