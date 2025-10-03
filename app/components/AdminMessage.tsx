"use client";

import React, { useState } from "react";
import ListMassage from "./ListMassage";
import { DownChevron, LeftChevron, UpChevron } from "@/public/icons/iconSets";
import { updateData } from "@/lib/supabase/supabaseHelper";

interface DataTypes {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
  status?: string;
  created_at?: string;
}

export default function AdminMessage() {
  const [selectedItem, setSelectedItem] = useState<DataTypes | null>(null);
  const [showMessage, setShowMessage] = useState(false);
  const [senderOpen, setSenderOpen] = useState(false);

  // tiny helper: update just the status column
  const updateStatus = async (id: string, status: "lama" | "baru") => {
    await updateData("message", { status }, id);
  };

  const handleDataFromChild = async (
    childData: DataTypes,
    action: "read" | "unread" | "switch"
  ) => {
    if (action === "read") {
      setSelectedItem(childData);
      setShowMessage(true);

      // mark as read using the fresh childData, not selectedItem
      if (childData.status !== "lama") {
        await updateStatus(childData.id, "lama");
        // optional: keep local state in sync while waiting for Supabase realtime
        setSelectedItem((prev) =>
          prev && prev.id === childData.id ? { ...prev, status: "lama" } : prev
        );
      }
      return;
    }

    if (action === "unread") {
      // mark as unread directly with childData
      await updateStatus(childData.id, "baru");
      // optional local sync if this item is currently open
      setSelectedItem((prev) =>
        prev && prev.id === childData.id ? { ...prev, status: "baru" } : prev
      );
    }

    if (action === "switch") {
      setSelectedItem(childData);

      // mark as read using the fresh childData, not selectedItem
      if (childData.status === "baru") {
        await updateStatus(childData.id, "lama");
        // optional: keep local state in sync while waiting for Supabase realtime
        setSelectedItem((prev) =>
          prev && prev.id === childData.id ? { ...prev, status: "lama" } : prev
        );
      } else if (childData.status === "lama") {
        await updateStatus(childData.id, "baru");
        // optional: keep local state in sync while waiting for Supabase realtime
        setSelectedItem((prev) =>
          prev && prev.id === childData.id ? { ...prev, status: "lama" } : prev
        );
      }
      return;
    }
  };

  return (
    <div className="mt-12">
      {/* //! LIST MESSAGE */}
      <div className={`${showMessage ? "hidden" : "flex"}`}>
        <ListMassage admin={true} sendToParent={handleDataFromChild} />
      </div>

      {/* //! READ MESSAGE */}
      <div className={`${!showMessage ? "hidden" : "flex"} flex-col`}>
        {/* //! Header */}
        <div className="flex items-center w-full rounded-2xl shadow-lg mb-3 border border-stone-200">
          <div
            onClick={() => {
              setShowMessage(false);
              setSelectedItem(null);
            }}
            className="flex justify-center w-[15%] md:w-[8%] h-full cursor-pointer"
          >
            <LeftChevron className="w-4 h-4 lg:w-5 lg:h-5" />
          </div>
          <div className="w-full">
            <div className="flex w-full h-full justify-center items-center">
              <div
                className="flex justify-start items-center m-0 md:m-3 grow"
                onClick={() => setSenderOpen(!senderOpen)}
              >
                <h5>{selectedItem?.name}</h5>
                <DownChevron
                  className={`${senderOpen ? "hidden" : "block"} w-3 h-3 ml-3`}
                />
                <UpChevron
                  className={`${senderOpen ? "block" : "hidden"} w-3 h-3 ml-3`}
                />
              </div>
              <div className="flex justify-end items-center m-3">
                <h5 className="mr-0 md:mr-6 text-right">
                  {selectedItem?.created_at
                    ? new Date(selectedItem.created_at).toLocaleDateString(
                        "en-GB",
                        {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        }
                      )
                    : null}
                </h5>
              </div>
            </div>
            <div
              className={`${senderOpen ? "flex" : "hidden"} justify-between md:justify-start items-center h-full mx-0 md:mx-3 mb-3 w-full flex-wrap`}
            >
              <h5 className="mr-3">{selectedItem?.email}</h5>
              <h5 className="mx-3">{selectedItem?.phone}</h5>
            </div>
          </div>
        </div>

        {/* //! Body */}
        <div className="w-full min-h-[60vh] rounded-2xl shadow-lg p-6 mb-10 border border-stone-200">
          <h5>{selectedItem?.message}</h5>
        </div>
      </div>
    </div>
  );
}
