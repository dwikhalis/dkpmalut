import { redirect } from "next/navigation";

import NavigationButton from "@/app/components/NavigationButton";
import TicketQrCode from "@/app/components/TicketQrCode";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    ticketCode: string;
  }>;
};

type PaymentRow = {
  id: string;
  order_id: string;
  item_name: string | null;
  amount: number | null;
  gross_amount: number | null;
  status: string;
  scanned: string | null;
  ticket_code: string | null;
  visitor_count: number | null;
  buyer_name: string | null;
  paid_at: string | null;
  expires_at: string | null;
};

type TicketVisitorRow = {
  visitor_name: string;
  country: string | null;
};

type TicketAreaRow = {
  area_name_snapshot: string;
};

function formatDateTime(value: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRupiah(value: number | null) {
  return `Rp${Number(value ?? 0).toLocaleString("id-ID")}`;
}

function getTicketState(ticket: PaymentRow) {
  const expiresAt = ticket.expires_at ? new Date(ticket.expires_at) : null;
  const isPaid = ticket.status === "paid";
  const isExpired = !expiresAt || expiresAt < new Date();
  const isScanned = ticket.scanned === "scanned";

  if (!isPaid) {
    return {
      label: "Belum Aktif",
      tone: "amber",
      description: "Pembayaran tiket belum terverifikasi.",
    };
  }

  if (isExpired) {
    return {
      label: "Kedaluwarsa",
      tone: "red",
      description: "Masa berlaku tiket sudah berakhir.",
    };
  }

  if (isScanned) {
    return {
      label: "Sudah Digunakan",
      tone: "amber",
      description: "Tiket ini sudah pernah dipindai oleh petugas.",
    };
  }

  return {
    label: "Aktif",
    tone: "green",
    description: "Tiket valid dan dapat ditunjukkan kepada petugas.",
  };
}

function StatusBadge({ tone, label }: { tone: string; label: string }) {
  const className =
    tone === "green"
      ? "bg-green-50 text-green-700 ring-green-200"
      : tone === "red"
        ? "bg-red-50 text-red-700 ring-red-200"
        : "bg-amber-50 text-amber-700 ring-amber-200";

  return (
    <span
      className={`inline-flex rounded-full px-4 py-2 text-sm font-semibold ring-1 ${className}`}
    >
      {label}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl bg-stone-50 p-4 ring-1 ring-stone-200">
      <p className="text-sm text-stone-500">{label}</p>
      <div className="mt-1 min-w-0 break-words font-semibold text-stone-900 [overflow-wrap:anywhere]">
        {value}
      </div>
    </div>
  );
}

function NotFoundTicket() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-50 via-stone-50 to-sky-100 px-4 py-12">
      <section className="w-full max-w-xl rounded-2xl border border-stone-100 bg-white p-7 text-center shadow-xl md:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-3xl font-bold text-red-700">
          !
        </div>

        <h1 className="mt-6 text-2xl font-semibold text-stone-900">
          Tiket Tidak Ditemukan
        </h1>

        <p className="mt-4 leading-7 text-stone-600">
          Kode tiket tidak valid atau belum tersedia di sistem.
        </p>

        <NavigationButton
          href="/"
          className="mt-7 w-full rounded-xl bg-sky-800 px-7 py-3 font-medium text-white transition hover:bg-sky-900"
        >
          Kembali ke Beranda
        </NavigationButton>
      </section>
    </main>
  );
}

