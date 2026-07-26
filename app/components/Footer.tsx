"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useLocaleStore } from "../Stores/localeStore";
import { getAppComponentConfig } from "@/lib/supabase/supabaseHelper";

const fallback = {
  footer_title: "Platform Data DKP Maluku Utara",
  footer_description:
    "Akses data kelautan dan perikanan yang transparan dan terkelola.",
  footer_copyright: "Pemerintah Provinsi Maluku Utara",
};

export default function Footer({
  previewMode = false,
}: {
  previewMode?: boolean;
}) {
  const locale = useLocaleStore((state) => state.locale);
  const [labels, setLabels] = useState(fallback);

  useEffect(() => {
    void getAppComponentConfig("footer", locale).then((config) => {
      setLabels({ ...fallback, ...config.values });
    });
  }, [locale]);

  return (
    <footer
      data-app-shell={previewMode ? undefined : "footer"}
      className="border-t border-sky-900 bg-sky-950 text-sky-50"
    >
      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-10 md:grid-cols-2 lg:px-10">
        <div>
          <p className="font-semibold">{labels.footer_title}</p>
          <p className="mt-2 max-w-xl text-sm text-sky-100">
            {labels.footer_description}
          </p>
        </div>
        <nav className="flex flex-wrap content-start gap-x-5 gap-y-3 text-sm md:justify-end">
          <Link href="/data">Data</Link>
          <Link href="/kontak">Kontak</Link>
          <Link href="/peraturan">Peraturan</Link>
          <Link href="/kebijakan-privasi">Privasi</Link>
          <Link href="/syarat-dan-ketentuan">Ketentuan</Link>
          <Link href="/aksesibilitas">Aksesibilitas</Link>
        </nav>
      </div>
      <div className="border-t border-sky-900 px-6 py-4 text-center text-xs text-sky-200">
        © {new Date().getFullYear()} {labels.footer_copyright}
      </div>
    </footer>
  );
}
