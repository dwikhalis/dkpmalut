"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { supabase } from "@/lib/supabase/supabaseClient";
import AlertNotif from "../AlertNotif";
import AccordionToggleIcon from "../AccordionToggleIcon";
import SpinnerLoading from "../SpinnerLoading";

type Area = {
  id: string;
  name: string;
  slug: string;
  ticket_price: number;
  is_active: boolean;
  display_order: number;
};

type Charge = {
  id: string;
  name: string;
  description: string | null;
  calculation_type: "percentage" | "fixed";
  value: number;
  applies_to: "subtotal" | "order" | "visitor";
  is_active: boolean;
  display_order: number;
};

const emptyCharge: Omit<Charge, "id"> = {
  name: "",
  description: "",
  calculation_type: "fixed",
  value: 0,
  applies_to: "order",
  is_active: true,
  display_order: 0,
};

function hasAreaChanged(area: Area, saved?: Area) {
  if (!saved) return true;
  return (
    Number(area.ticket_price) !== Number(saved.ticket_price) ||
    area.is_active !== saved.is_active ||
    Number(area.display_order) !== Number(saved.display_order)
  );
}

function hasChargeChanged(charge: Charge, saved?: Charge) {
  if (!saved) return true;
  return (
    charge.name !== saved.name ||
    (charge.description ?? "") !== (saved.description ?? "") ||
    charge.calculation_type !== saved.calculation_type ||
    Number(charge.value) !== Number(saved.value) ||
    charge.applies_to !== saved.applies_to ||
    charge.is_active !== saved.is_active ||
    Number(charge.display_order) !== Number(saved.display_order)
  );
}

