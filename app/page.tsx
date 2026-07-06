"use client";

import { supabase } from "@/lib/supabase/supabaseClient";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";
import Hero from "./components/Hero";
import SectionOrg from "./components/SectionOrg";
import SectionNumber from "./components/SectionNumber";
import SectionNews from "./components/SectionNews";
import SectionGallery from "./components/SectionGallery";
import SpinnerLoading from "./components/SpinnerLoading";

const Loading = () => <SpinnerLoading size="sm" color="black" />;

const SectionAddr = dynamic(() => import("./components/SectionAddr"), {
  loading: () => <SpinnerLoading size="sm" color="black" />,
  ssr: false,
});

export default function Page() {
  const router = useRouter();

  useEffect(() => {
    async function handleSession() {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error("Failed to get session:", error.message);
        return;
      }

      if (data.session) {
        router.push("/");
      }
    }

    handleSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        router.push("/");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  return (
    <div className="min-h-[70vh] overflow-hidden bg-sky-300  md:bg-gradient-to-r md:from-sky-700 md:to-sky-200">
      <Hero />

      {/* Shared background for SectionOrg + SectionNumber */}

      <div className="mx-6 md:mx-12 2xl:mx-24 bg-sky-100 rounded-4xl shadow-2xl mb-12">
        <SectionOrg />
        <SectionNumber />
      </div>

      <SectionNews />
      <SectionGallery />

      <Suspense fallback={<Loading />}>
        <SectionAddr />
      </Suspense>
    </div>
  );
}
