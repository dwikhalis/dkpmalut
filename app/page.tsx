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

// ! DEPRECATED
// import SectionData from "./components/SectionData";

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

      // ✅ If redirected after email confirmation, user will have a session here
      if (data.session) {
        router.push("/");
      }
    }

    handleSession();

    // Listen for any auth changes (login after confirmation, etc.)
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
    <div className="min-h-[70vh]">
      <Hero />
      <SectionOrg />
      <SectionNumber />
      <SectionNews />
      <SectionGallery />
      <Suspense fallback={<Loading />}>
        <SectionAddr />
      </Suspense>
    </div>
  );
}
