// app/components/DashTicketHistory.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase/supabaseClient";
import { useLocaleStore } from "@/app/Stores/localeStore";

type Ticket = {
  id: string;
  order_id: string;
  item_name: string;
  amount: number;
  status: string;
  scanned: "unscanned" | "scanned";
  ticket_code: string;
  qr_data_url: string | null;
  ticket_count: number;
  visitor_names: string[];
  nationality: string;
  selected_zones: string[];
  use_own_boat: boolean;
  boat_name: string | null;
  customer_name: string;
  customer_email: string;
  paid_at: string | null;
  expires_at: string | null;
  created_at: string;
};

const TICKET_TIME_ZONE = "Asia/Jayapura";

function getDateParts(value: string, locale: "id" | "en") {
  const parts = new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-GB", {
    timeZone: TICKET_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).formatToParts(new Date(value));

  const day = parts.find((part) => part.type === "day")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const year = parts.find((part) => part.type === "year")?.value ?? "";

  return `${day} ${month} ${year}`;
}

function formatDate(value: string | null, locale: "id" | "en") {
  if (!value) return "-";

  return getDateParts(value, locale);
}

function formatDateTime(value: string | null, locale: "id" | "en") {
  if (!value) return "-";

  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: TICKET_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));

  return `${getDateParts(value, locale)} / ${time} UTC+9`;
}

function formatRupiah(value: number) {
  return `Rp${value.toLocaleString("id-ID")}`;
}

