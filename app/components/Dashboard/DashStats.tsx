"use client";

import { useEffect, useState } from "react";
import { getNumNewMessage, getNumOf } from "@/lib/supabase/supabaseHelper";
import Link from "next/link";

export default function DashStats() {
  const [numOfStaff, setNumOfStaff] = useState(0);
  const [numOfNews, setNumOfNews] = useState(0);
  const [numOfGallery, setNumOfGallery] = useState(0);
  const [numOfMessage, setNumOfMessage] = useState(0);
  const [numOfDataset, setNumOfDataset] = useState(0);
  const [numOfUser, setNumOfUser] = useState(0);

  useEffect(() => {
    let mounted = true;

    const fetchNum = async () => {
      try {
        const [staffs, news, galleries, messages, datasetCount, users] =
          await Promise.all([
            getNumOf("staff"),
            getNumOf("news"),
            getNumOf("gallery"),
            getNumNewMessage(),
            getNumOf("datasets"),
            getNumOf("users"),
          ]);

        if (!mounted) return;
        setNumOfStaff(staffs);
        setNumOfNews(news);
        setNumOfGallery(galleries);
        setNumOfMessage(messages);
        setNumOfDataset(datasetCount);
        setNumOfUser(users);
      } catch (err) {
        console.error("Error fetching numOf data:", err);
      }
    };

    fetchNum();
    return () => {
      mounted = false;
    };
  }, []);

  const blocks = [
    {
      label: "Staff",
      select: "Organisasi",
      numof: numOfStaff,
      route: "/profile/staff",
    },
    {
      label: "Berita",
      select: "Berita",
      numof: numOfNews,
      route: "/profile/berita",
    },
    {
      label: "Galeri",
      select: "Galeri",
      numof: numOfGallery,
      route: "/profile/galeri",
    },
    {
      label: "Pesan",
      select: "Pesan",
      numof: numOfMessage,
      route: "/profile/pesan",
    },
    {
      label: "Data",
      select: "Data",
      numof: numOfDataset,
      route: "/profile/data",
    },
    {
      label: "Pengguna",
      select: "Pengguna",
      numof: numOfUser,
      route: "/profile/pengguna",
    },
  ];

  return (
    <div className="my-10 flex min-h-[90vh] w-full flex-wrap content-start items-start justify-start gap-3 md:justify-between">
      <h1 className="sr-only">Dashboard</h1>
      {blocks.map((e, idx) => (
        <Link
          key={idx}
          href={e.route}
          className="flex min-h-30 min-w-30 grow cursor-pointer rounded-2xl border-3 border-stone-100 p-6 shadow-xl md:min-h-[15vw] md:min-w-[20vw] md:max-w-[30%]"
        >
          <div className="flex w-full flex-col items-center justify-center gap-2">
            <h2 className="text-center text-lg md:text-xl">{e.label}</h2>
            <p className="text-3xl font-semibold md:text-4xl">{e.numof}</p>
          </div>
        </Link>
      ))}

      {/* //! CMS */}
      <Link
        href={"/profile/app-cms"}
        className="flex min-h-30 min-w-30 grow cursor-pointer rounded-2xl border-3 border-stone-100 p-6 shadow-xl md:min-h-[15vw] md:min-w-[20vw]"
      >
        <div className="flex flex-col justify-center items-center gap-2 w-full">
          <h2 className="text-center text-2xl md:text-3xl">App CMS</h2>
          <p className="text-center text-base md:text-lg">
            Ubah label / elemen aplikasi
          </p>
        </div>
      </Link>

      {/* //! TICKET QR SCANNER */}
      <Link
        href={"/admin/tickets/scanner"}
        className="flex min-h-30 min-w-30 grow cursor-pointer rounded-2xl border-3 border-stone-100 p-6 shadow-xl md:min-h-[15vw] md:min-w-[20vw]"
      >
        <div className="flex flex-col justify-center items-center gap-2 w-full">
          <h2 className="text-center text-2xl md:text-3xl">Ticket Scanner</h2>
          <p className="text-center text-base md:text-lg">
            Scan QR Code Ticket Pengunjung
          </p>
        </div>
      </Link>
    </div>
  );
}