export default function DashTicketing() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [savedAreas, setSavedAreas] = useState<Area[]>([]);
  const [charges, setCharges] = useState<Charge[]>([]);
  const [savedCharges, setSavedCharges] = useState<Charge[]>([]);
  const [draftCharge, setDraftCharge] = useState(emptyCharge);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [showNewChargeForm, setShowNewChargeForm] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Charge | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [areaResult, chargeResult] = await Promise.all([
      supabase
        .from("conservation_areas")
        .select("id, name, slug, ticket_price, is_active, display_order")
        .order("display_order"),
      supabase
        .from("ticket_charge_items")
        .select(
          "id, name, description, calculation_type, value, applies_to, is_active, display_order",
        )
        .order("display_order"),
    ]);

    if (areaResult.error) setError(areaResult.error.message);
    else {
      const loadedAreas = (areaResult.data as Area[]) ?? [];
      setAreas(loadedAreas);
      setSavedAreas(loadedAreas);
    }

    if (chargeResult.error) {
      setError(
        (current) =>
          current ??
          `${chargeResult.error.message}. Pastikan add_ticketing_admin.sql sudah dijalankan.`,
      );
    } else {
      const loadedCharges = (chargeResult.data as Charge[]) ?? [];
      setCharges(loadedCharges);
      setSavedCharges(loadedCharges);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const saveArea = async (area: Area) => {
    setSavingId(area.id);
    setError(null);
    setMessage(null);
    const { error: updateError } = await supabase
      .from("conservation_areas")
      .update({
        ticket_price: Math.round(Number(area.ticket_price)),
        is_active: area.is_active,
        display_order: Math.round(Number(area.display_order)),
      })
      .eq("id", area.id);
    setSavingId(null);
    if (updateError) setError(updateError.message);
    else {
      setSavedAreas((items) =>
        items.map((item) => (item.id === area.id ? { ...area } : item)),
      );
      setMessage(`Item ${area.name} berhasil disimpan.`);
    }
  };

  const saveCharge = async (charge: Charge) => {
    setSavingId(charge.id);
    setError(null);
    setMessage(null);
    const { error: updateError } = await supabase
      .from("ticket_charge_items")
      .update({
        name: charge.name.trim(),
        description: charge.description?.trim() || null,
        calculation_type: charge.calculation_type,
        value: Number(charge.value),
        applies_to: charge.applies_to,
        is_active: charge.is_active,
        display_order: Math.round(Number(charge.display_order)),
      })
      .eq("id", charge.id);
    setSavingId(null);
    if (updateError) setError(updateError.message);
    else {
      setSavedCharges((items) =>
        items.map((item) => (item.id === charge.id ? { ...charge } : item)),
      );
      setMessage(`Komponen ${charge.name} berhasil disimpan.`);
    }
  };

  const addCharge = async () => {
    if (!draftCharge.name.trim() || Number(draftCharge.value) < 0) {
      setError("Nama dan nilai komponen biaya harus valid.");
      return;
    }
    setSavingId("new");
    setError(null);
    setMessage(null);
    const { error: insertError } = await supabase
      .from("ticket_charge_items")
      .insert({
        ...draftCharge,
        name: draftCharge.name.trim(),
        description: draftCharge.description?.trim() || null,
        value: Number(draftCharge.value),
        display_order: Math.round(Number(draftCharge.display_order)),
      });
    setSavingId(null);
    if (insertError) setError(insertError.message);
    else {
      setDraftCharge(emptyCharge);
      setShowNewChargeForm(false);
      setMessage("Komponen biaya berhasil ditambahkan.");
      void loadData();
    }
  };

  const deleteCharge = async () => {
    if (!pendingDelete) return;

    setDeleting(true);
    setError(null);
    setMessage(null);
    const charge = pendingDelete;
    const { error: deleteError } = await supabase
      .from("ticket_charge_items")
      .delete()
      .eq("id", charge.id);

    setDeleting(false);
    if (deleteError) {
      setError(deleteError.message);
      setPendingDelete(null);
      return;
    }

    setCharges((items) => items.filter((item) => item.id !== charge.id));
    setPendingDelete(null);
    setMessage(`Komponen ${charge.name} berhasil dihapus.`);
  };

  if (loading)
    return (
      <div className="flex min-h-[50vh] w-full items-center justify-center">
        <SpinnerLoading size="sm" color="black" />
      </div>
    );

  return (
    <div className="w-full min-w-0 space-y-8 overflow-visible pb-12">
      <header className="flex flex-col w-full gap-5 md:flex-row md:items-center md:justify-between">
        <div className="grow">
          <p className="text-sm font-semibold uppercase tracking-wide text-sky-800">
            Administrasi
          </p>
          <h1 className="mt-1 text-3xl font-bold">Ticketing</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
            Kelola harga tiket kawasan serta komponen biaya yang diterapkan pada
            checkout. Gambar kawasan dikelola melalui menu Kawasan Konservasi.
          </p>
        </div>
        <div className="flex flex-col gap-3 w-full md:w-60 lg:w-40">
          <Link
            href="/admin/tickets/scanner"
            className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl bg-sky-800 text-md font-bold text-white shadow-lg hover:bg-sky-900"
          >
            Scan Ticket
          </Link>
          <Link
            href="/admin/tickets/history"
            className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl  text-md font-bold text-sky-900 shadow-lg hover:bg-sky-900 border hover:text-white border-sky-900"
          >
            Tiket Aktif
          </Link>
        </div>
      </header>

      {error && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      {message && (
        <p
          role="status"
          className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700"
        >
          {message}
        </p>
      )}

      <section>
        <h2 className="text-2xl font-bold">Item Tiket Kawasan</h2>
        <div className="mt-4 space-y-4">
          {areas.map((area, index) => (
            <EditorCard key={area.id} title={area.slug}>
              <Field label="Nama">
                <input value={area.name} disabled />
              </Field>
              <Field label="Harga (Rp)">
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={area.ticket_price}
                  onChange={(event) =>
                    setAreas((items) =>
                      items.map((item, itemIndex) =>
                        itemIndex === index
                          ? {
                              ...item,
                              ticket_price: Number(event.target.value),
                            }
                          : item,
                      ),
                    )
                  }
                />
              </Field>
              <Field label="Urutan">
                <input
                  type="number"
                  value={area.display_order}
                  onChange={(event) =>
                    setAreas((items) =>
                      items.map((item, itemIndex) =>
                        itemIndex === index
                          ? {
                              ...item,
                              display_order: Number(event.target.value),
                            }
                          : item,
                      ),
                    )
                  }
                />
              </Field>
              <Toggle
                checked={area.is_active}
                onChange={(checked) =>
                  setAreas((items) =>
                    items.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, is_active: checked }
                        : item,
                    ),
                  )
                }
              />
              <SaveButton
                loading={savingId === area.id}
                disabled={
                  !hasAreaChanged(
                    area,
                    savedAreas.find((item) => item.id === area.id),
                  )
                }
                onClick={() => void saveArea(area)}
              />
            </EditorCard>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold">Pajak dan Biaya Tambahan</h2>
        <p className="mt-2 text-sm text-stone-600">
          Persentase dihitung dari subtotal. Nominal tetap dapat diterapkan per
          pesanan atau per pengunjung.
        </p>
        <div className="mt-4 space-y-4">
          {charges.map((charge, index) => (
            <EditorCard key={charge.id} title={charge.name}>
              <ChargeFields
                charge={charge}
                update={(updates) =>
                  setCharges((items) =>
                    items.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, ...updates } : item,
                    ),
                  )
                }
              />
              <Toggle
                checked={charge.is_active}
                onChange={(is_active) =>
                  setCharges((items) =>
                    items.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, is_active } : item,
                    ),
                  )
                }
              />
              <button
                type="button"
                onClick={() => setPendingDelete(charge)}
                disabled={savingId === charge.id || deleting}
                className="self-end rounded-lg bg-rose-700 px-4 py-2 font-semibold text-white hover:bg-rose-800 disabled:opacity-50 md:col-span-2 md:w-full"
              >
                Hapus
              </button>
              <SaveButton
                loading={savingId === charge.id}
                disabled={
                  !hasChargeChanged(
                    charge,
                    savedCharges.find((item) => item.id === charge.id),
                  )
                }
                onClick={() => void saveCharge(charge)}
              />
            </EditorCard>
          ))}
          {!showNewChargeForm ? (
            <button
              type="button"
              onClick={() => setShowNewChargeForm(true)}
              disabled={charges.length >= 10}
              className="w-full rounded-2xl border border-dashed border-sky-400 bg-sky-50 px-5 py-4 text-left font-bold text-sky-900 shadow-lg hover:bg-sky-100 disabled:cursor-not-allowed disabled:border-stone-300 disabled:bg-stone-100 disabled:text-stone-500"
            >
              <span className="flex items-center justify-between gap-4">
                <span>
                  {charges.length >= 10
                    ? "Batas 10 komponen biaya telah tercapai"
                    : "Tambah Komponen Biaya"}
                </span>
                <span aria-hidden="true" className="text-xl">
                  +
                </span>
              </span>
              <span className="mt-1 block text-xs font-normal">
                {charges.length}/10 komponen digunakan
              </span>
            </button>
          ) : (
            <EditorCard
              title={draftCharge.name.trim() || "Komponen Biaya Baru"}
              defaultOpen
            >
              <ChargeFields
                charge={{ id: "new", ...draftCharge }}
                update={(updates) =>
                  setDraftCharge((item) => ({ ...item, ...updates }))
                }
              />
              <Toggle
                checked={draftCharge.is_active}
                onChange={(is_active) =>
                  setDraftCharge((item) => ({ ...item, is_active }))
                }
              />
              <div className="flex items-end gap-2 md:col-span-2">
                <button
                  type="button"
                  onClick={() => void addCharge()}
                  disabled={savingId === "new"}
                  className="rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                >
                  {savingId === "new" ? "Menambahkan..." : "Tambah Komponen"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDraftCharge(emptyCharge);
                    setShowNewChargeForm(false);
                  }}
                  disabled={savingId === "new"}
                  className="rounded-lg border border-stone-300 px-4 py-2 font-semibold text-stone-700 hover:bg-stone-100 disabled:opacity-50"
                >
                  Batal
                </button>
              </div>
            </EditorCard>
          )}
        </div>
      </section>

      {pendingDelete && (
        <AlertNotif
          type="double"
          msg={`Hapus komponen biaya “${pendingDelete.name}”? Tindakan ini tidak dapat dibatalkan.`}
          yesText="Hapus"
          noText="Batal"
          icon="warning"
          loading={deleting}
          confirm={(confirmed) => {
            if (confirmed) void deleteCharge();
            else if (!deleting) setPendingDelete(null);
          }}
        />
      )}
    </div>
  );
}

