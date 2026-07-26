"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { supabase } from "@/lib/supabase/supabaseClient";
import {
  CONSERVATION_AREA_SELECT,
  createEmptyConservationArea,
  localizedText,
  type ConservationAreaRow,
  type LocalizedText,
} from "@/lib/conservation/areas";
import SpinnerLoading from "../SpinnerLoading";
import { DownChevron, LeftChevron, UpChevron } from "@/public/icons/iconSets";

const PLACEHOLDER = "/assets/image_placeholder.png";

function countChanges(
  current: ConservationAreaRow,
  saved: ConservationAreaRow,
) {
  const keys = Object.keys(current) as (keyof ConservationAreaRow)[];
  return keys.filter(
    (key) => JSON.stringify(current[key]) !== JSON.stringify(saved[key]),
  ).length;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function DashConservationAreas() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const view = searchParams.get("view");
  const selectedId = searchParams.get("id");
  const editing = view === "add" || view === "edit";
  const [areas, setAreas] = useState<ConservationAreaRow[]>([]);
  const [draft, setDraft] = useState<ConservationAreaRow | null>(null);
  const [savedDraft, setSavedDraft] = useState<ConservationAreaRow | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"image" | "map" | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadAreas = useCallback(async () => {
    setLoading(true);
    const { data, error: queryError } = await supabase
      .from("conservation_areas")
      .select(CONSERVATION_AREA_SELECT)
      .order("display_order", { ascending: true });
    setLoading(false);
    if (queryError) {
      setError(queryError.message);
      return;
    }
    setAreas((data ?? []) as ConservationAreaRow[]);
  }, []);

  useEffect(() => {
    void loadAreas();
  }, [loadAreas]);

  useEffect(() => {
    if (view === "add") {
      const empty = createEmptyConservationArea();
      empty.display_order = areas.length;
      setDraft(empty);
      setSavedDraft(structuredClone(empty));
      return;
    }
    if (view === "edit" && selectedId) {
      const selected = areas.find((area) => area.id === selectedId);
      if (selected) {
        setDraft(structuredClone(selected));
        setSavedDraft(structuredClone(selected));
      }
    }
  }, [view, selectedId, areas]);

  const changeCount = useMemo(
    () => (draft && savedDraft ? countChanges(draft, savedDraft) : 0),
    [draft, savedDraft],
  );

  function navigate(viewName?: "add" | "edit", id?: string) {
    const params = new URLSearchParams();
    if (viewName) params.set("view", viewName);
    if (id) params.set("id", id);
    router.replace(params.size ? `${pathname}?${params}` : pathname);
  }

  async function uploadImage(file: File, kind: "image" | "map") {
    if (!draft || !file.type.startsWith("image/")) {
      setError("File harus berupa gambar.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Ukuran gambar maksimal 5 MB.");
      return;
    }
    setUploading(kind);
    setError("");
    const extension = file.name.split(".").pop() || "jpg";
    const path = `conservation-areas/${draft.slug || "new"}-${kind}-${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("images")
      .upload(path, file, { contentType: file.type, upsert: false });
    setUploading(null);
    if (uploadError) {
      setError(uploadError.message);
      return;
    }
    const { data } = supabase.storage.from("images").getPublicUrl(path);
    setDraft({
      ...draft,
      [kind === "image" ? "image_path" : "map_image_path"]: data.publicUrl,
    });
  }

  async function save() {
    if (!draft || !draft.slug || !draft.short_name.id?.trim()) {
      setError("Slug dan nama pendek Bahasa Indonesia wajib diisi.");
      return;
    }
    setSaving(true);
    setError("");
    const payload = {
      slug: slugify(draft.slug),
      name: draft.short_name.id.trim(),
      short_name: draft.short_name,
      official_name: draft.official_name,
      category: draft.category,
      location: draft.location,
      summary: draft.summary,
      area_hectares: Number(draft.area_hectares) || 0,
      ecosystems: draft.ecosystems,
      key_features: draft.key_features,
      zoning_summary: draft.zoning_summary,
      zoning_details: draft.zoning_details,
      documents: draft.documents,
      image_path: draft.image_path || null,
      map_image_path: draft.map_image_path || null,
      ticket_price: Number(draft.ticket_price) || 0,
      is_active: draft.is_active,
      display_order: Number(draft.display_order) || 0,
    };
    const result = draft.id
      ? await supabase
          .from("conservation_areas")
          .update(payload)
          .eq("id", draft.id)
      : await supabase.from("conservation_areas").insert(payload);
    setSaving(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setMessage("Kawasan konservasi berhasil disimpan.");
    await loadAreas();
    navigate();
  }

  async function move(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (!areas[targetIndex]) return;
    const reordered = [...areas];
    [reordered[index], reordered[targetIndex]] = [
      reordered[targetIndex],
      reordered[index],
    ];
    setAreas(reordered);
    const updates = reordered.map((area, display_order) =>
      supabase
        .from("conservation_areas")
        .update({ display_order })
        .eq("id", area.id),
    );
    const results = await Promise.all(updates);
    const updateError = results.find((result) => result.error)?.error;
    if (updateError) {
      setError(updateError.message);
      void loadAreas();
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] w-full items-center justify-center">
        <SpinnerLoading size="sm" color="black" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[90vh] w-full min-w-0 flex-col gap-6 pb-28">
      <header className="relative flex items-center">
        {editing && (
          <button
            type="button"
            onClick={() => navigate()}
            className="absolute left-0 flex p-3"
            aria-label="Kembali"
          >
            <LeftChevron className="size-6" />
          </button>
        )}
        <h1 className="mx-auto text-center text-xl font-bold">
          {view === "add"
            ? "Tambah Kawasan Konservasi"
            : view === "edit"
              ? "Edit Kawasan Konservasi"
              : "Kawasan Konservasi"}
        </h1>
      </header>

      {error && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      {message && !editing && (
        <p
          role="status"
          className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700"
        >
          {message}
        </p>
      )}

      {!editing ? (
        <>
          <button
            type="button"
            onClick={() => navigate("add")}
            className="rounded-xl bg-sky-800 px-5 py-3 font-semibold text-white hover:bg-sky-900"
          >
            Tambah Kawasan Konservasi
          </button>
          <div className="grid gap-5 xl:grid-cols-2">
            {areas.map((area, index) => (
              <article
                key={area.id}
                className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-md"
              >
                <div className="relative aspect-[16/7] bg-stone-100">
                  <Image
                    src={area.image_path || PLACEHOLDER}
                    alt={localizedText(area.short_name, "id", area.name)}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-bold">
                        {localizedText(area.short_name, "id", area.name)}
                      </h2>
                      <p className="text-sm text-stone-500">/{area.slug}</p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${area.is_active ? "bg-emerald-100 text-emerald-800" : "bg-stone-200 text-stone-600"}`}
                    >
                      {area.is_active ? "Aktif" : "Nonaktif"}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-sm leading-6 text-stone-600">
                    {localizedText(area.summary, "id", "Belum ada ringkasan.")}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => void move(index, -1)}
                      className="rounded-lg border border-stone-300 px-3 py-2 disabled:opacity-40"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={index === areas.length - 1}
                      onClick={() => void move(index, 1)}
                      className="rounded-lg border border-stone-300 px-3 py-2 disabled:opacity-40"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate("edit", area.id)}
                      className="ml-auto rounded-lg bg-sky-800 px-4 py-2 font-semibold text-white"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      ) : draft ? (
        <ConservationAreaForm
          draft={draft}
          setDraft={setDraft}
          uploading={uploading}
          uploadImage={uploadImage}
        />
      ) : (
        <p className="rounded-xl bg-white p-4">Data kawasan tidak ditemukan.</p>
      )}

      {editing && draft && savedDraft && (
        <div className="fixed inset-x-0 bottom-0 z-[1200] flex justify-center px-4 pb-4">
          <div className="flex w-full max-w-xl items-center gap-3 rounded-2xl border border-stone-200 bg-white p-3 shadow-2xl">
            <button
              type="button"
              onClick={() => {
                setDraft(structuredClone(savedDraft));
                navigate();
              }}
              className="flex-1 rounded-xl border border-stone-300 px-4 py-3 font-semibold"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={saving || changeCount === 0}
              onClick={() => void save()}
              className="flex-1 rounded-xl bg-sky-800 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? "Menyimpan..." : `Simpan (${changeCount})`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ConservationAreaForm({
  draft,
  setDraft,
  uploading,
  uploadImage,
}: {
  draft: ConservationAreaRow;
  setDraft: (value: ConservationAreaRow) => void;
  uploading: "image" | "map" | null;
  uploadImage: (file: File, kind: "image" | "map") => Promise<void>;
}) {
  const setLocalized = (
    field: keyof ConservationAreaRow,
    locale: "id" | "en",
    value: string,
  ) =>
    setDraft({
      ...draft,
      [field]: { ...(draft[field] as LocalizedText), [locale]: value },
    });
  return (
    <div className="space-y-5 rounded-2xl bg-white p-5 shadow-md md:p-7">
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Slug">
          <input
            value={draft.slug}
            onChange={(e) =>
              setDraft({ ...draft, slug: slugify(e.target.value) })
            }
          />
        </Field>
        <Field label="Luas kawasan (hektare)">
          <input
            type="number"
            min="0"
            step="0.01"
            value={draft.area_hectares}
            onChange={(e) =>
              setDraft({ ...draft, area_hectares: Number(e.target.value) })
            }
          />
        </Field>
      </div>
      {(
        [
          "short_name",
          "official_name",
          "category",
          "location",
          "summary",
          "zoning_summary",
        ] as const
      ).map((field) => (
        <LocalizedField
          key={field}
          label={
            {
              short_name: "Nama pendek",
              official_name: "Nama resmi",
              category: "Kategori",
              location: "Lokasi",
              summary: "Ringkasan",
              zoning_summary: "Ringkasan pengelolaan dan zonasi",
            }[field]
          }
          value={draft[field]}
          multiline={field === "summary" || field === "zoning_summary"}
          onChange={(locale, value) => setLocalized(field, locale, value)}
        />
      ))}
      <LocalizedList
        label="Ekosistem utama"
        value={draft.ecosystems}
        onChange={(ecosystems) => setDraft({ ...draft, ecosystems })}
      />
      <LocalizedList
        label="Potensi dan kekhasan"
        value={draft.key_features}
        onChange={(key_features) => setDraft({ ...draft, key_features })}
      />
      <ZoningEditor draft={draft} setDraft={setDraft} />
      <DocumentsEditor draft={draft} setDraft={setDraft} />
      <div className="grid gap-5 md:grid-cols-2">
        <UploadField
          label="Gambar utama"
          value={draft.image_path}
          loading={uploading === "image"}
          onFile={(file) => void uploadImage(file, "image")}
        />
        <UploadField
          label="Gambar peta"
          value={draft.map_image_path}
          loading={uploading === "map"}
          onFile={(file) => void uploadImage(file, "map")}
        />
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Urutan">
          <input
            type="number"
            value={draft.display_order}
            onChange={(e) =>
              setDraft({ ...draft, display_order: Number(e.target.value) })
            }
          />
        </Field>
        <label className="flex items-center gap-3 self-end rounded-xl border border-stone-200 p-3">
          <input
            type="checkbox"
            checked={draft.is_active}
            onChange={(e) =>
              setDraft({ ...draft, is_active: e.target.checked })
            }
          />{" "}
          Tampilkan di halaman publik
        </label>
      </div>
    </div>
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
    <label className="flex flex-col gap-2 text-sm font-semibold text-stone-700">
      <span>{label}</span>
      {children}
    </label>
  );
}

