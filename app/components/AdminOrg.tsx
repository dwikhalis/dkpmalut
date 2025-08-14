"use client";

import React from "react";
import { useState } from "react";
import ListStaff from "./ListStaff";
import AdminStaffAdd from "./AdminStaffAdd";
import AdminStaffEdit from "./AdminStaffEdit";
import AlertNotif from "./AlertNotif";
import { LeftChevron } from "@/public/icons/iconSets";

interface Staff {
  id: string;
  name: string;
  photo: string;
  title: string;
  division: string;
  gender: string;
}

export default function AdminOrg() {
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [confirmUpdated, setConfirmUpdated] = useState("");
  const [page, setPage] = useState("Organisasi");

  const home = "Organisasi";
  const addStaff = "Tambah Staff";
  const editStaff = "Edit Staff";
  const listStaff = "List Staff";

  const handleDataFromChild = (childData: Staff) => {
    setPage(editStaff);
    setSelectedStaff(childData);
  };

  const handleSignalUpdated = (signal: string) => {
    let message = "";

    if (signal === "No Update") {
      message = "Tidak ada perubahan data staff";
      setConfirmUpdated(message);
    } else {
      message = `Data staff "${signal}" telah diupdate`;
      setConfirmUpdated(message);
    }
    setPage(listStaff);
  };

  const handleAlert = (signal: boolean) => {
    if (signal) {
      setConfirmUpdated("");
    }
  };

  return (
    <>
      <div className="flex flex-col">
        <div className="relative flex items-center my-8">
          {/* //! Button Back */}
          <div
            className={`${
              page === "Organisasi" ? "hidden" : "flex"
            } flex absolute left-0 py-6 pr-12`}
            onClick={() => {
              setPage("Organisasi");
            }}
          >
            <LeftChevron className="size-6" />
          </div>

          {/* //! Page Name */}
          <h3 className="font-bold text-center mx-auto">{page}</h3>
        </div>
        <div className="flex flex-col gap-6 mb-12 min-h-[60vh]">
          {/* //! Button List STAFF */}
          <div
            className={`${
              page === home ? "flex" : "hidden"
            } flex-col p-3 border-1 border-stone-100 bg-stone-100 hover:bg-black hover:text-white rounded-2xl shadow-xl text-center cursor-pointer`}
            onClick={() => {
              setSelectedStaff(null);
              setPage("List Staff");
            }}
          >
            List Staff
          </div>

          {/* //! Button ADD STAFF */}
          <div
            className={`${
              page === home ? "flex" : "hidden"
            } flex-col p-3 hover:bg-black border-1 border-stone-100 hover:text-white bg-stone-100 rounded-2xl shadow-xl text-center cursor-pointer`}
            onClick={() => {
              setSelectedStaff(null);
              setPage("Tambah Staff");
            }}
          >
            Tambah Staff
          </div>

          {/* //! CONTENT : ADD STAFF */}
          <div className={`${page === addStaff ? "flex" : "hidden"} `}>
            <AdminStaffAdd />
          </div>

          {/* //! CONTENT : STAFF LIST */}
          <div className={`${page === listStaff ? "flex" : "hidden"}`}>
            <ListStaff admin={true} sendToParent={handleDataFromChild} />
          </div>

          {/* //! CONTENT : EDIT STAFF */}
          <div className={`${page === editStaff ? "flex" : "hidden"}`}>
            {selectedStaff && (
              <AdminStaffEdit
                oldData={selectedStaff}
                signalUpdated={handleSignalUpdated}
              />
            )}
          </div>
        </div>
      </div>

      {/* //! ALERT UPDATED */}
      <div className={confirmUpdated ? "flex" : "hidden"}>
        <AlertNotif
          type="single"
          msg={confirmUpdated}
          yesText="OK"
          confirm={handleAlert}
        />
      </div>
    </>
  );
}
