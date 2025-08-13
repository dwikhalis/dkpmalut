import React from "react";

interface Props {
  type: string;
  msg: string;
  yesText: string;
  noText?: string;
  confirm?: (confirmation: boolean) => void;
}

//! TYPE => single = (YES), double = (YES, NO)

export default function AlertNotif({
  type,
  msg,
  yesText,
  noText,
  confirm = () => {},
}: Props) {
  return (
    <div className="flex fixed inset-0 z-10 justify-center items-center bg-black/50 w-[100vw] h-[100vh]">
      <div className="flex flex-col gap-6 justify-center object-center rounded-2xl bg-stone-100 md:p-12 p-8 md:h-[20vw] md:w-[50vw]">
        <h3 className="text-center">{msg}</h3>
        <div className="flex md:gap-12 gap-3 justify-center object-center">
          {/* //! DOUBLE */}
          {type === "double" ? (
            <>
              {/*  YES */}
              <button
                className="bg-sky-600 p-4 md:w-40 w-20 text-white font-bold rounded-2xl hover:bg-sky-700"
                onClick={() => {
                  confirm(true);
                }}
              >
                <h3>{yesText}</h3>
              </button>

              {/*  NO */}
              <button
                className="bg-rose-600 p-4 md:w-40 w-20 text-white font-bold rounded-2xl hover:bg-rose-700"
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
