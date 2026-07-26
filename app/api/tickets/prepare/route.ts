import crypto from "crypto";
import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import {
  enforceRateLimit,
  rejectOversizedBody,
  verifyTurnstile,
} from "@/lib/security/request";
import { calculateTicketCharges, type TicketCharge } from "@/lib/tickets/charges";
import { createMidtransPaymentLink } from "@/lib/tickets/midtransPaymentLink";
import { sendPaymentLinkEmail } from "@/lib/tickets/sendPaymentLinkEmail";
import {
  generateQrToken,
  generateTicketCode,
} from "@/lib/tickets/ticketIdentifiers";
import { getBaseUrl } from "@/lib/utils/getBaseUrl";

export const runtime = "nodejs";

const MAX_VISITORS_PER_BOOKING = 100;

const PURCHASE_TYPES = ["individual", "group"] as const;

const OPERATOR_TYPES = ["homestay", "resort", "lob", "other"] as const;

const VISITOR_GENDERS = ["male", "female", "prefer_not_to_say"] as const;

const IDENTITY_TYPES = ["ktp", "sim", "passport", "kitas", "kitap"] as const;
const VISITING_PURPOSES = [
  "tourism",
  "research",
  "education",
  "vip",
  "official",
  "other",
] as const;

type PurchaseType = (typeof PURCHASE_TYPES)[number];

type OperatorType = (typeof OPERATOR_TYPES)[number];

type VisitorGender = (typeof VISITOR_GENDERS)[number];

type IdentityType = (typeof IDENTITY_TYPES)[number];

type TicketVisitorPayload = {
  visitorName?: unknown;
  country?: unknown;
  gender?: unknown;
  identityType?: unknown;
  identityNumber?: unknown;
};

type PermitDocumentPayload = {
  name?: unknown;
  path?: unknown;
  size?: unknown;
};

type PrepareTicketPayload = {
  adminIssue?: unknown;
  visitingPurpose?: unknown;
  permitDocuments?: unknown;
  turnstileToken?: unknown;
  purchaseType?: unknown;

  usesOperator?: unknown;
  operatorName?: unknown;
  operatorEmail?: unknown;
  operatorType?: unknown;
  operatorTypeOther?: unknown;

  bringsBoat?: unknown;
  boatName?: unknown;

  visitorCount?: unknown;

  buyerName?: unknown;
  buyersEmail?: unknown;

  visitors?: unknown;
  selectedAreaSlugs?: unknown;
};

type ConservationAreaRow = {
  id: string;
  slug: string;
  name: string;
  ticket_price: number;
};

function getText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isPurchaseType(value: string): value is PurchaseType {
  return PURCHASE_TYPES.includes(value as PurchaseType);
}

function isOperatorType(value: string): value is OperatorType {
  return OPERATOR_TYPES.includes(value as OperatorType);
}

function isVisitorGender(value: string): value is VisitorGender {
  return VISITOR_GENDERS.includes(value as VisitorGender);
}

function isIdentityType(value: string): value is IdentityType {
  return IDENTITY_TYPES.includes(value as IdentityType);
}

function generateBookingId() {
  const datePart = new Date().toISOString().slice(0, 10).replaceAll("-", "");

  const randomPart = crypto.randomBytes(4).toString("hex").toUpperCase();

  return `TKT-${datePart}-${randomPart}`;
}

function generatePublicStatusToken() {
  return crypto.randomUUID();
}

function jsonError(message: string, status = 400) {
  return NextResponse.json(
    {
      message,
    },
    {
      status,
    },
  );
}

