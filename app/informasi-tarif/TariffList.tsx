"use client";

import { useEffect, useState } from "react";

import SpinnerLoading from "@/app/components/SpinnerLoading";
import { supabase } from "@/lib/supabase/supabaseClient";

type Tariff = {
  id: string;
  slug: string;
  name: string;
  ticket_price: number;
};

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function TariffList() {
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadTariffs() {
      const { data, error: queryError } = await supabase
        .from("conservation_areas")
        .select("id, slug, name, ticket_price")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (!mounted) return;

      if (queryError) {
        console.error("Failed to load public tariffs:", queryError.message);
        setError("Informasi tarif belum dapat dimuat. Silakan coba kembali.");
      } else {
        const validTariffs = (data ?? []).filter(
          (item): item is Tariff =>
            typeof item.id === "string" &&
            typeof item.slug === "string" &&
            typeof item.name === "string" &&
            Number.isSafeInteger(item.ticket_price) &&
            item.ticket_price > 0,
        );

        setTariffs(validTariffs);
      }

      setLoading(false);
    }

    void loadTariffs();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div
        className="flex min-h-40 items-center justify-center"
        aria-label="Memuat informasi tarif"
      >
        <SpinnerLoading size="sm" color="black" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="rounded-xl bg-red-50 p-5 text-red-700" role="alert">
        {error}
      </p>
    );
  }

  if (tariffs.length === 0) {
    return (
      <p className="rounded-xl bg-amber-50 p-5 text-amber-800">
        Belum ada tarif kawasan yang dipublikasikan.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-stone-200">
      <div className="hidden grid-cols-[1fr_auto] bg-stone-100 px-5 py-3 text-sm font-semibold text-stone-700 md:grid">
        <span>Kawasan Konservasi</span>
        <span>Tarif per Pengunjung</span>
      </div>
      <ul className="divide-y divide-stone-200">
        {tariffs.map((tariff) => (
          <li
            key={tariff.id}
            className="flex flex-col gap-2 px-5 py-4 md:flex-row md:items-center md:justify-between"
          >
            <span className="font-medium text-stone-800">{tariff.name}</span>
            <span className="font-bold text-sky-900">
              {formatRupiah(tariff.ticket_price)}
              <span className="font-normal text-stone-500"> / orang</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
