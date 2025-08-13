import React from "react";

interface Props {
  size: string;
}

export default function SpinnerLoading({ size }: Props) {
  return size === "sm" ? (
    <div className="flex justify-center items-center h-full w-full">
      <div className="h-5 w-5 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
    </div>
  ) : null;
}
