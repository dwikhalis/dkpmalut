"use client";

import React from "react";
import { useState } from "react";
import StaffList from "./StaffList";
import AdminAddStaff from "./AdminAddStaff";
import AdminEditStaff from "./AdminEditStaff";

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
  const [showEdit, setShowEdit] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);

  const handleDataFromChild = (childData: Staff) => {
    setSelectedStaff(childData);
  };

  return (
    <div className="flex flex-col">
      <h3 className="font-bold text-center my-12 ml-8 md:ml-12">Organisasi</h3>
      <div className="flex flex-col gap-6 mb-12 min-h-[60vh]">
        {/* //! EDIT STAFF */}
        <div
          className={`${
            showEdit ? "hidden" : "flex"
          } flex-col p-3 border-1 border-stone-100 bg-stone-100 hover:bg-black hover:text-white ml-8 md:ml-12 rounded-2xl shadow-xl text-center cursor-pointer`}
          onClick={() => {
            setShowEdit(true);
            setShowAdd(false);
          }}
        >
          Edit Staff
        </div>
        {/* Pseudo Button Edit Staff */}
        <div
          className={`${
            showEdit ? "flex" : "hidden"
          } flex-col p-3 border-1 bg-black text-white border-stone-200 ml-8 md:ml-12 rounded-2xl shadow-xl text-center cursor-pointer`}
          onClick={() => setShowEdit(false)}
        >
          Edit Staff
        </div>

        {/* //! ADD STAFF */}
        <div
          className={`${
            showAdd ? "hidden" : "flex"
          } flex-col p-3 hover:bg-black border-1 border-stone-100 hover:text-white bg-stone-100 ml-8 md:ml-12 rounded-2xl shadow-xl text-center cursor-pointer`}
          onClick={() => {
            setShowAdd(true);
            setShowEdit(false);
          }}
        >
          Tambah Staff
        </div>
        {/* Pseudo Button Add Staff */}
        <div
          className={`${
            showAdd ? "flex" : "hidden"
          } flex-col p-3 border-1 bg-black text-white border-stone-200 ml-8 md:ml-12 rounded-2xl shadow-xl text-center cursor-pointer`}
          onClick={() => setShowAdd(false)}
        >
          Tambah Staff
        </div>

        {/* //! CONTENT : ADD STAFF */}
        <div className={`${showAdd ? "flex" : "hidden"} `}>
          <AdminAddStaff />
        </div>

        {/* //! CONTENT : STAFF LIST */}
        <div className={`${showEdit ? "flex" : "hidden"} ml-8 md:ml-12`}>
          <StaffList type="regular" sendToParent={handleDataFromChild} />
        </div>

        {/* //! CONTENT : EDIT STAFF */}
        <div>{selectedStaff && <AdminEditStaff oldData={selectedStaff} />}</div>
      </div>
    </div>
  );
}
