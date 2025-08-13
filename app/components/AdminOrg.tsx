"use client";

import React from "react";
import { useState } from "react";
import StaffList from "./StaffList";
import AdminAddStaff from "./AdminAddStaff";
import AdminEditStaff from "./AdminEditStaff";
import AlertNotif from "./AlertNotif";

interface Staff {
  id: string;
  name: string;
  photo: string;
  title: string;
  division: string;
  gender: string;
}

export default function AdminOrg() {
  const [showAdd, setShowAdd] = useState(false);
  const [showList, setShowList] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [updated, setUpdated] = useState("");

  const handleDataFromChild = (childData: Staff) => {
    setShowList(false);
    setSelectedStaff(childData);
    setShowEdit(true);
  };

  const handleSignalUpdated = (signal: string) => {
    const message = `Data staff ${signal} telah diupdate`;
    setUpdated(message);
    setShowEdit(false);
    setShowList(true);
  };

  const handleAlert = (signal: boolean) => {
    signal ? setUpdated("") : null;
  };

  return (
    <>
      <div className="flex flex-col">
        <h3 className="font-bold text-center my-8">Organisasi</h3>
        <div className="flex flex-col gap-6 mb-12 min-h-[60vh]">
          {/* //! List STAFF */}
          <div
            className={`${
              showList ? "hidden" : "flex"
            } flex-col p-3 border-1 border-stone-100 bg-stone-100 hover:bg-black hover:text-white rounded-2xl shadow-xl text-center cursor-pointer`}
            onClick={() => {
              setShowList(true);
              setShowAdd(false);
              setShowEdit(false);
              setSelectedStaff(null);
            }}
          >
            List Staff
          </div>
          {/* Pseudo Button List Staff */}
          <div
            className={`${
              showList ? "flex" : "hidden"
            } flex-col p-3 border-1 bg-black text-white border-stone-200 rounded-2xl shadow-xl text-center cursor-pointer`}
            onClick={() => setShowList(false)}
          >
            List Staff
          </div>

          {/* //! ADD STAFF */}
          <div
            className={`${
              showAdd ? "hidden" : "flex"
            } flex-col p-3 hover:bg-black border-1 border-stone-100 hover:text-white bg-stone-100 rounded-2xl shadow-xl text-center cursor-pointer`}
            onClick={() => {
              setShowAdd(true);
              setShowList(false);
              setShowEdit(false);
              setSelectedStaff(null);
            }}
          >
            Tambah Staff
          </div>
          {/* Pseudo Button Add Staff */}
          <div
            className={`${
              showAdd ? "flex" : "hidden"
            } flex-col p-3 border-1 bg-black text-white border-stone-200 rounded-2xl shadow-xl text-center cursor-pointer`}
            onClick={() => setShowAdd(false)}
          >
            Tambah Staff
          </div>

          {/* //! CONTENT : ADD STAFF */}
          <div className={`${showAdd ? "flex" : "hidden"} `}>
            <AdminAddStaff />
          </div>

          {/* //! CONTENT : STAFF LIST */}
          <div className={`${showList ? "flex" : "hidden"}`}>
            <StaffList admin={true} sendToParent={handleDataFromChild} />
          </div>

          {/* //! CONTENT : EDIT STAFF */}
          <div className={`${showEdit ? "flex" : "hidden"}`}>
            {selectedStaff && (
              <AdminEditStaff
                oldData={selectedStaff}
                signalUpdated={handleSignalUpdated}
              />
            )}
          </div>
        </div>
      </div>

      {/* //! ALERT UPDATED */}
      <div className={updated ? "flex" : "hidden"}>
        <AlertNotif
          type="single"
          msg={updated}
          yesText="OK"
          confirm={handleAlert}
        />
      </div>
    </>
  );
}
