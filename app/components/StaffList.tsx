"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { getStaff } from "@/lib/supabase/getHelper";
import { supabase } from "@/lib/supabase/supabaseClient";

interface Prop {
  admin: boolean;
  sendToParent?: (staff: Staff) => void;
}

interface Staff {
  id: string;
  name: string;
  photo: string;
  title: string;
  division: string;
  gender: string;
}

//! sendToParent = () => {}, using empty function
//! to tell typescript that it is a default no-op function
//! If you don't wanna send data to parent from this component
//! just use the same empty function as value

export default function StaffList({ admin, sendToParent = () => {} }: Prop) {
  const adminStatus = admin;

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
        () => {
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

  return (
    <div className="flex flex-col gap-6 w-full">
      {Object.entries(groupedData).map(([key, items]) => {
        return (
          <div key={key}>
            <h4 className="font-bold">
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
                  className="flex w-full justify-between items-center bg-stone-100 rounded-xl shadow-xl px-3 md:px-10 py-3 my-6"
                >
                  <div className="w-[30%] flex items-center">
                    <Image
                      src={e.photo ? e.photo : "/assets/icon_profile_u.png"}
                      width={120}
                      height={120}
                      alt="photo"
                      className="object-contain h-12 w-12 md:h-30 md:w-30"
                    />
                  </div>

                  {/* For Desktop */}

                  <h4 className="hidden md:flex text-sm font-bold break-words w-[30%] ">
                    {e.name}
                  </h4>
                  <h4 className="hidden md:flex text-sm break-words w-[30%] ">
                    {e.title}
                  </h4>

                  {/* For Mobile */}
                  <div className="flex md:hidden flex-col w-[60%] gap-1">
                    <h4 className="text-sm font-bold break-words">{e.name}</h4>
                    <h4 className="md:text-md text-sm break-words">
                      {e.title}
                    </h4>
                  </div>

                  {/* //! ADMIN EDIT BUTTON */}
                  <div
                    className={`${
                      adminStatus ? "flex" : "hidden"
                    } gap-2 justify-between`}
                  >
                    <div
                      className="flex w-8 h-8 bg-sky-500 rounded-lg justify-center items-center"
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

                    {/* //! ADMIN DELETE BUTTON */}
                    <div className="flex w-8 h-8 bg-rose-500 rounded-lg justify-center items-center">
                      D
                    </div>
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
