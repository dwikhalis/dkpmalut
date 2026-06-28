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
    <div className="flex">
      <AdminSideMenu slug={slug} />
      <div className="h-full w-full lg:mx-12 mx-8 min-h-[60vh]">
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
