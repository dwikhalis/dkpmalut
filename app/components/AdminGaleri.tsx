"use client";

import React, { useState } from "react";
import AdminGaleriAdd from "./AdminGaleriAdd";
import AdminGaleriEdit from "./AdminGaleriEdit";
import { LeftChevron } from "@/public/icons/iconSets";
import ListGallery from "./ListGallery";
import AlertNotif from "./AlertNotif";

interface Gallery {
  id: string;
  image: string;
  tag: string;
  title: string;
  date: string;
  description: string;
}

export default function AdminGaleri() {
  const [selectedGallery, setSelectedGallery] = useState<Gallery | null>(null);
  const [confirmUpdated, setConfirmUpdated] = useState("");
  const [page, setPage] = useState("Galeri");

  const home = "Galeri";
  const addGallery = "Tambah Galeri";
  const editGallery = "Edit Galeri";
  const listGallery = "List Galeri";

  const handleDataFromChild = (childData: Gallery) => {
    setPage(editGallery);
    setSelectedGallery(childData);
  };

  const handleSignalUpdated = (signal: string) => {
    let message = "";

    if (signal === "No Update") {
      message = "Tidak ada perubahan data galeri";
      setConfirmUpdated(message);
    } else {
      message = `Data galeri "${signal}" telah diupdate`;
      setConfirmUpdated(message);
    }
    setPage(listGallery);
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
              page === "Galeri" ? "hidden" : "flex"
            } flex absolute left-0 py-6 pr-12`}
            onClick={() => {
              setPage("Galeri");
            }}
          >
            <LeftChevron className="size-6" />
          </div>

          {/* //! Page Name */}
          <h3 className="font-bold text-center mx-auto">{page}</h3>
        </div>
        <div className="flex flex-col gap-6 mb-12 min-h-[60vh]">
          {/* //! Button List GALLERY */}
          <div
            className={`${
              page === home ? "flex" : "hidden"
            } flex-col p-3 border-1 border-stone-100 bg-stone-100 hover:bg-black hover:text-white rounded-2xl shadow-xl text-center cursor-pointer`}
            onClick={() => {
              setSelectedGallery(null);
              setPage("List Galeri");
            }}
          >
            List Galeri
          </div>

          {/* //! Button ADD GALLERY */}
          <div
            className={`${
              page === home ? "flex" : "hidden"
            } flex-col p-3 hover:bg-black border-1 border-stone-100 hover:text-white bg-stone-100 rounded-2xl shadow-xl text-center cursor-pointer`}
            onClick={() => {
              setSelectedGallery(null);
              setPage("Tambah Galeri");
            }}
          >
            Tambah Galeri
          </div>

          {/* //! CONTENT : ADD GALLERY */}
          <div className={`${page === addGallery ? "flex" : "hidden"} `}>
            <AdminGaleriAdd />
          </div>

          {/* //! CONTENT : GALLERY LIST */}
          <div className={`${page === listGallery ? "flex" : "hidden"}`}>
            <ListGallery admin={true} sendToParent={handleDataFromChild} />
          </div>

          {/* //! CONTENT : EDIT STAFF */}
          <div className={`${page === editGallery ? "flex" : "hidden"}`}>
            {selectedGallery && (
              <AdminGaleriEdit
                oldData={selectedGallery}
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
