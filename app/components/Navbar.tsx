"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase/supabaseClient";
import {
  getAppComponentConfig,
  getImagePreviewUrl,
} from "@/lib/supabase/supabaseHelper";
import { useAuthStore } from "../Stores/authStores";
import { useLocaleStore } from "../Stores/localeStore";

const fallback = {
  nav_org_logo: "/assets/logo_malut.png",
  nav_org_name_main: "Platform Data DKP",
  nav_org_name_sub: "Provinsi Maluku Utara",
  nav_menu_data: "Data",
  nav_menu_contact: "Kontak",
  nav_menu_regulations: "Peraturan",
  nav_menu_login: "Masuk",
  nav_menu_profile: "Dashboard",
  nav_menu_logout: "Keluar",
};

export default function Navbar({
  previewMode = false,
}: {
  previewMode?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocaleStore((state) => state.locale);
  const setLocale = useLocaleStore((state) => state.setLocale);
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const [labels, setLabels] = useState(fallback);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    void getAppComponentConfig("navbar", locale).then((config) => {
      setLabels({ ...fallback, ...config.values });
    });
  }, [locale]);

  useEffect(() => setOpen(false), [pathname]);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/data");
  }

  const links = [
    ["/data", labels.nav_menu_data],
    ["/peraturan", labels.nav_menu_regulations],
    ["/kontak", labels.nav_menu_contact],
  ];

  return (
    <nav
      data-app-shell={previewMode ? undefined : "navbar"}
      className="sticky top-0 z-[1400] border-b border-sky-100 bg-white/95 shadow-sm backdrop-blur"
    >
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-5 px-5 lg:px-10">
        <Link href="/data" className="flex min-w-0 items-center gap-3">
          <Image
            src={getImagePreviewUrl(labels.nav_org_logo)}
            width={48}
            height={48}
            alt=""
            className="h-11 w-11 object-contain"
          />
          <span className="min-w-0">
            <strong className="block truncate text-sm text-slate-900">
              {labels.nav_org_name_main}
            </strong>
            <span className="block truncate text-xs text-slate-500">
              {labels.nav_org_name_sub}
            </span>
          </span>
        </Link>

        <button
          type="button"
          className="rounded-lg border px-3 py-2 text-sm md:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label="Buka menu"
        >
          Menu
        </button>

        <div
          className={`${open ? "flex" : "hidden"} absolute inset-x-0 top-16 flex-col gap-1 border-b bg-white p-4 md:static md:flex md:flex-row md:items-center md:border-0 md:p-0`}
        >
          {links.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-sky-50 hover:text-sky-800"
            >
              {label}
            </Link>
          ))}
          <select
            value={locale}
            onChange={(event) => setLocale(event.target.value as "id" | "en")}
            className="rounded-lg border border-slate-200 px-2 py-2 text-sm"
            aria-label="Bahasa"
          >
            <option value="id">ID</option>
            <option value="en">EN</option>
          </select>
          {isLoggedIn ? (
            <>
              <Link
                href="/profile"
                className="rounded-lg bg-sky-700 px-4 py-2 text-sm text-white"
              >
                {labels.nav_menu_profile}
              </Link>
              <button
                type="button"
                onClick={() => void logout()}
                className="rounded-lg px-3 py-2 text-left text-sm text-rose-700"
              >
                {labels.nav_menu_logout}
              </button>
            </>
          ) : (
            <Link
              href="/masuk"
              className="rounded-lg bg-sky-700 px-4 py-2 text-sm text-white"
            >
              {labels.nav_menu_login}
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
