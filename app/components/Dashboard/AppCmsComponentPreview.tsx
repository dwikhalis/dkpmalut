"use client";

import { useEffect, useState } from "react";
import Footer from "../Footer";
import Navbar from "../Navbar";
import Hero from "../Homepage/Hero";
import SectionAddr from "../Homepage/SectionAddr";
import SectionNumber from "../Homepage/SectionNumber";
import { getAppComponentConfig } from "@/lib/supabase/supabaseHelper";

function PageComponentPreview({ component }: { component: string }) {
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});

  useEffect(() => {
    void getAppComponentConfig(component).then((config) => {
      setLabels(config.values);
      setVisibility(config.visibility);
    });
  }, [component]);

  const titleTarget = `${component}_title`;
  const subtitleTarget = `${component}_subtitle`;
  const title = labels[titleTarget] || "Judul halaman";
  const subtitle = labels[subtitleTarget] || "Subjudul halaman";

  return (
    <section className="min-h-[70vh] px-8 py-8 lg:px-12 lg:py-12 2xl:px-24 2xl:py-24">
      <div className="flex flex-col gap-3">
        {visibility[titleTarget] !== false && <h1>{title}</h1>}
        {visibility[subtitleTarget] !== false && (
          <p className="text-lg leading-relaxed md:text-xl">{subtitle}</p>
        )}
      </div>
    </section>
  );
}

export default function AppCmsComponentPreview({
  component,
}: {
  component: string;
}) {
  if (component === "navbar") return <Navbar previewMode />;
  if (component === "hero") return <Hero />;
  if (component === "sectwo") {
    return (
      <div className="bg-sky-100">
        <SectionNumber />
      </div>
    );
  }
  if (component === "secfive") return <SectionAddr previewMode />;
  if (component === "footer") return <Footer previewMode />;
  if (component.startsWith("page_")) {
    return <PageComponentPreview component={component} />;
  }

  return (
    <div className="p-8 text-center text-sm text-slate-600">
      Preview belum tersedia untuk component &quot;{component}&quot;.
    </div>
  );
}
