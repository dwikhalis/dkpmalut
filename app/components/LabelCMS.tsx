"use client";

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/supabaseClient";
import {
  getDateTimeStamp,
  getIconImages,
  type IconImage,
} from "@/lib/supabase/supabaseHelper";
import AlertNotif from "./AlertNotif";

type Locale = "id" | "en";

type AppLabel = {
  id?: string;
  component: string;
  type: "text" | "textarea" | "number" | "image" | "icon" | string;
  target: string;
  value: string;
  locale: string;
  is_active: boolean;
};

type OriginalLabelValue = {
  value: string;
  is_active: boolean;
};

const IMAGE_BUCKET = "images";
const ICON_FOLDER = "icon_images";
const IMAGE_FOLDER = "assets";

const locales: { value: Locale; label: string }[] = [
  { value: "id", label: "Indonesia" },
  { value: "en", label: "English" },
];

const LABEL_ORDER = [
  ["navbar", "org_logo"],
  ["navbar", "org_name_main"],
  ["navbar", "org_name_sub"],
  ["navbar", "nav_menu_organization"],
  ["navbar", "nav_menu_news"],
  ["navbar", "nav_menu_gallery"],
  ["navbar", "nav_menu_data"],
  ["navbar", "nav_menu_contact"],
  ["navbar", "nav_menu_login"],
  ["navbar", "nav_menu_loggedin"],
  ["navbar", "nav_menu_profile"],
  ["navbar", "nav_menu_logout"],

  ["hero", "hero_title"],
  ["hero", "hero_subtitle"],
  ["hero", "hero_button_label"],
  ["hero", "hero_button_path"],

  ["secone", "secone_left_title"],
  ["secone", "secone_left_subtitle"],
  ["secone", "secone_right_title"],
  ["secone", "secone_right_tab_title_1"],
  ["secone", "secone_right_tab_subtitle_1"],
  ["secone", "secone_right_tab_title_2"],
  ["secone", "secone_right_tab_subtitle_2"],
  ["secone", "secone_right_button_label"],
  ["secone", "secone_right_button_path"],

  ["sectwo", "sectwo_icon_path_1"],
  ["sectwo", "sectwo_icon_path_2"],
  ["sectwo", "sectwo_icon_path_3"],
  ["sectwo", "sectwo_icon_path_4"],
  ["sectwo", "sectwo_icon_path_5"],
  ["sectwo", "sectwo_icon_path_6"],
  ["sectwo", "sectwo_tab_num_1"],
  ["sectwo", "sectwo_tab_num_2"],
  ["sectwo", "sectwo_tab_num_3"],
  ["sectwo", "sectwo_tab_num_4"],
  ["sectwo", "sectwo_tab_num_5"],
  ["sectwo", "sectwo_tab_num_6"],
  ["sectwo", "sectwo_tab_num_suffix_1"],
  ["sectwo", "sectwo_tab_num_suffix_2"],
  ["sectwo", "sectwo_tab_num_suffix_3"],
  ["sectwo", "sectwo_tab_num_suffix_4"],
  ["sectwo", "sectwo_tab_num_suffix_5"],
  ["sectwo", "sectwo_tab_num_suffix_6"],
  ["sectwo", "sectwo_tab_title_1"],
  ["sectwo", "sectwo_tab_title_2"],
  ["sectwo", "sectwo_tab_title_3"],
  ["sectwo", "sectwo_tab_title_4"],
  ["sectwo", "sectwo_tab_title_5"],
  ["sectwo", "sectwo_tab_title_6"],
  ["sectwo", "sectwo_tab_subtitle_1"],
  ["sectwo", "sectwo_tab_subtitle_2"],
  ["sectwo", "sectwo_tab_subtitle_3"],
  ["sectwo", "sectwo_tab_subtitle_4"],
  ["sectwo", "sectwo_tab_subtitle_5"],
  ["sectwo", "sectwo_tab_subtitle_6"],

  ["secthree", "secthree_title"],
  ["secthree", "secthree_subtitle_1"],
  ["secthree", "secthree_subtitle_2"],
  ["secthree", "secthree_button_label"],
  ["secthree", "secthree_button_path"],

  ["secfour", "secfour_title"],
  ["secfour", "secfour_subtitle_1"],
  ["secfour", "secfour_subtitle_2"],
  ["secfour", "secfour_button_label"],
  ["secfour", "secfour_button_path"],

  ["secfive", "secfive_title"],
  ["secfive", "secfive_subtitle_1"],
  ["secfive", "secfive_subtitle_2"],
  ["secfive", "secfive_button_label"],
  ["secfive", "secfive_button_path"],

  ["footer", "footer_copyright_title"],
  ["footer", "footer_copyright_subtitle"],
  ["footer", "footer_copyright_subtitle_path"],
  ["footer", "socmed_facebook"],
  ["footer", "socmed_instagram"],
  ["footer", "socmed_youtube"],
  ["footer", "socmed_xtwitter"],
  ["footer", "socmed_tiktok"],
  ["footer", "footer_tab_title_1"],
  ["footer", "footer_tab_title_2"],
  ["footer", "footer_tab_title_3"],
  ["footer", "footer_tab_label_1_1"],
  ["footer", "footer_tab_label_1_2"],
  ["footer", "footer_tab_label_1_3"],
  ["footer", "footer_tab_label_1_4"],
  ["footer", "footer_tab_label_1_5"],
  ["footer", "footer_tab_label_2_1"],
  ["footer", "footer_tab_label_2_2"],
  ["footer", "footer_tab_label_2_3"],
  ["footer", "footer_tab_label_2_4"],
  ["footer", "footer_tab_label_2_5"],
  ["footer", "footer_tab_label_3_1"],
  ["footer", "footer_tab_label_3_2"],
  ["footer", "footer_tab_label_3_3"],
  ["footer", "footer_tab_label_3_4"],
  ["footer", "footer_tab_label_3_5"],
  ["footer", "footer_tab_label_1_1_path"],
  ["footer", "footer_tab_label_1_2_path"],
  ["footer", "footer_tab_label_1_3_path"],
  ["footer", "footer_tab_label_1_4_path"],
  ["footer", "footer_tab_label_1_5_path"],
  ["footer", "footer_tab_label_2_1_path"],
  ["footer", "footer_tab_label_2_2_path"],
  ["footer", "footer_tab_label_2_3_path"],
  ["footer", "footer_tab_label_2_4_path"],
  ["footer", "footer_tab_label_2_5_path"],
  ["footer", "footer_tab_label_3_1_path"],
  ["footer", "footer_tab_label_3_2_path"],
  ["footer", "footer_tab_label_3_3_path"],
  ["footer", "footer_tab_label_3_4_path"],
  ["footer", "footer_tab_label_3_5_path"],

  ["page_organization", "page_organization_title"],
  ["page_organization", "page_organization_subtitle"],

  ["page_news", "page_news_title"],
  ["page_news", "page_news_subtitle"],

  ["page_gallery", "page_gallery_title"],
  ["page_gallery", "page_gallery_subtitle"],

  ["page_data", "page_data_title"],
  ["page_data", "page_data_subtitle"],

  ["page_contact", "page_contact_title"],
  ["page_contact", "page_contact_subtitle"],
] as const;

