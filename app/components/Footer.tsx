"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useLocaleStore } from "../Stores/localeStore";
import {
  getAppComponentConfig,
  getImagePreviewUrl,
} from "@/lib/supabase/supabaseHelper";

type Labels = Record<string, string>;

const fallbackByLocale: Record<"id" | "en", Labels> = {
  id: {
    footer_org_logo: "/assets/logo_malut.png",
    footer_org_name_main: "Platform Data DKP",
    footer_org_name_sub: "Provinsi Maluku Utara",
    footer_description:
      "Pusat data kelautan dan perikanan yang terbuka, terukur, dan mudah diakses untuk Maluku Utara.",
    footer_tab_title_1: "Platform",
    footer_tab_label_1_1: "Beranda",
    footer_tab_label_1_1_path: "/",
    footer_tab_label_1_2: "Data",
    footer_tab_label_1_2_path: "/data",
    footer_tab_label_1_3: "Peraturan",
    footer_tab_label_1_3_path: "/peraturan",
    footer_tab_title_2: "Informasi",
    footer_tab_label_2_1: "Kontak",
    footer_tab_label_2_1_path: "/kontak",
    footer_tab_label_2_2: "Kebijakan Privasi",
    footer_tab_label_2_2_path: "/kebijakan-privasi",
    footer_tab_label_2_3: "Syarat dan Ketentuan",
    footer_tab_label_2_3_path: "/syarat-dan-ketentuan",
    footer_tab_title_3: "Akun",
    footer_tab_label_3_1: "Masuk",
    footer_tab_label_3_1_path: "/masuk",
    footer_tab_label_3_2: "Daftar",
    footer_tab_label_3_2_path: "/daftar",
    footer_tab_label_3_3: "Aksesibilitas",
    footer_tab_label_3_3_path: "/aksesibilitas",
    footer_copyright_title: "Pemerintah Provinsi Maluku Utara",
  },
  en: {
    footer_org_logo: "/assets/logo_malut.png",
    footer_org_name_main: "DKP Data Platform",
    footer_org_name_sub: "North Maluku Province",
    footer_description:
      "An open and accessible marine and fisheries data hub for North Maluku.",
    footer_tab_title_1: "Platform",
    footer_tab_label_1_1: "Home",
    footer_tab_label_1_1_path: "/",
    footer_tab_label_1_2: "Data",
    footer_tab_label_1_2_path: "/data",
    footer_tab_label_1_3: "Regulations",
    footer_tab_label_1_3_path: "/peraturan",
    footer_tab_title_2: "Information",
    footer_tab_label_2_1: "Contact",
    footer_tab_label_2_1_path: "/kontak",
    footer_tab_label_2_2: "Privacy Policy",
    footer_tab_label_2_2_path: "/kebijakan-privasi",
    footer_tab_label_2_3: "Terms and Conditions",
    footer_tab_label_2_3_path: "/syarat-dan-ketentuan",
    footer_tab_title_3: "Account",
    footer_tab_label_3_1: "Sign in",
    footer_tab_label_3_1_path: "/masuk",
    footer_tab_label_3_2: "Register",
    footer_tab_label_3_2_path: "/daftar",
    footer_tab_label_3_3: "Accessibility",
    footer_tab_label_3_3_path: "/aksesibilitas",
    footer_copyright_title: "Government of North Maluku Province",
  },
};

