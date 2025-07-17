"use client";

import { useState } from "react";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState([false, "hidden"]);

  return (
    <>
      {/* //! DESKTOP */}
      <nav
        className="hidden lg:flex sticky z-10 top-0  xl:h-[6vw] h-[8vw] justify-between items-center bg-white w-full"
        style={{ filter: "drop-shadow(0px 5px 10px rgba(0,0,0,0.3))" }}
      >
        {/* Logo Home Desktop */}
        <a
          href="/"
          className="hidden md:flex h-full justify-between items-center ml-12 2xl:ml-24"
        >
          <div className="flex justify-center items-center h-auto w-[3.5vw] mr-3">
            <img
              src="/assets/logo_malut.png"
              alt="Logo"
              className="object-contain"
            />
          </div>
          <div className="flex flex-col justify-center">
            <h5 className="font-bold">Dinas Kelautan dan Perikanan</h5>
            <h5>Provinsi Maluku Utara</h5>
          </div>
        </a>

        {/* Desktop Menu */}
        <div className="hidden md:flex 2xl:gap-12 gap-6 h-full">
          <a
            href="/Organisasi"
            className="flex justify-center items-center hover:text-gray-400 h-full cursor-pointer"
          >
            <h6>Organisasi</h6>
          </a>
          <a
            href="/Berita"
            className="flex justify-center items-center hover:text-gray-400 h-full cursor-pointer"
          >
            <h6>Berita</h6>
          </a>
          <a
            href="/Galeri"
            className="flex justify-center items-center hover:text-gray-400 h-full cursor-pointer"
          >
            <h6>Galeri</h6>
          </a>
          <a
            href="/Data"
            className="flex justify-center items-center hover:text-gray-400 h-full cursor-pointer"
          >
            <h6>Data</h6>
          </a>
          <a
            href="/Kontak"
            className="flex justify-center items-center hover:text-gray-400 h-full cursor-pointer"
          >
            <h6>Kontak</h6>
          </a>
          <a href="/Masuk" className="flex justify-center items-center">
            <button className="px-[2vw] py-2.5 text-[1.2vw] mr-12 2xl:mr-24 bg-black text-white rounded-full hover:bg-stone-400 hover:text-black cursor-pointer">
              <h6>Masuk</h6>
            </button>
          </a>
        </div>
      </nav>

      {/* //! TABLET & MOBILE */}
      <nav
        className="lg:hidden z-10 sticky top-0"
        style={{ filter: "drop-shadow(0px 5px 10px rgba(0,0,0,0.3))" }}
      >
        {/* Navigation Bar */}
        <div className="flex justify-between z-10 relative bg-white w-full h-[12vw]">
          {/* Logo Home Mobile */}
          <a href="/" className="flex items-center h-full ml-3">
            <div className="flex justify-center items-center h-auto w-[6vw] mr-3">
              <img
                src="/assets/logo_malut.png"
                alt="Logo"
                className="object-contain"
              />
            </div>
            <div className="flex flex-col justify-center">
              <h4 className="font-bold text-[2vw]">
                Dinas Kelautan dan Perikanan
              </h4>
              <h4 className="text-[2vw]">Provinsi Maluku Utara</h4>
            </div>
          </a>

          {/* Burger Menu for Mobile */}
          <div className="flex items-center px-7 h-full justify-center">
            <button
              onClick={() =>
                isMenuOpen[0]
                  ? setIsMenuOpen([false, "hidden"])
                  : setIsMenuOpen([true, "flex"])
              }
              className="text-2xl focus:outline-none"
            >
              &#9776; {/* Burger icon */}
            </button>
          </div>
        </div>

        {/* POP UP */}
        <div
          className={`md:hidden w-full absolute transform transition-all duration-500 ease-in-out 
    ${
      isMenuOpen[0] ? "translate-y-0" : "-translate-y-100 pointer-events-none"
    }`}
        >
          <a href="/Organisasi" className=" text-center">
            <h4 className="py-4 bg-[rgba(0,0,0,0.8)] text-white">Organisasi</h4>
          </a>
          <a href="/Berita" className=" text-center">
            <h4 className="py-4 bg-[rgba(0,0,0,0.8)] text-white">Berita</h4>
          </a>
          <a href="/Galeri" className=" text-center">
            <h4 className="py-4 bg-[rgba(0,0,0,0.8)] text-white">Galeri</h4>
          </a>
          <a href="/Data" className=" text-center">
            <h4 className="py-4 bg-[rgba(0,0,0,0.8)] text-white">Data</h4>
          </a>
          <a href="/Kontak" className=" text-center">
            <h4 className="py-4 bg-[rgba(0,0,0,0.8)] text-white">Kontak</h4>
          </a>
          <a href="/Masuk" className="text-center">
            <h4 className="py-4 bg-[rgba(0,0,0,0.85)] text-white">Masuk</h4>
          </a>
          {/* Outer Element, if Burger Menu = Open, then Menu will Off if Outer Element "Clicked"  */}
          <div
            className={`${isMenuOpen[1]} h-[50vh] w-full`}
            onClick={() =>
              isMenuOpen ? setIsMenuOpen([false, "hidden"]) : null
            }
          />
        </div>
      </nav>
    </>
  );
}
