import "server-only";

import { readFileSync } from "fs";
import https from "https";

type ResendAttachment = {
  filename: string;
  content: Buffer | string;
};

type SendResendEmailOptions = {
  from: string;
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string | string[];
  attachments?: ResendAttachment[];
  idempotencyKey?: string;
};

type ResendResponse = {
  id?: string;
  message?: string;
  name?: string;
};

function getResendApiKey() {
  const value = process.env.SMTP_PASSWORD?.trim();
  if (!value) throw new Error("SMTP_PASSWORD belum dikonfigurasi.");
  return value;
}

export async function sendResendEmail(options: SendResendEmailOptions) {
  const body = JSON.stringify({
    from: options.from,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
    reply_to: options.replyTo,
    attachments: options.attachments?.map((attachment) => ({
      filename: attachment.filename,
      content: Buffer.isBuffer(attachment.content)
        ? attachment.content.toString("base64")
        : attachment.content,
    })),
  });
  const caFile = process.env.SMTP_TLS_CA_FILE?.trim();
  const allowInsecureDevelopment =
    process.env.NODE_ENV !== "production" &&
    process.env.SMTP_TLS_REJECT_UNAUTHORIZED === "false";

  const result = await new Promise<{ status: number; body: ResendResponse }>(
    (resolve, reject) => {
      const request = https.request(
        {
          hostname: "api.resend.com",
          path: "/emails",
          method: "POST",
          headers: {
            Authorization: `Bearer ${getResendApiKey()}`,
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(body),
            ...(options.idempotencyKey
              ? { "Idempotency-Key": options.idempotencyKey }
              : {}),
          },
          minVersion: "TLSv1.2",
          rejectUnauthorized: !allowInsecureDevelopment,
          ...(caFile ? { ca: readFileSync(caFile) } : {}),
          timeout: 20_000,
        },
        (response) => {
          const chunks: Buffer[] = [];
          response.on("data", (chunk: Buffer) => chunks.push(chunk));
          response.on("end", () => {
            const text = Buffer.concat(chunks).toString("utf8");
            let responseBody: ResendResponse = {};
            try { responseBody = JSON.parse(text) as ResendResponse; } catch { /* empty response */ }
            resolve({ status: response.statusCode ?? 500, body: responseBody });
          });
        },
      );
      request.on("timeout", () => request.destroy(new Error("Resend API timeout.")));
      request.on("error", reject);
      request.end(body);
    },
  );

  if (result.status < 200 || result.status >= 300 || !result.body.id) {
    throw new Error(`Resend API gagal (${result.status}): ${result.body.message || result.body.name || "Unknown error"}`);
  }

  return { messageId: result.body.id };
}
