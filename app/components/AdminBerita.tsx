"use client";

import React from "react";
import TextareaAutosize from "react-textarea-autosize";
import { useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase/supabaseClient";

export default function AdminBerita() {
  const [fileName, setFileName] = useState("No file chosen");
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    tag: "",
    date: "",
    title: "",
    content: "",
    source: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      alert("Upload gambar terlebih dahulu");
      return;
    }

    try {
      // ! Upload image to SupaBase Storage
      const filePath = `coba/${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // ! Get image Public URL to be stored into Database
      const { data: publicUrlData } = supabase.storage
        .from("images")
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;

      //! Insert image Public Url into Database

      const insertData = [
        {
          tag: formData.tag,
          date: formData.date,
          title: formData.title,
          content: formData.content,
          source: formData.source,
          image: publicUrl,
        },
      ];

      const { error: insertError } = await supabase
        .from("news")
        .insert(insertData);

      if (insertError) throw insertError;

      alert("Berita telah sukses diupload!");
      setFormData({ tag: "", date: "", title: "", content: "", source: "" });
      setFile(null);
      setFileName("No file chosen");
      setPreview(null);
    } catch (err) {
      console.error(err);
      alert("Upload gagal. Terdapat masalah pada server!");
    }
  };

  return (
    <form
      className="flex flex-col p-10 border-1 border-stone-100 mx-12 mb-12 lg:mb-20 lg:my-12 lg:mr-24 rounded-lg md:rounded-2xl shadow-2xl w-full"
      onSubmit={handleSubmit}
    >
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
        <option value="berita">Berita</option>
        <option value="artikel">Artikel</option>
        <option value="peraturan">Peraturan</option>
      </select>

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

      {/* //! TITLE */}
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
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        required
      />

      {/* //! Content */}
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
        value={formData.content}
        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
        required
      />

      {/* //! SOURCE */}
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
        value={formData.source}
        onChange={(e) => setFormData({ ...formData, source: e.target.value })}
        required
      />

      {/* //! IMAGE UPLOAD */}
      <div className="flex flex-col gap-3">
        <label
          className="text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw]"
          htmlFor="image"
        >
          Upload Gambar
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
        {/* //! Button image selector */}
        <label
          htmlFor="image"
          className="bg-stone-100 p-3 rounded-md text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw] cursor-pointer hover:bg-stone-200 inline-block md:mb-6 mb-3"
        >
          Pilih Gambar
        </label>

        {/* //! Image preview */}
        {preview && (
          <div className="flex flex-col md:mb-6 mb-3 w-full border rounded-md p-3">
            <Image
              src={preview}
              alt="Preview"
              className="mt-3 max-h-60 object-contain h-full w-full"
              width={800}
              height={600}
            />
            <span className="text-center mt-2">{fileName}</span>
          </div>
        )}
      </div>
      <input
        type="submit"
        value="Kirim"
        className="bg-black text-white p-1.5 md:p-3 rounded-lg md:rounded-2xl hover:bg-stone-400 hover:text-black text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw] md:mb-6 mb-3"
      />
    </form>
  );
}
