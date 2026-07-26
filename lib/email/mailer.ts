import "server-only";

// ! ================================ //
// ! NEVER USE IT IN CLIENT COMPONENT //
// ! ================================ //

import nodemailer from "nodemailer";
import { readFileSync } from "fs";

const host = process.env.SMTP_HOST || "smtp.resend.com";

const port = Number(process.env.SMTP_PORT || 587);

const rejectUnauthorized =
  process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== "false";

const caFile = process.env.SMTP_TLS_CA_FILE?.trim();

const ca = caFile ? readFileSync(caFile) : undefined;

if (!rejectUnauthorized && process.env.VERCEL_ENV === "production") {
  console.warn(
    "SMTP_TLS_REJECT_UNAUTHORIZED=false is enabled in production. Prefer SMTP_TLS_CA_FILE with the trusted CA certificate.",
  );
}

export const mailTransporter = nodemailer.createTransport({
  host,
  port,
  secure: port === 465,
  requireTLS: port === 587,

  auth: {
    user: process.env.SMTP_USER || "resend",
    pass: process.env.SMTP_PASSWORD,
  },

  tls: {
    servername: host,
    minVersion: "TLSv1.2",
    rejectUnauthorized,
    ...(ca
      ? {
          ca,
        }
      : {}),
  },
});