function LocalizedField({
  label,
  value,
  multiline,
  onChange,
}: {
  label: string;
  value: LocalizedText;
  multiline?: boolean;
  onChange: (locale: "id" | "en", value: string) => void;
}) {
  return (
    <details open className="group/localized rounded-xl border border-stone-200 p-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-bold marker:content-none">
        <span>{label}</span>
        <DownChevron className="h-5 w-5 shrink-0 group-open/localized:hidden" />
        <UpChevron className="hidden h-5 w-5 shrink-0 group-open/localized:block" />
      </summary>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {(["id", "en"] as const).map((locale) => (
          <Field
            key={locale}
            label={locale === "id" ? "Bahasa Indonesia" : "English"}
          >
            {multiline ? (
              <textarea
                rows={4}
                value={value?.[locale] || ""}
                onChange={(e) => onChange(locale, e.target.value)}
              />
            ) : (
              <input
                value={value?.[locale] || ""}
                onChange={(e) => onChange(locale, e.target.value)}
              />
            )}
          </Field>
        ))}
      </div>
    </details>
  );
}

function LocalizedList({
  label,
  value,
  onChange,
}: {
  label: string;
  value: LocalizedText[];
  onChange: (value: LocalizedText[]) => void;
}) {
  const id = value.map((item) => item.id || "").join("\n");
  const en = value.map((item) => item.en || "").join("\n");
  const update = (locale: "id" | "en", text: string) => {
    const lines = text.split("\n");
    const size = Math.max(lines.length, value.length);
    onChange(
      Array.from({ length: size }, (_, index) => ({
        ...(value[index] || {}),
        [locale]: lines[index] || "",
      })).filter((item) => item.id || item.en),
    );
  };
  return (
    <details className="group/localized-list rounded-xl border border-stone-200 p-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-bold marker:content-none">
        <span>{label}</span>
        <DownChevron className="h-5 w-5 shrink-0 group-open/localized-list:hidden" />
        <UpChevron className="hidden h-5 w-5 shrink-0 group-open/localized-list:block" />
      </summary>
      <p className="mt-3 text-xs text-stone-500">
        Satu item per baris. Baris Indonesia dan English dipasangkan berdasarkan
        urutan.
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Field label="Bahasa Indonesia">
          <textarea
            rows={6}
            value={id}
            onChange={(e) => update("id", e.target.value)}
          />
        </Field>
        <Field label="English">
          <textarea
            rows={6}
            value={en}
            onChange={(e) => update("en", e.target.value)}
          />
        </Field>
      </div>
    </details>
  );
}

