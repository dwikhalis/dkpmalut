"use client";

import DashData from "@/app/components/Dashboard/DashData";
import DashSideMenu from "@/app/components/Dashboard/DashSideMenu";
import SpinnerLoading from "@/app/components/SpinnerLoading";
import { useAuthStore } from "@/app/Stores/authStores";
import { useParams } from "next/navigation";

export default function Page() {
  const { slug } = useParams<{ slug: string; name: string }>();

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

  if (!userId || slug !== "data") {
    return null;
  }

  return (
    <div className="flex h-full min-w-0 flex-1 items-stretch gap-3 overflow-hidden p-8 lg:px-12">
      <DashSideMenu slug={slug} userRole={role} overlayMode />
      <DashData />
    </div>
  );
}
