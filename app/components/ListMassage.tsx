"use client";

export const revalidate = 0;

import React, { useEffect, useState } from "react";
import { deleteData, getMessage } from "@/lib/supabase/supabaseHelper";
import { supabase } from "@/lib/supabase/supabaseClient";
import { Delete, Switch } from "@/public/icons/iconSets";
import AlertNotif from "./AlertNotif";

type MessageAction = "read" | "unread" | "switch";

interface Prop {
  admin: boolean;
  sendToParent?: (
    sendData: DataTypes,
    action: MessageAction
  ) => void | Promise<void>;
}

interface DataTypes {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
  status?: string;
  created_at?: string;
}

const typeConfig = {
  message: {
    fetch: getMessage,
    table: "message",
    groupKey: "status",
    labels: {
      lama: "Pesan Lama",
      baru: "Pesan Baru",
    },
    titleField: "name",
    subtitleField: "email",
    dateField: "created_at",
  },
} as const;

const getTimeSafe = (v: unknown): number => {
  if (!v) return 0;
  const d = v instanceof Date ? v : new Date(String(v));
  return isNaN(d.getTime()) ? 0 : d.getTime();
};

export default function ListMassage({ admin, sendToParent = () => {} }: Prop) {
  const [data, setData] = useState<DataTypes[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);
  const [confirmAction, setConfirmAction] = useState<[boolean, string]>([
    false,
    "",
  ]);

  const {
    fetch,
    table,
    groupKey,
    labels,
    titleField,
    subtitleField,
    dateField,
  } = typeConfig["message"];

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

  const groupedData = data.reduce(
    (acc, item) => {
      const key = (item[groupKey as keyof DataTypes] as string) ?? "undefined";
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    },
    {} as Record<string, DataTypes[]>
  );

  async function actionConfirmed(confirmation: boolean) {
    const dataId = confirmAction[1];
    if (confirmation) {
      setLoadingAction(true);
      const executed = await deleteData("message", dataId);
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
  if (!data.length) return <p>Belum ada pesan masuk</p>;

  return (
    <div className="flex flex-col md:gap-12 gap-6 w-full">
      {Object.entries(groupedData)
        .sort(([a], [b]) =>
          a.localeCompare(b, undefined, { sensitivity: "base" })
        )
        .map(([key, items]) => (
          <div key={key} className="mb-6">
            {/* Title Desktop */}
            <h4 className="hidden md:block font-bold mb-3 md:mb-3">
              {labels[key as keyof typeof labels] ?? "Tidak Terdata"}
            </h4>

            {/* Title Mobile */}
            <h3 className="block md:hidden font-bold mb-3 md:mb-3">
              {labels[key as keyof typeof labels] ?? "Tidak Terdata"}
            </h3>

            {items
              .sort((a, b) => {
                const tA = getTimeSafe(a[dateField as keyof DataTypes]);
                const tB = getTimeSafe(b[dateField as keyof DataTypes]);
                if (tA !== tB) return tB - tA; // newest first
                // tie-breaker by title to keep order stable
                return (a[titleField] ?? "").localeCompare(
                  b[titleField] ?? "",
                  undefined,
                  {
                    sensitivity: "base",
                  }
                );
              })
              .map((e, idx) => (
                <div
                  className="flex justify-center items-center gap-3"
                  key={idx}
                >
                  <div className="flex w-full justify-between items-center bg-stone-100 rounded-xl shadow-xl px-3 md:px-10 py-3 my-3 cursor-pointer hover:bg-stone-200">
                    {/* //! Desktop */}
                    <div
                      className="flex w-full justify-center items-center"
                      onClick={() => {
                        sendToParent(e, "read");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      <h5 className="hidden md:flex text-sm font-bold break-words w-[30%]">
                        {e[titleField] as string}
                      </h5>

                      {/* === Message Only === */}
                      <h5 className="md:flex hidden text-sm break-words w-[30%]">
                        {(e[dateField as keyof DataTypes] &&
                          new Date(
                            e[dateField as keyof DataTypes] as string
                          ).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                          })) ||
                          ""}
                      </h5>

                      <h5 className="hidden md:flex text-sm break-words w-[30%]">
                        {e[subtitleField] as string}
                      </h5>

                      {/* //! Mobile */}
                      <div className="flex md:hidden flex-col w-full gap-1 px-2">
                        <h6 className="text-sm font-bold break-words">
                          {e[titleField] as string}
                        </h6>

                        <h6 className="flex md:hidden text-sm break-words w-full">
                          {(e[dateField as keyof DataTypes] &&
                            new Date(
                              e[dateField as keyof DataTypes] as string
                            ).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })) ||
                            ""}
                        </h6>

                        <h6 className="text-sm break-words">
                          {e[subtitleField] as string}
                        </h6>
                      </div>
                    </div>

                    {/* Admin Buttons */}
                    {admin && (
                      <div className="flex gap-2">
                        <div
                          className="flex w-7 h-7 lg:w-8 lg:h-8 xl:w-10 xl:h-10 2xl:w-18 2xl:h-18 bg-sky-500 rounded-lg 2xl:rounded-2xl justify-center items-center cursor-pointer"
                          onClick={() => sendToParent(e, "switch")}
                        >
                          <Switch className="size-5 md:size-4 xl:size-6 2xl:size-10 text-white" />
                        </div>
                        <div
                          className="flex w-7 h-7 lg:w-8 lg:h-8 xl:w-10 xl:h-10 2xl:w-18 2xl:h-18 bg-rose-500 rounded-lg 2xl:rounded-2xl justify-center items-center cursor-pointer"
                          onClick={() => setConfirmAction([false, e.id])}
                        >
                          <Delete className="size-5 md:size-4 xl:size-6 2xl:size-10 text-white" />
                        </div>
                      </div>
                    )}
                  </div>
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
