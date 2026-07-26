"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import TextareaAutosize from "react-textarea-autosize";
import { supabase } from "@/lib/supabase/supabaseClient";
import { updateData } from "@/lib/supabase/supabaseHelper";
import SpinnerLoading from "./SpinnerLoading";
import { getTableConfig, type ConfigItem } from "@/lib/tableConfig";

type AdminType = "staff" | "news" | "gallery";
type Locale = "id" | "en";

interface DataTypes {
  id: string;
  slug?: string;
  // shared/optional fields across all 3
  name?: string;
  image?: string;
  photo?: string;
  title?: string;
  position?: string;
  division?: string;
  division_long?: string;
  gender?: string;
  tag?: string;
  tag_long?: string;
  date?: string;
  content?: string;
  source?: string;
  description?: string;
}

interface Props {
  type: AdminType;
  oldData: DataTypes;
  locale?: Locale;
  signalUpdated: (updated: string) => void;
}

/** Payload types for updates (exact keys used in compareKeys) */
type StaffUpdate = {
  name: string;
  position: string;
  division: string;
  gender: string;
  photo: string;
};

type NewsUpdate = {
  tag: string;
  tag_long: string;
  date: string;
  title: string;
  content: string;
  source: string;
  image: string;
};

type GalleryUpdate = {
  image: string;
  tag: string;
  tag_long: string;
  title: string;
  date: string;
  description: string;
};

type Cfg =
  | {
      table: "staff";
      storageFolder: "staff";
      placeholder: string;
      urlField: "photo";
      labelFrom: () => string;
      buildUpdate: (url: string) => StaffUpdate;
      compareKeys: readonly (keyof StaffUpdate)[];
    }
  | {
      table: "news";
      storageFolder: "news";
      placeholder: string;
      urlField: "image";
      labelFrom: () => string;
      buildUpdate: (url: string) => NewsUpdate;
      compareKeys: readonly (keyof NewsUpdate)[];
    }
  | {
      table: "gallery";
      storageFolder: "gallery";
      placeholder: string;
      urlField: "image";
      labelFrom: () => string;
      buildUpdate: (url: string) => GalleryUpdate;
      compareKeys: readonly (keyof GalleryUpdate)[];
    };

