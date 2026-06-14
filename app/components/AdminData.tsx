"use client";

import { useState } from "react";
import { LeftChevron } from "@/public/icons/iconSets";
import AlertNotif from "./AlertNotif";
import DataBudidaya from "./DataBudidaya";
import DataTangkap from "./DataTangkap";
import Button from "./Button";
import DataColdChain from "./DataColdChain";

export default function AdminData() {
  const [confirmUpdated, setConfirmUpdated] = useState("");
  const [confirmAdded, setConfirmAdded] = useState("");

  const [dataset, setDataset] = useState<string>("");
  const [action, setAction] = useState<"add" | "edit" | "list">("list");
  const [page, setPage] = useState<string>("Data");

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

  const dataPages = [
    { name: "Perikanan Budidaya", dataset: "budidaya" },
    { name: "Perikanan Tangkap", dataset: "tangkap" },
    { name: "Rantai Dingin", dataset: "cold_chain" },
  ];

  const handleSignalUpdated = (signal: string) => {
    setConfirmUpdated(
      signal === "No Update" ? labels.noUpdate : labels.updated,
    );
    setPage(labels.list);
  };

  const handleSignalAdded = (signal: string) => {
    setConfirmAdded(signal === "No Add" ? labels.noAdd : labels.added);
    setPage(labels.list);
  };

  const handleAlert = (signal: boolean) => {
    if (!signal) return;
    setConfirmAdded("");
    setConfirmUpdated("");
  };

  return (
    <>
      <div className="flex flex-col">
        {/* //! TOP TITLE AND ACTION */}
        <div className="relative flex items-center my-8">
          {/*//! Back Button */}
          <div
            className={`${
              page === labels.home ? "hidden" : "flex"
            } flex absolute left-0 py-6 pr-12 cursor-pointer`}
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

          {/*//! Action Button */}
          <div
            className={`${page === labels.home ? "hidden" : "flex"} gap-1 absolute right-0`}
          >
            <div
              onClick={() => setAction("edit")}
              className={
                action === "edit" || action === "add" ? "hidden" : "flex"
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
            <div
              onClick={() => setAction("add")}
              className={
                action === "edit" || action === "add" ? "hidden" : "flex"
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
            <div
              onClick={() => setAction("list")}
              className={
                action === "edit" || action === "add" ? "flex" : "hidden"
              }
            >
              <Button
                color="grey"
                size="lg"
                textSize="sm"
                text="cancel"
                link="none"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6 mb-6 min-h-[60vh]">
          {/*//! Dataset Select Button */}
          {dataPages.map((e, idx) => (
            <div
              key={idx}
              className={`${
                page === labels.home ? "flex" : "hidden"
              } flex-col p-3 border-1 border-stone-200 bg-white hover:bg-sky-800 hover:text-white rounded-2xl shadow-xl text-center cursor-pointer`}
              onClick={() => {
                setPage(e.name);
                setDataset(e.dataset);
              }}
            >
              {e.name}
            </div>
          ))}

          {/*//! DATA BUDIDAYA */}
          <div
            className={`${page !== labels.home && dataset === "budidaya" ? "flex" : "hidden"}`}
          >
            <DataBudidaya action={action} />
          </div>

          {/*//! DATA TANGKAP */}
          <div
            className={`${page !== labels.home && dataset === "tangkap" ? "flex" : "hidden"}`}
          >
            <DataTangkap action={action} />
          </div>

          {/*//! DATA COLDCHAIN */}
          <div
            className={`${page !== labels.home && dataset === "cold_chain" ? "flex" : "hidden"}`}
          >
            <DataColdChain action={action} />
          </div>
        </div>
      </div>

      {/* Alert */}
      <div className={confirmUpdated || confirmAdded ? "flex" : "hidden"}>
        <AlertNotif
          type="single"
          msg={confirmUpdated || confirmAdded}
          yesText="OK"
          confirm={handleAlert}
          icon={
            confirmUpdated === (labels.noUpdate || labels.noAdd)
              ? "warning"
              : "success"
          }
        />
      </div>
    </>
  );
}
