import { Failed, Success, Warning } from "@/public/icons/iconSets";
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
    <div className="flex fixed inset-0 z-[2000] justify-center items-center bg-black/50 w-[100vw] h-[100vh]">
      <div className="mx-4 flex max-w-[calc(100vw-2rem)] flex-col items-center justify-center rounded-2xl bg-stone-100 p-8 md:mx-24 md:max-w-[calc(100vw-12rem)] md:p-12 2xl:p-20">
        {icon === "warning" ? (
          <div className="flex justify-center items-center h-20 w-20 2xl:h-35 2xl:w-35 mb-2">
            <Warning className="stroke-2 text-amber-600" />
          </div>
        ) : icon === "success" ? (
          <div className="flex justify-center items-center h-20 w-20 2xl:h-35 2xl:w-35 mb-2">
            <Success className="stroke-2 text-teal-600" />
          </div>
        ) : icon === "failed" ? (
          <div className="flex justify-center items-center h-20 w-20 2xl:h-35 2xl:w-35 mb-2">
            <Failed className="size-12 stroke-2 text-rose-600" />
          </div>
        ) : null}
        <h3 className="mb-6 text-center text-xl font-semibold md:text-2xl">
          {msg}
        </h3>
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
                <span className={loading ? "hidden" : "flex"}>{yesText}</span>
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
                <span>{noText}</span>
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
              <span>{yesText}</span>
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
