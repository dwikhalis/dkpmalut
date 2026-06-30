"use client";

import AdminDashboard from "../components/AdminDashboard";
import AdminSideMenu from "../components/AdminSideMenu";
import { useAuthStore } from "@/app/Stores/authStores";

export default function Page() {
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
    <div className="flex">
      <AdminSideMenu slug="home" userRole={role} />
      <div className="flex h-full w-full lg:mx-12 mx-8 min-h-[70vh]">
        <AdminDashboard />
      </div>
    </div>
  );
}
