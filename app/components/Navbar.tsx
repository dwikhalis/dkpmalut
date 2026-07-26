"use client";

import { supabase } from "@/lib/supabase/supabaseClient";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "../Stores/authStores";
import SpinnerLoading from "./SpinnerLoading";
import AlertNotif from "./AlertNotif";
import Button from "./Button";
import {
  getAppComponentConfig,
  getImagePreviewUrl,
} from "@/lib/supabase/supabaseHelper";
import { useLocaleStore } from "../Stores/localeStore";

type AppLabels = Record<string, string>;

const navbarFallbackLabels: AppLabels = {
  nav_org_logo: "/assets/logo_malut.png",
  nav_org_name_main: "Dinas Kelautan dan Perikanan",
  nav_org_name_sub: "Provinsi Maluku Utara",

  nav_menu_data: "Data",
  nav_menu_contact: "Kontak",

  nav_menu_login: "Masuk",
  nav_menu_loggedin: "Akun",
  nav_menu_profile: "Dashboard",
  nav_menu_logout: "Keluar",
};

export default function Navbar({
  previewMode = false,
}: {
  previewMode?: boolean;
}) {
  //! ===== LANGUAGE SELECTOR TOGGLE ACTIVE / INACTIVE =====
  const router = useRouter();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [show, setShow] = useState(true);
  const lastScrollYRef = useRef(0);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuId = useId();
  const [loading, setLoading] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState([false, "hidden"]);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const [labels, setLabels] = useState<AppLabels>(navbarFallbackLabels);
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});
  const [localeLoading, setLocaleLoading] = useState(false);
  const [configVersion, setConfigVersion] = useState(0);

  const role = useAuthStore((state) => state.role);
  const locale = useLocaleStore((state) => state.locale);
  const setLocale = useLocaleStore((state) => state.setLocale);

  //! GET APP LABELS
  useEffect(() => {
    let mounted = true;

    async function loadLabels() {
      setLocaleLoading(true);

      const result = await getAppComponentConfig("navbar", locale);

      if (mounted) {
        setLabels({
          ...navbarFallbackLabels,
          ...result.values,
        });
        setVisibility(result.visibility);

        setLocaleLoading(false);
      }
    }

    loadLabels();

    return () => {
      mounted = false;
    };
  }, [locale, configVersion]);

  useEffect(() => {
    const refreshNavbarConfig = () => setConfigVersion((value) => value + 1);
    window.addEventListener("navbar-config-updated", refreshNavbarConfig);
    return () =>
      window.removeEventListener("navbar-config-updated", refreshNavbarConfig);
  }, []);

  const isVisible = (target: string) => visibility[target] ?? true;
  const localeSelectorVisible = visibility.nav_locale ?? true;

  useEffect(() => {
    if (!localeLoading && !localeSelectorVisible && locale !== "id") {
      setLocale("id");
    }
  }, [locale, localeLoading, localeSelectorVisible, setLocale]);

  //! Loading if new page hasn't load
  useEffect(() => {
    setDashboardLoading(false);
    setIsMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMenuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isMenuOpen]);

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

      if (isMenuOpen) {
        setShow(true);
      } else if (
        currentScrollY > lastScrollYRef.current &&
        currentScrollY > 50
      ) {
        setShow(false);
      } else {
        setShow(true);
      }

      lastScrollYRef.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isMenuOpen]);

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
        data-app-shell={previewMode ? undefined : "navbar"}
        className={`sticky top-0 z-[1400] hidden min-h-16 w-full bg-white py-2 transition-transform duration-300 md:flex ${
          show ? "translate-y-0" : "-translate-y-full"
        }`}
        style={{ filter: "drop-shadow(0px 5px 10px rgba(0,0,0,0.3))" }}
      >
        <div className="mx-12 flex w-full items-center justify-between 2xl:mx-24">
          {/* Logo Home Desktop */}
          {(isVisible("nav_org_logo") ||
            isVisible("nav_org_name_main") ||
            isVisible("nav_org_name_sub")) && (
            <Link
              href="/"
              className="hidden md:flex h-full justify-between items-center"
            >
              {isVisible("nav_org_logo") && (
                <div className="flex relative justify-center items-center h-[3.5vw] w-[3.5vw] mr-3 xl:p-2 2xl:p-4">
                  <Image
                    src={getImagePreviewUrl(labels.nav_org_logo)}
                    alt="Logo"
                    className="object-contain"
                    height={600}
                    width={800}
                  />
                </div>
              )}
              <div className="flex flex-col justify-center">
                {isVisible("nav_org_name_main") && (
                  <p className="font-bold md:text-xs lg:text-sm">
                    {labels.nav_org_name_main}
                  </p>
                )}
                {isVisible("nav_org_name_sub") && (
                  <p className="md:text-xs lg:text-sm">
                    {labels.nav_org_name_sub}
                  </p>
                )}
              </div>
            </Link>
          )}

          {/* Desktop Menu */}
          <div className="hidden h-full gap-3 text-xs md:flex lg:gap-4 lg:text-sm 2xl:gap-8">
            {isVisible("nav_menu_data") && (
              <Link
                href="/data"
                className="flex justify-center items-center hover:text-gray-400 h-full cursor-pointer"
              >
                <span>{labels.nav_menu_data}</span>
              </Link>
            )}
            {isVisible("nav_menu_contact") && (
              <Link
                href="/kontak"
                className="flex justify-center items-center hover:text-gray-400 h-full cursor-pointer"
              >
                <span>{labels.nav_menu_contact}</span>
              </Link>
            )}

            {/* //! LANGUAGE SELECTOR */}

            {isVisible("nav_locale") && (
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

            {isVisible("nav_menu_login") &&
              (isLoggedIn ? (
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
                    {/* //! DASHBOARD */}

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
                      ) : role === "user" ? (
                        "Akun Saya"
                      ) : (
                        "Dashboard"
                      )}
                    </button>

                    {role !== "user" && (
                      <button
                        className="flex items-center whitespace-nowrap rounded-md text-left text-sm hover:bg-sky-200 px-3 py-2 min-h-[36px]"
                        disabled={dashboardLoading}
                        onClick={(e) => {
                          setDashboardLoading(true);
                          e.currentTarget.closest("details")!.open = false;
                          router.push("/profile/data");
                        }}
                      >
                        {dashboardLoading ? (
                          <SpinnerLoading size="sm" color="black" />
                        ) : (
                          "Data"
                        )}
                      </button>
                    )}

                    {/* //! LOGOUT */}
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
              ))}
          </div>
        </div>
      </nav>

      {/* //! MOBILE */}
      <nav
        data-app-shell={previewMode ? undefined : "navbar"}
        className={`md:hidden z-[1400] sticky top-0 transition-transform duration-300 ${
          show ? "translate-y-0" : "-translate-y-full"
        }`}
        style={{ filter: "drop-shadow(0px 5px 10px rgba(0,0,0,0.3))" }}
      >
        {/* Navigation Bar */}
        <div className="relative z-10 flex min-h-[12vw] w-full items-center justify-between bg-white py-2">
          {/* Logo Home Mobile */}
          {(isVisible("nav_org_logo") ||
            isVisible("nav_org_name_main") ||
            isVisible("nav_org_name_sub")) && (
            <Link href="/" className="flex items-center h-full ml-6">
              {isVisible("nav_org_logo") && (
                <div className="flex relative justify-center items-center h-[6vw] w-[6vw] mr-3">
                  <Image
                    src={getImagePreviewUrl(labels.nav_org_logo)}
                    alt="Logo"
                    className="object-contain"
                    height={600}
                    width={800}
                  />
                </div>
              )}
              <div className="flex flex-col justify-center">
                {isVisible("nav_org_name_main") && (
                  <p className="text-xs font-bold sm:text-sm">
                    {labels.nav_org_name_main}
                  </p>
                )}
                {isVisible("nav_org_name_sub") && (
                  <p className="text-xs sm:text-sm">
                    {labels.nav_org_name_sub}
                  </p>
                )}
              </div>
            </Link>
          )}

          {isVisible("nav_locale") && (
            <div className="flex grow items-center justify-end">
              <div className="relative h-6 w-6 shrink-0">
                <select
                  aria-label="Language"
                  value={locale}
                  onChange={(e) => setLocale(e.target.value as "id" | "en")}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                >
                  <option value="id">Bahasa</option>
                  <option value="en">English</option>
                </select>

                <div className="pointer-events-none flex h-full w-full items-center justify-center">
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
            </div>
          )}

          {/* //! Burger Menu for Mobile */}
          <div className="flex h-full items-center justify-center px-7">
            <button
              ref={menuButtonRef}
              type="button"
              className="cursor-pointer text-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-800"
              aria-label={
                isMenuOpen ? "Close navigation menu" : "Open navigation menu"
              }
              aria-expanded={isMenuOpen}
              aria-controls={mobileMenuId}
              onClick={() => setIsMenuOpen((open) => !open)}
            >
              <span aria-hidden="true">{"\u2630"}</span>
            </button>
          </div>
        </div>

        {/* //!  DROP-DOWN MENU */}
        <div
          id={mobileMenuId}
          aria-hidden={!isMenuOpen}
          inert={!isMenuOpen}
          className={`absolute w-full transform transition-all duration-500 ease-in-out motion-reduce:transition-none lg:hidden
    ${
      isMenuOpen && show
        ? "translate-y-0"
        : "-translate-y-full pointer-events-none"
    }`}
        >
          {isVisible("nav_menu_data") && (
            <Link
              href="/data"
              className="text-center"
              onClick={() => setIsMenuOpen(false)}
            >
              <span className="block bg-[rgba(0,0,0,0.8)] py-[2vh] text-base text-white">
                {labels.nav_menu_data}
              </span>
            </Link>
          )}
          {isVisible("nav_menu_contact") && (
            <Link
              href="/kontak"
              className="text-center"
              onClick={() => setIsMenuOpen(false)}
            >
              <span className="block bg-[rgba(0,0,0,0.8)] py-[2vh] text-base text-white">
                {labels.nav_menu_contact}
              </span>
            </Link>
          )}
          {isVisible("nav_menu_login") &&
            (isLoggedIn ? (
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
                      <span className="text-base">
                        {labels.nav_menu_loggedin}
                      </span>
                    )}
                  </div>
                </Link>
                <button
                  type="button"
                  className="w-full bg-[rgba(0,0,0,0.85)] py-[2vh] text-center text-white"
                  onClick={() => {
                    setLogoutConfirm([false, "flex"]);
                    setIsMenuOpen(false);
                  }}
                >
                  {loading ? (
                    <SpinnerLoading size={"sm"} color="white" />
                  ) : (
                    <span className="text-base">{labels.nav_menu_logout}</span>
                  )}
                </button>
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
                    <span className="text-base">{labels.nav_menu_login}</span>
                  )}
                </div>
              </Link>
            ))}

          {/* Outer Element, if Burger Menu = Open, then Menu will Off if Outer Element "Clicked"  */}
          <div
            className={`${isMenuOpen ? "block" : "hidden"} h-screen w-full`}
            aria-hidden="true"
            onClick={() => setIsMenuOpen(false)}
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
