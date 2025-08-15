"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import TextareaAutosize from "react-textarea-autosize";
import { supabase } from "@/lib/supabase/supabaseClient";
import { updateData } from "@/lib/supabase/supabaseHelper";
import SpinnerLoading from "./SpinnerLoading";

type AdminType = "staff" | "news" | "gallery";

interface DataTypes {
  id: string;
  // shared/optional fields across all 3
  name?: string;
  image?: string;
  photo?: string;
  title?: string;
  division?: string;
  gender?: string;
  tag?: string;
  date?: string;
  content?: string;
  source?: string;
  description?: string;
}

interface Props {
  type: AdminType;
  oldData: DataTypes;
  signalUpdated: (updated: string) => void;
}

export default function FormEdit({ type, oldData, signalUpdated }: Props) {
  // file/image state
  const [fileName, setFileName] = useState(
    type === "staff" ? "Ganti Foto" : "Upload gambar"
  );
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  // single form state that holds everything; we’ll render only what each type needs
  const [formData, setFormData] = useState({
    // staff
    name: "",
    photo: "",
    division: "",
    gender: "",
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
  const cfg = useMemo(() => {
    switch (type) {
      case "staff":
        return {
          table: "staff",
          storageFolder: "staff",
          // for preview fallback
          placeholder: "/assets/icon_profile_u.png",
          // which field stores the URL
          urlField: "photo" as const,
          // label that is shown in success message
          labelFrom: () => formData.name,
          // build the payload to update
          buildUpdate: (url: string) => ({
            name: formData.name,
            title: formData.title,
            division: formData.division,
            gender: formData.gender,
            photo: url,
          }),
          // keys used for "no change" comparison
          compareKeys: [
            "name",
            "title",
            "division",
            "gender",
            "photo",
          ] as const,
        };
      case "news":
        return {
          table: "news",
          storageFolder: "news",
          placeholder: "/assets/image_placeholder.png",
          urlField: "image" as const,
          labelFrom: () => formData.title,
          buildUpdate: (url: string) => ({
            tag: formData.tag,
            date: formData.date,
            title: formData.title,
            content: formData.content,
            source: formData.source,
            image: url,
          }),
          compareKeys: [
            "tag",
            "date",
            "title",
            "content",
            "source",
            "image",
          ] as const,
        };
      case "gallery":
        return {
          table: "gallery",
          storageFolder: "gallery",
          placeholder: "/assets/image_placeholder.png",
          urlField: "image" as const,
          labelFrom: () => formData.title,
          buildUpdate: (url: string) => ({
            image: url,
            tag: formData.tag,
            title: formData.title,
            date: formData.date,
            description: formData.description,
          }),
          compareKeys: [
            "image",
            "tag",
            "title",
            "date",
            "description",
          ] as const,
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
      type === "staff" ? oldData.photo ?? null : oldData.image ?? null;

    setPreview(initialPreview);
    setFile(null);
    setFileName(type === "staff" ? "Ganti Foto" : "Upload gambar");
  }, [type, oldData]);

  // cleanup blob URLs
  useEffect(() => {
    return () => {
      if (preview && preview.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  // helpers
  const pickOldSubset = (keys: readonly string[]) => {
    const o: Record<string, unknown> = {};
    keys.forEach((k) => {
      // @ts-ignore
      o[k] = oldData[k] ?? "";
    });
    return o;
  };

  const shallowEqualByKeys = (
    keys: readonly string[],
    a: Record<string, unknown>,
    b: Record<string, unknown>
  ) => {
    for (const k of keys) {
      if ((a[k] ?? "") !== (b[k] ?? "")) return false;
    }
    return true;
  };

  // submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // decide current URL -> if user picks a file we upload and use the new URL
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

      // compare only the relevant keys for this type
      if (shallowEqualByKeys(cfg.compareKeys, dataUpdate, oldSubset)) {
        signalUpdated("No Update");
      } else {
        setLoadingSubmit(true);
        await updateData(cfg.table, dataUpdate, oldData.id);
        const label = cfg.labelFrom() || "(tanpa judul)";
        signalUpdated(label);
      }

      // reset transient file state (keep form values so user sees the updated state)
      setFile(null);
      setLoadingSubmit(false);
      setFileName(type === "staff" ? "Ganti Foto" : "Upload gambar");
      setPreview(
        cfg.urlField === "photo"
          ? (dataUpdate as any).photo || cfg.placeholder
          : (dataUpdate as any).image || cfg.placeholder
      );
    } catch (err) {
      console.error(err);
      alert("Update gagal. Terdapat masalah pada server!");
    }
  };

  // === RENDER ===
  const imageSrc =
    preview ||
    (type === "staff" ? formData.photo : formData.image) ||
    cfg.placeholder;

  return (
    <form
      className="flex flex-col p-6 md:p-10 border-1 border-stone-200 w-full rounded-2xl shadow-xl"
      onSubmit={handleSubmit}
    >
      {/* IMAGE UPLOAD (shared) */}
      <div className="flex flex-col gap-3">
        <label
          htmlFor="file-input"
          className="flex flex-col md:mb-6 mb-3 w-full border rounded-md p-3 cursor-pointer hover:bg-stone-200"
        >
          <Image
            src={imageSrc}
            alt="Preview"
            className="mt-3 max-h-60 object-contain h-full w-full"
            width={800}
            height={600}
          />
          <span className="text-center mt-2">{fileName}</span>
        </label>

        <input
          id="file-input"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const selectedFile = e.target.files?.[0];
            if (selectedFile) {
              setFile(selectedFile);
              setFileName(selectedFile.name);
              const url = URL.createObjectURL(selectedFile);
              setPreview(url);
            } else {
              setFile(null);
              setFileName(type === "staff" ? "Ganti Foto" : "Upload gambar");
              setPreview(null);
            }
            // allow picking the same file again
            (e.target as HTMLInputElement).value = "";
          }}
        />
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
            <option value="Male">Laki-laki</option>
            <option value="Female">Perempuan</option>
          </select>

          <label
            className="text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw]"
            htmlFor="title"
          >
            Jabatan
          </label>
          <input
            id="title"
            type="text"
            placeholder="Nama Jabatan"
            className="h-6 md:h-10 text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw] bg-stone-100 p-3 rounded-md mt-2 md:mb-6 mb-3"
            value={formData.title}
            onChange={(e) =>
              setFormData((s) => ({ ...s, title: e.target.value }))
            }
            required
          />

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
            <option value="PRL">PRL</option>
            <option value="Penangkapan">Penangkapan</option>
            <option value="Budidaya">Budidaya</option>
            <option value="PSDKP">PSDKP</option>
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
            <option value="Berita">Berita</option>
            <option value="Artikel">Artikel</option>
            <option value="Peraturan">Peraturan</option>
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
            <option value="Kegiatan">Kegiatan</option>
            <option value="Alam">Alam</option>
            <option value="Lainnya">Lainnya</option>
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
        className="flex justify-center items-center bg-black text-white rounded-lg md:rounded-2xl hover:bg-stone-400 hover:text-black md:mb-6 mb-3 p-1.5 md:p-3"
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
