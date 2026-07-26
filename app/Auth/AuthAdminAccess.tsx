"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/app/Stores/authStores";
import SpinnerLoading from "../components/SpinnerLoading";

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
    return (
      <div className="flex h-[70vh] items-center justify-center p-10">
        <SpinnerLoading size="sm" color="black" />
      </div>
    );
  }

  if (role !== "admin") return null;

  return <>{children}</>;
}
