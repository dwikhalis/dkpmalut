"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState([false, "hidden"]);
  const [show, setShow] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setShow(false);
      } else {
        setShow(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  return (
    <>
      {/* //! DESKTOP */}
      <nav
        className={`hidden lg:flex sticky z-10 top-0  xl:h-[6vw] h-[8vw] justify-between items-center bg-white w-full transition-transform duration-300 ${
          show ? "translate-0" : "-translate-y-full"
        }`}
        style={{ filter: "drop-shadow(0px 5px 10px rgba(0,0,0,0.3))" }}
      >
        {/* Logo Home Desktop */}
        <Link
          href="/"
          className="hidden md:flex h-full justify-between items-center ml-12 lg:ml-24"
        >
          <div className="flex relative justify-center items-center h-[3.5vw] w-[3.5vw] mr-3">
            <Image
              src="/assets/logo_malut.png"
              alt="Logo"
              className="object-contain"
              fill
            />
          </div>
          <div className="flex flex-col justify-center">
            <h5 className="font-bold">Dinas Kelautan dan Perikanan</h5>
            <h5>Provinsi Maluku Utara</h5>
          </div>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex 2xl:gap-12 gap-6 h-full">
          <Link
            href="/Organisasi"
            className="flex justify-center items-center hover:text-gray-400 h-full cursor-pointer"
          >
            <h6>Organisasi</h6>
          </Link>
          <Link
            href="/Berita"
            className="flex justify-center items-center hover:text-gray-400 h-full cursor-pointer"
          >
            <h6>Berita</h6>
          </Link>
          <Link
            href="/Galeri"
            className="flex justify-center items-center hover:text-gray-400 h-full cursor-pointer"
          >
            <h6>Galeri</h6>
          </Link>
          <Link
            href="/Data"
            className="flex justify-center items-center hover:text-gray-400 h-full cursor-pointer"
          >
            <h6>Data</h6>
          </Link>
          <Link
            href="/Kontak"
            className="flex justify-center items-center hover:text-gray-400 h-full cursor-pointer"
          >
            <h6>Kontak</h6>
          </Link>
          <Link href="/Admin" className="flex justify-center items-center">
            <button className="px-[2vw] py-2.5 text-[1.2vw] mr-12 lg:mr-24 bg-black text-white rounded-full hover:bg-stone-400 hover:text-black cursor-pointer">
              <h6>Masuk</h6>
            </button>
          </Link>
        </div>
      </nav>

      {/* //! TABLET & MOBILE */}
      <nav
        className={`lg:hidden z-10 sticky top-0 transition-transform duration-300 ${
          show ? "translate-0" : "-translate-y-full"
        }`}
        style={{ filter: "drop-shadow(0px 5px 10px rgba(0,0,0,0.3))" }}
      >
        {/* Navigation Bar */}
        <div className="flex justify-between z-10 relative bg-white w-full h-[12vw]">
          {/* Logo Home Mobile */}
          <Link href="/" className="flex items-center h-full ml-3">
            <div className="flex relative justify-center items-center h-[6vw] w-[6vw] mr-3">
              <Image
                src="/assets/logo_malut.png"
                alt="Logo"
                className="object-contain"
                fill
              />
            </div>
            <div className="flex flex-col justify-center">
              <h4 className="font-bold text-[2vw]">
                Dinas Kelautan dan Perikanan
              </h4>
              <h4 className="text-[2vw]">Provinsi Maluku Utara</h4>
            </div>
          </Link>

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
      isMenuOpen[0] && show
        ? "translate-y-0"
        : "-translate-y-100 pointer-events-none"
    }`}
        >
          <Link href="/Organisasi" className=" text-center">
            <h4 className="py-4 bg-[rgba(0,0,0,0.8)] text-white">Organisasi</h4>
          </Link>
          <Link href="/Berita" className=" text-center">
            <h4 className="py-4 bg-[rgba(0,0,0,0.8)] text-white">Berita</h4>
          </Link>
          <Link href="/Galeri" className=" text-center">
            <h4 className="py-4 bg-[rgba(0,0,0,0.8)] text-white">Galeri</h4>
          </Link>
          <Link href="/Data" className=" text-center">
            <h4 className="py-4 bg-[rgba(0,0,0,0.8)] text-white">Data</h4>
          </Link>
          <Link href="/Kontak" className=" text-center">
            <h4 className="py-4 bg-[rgba(0,0,0,0.8)] text-white">Kontak</h4>
          </Link>
          <Link href="/Masuk" className="text-center">
            <h4 className="py-4 bg-[rgba(0,0,0,0.85)] text-white">Masuk</h4>
          </Link>
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
