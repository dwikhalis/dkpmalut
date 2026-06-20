"use client";

import { useEffect, useState } from "react";
import { LeftChevron, VerticalThreeDot } from "@/public/icons/iconSets";
import DataBudidaya from "./DataBudidaya";
import DataTangkap from "./DataTangkap";
import Button from "./Button";
import DataColdChain from "./DataColdChain";
import { getDataset } from "@/lib/supabase/supabaseHelper";
import DataMitra from "./DataMitra";

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
  const [mitraDataset, setMitraDataset] = useState<string>("");
  const [mitraDataId, setMitraDataId] = useState<string>("");
  const [action, setAction] = useState<"add" | "edit" | "list" | "delete">(
    "list",
  );
  const [page, setPage] = useState<string>("Data");
  const [dataPages, setDataPages] = useState<DataPage[]>([]);
  const [mitraDataPages, setMitraDataPages] = useState<MitraDataPage[]>([]);

  const [showMobileAction, setShowMobileAction] = useState(false);
  const [saveData, setSaveData] = useState(0);

  const labels = {
    home: "Data",
    add: "Tambah Data",
    edit: "Edit Data",
    list: "List Data",
    noUpdate: "Data tidak ada perubahan",
    noAdd: "Tidak ada data yang ditambahkan",
    updated: "Data telah diupdate",
    added: "Data telah ditambahkan",
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

  return (
    <>
      <div className="flex flex-col">
        {/* //! TOP TITLE AND ACTION */}
        <div className="flex relative items-center justify-center my-6">
          {/*//! Back Button */}
          <div
            className={`${
              page === labels.home ? "hidden" : "flex"
            } flex my-6 mr-12 cursor-pointer`}
            onClick={() => {
              setPage(labels.home);
              setDataset("");
              setAction("list");
            }}
          >
            <LeftChevron className="size-6" />
          </div>

          {/*//! Top Title */}
          <p className="font-bold text-center mx-auto text-lg">{page}</p>

          {/* //! OPTION BUTTON TO SETTING DATASETS METADATA */}
          {/* <div className="absolute right-0">
            <VerticalThreeDot className="size-6 cursor-pointer hover:border-1 rounded-sm" />
          </div> */}

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
              } flex py-6 pl-12`}
              onClick={() => {
                setShowMobileAction(true);
              }}
            >
              <VerticalThreeDot className="size-6 cursor-pointer hover:border rounded-sm" />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6 mb-6 min-h-[60vh]">
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

          {/*//! DATA MITRA : Top Title */}
          {mitraDataPages.length > 0 && page === labels.home && (
            <p className={`font-bold text-center mx-auto mt-6 text-lg`}>
              {"Data Mitra"}
            </p>
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
                setMitraDataset(e.dataset_name);
                setAction("list");
              }}
            >
              {e.label}
            </div>
          ))}

          {/*//! DATA BUDIDAYA */}
          {dataset === "budidaya" && page !== labels.home && (
            <DataBudidaya
              action={action}
              saveData={saveData}
              onSignalAction={handleSignalAction}
            />
          )}

          {/*//! DATA TANGKAP */}
          {dataset === "tangkap" && page !== labels.home && (
            <DataTangkap
              action={action}
              saveData={saveData}
              onSignalAction={handleSignalAction}
            />
          )}

          {/*//! DATA COLDCHAIN */}
          {dataset === "cold_chain" && page !== labels.home && (
            <DataColdChain
              action={action}
              saveData={saveData}
              onSignalAction={handleSignalAction}
            />
          )}

          {/*//! DATA MITRA */}
          {dataset === "data_mitra" && page !== labels.home && (
            <DataMitra
              dataMitraId={mitraDataId}
              datasetName={mitraDataset}
              action={action}
              saveData={saveData}
              onSignalAction={handleSignalAction}
            />
          )}
        </div>
      </div>

      {/* //! BOTTOM MOBILE ACTION MENU */}
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
        {/* Cancel button */}
        <button
          className="w-full rounded-xl bg-gray-600 border-2 border-white py-2 text-md text-white"
          onClick={() => setAction("list")}
        >
          Batal
        </button>

        {/* Save button for Add / Edit */}
        {(action === "edit" || action === "add") && (
          <button
            className="w-full rounded-xl bg-green-600 border-2 border-white py-2 text-md text-white"
            onClick={() => setSaveData((prev) => prev + 1)}
          >
            Simpan
          </button>
        )}

        {/* Delete button for Delete mode */}
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
