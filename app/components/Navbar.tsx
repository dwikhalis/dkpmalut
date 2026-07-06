"use client";

import { supabase } from "@/lib/supabase/supabaseClient";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "../Stores/authStores";
import SpinnerLoading from "./SpinnerLoading";
import AlertNotif from "./AlertNotif";
import Button from "./Button";
import {
  getAppLabelComponent,
  getImagePreviewUrl,
} from "@/lib/supabase/supabaseHelper";
import { useLocaleStore } from "../Stores/localeStore";

type AppLabels = Record<string, string>;

const navbarFallbackLabels: AppLabels = {
  org_logo: "/assets/logo_malut.png",
  org_name_main: "Dinas Kelautan dan Perikanan",
  org_name_sub: "Provinsi Maluku Utara",

  nav_menu_organization: "Organisasi",
  nav_menu_news: "Berita",
  nav_menu_gallery: "Galeri",
  nav_menu_data: "Data",
  nav_menu_contact: "Kontak",

  nav_menu_login: "Masuk",
  nav_menu_loggedin: "Akun",
  nav_menu_profile: "Dashboard",
  nav_menu_logout: "Keluar",
};

export default function Navbar() {
  //! ===== LANGUAGE SELECTOR TOGGLE ACTIVE / INACTIVE =====
  const localeIsActive = true;

  const router = useRouter();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [show, setShow] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [loading, setLoading] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState([false, "hidden"]);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const [labels, setLabels] = useState<AppLabels>(navbarFallbackLabels);
  const [localeLoading, setLocaleLoading] = useState(false);

  const role = useAuthStore((state) => state.role);
  const locale = useLocaleStore((state) => state.locale);
  const setLocale = useLocaleStore((state) => state.setLocale);

  //! GET APP LABELS
  useEffect(() => {
    let mounted = true;

    async function loadLabels() {
      setLocaleLoading(true);

      const result = await getAppLabelComponent("navbar", locale);

      if (mounted) {
        setLabels({
          ...navbarFallbackLabels,
          ...result,
        });

        setLocaleLoading(false);
      }
    }

    loadLabels();

    return () => {
      mounted = false;
    };
  }, [locale]);

  //! Loading if new page hasn't load
  useEffect(() => {
    setDashboardLoading(false);
  }, [pathname]);

  //! Dropdown "Summary Details" Close When Click Outside
  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;

      document
        .querySelectorAll<HTMLDetailsElement>("[data-dropdown='true']")
        .forEach((details) => {
          if (!details.contains(target)) {
            details.open = false;
          }
        });
    };

    document.addEventListener("pointerdown", handlePointerDown, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, []);

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
                src={getImagePreviewUrl(labels.org_logo)}
                alt="Logo"
                className="object-contain"
                height={600}
                width={800}
              />
            </div>
            <div className="flex flex-col justify-center">
              <p className="font-bold md:text-xs lg:text-lg">
                {labels.org_name_main}
              </p>
              <p className="md:text-xs lg:text-lg">{labels.org_name_sub}</p>
            </div>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex 2xl:gap-12 gap-6 h-full">
            <Link
              href="/organisasi"
              className="flex justify-center items-center hover:text-gray-400 h-full cursor-pointer"
            >
              <h6>{labels.nav_menu_organization}</h6>
            </Link>
            <Link
              href="/berita"
              className="flex justify-center items-center hover:text-gray-400 h-full cursor-pointer"
            >
              <h6>{labels.nav_menu_news}</h6>
            </Link>
            <Link
              href="/galeri"
              className="flex justify-center items-center hover:text-gray-400 h-full cursor-pointer"
            >
              <h6>{labels.nav_menu_gallery}</h6>
            </Link>
            <Link
              href="/data"
              className="flex justify-center items-center hover:text-gray-400 h-full cursor-pointer"
            >
              <h6>{labels.nav_menu_data}</h6>
            </Link>
            <Link
              href="/kontak"
              className="flex justify-center items-center hover:text-gray-400 h-full cursor-pointer"
            >
              <h6>{labels.nav_menu_contact}</h6>
            </Link>

            {/* //! LANGUAGE SELECTOR */}

            {localeIsActive && (
              <details
                data-dropdown="true"
                className="relative flex items-center group"
              >
                <summary className="flex items-center cursor-pointer">
                  <div className="flex items-center hover:bg-sky-200 text-white rounded-full hover:text-black cursor-pointer">
                    {localeLoading ? (
                      <SpinnerLoading size="sm" color="black" />
                    ) : (
                      <Image
                        src={"/assets/icon_locale.png"}
                        width={30}
                        height={30}
                        alt="locale"
                        className="w-8 h-5"
                      />
                    )}
                  </div>
                </summary>

                <div className="absolute top-full right-0 z-50 mt-2 flex min-w-[160px] flex-col rounded-lg border border-gray-300 bg-white shadow-lg p-2">
                  <button
                    className="flex items-center whitespace-nowrap rounded-md text-left text-sm hover:bg-sky-200 px-3 py-2 min-h-[36px] disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={localeLoading || locale === "id"}
                    onClick={(e) => {
                      setLocale("id");
                      e.currentTarget.closest("details")!.open = false;
                    }}
                  >
                    Bahasa
                  </button>

                  <button
                    className="flex items-center whitespace-nowrap rounded-md text-left text-sm hover:bg-sky-200 px-3 py-2 min-h-[36px] disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={localeLoading || locale === "en"}
                    onClick={(e) => {
                      setLocale("en");
                      e.currentTarget.closest("details")!.open = false;
                    }}
                  >
                    English
                  </button>
                </div>
              </details>
            )}

            {isLoggedIn ? (
              <details
                data-dropdown="true"
                className="relative flex items-center group"
              >
                <summary className="flex items-center cursor-pointer list-none">
                  <span className="flex items-center px-5 py-2 text-xs bg-sky-800 hover:bg-sky-200 text-white rounded-full hover:text-black cursor-pointer">
                    {labels.nav_menu_loggedin}
                  </span>
                </summary>

                <div className="absolute top-full right-0 z-50 mt-2 flex min-w-[160px] flex-col rounded-lg border border-gray-300 bg-white shadow-lg p-2">
                  {role !== "user" && (
                    <button
                      className="flex items-center whitespace-nowrap rounded-md text-left text-sm hover:bg-sky-200 px-3 py-2 min-h-[36px]"
                      disabled={dashboardLoading}
                      onClick={(e) => {
                        setDashboardLoading(true);
                        e.currentTarget.closest("details")!.open = false;
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
                    onClick={(e) => {
                      e.currentTarget.closest("details")!.open = false;
                      setLogoutConfirm([false, "flex"]);
                    }}
                  >
                    {loading ? (
                      <SpinnerLoading size="sm" color="white" />
                    ) : (
                      labels.nav_menu_logout
                    )}
                  </button>
                </div>
              </details>
            ) : (
              <Button size="lg" text={labels.nav_menu_login} link="/masuk" />
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
                src={getImagePreviewUrl(labels.org_logo)}
                alt="Logo"
                className="object-contain"
                height={600}
                width={800}
              />
            </div>
            <div className="flex flex-col justify-center">
              <h4 className="font-bold">{labels.org_name_main}</h4>
              <h4>{labels.org_name_sub}</h4>
            </div>
          </Link>

          {localeIsActive && (
            <div className="relative grow flex h-full justify-end items-center">
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value as "id" | "en")}
                className="absolute inset-0 h-full cursor-pointer opacity-0"
              >
                <option value="id">Bahasa</option>
                <option value="en">English</option>
              </select>

              <div className="pointer-events-none flex items-center justify-center">
                {localeLoading ? (
                  <SpinnerLoading size="sm" color="black" />
                ) : (
                  <img
                    src="/assets/icon_locale.png"
                    alt="Language"
                    className="h-6 w-6 object-contain"
                  />
                )}
              </div>
            </div>
          )}

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
              {labels.nav_menu_organization}
            </h4>
          </Link>
          <Link
            href="/berita"
            className="text-center"
            onClick={() => setIsMenuOpen(false)}
          >
            <h4 className="py-[2vh] bg-[rgba(0,0,0,0.8)] text-white">
              {labels.nav_menu_news}
            </h4>
          </Link>
          <Link
            href="/galeri"
            className="text-center"
            onClick={() => setIsMenuOpen(false)}
          >
            <h4 className="py-[2vh] bg-[rgba(0,0,0,0.8)] text-white">
              {labels.nav_menu_gallery}
            </h4>
          </Link>
          <Link
            href="/data"
            className="text-center"
            onClick={() => setIsMenuOpen(false)}
          >
            <h4 className="py-[2vh] bg-[rgba(0,0,0,0.8)] text-white">
              {labels.nav_menu_data}
            </h4>
          </Link>
          <Link
            href="/kontak"
            className="text-center"
            onClick={() => setIsMenuOpen(false)}
          >
            <h4 className="py-[2vh] bg-[rgba(0,0,0,0.8)] text-white">
              {labels.nav_menu_contact}
            </h4>
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
                <div className="py-[2vh] bg-[rgba(0,0,0,0.85)] text-white cursor-pointer">
                  {loading ? (
                    <SpinnerLoading size={"sm"} color="white" />
                  ) : (
                    <h4>{labels.nav_menu_loggedin}</h4>
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
                    <h4>{labels.nav_menu_logout}</h4>
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
                  <h4>{labels.nav_menu_login}</h4>
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
