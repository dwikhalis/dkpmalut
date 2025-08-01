import React from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const page = () => {
  return (
    <>
      <Navbar />
      <div className="flex">
        <div className="flex h-[80vh] w-[50%] flex-col justify-center items-start pl-16 mx-12 lg:mx-24 my-12 gap-3">
          <h2>Kontak Kami</h2>
          <h6>Dinas Kelautan Dan Perikanan Maluku Utara</h6>
          <h6>
            Kelurahan Sofifi, Kecamatan Oba Utara, Kota Tidore Kepulauan,
            Provinsi Maluku Utara, Indonesia
          </h6>
        </div>

        <form className="flex flex-col p-10 border-1 border-stone-100 mx-12 my-12 lg:mr-40  rounded-2xl shadow-2xl w-[50%]">
          <label htmlFor="name">Nama *</label>
          <input
            type="text"
            id="name"
            name="name"
            placeholder="Nama"
            className="h-10 bg-stone-100 p-3 rounded-md mt-2 mb-6"
          />
          <label htmlFor="email">Email *</label>
          <input
            type="email"
            id="email"
            name="email"
            placeholder="Email"
            className="h-10 bg-stone-100 p-3 rounded-md mt-2 mb-6"
          />
          <label htmlFor="email">Nomor Handphone</label>
          <input
            type="phone"
            id="phone"
            name="phone"
            placeholder="Nomor Handphone"
            className="h-10 bg-stone-100 p-3 rounded-md mt-2 mb-6"
          />
          <label htmlFor="message">Pesan *</label>
          <textarea
            id="message"
            name="message"
            placeholder="Ketik pesan anda"
            className="grow bg-stone-100 p-3 rounded-md mt-2 mb-6"
          />
          <input
            type="submit"
            value="Kirim"
            className="bg-black text-white p-3 rounded-2xl hover:bg-stone-400 hover:text-black"
          />
        </form>
      </div>
      <Footer />
    </>
  );
};

export default page;
