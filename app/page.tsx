"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import Hero from "./components/Homepage/Hero";
import SectionOrg from "./components/Homepage/SectionOrg";
import SectionNumber from "./components/Homepage/SectionNumber";
import SectionNews from "./components/Homepage/SectionNews";
import SectionGallery from "./components/Homepage/SectionGallery";
import SectionFAQ from "./components/Homepage/SectionFAQ";
import SectionConservation from "./components/Homepage/SectionConservation";
import SpinnerLoading from "./components/SpinnerLoading";

const Loading = () => <SpinnerLoading size="sm" color="black" />;

const SectionAddr = dynamic(() => import("./components/Homepage/SectionAddr"), {
  loading: () => <SpinnerLoading size="sm" color="black" />,
  ssr: false,
});

export default function Page() {
  return (
    <div className="min-h-[70vh] overflow-hidden bg-transparent">
      <Hero />
      <SectionConservation />
      <SectionNumber />
      <SectionGallery />
      <SectionNews />
      <SectionOrg />

      <Suspense fallback={<Loading />}>
        <SectionAddr />
      </Suspense>

      <SectionFAQ />
    </div>
  );
}
