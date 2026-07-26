"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import TextareaAutosize from "react-textarea-autosize";
import { supabase } from "@/lib/supabase/supabaseClient";
import SpinnerLoading from "./SpinnerLoading";
import AlertNotif from "./AlertNotif";
import { getTableConfig, type ConfigItem } from "@/lib/tableConfig";
import {
  emptyGalleryDraft,
  emptyNewsDraft,
  emptyStaffDraft,
  useAdminContentStore,
  type AdminGalleryDraft,
  type AdminNewsDraft,
  type AdminStaffDraft,
} from "@/app/Stores/adminContentStore";

type AdminAddType = "news" | "gallery" | "staff";
type Locale = "id" | "en";

type StaffForm = AdminStaffDraft;
type NewsForm = AdminNewsDraft;
type GalleryForm = AdminGalleryDraft;

function createSlug(value: string) {
  const base =
    value
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "konten";

  return `${base}-${Date.now().toString(36)}`;
}

interface Props {
  type: AdminAddType;
  locale?: Locale;
  signalAdded: (added: string) => void;
}

export default function FormAdd({ type, locale = "id", signalAdded }: Props) {
  const setDraft = useAdminContentStore((state) => state.setDraft);
  const clearDraft = useAdminContentStore((state) => state.clearDraft);

  const [fileName, setFileName] = useState(
    type === "staff" ? "Upload photo" : "Upload gambar",
  );
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [draggingImage, setDraggingImage] = useState(false);
  const [loadingImage, setLoadingImage] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [alertImage, setAlertImage] = useState(false);
  const [options, setOptions] = useState<Record<string, ConfigItem[]>>({});

  // Separate form states (component is mounted for a single type at a time)
  const [staffForm, setStaffForm] = useState<StaffForm>(emptyStaffDraft);
  const [newsForm, setNewsForm] = useState<NewsForm>(emptyNewsDraft);
  const [galleryForm, setGalleryForm] =
    useState<GalleryForm>(emptyGalleryDraft);

  const storageFolder =
    type === "news" ? "news" : type === "gallery" ? "gallery" : "staff";
  const tableName =
    type === "news" ? "news" : type === "gallery" ? "gallery" : "staff";

  const uploadToStorage = async (): Promise<string | undefined> => {
    if (!file) return undefined;
    const filePath = `${storageFolder}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("images")
      .upload(filePath, file);
    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("images").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const resetAll = () => {
    setFile(null);
    setPreview(null);
    setFileName(type === "staff" ? "Upload photo" : "Upload gambar");
    setStaffForm(emptyStaffDraft);
    setNewsForm(emptyNewsDraft);
    setGalleryForm(emptyGalleryDraft);
    setLoadingSubmit(false);
    clearDraft(type, locale);
  };

  useEffect(() => {
    const savedDraft = useAdminContentStore.getState().getDraft(type, locale);
    setStaffForm(savedDraft.staffForm);
    setNewsForm(savedDraft.newsForm);
    setGalleryForm(savedDraft.galleryForm);
  }, [type, locale]);

  useEffect(() => {
    setDraft(type, locale, {
      staffForm,
      newsForm,
      galleryForm,
    });
  }, [
    type,
    locale,
    staffForm,
    newsForm,
    galleryForm,
    setDraft,
  ]);

  useEffect(() => {
    void getTableConfig(type).then((config) => {
      if (!config) return;
      if (type === "staff") {
        const staff = config as Awaited<ReturnType<typeof getTableConfig<"staff">>>;
        setOptions({ division: staff?.division_items ?? [], position: staff?.position_items ?? [], gender: staff?.gender_items ?? [] });
      } else {
        setOptions({ tag: (config as { tag_items?: ConfigItem[] }).tag_items ?? [] });
      }
    });
  }, [type]);

  // ! Image Loading
  useEffect(() => {
    if (preview) {
      setLoadingImage(true);
    }
  }, [preview]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // ! NEWS
      if (type === "news") {
        if (!file) {
          setAlertImage(true);
          return;
        }
        setLoadingSubmit(true);
        const url = await uploadToStorage();
        const insertData = [
          {
            tag: newsForm.tag,
            tag_long: newsForm.tag,
            date: newsForm.date,
            title: newsForm.title,
            slug: createSlug(newsForm.title),
            content: newsForm.content,
            source: newsForm.source,
            image: url,
          },
        ];
        const { error } = await supabase.from(tableName).insert(insertData);
        if (error) throw error;
        signalAdded(newsForm.title);

        // ! GALLERY
      } else if (type === "gallery") {
        if (!file) {
          setAlertImage(true);
          return;
        }
        setLoadingSubmit(true);
        const url = await uploadToStorage();
        const insertData = [
          {
            image: url,
            tag: galleryForm.tag,
            tag_long: galleryForm.tag,
            title: galleryForm.title,
            slug: createSlug(galleryForm.title),
            date: galleryForm.date,
            description: galleryForm.description,
          },
        ];
        const { error } = await supabase.from(tableName).insert(insertData);
        if (error) throw error;
        signalAdded(galleryForm.title);

        // ! STAFF
      } else {
        setLoadingSubmit(true);
        const url = await uploadToStorage(); // optional
        const insertData = [
          {
            name: staffForm.name,
            position: staffForm.position,
            division: staffForm.division,
            gender: staffForm.gender || null,
            photo: url ?? null,
          },
        ];
        const { error } = await supabase.from(tableName).insert(insertData);
        if (error) throw error;
        signalAdded(staffForm.name);
      }

      resetAll();
    } catch (err) {
      console.error(err);
      alert("Upload gagal. Terdapat masalah pada server!");
    }
  };

  const placeholderSrc =
    type === "staff"
      ? "/assets/icon_profile_u.png"
      : "/assets/image_placeholder.png";

  const selectImage = (selectedFile?: File) => {
    if (!selectedFile) return;
    if (!selectedFile.type.startsWith("image/")) {
      setAlertImage(true);
      return;
    }

    setAlertImage(false);
    setFile(selectedFile);
    setFileName(selectedFile.name);
    setPreview(URL.createObjectURL(selectedFile));
  };

  return (
    <>
      <form
        className="flex w-full flex-col rounded-2xl border border-stone-200 bg-white p-6 shadow-xl md:p-10"
        onSubmit={handleSubmit}
      >
        {/* IMAGE UPLOAD */}
        <div className="mb-3 flex flex-col gap-3 md:mb-6">
          <label
            htmlFor="image"
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
              id="image"
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => {
                selectImage(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            <Image
              src={preview || placeholderSrc}
              alt="Preview"
              className={`h-full max-h-48 w-full object-contain ${
                loadingImage ? "hidden" : "flex"
              }`}
              width={800}
              height={600}
              onLoad={() => setLoadingImage(false)}
            />
            <div className={loadingImage ? "flex min-h-32 items-center" : "hidden"}>
              <SpinnerLoading size="sm" color="black" />
            </div>
            <div>
              <p className="text-sm font-semibold text-stone-700">
                {preview ? "Tarik gambar baru ke sini atau klik untuk mengganti" : "Tarik gambar ke sini atau klik untuk memilih"}
              </p>
              <p className="mt-1 text-xs text-stone-500">{fileName}</p>
            </div>
          </label>
        </div>

        {/* STAFF FORM */}
        {type === "staff" && (
          <>
            <label
              className="text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw]"
              htmlFor="name"
            >
              Nama Lengkap
            </label>
            <input
              type="text"
              id="name"
              name="name"
              placeholder="Nama Staff"
              className="h-6 md:h-10 text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw] bg-stone-100 p-3 rounded-md mt-2 md:mb-6 mb-3"
              value={staffForm.name}
              onChange={(e) =>
                setStaffForm({ ...staffForm, name: e.target.value })
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
              className="w-full md:w-auto bg-stone-100 rounded-md mt-2 md:mb-6 mb-3 py-2 px-3 text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw]"
              value={staffForm.gender}
              onChange={(e) =>
                setStaffForm({ ...staffForm, gender: e.target.value })
              }
              required
            >
              <option value="" disabled>
                -- Pilih Gender --
              </option>
              {(options.gender ?? []).map((item) => <option key={item.key} value={item.key}>{item.short.id}</option>)}
            </select>

            <label
              className="text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw]"
              htmlFor="position"
            >
              Jabatan
            </label>
            <select id="position" className="w-full md:w-auto bg-stone-100 rounded-md mt-2 md:mb-6 mb-3 py-2 px-3 text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw]" value={staffForm.position} onChange={(e) => setStaffForm({ ...staffForm, position: e.target.value })} required>
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
              className="w-full md:w-auto bg-stone-100 rounded-md mt-2 md:mb-3 mb-3 py-2 px-3 text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw]"
              value={staffForm.division}
              onChange={(e) => {
                const value = e.target.value;
                setStaffForm({ ...staffForm, division: value });
              }}
              required
            >
              <option value="" disabled>
                -- Pilih Bidang --
              </option>

              {(options.division ?? []).map((division) => (
                <option key={division.key} value={division.key}>
                  {division.short.id}
                </option>
              ))}
            </select>
          </>
        )}

        {/* NEWS FORM */}
        {type === "news" && (
          <>
            <label
              className="text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw]"
              htmlFor="tag"
            >
              Tag
            </label>
            <select
              className="w-full md:w-auto bg-stone-100 rounded-md mt-2 md:mb-6 mb-3 py-2 px-3 text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw]"
              value={newsForm.tag}
              onChange={(e) =>
                setNewsForm({
                  ...newsForm,
                  tag: e.target.value as NewsForm["tag"],
                })
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
              type="date"
              id="date"
              name="date"
              className="w-full md:w-auto bg-stone-100 rounded-md mt-2 md:mb-6 mb-3 px-3 py-2 text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw] focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={newsForm.date}
              onChange={(e) =>
                setNewsForm({ ...newsForm, date: e.target.value })
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
              type="text"
              id="title"
              name="title"
              placeholder="Masukkan Judul"
              className="h-6 md:h-10 text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw] bg-stone-100 p-3 rounded-md mt-2 md:mb-6 mb-3"
              value={newsForm.title}
              onChange={(e) =>
                setNewsForm({ ...newsForm, title: e.target.value })
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
              minRows={4}
              placeholder="Masukkan Konten"
              className="w-full bg-stone-100 p-3 rounded-md text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw] caret-black mt-2 md:mb-6 mb-3"
              value={newsForm.content}
              onChange={(e) =>
                setNewsForm({ ...newsForm, content: e.target.value })
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
              type="text"
              id="source"
              name="source"
              placeholder="Masukkan sumber Gambar / Berita"
              className="h-6 md:h-10 text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw] bg-stone-100 p-3 rounded-md mt-2 md:mb-6 mb-3"
              value={newsForm.source}
              onChange={(e) =>
                setNewsForm({ ...newsForm, source: e.target.value })
              }
              required
            />
          </>
        )}

        {/* GALLERY FORM */}
        {type === "gallery" && (
          <>
            <label
              className="text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw]"
              htmlFor="tag"
            >
              Tag
            </label>
            <select
              className="w-full md:w-auto bg-stone-100 rounded-md mt-2 md:mb-6 mb-3 py-2 px-3 text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw]"
              value={galleryForm.tag}
              onChange={(e) =>
                setGalleryForm({
                  ...galleryForm,
                  tag: e.target.value as GalleryForm["tag"],
                })
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
              type="text"
              id="title"
              name="title"
              placeholder="Masukkan judul gambar"
              className="h-6 md:h-10 text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw] bg-stone-100 p-3 rounded-md mt-2 md:mb-6 mb-3"
              value={galleryForm.title}
              onChange={(e) =>
                setGalleryForm({ ...galleryForm, title: e.target.value })
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
              type="date"
              id="date"
              name="date"
              className="w-full md:w-auto bg-stone-100 rounded-md mt-2 md:mb-6 mb-3 px-3 py-2 text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw] focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={galleryForm.date}
              onChange={(e) =>
                setGalleryForm({ ...galleryForm, date: e.target.value })
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
              minRows={4}
              placeholder="Masukkan Deskripsi / Caption"
              className="w-full bg-stone-100 p-3 rounded-md text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw] caret-black mt-2 md:mb-6 mb-3"
              value={galleryForm.description}
              onChange={(e) =>
                setGalleryForm({ ...galleryForm, description: e.target.value })
              }
              required
            />
          </>
        )}

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

      <div className={alertImage ? "flex" : "hidden"}>
        <AlertNotif
          type="single"
          yesText="Ok"
          msg="Upload gambar terlebih dahulu!"
          icon="warning"
          confirm={() => {
            setAlertImage(false);
          }}
        />
      </div>
    </>
  );
}
