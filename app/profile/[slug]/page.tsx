"use client";

import AdminData from "@/app/components/AdminData";
import AdminMessage from "@/app/components/AdminMessage";
import AdminPages from "@/app/components/AdminPages";
import AdminSideMenu from "@/app/components/AdminSideMenu";
import AdminUsers from "@/app/components/AdminUsers";
import LabelCMS from "@/app/components/LabelCMS";
import { useAuthStore } from "@/app/Stores/authStores";
import { useParams } from "next/navigation";

export default function page() {
  const { slug } = useParams<{ slug: string }>();

  const loading = useAuthStore((state) => state.loading);
  const userId = useAuthStore((state) => state.userId);
  const role = useAuthStore((state) => state.role);

  if (loading) {
    return <div className="p-10 text-center">Loading...</div>;
  }

  if (!userId) {
    return null;
  }

  return (
    <div className="flex min-w-0">
      <AdminSideMenu slug={slug} userRole={role} />
      <div className="flex h-full min-h-[70vh] min-w-0 flex-1 overflow-hidden p-8 lg:px-12">
        {slug === "organisasi" && <AdminPages type="staff" />}
        {slug === "berita" && <AdminPages type="news" />}
        {slug === "galeri" && <AdminPages type="gallery" />}
        {slug === "pesan" && <AdminMessage />}
        {slug === "data" && <AdminData />}
        {slug === "pengguna" && <AdminUsers />}
        {slug === "label-cms" && <LabelCMS />}
      </div>
    </div>
  );
}
