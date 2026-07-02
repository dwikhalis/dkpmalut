"use client";

import AdminInternalDataset from "./AdminInternalDataset";
import AdminMitraDataset from "./AdminMitraDataset";
import { useAuthStore } from "../Stores/authStores";
import { useState } from "react";

export default function AdminData() {
  const loading = useAuthStore((state) => state.loading);
  const userId = useAuthStore((state) => state.userId);
  const role = useAuthStore((state) => state.role);

  const [showDataMap, setShowDataMap] = useState("all");

  const handleSignal = (signal: string) => {
    setShowDataMap(signal);
  };

  if (loading) {
    return <div className="p-10 text-center">Loading...</div>;
  }

  if (!userId) {
    return null;
  }

  return (
    <div className="flex w-full flex-col gap-10">
      {role === "admin" &&
        (showDataMap === "internal" || showDataMap === "all") && (
          <AdminInternalDataset onSignal={handleSignal} />
        )}

      {(role === "admin" || role === "partner") &&
        (showDataMap === "mitra" || showDataMap === "all") && (
          <AdminMitraDataset onSignal={handleSignal} />
        )}
    </div>
  );
}
