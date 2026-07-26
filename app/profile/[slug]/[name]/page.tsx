"use client";

import DashData from "@/app/components/Dashboard/DashData";
import TableConfigEditor from "@/app/components/Dashboard/TableConfigEditor";
import DashSideMenu from "@/app/components/Dashboard/DashSideMenu";
import SpinnerLoading from "@/app/components/SpinnerLoading";
import { useAuthStore } from "@/app/Stores/authStores";
import { useParams } from "next/navigation";

export default function Page() {
  const { slug, name } = useParams<{ slug: string; name: string }>();

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

  const configType =
    name === "config" && ["staff", "berita", "galeri"].includes(slug)
      ? slug === "berita"
        ? "news"
        : slug === "galeri"
          ? "gallery"
          : "staff"
      : null;

  if (!userId || (slug !== "data" && !configType)) {
    return null;
  }

  return (
    <div className="flex h-full min-w-0 flex-1 items-stretch gap-3 overflow-hidden p-8 lg:px-12">
      <DashSideMenu slug={slug} userRole={role} overlayMode />
      {slug === "data" ? <DashData /> : <TableConfigEditor table={configType!} />}
    </div>
  );
}
