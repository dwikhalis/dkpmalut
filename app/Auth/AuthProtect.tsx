"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/app/Stores/authStores";

export default function AuthProtect({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  // ✅ FIX: Destructure directly to avoid re-creating selector objects
  const { isLoggedIn, loading } = useAuthStore();

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.replace("/404"); // prevent back navigation flicker
    }
  }, [loading, isLoggedIn, router]);

  if (loading) {
    return <div className="p-10 text-center text-lg h-[70vh]">Loading...</div>;
  }

  if (!isLoggedIn) return null;

  return <>{children}</>;
}
