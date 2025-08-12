"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { getStaff } from "@/lib/supabase/getHelper";
import { supabase } from "@/lib/supabase/supabaseClient";

interface Prop {
  type: string;
  sendToParent: (staff: Staff) => void;
}

interface Staff {
  id: string;
  name: string;
  photo: string;
  title: string;
  division: string;
  gender: string;
}

export default function StaffList({ type, sendToParent }: Prop) {
  const [data, setData] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);

  const prl = "Pemanfaatan Ruang Laut (PRL)";
  const budidaya = "Budidaya";
  const penangkapan = "Penangkapan";
  const psdkp = "Pengawasan Sumber Daya Kelautan dan Perikanan (PSDKP)";

  useEffect(() => {
    async function fetchData() {
      const staff = await getStaff();
      setData(staff || []);
      setLoading(false);
    }

    fetchData();

    const channel = supabase
      .channel("public:staff")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "staff" },
        (payload) => {
          console.log("Realtime update received:", payload);
          fetchData();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  if (loading) return <p>Loading...</p>;
  if (!data.length) return <p>Belum ada data staff terdaftar</p>;

  //! CREATING GROUP DATA
  //! .reduce() is an array method that iterates over every item in an array (data in this case).
  //! It takes a callback function and an initial value ({} here).
  //! It accumulates a single value (here an object) by processing each element of the array one by one.
  //! acc — short for "accumulator", it's the object we build up as we go through each item.
  //! item — the current element from data being processed.
  const groupedData = data.reduce((acc, item) => {
    if (!acc[item.division]) acc[item.division] = [];
    acc[item.division].push(item);
    return acc;
  }, {} as Record<string, (typeof data)[0][]>);

  if (type === "regular") {
    return (
      <div className="flex flex-col gap-6 w-full">
        {Object.entries(groupedData).map(([key, items]) => {
          return (
            <div key={key}>
              <h4>
                {key === "PRL"
                  ? prl
                  : key === "Budidaya"
                  ? budidaya
                  : key === "Penangkapan"
                  ? penangkapan
                  : key === "PSDKP"
                  ? psdkp
                  : "Tidak Terdata"}
              </h4>
              {items.map((e, idx) => {
                return (
                  <div
                    key={idx}
                    className="flex w-full justify-between items-center bg-stone-100 rounded-xl shadow-xl px-3 py-3 my-6"
                  >
                    <div className="w-[20%] flex justify-center items-center">
                      <Image
                        src={e.photo ? e.photo : "/assets/icon_profile_u.png"}
                        width={120}
                        height={120}
                        alt="photo"
                        className="object-contain h-12 w-12 md:h-30 md:w-30"
                      />
                    </div>
                    <div className="flex flex-col w-[60%] gap-1">
                      <h4 className="text-center text-sm font-bold break-words">
                        {e.name}
                      </h4>
                      <h4 className="text-center md:text-md text-sm break-words">
                        {e.title}
                      </h4>
                    </div>
                    <div className="flex gap-2 justify-between">
                      <div
                        className="w-8 h-8 bg-sky-500 rounded-lg"
                        onClick={() =>
                          sendToParent({
                            id: e.id,
                            name: e.name,
                            title: e.title,
                            division: e.division,
                            photo: e.photo,
                            gender: e.gender,
                          })
                        }
                      >
                        E
                      </div>
                      <div className="w-8 h-8 bg-rose-500 rounded-lg">D</div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  }

  return null;
}
