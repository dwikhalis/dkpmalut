import { NextResponse } from "next/server";

import { sendResendEmail } from "@/lib/email/resendApi";
import {
  enforceRateLimit,
  rejectOversizedBody,
  verifyTurnstile,
} from "@/lib/security/request";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import {
  DEFAULT_CONTACT_CALLING_CODE,
  isContactCallingCode,
} from "@/lib/contact/phoneCountries";

export const runtime = "nodejs";

type ContactPayload = {
  name?: unknown;
  email?: unknown;
  countryCallingCode?: unknown;
  phone?: unknown;
  message?: unknown;
  turnstileToken?: unknown;
};

function getText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}

export async function POST(request: Request) {
  try {
    const oversized = rejectOversizedBody(request, 16 * 1024);
    if (oversized) return oversized;

    const rateLimited = await enforceRateLimit({
      request,
      scope: "contact-submit",
      limit: 5,
      windowSeconds: 600,
    });
    if (rateLimited) return rateLimited;

    const body = (await request.json()) as ContactPayload;
    const name = getText(body.name);
    const email = getText(body.email).toLowerCase();
    const countryCallingCode =
      getText(body.countryCallingCode) || DEFAULT_CONTACT_CALLING_CODE;
    const phoneDigits = getText(body.phone);
    const message = getText(body.message);
    const turnstileToken = getText(body.turnstileToken);

    if (!(await verifyTurnstile(request, turnstileToken))) {
      return jsonError("Verifikasi keamanan gagal. Silakan coba lagi.", 403);
    }

    if (!name || name.length > 120) {
      return jsonError("Nama wajib diisi dan maksimal 120 karakter.");
    }
    if (!isValidEmail(email) || email.length > 254) {
      return jsonError("Alamat email tidak valid.");
    }
    if (!isContactCallingCode(countryCallingCode)) {
      return jsonError("Kode negara tidak valid.");
    }
    if (phoneDigits && !/^\d+$/.test(phoneDigits)) {
      return jsonError("Nomor handphone hanya boleh berisi angka.");
    }

    const nationalPhoneNumber = phoneDigits.replace(/^0+/, "");
    const phone = nationalPhoneNumber
      ? `${countryCallingCode}${nationalPhoneNumber}`
      : "";
    const phoneDigitCount = phone.replace(/\D/g, "").length;

    if (phone && (phoneDigitCount < 7 || phoneDigitCount > 15)) {
      return jsonError("Nomor handphone harus berisi 7 hingga 15 angka.");
    }
    if (!message || message.length > 5000) {
      return jsonError("Pesan wajib diisi dan maksimal 5.000 karakter.");
    }

    const { data: insertedMessage, error: insertError } = await supabaseAdmin
      .from("messages")
      .insert({
        name,
        email,
        phone: phone || null,
        message,
        status: "unread",
        email_delivery_status: "pending",
        email_sent_at: null,
        email_delivery_error: null,
      })
      .select("id")
      .single();

    if (insertError || !insertedMessage) {
      console.error("Contact message insert failed:", insertError?.message);
      return jsonError("Pesan belum dapat disimpan. Silakan coba lagi.", 500);
    }

    const insertedMessageId = String(insertedMessage.id);

    const { data: platformUser, error: platformUserError } = await supabaseAdmin
      .from("users")
      .select("username, role")
      .eq("email", email)
      .maybeSingle();

    if (platformUserError) {
      throw new Error(
        `Gagal memeriksa status pengguna platform: ${platformUserError.message}`,
      );
    }

    const platformUserStatus = platformUser
      ? `Ya (${platformUser.username?.trim() || "-"}, ${platformUser.role?.trim() || "-"})`
      : "Tidak";

    const destinationEmail = process.env.ORG_EMAIL?.trim();
    const fromEmail =
      process.env.CONTACT_FROM_EMAIL?.trim() ||
      process.env.SMTP_ADMIN_EMAIL?.trim() ||
      destinationEmail;
    const fromName =
      process.env.SMTP_ADMIN_NAME?.trim() || "Website DKP Maluku Utara";

    if (!destinationEmail || !fromEmail) {
      throw new Error(
        "ORG_EMAIL atau alamat pengirim SMTP belum dikonfigurasi.",
      );
    }

    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safePhone = escapeHtml(phone || "-");
    const safePlatformUserStatus = escapeHtml(platformUserStatus);
    const safeMessage = escapeHtml(message).replaceAll("\n", "<br />");

    try {
      await sendResendEmail({
        from: `${fromName} <${fromEmail}>`,
        to: destinationEmail,
        replyTo: `${name} <${email}>`,
        subject: `Pesan Kontak Baru dari ${name.replace(/[\r\n]+/g, " ")}`,
        text: `Nama: ${name}\nEmail: ${email}\nNomor handphone: ${phone || "-"}\nPengguna Platform Terdaftar: ${platformUserStatus}\n\nPesan:\n${message}`,
        html: `<h2>Pesan Kontak Baru</h2><p><strong>Nama:</strong> ${safeName}</p><p><strong>Email:</strong> ${safeEmail}</p><p><strong>Nomor handphone:</strong> ${safePhone}</p><p><strong>Pengguna Platform Terdaftar:</strong> ${safePlatformUserStatus}</p><p><strong>Pesan:</strong><br />${safeMessage}</p>`,
        idempotencyKey: `contact-${insertedMessageId}`,
      });

      const { error: statusError } = await supabaseAdmin
        .from("messages")
        .update({
          email_delivery_status: "sent",
          email_sent_at: new Date().toISOString(),
          email_delivery_error: null,
        })
        .eq("id", insertedMessageId);
      if (statusError) {
        console.error(
          "Contact email sent-status update failed:",
          statusError.message,
        );
      }

      return NextResponse.json({
        message: "Pesan berhasil dikirim.",
        emailDelivered: true,
      });
    } catch (emailError) {
      console.error("Contact notification email failed:", emailError);
      const { error: statusError } = await supabaseAdmin
        .from("messages")
        .update({
          email_delivery_status: "failed",
          email_sent_at: null,
          email_delivery_error: "Email notification delivery failed.",
        })
        .eq("id", insertedMessageId);
      if (statusError) {
        console.error(
          "Contact email failed-status update failed:",
          statusError.message,
        );
      }

      return NextResponse.json(
        { message: "Pesan berhasil disimpan.", emailDelivered: false },
        { status: 201 },
      );
    }
  } catch (error) {
    console.error("Contact submission failed:", error);
    return jsonError("Pesan belum dapat dikirim. Silakan coba lagi.", 500);
  }
}