function ZoningEditor({
  draft,
  setDraft,
}: {
  draft: ConservationAreaRow;
  setDraft: (value: ConservationAreaRow) => void;
}) {
  const update = (
    index: number,
    updates: Partial<ConservationAreaRow["zoning_details"][number]>,
  ) =>
    setDraft({
      ...draft,
      zoning_details: draft.zoning_details.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...updates } : item,
      ),
    });
  return (
    <details className="group/zoning rounded-xl border border-stone-200 p-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-bold marker:content-none">
        <span>Rincian zonasi ({draft.zoning_details.length})</span>
        <DownChevron className="h-5 w-5 shrink-0 group-open/zoning:hidden" />
        <UpChevron className="hidden h-5 w-5 shrink-0 group-open/zoning:block" />
      </summary>
      <div className="mt-4 space-y-4">
        {draft.zoning_details.map((zone, index) => (
          <details
            key={index}
            className="group/zone rounded-xl border border-stone-200 p-4"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold marker:content-none">
              <span>{zone.name.id || `Zona ${index + 1}`}</span>
              <DownChevron className="h-5 w-5 shrink-0 group-open/zone:hidden" />
              <UpChevron className="hidden h-5 w-5 shrink-0 group-open/zone:block" />
            </summary>
            <div className="mt-4 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Nama zona (ID)">
                  <input
                    value={zone.name.id || ""}
                    onChange={(e) =>
                      update(index, {
                        name: { ...zone.name, id: e.target.value },
                      })
                    }
                  />
                </Field>
                <Field label="Zone name (EN)">
                  <input
                    value={zone.name.en || ""}
                    onChange={(e) =>
                      update(index, {
                        name: { ...zone.name, en: e.target.value },
                      })
                    }
                  />
                </Field>
                <Field label="Luas">
                  <input
                    value={zone.area}
                    onChange={(e) => update(index, { area: e.target.value })}
                  />
                </Field>
                <Field label="Persentase">
                  <input
                    value={zone.percentage}
                    onChange={(e) =>
                      update(index, { percentage: e.target.value })
                    }
                  />
                </Field>
              </div>
              <LocalizedField
                label="Peruntukan utama"
                value={zone.purpose}
                multiline
                onChange={(locale, value) =>
                  update(index, {
                    purpose: { ...zone.purpose, [locale]: value },
                  })
                }
              />
              <LocalizedList
                label="Yang boleh dilakukan"
                value={zone.allowed}
                onChange={(allowed) => update(index, { allowed })}
              />
              <LocalizedList
                label="Yang tidak boleh dilakukan"
                value={zone.prohibited}
                onChange={(prohibited) => update(index, { prohibited })}
              />
              <button
                type="button"
                onClick={() =>
                  setDraft({
                    ...draft,
                    zoning_details: draft.zoning_details.filter(
                      (_, itemIndex) => itemIndex !== index,
                    ),
                  })
                }
                className="rounded-lg bg-rose-700 px-4 py-2 font-semibold text-white"
              >
                Hapus zona
              </button>
            </div>
          </details>
        ))}
        <button
          type="button"
          onClick={() =>
            setDraft({
              ...draft,
              zoning_details: [
                ...draft.zoning_details,
                {
                  name: { id: "", en: "" },
                  area: "",
                  percentage: "",
                  purpose: { id: "", en: "" },
                  allowed: [],
                  prohibited: [],
                },
              ],
            })
          }
          className="rounded-lg border border-sky-800 px-4 py-2 font-semibold text-sky-800"
        >
          Tambah zona
        </button>
      </div>
    </details>
  );
}

