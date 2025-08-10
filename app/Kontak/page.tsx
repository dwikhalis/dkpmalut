"use client";

import React, { useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { supabase } from "@/lib/supabase/supabaseClient";

export default function Page() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const insertData = [
        {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          message: formData.message,
        },
      ];

      const { error: insertError } = await supabase
        .from("message")
        .insert(insertData);

      if (insertError) throw insertError;

      alert("Pesan terkirim!");
      setFormData({ name: "", email: "", phone: "", message: "" });
    } catch (err) {
      console.error(err);
      alert("Pengiriman pesan gagal. Terdapat masalah pada server!");
    }
  };

  return (
    <>
      <Navbar />
      <div className="flex lg:flex-row flex-col">
        <div className="flex lg:h-[80vh] lg:w-[50%] flex-col justify-center items-center lg:items-start mx-12 lg:ml-24 my-8 md:my-12 gap-3">
          <h2 className="text-center md:text-left">Kontak Kami</h2>
          <h6 className="text-center md:text-left">
            Dinas Kelautan Dan Perikanan Maluku Utara
          </h6>
          <h6 className="text-center md:text-left">
            Kelurahan Sofifi, Kecamatan Oba Utara, Kota Tidore Kepulauan,
            Provinsi Maluku Utara, Indonesia
          </h6>
        </div>

        <form
          className="flex flex-col p-10 border-1 border-stone-100 mx-12 mb-12 lg:mb-20 lg:my-12 lg:mr-24 rounded-lg md:rounded-2xl shadow-2xl lg:w-[50%]"
          onSubmit={handleSubmit}
        >
          <label
            className="text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw]"
            htmlFor="name"
          >
            Nama *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            placeholder="Nama"
            className="h-6 md:h-10 text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw] bg-stone-100 p-3 rounded-md mt-2 md:mb-6 mb-3"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <label
            className="text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw]"
            htmlFor="email"
          >
            Email *
          </label>
          <input
            type="email"
            id="email"
            name="email"
            placeholder="Email"
            className="h-6 md:h-10 text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw] bg-stone-100 p-3 rounded-md mt-2 md:mb-6 mb-3"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            required
          />
          <label
            className="text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw]"
            htmlFor="email"
          >
            Nomor Handphone
          </label>
          <input
            type="phone"
            id="phone"
            name="phone"
            placeholder="Nomor Handphone"
            className="h-6 md:h-10 text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw] bg-stone-100 p-3 rounded-md mt-2 md:mb-6 mb-3"
            value={formData.phone}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
            required
          />
          <label
            className="text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw]"
            htmlFor="message"
          >
            Pesan *
          </label>
          <textarea
            id="message"
            name="message"
            placeholder="Ketik pesan anda"
            className="h-30 mt-2 md:grow text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw] bg-stone-100 p-3 rounded-md md-2 md:mb-6 mb-3"
            value={formData.message}
            onChange={(e) =>
              setFormData({ ...formData, message: e.target.value })
            }
            required
          />
          <input
            type="submit"
            value="Kirim"
            className="bg-black text-white p-1.5 md:p-3 rounded-lg md:rounded-2xl hover:bg-stone-400 hover:text-black text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw]"
          />
        </form>
      </div>
      <Footer />
    </>
  );
}
