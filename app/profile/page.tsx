"use client";

import { useEffect } from "react";
import AdminDashboard from "../components/AdminDashboard";
import AdminSideMenu from "../components/AdminSideMenu";
import { useAuthStore } from "@/app/Stores/authStores";
import ProfileAccount from "../components/ProfileAccount";
import { useRouter } from "next/navigation";
import AuthAdminAccess from "../Auth/AuthAdminAccess";

export default function Page() {
  const router = useRouter();

  const loading = useAuthStore((state) => state.loading);
  const userId = useAuthStore((state) => state.userId);
  const role = useAuthStore((state) => state.role);

  useEffect(() => {
    if (!loading && role === "user") {
      router.replace("/404");
    }
  }, [loading, role, router]);

  if (loading) {
    return <div className="p-10 text-center">Loading...</div>;
  }

  if (!userId) {
    return null;
  }

  //! Prevent role="user" from seeing this page while redirecting
  if (role === "user") {
    return null;
  }

  //! Optional safety guard
  if (role !== "admin" && role !== "partner") {
    return null;
  }

  return (
    <div className="flex">
      <AdminSideMenu slug="home" userRole={role} />

      <div className="flex h-full w-full lg:mx-12 mx-8 min-h-[70vh]">
        {role === "admin" && (
          <AuthAdminAccess>
            <AdminDashboard />
          </AuthAdminAccess>
        )}
        {role === "partner" && <ProfileAccount />}
      </div>
    </div>
  );
}
