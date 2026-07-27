"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import ListMassage from "../ListMassage";
import {
  Email,
  LeftChevron,
  Person,
  Phone,
  Time,
} from "@/public/icons/iconSets";
import AccordionToggleIcon from "../AccordionToggleIcon";
import { getMessage, updateData } from "@/lib/supabase/supabaseHelper";
import AuthAdminAccess from "@/app/Auth/AuthAdminAccess";
import MessageEmailStatus from "../MessageEmailStatus";

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

const MESSAGE_TIME_ZONE = "Asia/Jayapura";

function formatMessageTime(value: string) {
  return `${new Date(value).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: MESSAGE_TIME_ZONE,
  })} WIT`;
}

export default function DashMessage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [selectedItem, setSelectedItem] = useState<DataTypes | null>(null);
  const [showMessage, setShowMessage] = useState(
    searchParams.get("view") === "read",
  );
  const [senderOpen, setSenderOpen] = useState(false);

  function setMessageUrl(nextShowMessage: boolean, messageId?: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (nextShowMessage) {
      params.set("view", "read");

      if (messageId) {
        params.set("id", messageId);
      }
    } else {
      params.delete("view");
      params.delete("id");
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }

  useEffect(() => {
    setShowMessage(searchParams.get("view") === "read");
  }, [searchParams]);

  useEffect(() => {
    const messageId = searchParams.get("id");

    if (searchParams.get("view") !== "read" || !messageId || selectedItem) {
      return;
    }

    let active = true;

    async function loadSelectedMessage() {
      const messages = await getMessage();
      const message = messages.find((item) => item.id === messageId);

      if (active && message) {
        setSelectedItem(message);
      }
    }

    void loadSelectedMessage();

    return () => {
      active = false;
    };
  }, [searchParams, selectedItem]);

  // tiny helper: update just the status column
  const updateStatus = async (id: string, status: "read" | "unread") => {
    await updateData("messages", { status }, id);
  };

  const handleDataFromChild = async (
    childData: DataTypes,
    action: "open" | "unread" | "switch",
  ) => {
    if (action === "open") {
      setSelectedItem(childData);
      setShowMessage(true);
      setMessageUrl(true, childData.id);

      // Mark as read using the fresh childData, not selectedItem.
      if (childData.status !== "read") {
        await updateStatus(childData.id, "read");
        // optional: keep local state in sync while waiting for Supabase realtime
        setSelectedItem((prev) =>
          prev && prev.id === childData.id
            ? { ...prev, status: "read" }
            : prev,
        );
      }
      return;
    }

    if (action === "unread") {
      // Mark as unread directly with childData.
      await updateStatus(childData.id, "unread");
      // optional local sync if this item is currently open
      setSelectedItem((prev) =>
        prev && prev.id === childData.id ? { ...prev, status: "unread" } : prev,
      );
    }

    if (action === "switch") {
      setSelectedItem(childData);

      // Toggle between the two canonical message statuses.
      if (childData.status === "unread") {
        await updateStatus(childData.id, "read");
        // optional: keep local state in sync while waiting for Supabase realtime
        setSelectedItem((prev) =>
          prev && prev.id === childData.id
            ? { ...prev, status: "read" }
            : prev,
        );
      } else if (childData.status === "read") {
        await updateStatus(childData.id, "unread");
        // optional: keep local state in sync while waiting for Supabase realtime
        setSelectedItem((prev) =>
          prev && prev.id === childData.id
            ? { ...prev, status: "unread" }
            : prev,
        );
      }
      return;
    }
  };

  return (
    <AuthAdminAccess>
      <div className="flex w-full flex-col min-h-[90vh]">
        <div className="relative flex items-center mb-6">
          <div
            className={`${
              showMessage ? "flex" : "hidden"
            } absolute left-0 py-6 pr-12 cursor-pointer`}
            onClick={() => {
              setShowMessage(false);
              setSelectedItem(null);
              setMessageUrl(false);
            }}
          >
            <LeftChevron className="size-6" />
          </div>

          <p className="font-bold text-center mx-auto text-lg">
            {showMessage ? "Baca Pesan" : "Pesan"}
          </p>
        </div>

        {/* //! LIST MESSAGE */}
        <div className={`${showMessage ? "hidden" : "flex"}`}>
          <ListMassage admin={true} sendToParent={handleDataFromChild} />
        </div>

        {/* //! READ MESSAGE */}
        <div className={`${!showMessage ? "hidden" : "flex"} flex-col gap-6`}>
          {/* //! Header */}
          <div className="flex flex-col items-center w-full rounded-2xl shadow-lg border border-stone-200 ">
            <div className="flex w-full h-full bg-sky-900 rounded-t-xl justify-center items-center py-1.5 px-3 cursor-pointer">
              <div
                className="flex justify-between items-center grow text-white"
                onClick={() => setSenderOpen(!senderOpen)}
              >
                <div className="flex items-center gap-2">
                  <Person className="size-3" />
                  <h2 className="text-sm">{selectedItem?.name}</h2>
                </div>
                <span>
                  <AccordionToggleIcon open={senderOpen} size="sm" />
                </span>
              </div>
            </div>
            <div
              className={`grid grid-cols-2 p-3 w-full justify-between items-start gap-3 ${senderOpen ? "visible" : "invisible h-0 pointer-events-none overflow-hidden"}`}
            >
              <div>
                <div className="flex gap-2 items-center">
                  <Email className="size-3" />
                  <p className="text-xs">{selectedItem?.email}</p>
                </div>
                {selectedItem?.created_at ? (
                  <div className="flex gap-2 items-center">
                    <Time className="size-3" />
                    <span className="text-xs">
                      {new Date(selectedItem.created_at).toLocaleDateString(
                        "en-GB",
                        {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          timeZone: MESSAGE_TIME_ZONE,
                        },
                      )}
                      {" / "}
                      {formatMessageTime(selectedItem.created_at)}
                    </span>
                    <span className="text-xs"></span>
                  </div>
                ) : null}
                <div className="flex gap-2 items-center">
                  <Phone className="size-3" />
                  <p className="text-xs">{selectedItem?.phone}</p>
                </div>
              </div>
              <details
                className="group relative flex flex-col items-end justify-center h-full"
                onClick={(e) => {
                  e.currentTarget.open = !e.currentTarget.open;
                }}
              >
                <summary
                  className="list-none cursor-pointer [&::-webkit-details-marker]:hidden"
                  onClick={(e) => e.preventDefault()}
                >
                  <MessageEmailStatus
                    status={selectedItem?.email_delivery_status}
                  />
                </summary>

                <div className="absolute right-0 top-full z-20 flex flex-wrap items-center justify-center rounded-xl border border-stone-200 bg-white p-2 text-right shadow-md w-[75%]">
                  {selectedItem?.email_delivery_status === "sent" && (
                    <p className="text-xs text-red-700 break-words">
                      Notifikasi ke email organisasi berhasil.
                    </p>
                  )}
                  {selectedItem?.email_delivery_status === "pending" && (
                    <p className="text-xs text-red-700 break-words">
                      Notifikasi ke email organisasi sedang diproses.
                    </p>
                  )}
                  {selectedItem?.email_delivery_status === "failed" && (
                    <p className="text-xs text-red-700 break-words">
                      Notifikasi ke email organisasi tidak berhasil. Pesan ini
                      tetap tersimpan.
                    </p>
                  )}
                  {selectedItem?.email_delivery_status === "not_attempted" && (
                    <p className="text-xs text-red-700 break-words">
                      Notifikasi ke email organisasi tidak dilakukan.
                    </p>
                  )}
                </div>
              </details>
            </div>
          </div>

          {/* //! Body */}
          <div className="w-full min-h-[60vh] rounded-2xl shadow-lg p-6 mb-10 border border-stone-200">
            <p className="whitespace-pre-wrap leading-relaxed">
              {selectedItem?.message}
            </p>
          </div>
        </div>
      </div>
    </AuthAdminAccess>
  );
}
