"use client";

import AdminInternalDataset from "./AdminInternalDataset";
import AdminMitraDataset from "./AdminMitraDataset";
import { useAuthStore } from "../Stores/authStores";

export default function AdminData() {
  const loading = useAuthStore((state) => state.loading);
  const userId = useAuthStore((state) => state.userId);
  const role = useAuthStore((state) => state.role);

  if (loading) {
    return <div className="p-10 text-center">Loading...</div>;
  }

  if (!userId) {
    return null;
  }

  return (
    <div className="flex w-full flex-col gap-10">
      {role === "admin" && <AdminInternalDataset />}

      {(role === "admin" || role === "partner") && <AdminMitraDataset />}
    </div>
  );
}