const COMPONENT_ORDER = Array.from(
  new Set(LABEL_ORDER.map(([component]) => component)),
);

const componentOrderMap = new Map<string, number>(
  COMPONENT_ORDER.map((component, index) => [component, index]),
);

const labelOrderMap = new Map<string, number>(
  LABEL_ORDER.map(([component, target], index) => [
    `${component}::${target}`,
    index,
  ]),
);

function makeKey(component: string, target: string) {
  return `${component}::${target}`;
}

function getComponentOrder(component: string) {
  return componentOrderMap.get(component) ?? 9999;
}

function getLabelOrder(component: string, target: string) {
  return labelOrderMap.get(makeKey(component, target)) ?? 999999;
}

function sortLabels(a: AppLabel, b: AppLabel) {
  const componentDiff =
    getComponentOrder(a.component) - getComponentOrder(b.component);

  if (componentDiff !== 0) return componentDiff;

  const labelDiff =
    getLabelOrder(a.component, a.target) - getLabelOrder(b.component, b.target);

  if (labelDiff !== 0) return labelDiff;

  return a.target.localeCompare(b.target);
}

function normalizeRows(rows: unknown): AppLabel[] {
  if (!Array.isArray(rows)) return [];

  return rows.map((row) => {
    const item = row as Partial<AppLabel>;

    return {
      id: item.id,
      component: String(item.component || "").trim(),
      type: String(item.type || "text")
        .trim()
        .toLowerCase(),
      target: String(item.target || "").trim(),
      value: String(item.value || ""),
      locale: String(item.locale || "id").trim(),
      is_active: item.is_active ?? true,
    };
  });
}

