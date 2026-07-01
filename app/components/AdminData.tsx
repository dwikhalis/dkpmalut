"use client";

import { useEffect, useState } from "react";
import { LeftChevron, VerticalThreeDot } from "@/public/icons/iconSets";
import Button from "./Button";
import {
  getInternalDatasetPages,
  getMitraDatasetPages,
} from "@/lib/supabase/supabaseHelper";
import DataInternal from "./DataInternal";
import DataMitra from "./DataMitra";
import { useAuthStore } from "../Stores/authStores";
import type { EditSource } from "./DatasetConfig";

import dynamic from "next/dynamic";

const DatasetConfig = dynamic(() => import("./DatasetConfig"), {
  loading: () => <div className="p-10 text-center">Loading...</div>,
  ssr: false,
});

type DataPage = {
  id: string;
  name: string;
  table: string;
};

type MitraDataPage = {
  id: string;
  label: string;
};

export default function AdminData() {
  const loading = useAuthStore((state) => state.loading);
  const userId = useAuthStore((state) => state.userId);
  const role = useAuthStore((state) => state.role);
  const userName = useAuthStore((state) => state.profile?.organization);

  const [dataset, setDataset] = useState<string>("");
  const [mitraDataId, setMitraDataId] = useState<string>("");
  const [action, setAction] = useState<"add" | "edit" | "list" | "delete">(
    "list",
  );
  const [page, setPage] = useState<string>("Data Utama");
  const [mainPage, setMainPage] = useState<"main" | "add" | "edit" | "delete">(
    "main",
  );
  const [internalDataPages, setInternalDataPages] = useState<DataPage[]>([]);
  const [mitraDataPages, setMitraDataPages] = useState<MitraDataPage[]>([]);

  const [showMobileAction, setShowMobileAction] = useState(false);
  const [saveData, setSaveData] = useState(0);

  const [editDataset, setEditDataset] = useState<EditSource>("data_mitra");

  const labels = {
    home: "Data Utama",
    mitra: "Data Mitra" + (userName ? ` : ${userName}` : ""),
    add: "Tambah Dataset",
    edit: "Atur Dataset",
    delete: "Hapus Dataset",
  };

  //! ====== FETCH INTERNAL DATASET PAGES - ADMIN ONLY ====== //
  useEffect(() => {
    if (loading || !userId || role !== "admin") return;

    const fetchDataPages = async () => {
      try {
        const result = await getInternalDatasetPages();
        setInternalDataPages(result);
      } catch (err) {
        console.error("Fetching Internal Datasets:", err);
      }
    };

    fetchDataPages();
  }, [loading, userId, role]);

  //! ====== FETCH MITRA DATASET PAGES - ADMIN AND PARTNER ====== //
  useEffect(() => {
    if (loading || !userId) return;
    if (role !== "admin" && role !== "partner") return;

    const fetchMitraDataPages = async () => {
      try {
        const result = await getMitraDatasetPages(
          role === "admin" ? "all" : userId,
        );

        setMitraDataPages(result);
      } catch (err) {
        console.error("Fetching Mitra Datasets:", err);
      }
    };

    fetchMitraDataPages();
  }, [loading, userId, role]);

  //! CLOSE VERTICAL THREE DOT MENUS IF CLICKED OUTSIDE OR OPTION CLICKED
  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      document
        .querySelectorAll<HTMLDetailsElement>("[three-dot-menu='true']")
        .forEach((details) => {
          const clickedInside = details.contains(target);
          const clickedOption = clickedInside && target.closest("button");

          if (!clickedInside || clickedOption) {
            details.open = false;
          }
        });
    };

    document.addEventListener("click", handleDocumentClick);

    return () => {
      document.removeEventListener("click", handleDocumentClick);
    };
  }, []);

  //! ====== LOADING AND AUTH GUARD ====== //
  if (loading) {
    return <div className="p-10 text-center">Loading...</div>;
  }

  if (!userId) {
    return null;
  }

  //! ====== SIGNAL HANDLERS ====== //
  const handleSignalAction = () => {
    setAction("list");
  };

  const handleSignalDatasetAction = () => {
    setMainPage("main");
    setPage(labels.home);
    setDataset("");
    setMitraDataId("");
    setAction("list");
  };

  return (
    <div className="flex w-full min-w-0 max-w-full min-h-[90vh] overflow-hidden">
      {/* //! ====== MAIN DATA PAGE ====== // */}
      {mainPage === "main" && (
        <div className="flex w-full min-w-0 max-w-full flex-col overflow-hidden">
          {/* //! ====== TOP TITLE AND ACTION ====== // */}
          <div
            className={`flex relative items-center justify-center ${
              role === "admin" ? "mt-3 mb-6" : ""
            }`}
          >
            {/* //! ====== BACK BUTTON ====== // */}
            <div
              className={`${
                page === labels.home ? "hidden" : "flex"
              } flex items-center justify-start py-3 pr-3 cursor-pointer`}
              onClick={() => {
                setPage(labels.home);
                setDataset("");
                setMitraDataId("");
                setAction("list");
                setEditDataset("data_mitra");
              }}
            >
              <LeftChevron className="size-6" />
            </div>

            {/* //! ====== TOP TITLE - ADMIN AND PARTNER DETAIL PAGE ====== // */}
            {(role === "admin" ||
              (role === "partner" && page !== labels.home)) && (
              <h3 className="font-bold text-center mx-auto">{page}</h3>
            )}

            {/* //! ====== DATA UTAMA : THREE DOT MENU ====== // */}
            {role === "admin" && page === labels.home && (
              <details three-dot-menu="true" className="absolute right-0 group">
                <summary className="list-none cursor-pointer rounded-sm border-2 border-white hover:border-black bg-white px-1 py-1 text-xs group-open:border-2 group-open:border-black">
                  <VerticalThreeDot className="size-6" />
                </summary>

                <div className="flex flex-col absolute right-0 z-30 mt-2 rounded-lg border border-gray-400 bg-white shadow-lg p-2">
                  <button
                    className="whitespace-nowrap text-left text-sm hover:bg-sky-200 px-2 p-2"
                    onClick={() => {
                      setMainPage("edit");
                      setPage(labels.edit);
                      setAction("edit");
                      setEditDataset("datasets");
                    }}
                  >
                    Atur Dataset
                  </button>
                </div>
              </details>
            )}

            {/* //! ====== DESKTOP ACTION BUTTON - SELECTED DATASET ====== // */}
            {page !== labels.home && (
              <div className="hidden md:flex justify-center items-center">
                {/* //! VERTICAL THREE DOT MENU */}
                <details
                  three-dot-menu="true"
                  className="absolute right-0 group"
                >
                  <summary
                    className={`list-none cursor-pointer rounded-sm border-2 border-white hover:border-black bg-white px-1 py-1 text-xs group-open:border-2 group-open:border-black
                ${action === "edit" || action === "add" || action === "delete" ? "hidden" : "flex"}`}
                  >
                    <VerticalThreeDot className="size-6" />
                  </summary>

                  <div className="flex flex-col absolute right-0 z-30 mt-2 rounded-lg border border-gray-400 bg-white shadow-lg p-2">
                    <button
                      className="whitespace-nowrap text-left text-sm hover:bg-sky-200 px-2 p-2"
                      onClick={() => setAction("edit")}
                    >
                      Edit Data
                    </button>

                    <button
                      className="whitespace-nowrap text-left text-sm hover:bg-sky-200 px-2 p-2"
                      onClick={() => setAction("add")}
                    >
                      Tambah Data
                    </button>

                    <button
                      className="whitespace-nowrap text-left text-sm hover:bg-sky-200 px-2 p-2"
                      onClick={() => setAction("delete")}
                    >
                      Hapus Data
                    </button>
                  </div>
                </details>

                {/* //! ACTION BUTTON */}
                <div
                  className={`${page === labels.home ? "hidden" : "flex"} gap-1`}
                >
                  {/* //! ====== CANCEL BUTTON ====== // */}
                  <div
                    onClick={() => setAction("list")}
                    className={
                      action === "edit" ||
                      action === "add" ||
                      action === "delete"
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

                  {/* //! ====== SAVE / DELETE BUTTON ====== // */}
                  <div
                    onClick={() => setSaveData((prev) => prev + 1)}
                    className={
                      action === "edit" ||
                      action === "add" ||
                      action === "delete"
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
                </div>
              </div>
            )}

            {/* //! ====== MOBILE ACTION BUTTON - DATA DETAIL ONLY ====== // */}
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

          {/* //! ====== DATA DKP LIST - ADMIN ONLY ====== // */}
          {role === "admin" && page === labels.home && (
            <div className="flex w-full min-w-0 max-w-full flex-col gap-6 mb-6 px-1 py-2">
              {internalDataPages.map((e) => (
                <div
                  key={e.id}
                  className="flex flex-col p-3 border-1 border-stone-200 bg-white hover:bg-sky-800 hover:text-white rounded-2xl shadow-xl text-center cursor-pointer"
                  onClick={() => {
                    setPage(e.name);
                    setDataset(e.table);
                    setMitraDataId("");
                    setAction("list");
                  }}
                >
                  {e.name}
                </div>
              ))}
            </div>
          )}

          {/* //! ====== DATA INTERNAL DKP DETAIL - ADMIN ONLY ====== // */}
          {role === "admin" &&
            dataset !== "data_mitra" &&
            page !== labels.home && (
              <DataInternal
                dataset={dataset}
                action={action}
                saveData={saveData}
                onSignalAction={handleSignalAction}
              />
            )}

          {/* //! ====== DATA MITRA LIST - ADMIN AND PARTNER ====== // */}
          {(role === "admin" || role === "partner") &&
            mitraDataPages.length > 0 &&
            page === labels.home && (
              <div className="flex w-full min-w-0 max-w-full flex-col gap-6 mb-6 px-1 py-2">
                {/* //! ====== DATA MITRA TITLE - ADMIN AND PARTNER ====== // */}
                <div
                  className={`relative flex w-full justify-center items-center mx-auto ${
                    role === "partner" ? "mt-1" : "mt-6"
                  }`}
                >
                  <h3 className="font-bold text-center">
                    {role === "partner" ? labels.mitra : "Data Mitra"}
                  </h3>

                  {/* //! ====== DATA MITRA OPTION MENU - ADMIN AND PARTNER ====== // */}
                  <details
                    three-dot-menu="true"
                    className="absolute right-0 group"
                  >
                    <summary className="list-none cursor-pointer rounded-sm border-2 border-white hover:border-black bg-white px-1 py-1 text-xs group-open:border-2 group-open:border-black">
                      <VerticalThreeDot className="size-6" />
                    </summary>

                    <div className="flex flex-col absolute right-0 z-30 mt-2 rounded-lg border border-gray-400 bg-white shadow-lg p-2">
                      <button
                        className="whitespace-nowrap text-left text-sm hover:bg-sky-200 px-2 p-2"
                        onClick={() => {
                          setMainPage("add");
                          setPage(labels.add);
                          setAction("add");
                        }}
                      >
                        Tambah Dataset
                      </button>

                      <button
                        className="whitespace-nowrap text-left text-sm hover:bg-sky-200 px-2 p-2"
                        onClick={() => {
                          setMainPage("edit");
                          setPage(labels.edit);
                          setAction("edit");
                          setEditDataset("data_mitra");
                        }}
                      >
                        Atur Dataset
                      </button>

                      <button
                        className="whitespace-nowrap text-left text-sm hover:bg-sky-200 px-2 p-2"
                        onClick={() => {
                          setMainPage("delete");
                          setPage(labels.delete);
                          setAction("delete");
                        }}
                      >
                        Hapus Dataset
                      </button>
                    </div>
                  </details>
                </div>

                {/* //! ====== DATA MITRA MAPPING - ADMIN AND PARTNER ====== // */}
                {mitraDataPages.map((e) => (
                  <div
                    key={e.id}
                    className="flex flex-col p-3 border-1 border-stone-200 bg-white hover:bg-sky-800 hover:text-white rounded-2xl shadow-xl text-center cursor-pointer"
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
              </div>
            )}

          {/* //! ====== DATA MITRA DETAIL - ADMIN AND PARTNER ====== // */}
          {(role === "admin" || role === "partner") &&
            dataset === "data_mitra" &&
            page !== labels.home && (
              <DataMitra
                dataMitraId={mitraDataId}
                action={action}
                saveData={saveData}
                onSignalAction={handleSignalAction}
              />
            )}
        </div>
      )}

      {/* //! ====== DATASET CONFIG PAGE - ADMIN AND PARTNER ====== // */}
      {(role === "admin" || role === "partner") && mainPage !== "main" && (
        <div className="flex min-h-[80vh] w-full min-w-0 max-w-full flex-col overflow-hidden">
          {/* //! ====== DATASET CONFIG TOP TITLE AND ACTION ====== // */}
          <div className="flex relative items-center justify-center mb-6">
            {/* //! ====== DATASET CONFIG BACK BUTTON ====== // */}
            <div
              className="flex justify-center items-center py-3 pr-3 cursor-pointer"
              onClick={() => {
                setPage(labels.home);
                setMainPage("main");
                setDataset("");
                setMitraDataId("");
                setAction("list");
                setEditDataset("data_mitra");
              }}
            >
              <LeftChevron className="size-6" />
            </div>

            {/* //! ====== DATASET CONFIG TOP TITLE ====== // */}
            <h3 className="font-bold text-center mx-auto">{page}</h3>

            {/* //! ====== DATASET CONFIG DESKTOP ACTION BUTTON ====== // */}
            <div className="hidden md:flex justify-center items-center">
              <div className="flex flex-row gap-1">
                {/* //! ====== DATASET CONFIG CANCEL BUTTON ====== // */}
                <div
                  onClick={() => {
                    setPage(labels.home);
                    setMainPage("main");
                    setAction("list");
                  }}
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

                {/* //! ====== DATASET CONFIG SAVE / DELETE BUTTON ====== // */}
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

            {/* //! ====== DATASET CONFIG MOBILE ACTION BUTTON ====== // */}
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

          {/* //! ====== DATASET CONFIG CONTENT ====== // */}
          <div className="flex flex-col gap-6 mb-6 min-h-[60vh]">
            {page !== labels.home && (
              <DatasetConfig
                action={action}
                saveData={saveData}
                onSignalAction={handleSignalDatasetAction}
                userRole={role}
                userId={userId}
                editDataset={editDataset}
              />
            )}
          </div>
        </div>
      )}

      {/* //! ====== BOTTOM MOBILE ACTION MENU ====== // */}
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

      {/* //! ====== MOBILE CANCEL / SAVE BUTTON ====== // */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`fixed md:hidden bottom-0 left-0 flex w-full flex-col justify-center gap-3 rounded-t-2xl bg-stone-900 p-5 transition-transform duration-300 ease-out ${
          action === "edit" || action === "add" || action === "delete"
            ? "translate-y-0"
            : "translate-y-full"
        }`}
      >
        {/* //! ====== MOBILE CANCEL BUTTON ====== // */}
        <button
          className="w-full rounded-xl bg-gray-600 border-2 border-white py-2 text-md text-white"
          onClick={() => {
            if (mainPage !== "main") {
              setPage(labels.home);
              setMainPage("main");
            }

            setAction("list");
          }}
        >
          Batal
        </button>

        {/* //! ====== MOBILE SAVE BUTTON ====== // */}
        {(action === "edit" || action === "add") && (
          <button
            className="w-full rounded-xl bg-green-600 border-2 border-white py-2 text-md text-white"
            onClick={() => setSaveData((prev) => prev + 1)}
          >
            Simpan
          </button>
        )}

        {/* //! ====== MOBILE DELETE BUTTON ====== // */}
        {action === "delete" && (
          <button
            className="w-full rounded-xl bg-rose-600 border-2 border-white py-2 text-md text-white"
            onClick={() => setSaveData((prev) => prev + 1)}
          >
            Hapus
          </button>
        )}
      </div>
    </div>
  );
}
