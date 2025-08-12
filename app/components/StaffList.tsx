"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { getStaff } from "@/lib/supabase/getHelper";

interface Prop {
  type: string;
}

export default function StaffList({ type }: Prop) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const staff = await getStaff();
      setData(staff || []);
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) return <p>Loading staff...</p>;
  if (!data.length) return <p>No staff found.</p>;

  if (type === "regular") {
    return (
      <div className="flex flex-col gap-6 w-full">
        <h4>Pemanfaatan Ruang Laut (PRL)</h4>
        {data.map((e, idx: number) => {
          if (e.division === "PRL") {
            return (
              <div
                key={idx}
                className="flex w-full justify-between items-center bg-stone-100 rounded-xl shadow-xl px-6 py-3"
              >
                <div className="w-[30%] flex justify-center items-center">
                  <Image
                    src={e.photo ? e.photo : "/assets/icon_profile_u.png"}
                    width={120}
                    height={120}
                    alt="photo"
                    priority
                  />
                </div>
                <h5 className="w-[30%] text-center">{e.name}</h5>
                <h5 className="w-[30%] text-center">{e.title}</h5>
              </div>
            );
          }
        })}

        <h4>Penangkapan</h4>
        {data.map((e, idx: number) => {
          if (e.division === "Penangkapan") {
            return (
              <div
                key={idx}
                className="flex w-full justify-between items-center bg-stone-100 rounded-xl shadow-xl px-6 py-3"
              >
                <div className="w-[30%] flex justify-center items-center">
                  <Image
                    src={e.photo ? e.photo : "/assets/icon_profile_u.png"}
                    width={120}
                    height={120}
                    alt="photo"
                  />
                </div>
                <h5 className="w-[30%] text-center">{e.name}</h5>
                <h5 className="w-[30%] text-center">{e.title}</h5>
              </div>
            );
          }
        })}

        <h4>Budidaya</h4>
        {data.map((e, idx: number) => {
          if (e.division === "Budidaya") {
            return (
              <div
                key={idx}
                className="flex w-full justify-between items-center bg-stone-100 rounded-xl shadow-xl px-6 py-3"
              >
                <div className="w-[30%] flex justify-center items-center">
                  <Image
                    src={e.photo ? e.photo : "/assets/icon_profile_u.png"}
                    width={120}
                    height={120}
                    alt="photo"
                  />
                </div>
                <h5 className="w-[30%] text-center">{e.name}</h5>
                <h5 className="w-[30%] text-center">{e.title}</h5>
              </div>
            );
          }
        })}

        <h4>Pengawasan Sumber Daya Kelautan dan Perikanan (PSDKP)</h4>
        {data.map((e, idx: number) => {
          if (e.division === "PSDKP") {
            return (
              <div
                key={idx}
                className="flex w-full justify-between items-center bg-stone-100 rounded-xl shadow-xl px-6 py-3"
              >
                <div className="w-[30%] flex justify-center items-center">
                  <Image
                    src={e.photo ? e.photo : "/assets/icon_profile_u.png"}
                    width={120}
                    height={120}
                    alt="photo"
                  />
                </div>
                <h5 className="w-[30%] text-center">{e.name}</h5>
                <h5 className="w-[30%] text-center">{e.title}</h5>
              </div>
            );
          }
        })}
      </div>
    );
  }

  return null;
}
