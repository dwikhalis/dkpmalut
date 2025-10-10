"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import TextareaAutosize from "react-textarea-autosize";
import { supabase } from "@/lib/supabase/supabaseClient";
import SpinnerLoading from "./SpinnerLoading";
import AlertNotif from "./AlertNotif";

type AdminAddType = "news" | "gallery" | "staff";

type StaffForm = {
  name: string;
  title: string;
  division: string;
  gender: string;
  photo?: string;
};

type NewsForm = {
  tag: "" | "Berita" | "Artikel" | "Peraturan";
  date: string;
  title: string;
  content: string;
  source: string;
  image?: string;
};

type GalleryForm = {
  tag: "" | "Kegiatan" | "Alam" | "Lainnya";
  title: string;
  date: string;
  description: string;
  image?: string;
};

interface Props {
  type: AdminAddType;
  signalAdded: (added: string) => void;
}

export default function FormAdd({ type, signalAdded }: Props) {
  const [fileName, setFileName] = useState(
    type === "staff" ? "Upload photo" : "Upload gambar"
  );
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loadingImage, setLoadingImage] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [alertImage, setAlertImage] = useState(false);

  // Separate form states (component is mounted for a single type at a time)
  const [staffForm, setStaffForm] = useState<StaffForm>({
    name: "",
    title: "",
    division: "",
    gender: "",
    photo: "",
  });
  const [newsForm, setNewsForm] = useState<NewsForm>({
    tag: "",
    date: "",
    title: "",
    content: "",
    source: "",
    image: "",
  });
  const [galleryForm, setGalleryForm] = useState<GalleryForm>({
    tag: "",
    title: "",
    date: "",
    description: "",
    image: "",
  });

  const storageFolder =
    type === "news" ? "news" : type === "gallery" ? "gallery" : "staff";
  const tableName = type;

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
    setStaffForm({ name: "", title: "", division: "", gender: "", photo: "" });
    setNewsForm({
      tag: "",
      date: "",
      title: "",
      content: "",
      source: "",
      image: "",
    });
    setGalleryForm({
      tag: "",
      title: "",
      date: "",
      description: "",
      image: "",
    });
    setLoadingSubmit(false);
  };

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
            date: newsForm.date,
            title: newsForm.title,
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
            title: galleryForm.title,
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
            title: staffForm.title,
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

  return (
    <>
      <form
        className="flex flex-col w-full p-6 shadow-xl md:p-10 border-1 border-stone-200 rounded-2xl"
        onSubmit={handleSubmit}
      >
        {/* IMAGE UPLOAD */}
        <div className="flex flex-col gap-3">
          <label
            htmlFor="image"
            className="flex flex-col w-full p-3 mb-3 border rounded-md cursor-pointer md:mb-6 hover:bg-stone-200"
          >
            <Image
              src={preview || placeholderSrc}
              alt="Preview"
              className={`mt-3 max-h-60 object-contain h-full w-full ${
                loadingImage ? "hidden" : "flex"
              }`}
              width={800}
              height={600}
              onLoad={() => setLoadingImage(false)}
            />
            <div className={loadingImage ? "flex" : "hidden"}>
              <SpinnerLoading size="sm" color="black" />
            </div>
            <span className="mt-2 text-center">{fileName}</span>
          </label>

          <input
            id="image"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                setFile(f);
                setFileName(f.name);
                setPreview(URL.createObjectURL(f));
              } else {
                setFile(null);
                setFileName(
                  type === "staff" ? "Upload photo" : "No file chosen"
                );
                setPreview(null);
              }
            }}
          />
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
              type="text"
              id="title"
              name="title"
              placeholder="Jabatan Staff"
              className="h-6 md:h-10 text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw] bg-stone-100 p-3 rounded-md mt-2 md:mb-6 mb-3"
              value={staffForm.title}
              onChange={(e) =>
                setStaffForm({ ...staffForm, title: e.target.value })
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
              className="w-full md:w-auto bg-stone-100 rounded-md mt-2 md:mb-6 mb-3 py-2 px-3 text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw]"
              value={staffForm.division}
              onChange={(e) =>
                setStaffForm({ ...staffForm, division: e.target.value })
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
