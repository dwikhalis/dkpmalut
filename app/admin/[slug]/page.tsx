"use client";

import AdminData from "@/app/components/AdminData";
import AdminMessage from "@/app/components/AdminMessage";
import AdminMitra from "@/app/components/AdminMitra";
import AdminPages from "@/app/components/AdminPages";
import AdminSideMenu from "@/app/components/AdminSideMenu";
import { useParams } from "next/navigation";

export default function page() {
  const { slug } = useParams<{ slug: string }>();

  console.log(slug);

  return (
    <div className="flex min-w-0">
      <AdminSideMenu slug={slug} />
      <div className="flex h-full min-h-[70vh] min-w-0 flex-1 overflow-hidden px-8 lg:px-12">
        {slug === "organisasi" ? <AdminPages type="staff" /> : null}
        {slug === "berita" ? <AdminPages type="news" /> : null}
        {slug === "galeri" ? <AdminPages type="gallery" /> : null}
        {slug === "inbox" ? <AdminMessage /> : null}
        {slug === "data" ? <AdminData /> : null}
        {slug === "mitra" ? <AdminMitra /> : null}
      </div>
    </div>
  );
}
