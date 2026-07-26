"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabase/supabaseClient";
import AlertNotif from "../AlertNotif";
import SpinnerLoading from "../SpinnerLoading";

type Locale = "id" | "en";

type CmsRow = {
  id: string;
  component: string;
  type: string;
  target: string;
  value: string;
  locale: Locale;
  is_active: boolean;
};

const allowedComponents = [
  "navbar",
  "footer",
  "page_data",
  "page_contact",
  "page_regulations",
  "page_privacy",
  "page_terms",
  "page_accessibility",
] as const;

export default function DashAppCMS() {
  const [locale, setLocale] = useState<Locale>("id");
  const [component, setComponent] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<CmsRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Partial<CmsRow>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("app_cms")
      .select("id, component, type, target, value, locale, is_active")
      .in("component", [...allowedComponents])
      .eq("locale", locale)
      .order("component")
      .order("target");

    if (error) {
      setNotice(error.message);
      setRows([]);
    } else {
      setRows((data ?? []) as CmsRow[]);
    }
    setDrafts({});
    setLoading(false);
  }, [locale]);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return rows.filter(
      (row) =>
        (component === "all" || row.component === component) &&
        (!keyword ||
          row.target.toLowerCase().includes(keyword) ||
          row.value.toLowerCase().includes(keyword)),
    );
  }, [component, rows, search]);

  function update(id: string, changes: Partial<CmsRow>) {
    setDrafts((current) => ({
      ...current,
      [id]: { ...current[id], ...changes },
    }));
  }

  async function save() {
    const changed = Object.entries(drafts);
    if (!changed.length) return;

    setSaving(true);
    for (const [id, changes] of changed) {
      const { error } = await supabase
        .from("app_cms")
        .update(changes)
        .eq("id", id);
      if (error) {
        setNotice(error.message);
        setSaving(false);
        return;
      }
    }

    setNotice("Konten berhasil disimpan.");
    setSaving(false);
    await load();
    window.dispatchEvent(new Event("navbar-config-updated"));
  }

  if (loading) {
    return (
      <div className="flex min-h-[70vh] w-full items-center justify-center rounded-2xl bg-white">
        <SpinnerLoading size="sm" color="black" />
      </div>
    );
  }

  return (
    <section className="flex min-h-[70vh] w-full min-w-0 flex-col gap-5">
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">
          App CMS — Platform Data
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Kelola teks antarmuka untuk data dan halaman pendukung yang tetap
          digunakan.
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <select
            value={locale}
            onChange={(event) => setLocale(event.target.value as Locale)}
            className="rounded-xl border border-slate-200 px-3 py-2"
          >
            <option value="id">Indonesia</option>
            <option value="en">English</option>
          </select>
          <select
            value={component}
            onChange={(event) => setComponent(event.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2"
          >
            <option value="all">Semua komponen</option>
            {allowedComponents.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari target atau nilai..."
            className="rounded-xl border border-slate-200 px-3 py-2"
          />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {visibleRows.map((row) => {
          const draft = { ...row, ...drafts[row.id] };
          return (
            <article
              key={row.id}
              className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[240px_1fr]"
            >
              <div>
                <p className="font-semibold text-slate-800">{row.target}</p>
                <p className="text-xs text-slate-400">{row.component}</p>
                <label className="mt-3 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={draft.is_active}
                    onChange={(event) =>
                      update(row.id, { is_active: event.target.checked })
                    }
                  />
                  Aktif
                </label>
              </div>
              {row.type === "textarea" ? (
                <textarea
                  value={draft.value}
                  onChange={(event) =>
                    update(row.id, { value: event.target.value })
                  }
                  className="min-h-32 rounded-xl border border-slate-200 p-3"
                />
              ) : (
                <input
                  value={draft.value}
                  onChange={(event) =>
                    update(row.id, { value: event.target.value })
                  }
                  className="rounded-xl border border-slate-200 px-3 py-2"
                />
              )}
            </article>
          );
        })}
        {!visibleRows.length && (
          <div className="rounded-2xl bg-white p-8 text-center text-slate-500">
            Tidak ada konten pada filter ini.
          </div>
        )}
      </div>

      <div className="sticky bottom-4 flex justify-end">
        <button
          type="button"
          disabled={saving || !Object.keys(drafts).length}
          onClick={() => void save()}
          className="rounded-xl bg-sky-700 px-6 py-3 font-semibold text-white shadow-lg disabled:opacity-50"
        >
          {saving ? "Menyimpan..." : "Simpan perubahan"}
        </button>
      </div>

      {notice && (
        <AlertNotif
          type="single"
          yesText="Tutup"
          msg={notice}
          icon={notice.includes("berhasil") ? "success" : "warning"}
          confirm={() => setNotice(null)}
        />
      )}
    </section>
  );
}
