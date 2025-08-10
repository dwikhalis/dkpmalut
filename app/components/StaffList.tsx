"use client";

import React from "react";
import Image from "next/image";

interface DataItem {
  id: string;
  name: string;
  title: string;
  division: string;
  photo: string;
}

interface Props {
  type: string;
  data: DataItem[] | null;
  loading?: boolean; // optional flag
}

export default function StaffList({ type, data, loading }: Props) {
  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <p>Loading...</p>
      </div>
    );
  }

  if (!data || data.length === 0) return null;

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
