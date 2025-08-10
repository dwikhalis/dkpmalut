"use client";

import { supabase } from "@/lib/supabase/supabaseClient";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";

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
const SectionAddr = dynamic(() => import("./components/SectionAddr"), {
  loading: () => <Loading />,
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
    <>
      <Hero />
      <SectionOrg />
      <SectionNumber />
      <SectionNews />
      <SectionGallery />
      <SectionData />
      <Suspense fallback={<Loading />}>
        <SectionAddr />
      </Suspense>
    </>
  );
}
