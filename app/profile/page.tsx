"use client";

import { useEffect } from "react";
import DashStats from "../components/Dashboard/DashStats";
import DashSideMenu from "../components/Dashboard/DashSideMenu";
import { useAuthStore } from "@/app/Stores/authStores";
import DashProfile from "../components/Dashboard/DashProfile";
import { useRouter } from "next/navigation";
import AuthAdminAccess from "../Auth/AuthAdminAccess";
import SpinnerLoading from "../components/SpinnerLoading";
import { isPartnerRole } from "@/lib/utils/roles";

export default function Page() {
  const router = useRouter();

  const loading = useAuthStore((state) => state.loading);
  const userId = useAuthStore((state) => state.userId);
  const role = useAuthStore((state) => state.role);

  useEffect(() => {
    if (!loading && role === null) {
      router.replace("/404");
    }
  }, [loading, role, router]);

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-10">
        <SpinnerLoading size="sm" color="black" />
      </div>
    );
  }

  return (
    <div className="flex">
      <DashSideMenu slug="home" userRole={role} />

      <div className="flex h-full w-full lg:mx-12 mx-8 min-h-[70vh]">
        {role === "admin" && (
          <AuthAdminAccess>
            <DashStats />
          </AuthAdminAccess>
        )}
        {isPartnerRole(role) && <DashProfile />}
        {role === "user" && <DashProfile />}
      </div>
    </div>
  );
}