export async function POST(request: Request) {
  let paymentId: string | null = null;

  try {
    const oversized = rejectOversizedBody(request, 128 * 1024);
    if (oversized) return oversized;

    const body = (await request.json()) as PrepareTicketPayload;
    const adminIssue = body.adminIssue === true;
    let issuingAdminId: string | null = null;

    if (adminIssue) {
      const accessToken = request.headers
        .get("authorization")
        ?.replace(/^Bearer\s+/i, "");
      if (!accessToken) return jsonError("Admin login required.", 401);

      const {
        data: { user },
        error: authError,
      } = await supabaseAdmin.auth.getUser(accessToken);
      if (authError || !user) return jsonError("Unauthorized.", 401);

      const { data: profile } = await supabaseAdmin
        .from("users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      if (profile?.role !== "admin") return jsonError("Forbidden.", 403);
      issuingAdminId = user.id;
    }

    const rateLimited = await enforceRateLimit({
      request,
      scope: adminIssue ? "admin-ticket-issue" : "ticket-prepare",
      limit: adminIssue ? 30 : 8,
      windowSeconds: 600,
    });
    if (rateLimited) return rateLimited;

    if (
      !adminIssue &&
      !(await verifyTurnstile(request, getText(body.turnstileToken)))
    ) {
      return jsonError("Verifikasi keamanan gagal. Silakan coba lagi.", 403);
    }

    /*
     * -----------------------------------------------------
     * 1. Normalize basic fields
     * -----------------------------------------------------
     */

    const purchaseType = getText(body.purchaseType);

    const usesOperator = body.usesOperator === true;

    const operatorName = getText(body.operatorName);

    const operatorEmail = getText(body.operatorEmail).toLowerCase();

    const operatorType = getText(body.operatorType);

    const operatorTypeOther = getText(body.operatorTypeOther);

    /*
     * LOB always means that a boat is included.
     */
    const bringsBoat = operatorType === "lob" ? true : body.bringsBoat === true;

    const boatName = getText(body.boatName);

    const buyerName = getText(body.buyerName);

    const buyersEmail = getText(body.buyersEmail).toLowerCase();

    const visitorCount = Number(body.visitorCount);
    const visitingPurpose = adminIssue
      ? getText(body.visitingPurpose).toLowerCase()
      : "tourism";
    const permitDocuments = adminIssue
      ? Array.isArray(body.permitDocuments)
        ? body.permitDocuments.map((value) => {
            const document = value as PermitDocumentPayload;
            return {
              name: getText(document?.name),
              path: getText(document?.path),
              size: Number(document?.size),
            };
          })
        : []
      : [];

    if (
      adminIssue &&
      !VISITING_PURPOSES.includes(
        visitingPurpose as (typeof VISITING_PURPOSES)[number],
      )
    ) {
      return jsonError("Tujuan kunjungan tidak valid.");
    }

    if (
      adminIssue &&
      visitingPurpose !== "tourism" &&
      permitDocuments.length === 0
    ) {
      return jsonError(
        "Minimal satu dokumen izin wajib dicatat untuk kunjungan nonwisata.",
      );
    }

    if (
      adminIssue &&
      (permitDocuments.length > 10 ||
        permitDocuments.some(
          (document) =>
            !document.name ||
            document.name.length > 200 ||
            !document.path.startsWith(`ticket-permits/${issuingAdminId}/`) ||
            document.path.includes("..") ||
            !Number.isSafeInteger(document.size) ||
            document.size <= 0 ||
            document.size > 10 * 1024 * 1024,
        ))
    ) {
      return jsonError(
        "Metadata dokumen izin tidak valid atau melebihi batas.",
      );
    }

    /*
     * -----------------------------------------------------
     * 2. Validate Pagination 1
     * -----------------------------------------------------
     */

    if (!isPurchaseType(purchaseType)) {
      return jsonError("Jenis pembelian tiket tidak valid.");
    }

    if (
      !Number.isInteger(visitorCount) ||
      visitorCount < 1 ||
      visitorCount > MAX_VISITORS_PER_BOOKING
    ) {
      return jsonError(
        `Jumlah pengunjung harus antara 1 dan ${MAX_VISITORS_PER_BOOKING}.`,
      );
    }

    if (!buyerName) {
      return jsonError("Nama pemesan wajib diisi.");
    }

    if (!isValidEmail(buyersEmail)) {
      return jsonError("Email pemesan tidak valid.");
    }

    if (usesOperator) {
      if (!operatorName) {
        return jsonError("Nama operator wajib diisi.");
      }

      if (!isValidEmail(operatorEmail)) {
        return jsonError("Email operator tidak valid.");
      }

      if (!isOperatorType(operatorType)) {
        return jsonError("Tipe operator tidak valid.");
      }

      if (operatorType === "other" && !operatorTypeOther) {
        return jsonError("Tipe operator lainnya wajib diisi.");
      }

      /*
       * Ensure the canonical buyers_email is the
       * operator email when an operator is used.
       */
      if (buyersEmail !== operatorEmail) {
        return jsonError("Email pembeli tidak sesuai dengan email operator.");
      }
    }

    if (bringsBoat && !boatName) {
      return jsonError("Nama kapal wajib diisi.");
    }

    /*
     * -----------------------------------------------------
     * 3. Validate Pagination 2
     * -----------------------------------------------------
     */

    if (!Array.isArray(body.visitors)) {
      return jsonError("Data pengunjung tidak valid.");
    }

    if (body.visitors.length !== visitorCount) {
      return jsonError("Jumlah data pengunjung tidak sesuai.");
    }

    const visitors = body.visitors.map(
      (rawVisitor: TicketVisitorPayload, index) => {
        const visitorName = getText(rawVisitor.visitorName);

        const country = getText(rawVisitor.country);

        const gender = getText(rawVisitor.gender);

        const identityType = getText(rawVisitor.identityType);

        const identityNumber = getText(rawVisitor.identityNumber);

        if (!visitorName) {
          throw new Error(`Nama Pengunjung ${index + 1} wajib diisi.`);
        }

        if (!country) {
          throw new Error(`Negara Pengunjung ${index + 1} wajib diisi.`);
        }

        if (!isVisitorGender(gender)) {
          throw new Error(`Gender Pengunjung ${index + 1} tidak valid.`);
        }

        if (!isIdentityType(identityType)) {
          throw new Error(
            `Kartu identitas Pengunjung ${index + 1} tidak valid.`,
          );
        }

        if (!identityNumber) {
          throw new Error(
            `Nomor identitas Pengunjung ${index + 1} wajib diisi.`,
          );
        }

        return {
          visitorNumber: index + 1,
          visitorName,
          country,
          gender,
          identityType,
          identityNumber,
        };
      },
    );

    /*
     * -----------------------------------------------------
     * 4. Validate Pagination 3
     * -----------------------------------------------------
     */

    if (!Array.isArray(body.selectedAreaSlugs)) {
      return jsonError("Daftar kawasan konservasi tidak valid.");
    }

    const selectedAreaSlugs = [
      ...new Set(
        body.selectedAreaSlugs.map((value) => getText(value)).filter(Boolean),
      ),
    ];

    if (selectedAreaSlugs.length === 0) {
      return jsonError("Pilih minimal satu kawasan konservasi.");
    }

    /*
     * Fetch prices from the database.
     * Never trust prices sent by the browser.
     */
    const { data: areaData, error: areasError } = await supabaseAdmin
      .from("conservation_areas")
      .select("id, slug, name, ticket_price")
      .in("slug", selectedAreaSlugs)
      .eq("is_active", true);

    if (areasError) {
      console.error("Conservation area lookup failed:", areasError);

      return jsonError("Kawasan konservasi belum dapat dimuat.", 500);
    }

    const selectedAreas = (areaData as ConservationAreaRow[] | null) ?? [];

    if (selectedAreas.length !== selectedAreaSlugs.length) {
      return jsonError(
        "Satu atau beberapa kawasan tidak valid atau sudah tidak aktif.",
      );
    }

    /*
     * -----------------------------------------------------
     * 5. Server-side price calculation
     * -----------------------------------------------------
     */

    const pricePerVisitor = selectedAreas.reduce(
      (total, area) => total + area.ticket_price,
      0,
    );

    const subtotal = visitorCount * pricePerVisitor;

    const { data: chargeData, error: chargesError } = await supabaseAdmin
      .from("ticket_charge_items")
      .select("id, name, calculation_type, value, applies_to")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (chargesError) {
      console.error("Ticket charge lookup failed:", chargesError);
      return jsonError("Komponen biaya tiket belum dapat dimuat.", 500);
    }

    const calculatedCharges = calculateTicketCharges((chargeData as TicketCharge[] | null) ?? [], subtotal, visitorCount);
    const additionalAmount = calculatedCharges.reduce((total, charge) => total + charge.amount, 0);
    const grossAmount = subtotal + additionalAmount;

    if (!Number.isSafeInteger(grossAmount) || grossAmount <= 0) {
      return jsonError("Total pembayaran tidak valid.");
    }

    /*
     * -----------------------------------------------------
     * 6. Insert payments
     * -----------------------------------------------------
     */

    let insertedPayment: {
      id: string;
      order_id: string;
      public_status_token: string;
      ticket_code: string;
      qr_token: string;
      created_at: string;
    } | null = null;

    /*
     * Retry only if the randomly generated order ID
     * happens to collide with an existing order.
     */
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const orderId = generateBookingId();

      const { data: paymentData, error: paymentError } = await supabaseAdmin
        .from("payments")
        .insert({
          order_id: orderId,
          public_status_token: generatePublicStatusToken(),
          ticket_code: generateTicketCode(),
          qr_token: generateQrToken(),
          visiting_purpose: visitingPurpose,
          permit_documents: permitDocuments,
          issuance_source: adminIssue ? "admin_manual" : "public_checkout",
          issued_by: issuingAdminId,

          item_name: "Tiket Kawasan Konservasi",

          /*
           * Keep amount for compatibility with your
           * original payments schema.
           */
          amount: grossAmount,

          status: "pending",

          purchase_type: purchaseType,

          uses_operator: usesOperator,

          operator_name: usesOperator ? operatorName : null,

          operator_email: usesOperator ? operatorEmail : null,

          operator_type: usesOperator ? operatorType : null,

          operator_type_other:
            usesOperator && operatorType === "other" ? operatorTypeOther : null,

          brings_boat: bringsBoat,

          boat_name: bringsBoat ? boatName : null,

          visitor_count: visitorCount,

          buyer_name: buyerName,

          buyers_email: buyersEmail,

          /*
           * For the current design all area prices
           * are normally Rp50,000. The detailed
           * snapshots are also stored in the
           * relation table below.
           */
          ticket_price: selectedAreas[0]?.ticket_price ?? 0,

          zone_count: selectedAreas.length,

          subtotal,

          /*
           * Legacy production schemas require this compatibility column.
           * Checkout v2 stores the real charge breakdown in metadata, so 0
           * accurately indicates that no single tax percentage applies.
           */
          tax_percentage: 0,

          tax_amount: additionalAmount,

          gross_amount: grossAmount,

          ticket_email_status: "not_sent",

          metadata: {
            checkout_version: 2,
            price_per_visitor: pricePerVisitor,
            charge_items: calculatedCharges,
          },
        })
        .select(
          `
            id,
            order_id,
            public_status_token,
            ticket_code,
            qr_token,
            created_at
          `,
        )
        .single();

      if (!paymentError && paymentData) {
        insertedPayment = paymentData;
        paymentId = paymentData.id;
        break;
      }

      if (paymentError?.code !== "23505") {
        console.error("Payment insert failed:", paymentError);

        return jsonError("Booking belum dapat disimpan.", 500);
      }
    }

    if (!insertedPayment || !paymentId) {
      return jsonError("Booking ID belum dapat dibuat.", 500);
    }

    /*
     * -----------------------------------------------------
     * 7. Insert visitor records
     * -----------------------------------------------------
     */

    const visitorRows = visitors.map((visitor) => ({
      payment_id: paymentId,

      visitor_number: visitor.visitorNumber,

      visitor_name: visitor.visitorName,

      country: visitor.country,

      gender: visitor.gender,

      identity_type: visitor.identityType,

      identity_number: visitor.identityNumber,
    }));

    const { error: visitorsError } = await supabaseAdmin
      .from("ticket_visitors")
      .insert(visitorRows);

    if (visitorsError) {
      console.error("Visitor insert failed:", visitorsError);

      /*
       * Deleting the payment should cascade-delete
       * related child records.
       */
      await supabaseAdmin.from("payments").delete().eq("id", paymentId);

      return jsonError("Data pengunjung belum dapat disimpan.", 500);
    }

    /*
     * -----------------------------------------------------
     * 8. Insert conservation-area relations
     * -----------------------------------------------------
     */

    const areaRows = selectedAreas.map((area) => ({
      payment_id: paymentId,

      conservation_area_id: area.id,

      area_name_snapshot: area.name,

      ticket_price_snapshot: area.ticket_price,
    }));

    const { error: relationsError } = await supabaseAdmin
      .from("payment_conservation_areas")
      .insert(areaRows);

    if (relationsError) {
      console.error("Payment area insert failed:", relationsError);

      await supabaseAdmin.from("payments").delete().eq("id", paymentId);

      return jsonError("Tujuan kawasan belum dapat disimpan.", 500);
    }

    if (adminIssue && issuingAdminId) {
      const baseUrl = getBaseUrl(request);
      let paymentUrl: string;

      try {
        paymentUrl = await createMidtransPaymentLink({
          orderId: insertedPayment.order_id,
          grossAmount,
          buyerName,
          buyerEmail: buyersEmail,
          finishUrl: `${baseUrl}/payment/finish/${encodeURIComponent(
            insertedPayment.public_status_token,
          )}`,
        });
      } catch (error) {
        console.error("Admin Midtrans Payment Link failed:", error);
        await supabaseAdmin.from("payments").delete().eq("id", paymentId);
        return jsonError(
          error instanceof Error
            ? error.message
            : "Payment Link belum dapat dibuat.",
          502,
        );
      }

      const { error: linkUpdateError } = await supabaseAdmin
        .from("payments")
        .update({
          payment_type: "snap",
          payment_link_url: paymentUrl,
          payment_link_sent_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", paymentId);

      if (linkUpdateError) {
        console.error("Payment Link persistence failed:", linkUpdateError);
        return jsonError("Payment Link belum dapat disimpan.", 500);
      }

      try {
        await sendPaymentLinkEmail({
          orderId: insertedPayment.order_id,
          buyerName,
          buyerEmail: buyersEmail,
          paymentUrl,
          grossAmount,
        });
      } catch (error) {
        console.error("Payment Link email delivery failed:", error);
        return jsonError(
          error instanceof Error
            ? `Payment Link dibuat, tetapi email gagal dikirim: ${error.message}`
            : "Payment Link dibuat, tetapi email gagal dikirim.",
          502,
        );
      }

      const sentAt = new Date().toISOString();
      const { error: sentStatusError } = await supabaseAdmin
        .from("payments")
        .update({
          payment_link_sent_at: sentAt,
          updated_at: sentAt,
        })
        .eq("id", paymentId);

      if (sentStatusError) {
        console.error("Payment Link sent-status persistence failed:", sentStatusError);
      }

      const { error: logError } = await supabaseAdmin
        .from("activity_logs")
        .insert({
          actor_id: issuingAdminId,
          action: "admin_payment_link_sent",
          entity_type: "payment",
          entity_id: paymentId,
          metadata: {
            order_id: insertedPayment.order_id,
            visiting_purpose: visitingPurpose,
            permit_document_count: permitDocuments.length,
            recipient_email: buyersEmail,
            visitor_count: visitorCount,
            conservation_area_count: selectedAreas.length,
            payment_handling: "snap_url_email",
          },
        });

      if (logError) {
        console.error("Admin ticket audit log failed:", logError);
      }

      return NextResponse.json(
        {
          paymentLinkSent: true,
          orderId: insertedPayment.order_id,
          buyerName,
          buyersEmail,
          visitingPurpose,
          permitDocumentCount: permitDocuments.length,
          paymentUrl,
          paymentLinkSentAt: sentAt,
          paymentLinkStored: !sentStatusError,
          auditLogged: !logError,
        },
        { status: 201 },
      );
    }

    /*
     * -----------------------------------------------------
     * 9. Return safe booking summary
     * -----------------------------------------------------
     */

    return NextResponse.json(
      {
        orderId: insertedPayment.order_id,

        publicStatusToken: insertedPayment.public_status_token,

        purchaseDate: insertedPayment.created_at,

        buyerName,

        buyersEmail,

        operatorName: usesOperator ? operatorName : null,

        boatName: bringsBoat ? boatName : null,

        visitorCount,

        zoneCount: selectedAreas.length,

        selectedAreas: selectedAreas.map((area) => ({
          slug: area.slug,
          name: area.name,
          ticketPrice: area.ticket_price,
        })),

        pricePerVisitor,

        subtotal,

        taxPercentage: 0,

        taxAmount: additionalAmount,
        chargeItems: calculatedCharges,

        grossAmount,

        /*
         * Snap token is created later by:
         * /api/midtrans/create-transaction
         */
        snapToken: null,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error("Unexpected ticket preparation error:", error);

    /*
     * Remove an incomplete booking when an error occurs
     * after the payments row has been created.
     */
    if (paymentId) {
      const { error: cleanupError } = await supabaseAdmin
        .from("payments")
        .delete()
        .eq("id", paymentId);

      if (cleanupError) {
        console.error("Incomplete booking cleanup failed:", cleanupError);
      }
    }

    return jsonError(
      error instanceof Error ? error.message : "Booking belum dapat dibuat.",
      500,
    );
  }
}
