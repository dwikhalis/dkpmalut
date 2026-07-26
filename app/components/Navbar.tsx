"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { supabase } from "@/lib/supabase/supabaseClient";
import {
  getAppComponentConfig,
  getImagePreviewUrl,
} from "@/lib/supabase/supabaseHelper";
import { useAuthStore } from "../Stores/authStores";
import { useLocaleStore } from "../Stores/localeStore";

type Labels = Record<string, string>;

const fallback: Labels = {
  nav_org_logo: "/assets/logo_malut.png",
  nav_org_name_main: "Platform Data DKP",
  nav_org_name_sub: "Provinsi Maluku Utara",
  nav_menu_home: "Beranda",
  nav_menu_data: "Data",
  nav_menu_regulations: "Peraturan",
  nav_menu_contact: "Kontak",
  nav_menu_login: "Masuk",
  nav_menu_loggedin: "Akun",
  nav_menu_profile: "Dashboard",
  nav_menu_logout: "Keluar",
};

const localeNames = { id: "Indonesia", en: "English" } as const;

export default function Navbar({
  previewMode = false,
}: {
  previewMode?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement>(null);
  const locale = useLocaleStore((state) => state.locale);
  const setLocale = useLocaleStore((state) => state.setLocale);
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const role = useAuthStore((state) => state.role);
  const profile = useAuthStore((state) => state.profile);
  const loading = useAuthStore((state) => state.loading);
  const [labels, setLabels] = useState<Labels>(fallback);
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [localeOpen, setLocaleOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let mounted = true;
    void getAppComponentConfig("navbar", locale).then((config) => {
      if (!mounted) return;
      setLabels({ ...fallback, ...config.values });
      setVisibility(config.visibility);
    });
    return () => {
      mounted = false;
    };
  }, [locale]);

  useEffect(() => {
    setMobileOpen(false);
    setAccountOpen(false);
    setLocaleOpen(false);
  }, [pathname]);

  useEffect(() => {
    function closeMenus(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setAccountOpen(false);
        setLocaleOpen(false);
      }
    }
    document.addEventListener("mousedown", closeMenus);
    return () => document.removeEventListener("mousedown", closeMenus);
  }, []);

  const isVisible = (target: string) => visibility[target] !== false;
  const links = [
    { href: "/", label: labels.nav_menu_home, target: "nav_menu_home" },
    { href: "/data", label: labels.nav_menu_data, target: "nav_menu_data" },
    {
      href: "/peraturan",
      label: labels.nav_menu_regulations,
      target: "nav_menu_regulations",
    },
    {
      href: "/kontak",
      label: labels.nav_menu_contact,
      target: "nav_menu_contact",
    },
  ].filter((item) => isVisible(item.target));

  function active(href: string) {
    return href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(`${href}/`);
  }

  async function logout() {
    setSigningOut(true);
    await supabase.auth.signOut();
    setSigningOut(false);
    setAccountOpen(false);
    router.push("/");
    router.refresh();
  }

  const navLink = (href: string, label: string, mobile = false) => (
    <Link
      key={href}
      href={href}
      aria-current={active(href) ? "page" : undefined}
      className={
        mobile
          ? `rounded-xl px-4 py-3 text-base font-medium transition ${
              active(href)
                ? "bg-sky-50 text-sky-800"
                : "text-slate-700 hover:bg-slate-50"
            }`
          : `relative px-1 py-7 text-sm font-semibold transition after:absolute after:inset-x-0 after:bottom-5 after:h-0.5 after:origin-left after:bg-sky-600 after:transition-transform ${
              active(href)
                ? "text-sky-800 after:scale-x-100"
                : "text-slate-600 after:scale-x-0 hover:text-sky-800 hover:after:scale-x-100"
            }`
      }
    >
      {label}
    </Link>
  );

  return (
    <nav
      data-app-shell={previewMode ? undefined : "navbar"}
      className="sticky top-0 z-[1400] border-b border-sky-100/80 bg-white/95 shadow-[0_8px_30px_rgba(14,116,144,0.08)] backdrop-blur-xl"
    >
      <div
        ref={menuRef}
        className="relative mx-auto flex min-h-[4.75rem] max-w-[90rem] items-center justify-between gap-6 px-5 lg:px-10"
      >
        <Link href="/" className="flex min-w-0 items-center gap-3">
          {isVisible("nav_org_logo") && (
            <Image
              src={getImagePreviewUrl(labels.nav_org_logo)}
              width={56}
              height={56}
              alt=""
              className="h-12 w-12 shrink-0 object-contain"
              priority
            />
          )}
          <span className="min-w-0 border-l border-sky-100 pl-3">
            {isVisible("nav_org_name_main") && (
              <strong className="block truncate text-sm font-bold tracking-wide text-sky-950 sm:text-base">
                {labels.nav_org_name_main}
              </strong>
            )}
            {isVisible("nav_org_name_sub") && (
              <span className="block truncate text-xs font-medium text-slate-500">
                {labels.nav_org_name_sub}
              </span>
            )}
          </span>
        </Link>

        <div className="hidden items-center gap-6 lg:flex">
          {links.map((item) => navLink(item.href, item.label))}
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setLocaleOpen((value) => !value);
                setAccountOpen(false);
              }}
              className="flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition hover:border-sky-300 hover:text-sky-800"
              aria-expanded={localeOpen}
            >
              <span aria-hidden="true">◎</span>
              {locale.toUpperCase()}
              <span aria-hidden="true">⌄</span>
            </button>
            {localeOpen && (
              <div className="absolute right-0 mt-2 w-40 overflow-hidden rounded-xl border border-slate-100 bg-white p-1.5 shadow-xl">
                {(["id", "en"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setLocale(item);
                      setLocaleOpen(false);
                    }}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                      locale === item
                        ? "bg-sky-50 font-semibold text-sky-800"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {localeNames[item]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {!loading && isLoggedIn ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setAccountOpen((value) => !value);
                  setLocaleOpen(false);
                }}
                className="flex h-10 items-center gap-2 rounded-full bg-sky-800 px-4 text-sm font-semibold text-white transition hover:bg-sky-950"
                aria-expanded={accountOpen}
              >
                <span className="max-w-32 truncate">
                  {profile?.username || labels.nav_menu_loggedin}
                </span>
                <span aria-hidden="true">⌄</span>
              </button>
              {accountOpen && (
                <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-100 bg-white p-2 shadow-xl">
                  <div className="border-b border-slate-100 px-3 py-2">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {profile?.username || labels.nav_menu_loggedin}
                    </p>
                    <p className="text-xs capitalize text-slate-400">
                      {role || "user"}
                    </p>
                  </div>
                  <Link
                    href="/profile"
                    className="mt-1 block rounded-xl px-3 py-2.5 text-sm text-slate-700 hover:bg-sky-50 hover:text-sky-800"
                  >
                    {labels.nav_menu_profile}
                  </Link>
                  <button
                    type="button"
                    disabled={signingOut}
                    onClick={() => void logout()}
                    className="w-full rounded-xl px-3 py-2.5 text-left text-sm text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                  >
                    {signingOut ? "..." : labels.nav_menu_logout}
                  </button>
                </div>
              )}
            </div>
          ) : (
            !loading &&
            isVisible("nav_menu_login") && (
              <Link
                href="/masuk"
                className="rounded-full bg-sky-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-950"
              >
                {labels.nav_menu_login}
              </Link>
            )
          )}
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((value) => !value)}
          className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 text-sky-900 lg:hidden"
          aria-expanded={mobileOpen}
          aria-controls={menuId}
          aria-label={mobileOpen ? "Tutup menu" : "Buka menu"}
        >
          <span className="text-xl" aria-hidden="true">
            {mobileOpen ? "×" : "☰"}
          </span>
        </button>
      </div>

      <div
        id={menuId}
        className={`${mobileOpen ? "grid" : "hidden"} border-t border-slate-100 bg-white px-5 pb-6 pt-3 shadow-xl lg:hidden`}
      >
        {links.map((item) => navLink(item.href, item.label, true))}
        <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-4">
          {(["id", "en"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setLocale(item)}
              className={`rounded-lg px-3 py-2 text-xs font-bold ${
                locale === item
                  ? "bg-sky-100 text-sky-900"
                  : "bg-slate-50 text-slate-500"
              }`}
            >
              {item.toUpperCase()}
            </button>
          ))}
        </div>
        {!loading && isLoggedIn ? (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link
              href="/profile"
              className="rounded-xl bg-sky-800 px-4 py-3 text-center text-sm font-semibold text-white"
            >
              {labels.nav_menu_profile}
            </Link>
            <button
              type="button"
              disabled={signingOut}
              onClick={() => void logout()}
              className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"
            >
              {labels.nav_menu_logout}
            </button>
          </div>
        ) : (
          !loading && (
            <Link
              href="/masuk"
              className="mt-4 rounded-xl bg-sky-800 px-4 py-3 text-center text-sm font-semibold text-white"
            >
              {labels.nav_menu_login}
            </Link>
          )
        )}
      </div>
    </nav>
  );
}
