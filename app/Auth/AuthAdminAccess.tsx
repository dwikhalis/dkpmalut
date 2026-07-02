"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/app/Stores/authStores";

export default function AuthAdminAccess({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const role = useAuthStore((state) => state.role);
  const loading = useAuthStore((state) => state.loading);

  useEffect(() => {
    if (!loading && role !== "admin") {
      router.replace("/404");
    }
  }, [loading, role, router]);

  if (loading) {
    return <div className="p-10 text-center text-lg h-[70vh]">Loading...</div>;
  }

  if (role !== "admin") return null;

  return <>{children}</>;
}
