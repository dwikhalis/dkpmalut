"use client";

import { useEffect, useState } from "react";
import { getNumOf, getNumUnreadMessages } from "@/lib/supabase/supabaseHelper";
import Link from "next/link";
import { getSessionCache, setSessionCache } from "@/lib/utils/sessionCache";

const DASHBOARD_STATS_CACHE_KEY = "dashboard-stats";
const DASHBOARD_STATS_TTL = 60 * 1000;

export default function DashStats() {
  const [numOfMessage, setNumOfMessage] = useState(0);
  const [numOfDataset, setNumOfDataset] = useState(0);
  const [numOfUser, setNumOfUser] = useState(0);

  useEffect(() => {
    let mounted = true;
    const cached = getSessionCache<{
      messages: number;
      datasets: number;
      users: number;
    }>(DASHBOARD_STATS_CACHE_KEY, DASHBOARD_STATS_TTL);

    if (cached) {
      setNumOfMessage(cached.messages);
      setNumOfDataset(cached.datasets);
      setNumOfUser(cached.users);
      return () => {
        mounted = false;
      };
    }

    const fetchNum = async () => {
      try {
        const [messages, datasetCount, users] = await Promise.all([
          getNumUnreadMessages(),
          getNumOf("datasets"),
          getNumOf("users"),
        ]);

        if (!mounted) return;
        setNumOfMessage(messages);
        setNumOfDataset(datasetCount);
        setNumOfUser(users);
        setSessionCache(DASHBOARD_STATS_CACHE_KEY, {
          messages,
          datasets: datasetCount,
          users,
        });
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
    </div>
  );
}
