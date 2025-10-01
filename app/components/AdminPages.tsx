"use client";

import React, { useState } from "react";
import { LeftChevron } from "@/public/icons/iconSets";
import FormAdd from "./FormAdd";
import FormEdit from "./FormEdit";
import ListManager from "./ListManager";
import AlertNotif from "./AlertNotif";

interface DataTypes {
  id: string;
  name?: string;
  image?: string;
  photo?: string;
  title?: string;
  division?: string;
  gender?: string;
  tag?: string;
  date?: string;
  content?: string;
  source?: string;
  description?: string;
}

interface Props {
  type: "staff" | "gallery" | "news";
}

export default function AdminPages({ type }: Props) {
  const [selectedItem, setSelectedItem] = useState<DataTypes | null>(null);
  const [confirmUpdated, setConfirmUpdated] = useState("");
  const [confirmAdded, setConfirmAdded] = useState("");

  // Allow `page` to be *any* string, since you have many variations
  const [page, setPage] = useState<string>(getHomePage());

  function getHomePage() {
    if (type === "staff") return "Organisasi";
    if (type === "gallery") return "Galeri";
    return "Berita";
  }

  const labels = {
    home: getHomePage(),
    add:
      type === "staff"
        ? "Tambah Staff"
        : type === "gallery"
          ? "Tambah Galeri"
          : "Tambah Berita",
    edit:
      type === "staff"
        ? "Edit Staff"
        : type === "gallery"
          ? "Edit Galeri"
          : "Edit Berita",
    list:
      type === "staff"
        ? "List Staff"
        : type === "gallery"
          ? "List Galeri"
          : "List Berita",
    noUpdate:
      type === "staff"
        ? "Tidak ada perubahan data staff"
        : type === "gallery"
          ? "Tidak ada perubahan data galeri"
          : "Tidak ada perubahan data berita",
    noAdd:
      type === "staff"
        ? "Tidak ada penambahan data staff"
        : type === "gallery"
          ? "Tidak ada penambahan data galeri"
          : "Tidak ada penambahan data berita",
    updated: (name: string) =>
      type === "staff"
        ? `Data staff "${name}" telah diupdate`
        : type === "gallery"
          ? `Data galeri "${name}" telah diupdate`
          : `Data berita "${name}" telah diupdate`,
    added: (name: string) =>
      type === "staff"
        ? `Data staff "${name}" telah ditambahkan`
        : type === "gallery"
          ? `Data galeri "${name}" telah ditambahkan`
          : `Data berita "${name}" telah ditambahkan`,
  };

  const handleDataFromChild = (childData: DataTypes) => {
    setPage(labels.edit);
    setSelectedItem(childData);
  };

  const handleSignalUpdated = (signal: string) => {
    setConfirmUpdated(
      signal === "No Update" ? labels.noUpdate : labels.updated(signal)
    );
    setPage(labels.list);
  };

  const handleSignalAdded = (signal: string) => {
    setConfirmAdded(signal === "No Add" ? labels.noAdd : labels.added(signal));
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
        <div className="relative flex items-center my-8">
          {/* Back Button */}
          <div
            className={`${
              page === labels.home ? "hidden" : "flex"
            } flex absolute left-0 py-6 pr-12 cursor-pointer`}
            onClick={() => setPage(labels.home)}
          >
            <LeftChevron className="size-6" />
          </div>

          <h3 className="font-bold text-center mx-auto">{page}</h3>
        </div>

        <div className="flex flex-col gap-6 mb-12 min-h-[60vh]">
          {/* List Button */}
          <div
            className={`${
              page === labels.home ? "flex" : "hidden"
            } flex-col p-3 border-1 border-stone-100 bg-stone-100 hover:bg-sky-800 hover:text-white rounded-2xl shadow-xl text-center cursor-pointer`}
            onClick={() => {
              setSelectedItem(null);
              setPage(labels.list);
            }}
          >
            {labels.list}
          </div>

          {/* Add Button */}
          <div
            className={`${
              page === labels.home ? "flex" : "hidden"
            } flex-col p-3 hover:bg-sky-800 border-1 border-stone-100 hover:text-white bg-stone-100 rounded-2xl shadow-xl text-center cursor-pointer`}
            onClick={() => {
              setSelectedItem(null);
              setPage(labels.add);
            }}
          >
            {labels.add}
          </div>

          {/* Add Form */}
          <div className={`${page === labels.add ? "flex" : "hidden"}`}>
            <FormAdd type={type} signalAdded={handleSignalAdded} />
          </div>

          {/* List Manager */}
          <div className={`${page === labels.list ? "flex" : "hidden"}`}>
            <ListManager
              admin={true}
              type={type}
              sendToParent={handleDataFromChild}
            />
          </div>

          {/* Edit Form */}
          <div className={`${page === labels.edit ? "flex" : "hidden"}`}>
            {selectedItem && (
              <FormEdit
                type={type}
                oldData={selectedItem}
                signalUpdated={handleSignalUpdated}
              />
            )}
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
