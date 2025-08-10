"use client";

import React, { useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import AdminBerita from "../components/AdminBerita";
import AdminGaleri from "../components/AdminGaleri";
import AdminDashboard from "../components/AdminDashboard";
import AdminOrg from "../components/AdminOrg";
import AdminData from "../components/AdminData";

export default function Page() {
  const [content, setContent] = useState<string>("Dashboard");

  const selected = "bg-teal-100 text-black font-bold";
  const unselected = "bg-teal-900 text-white";

  return (
    <>
      <Navbar />
      <div className="flex mr-24">
        <div className="flex flex-col w-[20vw]">
          <div>
            <h3
              className={`${
                content === "Dashboard" ? selected : unselected
              } p-3 hover:text-teal-400 cursor-pointer`}
              onClick={() => setContent("Dashboard")}
            >
              Dashboard
            </h3>
          </div>
          <div className="bg-teal-900 grow">
            <h3
              className={`${
                content === "Organisasi" ? selected : unselected
              } p-3 hover:text-teal-400 cursor-pointer`}
              onClick={() => setContent("Organisasi")}
            >
              Organisasi
            </h3>
            <h3
              className={`${
                content === "Berita" ? selected : unselected
              } p-3 hover:text-teal-400 cursor-pointer`}
              onClick={() => setContent("Berita")}
            >
              Berita
            </h3>
            <h3
              className={`${
                content === "Galeri" ? selected : unselected
              } p-3 hover:text-teal-400 cursor-pointer`}
              onClick={() => setContent("Galeri")}
            >
              Galeri
            </h3>
            <h3
              className={`${
                content === "Data" ? selected : unselected
              } p-3 hover:text-teal-400 cursor-pointer`}
              onClick={() => setContent("Data")}
            >
              Data
            </h3>
          </div>
        </div>
        <div className="grow">
          {content === "Dashboard" ? <AdminDashboard /> : null}
          {content === "Berita" ? <AdminBerita /> : null}
          {content === "Galeri" ? <AdminGaleri /> : null}
          {content === "Organisasi" ? <AdminOrg /> : null}
          {content === "Data" ? <AdminData /> : null}
        </div>
      </div>
      <Footer />
    </>
  );
}
