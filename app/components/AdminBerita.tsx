"use client";

import React, { useState } from "react";
import AdminBeritaAdd from "./AdminBeritaAdd";
import { LeftChevron } from "@/public/icons/iconSets";
import AdminBeritaEdit from "./AdminBeritaEdit";
import ListNews from "./ListNews";
import AlertNotif from "./AlertNotif";

interface News {
  id: string;
  image: string;
  tag: string;
  date: string;
  title: string;
  content: string;
  source: string;
}

export default function AdminBerita() {
  const [selectedNews, setSelectedNews] = useState<News | null>(null);
  const [confirmUpdated, setConfirmUpdated] = useState("");
  const [page, setPage] = useState("Berita");

  const home = "Berita";
  const addNews = "Tambah Berita";
  const editNews = "Edit Berita";
  const listNews = "List Berita";

  const handleDataFromChild = (childData: News) => {
    setPage(editNews);
    setSelectedNews(childData);
  };

  const handleSignalUpdated = (signal: string) => {
    let message = "";

    if (signal === "No Update") {
      message = "Tidak ada perubahan data berita";
      setConfirmUpdated(message);
    } else {
      message = `Data berita "${signal}" telah diupdate`;
      setConfirmUpdated(message);
    }
    setPage(listNews);
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
              page === "Berita" ? "hidden" : "flex"
            } flex absolute left-0 py-6 pr-12`}
            onClick={() => {
              setPage("Berita");
            }}
          >
            <LeftChevron className="size-6" />
          </div>

          {/* //! Page Name */}
          <h3 className="font-bold text-center mx-auto">{page}</h3>
        </div>
        <div className="flex flex-col gap-6 mb-12 min-h-[60vh]">
          {/* //! Button List NEWS */}
          <div
            className={`${
              page === home ? "flex" : "hidden"
            } flex-col p-3 border-1 border-stone-100 bg-stone-100 hover:bg-black hover:text-white rounded-2xl shadow-xl text-center cursor-pointer`}
            onClick={() => {
              setSelectedNews(null);
              setPage("List Berita");
            }}
          >
            List Berita
          </div>

          {/* //! Button ADD NEWS */}
          <div
            className={`${
              page === home ? "flex" : "hidden"
            } flex-col p-3 hover:bg-black border-1 border-stone-100 hover:text-white bg-stone-100 rounded-2xl shadow-xl text-center cursor-pointer`}
            onClick={() => {
              setSelectedNews(null);
              setPage("Tambah Berita");
            }}
          >
            Tambah Berita
          </div>

          {/* //! CONTENT : ADD NEWS */}
          <div className={`${page === addNews ? "flex" : "hidden"} `}>
            <AdminBeritaAdd />
          </div>

          {/* //! CONTENT : NEWS LIST */}
          <div className={`${page === listNews ? "flex" : "hidden"}`}>
            <ListNews admin={true} sendToParent={handleDataFromChild} />
          </div>

          {/* //! CONTENT : EDIT NEWS */}
          <div className={`${page === editNews ? "flex" : "hidden"}`}>
            {selectedNews && (
              <AdminBeritaEdit
                oldData={selectedNews}
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
