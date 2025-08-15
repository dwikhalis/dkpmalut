"use client";

import { Failed, Success, Warning } from "@/public/icons/iconSets";
import React from "react";

export default function AdminDashboard() {
  return (
    <div className="flex justify-center items-center h-[70vh] ml-8">
      <Warning className="size-12 stroke-2 text-amber-600" />
      <Success className="size-12 stroke-2 text-teal-600" />
      <Failed className="size-12 stroke-2 text-rose-600" />
      <h3>Dashboard : UNDER CONSTRUCTION</h3>
    </div>
  );
}
