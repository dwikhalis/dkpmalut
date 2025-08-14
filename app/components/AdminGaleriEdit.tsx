"use client";

import React, { useEffect } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase/supabaseClient";
import { updateData } from "@/lib/supabase/supabaseHelper";

interface Gallery {
  id: string;
  image: string;
  tag: string;
  title: string;
  date: string;
  description: string;
}

interface Props {
  oldData: Gallery;
  signalUpdated: (updated: string) => void;
}

export default function AdminGaleriAdd({ oldData, signalUpdated }: Props) {
  const [fileName, setFileName] = useState("Upload gambar");
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    image: "",
    tag: "",
    title: "",
    date: "",
    description: "",
  });

  //! SCROLL TO TOP AT 1st RENDER
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setFormData({
      image: oldData.image,
      tag: oldData.tag,
      title: oldData.title,
      date: oldData.date,
      description: oldData.description,
    });
    setPreview(oldData.image);
    setFile(null);
  }, [oldData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      let publicUrl = formData.image;

      if (file) {
        // ! Upload image to SupaBase Storage
        const filePath = `gallery/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("images")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // ! Get image Public URL to be stored into Database
        const { data: publicUrlData } = supabase.storage
          .from("images")
          .getPublicUrl(filePath);

        publicUrl = publicUrlData.publicUrl;
      }

      //! Insert image Public Url into Database
      const dataUpdate = {
        image: publicUrl,
        tag: formData.tag,
        title: formData.title,
        date: formData.date,
        description: formData.description,
      };

      if (
        JSON.stringify(
          Object.entries(dataUpdate)
            .filter(([key]) => key !== "id")
            .sort()
        ) ===
        JSON.stringify(
          Object.entries(oldData)
            .filter(([key]) => key !== "id")
            .sort()
        )
      ) {
        signalUpdated("No Update");
      } else {
        updateData("gallery", dataUpdate, oldData.id);
        signalUpdated(formData.title);
      }

      setFile(null);
      setFileName("Upload gambar");
      setPreview(null);
      setFormData({
        image: "",
        tag: "",
        title: "",
        date: "",
        description: "",
      });
    } catch (err) {
      console.error(err);
      alert("Update gagal. Terdapat masalah pada server!");
    }
  };

  return (
    <form
      className="flex flex-col p-6 md:p-10 border-1 border-stone-200 w-full rounded-2xl shadow-xl"
      onSubmit={handleSubmit}
    >
      {/* //! IMAGE UPLOAD */}
      <div className="flex flex-col gap-3">
        {/* Image selector + preview */}
        <label
          htmlFor="image"
          className="flex flex-col md:mb-6 mb-3 w-full border rounded-md p-3 cursor-pointer hover:bg-stone-200"
        >
          <Image
            src={preview ? preview : "/assets/image_placeholder.png"}
            alt="Preview"
            className="mt-3 max-h-60 object-contain h-full w-full"
            width={800}
            height={600}
          />
          <span className="text-center mt-2">{fileName}</span>
        </label>

        {/* Hidden input */}
        <input
          id="image"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) {
              const selectedFile = e.target.files[0];
              setFile(selectedFile);
              setFileName(selectedFile.name);
              setPreview(URL.createObjectURL(selectedFile));
            } else {
              setFile(null);
              setFileName("No file chosen");
              setPreview(null);
            }
          }}
        />
      </div>

      {/* //! TAG */}
      <label
        className="text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw]"
        htmlFor="tag"
      >
        Tag
      </label>
      <select
        className="w-full md:w-auto bg-stone-100 rounded-md mt-2 md:mb-6 mb-3
  py-2 px-3 text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw]"
        value={formData.tag}
        onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
        required
      >
        <option value="" disabled>
          -- Pilih Tag --
        </option>
        <option value="Kegiatan">Kegiatan</option>
        <option value="Alam">Alam</option>
        <option value="Lainnya">Lainnya</option>
      </select>

      {/* //! TITLE */}
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
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        required
      />

      {/* //! DATE */}
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
        className="w-full md:w-auto bg-stone-100 rounded-md mt-2 md:mb-6 mb-3
             px-3 py-2 text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw]
             focus:outline-none focus:ring-2 focus:ring-blue-400"
        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
        required
        value={formData.date}
      />

      {/* //! DESCRIPTION */}
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
        value={formData.description}
        onChange={(e) =>
          setFormData({ ...formData, description: e.target.value })
        }
        required
      />

      <input
        type="submit"
        value="Kirim"
        className="bg-black text-white p-1.5 md:p-3 rounded-lg md:rounded-2xl hover:bg-stone-400 hover:text-black text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw] md:mb-6 mb-3"
      />
    </form>
  );
}
