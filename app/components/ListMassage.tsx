"use client";

import { useEffect, useState } from "react";
import { deleteData, getMessage } from "@/lib/supabase/supabaseHelper";
import { supabase } from "@/lib/supabase/supabaseClient";
import { Delete, Switch } from "@/public/icons/iconSets";
import AlertNotif from "./AlertNotif";
import SpinnerLoading from "./SpinnerLoading";
import MessageEmailStatus from "./MessageEmailStatus";
import {
  getSessionCache,
  MESSAGE_LIST_CACHE_KEY,
  setSessionCache,
} from "@/lib/utils/sessionCache";

const MESSAGE_CACHE_TTL = 30 * 1000;

type MessageAction = "open" | "unread" | "switch";

interface Prop {
  admin: boolean;
  sendToParent?: (
    sendData: DataTypes,
    action: MessageAction,
  ) => void | Promise<void>;
}

interface DataTypes {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
  status?: string;
  email_delivery_status?: "sent" | "pending" | "failed" | "not_attempted";
  email_sent_at?: string;
  email_delivery_error?: string;
  created_at?: string;
}

const typeConfig = {
  message: {
    fetch: getMessage,
    table: "messages",
    groupKey: "status",
    labels: {
      read: "Pesan Lama",
      unread: "Pesan Baru",
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

const MESSAGE_TIME_ZONE = "Asia/Jayapura";

function formatMessageTime(value: string) {
  return `${new Date(value).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: MESSAGE_TIME_ZONE,
  })} WIT`;
}

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
      const nextData = result || [];
      setData(nextData);
      setSessionCache(MESSAGE_LIST_CACHE_KEY, nextData);
      setLoading(false);
    }

    const cached = getSessionCache<DataTypes[]>(
      MESSAGE_LIST_CACHE_KEY,
      MESSAGE_CACHE_TTL,
    );

    if (cached) {
      setData(cached);
      setLoading(false);
    } else {
      void fetchData();
    }

    const channel = supabase
      .channel(`public:${table}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        fetchData,
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
    {} as Record<string, DataTypes[]>,
  );

  async function handleMessageAction(item: DataTypes, action: MessageAction) {
    const previousStatus = item.status;
    const nextStatus =
      action === "open"
        ? "read"
        : action === "unread"
          ? "unread"
          : item.status === "unread"
            ? "read"
            : "unread";

    setData((current) => {
      const nextData = current.map((message) =>
        message.id === item.id ? { ...message, status: nextStatus } : message,
      );
      setSessionCache(MESSAGE_LIST_CACHE_KEY, nextData);
      return nextData;
    });

    try {
      await sendToParent(item, action);
    } catch (error) {
      setData((current) =>
        current.map((message) =>
          message.id === item.id
            ? { ...message, status: previousStatus }
            : message,
        ),
      );
      console.error("Update status pesan gagal:", error);
    }
  }

  async function actionConfirmed(confirmation: boolean) {
    const dataId = confirmAction[1];
    if (confirmation) {
      setLoadingAction(true);
      const executed = await deleteData("messages", dataId);
      if (executed) {
        setData((current) => {
          const nextData = current.filter((message) => message.id !== dataId);
          setSessionCache(MESSAGE_LIST_CACHE_KEY, nextData);
          return nextData;
        });
        setLoadingAction(false);
        setConfirmAction([true, ""]);
      } else {
        setConfirmAction([false, ""]);
      }
    } else {
      setConfirmAction([false, ""]);
    }
  }

  if (loading) {
    return (
      <div className="flex w-full items-center justify-center rounded-2xl border border-stone-200 bg-white p-4 shadow-md">
        <SpinnerLoading size="sm" color="black" />
      </div>
    );
  }

  if (!data.length) {
    return (
      <p className="w-full rounded-2xl border border-stone-200 bg-white p-4 text-[2.8vw] shadow-md md:text-[1.5vw] lg:text-sm">
        Belum ada pesan masuk
      </p>
    );
  }

  return (
    <>
      {admin && (
        <div className="flex flex-col gap-6 w-full">
          {Object.entries(groupedData)
            .sort(([a], [b]) => {
              const groupOrder: Record<string, number> = {
                unread: 0,
                read: 1,
              };

              return (groupOrder[a] ?? 2) - (groupOrder[b] ?? 2);
            })
            .map(([key, items]) => (
              <div key={key} className="flex flex-col mb-6 gap-3">
                <h2 className="mb-3 text-xl font-bold">
                  {labels[key as keyof typeof labels] ?? "Tidak Terdata"}
                </h2>

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
                      },
                    );
                  })
                  .map((e) => (
                    <div
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white p-3 md:p-6 shadow-xl transition-colors hover:bg-stone-200"
                      key={e.id}
                      onClick={() => {
                        void handleMessageAction(e, "open");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      <div className="relative flex flex-col md:flex-row items-start w-full">
                        {/* //! SENDER NAME */}
                        <span className="min-w-0 break-words text-sm font-bold w-[40%]">
                          {e[titleField] as string}
                        </span>

                        {/* //! SENDER DETAILS */}
                        <span className="flex min-w-0 flex-col items-start gap-1 break-words text-sm md:gap-2 w-[60%]">
                          <span className="min-w-0 break-words text-xs md:text-sm">
                            {e[subtitleField] as string}
                          </span>
                          {e[dateField as keyof DataTypes] && (
                            <>
                              <span className="text-xs md:text-sm">
                                {new Date(
                                  e[dateField as keyof DataTypes] as string,
                                ).toLocaleDateString("en-GB", {
                                  day: "2-digit",
                                  month: "long",
                                  year: "numeric",
                                  timeZone: MESSAGE_TIME_ZONE,
                                })}
                                {" / "}
                                {formatMessageTime(
                                  e[dateField as keyof DataTypes] as string,
                                )}
                              </span>
                            </>
                          )}
                          <MessageEmailStatus
                            status={e.email_delivery_status}
                          />
                        </span>
                      </div>

                      {/* //! ACTION BUTTON */}
                      <div className="flex flex-col md:flex-row shrink-0 gap-2">
                        <button
                          type="button"
                          aria-label="Ubah status pesan"
                          className="flex size-7 items-center justify-center rounded-lg bg-sky-500 transition-colors hover:bg-sky-600 lg:size-8 xl:size-10"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleMessageAction(e, "switch");
                          }}
                        >
                          <Switch className="size-5 text-white md:size-4 xl:size-6" />
                        </button>
                        <button
                          type="button"
                          aria-label="Hapus pesan"
                          className="flex size-7 items-center justify-center rounded-lg bg-rose-500 transition-colors hover:bg-rose-600 lg:size-8 xl:size-10"
                          onClick={(event) => {
                            event.stopPropagation();
                            setConfirmAction([false, e.id]);
                          }}
                        >
                          <Delete className="size-5 text-white md:size-4 xl:size-6" />
                        </button>
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
      )}
    </>
  );
}
