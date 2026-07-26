"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  FaDownload,
  FaEnvelope,
  FaExternalLinkAlt,
  FaRedo,
  FaTicketAlt,
} from "react-icons/fa";

import AlertNotif from "../AlertNotif";
import { supabase } from "@/lib/supabase/supabaseClient";
import AuthAdminAccess from "@/app/Auth/AuthAdminAccess";

type EmailStatus = "not_sent" | "sending" | "sent" | "failed";
type TicketOrigin = "user" | "partner" | "admin";

type Ticket = {
  id: string;
  order_id: string;
  item_name: string;
  amount: number;
  status: string;
  scanned: "unscanned" | "scanned";
  ticket_code: string | null;
  visitor_count: number;
  visitor_names: string[];
  selected_zones: string[];
  customer_name: string;
  customer_email: string;
  paid_at: string | null;
  expires_at: string | null;
  created_at: string;
  visiting_purpose: string;
  permit_document_count: number;
  payment_link_url: string | null;
  payment_link_sent_at: string | null;
  ticket_email_status: EmailStatus;
  ticket_email_sent_at: string | null;
  ticket_email_error: string | null;
  origin: TicketOrigin;
};

type Notice = {
  type: "success" | "error";
  message: string;
};

const paymentLabels: Record<string, string> = {
  pending: "Awaiting Payment",
  paid: "Paid",
  failed: "Failed",
  expire: "Expired",
  expired: "Expired",
  cancel: "Cancelled",
  cancelled: "Cancelled",
  refund: "Refunded",
  refunded: "Refunded",
  challenge: "Under Review",
};

const emailLabels: Record<EmailStatus, string> = {
  not_sent: "Not Sent",
  sending: "Sending",
  sent: "Sent",
  failed: "Sending Failed",
};

const originLabels: Record<TicketOrigin, string> = {
  user: "User",
  partner: "Partner",
  admin: "Admin",
};

const originBadges: Record<TicketOrigin, string> = {
  user: "bg-violet-100 text-violet-700",
  partner: "bg-teal-100 text-teal-700",
  admin: "bg-blue-100 text-blue-700",
};

const monthLabels = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const ticketDatePartsFormatter = new Intl.DateTimeFormat("en-US", {
  month: "numeric",
  year: "numeric",
  timeZone: "Asia/Jayapura",
});

function getTicketMonthYear(value: string) {
  const parts = ticketDatePartsFormatter.formatToParts(new Date(value));
  return {
    month: parts.find((part) => part.type === "month")?.value || "",
    year: parts.find((part) => part.type === "year")?.value || "",
  };
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jayapura",
  }).format(new Date(value));
}

