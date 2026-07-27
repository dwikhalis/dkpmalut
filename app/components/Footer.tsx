"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaFacebook, FaInstagram, FaTiktok, FaYoutube } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";

import {
  getAppComponentConfig,
  getImagePreviewUrl,
} from "@/lib/supabase/supabaseHelper";

type AppLabels = Record<string, string>;

const fallbackLabels: AppLabels = {
  footer_org_logo: "/assets/logo_malut.png",
  footer_org_name_main: "Dinas Kelautan dan Perikanan",
  footer_org_name_sub: "Provinsi Maluku Utara",
  footer_copyright_title: "© 2025 DKP Malut. Seluruh hak dilindungi.",
  footer_copyright_subtitle: "Desain dan dikembangkan oleh Khalis",
  footer_copyright_subtitle_path: "https://www.linkedin.com/in/khalisdwih/",
  footer_tab_title_1: "Layanan",
  footer_tab_label_1_1: "Data",
  footer_tab_label_1_1_path: "/data",
  footer_tab_label_1_2: "Kontak",
  footer_tab_label_1_2_path: "/kontak",
  footer_tab_title_2: "Informasi",
  footer_tab_label_2_1: "Aksesibilitas",
  footer_tab_label_2_1_path: "/aksesibilitas",
  footer_tab_label_2_2: "Kebijakan Privasi",
  footer_tab_label_2_2_path: "/kebijakan-privasi",
  footer_tab_label_2_3: "Syarat dan Ketentuan",
  footer_tab_label_2_3_path: "/syarat-dan-ketentuan",
};

function cleanValue(value: string | undefined) {
  return (value ?? "").trim();
}

function cleanCopyright(value: string) {
  if (!value) return value;

  // Repair common mojibake before a copyright year (for example Â© or ï¿½).
  return value.replace(/^.*?(?=\s*20\d{2}\b)/, "\u00A9");
}

function isExternal(href: string) {
  return /^https?:\/\//i.test(href);
}

function FooterLink({ href, children }: { href: string; children: ReactNode }) {
  const safeHref = cleanValue(href) || "#";

  return (
    <Link
      href={safeHref}
      className="cursor-pointer hover:text-stone-400"
      {...(isExternal(safeHref)
        ? { target: "_blank", rel: "noopener noreferrer" }
        : {})}
    >
      {children}
    </Link>
  );
}

