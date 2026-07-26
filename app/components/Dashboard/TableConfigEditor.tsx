"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AuthAdminAccess from "@/app/Auth/AuthAdminAccess";
import SpinnerLoading from "../SpinnerLoading";
import AlertNotif from "../AlertNotif";
import { supabase } from "@/lib/supabase/supabaseClient";
import { useCollapsibleMount } from "@/lib/hooks/useCollapsibleMount";
import { DownChevron, Draggable, LeftChevron, UpChevron } from "@/public/icons/iconSets";
import type {
  ConfigItem,
  ConfigTable,
  LocalizedText,
  TableConfigMap,
} from "@/lib/tableConfig";

const sections = {
  staff: ["division", "position", "gender"],
  news: ["tag"],
  gallery: ["tag"],
} as const;

const tablePages: Record<ConfigTable, string> = {
  staff: "/profile/staff",
  news: "/profile/berita",
  gallery: "/profile/galeri",
};

const emptyText = (): LocalizedText => ({ id: "", en: "" });
type EditorConfigItem = ConfigItem & {
  _editorId: string;
  _originalKey: string;
};

const emptyItem = (): EditorConfigItem => ({
  key: "",
  short: emptyText(),
  long: emptyText(),
  _editorId: crypto.randomUUID(),
  _originalKey: "",
});

function decorateConfig(value: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      key.endsWith("_items") && Array.isArray(entry)
        ? entry.map((item) => {
            const configItem = item as ConfigItem;
            return {
              ...configItem,
              _editorId: crypto.randomUUID(),
              _originalKey: configItem.key,
            } satisfies EditorConfigItem;
          })
        : entry,
    ]),
  );
}

function prepareConfig(value: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      key.endsWith("_items") && Array.isArray(entry)
        ? entry.map((item) => {
            const { _editorId: _discardId, _originalKey: _discardOriginal, ...configItem } = item as EditorConfigItem;
            void _discardId;
            void _discardOriginal;
            return configItem;
          })
        : entry,
    ]),
  );
}

function getKeyChanges(value: Record<string, unknown>) {
  return Object.entries(value).flatMap(([key, entry]) => {
    if (!key.endsWith("_items") || !Array.isArray(entry)) return [];
    const field = key.slice(0, -"_items".length);
    return (entry as EditorConfigItem[])
      .filter((item) => item._originalKey && item._originalKey !== item.key)
      .map((item) => ({ field, old_key: item._originalKey, new_key: item.key }));
  });
}

function cloneConfig(value: Record<string, unknown>) {
  return structuredClone(value);
}

function countChanges(previous: unknown, current: unknown): number {
  if (JSON.stringify(previous) === JSON.stringify(current)) return 0;

  if (Array.isArray(previous) && Array.isArray(current)) {
    const sharedLength = Math.min(previous.length, current.length);
    let count = Math.abs(previous.length - current.length);
    for (let index = 0; index < sharedLength; index += 1) {
      count += countChanges(previous[index], current[index]);
    }
    return count;
  }

  if (typeof previous === "object" && previous !== null && typeof current === "object" && current !== null) {
    const previousRecord = previous as Record<string, unknown>;
    const currentRecord = current as Record<string, unknown>;
    const keys = new Set([...Object.keys(previousRecord), ...Object.keys(currentRecord)]);
    return [...keys].reduce((count, key) => count + countChanges(previousRecord[key], currentRecord[key]), 0);
  }

  return 1;
}

