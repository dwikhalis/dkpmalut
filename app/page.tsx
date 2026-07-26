"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import Hero from "./components/Homepage/Hero";
import SectionNumber from "./components/Homepage/SectionNumber";
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
      <SectionNumber />

      <Suspense fallback={<Loading />}>
        <SectionAddr />
      </Suspense>
    </div>
  );
}