export default function Footer({
  previewMode = false,
}: {
  previewMode?: boolean;
}) {
  const pathname = usePathname();
  const [labels, setLabels] = useState<AppLabels>(fallbackLabels);

  useEffect(() => {
    let mounted = true;
    const fallback = fallbackLabels;

    async function loadLabels() {
      try {
        const footerResult = await getAppComponentConfig("footer");
        if (!mounted) return;

        const mergedLabels = {
          ...fallback,
          ...footerResult.values,
        };

        Object.entries(footerResult.visibility).forEach(
          ([target, isActive]) => {
            if (!isActive) mergedLabels[target] = "";
          },
        );

        setLabels(mergedLabels);
      } catch (error) {
        console.error("Failed to load footer labels:", error);
        if (mounted) setLabels(fallback);
      }
    }

    void loadLabels();
    return () => {
      mounted = false;
    };
  }, []);

  const columns = useMemo(
    () =>
      [1, 2, 3]
        .map((column) => ({
          title: cleanValue(labels[`footer_tab_title_${column}`]),
          items: [1, 2, 3, 4, 5]
            .map((item) => ({
              label: cleanValue(labels[`footer_tab_label_${column}_${item}`]),
              path: cleanValue(
                labels[`footer_tab_label_${column}_${item}_path`],
              ),
            }))
            .filter((item) => item.label && item.path),
        }))
        .filter((column) => column.title || column.items.length > 0),
    [labels],
  );

  const isProfileRoute =
    pathname === "/profile" || pathname.startsWith("/profile/");

  if (!previewMode && isProfileRoute) return null;

  const socials = [
    { key: "socmed_facebook", label: "Facebook", icon: <FaFacebook /> },
    { key: "socmed_instagram", label: "Instagram", icon: <FaInstagram /> },
    { key: "socmed_youtube", label: "YouTube", icon: <FaYoutube /> },
    { key: "socmed_xtwitter", label: "X / Twitter", icon: <FaXTwitter /> },
    { key: "socmed_tiktok", label: "TikTok", icon: <FaTiktok /> },
  ].filter((social) => cleanValue(labels[social.key]));

  const copyrightTitle = cleanCopyright(
    cleanValue(labels.footer_copyright_title),
  );
  const copyrightSubtitle = cleanValue(labels.footer_copyright_subtitle);
  const copyrightPath = cleanValue(labels.footer_copyright_subtitle_path);
  const organizationLogo = cleanValue(labels.footer_org_logo);
  const organizationName = cleanValue(labels.footer_org_name_main);
  const organizationSubName = cleanValue(labels.footer_org_name_sub);
  const hasOrganization = Boolean(
    organizationLogo || organizationName || organizationSubName,
  );
  const hasCopyright = Boolean(copyrightTitle || copyrightSubtitle);
  const hasLeftContent = hasOrganization || socials.length > 0 || hasCopyright;

  const navigation = (mobile = false) => (
    <div
      className={
        mobile
          ? "flex w-full flex-wrap justify-center gap-6"
          : "flex min-w-[18rem] grow basis-[30rem] flex-wrap gap-8 text-white"
      }
    >
      {columns.map((column, columnIndex) => (
        <div
          key={`${column.title}-${columnIndex}`}
          className={`flex min-w-32 grow basis-32 flex-col gap-2 ${mobile ? "text-center" : ""}`}
        >
          {column.title && (
            <h2 className={`${mobile ? "text-sm" : "text-base"} font-bold`}>
              {column.title}
            </h2>
          )}
          {column.items.map((item, itemIndex) => (
            <FooterLink key={`${item.label}-${itemIndex}`} href={item.path}>
              <span
                className={`${mobile ? "text-sm" : "text-xs lg:text-sm"} leading-tight`}
              >
                {item.label}
              </span>
            </FooterLink>
          ))}
        </div>
      ))}
    </div>
  );

  const socialLinks = (center = false) => (
    <div
      className={`flex h-10 items-center gap-5 ${center ? "justify-center" : ""}`}
    >
      {socials.map((social) => (
        <FooterLink key={social.key} href={labels[social.key]}>
          <span aria-label={social.label} className="text-2xl text-white">
            {social.icon}
          </span>
        </FooterLink>
      ))}
    </div>
  );

  const organization = (center = false) => (
    <div
      className={`flex flex-col gap-3 ${center ? "items-center text-center" : "items-start text-left"}`}
    >
      {organizationLogo && (
        <Image
          src={getImagePreviewUrl(organizationLogo)}
          alt={organizationName || "Logo organisasi"}
          width={96}
          height={96}
          className="h-16 w-16 shrink-0 object-contain"
        />
      )}
      <div>
        {organizationName && (
          <p className="text-base font-bold text-white">{organizationName}</p>
        )}
        {organizationSubName && (
          <p className="text-sm text-white">{organizationSubName}</p>
        )}
      </div>
    </div>
  );

  const copyright = (center = false) => (
    <div className={center ? "text-center" : ""}>
      {copyrightTitle && <p className="text-sm text-white">{copyrightTitle}</p>}
      {copyrightSubtitle &&
        (copyrightPath ? (
          <FooterLink href={copyrightPath}>
            <span className="text-sm text-white">{copyrightSubtitle}</span>
          </FooterLink>
        ) : (
          <p className="text-sm text-white">{copyrightSubtitle}</p>
        ))}
    </div>
  );

  return (
    <footer
      data-app-shell={previewMode ? undefined : "footer"}
      className="relative z-[1400] w-full bg-sky-900 text-white"
    >
      <div className="hidden w-full flex-wrap gap-8 px-12 py-8 md:flex 2xl:px-24">
        {hasLeftContent && (
          <div className="min-w-[18rem] grow basis-[24rem]">
            {hasOrganization && organization()}
            {socials.length > 0 && <div className="mt-4">{socialLinks()}</div>}
            {hasCopyright && <div className="mt-3">{copyright()}</div>}
          </div>
        )}
        {columns.length > 0 && navigation()}
      </div>

      <div className="w-full px-6 py-6 md:hidden">
        {hasOrganization && <div className="pb-6">{organization(true)}</div>}
        {columns.length > 0 && navigation(true)}
        {(socials.length > 0 || hasCopyright) && (
          <div className="pt-6">
            {socials.length > 0 && socialLinks(true)}
            {hasCopyright && <div className="mt-3">{copyright(true)}</div>}
          </div>
        )}
      </div>
    </footer>
  );
}
