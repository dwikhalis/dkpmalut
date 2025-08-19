import { Failed, Success, Warning } from "@/public/icons/iconSets";
import React from "react";
import SpinnerLoading from "./SpinnerLoading";

interface Props {
  type: string;
  msg: string;
  yesText: string;
  noText?: string;
  icon?: string;
  loading?: boolean;
  confirm?: (confirmation: boolean) => void;
}

//! TYPE => single = (YES), double = (YES, NO)

export default function AlertNotif({
  type,
  msg,
  yesText,
  noText,
  icon,
  loading,
  confirm = () => {},
}: Props) {
  return (
    <div className="flex fixed inset-0 z-10 justify-center items-center bg-black/50 w-[100vw] h-[100vh]">
      <div className="flex flex-col justify-center items-center rounded-2xl bg-stone-100 md:p-12 2xl:p-20 p-8">
        {icon === "warning" ? (
          <div className="h-20 w-20 2xl:h-35 2xl:w-35 mb-2">
            <Warning className="stroke-2 text-amber-600" />
          </div>
        ) : icon === "success" ? (
          <div className="h-20 w-20 2xl:h-35 2xl:w-35 mb-2">
            <Success className="stroke-2 text-teal-600" />
          </div>
        ) : icon === "failed" ? (
          <div className="h-20 w-20 2xl:h-35 2xl:w-35 mb-2">
            <Failed className="size-12 stroke-2 text-rose-600" />
          </div>
        ) : null}
        <h3 className="text-center mb-6">{msg}</h3>
        <div className="flex md:gap-12 gap-3 justify-center object-center">
          {/* //! DOUBLE */}
          {type === "double" ? (
            <>
              {/*  YES */}
              <button
                className="flex justify-center bg-sky-600 p-4 md:w-40 w-20 2xl:w-60 text-white font-bold rounded-2xl hover:bg-sky-700"
                onClick={() => {
                  confirm(true);
                }}
              >
                <h3 className={loading ? "hidden" : "flex"}>{yesText}</h3>
                <div className={loading ? "flex" : "hidden"}>
                  <SpinnerLoading size="sm" color="white" />
                </div>
              </button>

              {/*  NO */}
              <button
                className="bg-rose-600 p-4 md:w-40 w-20 2xl:w-60 text-white font-bold rounded-2xl hover:bg-rose-700"
                onClick={() => {
                  confirm(false);
                }}
              >
                <h3>{noText}</h3>
              </button>
            </>
          ) : //! SINGLE
          type === "single" ? (
            <button
              className="bg-sky-600 p-4 md:w-40 w-20 text-white font-bold rounded-2xl hover:bg-sky-700"
              onClick={() => {
                confirm(true);
              }}
            >
              <h3>{yesText}</h3>
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
