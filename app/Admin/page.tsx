"use client";

import React, { useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import AdminBerita from "../components/AdminBerita";
import AdminGaleri from "../components/AdminGaleri";

export default function page() {
  const [content, setContent] = useState<string>("Berita");

  return (
    <>
      <Navbar />
      <div className="flex mr-24">
        <div className="flex flex-col w-[20vw]">
          <div>
            <h3 className="bg-blue-100 p-3 font-bold">Menu</h3>
          </div>
          <div className="bg-blue-900 grow">
            <h3 className="p-3 text-white hover:text-blue-300 cursor-pointer">
              Organisasi
            </h3>
            <h3
              className="p-3 text-white hover:text-blue-300 cursor-pointer"
              onClick={() => setContent("Berita")}
            >
              Berita
            </h3>
            <h3
              className="p-3 text-white hover:text-blue-300 cursor-pointer"
              onClick={() => setContent("Galeri")}
            >
              Galeri
            </h3>
            <h3 className="p-3 text-white hover:text-blue-300 cursor-pointer">
              Data
            </h3>
          </div>
        </div>
        <div className="grow">
          {content === "Berita" ? <AdminBerita /> : null}
          {content === "Galeri" ? <AdminGaleri /> : null}
        </div>
      </div>
      <Footer />
    </>
  );
}
