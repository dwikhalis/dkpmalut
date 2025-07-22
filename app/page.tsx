"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

const Loading = () => (
  <div className="text-center text-gray-500 py-6">Loading...</div>
);

// Dynamically import components
const Navbar = dynamic(() => import("./components/Navbar"), {
  loading: () => <Loading />,
});
const Hero = dynamic(() => import("./components/Hero"), {
  loading: () => <Loading />,
});
const SectionOne = dynamic(() => import("./components/SectionOne"), {
  loading: () => <Loading />,
});
const SectionTwo = dynamic(() => import("./components/SectionTwo"), {
  loading: () => <Loading />,
});
const SectionThree = dynamic(() => import("./components/SectionThree"), {
  loading: () => <Loading />,
});
const SectionFour = dynamic(() => import("./components/SectionFour"), {
  loading: () => <Loading />,
});
const SectionFive = dynamic(() => import("./components/SectionFive"), {
  loading: () => <Loading />,
});

// 🔥 This one takes time, so disable SSR and wrap in Suspense
const SectionSix = dynamic(() => import("./components/SectionSix"), {
  loading: () => <Loading />,
  ssr: false, // important: load only on client
});

const Footer = dynamic(() => import("./components/Footer"), {
  loading: () => <Loading />,
});

export default function Page() {
  return (
    <>
      <Navbar />
      <Hero />
      <SectionOne />
      <SectionTwo />
      <SectionThree />
      <SectionFour />
      <SectionFive />

      {/* Only SectionSix is suspended */}
      <Suspense fallback={<Loading />}>
        <SectionSix />
      </Suspense>

      <Footer />
    </>
  );
}
