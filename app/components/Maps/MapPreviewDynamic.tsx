"use client";

import dynamic from "next/dynamic";
import SpinnerLoading from "../SpinnerLoading";

const MapPreviewDynamic = dynamic(() => import("./MapPreview"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[70vh] w-full items-center justify-center rounded-md border border-stone-200 bg-white shadow-md">
      <SpinnerLoading size="sm" color="black" />
    </div>
  ),
});

export default MapPreviewDynamic;
