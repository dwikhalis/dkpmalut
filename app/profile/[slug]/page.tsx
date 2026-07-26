"use client";

import DashAppCMS from "@/app/components/Dashboard/DashAppCMS";
import DashData from "@/app/components/Dashboard/DashData";
import DashMessage from "@/app/components/Dashboard/DashMessage";
import DashSideMenu from "@/app/components/Dashboard/DashSideMenu";
import DashUsers from "@/app/components/Dashboard/DashUsers";
import DashActivityLog from "@/app/components/Dashboard/DashActivityLog";
import AuthAdminAccess from "@/app/Auth/AuthAdminAccess";
import SpinnerLoading from "@/app/components/SpinnerLoading";
import { useAuthStore } from "@/app/Stores/authStores";
import { useParams } from "next/navigation";

export default function Page() {
  const { slug } = useParams<{ slug: string }>();

  const loading = useAuthStore((state) => state.loading);
  const userId = useAuthStore((state) => state.userId);
  const role = useAuthStore((state) => state.role);

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-10">
        <SpinnerLoading size="sm" color="black" />
      </div>
    );
  }

  if (!userId) {
    return null;
  }

  return (
    <div
      className={`flex min-h-[70vh] min-w-0 flex-1 items-stretch gap-3 p-8 lg:px-12 ${
        slug === "app-cms" ? "overflow-visible" : "overflow-hidden"
      }`}
    >
      <DashSideMenu slug={slug} userRole={role} />
      {slug === "pesan" && <DashMessage />}
      {slug === "data" && <DashData />}
      {slug === "pengguna" && <DashUsers />}
      {slug === "app-cms" && <DashAppCMS />}
      {slug === "logs" && (
        <AuthAdminAccess>
          <DashActivityLog />
        </AuthAdminAccess>
      )}
    </div>
  );
}
