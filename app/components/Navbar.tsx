"use client";

import { supabase } from "@/lib/supabase/supabaseClient";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "../Stores/authStores";
import SpinnerLoading from "./SpinnerLoading";
import AlertNotif from "./AlertNotif";
import Button from "./Button";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [show, setShow] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [loading, setLoading] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState([false, "hidden"]);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);

  const role = useAuthStore((state) => state.role);

  //! Loading if new page hasn't load
  useEffect(() => {
    setDashboardLoading(false);
  }, [pathname]);

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

  //! LOGOUT Handler
  const handleLogout = async () => {
    setLoading(true);
    if (logoutConfirm) {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Error signing out:", error.message);
      } else {
        router.push("/");
      }
      setLoading(false);
      setLogoutConfirm([false, "hidden"]);
    }
  };

  //! Handle close dropdown menu when click outside

  const accountMenuRef = useRef<HTMLDetailsElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target as Node)
      ) {
        accountMenuRef.current.open = false;
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <>
      {/* //! DESKTOP */}
      <nav
        className={`hidden md:flex sticky z-50 top-0 xl:h-[6vw] h-[8vw] bg-white w-full transition-transform duration-300 ${
          show ? "translate-y-0" : "-translate-y-full"
        }`}
        style={{ filter: "drop-shadow(0px 5px 10px rgba(0,0,0,0.3))" }}
      >
        <div className="flex justify-between w-full mx-8 lg:mx-12">
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
              href="/organisasi"
              className="flex justify-center items-center hover:text-gray-400 h-full cursor-pointer"
            >
              <h6>Organisasi</h6>
            </Link>
            <Link
              href="/berita"
              className="flex justify-center items-center hover:text-gray-400 h-full cursor-pointer"
            >
              <h6>Berita</h6>
            </Link>
            <Link
              href="/galeri"
              className="flex justify-center items-center hover:text-gray-400 h-full cursor-pointer"
            >
              <h6>Galeri</h6>
            </Link>
            <Link
              href="/data"
              className="flex justify-center items-center hover:text-gray-400 h-full cursor-pointer"
            >
              <h6>Data</h6>
            </Link>
            <Link
              href="/kontak"
              className="flex justify-center items-center hover:text-gray-400 h-full cursor-pointer"
            >
              <h6>Kontak</h6>
            </Link>

            {isLoggedIn ? (
              <details
                ref={accountMenuRef}
                className="relative flex items-center group"
              >
                <summary className="flex items-center cursor-pointer list-none">
                  <span className="flex items-center px-5 py-2 text-xs bg-sky-800 hover:bg-sky-200 text-white rounded-full hover:text-black cursor-pointer">
                    Akun
                  </span>
                </summary>

                <div className="absolute top-full right-0 z-50 mt-2 flex min-w-[160px] flex-col rounded-lg border border-gray-300 bg-white shadow-lg p-2">
                  {role !== "user" && (
                    <button
                      className="flex items-center whitespace-nowrap rounded-md text-left text-sm hover:bg-sky-200 px-3 py-2 min-h-[36px]"
                      disabled={dashboardLoading}
                      onClick={() => {
                        setDashboardLoading(true);
                        accountMenuRef.current!.open = false;
                        router.push("/profile");
                      }}
                    >
                      {dashboardLoading ? (
                        <SpinnerLoading size="sm" color="black" />
                      ) : (
                        "Dashboard"
                      )}
                    </button>
                  )}

                  <button
                    className="flex items-center whitespace-nowrap rounded-md text-left text-sm hover:bg-sky-200 px-3 py-2 min-h-[36px]"
                    onClick={() => {
                      setLogoutConfirm([false, "flex"]);
                    }}
                  >
                    {loading ? (
                      <SpinnerLoading size="sm" color="white" />
                    ) : (
                      "Keluar"
                    )}
                  </button>
                </div>
              </details>
            ) : (
              <Button size="lg" text="Masuk" link="/masuk" />
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
          <Link href="/" className="flex items-center h-full ml-6">
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
            href="/organisasi"
            className="text-center"
            onClick={() => setIsMenuOpen(false)}
          >
            <h4 className="py-[2vh] bg-[rgba(0,0,0,0.8)] text-white">
              Organisasi
            </h4>
          </Link>
          <Link
            href="/berita"
            className="text-center"
            onClick={() => setIsMenuOpen(false)}
          >
            <h4 className="py-[2vh] bg-[rgba(0,0,0,0.8)] text-white">Berita</h4>
          </Link>
          <Link
            href="/galeri"
            className="text-center"
            onClick={() => setIsMenuOpen(false)}
          >
            <h4 className="py-[2vh] bg-[rgba(0,0,0,0.8)] text-white">Galeri</h4>
          </Link>
          <Link
            href="/data"
            className="text-center"
            onClick={() => setIsMenuOpen(false)}
          >
            <h4 className="py-[2vh] bg-[rgba(0,0,0,0.8)] text-white">Data</h4>
          </Link>
          <Link
            href="/kontak"
            className="text-center"
            onClick={() => setIsMenuOpen(false)}
          >
            <h4 className="py-[2vh] bg-[rgba(0,0,0,0.8)] text-white">Kontak</h4>
          </Link>
          {isLoggedIn ? (
            <>
              <Link
                href="/profile"
                className="text-center"
                onClick={() => {
                  setIsMenuOpen(false);
                }}
              >
                <div className="py-[2vh] bg-[rgba(0,0,0,0.85)] text-white">
                  {loading ? (
                    <SpinnerLoading size={"sm"} color="white" />
                  ) : (
                    <h4>Akun</h4>
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
                <div className="py-[2vh] bg-[rgba(0,0,0,0.85)] text-white cursor-pointer">
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
              href="/masuk"
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
