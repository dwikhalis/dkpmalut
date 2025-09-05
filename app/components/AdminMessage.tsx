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
    action: "read" | "unread"
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
  };

  return (
    <div className="mt-12">
      <div className={`${showMessage ? "hidden" : "flex"}`}>
        <ListMassage admin={true} sendToParent={handleDataFromChild} />
      </div>

      <div className={`${!showMessage ? "hidden" : "flex"} flex-col`}>
        <div
          onClick={async () => {
            if (selectedItem && selectedItem.status !== "lama") {
              await updateStatus(selectedItem.id, "lama");
            }
            setShowMessage(false);
            setSelectedItem(null);
          }}
        >
          <LeftChevron className="w-5 h-5" />
        </div>

        <h3>{selectedItem?.name}</h3>
        <h3>{selectedItem?.email}</h3>
        <h3>{selectedItem?.phone}</h3>
        <h3>
          {selectedItem?.created_at
            ? new Date(selectedItem.created_at).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })
            : null}
        </h3>
        <h3>{selectedItem?.message}</h3>
      </div>
    </div>
  );
}