export default function DashTicketHistory() {
  const locale = useLocaleStore((state) => state.locale);
  const labels =
    locale === "id"
      ? {
          activeTickets: "Tiket Aktif",
          expiredTickets: "Tiket Kedaluwarsa",
          active: "AKTIF",
          expired: "KEDALUWARSA",
          orderId: "ID Pesanan",
          visitor: "Pengunjung",
          total: "Total",
          purchasedAt: "Tanggal",
          expires: "Berlaku hingga",
          expiredAt: "Kedaluwarsa pada",
          scanned: "Sudah Dipakai",
          unscanned: "Belum Dipakai",
          loading: "Memuat tiket...",
          loginRequired: "Silakan masuk untuk melihat riwayat tiket.",
          loadFailed: "Tiket belum dapat dimuat.",
          noActive: "Tidak ada tiket aktif.",
          noExpired: "Tidak ada tiket kedaluwarsa.",
          buyTicket: "Beli Tiket",
        }
      : {
          activeTickets: "Active Tickets",
          expiredTickets: "Expired Tickets",
          active: "ACTIVE",
          expired: "EXPIRED",
          orderId: "Order ID",
          visitor: "Visitors",
          total: "Total",
          purchasedAt: "Date",
          expires: "Valid until",
          expiredAt: "Expired on",
          scanned: "Used",
          unscanned: "Not Used",
          loading: "Loading tickets...",
          loginRequired: "Please sign in to view your ticket history.",
          loadFailed: "Tickets could not be loaded.",
          noActive: "There are no active tickets.",
          noExpired: "There are no expired tickets.",
          buyTicket: "Buy Ticket",
        };
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const activeTickets = useMemo(() => {
    const now = new Date();

    return tickets.filter((ticket) => {
      if (!ticket.expires_at) return false;
      return new Date(ticket.expires_at) >= now;
    });
  }, [tickets]);

  const expiredTickets = useMemo(() => {
    const now = new Date();

    return tickets.filter((ticket) => {
      if (!ticket.expires_at) return true;
      return new Date(ticket.expires_at) < now;
    });
  }, [tickets]);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        setLoading(true);
        setMsg(null);

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          setMsg(labels.loginRequired);
          return;
        }

        const response = await fetch("/api/tickets/history", {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(labels.loadFailed);
        }

        setTickets(data.tickets || []);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : labels.loadFailed;

        setMsg(message);
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, [labels.loadFailed, labels.loginRequired]);

  if (msg) {
    return (
      <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{msg}</p>
    );
  }

  return (
    <section className="min-h-[70vh] w-full min-w-0 space-y-8">
      <div>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-stone-900">
            {labels.activeTickets}
          </h1>

          <Link
            href="/payment"
            className="shrink-0 rounded-xl bg-sky-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-800"
          >
            {labels.buyTicket}
          </Link>
        </div>

        <div className="mt-4 grid min-w-0 gap-4 xl:grid-cols-2">
          {loading ? (
            <p className="rounded-xl bg-stone-50 p-4 text-sm text-stone-600 ring-1 ring-stone-200">
              {labels.loading}
            </p>
          ) : activeTickets.length > 0 ? (
            activeTickets.map((ticket) => (
              <article
                key={ticket.id}
                className="min-w-0 rounded-2xl border border-sky-100 bg-white p-5 shadow-xl"
              >
                <div className="flex flex-col gap-4 sm:flex-row">
                  <div className="flex shrink-0 flex-col gap-2">
                    <div className="flex items-center justify-center rounded-xl bg-stone-50 p-3 ring-1 ring-stone-200">
                      {ticket.qr_data_url && (
                        <Image
                          src={ticket.qr_data_url}
                          width={140}
                          height={140}
                          alt="QR tiket"
                          unoptimized
                        />
                      )}
                    </div>

                    <div className="flex flex-col items-stretch overflow-hidden rounded-xl bg-white ring-1 ring-stone-200">
                      <span className="w-full bg-emerald-100 px-3 py-2 text-center text-xs font-semibold text-emerald-800">
                        {labels.active}
                      </span>

                      <p className="p-3 text-center text-xs text-stone-600">
                        {ticket.scanned === "scanned"
                          ? labels.scanned
                          : labels.unscanned}
                      </p>
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="mt-1 font-semibold text-stone-900">
                      {ticket.item_name}
                    </h3>

                    {ticket.selected_zones.length > 0 && (
                      <div className="mt-2 flex flex-col items-start gap-1.5">
                        {ticket.selected_zones.map((zone) => (
                          <span
                            key={zone}
                            className="max-w-full rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-800 break-words"
                          >
                            {zone}
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="mt-2 text-sm text-stone-600">
                      {labels.orderId}: {ticket.order_id}
                    </p>
                    <p className="mt-2 font-mono text-sm font-bold text-stone-800">
                      Ticket Code: {ticket.ticket_code}
                    </p>

                    <p className="text-sm text-stone-600">
                      {labels.purchasedAt}: {formatDateTime(ticket.paid_at, locale)}
                    </p>

                    <p className="text-sm text-stone-600">
                      {labels.visitor}: {ticket.ticket_count}
                    </p>

                    <p className="text-sm text-stone-600">
                      {labels.total}: {formatRupiah(ticket.amount)}
                    </p>

                    <p className="text-sm text-stone-600">
                      {labels.expires}: {formatDate(ticket.expires_at, locale)}
                    </p>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <p className="rounded-xl bg-stone-50 p-4 text-sm text-stone-600 ring-1 ring-stone-200">
              {labels.noActive}
            </p>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-stone-900">{labels.expiredTickets}</h2>

        <div className="mt-4 grid min-w-0 gap-4 xl:grid-cols-2">
          {loading ? (
            <p className="rounded-xl bg-stone-50 p-4 text-sm text-stone-600 ring-1 ring-stone-200">
              {labels.loading}
            </p>
          ) : expiredTickets.length > 0 ? (
            expiredTickets.map((ticket) => (
              <article
                key={ticket.id}
                className="min-w-0 rounded-2xl border border-stone-200 bg-stone-50 p-5 shadow-sm"
              >
                <p className="text-sm font-medium text-red-700">{labels.expired}</p>

                <h3 className="mt-1 font-semibold text-stone-900">
                  {ticket.item_name}
                </h3>

                {ticket.selected_zones.length > 0 && (
                  <div className="mt-2 flex flex-col items-start gap-1.5">
                    {ticket.selected_zones.map((zone) => (
                      <span
                        key={zone}
                        className="max-w-full rounded-full bg-stone-200 px-3 py-1 text-xs font-medium text-stone-700 break-words"
                      >
                        {zone}
                      </span>
                    ))}
                  </div>
                )}

                <p className="mt-2 text-sm text-stone-600">
                  {labels.orderId}: {ticket.order_id}
                </p>
                <p className="mt-2 font-mono text-sm font-bold text-stone-800">
                  Ticket Code: {ticket.ticket_code}
                </p>

                <p className="text-sm text-stone-600">
                  {labels.visitor}: {ticket.ticket_count}
                </p>

                <p className="text-sm text-stone-600">
                  {labels.expiredAt}: {formatDate(ticket.expires_at, locale)}
                </p>
              </article>
            ))
          ) : (
            <p className="rounded-xl bg-stone-50 p-4 text-sm text-stone-600 ring-1 ring-stone-200">
              {labels.noExpired}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