function EditorCard({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <article className="overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-lg">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className={`flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left hover:bg-sky-50 ${open ? "border-b border-stone-200 bg-sky-50" : "bg-white"}`}
      >
        <h3 className="text-base font-bold leading-snug text-sky-900 md:text-lg">
          {title}
        </h3>
        <AccordionToggleIcon open={open} />
      </button>

      <div
        className={`${open ? "visible" : "invisible h-0 pointer-events-none overflow-hidden"} grid gap-4 ${open ? "p-5" : "px-5"} md:grid-cols-2`}
      >
        {children}
      </div>
    </article>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="text-sm font-semibold text-stone-700">
      {label}
      <span className="mt-1 block [&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-stone-300 [&_input]:p-2.5 [&_select]:w-full [&_select]:rounded-lg [&_select]:border [&_select]:border-stone-300 [&_select]:p-2.5">
        {children}
      </span>
    </label>
  );
}
function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 self-end rounded-lg bg-stone-50 p-3 text-sm font-semibold">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      Aktif di checkout
    </label>
  );
}
function SaveButton({
  loading,
  disabled,
  onClick,
}: {
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading || disabled}
      className="self-end rounded-lg bg-sky-800 px-4 py-2 font-semibold text-white hover:bg-sky-900 disabled:cursor-not-allowed disabled:opacity-50 md:col-span-2 md:w-full"
    >
      {loading ? "Menyimpan..." : "Simpan"}
    </button>
  );
}
function ChargeFields({
  charge,
  update,
}: {
  charge: Charge;
  update: (updates: Partial<Charge>) => void;
}) {
  return (
    <>
      <Field label="Nama">
        <input
          value={charge.name}
          onChange={(event) => update({ name: event.target.value })}
        />
      </Field>
      <Field label="Deskripsi">
        <input
          value={charge.description ?? ""}
          onChange={(event) => update({ description: event.target.value })}
        />
      </Field>
      <Field label="Jenis Perhitungan">
        <select
          value={charge.calculation_type}
          onChange={(event) =>
            update({
              calculation_type: event.target
                .value as Charge["calculation_type"],
            })
          }
        >
          <option value="percentage">Persentase</option>
          <option value="fixed">Nominal Tetap</option>
        </select>
      </Field>
      <Field
        label={
          charge.calculation_type === "percentage" ? "Nilai (%)" : "Nilai (Rp)"
        }
      >
        <input
          type="number"
          min="0"
          step={charge.calculation_type === "percentage" ? "0.01" : "1000"}
          value={charge.value}
          onChange={(event) => update({ value: Number(event.target.value) })}
        />
      </Field>
      <Field label="Diterapkan Pada">
        <select
          value={charge.applies_to}
          disabled={charge.calculation_type === "percentage"}
          onChange={(event) =>
            update({ applies_to: event.target.value as Charge["applies_to"] })
          }
        >
          <option value="subtotal">Subtotal</option>
          <option value="order">Per Pesanan</option>
          <option value="visitor">Per Pengunjung</option>
        </select>
      </Field>
      <Field label="Urutan">
        <input
          type="number"
          value={charge.display_order}
          onChange={(event) =>
            update({ display_order: Number(event.target.value) })
          }
        />
      </Field>
    </>
  );
}