function createOriginalMap(rows: AppLabel[]) {
  return rows.reduce<Record<string, OriginalLabelValue>>((acc, item) => {
    acc[makeKey(item.component, item.target)] = {
      value: item.value || "",
      is_active: item.is_active,
    };

    return acc;
  }, {});
}

function formatComponentName(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function hasId(label: AppLabel): label is AppLabel & { id: string } {
  return Boolean(label.id);
}

function safeFileName(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-");
}

export default function LabelCMS() {
  const [locale, setLocale] = useState<Locale>("id");
  const [labels, setLabels] = useState<AppLabel[]>([]);
  const [originalMap, setOriginalMap] = useState<
    Record<string, OriginalLabelValue>
  >({});
  const [componentFilter, setComponentFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [iconOptions, setIconOptions] = useState<IconImage[]>([]);
  const [openIconPicker, setOpenIconPicker] = useState<string | null>(null);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showConfirmSave, setShowConfirmSave] = useState(false);
  const [showSuccessSave, setShowSuccessSave] = useState(false);

  const fetchLabels = useCallback(async (selectedLocale: Locale) => {
    setLoading(true);
    setMessage(null);
    setErrorMsg(null);

    const { data: templateData, error: templateError } = await supabase
      .from("app_labels")
      .select("id, component, type, target, value, locale, is_active")
      .eq("locale", "id");

    if (templateError) {
      setErrorMsg(templateError.message);
      setLoading(false);
      return;
    }

    const templateRows = normalizeRows(templateData).sort(sortLabels);

    if (selectedLocale === "id") {
      setLabels(templateRows);
      setOriginalMap(createOriginalMap(templateRows));
      setLoading(false);
      return;
    }

    const { data: localeData, error: localeError } = await supabase
      .from("app_labels")
      .select("id, component, type, target, value, locale, is_active")
      .eq("locale", selectedLocale);

    if (localeError) {
      setErrorMsg(localeError.message);
      setLoading(false);
      return;
    }

    const localeRows = normalizeRows(localeData).sort(sortLabels);

    const localeMap = new Map(
      localeRows.map((item) => [makeKey(item.component, item.target), item]),
    );

    const mergedRows: AppLabel[] = templateRows.map((template) => {
      const existing = localeMap.get(
        makeKey(template.component, template.target),
      );

      return {
        id: existing?.id,
        component: template.component,
        type: template.type,
        target: template.target,
        value: existing?.value || "",
        locale: selectedLocale,
        is_active: existing?.is_active ?? template.is_active,
      };
    });

    const sortedMergedRows = mergedRows.sort(sortLabels);

    setLabels(sortedMergedRows);
    setOriginalMap(createOriginalMap(sortedMergedRows));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLabels(locale);
    setOpenIconPicker(null);
  }, [fetchLabels, locale]);

  useEffect(() => {
    async function loadIconImages() {
      try {
        const icons = await getIconImages();

        console.log("Icon images:", icons);

        setIconOptions(icons);

        if (icons.length === 0) {
          setErrorMsg(
            'Tidak ada icon ditemukan di Supabase Storage bucket "images" folder "icon_images".',
          );
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Gagal mengambil icon dari Supabase Storage.";

        console.error("Failed to load icon images:", message);
        setErrorMsg(message);
        setIconOptions([]);
      }
    }

    loadIconImages();
  }, []);

  const changedLabels = useMemo(() => {
    return labels.filter((item) => {
      const original = originalMap[makeKey(item.component, item.target)];

      if (!original) return false;

      return (
        item.value !== original.value || item.is_active !== original.is_active
      );
    });
  }, [labels, originalMap]);

  const changedKeySet = useMemo(() => {
    return new Set(
      changedLabels.map((item) => makeKey(item.component, item.target)),
    );
  }, [changedLabels]);

  const changeCount = changedLabels.length;

  const componentOptions = useMemo(() => {
    return Array.from(new Set(labels.map((item) => item.component))).sort(
      (a, b) => {
        const orderDiff = getComponentOrder(a) - getComponentOrder(b);
        if (orderDiff !== 0) return orderDiff;
        return a.localeCompare(b);
      },
    );
  }, [labels]);

  const typeOptions = useMemo(() => {
    return Array.from(new Set(labels.map((item) => item.type))).sort((a, b) => {
      const orderDiff = getComponentOrder(a) - getComponentOrder(b);
      if (orderDiff !== 0) return orderDiff;
      return a.localeCompare(b);
    });
  }, [labels]);

  function getImagePreviewUrl(value: string) {
    if (!value) return "";

    if (
      value.startsWith("http://") ||
      value.startsWith("https://") ||
      value.startsWith("/")
    ) {
      return value;
    }

    const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(value);
    return data.publicUrl;
  }

  function updateLabelValue(component: string, target: string, value: string) {
    setLabels((current) =>
      current.map((item) =>
        item.component === component && item.target === target
          ? { ...item, value }
          : item,
      ),
    );
  }

  async function handleImageUpload(label: AppLabel, file?: File) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMsg("File harus berupa gambar.");
      return;
    }

    const key = makeKey(label.component, label.target);

    setUploadingKey(key);
    setErrorMsg(null);
    setMessage(null);

    const extension = file.name.split(".").pop() || "png";
    const filename = `${safeFileName(
      label.target,
    )}-${getDateTimeStamp(Date.now())}.${extension}`;

    const storagePath = `${label.type === "image" ? IMAGE_FOLDER : ICON_FOLDER}/${filename}`;

    const { error } = await supabase.storage
      .from(IMAGE_BUCKET)
      .upload(storagePath, file, {
        upsert: true,
        contentType: file.type,
      });

    setUploadingKey(null);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    updateLabelValue(label.component, label.target, storagePath);
  }

  async function saveChangedRows(rows: AppLabel[]) {
    setErrorMsg(null);
    setMessage(null);

    if (rows.length === 0) {
      setErrorMsg("Tidak ada perubahan yang perlu disimpan.");
      return false;
    }

    const missingRows = rows.filter((item) => !item.id);

    if (missingRows.length > 0) {
      setErrorMsg(
        `${missingRows.length} label tidak bisa disimpan karena row locale "${locale}" belum ada di Supabase.`,
      );
      return false;
    }

    const rowsWithId = rows.filter(hasId);
    let updatedCount = 0;

    for (const item of rowsWithId) {
      const { data, error } = await supabase
        .from("app_labels")
        .update({
          value: item.value || "",
          is_active: item.is_active,
        })
        .eq("id", item.id)
        .eq("locale", locale)
        .select("id, target, value");

      if (error) {
        setErrorMsg(error.message);
        return false;
      }

      if (!data || data.length === 0) {
        setErrorMsg(
          `Label "${item.target}" tidak berhasil diupdate. Kemungkinan row tidak ditemukan, locale tidak cocok, atau RLS Supabase menolak update.`,
        );
        return false;
      }

      updatedCount += data.length;
    }

    setMessage(`${updatedCount} perubahan label berhasil disimpan.`);
    return true;
  }

  async function handleConfirmSave(confirmation: boolean) {
    if (!confirmation) {
      setShowConfirmSave(false);
      return;
    }

    setSaving(true);

    const success = await saveChangedRows(changedLabels);

    setSaving(false);
    setShowConfirmSave(false);

    if (success) {
      await fetchLabels(locale);
      setShowSuccessSave(true);
    }
  }

  function renderInput(label: AppLabel) {
    const commonClass =
      "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400";

    const key = makeKey(label.component, label.target);
    const previewUrl = getImagePreviewUrl(label.value);

    if (
      label.type === "image" &&
      (typeFilter === "all" || typeFilter === "image")
    ) {
      return (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-300 bg-white">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt={label.target}
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="text-xs text-slate-400">No image</span>
              )}
            </div>

            <label
              htmlFor={`upload-${key}`}
              className={`w-fit rounded-lg px-4 py-2 text-sm font-bold text-white ${
                !label.id || uploadingKey === key
                  ? "cursor-not-allowed bg-slate-400 opacity-60"
                  : "cursor-pointer bg-sky-600"
              }`}
            >
              {uploadingKey === key ? "Mengupload..." : "Ubah"}
            </label>

            <input
              id={`upload-${key}`}
              type="file"
              accept="image/*"
              disabled={!label.id || uploadingKey === key}
              onChange={(e) => {
                handleImageUpload(label, e.target.files?.[0]);
                e.currentTarget.value = "";
              }}
              className="hidden"
            />
          </div>

          <input
            type="text"
            value={label.value}
            disabled={!label.id}
            onChange={(e) =>
              updateLabelValue(label.component, label.target, e.target.value)
            }
            className={commonClass}
          />
        </div>
      );
    }

    if (
      label.type === "icon" &&
      (typeFilter === "all" || typeFilter === "icon")
    ) {
      const isOpen = openIconPicker === key;

      return (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-300 bg-white">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt={label.target}
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="text-xs text-slate-400">No icon</span>
              )}
            </div>

            <button
              type="button"
              disabled={!label.id}
              onClick={() => setOpenIconPicker(isOpen ? null : key)}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              Ubah
            </button>
          </div>

          {isOpen && (
            <div className="flex flex-wrap max-h-72 grid-cols-4 gap-3 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 shadow-lg md:grid-cols-8">
              {iconOptions.length === 0 ? (
                <p className="col-span-4 text-sm text-slate-500 md:col-span-8">
                  Tidak ada icon ditemukan.
                </p>
              ) : (
                iconOptions.map((icon) => (
                  <button
                    key={icon.path}
                    type="button"
                    onClick={() => {
                      updateLabelValue(
                        label.component,
                        label.target,
                        icon.path,
                      );
                      setOpenIconPicker(null);
                    }}
                    className={`flex h-16 w-[25%] grow items-center justify-center rounded-lg border bg-slate-50 p-2 hover:border-sky-500 ${
                      label.value === icon.path
                        ? "border-sky-500 ring-2 ring-sky-200"
                        : "border-slate-200"
                    }`}
                    title={icon.name}
                  >
                    <img
                      src={icon.url}
                      alt={icon.name}
                      className="h-full w-full object-contain"
                    />
                  </button>
                ))
              )}
            </div>
          )}

          <input
            type="text"
            value={label.value}
            disabled={!label.id}
            onChange={(e) =>
              updateLabelValue(label.component, label.target, e.target.value)
            }
            className={commonClass}
          />
        </div>
      );
    }

    if (
      label.type === "textarea" &&
      (typeFilter === "all" || typeFilter === "textarea")
    ) {
      return (
        <textarea
          value={label.value}
          rows={4}
          disabled={!label.id}
          onChange={(e) =>
            updateLabelValue(label.component, label.target, e.target.value)
          }
          className={`${commonClass} min-h-28`}
        />
      );
    }

    if (
      label.type === "number" &&
      (typeFilter === "all" || typeFilter === "number")
    ) {
      return (
        <input
          type="number"
          value={label.value}
          disabled={!label.id}
          onChange={(e) =>
            updateLabelValue(label.component, label.target, e.target.value)
          }
          className={commonClass}
        />
      );
    }

    return (
      <input
        type="text"
        value={label.value}
        disabled={!label.id}
        onChange={(e) =>
          updateLabelValue(label.component, label.target, e.target.value)
        }
        className={commonClass}
      />
    );
  }

  const groupedLabels = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    const filtered = labels.filter((item) => {
      const matchComponent =
        componentFilter === "all" || item.component === componentFilter;

      const matchType = typeFilter === "all" || item.type === typeFilter;

      const matchSearch =
        !keyword ||
        item.component.toLowerCase().includes(keyword) ||
        item.target.toLowerCase().includes(keyword) ||
        item.type.toLowerCase().includes(keyword) ||
        item.value.toLowerCase().includes(keyword);

      return matchComponent && matchType && matchSearch;
    });

    const grouped = filtered.reduce<Record<string, AppLabel[]>>((acc, item) => {
      if (!acc[item.component]) acc[item.component] = [];
      acc[item.component].push(item);
      return acc;
    }, {});

    Object.keys(grouped).forEach((component) => {
      grouped[component].sort(sortLabels);
    });

    return grouped;
  }, [labels, search, componentFilter, typeFilter]);

  if (loading) {
    return <p>Loading labels...</p>;
  }

  const localeSelect = true;

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-md md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold mb-3">App CMS</h2>
          <p className="text-sm text-slate-600">
            Content Management System (CMS) <br />
            Edit teks aplikasi berdasarkan component, target, dan bahasa.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowConfirmSave(true)}
          disabled={changeCount === 0 || saving}
          className="rounded-lg bg-sky-600 px-5 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving
            ? "Menyimpan..."
            : `Simpan Perubahan${changeCount > 0 ? ` (${changeCount})` : ""}`}
        </button>
      </div>

      <div className="flex flex-wrap gap-3 rounded-2xl bg-white p-4 shadow-md md:grid-cols-[220px_220px_1fr]">
        {/* //! FILTER LOCALE / LANGUAGE */}
        {localeSelect && (
          <div className="w-[25%]">
            <label className="mb-1 block text-xs font-bold text-slate-500">
              Bahasa
            </label>

            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value as Locale)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500"
            >
              {locales.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* //! FILTER COMPONENT */}
        <div className="grow">
          <label className="mb-1 block text-xs font-bold text-slate-500">
            Component
          </label>

          <select
            value={componentFilter}
            onChange={(e) => setComponentFilter(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500"
          >
            <option value="all">Semua Component</option>

            {componentOptions.map((component) => (
              <option key={component} value={component}>
                {formatComponentName(component)}
              </option>
            ))}
          </select>
        </div>

        {/* //! FILTER TYPE */}
        <div className="grow">
          <label className="mb-1 block text-xs font-bold text-slate-500">
            Type
          </label>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500"
          >
            <option value="all">Semua Type</option>

            {typeOptions.map((type) => (
              <option key={type} value={type}>
                {formatComponentName(type)}
              </option>
            ))}
          </select>
        </div>

        {/* //! SEARCH LABEL */}
        <div className="grow">
          <label className="mb-1 block text-xs font-bold text-slate-500">
            Cari Label
          </label>

          <input
            type="text"
            placeholder="Cari target atau value..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500"
          />
        </div>
      </div>

      {(message || errorMsg) && (
        <div
          className={`rounded-xl px-4 py-3 text-sm ${
            errorMsg
              ? "bg-rose-100 text-rose-700"
              : "bg-emerald-100 text-emerald-700"
          }`}
        >
          {errorMsg || message}
        </div>
      )}

      <div className="flex flex-col gap-6">
        {Object.entries(groupedLabels).length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-sm shadow-md">
            Tidak ada label.
          </div>
        ) : (
          Object.entries(groupedLabels)
            .sort(([a], [b]) => {
              const orderDiff = getComponentOrder(a) - getComponentOrder(b);
              if (orderDiff !== 0) return orderDiff;
              return a.localeCompare(b);
            })
            .map(([component, items]) => (
              <section
                key={component}
                className="rounded-2xl bg-white p-4 shadow-md"
              >
                <div className="mb-5 border-b border-slate-200 pb-3">
                  <h3 className="font-bold">
                    {formatComponentName(component)}
                  </h3>
                  <p className="text-xs text-slate-500">
                    component: {component}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {items.map((label) => {
                    const key = makeKey(label.component, label.target);
                    const isChanged = changedKeySet.has(key);

                    return (
                      <div
                        key={key}
                        className={`grid grid-cols-1 gap-2 rounded-xl p-3 md:grid-cols-[240px_1fr] ${
                          isChanged
                            ? "bg-sky-50 ring-1 ring-sky-200"
                            : "bg-slate-50"
                        }`}
                      >
                        <div>
                          <label className="block text-sm font-bold text-slate-700">
                            {label.target}
                          </label>

                          <p className="text-xs text-slate-400">
                            type: {label.type}
                          </p>

                          {!label.id && (
                            <p className="mt-1 text-xs text-rose-500">
                              Row locale belum ada di Supabase.
                            </p>
                          )}
                        </div>

                        <div>{renderInput(label)}</div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))
        )}
      </div>

      {showConfirmSave && (
        <AlertNotif
          type="double"
          yesText="Ya"
          noText="Tidak"
          msg={`Simpan (${changeCount}) perubahan label aplikasi?`}
          icon="warning"
          loading={saving}
          confirm={handleConfirmSave}
        />
      )}

      {showSuccessSave && (
        <AlertNotif
          type="single"
          yesText="Ok"
          msg={message || "Perubahan label aplikasi berhasil disimpan."}
          icon="success"
          confirm={(res) => res && setShowSuccessSave(false)}
        />
      )}
    </div>
  );
}
