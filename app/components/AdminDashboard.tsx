"use client";

import { useEffect, useState } from "react";
import { getNumNewMessage, getNumOf } from "@/lib/supabase/supabaseHelper";
import Link from "next/link";

export default function AdminDashboard() {
  const [numOfStaff, setNumOfStaff] = useState(0);
  const [numOfNews, setNumOfNews] = useState(0);
  const [numOfGallery, setNumOfGallery] = useState(0);
  const [numOfMessage, setNumOfMessage] = useState(0);
  const [numOfDatasets, setNumOfDatasets] = useState(0);
  const [numOfDataMitra, setNumOfDataMitra] = useState(0);

  useEffect(() => {
    let mounted = true;

    const fetchNum = async () => {
      try {
        const [staffs, news, galleries, messages, datasets, dataMitra] =
          await Promise.all([
            getNumOf("staff"),
            getNumOf("news"),
            getNumOf("gallery"),
            getNumNewMessage(),
            getNumOf("datasets"),
            getNumOf("data_mitra"),
          ]);

        if (!mounted) return;
        setNumOfStaff(staffs);
        setNumOfNews(news);
        setNumOfGallery(galleries);
        setNumOfMessage(messages);
        setNumOfDatasets(datasets);
        setNumOfDataMitra(dataMitra);
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
      route: "/profile/organisasi",
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
      label: "Inbox",
      select: "Inbox",
      numof: numOfMessage,
      route: "/profile/inbox",
    },
    {
      label: "Data",
      select: "Data",
      numof: numOfDatasets + numOfDataMitra,
      route: "/profile/data",
    },
  ];

  return (
    <div className="flex justify-center items-start min-h-[90vh] my-10">
      <div className="flex justify-start md:justify-between flex-wrap w-full">
        {blocks.map((e, idx) => (
          <Link
            key={idx}
            href={e.route}
            className="flex grow p-6 m-3 shadow-xl rounded-2xl border-3 border-stone-100 min-w-30 min-h-30 md:min-w-[20vw] md:min-h-[15vw] cursor-pointer"
          >
            <div className="flex flex-col justify-center items-center gap-2 w-full">
              <h3>{e.label}</h3>
              <h1>{e.numof}</h1>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