function safePath(value: string | undefined) {
  const path = value?.trim();
  if (!path) return "#";
  if (path.startsWith("/") || /^https?:\/\//i.test(path)) return path;
  return "#";
}

export default function Footer({
  previewMode = false,
}: {
  previewMode?: boolean;
}) {
  const pathname = usePathname();
  const locale = useLocaleStore((state) => state.locale);
  const [labels, setLabels] = useState<Labels>(fallbackByLocale[locale]);
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let mounted = true;
    void getAppComponentConfig("footer", locale).then((config) => {
      if (!mounted) return;
      setLabels({ ...fallbackByLocale[locale], ...config.values });
      setVisibility(config.visibility);
    });
    return () => {
      mounted = false;
    };
  }, [locale]);

  const columns = useMemo(
    () =>
      [1, 2, 3].map((column) => ({
        title: labels[`footer_tab_title_${column}`],
        target: `footer_tab_title_${column}`,
        items: [1, 2, 3].map((item) => ({
          label: labels[`footer_tab_label_${column}_${item}`],
          path: safePath(labels[`footer_tab_label_${column}_${item}_path`]),
          target: `footer_tab_label_${column}_${item}`,
        })),
      })),
    [labels],
  );

  if (!previewMode && (pathname === "/profile" || pathname.startsWith("/profile/"))) {
    return null;
  }

  const isVisible = (target: string) => visibility[target] !== false;

  return (
    <footer
      data-app-shell={previewMode ? undefined : "footer"}
      className="relative overflow-hidden bg-sky-950 text-white"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        aria-hidden="true"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 15%, #22d3ee 0, transparent 28%), radial-gradient(circle at 85% 70%, #0ea5e9 0, transparent 25%)",
        }}
      />
      <div className="relative mx-auto grid max-w-[90rem] gap-12 px-6 py-14 lg:grid-cols-[1.3fr_2fr] lg:px-10 lg:py-16">
        <div className="max-w-md">
          <Link href="/" className="inline-flex items-center gap-4">
            {isVisible("footer_org_logo") && (
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white p-2 shadow-lg">
                <Image
                  src={getImagePreviewUrl(labels.footer_org_logo)}
                  width={56}
                  height={56}
                  alt=""
                  className="h-full w-full object-contain"
                />
              </span>
            )}
            <span>
              {isVisible("footer_org_name_main") && (
                <strong className="block text-lg font-bold tracking-wide">
                  {labels.footer_org_name_main}
                </strong>
              )}
              {isVisible("footer_org_name_sub") && (
                <span className="text-sm text-sky-200">
                  {labels.footer_org_name_sub}
                </span>
              )}
            </span>
          </Link>
          {isVisible("footer_description") && (
            <p className="mt-6 text-sm leading-7 text-sky-100/80">
              {labels.footer_description}
            </p>
          )}
          <div className="mt-7 flex gap-3">
            {[
              ["Instagram", labels.footer_social_instagram],
              ["Facebook", labels.footer_social_facebook],
              ["YouTube", labels.footer_social_youtube],
            ].map(([name, href]) =>
              href?.trim() ? (
                <a
                  key={name}
                  href={safePath(href)}
                  target="_blank"
                  rel="noreferrer"
                  className="grid h-10 min-w-10 place-items-center rounded-full border border-sky-700 px-3 text-xs font-bold text-sky-100 transition hover:border-cyan-300 hover:bg-cyan-300 hover:text-sky-950"
                  aria-label={name}
                >
                  {name.slice(0, 2)}
                </a>
              ) : null,
            )}
          </div>
        </div>

        <nav className="grid gap-8 sm:grid-cols-3" aria-label="Navigasi footer">
          {columns.map((column) =>
            isVisible(column.target) ? (
              <div key={column.target}>
                <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-cyan-300">
                  {column.title}
                </h2>
                <ul className="mt-5 space-y-3">
                  {column.items.map(
                    (item) =>
                      isVisible(item.target) &&
                      item.label?.trim() && (
                        <li key={item.target}>
                          <Link
                            href={item.path}
                            className="text-sm text-sky-100/80 transition hover:translate-x-1 hover:text-white"
                          >
                            {item.label}
                          </Link>
                        </li>
                      ),
                  )}
                </ul>
              </div>
            ) : null,
          )}
        </nav>
      </div>

      <div className="relative border-t border-sky-800/80">
        <div className="mx-auto flex max-w-[90rem] flex-col gap-2 px-6 py-5 text-xs text-sky-200 sm:flex-row sm:items-center sm:justify-between lg:px-10">
          <p>
            © {new Date().getFullYear()} {labels.footer_copyright_title}
          </p>
          <p>Platform Data Kelautan dan Perikanan</p>
        </div>
      </div>
    </footer>
  );
}