export default function FormEdit({
  type,
  oldData,
  signalUpdated,
}: Props) {
  // file/image state
  const [fileName, setFileName] = useState(
    type === "staff" ? "Ganti Foto" : "Upload gambar",
  );
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [draggingImage, setDraggingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [options, setOptions] = useState<Record<string, ConfigItem[]>>({});

  // single form state that holds everything; render only what each type needs
  const [formData, setFormData] = useState({
    // staff
    name: "",
    photo: "",
    division: "",
    gender: "",
    position: "",
    title: "",
    // news + gallery
    image: "",
    tag: "",
    date: "",
    // news only
    content: "",
    source: "",
    // gallery only
    description: "",
  });

  // where to upload the file and which db table to update
  const cfg: Cfg = useMemo(() => {
    switch (type) {
      case "staff":
        return {
          table: "staff",
          storageFolder: "staff",
          placeholder: "/assets/icon_profile_u.png",
          urlField: "photo",
          labelFrom: () => formData.name,
          buildUpdate: (url: string): StaffUpdate => ({
            name: formData.name,
            position: formData.position,
            division: formData.division,
            gender: formData.gender,
            photo: url,
          }),
          compareKeys: [
            "name",
            "position",
            "division",
            "gender",
            "photo",
          ],
        };
      case "news":
        return {
          table: "news",
          storageFolder: "news",
          placeholder: "/assets/image_placeholder.png",
          urlField: "image",
          labelFrom: () => formData.title,
          buildUpdate: (url: string): NewsUpdate => ({
            tag: formData.tag,
            tag_long: formData.tag,
            date: formData.date,
            title: formData.title,
            content: formData.content,
            source: formData.source,
            image: url,
          }),
          compareKeys: [
            "tag",
            "tag_long",
            "date",
            "title",
            "content",
            "source",
            "image",
          ],
        };
      case "gallery":
        return {
          table: "gallery",
          storageFolder: "gallery",
          placeholder: "/assets/image_placeholder.png",
          urlField: "image",
          labelFrom: () => formData.title,
          buildUpdate: (url: string): GalleryUpdate => ({
            image: url,
            tag: formData.tag,
            tag_long: formData.tag,
            title: formData.title,
            date: formData.date,
            description: formData.description,
          }),
          compareKeys: [
            "image",
            "tag",
            "tag_long",
            "title",
            "date",
            "description",
          ],
        };
    }
  }, [type, formData]);

  // init on mount / when oldData changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });

    setFormData({
      // staff
      name: oldData.name ?? "",
      photo: oldData.photo ?? "",
      division: oldData.division ?? "",
      gender: oldData.gender ?? "",
      position: oldData.position ?? "",
      title: oldData.title ?? "",
      // news + gallery
      image: oldData.image ?? "",
      tag: oldData.tag ?? "",
      date: oldData.date ?? "",
      // news only
      content: oldData.content ?? "",
      source: oldData.source ?? "",
      // gallery only
      description: oldData.description ?? "",
    });

    // set preview from correct field per type
    const initialPreview =
      type === "staff" ? (oldData.photo ?? null) : (oldData.image ?? null);

    setPreview(initialPreview);
    setFile(null);
    setImageError(null);
    setFileName(type === "staff" ? "Ganti Foto" : "Upload gambar");
  }, [type, oldData]);

  useEffect(() => {
    void getTableConfig(type).then((config) => {
      if (!config) return;
      if (type === "staff") {
        const staff = config as { division_items: ConfigItem[]; position_items: ConfigItem[]; gender_items: ConfigItem[] };
        setOptions({ division: staff.division_items ?? [], position: staff.position_items ?? [], gender: staff.gender_items ?? [] });
      } else {
        setOptions({ tag: (config as { tag_items?: ConfigItem[] }).tag_items ?? [] });
      }
    });
  }, [type]);

  // cleanup blob URLs
  useEffect(() => {
    return () => {
      if (preview && preview.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  // helpers
  const toStr = (v: unknown) =>
    typeof v === "string" ? v : v == null ? "" : String(v);

  function pickOldSubset(keys: readonly string[]): Record<string, string> {
    const src = oldData as unknown as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const k of keys) out[k] = toStr(src[k]);
    return out;
  }

  function shallowEqualByKeys(
    keys: readonly string[],
    a: unknown,
    b: Record<string, string>,
  ): boolean {
    const ar = a as Record<string, unknown>;
    for (const k of keys) {
      if (toStr(ar[k]) !== b[k]) return false;
    }
    return true;
  }

  async function executeSave() {
    try {
      const currentUrl =
        cfg.urlField === "photo" ? formData.photo : formData.image;

      let finalUrl = currentUrl ?? "";

      if (file) {
        const filePath = `${cfg.storageFolder}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("images")
          .upload(filePath, file);
        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from("images").getPublicUrl(filePath);
        finalUrl = data.publicUrl;
      }

      const dataUpdate = cfg.buildUpdate(finalUrl);

      const oldSubset = pickOldSubset(cfg.compareKeys);

      if (shallowEqualByKeys(cfg.compareKeys, dataUpdate, oldSubset)) {
        signalUpdated("No Update");
      } else {
        setLoadingSubmit(true);
        await updateData(cfg.table, dataUpdate, oldData.id);
        const label = cfg.labelFrom() || "(tanpa judul)";
        signalUpdated(label);
      }

      setFile(null);
      setLoadingSubmit(false);
      setFileName(type === "staff" ? "Ganti Foto" : "Upload gambar");

      const urlMap = dataUpdate as Partial<
        Record<"photo" | "image", string | undefined>
      >;
      setPreview(urlMap[cfg.urlField] ?? cfg.placeholder);
    } catch (err) {
      console.error(err);
      setLoadingSubmit(false);
      alert(
        err instanceof Error
          ? err.message
          : "Update gagal. Terdapat masalah pada server!",
      );
    }
  }

  // submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeSave();
  };

  // === RENDER ===
  const imageSrc =
    preview ||
    (type === "staff" ? formData.photo : formData.image) ||
    cfg.placeholder;

  const selectImage = (selectedFile?: File) => {
    if (!selectedFile) return;
    if (!selectedFile.type.startsWith("image/")) {
      setImageError("File harus berupa gambar.");
      return;
    }

    setImageError(null);
    setFile(selectedFile);
    setFileName(selectedFile.name);
    setPreview(URL.createObjectURL(selectedFile));
  };

  return (
    <form
      className="flex flex-col w-full p-6 shadow-xl md:p-10 border border-stone-200 rounded-2xl"
      onSubmit={handleSubmit}
    >
      {/* IMAGE UPLOAD (shared) */}
      <div className="mb-3 flex flex-col gap-3 md:mb-6">
        <label
          htmlFor="file-input"
          onDragEnter={(event) => { event.preventDefault(); setDraggingImage(true); }}
          onDragOver={(event) => { event.preventDefault(); setDraggingImage(true); }}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDraggingImage(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setDraggingImage(false);
            selectImage(event.dataTransfer.files?.[0]);
          }}
          className={`flex min-h-48 w-full cursor-pointer flex-col items-center justify-center gap-3 overflow-hidden rounded-lg border-2 border-dashed p-4 text-center transition ${
            draggingImage
              ? "border-sky-500 bg-sky-50"
              : "border-stone-300 bg-white hover:bg-stone-50"
          }`}
        >
          <input
            id="file-input"
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) => {
              selectImage(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <Image
            src={imageSrc}
            alt="Preview"
            className="h-full max-h-48 w-full object-contain"
            width={800}
            height={600}
          />
          <div>
            <p className="text-sm font-semibold text-stone-700">Tarik gambar baru ke sini atau klik untuk mengganti</p>
            <p className="mt-1 text-xs text-stone-500">{fileName}</p>
          </div>
        </label>
        {imageError && <p role="alert" className="text-xs text-red-600">{imageError}</p>}
      </div>

      {/* ===== STAFF FORM ===== */}
      {type === "staff" && (
        <>
          <label
            className="text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw]"
            htmlFor="name"
          >
            Nama Lengkap
          </label>
          <input
            id="name"
            type="text"
            placeholder="Nama Staff"
            className="h-6 md:h-10 text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw] bg-stone-100 p-3 rounded-md mt-2 md:mb-6 mb-3"
            value={formData.name}
            onChange={(e) =>
              setFormData((s) => ({ ...s, name: e.target.value }))
            }
            required
          />

          <label
            className="text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw]"
            htmlFor="gender"
          >
            Gender
          </label>
          <select
            id="gender"
            className="w-full md:w-auto bg-stone-100 rounded-md mt-2 md:mb-6 mb-3 py-2 px-3 text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw]"
            value={formData.gender}
            onChange={(e) =>
              setFormData((s) => ({ ...s, gender: e.target.value }))
            }
          >
            <option value="">-- Pilih Gender --</option>
            {(options.gender ?? []).map((item) => <option key={item.key} value={item.key}>{item.short.id}</option>)}
          </select>

          <label
            className="text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw]"
            htmlFor="position"
          >
            Jabatan
          </label>
          <select id="position" className="w-full md:w-auto bg-stone-100 rounded-md mt-2 md:mb-6 mb-3 py-2 px-3 text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw]" value={formData.position} onChange={(e) => setFormData((s) => ({ ...s, position: e.target.value }))} required>
            <option value="" disabled>-- Pilih Jabatan --</option>
            {(options.position ?? []).map((item) => <option key={item.key} value={item.key}>{item.short.id}</option>)}
          </select>

          <label
            className="text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw]"
            htmlFor="division"
          >
            Bidang
          </label>
          <select
            id="division"
            className="w-full md:w-auto bg-stone-100 rounded-md mt-2 md:mb-6 mb-3 py-2 px-3 text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw]"
            value={formData.division}
            onChange={(e) =>
              setFormData((s) => ({ ...s, division: e.target.value }))
            }
            required
          >
            <option value="" disabled>
              -- Pilih Bidang --
            </option>
            {(options.division ?? []).map((item) => <option key={item.key} value={item.key}>{item.short.id}</option>)}
          </select>
        </>
      )}

      {/* ===== NEWS FORM ===== */}
      {type === "news" && (
        <>
          <label
            className="text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw]"
            htmlFor="tag"
          >
            Tag
          </label>
          <select
            id="tag"
            className="w-full md:w-auto bg-stone-100 rounded-md mt-2 md:mb-6 mb-3 py-2 px-3 text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw]"
            value={formData.tag}
            onChange={(e) =>
              setFormData((s) => ({ ...s, tag: e.target.value }))
            }
            required
          >
            <option value="" disabled>
              -- Pilih Tag --
            </option>
            {(options.tag ?? []).map((item) => <option key={item.key} value={item.key}>{item.short.id}</option>)}
          </select>

          <label
            className="text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw]"
            htmlFor="date"
          >
            Tanggal
          </label>
          <input
            id="date"
            type="date"
            className="w-full md:w-auto bg-stone-100 rounded-md mt-2 md:mb-6 mb-3 px-3 py-2 text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw] focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={formData.date}
            onChange={(e) =>
              setFormData((s) => ({ ...s, date: e.target.value }))
            }
            required
          />

          <label
            className="text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw]"
            htmlFor="title"
          >
            Judul
          </label>
          <input
            id="title"
            type="text"
            placeholder="Masukkan Judul"
            className="h-6 md:h-10 text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw] bg-stone-100 p-3 rounded-md mt-2 md:mb-6 mb-3"
            value={formData.title}
            onChange={(e) =>
              setFormData((s) => ({ ...s, title: e.target.value }))
            }
            required
          />

          <label
            className="text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw]"
            htmlFor="content"
          >
            Konten
          </label>
          <TextareaAutosize
            id="content"
            minRows={4}
            placeholder="Masukkan Konten"
            className="w-full bg-stone-100 p-3 rounded-md text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw] caret-black mt-2 md:mb-6 mb-3"
            value={formData.content}
            onChange={(e) =>
              setFormData((s) => ({ ...s, content: e.target.value }))
            }
            required
          />

          <label
            className="text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw]"
            htmlFor="source"
          >
            Sumber
          </label>
          <input
            id="source"
            type="text"
            placeholder="Masukkan sumber Gambar / Berita"
            className="h-6 md:h-10 text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw] bg-stone-100 p-3 rounded-md mt-2 md:mb-6 mb-3"
            value={formData.source}
            onChange={(e) =>
              setFormData((s) => ({ ...s, source: e.target.value }))
            }
            required
          />
        </>
      )}

      {/* ===== GALLERY FORM ===== */}
      {type === "gallery" && (
        <>
          <label
            className="text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw]"
            htmlFor="tag"
          >
            Tag
          </label>
          <select
            id="tag"
            className="w-full md:w-auto bg-stone-100 rounded-md mt-2 md:mb-6 mb-3 py-2 px-3 text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw]"
            value={formData.tag}
            onChange={(e) =>
              setFormData((s) => ({ ...s, tag: e.target.value }))
            }
            required
          >
            <option value="" disabled>
              -- Pilih Tag --
            </option>
            {(options.tag ?? []).map((item) => <option key={item.key} value={item.key}>{item.short.id}</option>)}
          </select>

          <label
            className="text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw]"
            htmlFor="title"
          >
            Judul Gambar
          </label>
          <input
            id="title"
            type="text"
            placeholder="Masukkan judul gambar"
            className="h-6 md:h-10 text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw] bg-stone-100 p-3 rounded-md mt-2 md:mb-6 mb-3"
            value={formData.title}
            onChange={(e) =>
              setFormData((s) => ({ ...s, title: e.target.value }))
            }
            required
          />

          <label
            className="text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw]"
            htmlFor="date"
          >
            Tanggal
          </label>
          <input
            id="date"
            type="date"
            className="w-full md:w-auto bg-stone-100 rounded-md mt-2 md:mb-6 mb-3 px-3 py-2 text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw] focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={formData.date}
            onChange={(e) =>
              setFormData((s) => ({ ...s, date: e.target.value }))
            }
            required
          />

          <label
            className="text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw]"
            htmlFor="description"
          >
            Deskripsi / Caption
          </label>
          <TextareaAutosize
            id="description"
            minRows={4}
            placeholder="Masukkan Deskripsi / Caption"
            className="w-full bg-stone-100 p-3 rounded-md text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw] caret-black mt-2 md:mb-6 mb-3"
            value={formData.description}
            onChange={(e) =>
              setFormData((s) => ({ ...s, description: e.target.value }))
            }
            required
          />
        </>
      )}

      {/* SUBMIT */}
      <button
        type="submit"
        className="flex justify-center items-center bg-sky-800 text-white rounded-lg md:rounded-2xl hover:bg-stone-400 hover:text-black md:mb-6 mb-3 p-1.5 md:p-3"
      >
        <p
          className={`${
            loadingSubmit ? "hidden" : "flex"
          } text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw]`}
        >
          Kirim
        </p>
        <div className={loadingSubmit ? "flex" : "hidden"}>
          <SpinnerLoading size="sm" color="white" />
        </div>
      </button>
    </form>
  );
}
