"use client";

import { supabase } from "@/lib/supabase/supabaseClient";
import Image from "next/image";
import React, { useState } from "react";

export default function AdminAddStaff() {
  const [fileName, setFileName] = useState("Upload photo");
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    title: "",
    division: "",
    gender: "",
    photo: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (file) {
      try {
        // ! Upload image to SupaBase Storage
        const filePath = `staff/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
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
            name: formData.name,
            title: formData.title,
            division: formData.division,
            gender: formData.gender ? formData.gender : null,
            photo: publicUrl ? publicUrl : null,
          },
        ];

        const { error: insertError } = await supabase
          .from("staff")
          .insert(insertData);

        if (insertError) throw insertError;

        alert("Data staff telah sukses diupload!");
        setFormData({
          name: "",
          title: "",
          division: "",
          gender: "",
          photo: "",
        });
        setFile(null);
        setFileName("Upload photo");
        setPreview(null);
      } catch (err) {
        console.error(err);
        alert("Upload gagal. Terdapat masalah pada server!");
      }
    }
  };

  return (
    <form
      className="flex flex-col p-6 md:p-10 border-1 border-stone-200 ml-8 md:ml-12 w-full rounded-2xl shadow-xl"
      onSubmit={handleSubmit}
    >
      {/* //! NAME */}
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
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        required
      />

      {/* //! GENDER */}
      <label
        className="text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw]"
        htmlFor="gender"
      >
        Gender
      </label>
      <select
        className="w-full md:w-auto bg-stone-100 rounded-md mt-2 md:mb-6 mb-3
      py-2 px-3 text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw]"
        value={formData.gender}
        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
        required
      >
        <option value="">-- Pilih Gender --</option>
        <option value="Male">Laki-laki</option>
        <option value="Female">Perempuan</option>
      </select>

      {/* //! TITLE */}
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
        placeholder="Nama Staff"
        className="h-6 md:h-10 text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw] bg-stone-100 p-3 rounded-md mt-2 md:mb-6 mb-3"
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        required
      />

      {/* //! DIVISION */}
      <label
        className="text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw]"
        htmlFor="division"
      >
        Bidang
      </label>
      <select
        className="w-full md:w-auto bg-stone-100 rounded-md mt-2 md:mb-6 mb-3
      py-2 px-3 text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw]"
        value={formData.division}
        onChange={(e) => setFormData({ ...formData, division: e.target.value })}
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

      {/* //! IMAGE UPLOAD */}
      <div className="flex flex-col gap-3">
        <label
          className="text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw]"
          htmlFor="image"
        >
          Upload Photo
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
        {/* Button image selector */}
        <label
          htmlFor="image"
          className="bg-stone-100 p-3 rounded-md text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw] cursor-pointer hover:bg-stone-200 inline-block md:mb-6 mb-3"
        >
          Pilih Gambar
        </label>

        {/* Image preview */}
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

      {/* //! SUBMIT */}
      <input
        type="submit"
        value="Kirim"
        className="bg-black text-white p-1.5 md:p-3 rounded-lg md:rounded-2xl hover:bg-stone-400 hover:text-black text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw] md:mb-6 mb-3"
      />
    </form>
  );
}
