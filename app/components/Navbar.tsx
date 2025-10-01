"use client";

import { supabase } from "@/lib/supabase/supabaseClient";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../Stores/authStores";
import SpinnerLoading from "./SpinnerLoading";
import AlertNotif from "./AlertNotif";

export default function Navbar() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [show, setShow] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [loading, setLoading] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState([false, "hidden"]);
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);

  //! Retractable Navbar
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setShow(false);
      } else {
        setShow(true);
      }

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

  //! LOGOUT Handle
  const handleLogout = async () => {
    setLoading(true);
    if (logoutConfirm) {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Error signing out:", error.message);
        alert("Gagal melakukan Logout. Masalah pada server!");
        router.push("/");
      } else {
        router.push("/");
      }
      setLoading(false);
      setLogoutConfirm([false, "hidden"]);
    }
  };

  return (
    <>
      {/* //! DESKTOP */}
      <nav
        className={`hidden md:flex sticky z-10 top-0 xl:h-[6vw] h-[8vw] bg-white w-full transition-transform duration-300 ${
          show ? "translate-y-0" : "-translate-y-full"
        }`}
        style={{ filter: "drop-shadow(0px 5px 10px rgba(0,0,0,0.3))" }}
      >
        <div className="flex justify-between w-full mx-8 lg:mx-12 2xl:mx-24">
          {/* Logo Home Desktop */}
          <Link
            href="/"
            className="hidden md:flex h-full justify-between items-center"
          >
            <div className="flex relative justify-center items-center h-[3.5vw] w-[3.5vw] mr-3">
              <Image
                src="/assets/logo_malut.png"
                alt="Logo"
                className="object-contain"
                height={600}
                width={800}
              />
            </div>
            <div className="flex flex-col justify-center">
              <p className="font-bold md:text-xs lg:text-lg">
                Dinas Kelautan dan Perikanan
              </p>
              <p className="md:text-xs lg:text-lg">Provinsi Maluku Utara</p>
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

            {isLoggedIn ? (
              <div className="flex justify-center items-center">
                <button
                  className="px-[2vw] py-2.5 text-[1.2vw] bg-sky-900 text-white rounded-full hover:bg-sky-700 cursor-pointer"
                  onClick={() => router.push("/Admin")}
                >
                  Dashboard
                </button>
              </div>
            ) : (
              <Link href="/Masuk" className="flex justify-center items-center">
                <button className="px-[2vw] py-2.5 text-[1.2vw] bg-sky-900 text-white rounded-full hover:bg-sky-700 cursor-pointer">
                  <h6>Masuk</h6>
                </button>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* //! MOBILE */}
      <nav
        className={`md:hidden z-10 sticky top-0 transition-transform duration-300 ${
          show ? "translate-y-0" : "-translate-y-full"
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
                height={600}
                width={800}
              />
            </div>
            <div className="flex flex-col justify-center">
              <h4 className="font-bold">Dinas Kelautan dan Perikanan</h4>
              <h4>Provinsi Maluku Utara</h4>
            </div>
          </Link>

          {/* //! Burger Menu for Mobile */}
          <div
            className="flex items-center px-7 h-full justify-center cursor-pointer"
            onClick={() =>
              isMenuOpen ? setIsMenuOpen(false) : setIsMenuOpen(true)
            }
          >
            <button className="text-2xl focus:outline-none cursor-pointer">
              &#9776; {/* Burger icon */}
            </button>
          </div>
        </div>

        {/* //!  DROP-DOWN MENU */}
        <div
          className={`lg:hidden w-full absolute transform transition-all duration-500 ease-in-out 
    ${
      isMenuOpen && show
        ? "translate-y-0"
        : "-translate-y-full pointer-events-none"
    }`}
        >
          <Link
            href="/Organisasi"
            className="text-center"
            onClick={() => setIsMenuOpen(false)}
          >
            <h4 className="py-[2vh] bg-[rgba(0,0,0,0.8)] text-white">
              Organisasi
            </h4>
          </Link>
          <Link
            href="/Berita"
            className="text-center"
            onClick={() => setIsMenuOpen(false)}
          >
            <h4 className="py-[2vh] bg-[rgba(0,0,0,0.8)] text-white">Berita</h4>
          </Link>
          <Link
            href="/Galeri"
            className="text-center"
            onClick={() => setIsMenuOpen(false)}
          >
            <h4 className="py-[2vh] bg-[rgba(0,0,0,0.8)] text-white">Galeri</h4>
          </Link>
          <Link
            href="/Data"
            className="text-center"
            onClick={() => setIsMenuOpen(false)}
          >
            <h4 className="py-[2vh] bg-[rgba(0,0,0,0.8)] text-white">Data</h4>
          </Link>
          <Link
            href="/Kontak"
            className="text-center"
            onClick={() => setIsMenuOpen(false)}
          >
            <h4 className="py-[2vh] bg-[rgba(0,0,0,0.8)] text-white">Kontak</h4>
          </Link>
          {isLoggedIn ? (
            <>
              <Link
                href="/Admin"
                className="text-center"
                onClick={() => {
                  setIsMenuOpen(false);
                }}
              >
                <div className="py-[2vh] bg-[rgba(0,0,0,0.85)] text-white">
                  {loading ? (
                    <SpinnerLoading size={"sm"} color="white" />
                  ) : (
                    <h4>Dashboard</h4>
                  )}
                </div>
              </Link>
              <div
                className="text-center"
                onClick={() => {
                  setLogoutConfirm([false, "flex"]);
                  setIsMenuOpen(false);
                }}
              >
                <div className="py-[2vh] bg-[rgba(0,0,0,0.85)] text-white">
                  {loading ? (
                    <SpinnerLoading size={"sm"} color="white" />
                  ) : (
                    <h4>Keluar</h4>
                  )}
                </div>
              </div>
            </>
          ) : (
            <Link
              href="/Masuk"
              className="text-center"
              onClick={() => {
                setIsMenuOpen(false);
              }}
            >
              <div className="py-[2vh] bg-[rgba(0,0,0,0.85)] text-white">
                {loading ? (
                  <SpinnerLoading size={"sm"} color="white" />
                ) : (
                  <h4>Masuk</h4>
                )}
              </div>
            </Link>
          )}
          {/* Outer Element, if Burger Menu = Open, then Menu will Off if Outer Element "Clicked"  */}
          <div
            className={`${isMenuOpen ? "flex" : "hidden"} h-[50vh] w-full`}
            onClick={() => (isMenuOpen ? setIsMenuOpen(false) : null)}
          />
        </div>
      </nav>

      {/* //! LOGOUT POPUP CONFIRMATION  */}
      <div className={`${logoutConfirm[1]}`}>
        <AlertNotif
          type="double"
          msg="Apakah anda ingin keluar?"
          yesText="Ok"
          noText="Tidak"
          icon="warning"
          loading={loading}
          confirm={(res) => {
            if (res) {
              setLogoutConfirm([true, "flex"]);
              handleLogout();
            } else {
              setLogoutConfirm([false, "hidden"]);
            }
          }}
        />
      </div>
    </>
  );
}