function DocumentsEditor({
  draft,
  setDraft,
}: {
  draft: ConservationAreaRow;
  setDraft: (value: ConservationAreaRow) => void;
}) {
  const update = (
    index: number,
    updates: Partial<ConservationAreaRow["documents"][number]>,
  ) =>
    setDraft({
      ...draft,
      documents: draft.documents.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...updates } : item,
      ),
    });
  return (
    <details className="group/documents rounded-xl border border-stone-200 p-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-bold marker:content-none">
        <span>Dokumen resmi ({draft.documents.length})</span>
        <DownChevron className="h-5 w-5 shrink-0 group-open/documents:hidden" />
        <UpChevron className="hidden h-5 w-5 shrink-0 group-open/documents:block" />
      </summary>
      <div className="mt-4 space-y-4">
        {draft.documents.map((document, index) => (
          <details
            key={index}
            className="group/document rounded-xl border border-stone-200 p-4"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold marker:content-none">
              <span>{document.label.id || `Dokumen ${index + 1}`}</span>
              <DownChevron className="h-5 w-5 shrink-0 group-open/document:hidden" />
              <UpChevron className="hidden h-5 w-5 shrink-0 group-open/document:block" />
            </summary>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="Label (ID)">
                <input
                  value={document.label.id || ""}
                  onChange={(e) =>
                    update(index, {
                      label: { ...document.label, id: e.target.value },
                    })
                  }
                />
              </Field>
              <Field label="Label (EN)">
                <input
                  value={document.label.en || ""}
                  onChange={(e) =>
                    update(index, {
                      label: { ...document.label, en: e.target.value },
                    })
                  }
                />
              </Field>
              <Field label="Judul (ID)">
                <textarea
                  rows={3}
                  value={document.title.id || ""}
                  onChange={(e) =>
                    update(index, {
                      title: { ...document.title, id: e.target.value },
                    })
                  }
                />
              </Field>
              <Field label="Title (EN)">
                <textarea
                  rows={3}
                  value={document.title.en || ""}
                  onChange={(e) =>
                    update(index, {
                      title: { ...document.title, en: e.target.value },
                    })
                  }
                />
              </Field>
              <Field label="Path / URL dokumen">
                <input
                  value={document.path}
                  onChange={(e) => update(index, { path: e.target.value })}
                />
              </Field>
              <Field label="Jenis dokumen">
                <input
                  value={document.kind}
                  onChange={(e) => update(index, { kind: e.target.value })}
                />
              </Field>
              <button
                type="button"
                onClick={() =>
                  setDraft({
                    ...draft,
                    documents: draft.documents.filter(
                      (_, itemIndex) => itemIndex !== index,
                    ),
                  })
                }
                className="rounded-lg bg-rose-700 px-4 py-2 font-semibold text-white md:col-span-2"
              >
                Hapus dokumen
              </button>
            </div>
          </details>
        ))}
        <button
          type="button"
          onClick={() =>
            setDraft({
              ...draft,
              documents: [
                ...draft.documents,
                {
                  label: { id: "", en: "" },
                  title: { id: "", en: "" },
                  path: "",
                  kind: "",
                },
              ],
            })
          }
          className="rounded-lg border border-sky-800 px-4 py-2 font-semibold text-sky-800"
        >
          Tambah dokumen
        </button>
      </div>
    </details>
  );
}

function UploadField({
  label,
  value,
  loading,
  onFile,
}: {
  label: string;
  value: string | null;
  loading: boolean;
  onFile: (file: File) => void;
}) {
  const [dragging, setDragging] = useState(false);
  return (
    <Field label={label}>
      <label
        onDragEnter={(event) => {
          event.preventDefault();
          if (!loading) setDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!loading) setDragging(true);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null))
            setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files?.[0];
          if (file && !loading) onFile(file);
        }}
        className={`relative flex min-h-44 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed text-center ${dragging ? "border-sky-500 bg-sky-50" : "border-stone-300 bg-stone-50"}`}
      >
        {value ? (
          <Image src={value} alt="" fill className="object-cover" />
        ) : (
          <span className="p-5 text-sm text-stone-500">
            {loading ? "Mengunggah..." : "Klik atau jatuhkan gambar di sini"}
          </span>
        )}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={loading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
          }}
        />
      </label>
    </Field>
  );
}