function paymentBadge(status: string) {
  if (status === "paid") return "bg-emerald-100 text-emerald-700";
  if (status === "pending" || status === "challenge")
    return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

function emailBadge(status: EmailStatus) {
  if (status === "sent") return "bg-emerald-100 text-emerald-700";
  if (status === "failed") return "bg-red-100 text-red-700";
  return "bg-slate-100 text-slate-600";
}

function ticketLifecycle(ticket: Ticket) {
  if (ticket.status !== "paid") {
    return {
      label: "Tidak Aktif",
      className: "bg-slate-100 text-slate-600",
      active: false,
    };
  }
  if (!ticket.expires_at || new Date(ticket.expires_at) <= new Date()) {
    return {
      label: "Kedaluwarsa",
      className: "bg-red-100 text-red-700",
      active: false,
    };
  }
  if (ticket.scanned === "scanned") {
    return {
      label: "Sudah Dipindai",
      className: "bg-stone-200 text-stone-700",
      active: false,
    };
  }
  return {
    label: "Aktif",
    className: "bg-sky-100 text-sky-700",
    active: true,
  };
}

export default function DashTicketHistoryAdmin() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [origin, setOrigin] = useState<"all" | TicketOrigin>("all");
  const [month, setMonth] = useState("all");
  const [year, setYear] = useState("all");
  const [notice, setNotice] = useState<Notice | null>(null);

  const getToken = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Admin session is unavailable.");
      const response = await fetch("/api/admin/tickets/history", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.message || "Unable to load tickets.");
      setTickets(body.tickets || []);
    } catch (error) {
      setNotice({
        type: "error",
        message:
          error instanceof Error ? error.message : "Unable to load tickets.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  const availableYears = useMemo(
    () =>
      [
        ...new Set(
          tickets
            .map((ticket) => getTicketMonthYear(ticket.created_at).year)
            .filter(Boolean),
        ),
      ].sort((left, right) => Number(right) - Number(left)),
    [tickets],
  );

  const filteredTickets = useMemo(() => {
    const term = search.trim().toLowerCase();
    return tickets.filter((ticket) => {
      const ticketDate = getTicketMonthYear(ticket.created_at);
      const matchesOrigin = origin === "all" || ticket.origin === origin;
      const matchesMonth = month === "all" || ticketDate.month === month;
      const matchesYear = year === "all" || ticketDate.year === year;
      const matchesSearch =
        !term ||
        [
          ticket.order_id,
          ticket.ticket_code,
          ticket.customer_name,
          ticket.customer_email,
          ticket.visiting_purpose,
          originLabels[ticket.origin],
        ].some((value) => value?.toLowerCase().includes(term));
      return matchesOrigin && matchesMonth && matchesYear && matchesSearch;
    });
  }, [month, origin, search, tickets, year]);

  const resend = async (ticket: Ticket) => {
    setBusyId(ticket.id);
    try {
      const token = await getToken();
      if (!token) throw new Error("Admin session is unavailable.");
      const response = await fetch(`/api/admin/tickets/${ticket.id}/resend`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.message || "Email could not be sent.");
      setNotice({
        type: "success",
        message: "Ticket email sent successfully.",
      });
      await loadTickets();
    } catch (error) {
      setNotice({
        type: "error",
        message:
          error instanceof Error ? error.message : "Email could not be sent.",
      });
    } finally {
      setBusyId(null);
    }
  };

  const refreshPayment = async (ticket: Ticket) => {
    setBusyId(ticket.id);
    try {
      const token = await getToken();
      if (!token) throw new Error("Admin session is unavailable.");
      const response = await fetch(
        `/api/admin/tickets/${ticket.id}/refresh-payment`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const body = await response.json();
      if (!response.ok) {
        throw new Error(
          body.message || "Status pembayaran tidak dapat diperbarui.",
        );
      }
      await loadTickets();
      setNotice({
        type: "success",
        message: body.message || "Status pembayaran berhasil diperbarui.",
      });
    } catch (error) {
      setNotice({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Status pembayaran tidak dapat diperbarui.",
      });
    } finally {
      setBusyId(null);
    }
  };

  const downloadPdf = async (ticket: Ticket) => {
    setBusyId(ticket.id);
    try {
      const token = await getToken();
      if (!token) throw new Error("Admin session is unavailable.");
      const response = await fetch(`/api/admin/tickets/${ticket.id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.message || "PDF could not be generated.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `ticket-${ticket.order_id}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setNotice({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "PDF could not be generated.",
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AuthAdminAccess>
      <main className="mx-auto min-h-[70vh] w-full max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <header className="flex w-full flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="grow">
            <p className="text-sm font-semibold uppercase tracking-wide text-sky-800">
              Administrasi
            </p>
            <h1 className="mt-1 text-3xl font-bold text-stone-900">
              Riwayat Tiket
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
              Pantau seluruh tiket yang dibuat oleh user, partner, dan admin,
              termasuk tiket aktif, dipindai, dan kedaluwarsa.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row md:w-60 md:flex-col lg:w-44">
            <button
              type="button"
              onClick={() => void loadTickets()}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-sky-900 px-4 text-sm font-bold text-sky-900 hover:bg-sky-50"
            >
              <FaRedo /> Refresh
            </button>
            <Link
              href="/admin/tickets/generator"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-sky-800 px-4 text-sm font-bold text-white shadow-lg hover:bg-sky-900"
            >
              <FaTicketAlt /> Buat Tiket
            </Link>
          </div>
        </header>

        <section className="grid gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_13rem_11rem_9rem]">
          <label className="text-xs font-bold text-stone-600">
            Cari tiket
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Pesanan, kode, nama, atau email"
              className="flex justify-center items-center mt-1 w-full rounded-lg text-sm font-normal text-stone-800 outline-none focus:border-sky-600"
            />
          </label>
          <label className="text-xs font-bold text-stone-600">
            Dibuat oleh
            <select
              value={origin}
              onChange={(event) =>
                setOrigin(event.target.value as "all" | TicketOrigin)
              }
              className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm font-normal text-stone-800 outline-none focus:border-sky-600"
            >
              <option value="all">Semua pembuat</option>
              <option value="user">User</option>
              <option value="partner">Partner</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <label className="text-xs font-bold text-stone-600">
            Bulan
            <select
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm font-normal text-stone-800 outline-none focus:border-sky-600"
            >
              <option value="all">Semua bulan</option>
              {monthLabels.map((label, index) => (
                <option key={label} value={String(index + 1)}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-bold text-stone-600">
            Tahun
            <select
              value={year}
              onChange={(event) => setYear(event.target.value)}
              className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm font-normal text-stone-800 outline-none focus:border-sky-600"
            >
              <option value="all">Semua tahun</option>
              {availableYears.map((availableYear) => (
                <option key={availableYear} value={availableYear}>
                  {availableYear}
                </option>
              ))}
            </select>
          </label>
        </section>

        {loading ? (
          <div className="flex min-h-48 items-center justify-center rounded-2xl border border-stone-200 bg-white text-stone-500">
            Memuat tiket...
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center text-stone-500">
            Tidak ada tiket.
          </div>
        ) : (
          <section className="space-y-4">
            <p className="text-sm text-stone-500">
              Menampilkan {filteredTickets.length} dari {tickets.length} tiket
            </p>
            {filteredTickets.map((ticket) => {
              const lifecycle = ticketLifecycle(ticket);
              const canDownload = ticket.status === "paid";
              const canResend =
                lifecycle.active &&
                ["failed", "not_sent"].includes(ticket.ticket_email_status);
              return (
                <article
                  key={ticket.id}
                  className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:justify-between">
                    <div className="min-w-0 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${paymentBadge(ticket.status)}`}
                        >
                          {paymentLabels[ticket.status] || ticket.status}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${emailBadge(ticket.ticket_email_status)}`}
                        >
                          Email: {emailLabels[ticket.ticket_email_status]}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${originBadges[ticket.origin]}`}
                        >
                          Dibuat oleh: {originLabels[ticket.origin]}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${lifecycle.className}`}
                        >
                          {lifecycle.label}
                        </span>
                      </div>

                      <div>
                        <h2 className="font-bold text-stone-900">
                          {ticket.customer_name}
                        </h2>
                        <p className="break-all text-sm text-stone-500">
                          {ticket.customer_email}
                        </p>
                      </div>

                      <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2 xl:grid-cols-3">
                        <div>
                          <dt className="text-slate-400">Order ID</dt>
                          <dd className="font-semibold text-slate-700">
                            {ticket.order_id}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-slate-400">Ticket Code</dt>
                          <dd className="font-semibold text-slate-700">
                            {ticket.ticket_code || "-"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-slate-400">Amount</dt>
                          <dd className="font-semibold text-slate-700">
                            Rp{ticket.amount.toLocaleString("id-ID")}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-slate-400">Created</dt>
                          <dd className="text-slate-700">
                            {formatDate(ticket.created_at)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-slate-400">Paid</dt>
                          <dd className="text-slate-700">
                            {formatDate(ticket.paid_at)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-slate-400">Valid Until</dt>
                          <dd className="text-slate-700">
                            {formatDate(ticket.expires_at)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-slate-400">Visiting Purpose</dt>
                          <dd className="text-slate-700">
                            {ticket.visiting_purpose || "-"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-slate-400">Visitors / Permits</dt>
                          <dd className="text-slate-700">
                            {ticket.visitor_count} /{" "}
                            {ticket.permit_document_count} documents
                          </dd>
                        </div>
                        <div>
                          <dt className="text-slate-400">Area</dt>
                          <dd className="text-slate-700">
                            {ticket.selected_zones.join(", ") || "-"}
                          </dd>
                        </div>
                      </dl>

                      {ticket.ticket_email_status === "failed" &&
                        ticket.ticket_email_error && (
                          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                            <strong>Email error:</strong>{" "}
                            {ticket.ticket_email_error}
                          </p>
                        )}
                    </div>

                    <div className="flex shrink-0 flex-wrap content-start gap-2 lg:max-w-52 lg:flex-col">
                      <button
                        type="button"
                        disabled={busyId === ticket.id}
                        onClick={() => void refreshPayment(ticket)}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-wait disabled:opacity-60"
                      >
                        <FaRedo
                          className={
                            busyId === ticket.id ? "animate-spin" : undefined
                          }
                        />
                        Refresh Payment
                      </button>
                      {ticket.payment_link_url && ticket.status !== "paid" && (
                        <a
                          href={ticket.payment_link_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-sky-200 px-3 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-50"
                        >
                          <FaExternalLinkAlt /> Payment Link
                        </a>
                      )}
                      <button
                        type="button"
                        disabled={!canDownload || busyId === ticket.id}
                        onClick={() => void downloadPdf(ticket)}
                        title={
                          !canDownload
                            ? "Available after successful payment"
                            : undefined
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        <FaDownload /> Download PDF
                      </button>
                      {canResend && (
                        <button
                          type="button"
                          disabled={busyId === ticket.id}
                          onClick={() => void resend(ticket)}
                          className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
                        >
                          <FaEnvelope /> Resend Ticket
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        {notice && (
          <AlertNotif
            type="single"
            msg={notice.message}
            yesText="OK"
            icon={notice.type === "success" ? "success" : "failed"}
            confirm={() => setNotice(null)}
          />
        )}
      </main>
    </AuthAdminAccess>
  );
}
