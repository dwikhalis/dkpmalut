"use client";

import { useEffect, useState } from "react";
import { getNumNewMessage, getNumOf } from "@/lib/supabase/supabaseHelper";

interface Props {
  select?: (option: string) => void;
}

export default function AdminDashboard({ select = () => {} }: Props) {
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

  return (
    <div className="flex justify-center items-center min-h-[90vh] mx-8">
      <div className="flex justify-between gap-6 flex-wrap w-full">
        <div
          className="flex p-6 shadow-2xl rounded-2xl border-3 border-stone-100 w-[20%] cursor-pointer"
          onClick={() => {
            select("Organisasi");
          }}
        >
          <div className="flex flex-col justify-center items-center gap-2 w-full">
            <h3>Staff</h3>
            <h1>{numOfStaff}</h1>
          </div>
        </div>
        <div
          className="flex p-6 shadow-2xl rounded-2xl border-3 border-stone-100 w-[20%] cursor-pointer"
          onClick={() => {
            select("Berita");
          }}
        >
          <div className="flex flex-col justify-center items-center gap-2 w-full">
            <h3>Berita</h3>
            <h1>{numOfNews}</h1>
          </div>
        </div>
        <div
          className="flex p-6 shadow-2xl rounded-2xl border-3 border-stone-100 w-[20%] cursor-pointer"
          onClick={() => {
            select("Galeri");
          }}
        >
          <div className="flex flex-col justify-center items-center gap-2 w-full">
            <h3>Galeri</h3>
            <h1>{numOfGallery}</h1>
          </div>
        </div>
        <div
          className="flex p-6 shadow-2xl rounded-2xl border-3 border-stone-100 w-[20%] cursor-pointer"
          onClick={() => {
            select("Inbox");
          }}
        >
          <div className="flex flex-col justify-center items-center gap-2 w-full">
            <h3>Inbox</h3>
            <h1>{numOfMessage}</h1>
          </div>
        </div>
        <div
          className="flex p-6 shadow-2xl rounded-2xl border-3 border-stone-100 w-[20%] cursor-pointer"
          onClick={() => {
            select("Data");
          }}
        >
          <div className="flex flex-col justify-center items-center gap-2 w-full">
            <h3>Data</h3>
            <h1>{numOfDatasets + numOfDataMitra}</h1>
          </div>
        </div>
      </div>
    </div>
  );
}