export default async function TicketVerifyPage({ params }: PageProps) {
  const { ticketCode } = await params;
  const normalizedTicketCode = decodeURIComponent(ticketCode || "").trim();

  if (!normalizedTicketCode) {
    redirect("/404");
  }

  const { data: ticketData, error: ticketError } = await supabaseAdmin
    .from("payments")
    .select(
      `
        id,
        order_id,
        item_name,
        amount,
        gross_amount,
        status,
        scanned,
        ticket_code,
        visitor_count,
        buyer_name,
        paid_at,
        expires_at
      `,
    )
    .eq("qr_token", normalizedTicketCode)
    .maybeSingle();

  if (ticketError) {
    console.error("Ticket verification lookup failed:", ticketError);
    redirect("/404");
  }

  if (!ticketData) {
    return <NotFoundTicket />;
  }

  const ticket = ticketData as PaymentRow;

  const [visitorResult, areaResult] = await Promise.all([
    supabaseAdmin
      .from("ticket_visitors")
      .select("visitor_name, country")
      .eq("payment_id", ticket.id)
      .order("visitor_number", {
        ascending: true,
      }),
    supabaseAdmin
      .from("payment_conservation_areas")
      .select("area_name_snapshot")
      .eq("payment_id", ticket.id),
  ]);

  if (visitorResult.error || areaResult.error) {
    console.error("Ticket verification details lookup failed:", {
      visitorError: visitorResult.error,
      areaError: areaResult.error,
    });
  }

  const visitorRows = (visitorResult.data as TicketVisitorRow[] | null) ?? [];
  const areaRows = (areaResult.data as TicketAreaRow[] | null) ?? [];
  const state = getTicketState(ticket);

  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-50 via-stone-50 to-sky-100 px-4 py-10">
      <section className="mx-auto w-full max-w-4xl rounded-2xl border border-stone-100 bg-white p-6 shadow-xl md:p-10">
        <div className="flex flex-col gap-5 border-b border-stone-200 pb-7 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-medium text-sky-800">Verifikasi Tiket</p>

            <p className="mt-2 max-w-full break-words text-xl font-semibold leading-snug text-stone-900 sm:text-2xl md:text-3xl">
              {ticket.item_name || "Tiket Kawasan Konservasi"}
            </p>

            <p className="mt-3 max-w-2xl leading-7 text-stone-600">
              {state.description}
            </p>
          </div>

          <StatusBadge tone={state.tone} label={state.label} />
        </div>

        <div className="mt-7 grid gap-6 lg:grid-cols-[240px_1fr]">
          <aside className="rounded-2xl bg-stone-50 p-5 text-center ring-1 ring-stone-200">
            <div className="mx-auto flex aspect-square w-full max-w-48 items-center justify-center rounded-xl bg-white p-3 shadow-sm">
              <TicketQrCode value={normalizedTicketCode} />
            </div>

            <p className="mt-4 text-sm font-medium text-stone-900">QR Tiket</p>

          </aside>

          <div className="grid gap-4 md:grid-cols-2">
            <InfoRow label="Booking ID" value={ticket.order_id} />
            <InfoRow label="Ticket Code" value={ticket.ticket_code} />
            <InfoRow label="Nama Pemesan" value={ticket.buyer_name || "-"} />
            <InfoRow
              label="Jumlah Pengunjung"
              value={ticket.visitor_count ?? visitorRows.length}
            />
            <InfoRow
              label="Total Pembayaran"
              value={formatRupiah(ticket.gross_amount ?? ticket.amount)}
            />
            <InfoRow
              label="Status Scan"
              value={
                ticket.scanned === "scanned"
                  ? "Sudah dipindai"
                  : "Belum dipindai"
              }
            />
            <InfoRow
              label="Dibayar Pada"
              value={formatDateTime(ticket.paid_at)}
            />
            <InfoRow
              label="Berlaku Sampai"
              value={formatDateTime(ticket.expires_at)}
            />
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <section>
            <h2 className="text-lg font-semibold text-stone-900">Pengunjung</h2>

            <div className="mt-3 space-y-2">
              {visitorRows.length > 0 ? (
                visitorRows.map((visitor, index) => (
                  <div
                    key={`${visitor.visitor_name}-${index}`}
                    className="rounded-xl bg-stone-50 p-4 text-sm ring-1 ring-stone-200"
                  >
                    <p className="font-semibold text-stone-900">
                      {visitor.visitor_name}
                    </p>
                    <p className="mt-1 text-stone-600">
                      {visitor.country || "-"}
                    </p>
                  </div>
                ))
              ) : (
                <p className="rounded-xl bg-stone-50 p-4 text-sm text-stone-600 ring-1 ring-stone-200">
                  Data pengunjung tidak tersedia.
                </p>
              )}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-stone-900">Tujuan</h2>

            <div className="mt-3 space-y-2">
              {areaRows.length > 0 ? (
                areaRows.map((area, index) => (
                  <div
                    key={`${area.area_name_snapshot}-${index}`}
                    className="rounded-xl bg-sky-50 p-4 text-sm font-semibold text-sky-900 ring-1 ring-sky-100"
                  >
                    {area.area_name_snapshot}
                  </div>
                ))
              ) : (
                <p className="rounded-xl bg-stone-50 p-4 text-sm text-stone-600 ring-1 ring-stone-200">
                  Data kawasan tidak tersedia.
                </p>
              )}
            </div>
          </section>
        </div>

        <div className="mt-8 border-t border-stone-200 pt-6">
          <p className="text-sm leading-6 text-stone-500">
            Halaman ini hanya menampilkan status tiket. Validasi masuk kawasan
            tetap dilakukan oleh petugas melalui pemindaian QR.
          </p>

          <p className="mt-4 text-sm font-bold leading-6 text-stone-800">
            Untuk melihat riwayat pembelian tiket, silakan masuk menggunakan
            email pembelian tiket.
          </p>

          <NavigationButton
            href="/masuk"
            className="mt-4 w-full rounded-xl border border-sky-800 px-7 py-3 font-medium text-sky-800 transition hover:bg-sky-50"
          >
            Masuk
          </NavigationButton>
        </div>
      </section>
    </main>
  );
}
