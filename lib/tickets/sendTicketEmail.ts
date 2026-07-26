import "server-only";

import { sendResendEmail } from "@/lib/email/resendApi";
import { generateTicketPdf } from "./generateTicketPdf";

type SendTicketEmailParams = {
  orderId: string;
  buyerName: string;
  buyerEmail: string;
  ticketCode: string;
  qrToken: string;
  visitorNames: string[];
  conservationAreas: string[];
  paidAt: string;
  expiresAt: string;
};

function getFirstRequiredEnv(names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim();

    if (value) {
      return value;
    }
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

function sanitizeFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}

export async function sendTicketEmail({
  orderId,
  buyerName,
  buyerEmail,
  ticketCode,
  qrToken,
  visitorNames,
  conservationAreas,
  paidAt,
  expiresAt,
}: SendTicketEmailParams) {
  const baseUrl = getFirstRequiredEnv([
    "NEXT_PUBLIC_BASE_URL",
    "NEXT_PUBLIC_SITE_URL",
  ]).replace(/\/+$/, "");

  const ticketFromEmail = getFirstRequiredEnv([
    "TICKET_FROM_EMAIL",
    "SMTP_TICKET_FROM_EMAIL",
  ]);

  const ticketUrl = `${baseUrl}/ticket/verify/${encodeURIComponent(
    qrToken,
  )}`;

  /*
   * Generate the complete PDF ticket, including QR.
   */
  const pdfBuffer = await generateTicketPdf({
    orderId,
    buyerName,
    ticketCode,
    visitorNames,
    conservationAreas,
    paidAt,
    expiresAt,
    ticketUrl,
  });

  const safeBuyerName = escapeHtml(buyerName);

  const safeOrderId = escapeHtml(orderId);
  const safeTicketCode = escapeHtml(ticketCode);

  const safeTicketUrl = escapeHtml(ticketUrl);

  const attachmentFilename = `tiket-${sanitizeFilename(orderId)}.pdf`;

  const result = await sendResendEmail({
    from: `Tiket Kawasan Konservasi <${ticketFromEmail}>`,

    to: buyerEmail,

    subject: `Tiket Kawasan Konservasi - ${orderId}`,

    text: `
Halo ${buyerName},

Pembayaran Anda telah berhasil diverifikasi.

Booking ID: ${orderId}
Ticket Code: ${ticketCode}

Tiket kawasan konservasi Anda terlampir dalam format PDF.

Simpan PDF tersebut dan tunjukkan QR tiket kepada petugas kawasan konservasi.

Lihat status tiket:
${ticketUrl}

Jangan membagikan PDF, QR, atau kode tiket kepada pihak yang tidak berkepentingan.
      `.trim(),

    html: `
        <!doctype html>
        <html lang="id">
          <body
            style="
              margin: 0;
              padding: 0;
              background-color: #f5f5f4;
              font-family: Arial, Helvetica, sans-serif;
              color: #292524;
            "
          >
            <table
              role="presentation"
              width="100%"
              cellspacing="0"
              cellpadding="0"
              style="
                padding: 32px 16px;
                background-color: #f5f5f4;
              "
            >
              <tr>
                <td align="center">
                  <table
                    role="presentation"
                    width="100%"
                    cellspacing="0"
                    cellpadding="0"
                    style="
                      max-width: 600px;
                      overflow: hidden;
                      border-radius: 16px;
                      background-color: #ffffff;
                    "
                  >
                    <tr>
                      <td
                        style="
                          padding: 28px 32px;
                          background-color: #075985;
                          text-align: center;
                          color: #ffffff;
                        "
                      >
                        <h1
                          style="
                            margin: 0;
                            font-size: 23px;
                          "
                        >
                          Tiket Kawasan Konservasi
                        </h1>

                        <p
                          style="
                            margin: 8px 0 0;
                            color: #e0f2fe;
                            font-size: 14px;
                          "
                        >
                          KKP Maluku Utara
                        </p>
                      </td>
                    </tr>

                    <tr>
                      <td style="padding: 32px;">
                        <h2
                          style="
                            margin: 0 0 16px;
                            color: #166534;
                          "
                        >
                          Pembayaran Berhasil
                        </h2>

                        <p
                          style="
                            margin: 0 0 16px;
                            color: #57534e;
                            font-size: 15px;
                            line-height: 1.7;
                          "
                        >
                          Halo ${safeBuyerName},
                          pembayaran Anda telah berhasil
                          diverifikasi.
                        </p>

                        <div
                          style="
                            margin: 24px 0;
                            padding: 18px;
                            border-radius: 10px;
                            background-color: #f5f5f4;
                          "
                        >
                          <p style="margin: 0;">
                            Booking ID
                          </p>

                          <p
                            style="
                              margin: 6px 0 0;
                              font-size: 18px;
                              font-weight: 700;
                            "
                          >
                            ${safeOrderId}
                          </p>
                          <p style="margin: 16px 0 0;">
                            Ticket Code
                          </p>
                          <p
                            style="
                              margin: 6px 0 0;
                              font-size: 18px;
                              font-weight: 700;
                              letter-spacing: 1px;
                            "
                          >
                            ${safeTicketCode}
                          </p>
                        </div>

                        <p
                          style="
                            color: #57534e;
                            font-size: 15px;
                            line-height: 1.7;
                          "
                        >
                          Tiket kawasan konservasi Anda
                          terlampir dalam format PDF.
                          Simpan PDF tersebut dan tunjukkan
                          QR di dalam tiket kepada petugas.
                        </p>

                        <div
                          style="
                            margin-top: 28px;
                            text-align: center;
                          "
                        >
                          <a
                            href="${safeTicketUrl}"
                            style="
                              display: inline-block;
                              padding: 14px 24px;
                              border-radius: 8px;
                              background-color: #0284c7;
                              color: #ffffff;
                              font-weight: 700;
                              text-decoration: none;
                            "
                          >
                            Lihat Status Tiket
                          </a>

                          <p
                            style="
                              margin: 16px 0 6px;
                              color: #57534e;
                              font-size: 13px;
                              line-height: 1.6;
                            "
                          >
                            Jika tombol tidak berfungsi, buka atau salin tautan verifikasi berikut:
                          </p>

                          <a
                            href="${safeTicketUrl}"
                            style="
                              color: #0369a1;
                              font-size: 13px;
                              line-height: 1.6;
                              overflow-wrap: anywhere;
                              word-break: break-all;
                            "
                          >
                            ${safeTicketUrl}
                          </a>
                        </div>

                        <p
                          style="
                            margin: 28px 0 0;
                            color: #78716c;
                            font-size: 13px;
                            line-height: 1.6;
                          "
                        >
                          Jangan membagikan PDF, QR, atau
                          kode tiket kepada pihak yang tidak
                          berkepentingan.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,

    attachments: [
      {
        filename: attachmentFilename,

        content: pdfBuffer,
      },
    ],
    idempotencyKey: `ticket-${orderId}`,
  });

  return {
    messageId: result.messageId,
    ticketUrl,
    attachmentFilename,
  };
}
