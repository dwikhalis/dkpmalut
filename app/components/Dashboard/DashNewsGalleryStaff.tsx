"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { LeftChevron } from "@/public/icons/iconSets";
import FormAdd from "../FormAdd";
import FormEdit from "../FormEdit";
import ListManager from "../ListManager";
import AlertNotif from "../AlertNotif";
import AuthAdminAccess from "@/app/Auth/AuthAdminAccess";
import {
  getGallery,
  getNews,
  getStaff,
} from "@/lib/supabase/supabaseHelper";

interface DataTypes {
  id: string;
  name?: string;
  image?: string;
  photo?: string;
  title?: string;
  position?: string;
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

export default function DashNewsGalleryStaff({ type }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [selectedItem, setSelectedItem] = useState<DataTypes | null>(null);
  const [confirmUpdated, setConfirmUpdated] = useState("");
  const [confirmAdded, setConfirmAdded] = useState("");

  // Allow `page` to be *any* string, since you have many variations
  const labels = useMemo(
    () => ({
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
    }),
    [type],
  );

  function getInitialPage() {
    const view = searchParams.get("view");

    if (view === "add") return labels.add;
    if (view === "edit") return labels.edit;

    return labels.list;
  }

  const [page, setPageState] = useState<string>(getInitialPage());

  function getHomePage() {
    if (type === "staff") return "Organisasi";
    if (type === "gallery") return "Galeri";
    return "Berita";
  }

  async function getRows() {
    if (type === "staff") {
      return getStaff();
    }

    if (type === "gallery") {
      return getGallery();
    }

    return getNews();
  }

  function setPage(nextPage: string, itemId?: string) {
    setPageState(nextPage);

    const params = new URLSearchParams(searchParams.toString());

    if (nextPage === labels.list) {
      params.delete("view");
      params.delete("id");
      params.delete("mode");
    } else if (nextPage === labels.add) {
      params.set("view", "add");
      params.delete("id");
      params.delete("mode");
    } else if (nextPage === labels.edit) {
      params.set("view", "edit");
      params.delete("mode");

      if (itemId) {
        params.set("id", itemId);
      }
    }

    params.delete("lang");

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }

  useEffect(() => {
    const view = searchParams.get("view");

    if (view === "add") {
      setPageState(labels.add);
    } else if (view === "edit") {
      setPageState(labels.edit);
    } else {
      setPageState(labels.list);
    }
  }, [searchParams, labels]);

  useEffect(() => {
    const view = searchParams.get("view");
    const itemId = searchParams.get("id");

    if (view !== "edit" || !itemId || selectedItem?.id === itemId) {
      return;
    }

    let active = true;

    async function loadSelectedItem() {
      const rows = await getRows();
      const item = rows.find((row) => row.id === itemId);

      if (active && item) {
        setSelectedItem(item);
      }
    }

    void loadSelectedItem();

    return () => {
      active = false;
    };
  }, [searchParams, selectedItem, type]);

  const handleDataFromChild = (childData: DataTypes) => {
    setSelectedItem(childData);
    setPage(labels.edit, childData.id);
  };

  const handleSignalUpdated = (signal: string) => {
    setConfirmUpdated(
      signal === "No Update" ? labels.noUpdate : labels.updated(signal),
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
    <AuthAdminAccess>
      <div className="flex min-h-[90vh] w-full flex-col gap-6">
        <div className="relative flex items-center">
          {/* Back Button */}
          <div
            className={`${
              page === labels.list ? "hidden" : "flex"
            } flex absolute left-0 py-6 pr-12 cursor-pointer`}
            onClick={() => setPage(labels.list)}
          >
            <LeftChevron className="size-6" />
          </div>

          <p className="font-bold text-center mx-auto text-lg">{page}</p>
        </div>

        <div className="flex flex-col gap-6 mb-12 min-h-[60vh]">
          {page === labels.list && (
            <div className="rounded-2xl bg-white p-4 shadow-md">
              <div className="flex gap-3">
                <button type="button" className="flex-1 rounded-lg bg-sky-800 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-900" onClick={() => { setSelectedItem(null); setPage(labels.add); }}>{labels.add}</button>
                <Link href={`${pathname}/config`} className="rounded-lg border border-sky-800 px-4 py-2 text-sm font-semibold text-sky-800">Konfigurasi</Link>
              </div>
            </div>
          )}

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
    </AuthAdminAccess>
  );
}
