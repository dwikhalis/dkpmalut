import type { Metadata } from "next";

import {
  CmsPageHeader,
  CmsPageProvider,
  CmsParagraphs,
  CmsValue,
} from "../components/CmsPageContent";

export const metadata: Metadata = {
  title: "Peraturan | Platform Data DKP Maluku Utara",
  description: "Peraturan dan kebijakan pengelolaan data.",
};

export default function RegulationsPage() {
  return (
    <div className="mx-auto min-h-[70vh] max-w-5xl px-6 py-12 lg:px-10">
      <CmsPageProvider component="page_regulations">
        <CmsPageHeader
          prefix="page_regulations"
          titleFallback="Peraturan"
          subtitleFallback="Dasar hukum, kebijakan, dan tata kelola Platform Data DKP Maluku Utara."
        />
        <section className="mt-8 rounded-2xl border border-sky-100 bg-white p-6 shadow-sm md:p-8">
          <CmsValue
            target="page_regulations_section_1_title"
            fallback="Kebijakan pengelolaan data"
            as="h2"
            className="text-xl font-semibold text-slate-900"
          />
          <CmsParagraphs
            target="page_regulations_section_1_content"
            fallback="Dokumen dan ketentuan pengelolaan data dapat dipublikasikan melalui App CMS."
            className="mt-4 text-slate-600"
          />
        </section>
      </CmsPageProvider>
    </div>
  );
}
