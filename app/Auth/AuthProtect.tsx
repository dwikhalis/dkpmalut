"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/app/Stores/authStores";
import SpinnerLoading from "../components/SpinnerLoading";

export default function AuthProtect({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const loading = useAuthStore((state) => state.loading);

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.replace("/404");
    }
  }, [loading, isLoggedIn, router]);

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center p-10">
        <SpinnerLoading size="sm" color="black" />
      </div>
    );
  }

  if (!isLoggedIn) return null;

  return <>{children}</>;
}
