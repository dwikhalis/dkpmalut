"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

const Loading = () => (
  <div className="text-center text-gray-500 py-6">Loading...</div>
);

// Dynamically import components
const Hero = dynamic(() => import("./components/Hero"), {
  loading: () => <Loading />,
});
const SectionOrg = dynamic(() => import("./components/SectionOrg"), {
  loading: () => <Loading />,
});
const SectionNumber = dynamic(() => import("./components/SectionNumber"), {
  loading: () => <Loading />,
});
const SectionNews = dynamic(() => import("./components/SectionNews"), {
  loading: () => <Loading />,
});
const SectionGallery = dynamic(() => import("./components/SectionGallery"), {
  loading: () => <Loading />,
});
const SectionData = dynamic(() => import("./components/SectionData"), {
  loading: () => <Loading />,
});

// 🔥 This one takes time, so disable SSR and wrap in Suspense
const SectionAddr = dynamic(() => import("./components/SectionAddr"), {
  loading: () => <Loading />,
  ssr: false, // important: load only on client
});

export default function Page() {
  return (
    <>
      <Hero />
      <SectionOrg />
      <SectionNumber />
      <SectionNews />
      <SectionGallery />
      <SectionData />

      {/* Only SectionAddr is suspended */}
      <Suspense fallback={<Loading />}>
        <SectionAddr />
      </Suspense>
    </>
  );
}
