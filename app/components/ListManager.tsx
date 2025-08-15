"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import {
  deleteData,
  getGallery,
  getNews,
  getStaff,
} from "@/lib/supabase/supabaseHelper";
import { supabase } from "@/lib/supabase/supabaseClient";
import { Delete, Edit } from "@/public/icons/iconSets";
import AlertNotif from "./AlertNotif";

interface Prop {
  admin: boolean;
  type: "staff" | "news" | "gallery";
  sendToParent?: (sendData: DataTypes) => void;
}

interface DataTypes {
  id: string;
  name?: string;
  image?: string;
  photo?: string;
  title?: string;
  division?: string;
  gender?: string;
  tag?: string;
  date?: string;
  content?: string;
  source?: string;
  description?: string;
}

const typeConfig = {
  staff: {
    fetch: getStaff,
    table: "staff",
    groupKey: "division",
    labels: {
      PRL: "Bidang Pemanfaatan Ruang Laut (PRL)",
      Budidaya: "Bidang Budidaya",
      Penangkapan: "Bidang Penangkapan",
      PSDKP: "Bidang Pengawasan Sumber Daya Kelautan dan Perikanan (PSDKP)",
    },
    titleField: "name",
    subtitleField: "title",
  },
  news: {
    fetch: getNews,
    table: "news",
    groupKey: "tag",
    labels: {
      Artikel: "Artikel",
      Berita: "Berita",
      Peraturan: "Peraturan",
    },
    titleField: "title",
    subtitleField: "date",
  },
  gallery: {
    fetch: getGallery,
    table: "gallery",
    groupKey: "tag",
    labels: {
      Alam: "Keindahan Alam Maluku Utara",
      Kegiatan: "Kegiatan DKP Maluku Utara",
      Lainnya: "Lainnya",
    },
    titleField: "title",
    subtitleField: "date",
  },
} as const;

export default function ListData({
  admin,
  type,
  sendToParent = () => {},
}: Prop) {
  const [data, setData] = useState<DataTypes[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);
  const [confirmAction, setConfirmAction] = useState<[boolean, string]>([
    false,
    "",
  ]);

  const { fetch, table, groupKey, labels, titleField, subtitleField } =
    typeConfig[type];

  useEffect(() => {
    async function fetchData() {
      const result = await fetch();
      setData(result || []);
      setLoading(false);
    }

    fetchData();

    const channel = supabase
      .channel(`public:${table}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        fetchData
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [fetch, table]);

  async function actionConfirmed(confirmation: boolean) {
    const dataId = confirmAction[1];
    if (confirmation) {
      setLoadingAction(true);
      const executed = await deleteData(type, dataId);
      if (executed) {
        setLoadingAction(false);
        setConfirmAction([true, ""]);
      } else {
        setConfirmAction([false, ""]);
      }
    } else {
      setConfirmAction([false, ""]);
    }
  }

  if (loading) return <p>Loading...</p>;
  if (!data.length) return <p>Belum ada data terdaftar</p>;

  const groupedData = data.reduce((acc, item) => {
    const key = (item[groupKey as keyof DataTypes] as string) ?? "undefined";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, DataTypes[]>);

  return (
    <div className="flex flex-col md:gap-12 gap-6 w-full">
      {Object.entries(groupedData)
        .sort(([a], [b]) =>
          a.localeCompare(b, undefined, { sensitivity: "base" })
        )
        .map(([key, items]) => (
          <div key={key}>
            <h4 className="font-bold mb-6 md:mb-12">
              {labels[key as keyof typeof labels] ?? "Tidak Terdata"}
            </h4>

            {items
              .sort((a, b) =>
                (a[titleField] ?? "").localeCompare(
                  b[titleField] ?? "",
                  undefined,
                  {
                    sensitivity: "base",
                  }
                )
              )
              .map((e, idx) => (
                <div
                  key={idx}
                  className="flex w-full justify-between items-center bg-stone-100 rounded-xl shadow-xl px-3 md:px-10 py-3 my-6"
                >
                  <div className="md:w-[30%] w-[20%] flex items-center justify-center md:justify-start">
                    <Image
                      src={e.photo || e.image || "/assets/icon_profile_u.png"}
                      width={120}
                      height={120}
                      alt="photo"
                      className="object-contain h-12 w-12 md:h-30 md:w-30"
                    />
                  </div>

                  {/* Desktop */}
                  <h5 className="hidden md:flex text-sm font-bold break-words w-[30%]">
                    {e[titleField] as string}
                  </h5>
                  <h5 className="hidden md:flex text-sm break-words w-[30%]">
                    {subtitleField === "date" && e.date
                      ? new Date(e.date).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : (e[subtitleField] as string)}
                  </h5>

                  {/* Mobile */}
                  <div className="flex md:hidden flex-col w-[60%] gap-1 px-2">
                    <h6 className="text-sm font-bold break-words">
                      {e[titleField] as string}
                    </h6>
                    <h6 className="text-sm break-words">
                      {subtitleField === "date" && e.date
                        ? new Date(e.date).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })
                        : (e[subtitleField] as string)}
                    </h6>
                  </div>

                  {/* Admin Buttons */}
                  {admin && (
                    <div className="flex gap-2">
                      <div
                        className="flex w-8 h-8 bg-sky-500 rounded-lg justify-center items-center cursor-pointer"
                        onClick={() => sendToParent(e)}
                      >
                        <Edit className="size-6 text-white" />
                      </div>
                      <div
                        className="flex w-8 h-8 bg-rose-500 rounded-lg justify-center items-center cursor-pointer"
                        onClick={() => setConfirmAction([false, e.id])}
                      >
                        <Delete className="size-6 text-white" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
          </div>
        ))}

      {/* Confirm Delete */}
      {confirmAction[1] && (
        <AlertNotif
          type="double"
          yesText="Ya"
          noText="Tidak"
          msg="Hapus data ini?"
          icon="warning"
          loading={loadingAction}
          confirm={actionConfirmed}
        />
      )}

      {/* Delete Success */}
      {confirmAction[0] && (
        <AlertNotif
          type="single"
          yesText="Ok"
          msg="Data telah dihapus"
          icon="success"
          confirm={(res) => res && setConfirmAction([false, ""])}
        />
      )}
    </div>
  );
}
