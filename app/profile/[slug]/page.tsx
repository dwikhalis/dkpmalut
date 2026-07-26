"use client";

import DashAppCMS from "@/app/components/Dashboard/DashAppCMS";
import DashData from "@/app/components/Dashboard/DashData";
import DashMessage from "@/app/components/Dashboard/DashMessage";
import DashNewsGalleryStaff from "@/app/components/Dashboard/DashNewsGalleryStaff";
import DashSideMenu from "@/app/components/Dashboard/DashSideMenu";
import DashTicketHistory from "@/app/components/Dashboard/DashTicketHistory";
import DashTicketing from "@/app/components/Dashboard/DashTicketing";
import DashUsers from "@/app/components/Dashboard/DashUsers";
import DashActivityLog from "@/app/components/Dashboard/DashActivityLog";
import DashConservationAreas from "@/app/components/Dashboard/DashConservationAreas";
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
        slug === "ticketing" ||
        slug === "app-cms" ||
        slug === "kawasan-konservasi"
          ? "overflow-visible"
          : "overflow-hidden"
      }`}
    >
      <DashSideMenu slug={slug} userRole={role} />
      {slug === "staff" && <DashNewsGalleryStaff type="staff" />}
      {slug === "berita" && <DashNewsGalleryStaff type="news" />}
      {slug === "galeri" && <DashNewsGalleryStaff type="gallery" />}
      {slug === "kawasan-konservasi" && (
        <AuthAdminAccess>
          <DashConservationAreas />
        </AuthAdminAccess>
      )}
      {slug === "pesan" && <DashMessage />}
      {slug === "data" && <DashData />}
      {slug === "pengguna" && <DashUsers />}
      {slug === "app-cms" && <DashAppCMS />}
      {slug === "tickets" && <DashTicketHistory />}
      {slug === "logs" && (
        <AuthAdminAccess>
          <DashActivityLog />
        </AuthAdminAccess>
      )}
      {slug === "ticketing" && (
        <AuthAdminAccess>
          <DashTicketing />
        </AuthAdminAccess>
      )}
    </div>
  );
}
