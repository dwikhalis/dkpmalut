"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { LeftChevron, VerticalThreeDot } from "@/public/icons/iconSets";
import Button from "./Button";
import { getMitraDatasetPages } from "@/lib/supabase/supabaseHelper";
import DataMitra from "./DataMitra";
import { useAuthStore } from "../Stores/authStores";
import type { EditSource } from "./DatasetConfig";

const DatasetConfig = dynamic(() => import("./DatasetConfig"), {
  loading: () => <div className="p-10 text-center">Loading...</div>,
  ssr: false,
});

type ActionType = "add" | "edit" | "list" | "delete";

type MitraDataPage = {
  id: string;
  label: string;
};

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function AdminMitraDataset() {
  const router = useRouter();
  const pathname = usePathname();

  const loading = useAuthStore((state) => state.loading);
  const userId = useAuthStore((state) => state.userId);
  const role = useAuthStore((state) => state.role);
  const userName = useAuthStore((state) => state.profile?.organization);

  const [action, setAction] = useState<ActionType>("list");
  const [mainPage, setMainPage] = useState<"main" | "add" | "edit" | "delete">(
    "main",
  );

  const [mitraDataPages, setMitraDataPages] = useState<MitraDataPage[]>([]);
  const [showMobileAction, setShowMobileAction] = useState(false);
  const [saveData, setSaveData] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const editDataset: EditSource = "data_mitra";

  const homeLabel = "Data Mitra" + (userName ? ` : ${userName}` : "");

  const labels = {
    home: homeLabel,
    add: "Tambah Dataset",
    edit: "Atur Dataset",
    delete: "Hapus Dataset",
  };

  const currentSlug = useMemo(() => {
    const basePath = "/profile/data";
    const marker = `${basePath}/`;

    if (pathname === basePath || pathname === `${basePath}/`) {
      return "";
    }

    if (!pathname.startsWith(marker)) {
      return "";
    }

    return decodeURIComponent(pathname.replace(marker, "").split("/")[0] ?? "");
  }, [pathname]);

  const selectedDataset = useMemo(() => {
    if (!currentSlug) return null;

    return (
      mitraDataPages.find((dataset) => toSlug(dataset.label) === currentSlug) ??
      null
    );
  }, [currentSlug, mitraDataPages]);

  const isDetailPage = Boolean(currentSlug);

  const pageTitle =
    mainPage === "add"
      ? labels.add
      : mainPage === "edit"
        ? labels.edit
        : mainPage === "delete"
          ? labels.delete
          : selectedDataset?.label || labels.home;

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
  }, [loading, userId, role, refreshKey]);

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

  if (loading) {
    return <div className="p-10 text-center">Loading...</div>;
  }

  if (!userId || (role !== "admin" && role !== "partner")) {
    return null;
  }

  const resetToHome = () => {
    setMainPage("main");
    setAction("list");
    setShowMobileAction(false);
    router.push("/profile/data");
  };

  const handleSignalAction = () => {
    setAction("list");
  };

  const handleSignalDatasetAction = () => {
    setRefreshKey((prev) => prev + 1);
    resetToHome();
  };

  return (
    <div className="flex w-full min-w-0 max-w-full overflow-hidden">
      {mainPage === "main" && (
        <div className="flex w-full min-w-0 max-w-full flex-col overflow-hidden">
          <div
            className={`flex relative items-center justify-center ${
              role === "admin" ? "mt-3 mb-6" : ""
            }`}
          >
            <div
              className={`${
                !isDetailPage ? "hidden" : "flex"
              } flex items-center justify-start py-3 pr-3 cursor-pointer`}
              onClick={resetToHome}
            >
              <LeftChevron className="size-6" />
            </div>

            <h3 className="font-bold text-center mx-auto">{pageTitle}</h3>

            {!isDetailPage && (
              <details three-dot-menu="true" className="absolute right-0 group">
                <summary className="list-none cursor-pointer rounded-sm border-2 border-white hover:border-black bg-white px-1 py-1 text-xs group-open:border-2 group-open:border-black">
                  <VerticalThreeDot className="size-6" />
                </summary>

                <div className="flex flex-col absolute right-0 z-30 mt-2 rounded-lg border border-gray-400 bg-white shadow-lg p-2">
                  <button
                    className="whitespace-nowrap text-left text-sm hover:bg-sky-200 px-2 p-2"
                    onClick={() => {
                      setMainPage("add");
                      setAction("add");
                    }}
                  >
                    Tambah Dataset
                  </button>

                  <button
                    className="whitespace-nowrap text-left text-sm hover:bg-sky-200 px-2 p-2"
                    onClick={() => {
                      setMainPage("edit");
                      setAction("edit");
                    }}
                  >
                    Atur Dataset
                  </button>

                  <button
                    className="whitespace-nowrap text-left text-sm hover:bg-sky-200 px-2 p-2"
                    onClick={() => {
                      setMainPage("delete");
                      setAction("delete");
                    }}
                  >
                    Hapus Dataset
                  </button>
                </div>
              </details>
            )}

            {isDetailPage && selectedDataset && (
              <>
                <div className="hidden md:flex justify-center items-center">
                  <details
                    three-dot-menu="true"
                    className="absolute right-0 group"
                  >
                    <summary
                      className={`list-none cursor-pointer rounded-sm border-2 border-white hover:border-black bg-white px-1 py-1 text-xs group-open:border-2 group-open:border-black ${
                        action === "edit" ||
                        action === "add" ||
                        action === "delete"
                          ? "hidden"
                          : "flex"
                      }`}
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

                  <div className="flex gap-1">
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

                <div className="flex md:hidden justify-center items-center">
                  <div
                    className="flex py-3 pl-3"
                    onClick={() => setShowMobileAction(true)}
                  >
                    <VerticalThreeDot className="size-6 cursor-pointer hover:border rounded-sm" />
                  </div>
                </div>
              </>
            )}
          </div>

          {!isDetailPage && (
            <div className="flex w-full min-w-0 max-w-full flex-col gap-6 mb-6 px-1 py-2">
              {mitraDataPages.map((dataset) => (
                <button
                  key={dataset.id}
                  type="button"
                  className="flex flex-col p-3 border-1 border-stone-200 bg-white hover:bg-sky-800 hover:text-white rounded-2xl shadow-xl text-center cursor-pointer"
                  onClick={() => {
                    setAction("list");
                    router.push(`/profile/data/${toSlug(dataset.label)}`);
                  }}
                >
                  {dataset.label}
                </button>
              ))}
            </div>
          )}

          {isDetailPage && selectedDataset && (
            <DataMitra
              dataMitraId={selectedDataset.id}
              action={action}
              saveData={saveData}
              onSignalAction={handleSignalAction}
              role={role}
            />
          )}

          {isDetailPage && !selectedDataset && mitraDataPages.length > 0 && (
            <div className="p-6 text-center text-sm text-gray-600">
              Dataset tidak ditemukan.
            </div>
          )}
        </div>
      )}

      {mainPage !== "main" && (
        <div className="flex min-h-[80vh] w-full min-w-0 max-w-full flex-col overflow-hidden">
          <div className="flex relative items-center justify-center mb-6">
            <div
              className="flex justify-center items-center py-3 pr-3 cursor-pointer"
              onClick={resetToHome}
            >
              <LeftChevron className="size-6" />
            </div>

            <h3 className="font-bold text-center mx-auto">{pageTitle}</h3>

            <div className="hidden md:flex justify-center items-center">
              <div className="flex flex-row gap-1">
                <div onClick={resetToHome}>
                  <Button
                    color="grey"
                    size="lg"
                    textSize="sm"
                    text="Batal"
                    link="none"
                  />
                </div>

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
          </div>

          <div className="flex flex-col gap-6 mb-6 min-h-[60vh]">
            <DatasetConfig
              action={action}
              saveData={saveData}
              onSignalAction={handleSignalDatasetAction}
              userRole={role}
              userId={userId}
              editDataset={editDataset}
            />
          </div>
        </div>
      )}

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
        </div>
      </div>

      <div
        onClick={(e) => e.stopPropagation()}
        className={`fixed md:hidden bottom-0 left-0 flex w-full flex-col justify-center gap-3 rounded-t-2xl bg-stone-900 p-5 transition-transform duration-300 ease-out ${
          action === "edit" || action === "add" || action === "delete"
            ? "translate-y-0"
            : "translate-y-full"
        }`}
      >
        <button
          className="w-full rounded-xl bg-gray-600 border-2 border-white py-2 text-md text-white"
          onClick={() => {
            if (mainPage !== "main") {
              resetToHome();
              return;
            }

            setAction("list");
          }}
        >
          Batal
        </button>

        {(action === "edit" || action === "add") && (
          <button
            className="w-full rounded-xl bg-green-600 border-2 border-white py-2 text-md text-white"
            onClick={() => setSaveData((prev) => prev + 1)}
          >
            Simpan
          </button>
        )}

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