export default function TableConfigEditor({ table }: { table: ConfigTable }) {
  const [config, setConfig] = useState<Record<string, unknown> | null>(null);
  const [initialConfig, setInitialConfig] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [draggedItem, setDraggedItem] = useState<{ section: string; index: number } | null>(null);
  const [dropTarget, setDropTarget] = useState<{ section: string; index: number; position: "before" | "after" } | null>(null);
  const [blockedDelete, setBlockedDelete] = useState<{
    value: string;
    usage: number;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("table_config")
      .select("config")
      .eq("table_name", table)
      .maybeSingle();
    if (error) setMessage(error.message);
    const nextConfig = decorateConfig((data?.config as Record<string, unknown>) ?? {});
    setConfig(cloneConfig(nextConfig));
    setInitialConfig(cloneConfig(nextConfig));
    setLoading(false);
  }, [table]);

  useEffect(() => void load(), [load]);

  function updateName(section: string, locale: "id" | "en", value: string) {
    setConfig((current) => ({
      ...(current ?? {}),
      [`${section}_name`]: {
        ...((current?.[`${section}_name`] as LocalizedText) ?? emptyText()),
        [locale]: value,
      },
    }));
  }

  function updateItems(section: string, items: ConfigItem[]) {
    setConfig((current) => ({
      ...(current ?? {}),
      [`${section}_items`]: items,
    }));
  }

  function moveItem(section: string, items: ConfigItem[], index: number, direction: "up" | "down") {
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= items.length) return;
    const nextItems = [...items];
    [nextItems[index], nextItems[nextIndex]] = [nextItems[nextIndex], nextItems[index]];
    updateItems(section, nextItems);
  }

  function reorderItems(section: string, items: ConfigItem[], fromIndex: number, targetIndex: number, position: "before" | "after") {
    if (fromIndex === targetIndex) return;
    const nextItems = [...items];
    const [dragged] = nextItems.splice(fromIndex, 1);
    if (!dragged) return;
    const adjustedTarget = fromIndex < targetIndex ? targetIndex - 1 : targetIndex;
    nextItems.splice(position === "before" ? adjustedTarget : adjustedTarget + 1, 0, dragged);
    updateItems(section, nextItems);
  }

  async function save() {
    setSaving(true);
    setMessage("");
    const currentConfig = config ?? {};
    const cleanConfig = prepareConfig(currentConfig) as TableConfigMap[typeof table];
    const keyChanges = getKeyChanges(currentConfig);
    const { data, error } = await supabase.rpc("save_table_config", {
      p_table_name: table,
      p_config: cleanConfig,
      p_key_changes: keyChanges,
    });
    setMessage(
      error
        ? error.message
        : Number(data) > 0
          ? `Konfigurasi disimpan dan ${data} data terkait diperbarui.`
          : "Konfigurasi berhasil disimpan.",
    );
    if (!error) {
      const savedConfig = decorateConfig(cleanConfig as unknown as Record<string, unknown>);
      setConfig(cloneConfig(savedConfig));
      setInitialConfig(cloneConfig(savedConfig));
    }
    setSaving(false);
  }

  async function executeDelete(section: string, item: ConfigItem) {
    setDeleting(true);
    setMessage("");
    const { error } = await supabase.rpc("replace_table_config_item", {
      p_table_name: table,
      p_field: section,
      p_old_key: item.key,
      p_new_key: null,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Item konfigurasi dihapus.");
      await load();
    }
    setDeleting(false);
  }

  async function requestDelete(section: string, item: ConfigItem) {
    if (!item.key) {
      const items = (config?.[`${section}_items`] as ConfigItem[]) ?? [];
      updateItems(section, items.filter((candidate) => candidate !== item));
      return;
    }

    setDeleting(true);
    setMessage("");
    const { count, error } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq(section, item.key);

    if (error) {
      setMessage(error.message);
      setDeleting(false);
      return;
    }

    if ((count ?? 0) > 0) {
      setBlockedDelete({
        value: item.short.id || item.key,
        usage: count ?? 0,
      });
      setDeleting(false);
      return;
    }

    await executeDelete(section, item);
  }

  const changeCount = countChanges(initialConfig, config ?? {});
  const bottomActions = useCollapsibleMount(changeCount > 0);

  function cancelChanges() {
    setConfig(cloneConfig(initialConfig));
    setBlockedDelete(null);
    setMessage("Perubahan dibatalkan.");
  }

  if (loading) {
    return <SpinnerLoading size="sm" color="black" />;
  }

  return (
    <AuthAdminAccess>
      <section className={`w-full space-y-6 ${changeCount > 0 ? "pb-28" : ""}`}>
        <header>
          <div className="flex items-center gap-3">
            <Link href={tablePages[table]} aria-label={`Kembali ke ${table}`} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-stone-300 bg-white text-stone-700 hover:bg-stone-100">
              <LeftChevron className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl font-bold capitalize">Konfigurasi {table}</h1>
          </div>
          <p className="mt-1 text-sm text-stone-600">
            Key disimpan pada data. Nama pendek dan panjang diterjemahkan saat ditampilkan.
          </p>
        </header>

        {sections[table].map((section, sectionIndex) => {
          const name = (config?.[`${section}_name`] as LocalizedText) ?? emptyText();
          const items = (config?.[`${section}_items`] as ConfigItem[]) ?? [];

          return (
            <details key={section} open={sectionIndex === 0} className="group rounded-2xl border border-stone-200 bg-white shadow-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 text-lg font-bold capitalize marker:content-none">
                <span>{section}</span>
                <span aria-hidden="true" className="shrink-0">
                  <DownChevron className="h-5 w-5 group-open:hidden" />
                  <UpChevron className="hidden h-5 w-5 group-open:block" />
                </span>
              </summary>
              <div className="space-y-4 border-t border-stone-200 p-5">
              <div className="grid gap-3 md:grid-cols-2">
                {(["id", "en"] as const).map((locale) => (
                  <label key={locale} className="text-sm font-medium">
                    Nama field ({locale.toUpperCase()})
                    <input className="mt-1 w-full rounded-lg border bg-white p-2" value={name[locale] ?? ""} onChange={(event) => updateName(section, locale, event.target.value)} />
                  </label>
                ))}
              </div>

              <div className="space-y-3">
                {items.map((item, index) => (
                  <details
                    key={(item as EditorConfigItem)._editorId || `config-item-${index}`}
                    onDragOver={(event) => {
                      if (!draggedItem || draggedItem.section !== section) return;
                      event.preventDefault();
                      const rectangle = event.currentTarget.getBoundingClientRect();
                      setDropTarget({ section, index, position: event.clientY < rectangle.top + rectangle.height / 2 ? "before" : "after" });
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      if (draggedItem?.section === section && dropTarget?.section === section) reorderItems(section, items, draggedItem.index, index, dropTarget.position);
                      setDraggedItem(null);
                      setDropTarget(null);
                    }}
                    className={`group/item rounded-xl border bg-stone-50 ${draggedItem?.section === section && draggedItem.index === index ? "opacity-60" : ""} ${dropTarget?.section === section && dropTarget.index === index ? dropTarget.position === "before" ? "border-t-4 border-t-black" : "border-b-4 border-b-black" : "border-stone-200"}`}
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 marker:content-none">
                      <span className="flex w-7 shrink-0 items-center justify-center text-stone-400" onClick={(event) => { event.preventDefault(); event.stopPropagation(); }}>
                        <span className="flex w-full flex-col items-center justify-center gap-1 md:hidden">
                          <button type="button" disabled={index === 0} onClick={() => moveItem(section, items, index, "up")} className="flex h-6 w-full items-center justify-center rounded text-stone-500 disabled:cursor-not-allowed disabled:opacity-30" aria-label={`Pindahkan ${item.key || `item ${index + 1}`} ke atas`}><UpChevron className="h-4 w-4" /></button>
                          <button type="button" disabled={index === items.length - 1} onClick={() => moveItem(section, items, index, "down")} className="flex h-6 w-full items-center justify-center rounded text-stone-500 disabled:cursor-not-allowed disabled:opacity-30" aria-label={`Pindahkan ${item.key || `item ${index + 1}`} ke bawah`}><DownChevron className="h-4 w-4" /></button>
                        </span>
                        <span draggable onDragStart={(event) => { event.stopPropagation(); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", String(index)); setDraggedItem({ section, index }); }} onDragEnd={() => { setDraggedItem(null); setDropTarget(null); }} className="hidden cursor-grab active:cursor-grabbing md:block" aria-label={`Geser ${item.key || `item ${index + 1}`}`}><Draggable className="pointer-events-none h-7 w-5" /></span>
                      </span>
                      <span className="min-w-0 flex-1 truncate font-bold text-stone-800">
                        {item.key || `Item baru ${index + 1}`}
                      </span>
                      <button type="button" disabled={deleting} className="shrink-0 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50" onClick={(event) => { event.preventDefault(); event.stopPropagation(); void requestDelete(section, item); }}>Hapus</button>
                      <span aria-hidden="true" className="shrink-0">
                        <DownChevron className="h-5 w-5 group-open/item:hidden" />
                        <UpChevron className="hidden h-5 w-5 group-open/item:block" />
                      </span>
                    </summary>

                    <div className="space-y-4 border-t border-stone-200 p-4">
                    <label className="block text-xs font-bold text-stone-600">
                      Key tersimpan di database
                      <input aria-label="Key" placeholder="contoh: kabid" className="mt-1 block w-full rounded-lg border border-stone-300 bg-white p-2 text-sm font-normal text-stone-900" value={item.key} onChange={(event) => updateItems(section, items.map((candidate, itemIndex) => itemIndex === index ? { ...candidate, key: event.target.value } : candidate))} />
                    </label>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <fieldset className="rounded-xl border border-stone-300 p-3">
                        <legend className="px-1 text-sm font-bold text-stone-800">Nama pendek</legend>
                        <p className="mb-3 text-xs text-stone-600">Label ringkas untuk tabel, kartu, atau pilihan.</p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {(["id", "en"] as const).map((locale) => (
                            <label key={`short-${locale}`} className="text-xs font-bold text-stone-600">
                              {locale === "id" ? "Indonesia (ID)" : "English (EN)"}
                              <input aria-label={`Nama pendek ${locale}`} placeholder={locale === "id" ? "Contoh: Kabid" : "Example: Division Head"} className="mt-1 block w-full rounded-lg border border-stone-300 bg-white p-2 text-sm font-normal text-stone-900" value={item.short?.[locale] ?? ""} onChange={(event) => updateItems(section, items.map((candidate, itemIndex) => itemIndex === index ? { ...candidate, short: { ...candidate.short, [locale]: event.target.value } } : candidate))} />
                            </label>
                          ))}
                        </div>
                      </fieldset>

                      <fieldset className="rounded-xl border border-stone-300 p-3">
                        <legend className="px-1 text-sm font-bold text-stone-800">Nama panjang</legend>
                        <p className="mb-3 text-xs text-stone-600">Nama lengkap yang ditampilkan sebagai judul grup atau detail.</p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {(["id", "en"] as const).map((locale) => (
                            <label key={`long-${locale}`} className="text-xs font-bold text-stone-600">
                              {locale === "id" ? "Indonesia (ID)" : "English (EN)"}
                              <input aria-label={`Nama panjang ${locale}`} placeholder={locale === "id" ? "Contoh: Kepala Bidang" : "Example: Head of Division"} className="mt-1 block w-full rounded-lg border border-stone-300 bg-white p-2 text-sm font-normal text-stone-900" value={item.long?.[locale] ?? ""} onChange={(event) => updateItems(section, items.map((candidate, itemIndex) => itemIndex === index ? { ...candidate, long: { ...candidate.long, [locale]: event.target.value } } : candidate))} />
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    </div>

                    </div>
                  </details>
                ))}
                <button type="button" className="rounded-lg border border-sky-700 px-3 py-2 text-sm font-semibold text-sky-800" onClick={() => updateItems(section, [...items, emptyItem()])}>Tambah item</button>
              </div>
              </div>
            </details>
          );
        })}

        {message && <p className="text-sm text-stone-700">{message}</p>}

        {blockedDelete && (
          <AlertNotif
            type="single"
            yesText="Ok"
            msg={`${blockedDelete.value} tidak dapat dihapus. Digunakan oleh ${blockedDelete.usage} data`}
            icon="warning"
            confirm={(confirmed) => confirmed && setBlockedDelete(null)}
          />
        )}

        {bottomActions.mounted && (
          <div className={`${bottomActions.closing ? "bottom-menu-collapse" : "bottom-menu-expand"} fixed bottom-4 left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-[0_-10px_30px_rgba(15,23,42,0.14)] backdrop-blur md:flex-row md:items-center md:justify-end`}>
            <button type="button" onClick={cancelChanges} disabled={saving || deleting} className="w-full grow basis-0 rounded-xl border border-rose-600 bg-white px-5 py-3 text-sm font-bold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60">
              Cancel
            </button>
            <button type="button" onClick={() => void save()} disabled={saving || deleting} className="w-full grow basis-0 rounded-xl bg-sky-600 px-5 py-3 text-sm font-bold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60">
              {saving ? "Menyimpan..." : `Simpan Perubahan (${changeCount})`}
            </button>
          </div>
        )}
      </section>
    </AuthAdminAccess>
  );
}
