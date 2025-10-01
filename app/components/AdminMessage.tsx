"use client";

import React, { useState } from "react";
import ListMassage from "./ListMassage";
import { LeftChevron } from "@/public/icons/iconSets";
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
      <div className={`${showMessage ? "hidden" : "flex"}`}>
        <ListMassage admin={true} sendToParent={handleDataFromChild} />
      </div>

      <div className={`${!showMessage ? "hidden" : "flex"} flex-col`}>
        <div className="flex items-center w-full h-20 rounded-2xl shadow-lg mb-3">
          <div
            onClick={async () => {
              if (selectedItem && selectedItem.status !== "lama") {
                await updateStatus(selectedItem.id, "lama");
              }
              setShowMessage(false);
              setSelectedItem(null);
            }}
            className="flex justify-center items-center w-[5%] h-full cursor-pointer"
          >
            <LeftChevron className="w-5 h-5" />
          </div>
          <div className="flex justify-center items-center frow m-3 w-[20%]">
            <p>{selectedItem?.name}</p>
          </div>
          <div className="flex justify-center items-center frow m-3 grow">
            <p>{selectedItem?.email}</p>
          </div>
          <div className="flex justify-center items-center frow m-3 grow">
            <p>{selectedItem?.phone}</p>
          </div>
          <div className="flex justify-center items-center frow m-3 w-[20%]">
            <p>
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
            </p>
          </div>
        </div>

        <div className="w-full min-h-[60vh] rounded-2xl shadow-lg p-6 mb-10">
          <p>{selectedItem?.message}</p>
        </div>
      </div>
    </div>
  );
}
