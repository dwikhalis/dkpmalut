"use client";

import Footer from "../Footer";
import Navbar from "../Navbar";
import {
  CmsPageHeader,
  CmsPageProvider,
  CmsParagraphs,
} from "../CmsPageContent";

const pageNames: Record<string, string> = {
  page_data: "Data",
  page_contact: "Kontak",
  page_regulations: "Peraturan",
  page_privacy: "Kebijakan Privasi",
  page_terms: "Syarat dan Ketentuan",
  page_accessibility: "Aksesibilitas",
};

export default function AppCmsComponentPreview({
  component,
}: {
  component: string;
}) {
  if (component === "navbar") return <Navbar previewMode />;
  if (component === "footer") return <Footer previewMode />;
  if (component.startsWith("page_")) {
    const fallbackTitle = pageNames[component] ?? "Platform Data";
    return (
      <section className="mx-auto min-h-[70vh] max-w-5xl px-6 py-12">
        <CmsPageProvider component={component}>
          <CmsPageHeader
            prefix={component}
            titleFallback={fallbackTitle}
            subtitleFallback="Preview konten App CMS."
          />
          <CmsParagraphs
            target={`${component}_section_1_content`}
            fallback="Konten halaman akan tampil di sini."
            className="mt-8 rounded-2xl bg-white p-6"
          />
        </CmsPageProvider>
      </section>
    );
  }

  return (
    <div className="p-8 text-center text-sm text-slate-600">
      Preview tidak tersedia.
    </div>
  );
}
