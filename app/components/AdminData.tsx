"use client";

import { useEffect, useState } from "react";
import { LeftChevron, VerticalThreeDot } from "@/public/icons/iconSets";
import Button from "./Button";
import { getDataset } from "@/lib/supabase/supabaseHelper";
import DataInternal from "./DataInternal";
import DataMitra from "./DataMitra";
import DatasetConfig from "./DatasetConfig";

type DataPage = {
  id: string;
  name: string;
  table: string;
  source: string;
};

type MitraDataPage = {
  id: string;
  mitra_id?: string;
  label: string;
  dataset_name: string;
  data?: Record<string, unknown> | string | null;
};

export default function AdminData() {
  const [dataset, setDataset] = useState<string>("");
  const [mitraDataId, setMitraDataId] = useState<string>("");
  const [action, setAction] = useState<"add" | "edit" | "list" | "delete">(
    "list",
  );
  const [page, setPage] = useState<string>("Data");
  const [mainPage, setMainPage] = useState<"main" | "add" | "edit" | "delete">(
    "main",
  );
  const [dataPages, setDataPages] = useState<DataPage[]>([]);
  const [mitraDataPages, setMitraDataPages] = useState<MitraDataPage[]>([]);

  const [showMobileAction, setShowMobileAction] = useState(false);
  const [saveData, setSaveData] = useState(0);

  const labels = {
    home: "Data",
    add: "Tambah Dataset",
    edit: "Atur Dataset",
    delete: "Hapus Dataset",
  };

  // ! FETCHING ONLY DKP INTERNAL DATA
  useEffect(() => {
    const fetchDataPages = async () => {
      try {
        const result = await getDataset("datasets");

        setDataPages(result);
      } catch (err) {
        console.error("Fetching Datasets :", err);
      }
    };

    fetchDataPages();
  }, []);

  // ! FETCHING ONLY MITRA DATA
  useEffect(() => {
    const fetchMitraDataPages = async () => {
      try {
        const result = await getDataset("data_mitra");

        setMitraDataPages(result);
      } catch (err) {
        console.error("Fetching Datasets :", err);
      }
    };

    fetchMitraDataPages();
  }, []);

  const handleSignalAction = () => {
    setAction("list");
  };

  const handleSignalDatasetAction = () => {
    setMainPage("main");
    setPage(labels.home);
    setAction("list");
  };

  return (
    <>
      {/* //! ========== HOME AND LIST DATA ========== */}
      {mainPage === "main" && (
        <div className="flex flex-col min-h-[80vh]">
          {/* //! TOP TITLE AND ACTION */}
          <div className="flex relative items-center justify-center my-8">
            {/*//! Back Button */}
            <div
              className={`${
                page === labels.home ? "hidden" : "flex"
              } flex items-center justify-start py-3 pr-3 cursor-pointer`}
              onClick={() => {
                setPage(labels.home);
                setDataset("");
                setAction("list");
              }}
            >
              <LeftChevron className="size-6" />
            </div>

            {/*//! Top Title */}
            <h3 className="font-bold text-center mx-auto">{page}</h3>

            {/* //! OPTION BUTTON TO ADD NEW CUSTOM DATASET OR SETTING DATASETS METADATA */}
            {page === labels.home && (
              <details className="absolute right-0 group">
                <summary className="list-none cursor-pointer rounded-sm border-2 border-white hover:border-black bg-white px-3 py-2 text-xs group-open:border-2 group-open:border-black">
                  <VerticalThreeDot className="size-6" />
                </summary>
                <div className="flex flex-col absolute right-0 z-30 mt-2 rounded-lg border border-gray-400 bg-white shadow-lg p-2">
                  <button
                    className="whitespace-nowrap text-left text-sm hover:bg-sky-200 px-2 p-2"
                    onClick={() => (
                      setMainPage("add"),
                      setPage(labels.add),
                      setAction("add")
                    )}
                  >
                    Tambah Dataset
                  </button>
                  <button
                    className="whitespace-nowrap text-left text-sm hover:bg-sky-200 px-2 p-2"
                    onClick={() => (
                      setMainPage("edit"),
                      setPage(labels.edit),
                      setAction("edit")
                    )}
                  >
                    Atur Dataset
                  </button>
                  <button
                    className="whitespace-nowrap text-left text-sm hover:bg-sky-200 px-2 p-2"
                    onClick={() => (
                      setMainPage("delete"),
                      setPage(labels.delete),
                      setAction("delete")
                    )}
                  >
                    Hapus Dataset
                  </button>
                </div>
              </details>
            )}

            {/*//! DESKTOP : Action Button */}
            <div className="hidden md:flex justify-center items-center">
              <div
                className={`${page === labels.home ? "hidden" : "flex"} gap-1`}
              >
                {/* //! Edit Button */}
                <div
                  onClick={() => setAction("edit")}
                  className={
                    action === "edit" || action === "add" || action === "delete"
                      ? "hidden"
                      : "flex"
                  }
                >
                  <Button
                    color="blue"
                    size="lg"
                    text="Edit"
                    textSize="sm"
                    link="none"
                  />
                </div>

                {/* //! Add Button */}
                <div
                  onClick={() => setAction("add")}
                  className={
                    action === "edit" || action === "add" || action === "delete"
                      ? "hidden"
                      : "flex"
                  }
                >
                  <Button
                    color="green"
                    size="lg"
                    textSize="sm"
                    text="Tambah"
                    link="none"
                  />
                </div>

                {/* //! Cancel Button */}
                <div
                  onClick={() => setAction("list")}
                  className={
                    action === "edit" || action === "add" || action === "delete"
                      ? "flex"
                      : "hidden"
                  }
                >
                  <Button
                    color="grey"
                    size="lg"
                    textSize="sm"
                    text="Batal"
                    link="none"
                  />
                </div>

                {/* //! Save / Delete Button */}
                <div
                  onClick={() => setSaveData((prev) => prev + 1)}
                  className={
                    action === "edit" || action === "add" || action === "delete"
                      ? "flex"
                      : "hidden"
                  }
                >
                  <Button
                    color={action === "delete" ? "red" : "green"}
                    size="lg"
                    textSize="sm"
                    text={action === "delete" ? "Hapus" : "Simpan"}
                    link="none"
                  />
                </div>

                {/* //! Delete Button */}
                <div
                  onClick={() => setAction("delete")}
                  className={
                    action === "edit" || action === "add" || action === "delete"
                      ? "hidden"
                      : "flex"
                  }
                >
                  <Button
                    color="red"
                    size="lg"
                    textSize="sm"
                    text="Hapus"
                    link="none"
                  />
                </div>
              </div>
            </div>

            {/* //! MOBILE Action - Setting Button */}
            <div className="flex md:hidden justify-center items-center">
              <div
                className={`${
                  page === labels.home ? "hidden" : "flex"
                } flex py-3 pl-3`}
                onClick={() => {
                  setShowMobileAction(true);
                }}
              >
                <VerticalThreeDot className="size-6 cursor-pointer hover:border rounded-sm" />
              </div>
            </div>
          </div>

          {/* //! ========== DATA DKP ========== */}
          <div className="flex flex-col gap-6 mb-6">
            {/* //! DATA DKP : MAPPING */}
            {dataPages.map((e, idx) => (
              <div
                key={idx}
                className={`${
                  page === labels.home ? "flex" : "hidden"
                } flex-col p-3 border-1 border-stone-200 bg-white hover:bg-sky-800 hover:text-white rounded-2xl shadow-xl text-center cursor-pointer`}
                onClick={() => {
                  setPage(e.name);
                  setDataset(e.table);
                  setAction("list");
                }}
              >
                {e.name}
              </div>
            ))}

            {/*//! DATA INTERNAL DKP */}
            {dataset !== "data_mitra" && page !== labels.home && (
              <DataInternal
                dataset={dataset}
                action={action}
                saveData={saveData}
                onSignalAction={handleSignalAction}
              />
            )}
          </div>

          {/* //! ========== DATA MITRA ========== */}
          <div className="flex flex-col gap-6 mb-6">
            {/*//! DATA MITRA : Top Title */}
            {mitraDataPages.length > 0 && page === labels.home && (
              <div className="relative flex w-full justify-center items-center mx-auto mt-6">
                <h3 className="font-bold text-center">Data Mitra</h3>

                {/* //! OPTION BUTTON TO SETTING DATASETS METADATA */}
                <details className="absolute right-0 group">
                  <summary className="list-none cursor-pointer rounded-sm border-2 border-white hover:border-black bg-white px-3 py-2 text-xs group-open:border-2 group-open:border-black">
                    <VerticalThreeDot className="size-6" />
                  </summary>
                  <div className="flex flex-col absolute right-0 z-30 mt-2 rounded-lg border border-gray-400 bg-white shadow-lg p-2">
                    <button
                      className="whitespace-nowrap text-left text-sm hover:bg-sky-200 px-2 p-2"
                      onClick={() => (
                        setMainPage("add"),
                        setPage(labels.add),
                        setAction("add")
                      )}
                    >
                      Tambah Dataset
                    </button>
                    <button
                      className="whitespace-nowrap text-left text-sm hover:bg-sky-200 px-2 p-2"
                      onClick={() => (
                        setMainPage("edit"),
                        setPage(labels.edit),
                        setAction("edit")
                      )}
                    >
                      Atur Dataset
                    </button>
                    <button
                      className="whitespace-nowrap text-left text-sm hover:bg-sky-200 px-2 p-2"
                      onClick={() => (
                        setMainPage("delete"),
                        setPage(labels.delete),
                        setAction("delete")
                      )}
                    >
                      Hapus Dataset
                    </button>
                  </div>
                </details>
              </div>
            )}

            {/* //! DATA MITRA : MAPPING */}
            {mitraDataPages.map((e) => (
              <div
                key={e.id}
                className={`${
                  page === labels.home ? "flex" : "hidden"
                } flex-col p-3 border-1 border-stone-200 bg-white hover:bg-sky-800 hover:text-white rounded-2xl shadow-xl text-center cursor-pointer`}
                onClick={() => {
                  setPage(e.label);
                  setDataset("data_mitra");
                  setMitraDataId(e.id);
                  setAction("list");
                }}
              >
                {e.label}
              </div>
            ))}

            {/*//! DATA MITRA */}
            {dataset === "data_mitra" && page !== labels.home && (
              <DataMitra
                dataMitraId={mitraDataId}
                action={action}
                saveData={saveData}
                onSignalAction={handleSignalAction}
              />
            )}
          </div>
        </div>
      )}

      {/* //! ========== ADD NEW DATA ========== */}
      {mainPage !== "main" && (
        <div className="flex flex-col min-h-[80vh]">
          {/* //! TOP TITLE AND ACTION */}
          <div className="flex relative items-center justify-center my-8">
            {/*//! Back Button */}
            <div
              className="flex justify-center items-center py-3 pr-3 cursor-pointer"
              onClick={() => {
                setPage(labels.home);
                setMainPage("main");
                setDataset("");
                setAction("list");
              }}
            >
              <LeftChevron className="size-6" />
            </div>

            {/*//! Top Title */}
            <h3 className="font-bold text-center mx-auto">{page}</h3>

            {/*//! DESKTOP : Action Button */}
            <div className="hidden md:flex justify-center items-center">
              <div className="flex flex-row gap-1">
                {/* //! Cancel Button */}
                <div
                  onClick={() => (
                    setPage(labels.home),
                    setMainPage("main"),
                    setAction("list")
                  )}
                  className={
                    action === "edit" || action === "add" || action === "delete"
                      ? "flex"
                      : "hidden"
                  }
                >
                  <Button
                    color="grey"
                    size="lg"
                    textSize="sm"
                    text="Batal"
                    link="none"
                  />
                </div>
                {/* //! Confirmation Button : Save / Delete (when action === "delete") Button */}
                <div onClick={() => setSaveData((prev) => prev + 1)}>
                  <Button
                    color={action === "delete" ? "red" : "green"}
                    size="lg"
                    textSize="sm"
                    text={action === "delete" ? "Hapus" : "Simpan"}
                    link="none"
                  />
                </div>
              </div>
            </div>

            {/* //! MOBILE Action - Setting Button */}
            <div className="flex md:hidden justify-center items-center">
              <div
                className={`${
                  page === labels.home ? "hidden" : "flex"
                } flex py-3 pl-3`}
                onClick={() => {
                  setShowMobileAction(true);
                }}
              >
                <VerticalThreeDot className="size-6 cursor-pointer hover:border rounded-sm" />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6 mb-6 min-h-[60vh]">
            {/*//! DATA MITRA */}
            {page !== labels.home && (
              <DatasetConfig
                action={action}
                saveData={saveData}
                onSignalAction={handleSignalDatasetAction}
              />
            )}
          </div>
        </div>
      )}

      {/* //! ========== BOTTOM MOBILE ACTION MENU ========== */}
      <div
        className={`fixed md:hidden inset-0 z-20 bg-gray-950/70 transition-opacity duration-300 ${
          showMobileAction
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setShowMobileAction(false)}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className={`fixed bottom-0 left-0 flex w-full flex-col items-center justify-center gap-3 rounded-t-2xl bg-stone-900 p-5 transition-transform duration-300 ease-out ${
            showMobileAction ? "translate-y-0" : "translate-y-full"
          }`}
        >
          <div className="flex gap-2 w-full">
            <button
              className="w-full bg-sky-800 rounded-xl border-2 border-white py-2 text-md text-white"
              onClick={() => {
                setAction("edit");
                setShowMobileAction(false);
              }}
            >
              Edit
            </button>

            <button
              className="w-full bg-green-600 rounded-xl border-2 border-white py-2 text-md text-white"
              onClick={() => {
                setAction("add");
                setShowMobileAction(false);
              }}
            >
              Tambah
            </button>

            <button
              className="w-full bg-red-600 rounded-xl border-2 border-white py-2 text-md text-white"
              onClick={() => {
                setAction("delete");
                setShowMobileAction(false);
              }}
            >
              Hapus
            </button>
          </div>

          <button
            className="w-full rounded-xl border-2 border-white py-2 text-md text-white"
            onClick={() => {
              setShowMobileAction(false);
            }}
          >
            Download CSV
          </button>
        </div>
      </div>

      {/* //! MOBILE : Cancel / Save Button */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`fixed md:hidden bottom-0 left-0 flex w-full flex-col justify-center gap-3 rounded-t-2xl bg-stone-900 p-5 transition-transform duration-300 ease-out ${
          action === "edit" || action === "add" || action === "delete"
            ? "translate-y-0"
            : "translate-y-full"
        }`}
      >
        {/* //! Cancel button */}
        <button
          className="w-full rounded-xl bg-gray-600 border-2 border-white py-2 text-md text-white"
          onClick={() => (
            mainPage !== "main" && setPage(labels.home),
            setMainPage("main"),
            setAction("list")
          )}
        >
          Batal
        </button>

        {/* //! Save button for Add / Edit */}
        {(action === "edit" || action === "add") && (
          <button
            className="w-full rounded-xl bg-green-600 border-2 border-white py-2 text-md text-white"
            onClick={() => setSaveData((prev) => prev + 1)}
          >
            Simpan
          </button>
        )}

        {/* //! Delete button for Delete mode */}
        {action === "delete" && (
          <button
            className="w-full rounded-xl bg-rose-600 border-2 border-white py-2 text-md text-white"
            onClick={() => setSaveData((prev) => prev + 1)}
          >
            Hapus
          </button>
        )}
      </div>
    </>
  );
}
