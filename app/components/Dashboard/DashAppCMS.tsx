"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase/supabaseClient";
import {
  APP_CMS_PREVIEW_STORAGE_KEY,
  getImagePreviewUrl,
} from "@/lib/supabase/supabaseHelper";
import AppCmsComponentPreview from "./AppCmsComponentPreview";
import SpinnerLoading from "../SpinnerLoading";

type AppLabel = {
  id: string;
  component: string;
  type: string;
  target: string;
  value: string;
  is_active: boolean;
};

type OriginalValue = Pick<AppLabel, "value" | "is_active">;

function rowKey(row: Pick<AppLabel, "component" | "target">) {
  return `${row.component}::${row.target}`;
}

function sortRows(rows: AppLabel[]) {
  return [...rows].sort(
    (first, second) =>
      first.component.localeCompare(second.component, "id") ||
      first.target.localeCompare(second.target, "id"),
  );
}

export default function DashAppCMS() {
  const [labels, setLabels] = useState<AppLabel[]>([]);
  const [originals, setOriginals] = useState<Record<string, OriginalValue>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [componentFilter, setComponentFilter] = useState("all");
  const [previewComponent, setPreviewComponent] = useState<string | null>(null);
  const [openComponents, setOpenComponents] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadLabels() {
      setLoading(true);
      setMessage("");

      const { data, error } = await supabase
        .from("app_cms")
        .select("id, component, type, target, value, is_active");

      if (!mounted) return;

      if (error) {
        setMessage(`Label CMS gagal dimuat: ${error.message}`);
        setLoading(false);
        return;
      }

      const rows = sortRows(
        (data ?? []).map((row) => ({
          id: String(row.id),
          component: String(row.component),
          type: String(row.type || "text"),
          target: String(row.target),
          value: String(row.value || ""),
          is_active: row.is_active !== false,
        })),
      );

      setLabels(rows);
      setOriginals(
        Object.fromEntries(
          rows.map((row) => [
            rowKey(row),
            { value: row.value, is_active: row.is_active },
          ]),
        ),
      );
      setLoading(false);
    }

    void loadLabels();
    return () => {
      mounted = false;
    };
  }, []);

  const components = useMemo(
    () => Array.from(new Set(labels.map((row) => row.component))).sort(),
    [labels],
  );

  const changedRows = useMemo(
    () =>
      labels.filter((row) => {
        const original = originals[rowKey(row)];
        return (
          !original ||
          original.value !== row.value ||
          original.is_active !== row.is_active
        );
      }),
    [labels, originals],
  );

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return labels.filter((row) => {
      if (componentFilter !== "all" && row.component !== componentFilter) {
        return false;
      }
      return (
        !query ||
        row.target.toLowerCase().includes(query) ||
        row.value.toLowerCase().includes(query)
      );
    });
  }, [componentFilter, labels, search]);

  function updateRow(id: string, changes: Partial<AppLabel>) {
    setLabels((current) =>
      current.map((row) => (row.id === id ? { ...row, ...changes } : row)),
    );
  }

  function toggleComponent(component: string) {
    setOpenComponents((current) =>
      current.includes(component)
        ? current.filter((item) => item !== component)
        : [...current, component],
    );
  }

  function openPreview(component: string) {
    sessionStorage.setItem(
      APP_CMS_PREVIEW_STORAGE_KEY,
      JSON.stringify({
        labels: labels
          .filter((row) => row.component === component)
          .map(({ component: rowComponent, target, value, is_active }) => ({
            component: rowComponent,
            target,
            value,
            is_active,
          })),
      }),
    );
    setPreviewComponent(component);
  }

  async function saveChanges() {
    if (changedRows.length === 0) return;

    setSaving(true);
    setMessage("");

    const results = await Promise.all(
      changedRows.map((row) =>
        supabase
          .from("app_cms")
          .update({ value: row.value, is_active: row.is_active })
          .eq("id", row.id),
      ),
    );
    const error = results.find((result) => result.error)?.error;

    if (error) {
      setMessage(`Perubahan gagal disimpan: ${error.message}`);
      setSaving(false);
      return;
    }

    setOriginals(
      Object.fromEntries(
        labels.map((row) => [
          rowKey(row),
          { value: row.value, is_active: row.is_active },
        ]),
      ),
    );
    window.dispatchEvent(new Event("navbar-config-updated"));
    setMessage(`${changedRows.length} perubahan berhasil disimpan.`);
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-1 items-center justify-center">
        <SpinnerLoading size="sm" color="black" />
      </div>
    );
  }

  return (
    <section className="min-w-0 flex-1 space-y-6 py-8">
      <div>
        <h1>App CMS</h1>
        <p className="mt-2 text-stone-600">
          Kelola label aplikasi dalam Bahasa Indonesia.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cari label"
          className="min-w-56 flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2"
        />
        <select
          value={componentFilter}
          onChange={(event) => setComponentFilter(event.target.value)}
          className="rounded-lg border border-stone-300 bg-white px-3 py-2"
        >
          <option value="all">Semua komponen</option>
          {components.map((component) => (
            <option key={component} value={component}>
              {component}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => void saveChanges()}
          disabled={saving || changedRows.length === 0}
          className="rounded-lg bg-sky-800 px-5 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Menyimpan…" : `Simpan (${changedRows.length})`}
        </button>
      </div>

      {message && <p className="rounded-lg bg-sky-50 p-3">{message}</p>}

      <div className="space-y-4">
        {components
          .filter(
            (component) =>
              componentFilter === "all" || component === componentFilter,
          )
          .map((component) => {
            const rows = filteredRows.filter(
              (row) => row.component === component,
            );
            if (rows.length === 0) return null;
            const isOpen = openComponents.includes(component);
            const contentId = `app-cms-${component.replace(
              /[^a-z0-9_-]/gi,
              "-",
            )}`;

            return (
              <div
                key={component}
                className={`overflow-hidden rounded-xl border bg-white transition-colors ${
                  isOpen ? "border-sky-800" : "border-stone-300"
                }`}
              >
                <div
                  className={`group flex items-center justify-between px-4 py-3 transition-colors ${
                    isOpen
                      ? "bg-sky-900 text-white"
                      : "bg-white text-stone-950 hover:bg-sky-100"
                  }`}
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={contentId}
                    onClick={() => toggleComponent(component)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                  >
                    <span
                      aria-hidden="true"
                      className={`inline-block text-sm transition-transform ${
                        isOpen ? "rotate-90" : ""
                      }`}
                    >
                      ▶
                    </span>
                    <h2 className="truncate text-lg font-semibold">
                      {component}
                    </h2>
                  </button>
                  <button
                    type="button"
                    onClick={() => openPreview(component)}
                    className={`ml-3 shrink-0 rounded-md border px-3 py-1 text-sm transition-colors ${
                      isOpen
                        ? "border-white/70 bg-white/10 text-white hover:bg-white hover:text-sky-950"
                        : "border-sky-800 bg-white text-stone-950 hover:bg-sky-800 hover:text-white"
                    }`}
                  >
                    Pratinjau
                  </button>
                </div>

                {isOpen && (
                  <div id={contentId} className="divide-y divide-stone-100">
                    {rows.map((row) => (
                      <div
                        key={row.id}
                        className="grid gap-3 p-4 lg:grid-cols-[minmax(12rem,0.7fr)_minmax(0,2fr)_auto]"
                      >
                        <div>
                          <p className="font-medium">{row.target}</p>
                          <p className="text-xs text-stone-500">{row.type}</p>
                        </div>
                        {row.type === "textarea" ? (
                          <textarea
                            value={row.value}
                            onChange={(event) =>
                              updateRow(row.id, { value: event.target.value })
                            }
                            rows={4}
                            className="w-full rounded-md border border-stone-300 p-2"
                          />
                        ) : (
                          <div className="space-y-2">
                            <input
                              value={row.value}
                              onChange={(event) =>
                                updateRow(row.id, {
                                  value: event.target.value,
                                })
                              }
                              className="w-full rounded-md border border-stone-300 p-2"
                            />
                            {row.type === "image" && row.value && (
                              <Image
                                src={getImagePreviewUrl(row.value)}
                                alt=""
                                width={192}
                                height={96}
                                className="max-h-24 max-w-48 rounded object-contain"
                              />
                            )}
                          </div>
                        )}
                        <label className="flex items-center gap-2 self-start">
                          <input
                            type="checkbox"
                            checked={row.is_active}
                            onChange={(event) =>
                              updateRow(row.id, {
                                is_active: event.target.checked,
                              })
                            }
                          />
                          Aktif
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {previewComponent && (
        <div className="fixed inset-0 z-[2000] overflow-auto bg-black/70 p-4">
          <div className="mx-auto max-w-7xl overflow-hidden rounded-xl bg-white">
            <div className="flex items-center justify-between border-b border-sky-950 bg-sky-900 p-3 text-white">
              <strong>Pratinjau: {previewComponent}</strong>
              <button
                type="button"
                onClick={() => setPreviewComponent(null)}
                className="rounded-md bg-stone-800 px-3 py-1 text-white"
              >
                Tutup
              </button>
            </div>
            <AppCmsComponentPreview component={previewComponent} />
          </div>
        </div>
      )}
    </section>
  );
}
