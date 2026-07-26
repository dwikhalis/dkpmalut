"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LeftChevron, RightChevron, VerticalThreeDot } from "@/public/icons/iconSets";
import Button from "../Button";
import { getDatasetPages } from "@/lib/supabase/supabaseHelper";
import Dataset from "../Dataset";
import MapDataset from "../Maps/MapDataset";
import { useAuthStore } from "@/app/Stores/authStores";
import type { EditSource } from "../DatasetConfig";
import { supabase } from "@/lib/supabase/supabaseClient";
import SpinnerLoading from "../SpinnerLoading";
import {
  collectionToCsv,
  isFeatureCollection,
} from "@/lib/utils/mapConfig";
import { useCollapsibleMount } from "@/lib/hooks/useCollapsibleMount";

const DatasetConfig = dynamic(() => import("../DatasetConfig"), {
  loading: () => (
    <div className="flex w-full items-center justify-center rounded-2xl border border-stone-200 bg-white p-4 shadow-md">
      <SpinnerLoading size="sm" color="black" />
    </div>
  ),
  ssr: false,
});

interface Props {
  onSignal?: (value: string) => void;
}

type ActionType = "add" | "edit" | "list" | "delete";
type MainPage = "main" | "add" | "edit" | "delete" | "mapadd";
type DetailView =
  | "dataset"
  | "visualization"
  | "publication"
  | "mapadd"
  | "mapdataset"
  | "mapvisualization"
  | "maplegend"
  | "mappreview";

const noopSignal = () => undefined;

type DatasetPage = {
  id: string;
  label: string;
  user_id: string | null;
  published: "approved" | "requested" | "rejected" | null;
  import_status?: "draft" | "ready" | null;
  draft_expires_at?: string | null;
  kind: "dataset" | "map";
};

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function tableRowsToCsv(rows: Record<string, unknown>[]) {
  const headers = Array.from(
    rows.reduce<Set<string>>((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set()),
  );

  const escapeValue = (value: unknown) => {
    if (value === null || value === undefined) return "";

    const text =
      typeof value === "object" ? JSON.stringify(value) : String(value);

    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escapeValue(row[header])).join(",")),
  ].join("\n");
}

type OwnerRow = {
  id: string;
  username: string | null;
  organization: string | null;
  role: string | null;
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

function getSafeView(value: string | null): DetailView {
  if (value === "mapadd") {
    return "mapadd";
  }

  if (value === "mapdataset") {
    return "mapdataset";
  }

  if (value === "mapvisualization" || value === "maplegend") {
    return "mapvisualization";
  }

  if (value === "mappreview") {
    return "mapvisualization";
  }

  if (value === "chart" || value === "visualization") {
    return "visualization";
  }

  if (value === "publication") {
    return "publication";
  }

  return "dataset";
}

function formatDraftExpiry(value?: string | null) {
  if (!value) return "Draft ini belum memiliki tanggal kedaluwarsa.";

  return `Draft otomatis dihapus pada ${new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))}.`;
}

function getPublicationStatus(
  dataset: DatasetPage,
): {
  label: string;
  className: string;
  title?: string;
} {
  if (dataset.import_status === "draft") {
    return {
      label: "draft",
      className: "bg-violet-100 text-violet-800 ring-1 ring-violet-200",
      title: formatDraftExpiry(dataset.draft_expires_at),
    };
  }

  const status = dataset.published;

  if (status === "requested") {
    return {
      label: "requested",
      className: "bg-amber-100 text-amber-800",
    };
  }

  if (status === "approved") {
    return {
      label: "published",
      className: "bg-emerald-100 text-emerald-800",
    };
  }

  if (status === "rejected") {
    return {
      label: "rejected",
      className: "bg-rose-100 text-rose-800",
    };
  }

  return {
    label: "not published",
    className: "bg-gray-200 text-gray-700",
  };
}

export default function DashData({ onSignal = noopSignal }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const loading = useAuthStore((state) => state.loading);
  const userId = useAuthStore((state) => state.userId);
  const role = useAuthStore((state) => state.role);
  const userName = useAuthStore((state) => state.profile?.organization);

  const [action, setAction] = useState<ActionType>("list");
  const [mainPage, setMainPage] = useState<MainPage>("main");

  const [datasetPages, setDatasetPages] = useState<DatasetPage[]>([]);
  const [ownerRows, setOwnerRows] = useState<OwnerRow[]>([]);
  const [showMobileAction, setShowMobileAction] = useState(false);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(null);
  const [saveData, setSaveData] = useState(0);
  const [actionChangeCount, setActionChangeCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [addDataReady, setAddDataReady] = useState(false);
  const mountedRef = useRef(false);

  const editDataset: EditSource = "datasets";

  const labels = {
    home: "Data",
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
      datasetPages.find((dataset) => toSlug(dataset.label) === currentSlug) ??
      null
    );
  }, [currentSlug, datasetPages]);

  const detailView =
    searchParams.get("action") === "mapadd"
      ? "mapadd"
      : getSafeView(searchParams.get("view"));
  const isNewMapPage = currentSlug === "peta-baru" && detailView === "mapadd";
  const isDetailPage = Boolean(currentSlug);
  const isMapDetail = selectedDataset?.kind === "map" || isNewMapPage;
  const detailPageLabel = isMapDetail
    ? action === "add" || detailView === "mapadd"
      ? "Tambah Layer"
      : action === "edit"
        ? "Edit Layer"
        : action === "delete"
          ? "Hapus Layer"
          : detailView === "mapvisualization"
            ? "Visualisasi"
            : detailView === "publication"
              ? "Publikasi"
              : "Layer"
    : detailView === "visualization"
      ? "Visualisasi"
      : detailView === "publication"
        ? "Publikasi"
        : "Dataset";
  const nextDetailView = isMapDetail
    ? detailView === "mapadd"
      ? "mapdataset"
      : detailView === "mapdataset"
        ? "mapvisualization"
        : detailView === "mapvisualization"
        ? "publication"
        : null
    : detailView === "dataset"
      ? "visualization"
      : detailView === "visualization"
        ? "publication"
        : null;
  const nextDetailLabel =
    nextDetailView === "mapdataset"
      ? "Layer"
      : nextDetailView === "mapvisualization"
        ? "Visualisasi"
        : nextDetailView === "visualization"
          ? "Visualisasi"
          : nextDetailView === "publication"
            ? "Publikasi"
            : "";

  const selectedActionOwnerId =
    selectedOwnerId || searchParams.get("owner") || userId;
  const isAddMode = mainPage === "add" || mainPage === "mapadd";
  const showOuterActionButtons = !isAddMode || addDataReady;
  const actionCountLabel =
    action === "delete"
      ? `Hapus (${actionChangeCount})`
      : `Simpan (${actionChangeCount})`;
  const handleActionChangeCount = useCallback((count: number) => {
    if (!mountedRef.current) return;

    setActionChangeCount(count);
  }, []);

  const ownerNameMap = useMemo(() => {
    return ownerRows.reduce<Record<string, string>>((acc, owner) => {
      acc[owner.id] =
        owner.organization || owner.username || "Pengguna tanpa nama";

      return acc;
    }, {});
  }, [ownerRows]);

  const getOwnerName = (ownerId: string | null) => {
    if (!ownerId) return "Tanpa Pemilik";
    if (role === "admin" && ownerId === userId) return "Admin";

    return ownerNameMap[ownerId] ?? "Pengguna tanpa nama";
  };

  const ownerGroups = useMemo(() => {
    const groups = new Map<
      string,
      {
        ownerId: string;
        ownerName: string;
        datasets: DatasetPage[];
      }
    >();

    datasetPages.forEach((dataset) => {
      const ownerId = dataset.user_id ?? "";
      const ownerName = getOwnerName(dataset.user_id);

      if (!groups.has(ownerId)) {
        groups.set(ownerId, {
          ownerId,
          ownerName,
          datasets: [],
        });
      }

      groups.get(ownerId)?.datasets.push(dataset);
    });

    if (groups.size === 0 && userId) {
      groups.set(userId, {
        ownerId: userId,
        ownerName: role === "admin" ? "Admin" : userName || "Data",
        datasets: [],
      });
    }

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        datasets: [...group.datasets].sort((a, b) =>
          a.label.localeCompare(b.label),
        ),
      }))
      .sort((a, b) => {
        if (role === "admin") {
          if (a.ownerId === userId) return -1;
          if (b.ownerId === userId) return 1;
        }

        return a.ownerName.localeCompare(b.ownerName);
      });
  }, [getOwnerName, datasetPages, role, userId, userName]);

  const pageTitle =
    isNewMapPage
      ? "Tambah Peta"
      : mainPage === "mapadd"
        ? labels.add
        : mainPage === "add"
          ? labels.add
          : mainPage === "edit"
            ? labels.edit
            : mainPage === "delete"
              ? labels.delete
              : selectedDataset?.label || labels.home;

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setAddDataReady(false);
    setActionChangeCount(0);
  }, [mainPage, action, detailView]);

  useEffect(() => {
    if (loading || !userId) return;
    if (role !== "admin" && role !== "partner") return;

    const fetchDatasetPages = async () => {
      try {
        const result = await getDatasetPages(
          role === "admin" ? "all" : userId,
        );

        let mapQuery = supabase
          .from("map_datasets")
          .select("id, label, user_id, published, import_status, draft_expires_at")
          .order("label", { ascending: true });

        if (role !== "admin") {
          mapQuery = mapQuery.eq("user_id", userId);
        }

        let { data: mapRows, error: mapError } = await mapQuery;

        if (mapError) {
          console.warn("Map draft columns unavailable, using legacy query:", mapError);

          let fallbackMapQuery = supabase
            .from("map_datasets")
            .select("id, label, user_id, published")
            .order("label", { ascending: true });

          if (role !== "admin") {
            fallbackMapQuery = fallbackMapQuery.eq("user_id", userId);
          }

          const fallbackMapResult = await fallbackMapQuery;

          if (fallbackMapResult.error) throw fallbackMapResult.error;

          mapRows = (fallbackMapResult.data ?? []).map((row) => ({
            ...row,
            import_status: "ready",
            draft_expires_at: null,
          }));
          mapError = null;
        }

        setDatasetPages([
          ...result.map((item) => ({
            ...item,
            kind: "dataset" as const,
          })),
          ...((mapRows ?? []) as Omit<DatasetPage, "kind">[]).map((item) => ({
            ...item,
            label: item.label || "Peta Tanpa Nama",
            kind: "map" as const,
          })),
        ]);

        let ownersQuery = supabase
          .from("users")
          .select("id, username, organization, role")
          .in("role", ["admin", "partner"])
          .order("organization", { ascending: true });

        if (role === "partner") {
          ownersQuery = ownersQuery.eq("id", userId);
        }

        const { data: owners, error: ownersError } = await ownersQuery;

        if (ownersError) throw ownersError;

        setOwnerRows((owners ?? []) as OwnerRow[]);
      } catch (err) {
        console.error("Fetching datasets:", err);
      }
    };

    fetchDatasetPages();
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

  useEffect(() => {
    if (!isDetailPage || mainPage !== "main") {
      return;
    }

    const urlAction = searchParams.get("action");

    if (urlAction === "edit" || urlAction === "add" || urlAction === "delete") {
      setAction(urlAction);
    } else if (urlAction === "tableadd" || urlAction === "addtable") {
      setAction("add");
    } else {
      setAction("list");
    }
  }, [isDetailPage, mainPage, searchParams]);

  useEffect(() => {
    if (isDetailPage) {
      return;
    }

    const urlAction = searchParams.get("action");

    if (urlAction === "mapadd") {
      setSelectedOwnerId(searchParams.get("owner") || userId);
      setMainPage("mapadd");
      setAction("list");
      onSignal("dataset");
      return;
    }

    if (urlAction === "tableadd" || urlAction === "addtable") {
      setSelectedOwnerId(searchParams.get("owner") || userId);
      setMainPage("add");
      setAction("add");
      onSignal("dataset");
      return;
    }

    if (urlAction === "edit" || urlAction === "add" || urlAction === "delete") {
      setSelectedOwnerId(searchParams.get("owner") || userId);
      setMainPage(urlAction);
      setAction(urlAction);
      onSignal("dataset");
      return;
    }

    setSelectedOwnerId(null);
    setMainPage("main");
    setAction("list");
    onSignal("all");
  }, [isDetailPage, onSignal, searchParams, userId]);

  const showSaveCancelAction =
    !showMobileAction &&
    ((isAddMode && addDataReady) ||
      (!isAddMode &&
        (action === "edit" ||
          action === "delete" ||
          (action === "add" && addDataReady))));
  const mobileActions = useCollapsibleMount(showMobileAction);
  const saveCancelActions = useCollapsibleMount(showSaveCancelAction);

  if (loading) {
    return (
      <div className="flex w-full items-center justify-center rounded-2xl border border-stone-200 bg-white p-4 shadow-md">
        <SpinnerLoading size="sm" color="black" />
      </div>
    );
  }

  if (!userId || (role !== "admin" && role !== "partner")) {
    return null;
  }

  const resetToHome = () => {
    setMainPage("main");
    setAction("list");
    setShowMobileAction(false);
    setSelectedOwnerId(null);
    onSignal("all");
    router.push("/profile/data");
  };

  const setDetailView = (view: DetailView) => {
    setAction("list");
    setShowMobileAction(false);

    const params = new URLSearchParams(searchParams.toString());
    params.delete("action");
    params.set("view", view);

    router.replace(`${pathname}?${params.toString()}`, {
      scroll: false,
    });
  };

  const setDetailStep = (view: DetailView) => {
    setDetailView(view);
  };

  const handleDownloadCsv = async () => {
    if (!selectedDataset) return;

    setShowMobileAction(false);

    try {
      if (selectedDataset.kind === "map") {
        const { data: layerRows, error: layerError } = await supabase
          .from("map_layers")
          .select("source_path")
          .eq("map_dataset_id", selectedDataset.id)
          .order("sort_order", { ascending: true });

        if (layerError) throw layerError;

        const collections = await Promise.all(
          (layerRows ?? []).map(async (layer) => {
            if (!layer.source_path) return null;

            const { data, error } = await supabase.storage
              .from("geojsons")
              .download(layer.source_path);

            if (error || !data) return null;

            const parsed = JSON.parse(await data.text());

            return isFeatureCollection(parsed) ? parsed : null;
          }),
        );

        downloadText(
          `${toSlug(selectedDataset.label || "map-data")}.csv`,
          collectionToCsv(collections.filter(isFeatureCollection)),
        );
        return;
      }

      const { data, error } = await supabase
        .from("datasets")
        .select("data")
        .eq("id", selectedDataset.id)
        .maybeSingle();

      if (error) throw error;

      const rawData = data?.data;
      const rows = Array.isArray(rawData)
        ? rawData
        : Array.isArray(rawData?.rows)
          ? rawData.rows
          : Array.isArray(rawData?.data)
            ? rawData.data
            : [];

      downloadText(
        `${toSlug(selectedDataset.label || "dataset")}.csv`,
        tableRowsToCsv(
          rows.filter(
            (row: unknown): row is Record<string, unknown> =>
              typeof row === "object" && row !== null && !Array.isArray(row),
          ),
        ),
      );
    } catch (error) {
      console.error("Failed to download CSV:", error);
    }
  };

  const goToPreviousDetailView = () => {
    if (isMapDetail) {
      if (detailView === "publication") {
        setDetailStep("mapvisualization");
        return;
      }

      if (detailView === "mapvisualization") {
        setDetailStep("mapdataset");
        return;
      }

      if (detailView === "mapdataset") {
        resetToHome();
        return;
      }

      resetToHome();
      return;
    }

    if (detailView === "publication") {
      setDetailStep("visualization");
      return;
    }

    if (detailView === "visualization") {
      setDetailStep("dataset");
      return;
    }

    resetToHome();
  };

  const setDetailAction = (nextAction: ActionType) => {
    setAction(nextAction);
    setShowMobileAction(false);

    const params = new URLSearchParams(searchParams.toString());

    if (nextAction === "list") {
      params.delete("action");
    } else {
      params.set("action", nextAction);
      params.set("view", isMapDetail ? "mapdataset" : "dataset");
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  };

  const setDatasetConfigAction = (
    nextAction: "add" | "edit" | "delete",
    ownerId: string | null,
  ) => {
    setMainPage(nextAction);
    setAction(nextAction);
    setShowMobileAction(false);
    setSelectedOwnerId(ownerId);
    onSignal("dataset");

    const params = new URLSearchParams(searchParams.toString());
    params.set("action", nextAction === "add" ? "tableadd" : nextAction);
    if (ownerId) {
      params.set("owner", ownerId);
    } else {
      params.delete("owner");
    }

    router.replace(`/profile/data?${params.toString()}`, {
      scroll: false,
    });
  };

  const setMapAddAction = (ownerId: string | null) => {
    setMainPage("mapadd");
    setAction("list");
    setShowMobileAction(false);
    setSelectedOwnerId(ownerId);
    onSignal("dataset");

    const params = new URLSearchParams(searchParams.toString());
    params.set("action", "mapadd");

    if (ownerId) {
      params.set("owner", ownerId);
    } else {
      params.delete("owner");
    }

    router.replace(`/profile/data?${params.toString()}`, {
      scroll: false,
    });
  };

  const handleSignalAction = () => {
    if (isDetailPage) {
      setDetailAction("list");
      return;
    }

    setAction("list");
  };

  const handleSignalDatasetAction = () => {
    setRefreshKey((prev) => prev + 1);
    resetToHome();
  };

  const renderGroupActions = (ownerId: string) => (
    <details three-dot-menu="true" className="group">
      <summary className="list-none cursor-pointer rounded-sm border-2 border-white bg-white px-1 py-1 text-xs hover:border-black group-open:border-2 group-open:border-black">
        <VerticalThreeDot className="size-6" />
      </summary>

      <div className="absolute right-0 z-30 mt-2 flex flex-col rounded-lg border border-gray-400 bg-white p-2 shadow-lg">
        {ownerId === userId && (
          <button
            className="whitespace-nowrap px-2 p-2 text-left text-sm hover:bg-sky-200"
            onClick={() => setDatasetConfigAction("add", ownerId)}
          >
            Tambah Dataset
          </button>
        )}

        <button
          className="whitespace-nowrap px-2 p-2 text-left text-sm hover:bg-sky-200"
          onClick={() => setDatasetConfigAction("edit", ownerId)}
        >
          Atur Dataset
        </button>

        <button
          className="whitespace-nowrap px-2 p-2 text-left text-sm hover:bg-sky-200"
          onClick={() => setDatasetConfigAction("delete", ownerId)}
        >
          Hapus Dataset
        </button>
      </div>
    </details>
  );
  return (
    <div className="flex w-full max-w-full overflow-hidden">
      {mainPage === "main" && (
        <div className="flex w-full min-w-0 max-w-full flex-col overflow-hidden">
          <div className="mb-6 flex w-full min-w-0 items-center gap-3">
            {isDetailPage && (
              <Button
                variant="ghost"
                size="custom"
                aria-label="Kembali"
                className="shrink-0 items-center justify-start rounded-sm py-3 pr-3 text-stone-900 hover:bg-transparent"
                onClick={() => {
                  if (action !== "list") {
                    setDetailAction("list");
                    return;
                  }

                  goToPreviousDetailView();
                }}
              >
                <LeftChevron className="size-6" />
              </Button>
            )}

            <p className="min-w-0 flex-1 text-center text-lg font-bold">
              {pageTitle}
            </p>

            {isDetailPage && selectedDataset && (
              <>
                <div className="hidden shrink-0 items-center justify-end md:flex">
                  <details
                    three-dot-menu="true"
                    className="group relative"
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

                    <div className="absolute right-0 z-30 mt-2 flex flex-col rounded-lg border border-gray-400 bg-white p-2 shadow-lg">
                      {selectedDataset.kind === "map" ? (
                        <>
                          <button
                            className="whitespace-nowrap text-left text-sm hover:bg-sky-200 px-2 p-2"
                            onClick={() => setDetailStep("mapdataset")}
                          >
                            Layer
                          </button>

                          <button
                            className="whitespace-nowrap text-left text-sm hover:bg-sky-200 px-2 p-2"
                            onClick={() => setDetailStep("mapvisualization")}
                          >
                            Visualisasi
                          </button>

                          <button
                            className="whitespace-nowrap text-left text-sm hover:bg-sky-200 px-2 p-2"
                            onClick={() => setDetailStep("publication")}
                          >
                            Publikasi
                          </button>

                          <button
                            className="whitespace-nowrap text-left text-sm hover:bg-sky-200 px-2 p-2"
                            onClick={() => setDetailAction("edit")}
                          >
                            Edit Layer
                          </button>

                          <button
                            className="whitespace-nowrap text-left text-sm hover:bg-sky-200 px-2 p-2"
                            onClick={() => setDetailAction("add")}
                          >
                            Tambah Layer
                          </button>

                          <button
                            className="whitespace-nowrap text-left text-sm hover:bg-sky-200 px-2 p-2"
                            onClick={() => setDetailAction("delete")}
                          >
                            Hapus Layer
                          </button>

                          <button
                            className="whitespace-nowrap text-left text-sm hover:bg-sky-200 px-2 p-2"
                            onClick={handleDownloadCsv}
                          >
                            Download CSV
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="whitespace-nowrap text-left text-sm hover:bg-sky-200 px-2 p-2"
                            onClick={() => setDetailStep("dataset")}
                          >
                            Dataset
                          </button>

                          <button
                            className="whitespace-nowrap text-left text-sm hover:bg-sky-200 px-2 p-2"
                            onClick={() => setDetailStep("visualization")}
                          >
                            Visualisasi
                          </button>

                          <button
                            className="whitespace-nowrap text-left text-sm hover:bg-sky-200 px-2 p-2"
                            onClick={() => setDetailStep("publication")}
                          >
                            Publikasi
                          </button>

                          <button
                            className="whitespace-nowrap text-left text-sm hover:bg-sky-200 px-2 p-2"
                            onClick={() => setDetailAction("edit")}
                          >
                            Edit Data
                          </button>

                          <button
                            className="whitespace-nowrap text-left text-sm hover:bg-sky-200 px-2 p-2"
                            onClick={() => setDetailAction("add")}
                          >
                            Tambah Data
                          </button>

                          <button
                            className="whitespace-nowrap text-left text-sm hover:bg-sky-200 px-2 p-2"
                            onClick={() => setDetailAction("delete")}
                          >
                            Hapus Data
                          </button>

                          <button
                            className="whitespace-nowrap text-left text-sm hover:bg-sky-200 px-2 p-2"
                            onClick={handleDownloadCsv}
                          >
                            Download CSV
                          </button>
                        </>
                      )}
                    </div>
                  </details>

                  <div className="flex gap-1">
                    <div
                      className={
                        action === "edit" ||
                        action === "delete" ||
                        (action === "add" && addDataReady)
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
                        onClick={() => setDetailAction("list")}
                      />
                    </div>

                    <div
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
                        text={actionCountLabel}
                        link="none"
                        onClick={() => setSaveData((prev) => prev + 1)}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center justify-center md:hidden">
                  <Button
                    variant="ghost"
                    size="custom"
                    aria-label="Buka aksi data"
                    className="rounded-sm py-3 pl-3 text-stone-900 hover:bg-transparent"
                    onClick={() => setShowMobileAction(true)}
                  >
                    <VerticalThreeDot className="size-6 rounded-sm hover:border" />
                  </Button>
                </div>
              </>
            )}

            {isDetailPage && !selectedDataset && (
              <div className="w-9 shrink-0" aria-hidden="true" />
            )}
          </div>

          {isDetailPage && (selectedDataset || isNewMapPage) && (
            <div className="mb-6 flex items-center justify-between gap-3">
              <p className="text-left text-lg font-bold text-stone-900">
                {detailPageLabel}
              </p>

              {action === "list" && nextDetailView && (
                <button
                  type="button"
                  onClick={() => setDetailStep(nextDetailView)}
                  className="flex items-center gap-1 text-lg font-normal text-stone-400 hover:text-black"
                >
                  <span>{nextDetailLabel}</span>
                  <RightChevron className="h-5 w-5" strokeWidth={1.8} />
                </button>
              )}
            </div>
          )}

          {!isDetailPage && (
            <div className="flex w-full min-w-0 max-w-full flex-col gap-6 mb-6 px-1 py-2">
              {ownerGroups.map((group) => (
                <section key={group.ownerId} className="flex flex-col gap-3">
                  <div className="relative flex w-full items-center justify-between">
                    <h2 className="mb-1 text-lg font-bold">
                      {group.ownerName}
                    </h2>

                    {renderGroupActions(group.ownerId)}
                  </div>

                  {group.datasets.length === 0 ? (
                    <p className="w-full rounded-2xl border border-stone-200 bg-white p-4 text-center text-[2.8vw] shadow-md md:text-[1.5vw] lg:text-sm">
                      Belum ada data terdaftar
                    </p>
                  ) : (
                    group.datasets.map((dataset) => {
                      const publicationStatus = getPublicationStatus(
                        dataset,
                      );

                      return (
                        <button
                          key={dataset.id}
                          type="button"
                          className="flex w-full items-center justify-between gap-3 rounded-2xl border-1 border-stone-200 bg-white p-3 text-left shadow-xl hover:bg-sky-800 hover:text-white cursor-pointer"
                          onClick={() => {
                            setMainPage("main");
                            setAction("list");
                            window.dispatchEvent(
                              new Event("dash-side-menu-close"),
                            );

                            window.setTimeout(() => {
                              if (!mountedRef.current) return;

                              router.push(
                                `/profile/data/${toSlug(dataset.label)}${
                                  dataset.kind === "map"
                                    ? "?view=mapdataset"
                                    : ""
                                }`,
                              );
                            }, 500);
                          }}
                        >
                          <span className="min-w-0 flex-1 text-left">
                            {dataset.label}
                          </span>

                          {dataset.kind === "map" && (
                            <span className="shrink-0 rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800">
                              peta
                            </span>
                          )}

                          <span
                            title={publicationStatus.title}
                            className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${publicationStatus.className}`}
                          >
                            {publicationStatus.label}
                          </span>
                        </button>
                      );
                    })
                  )}
                </section>
              ))}
            </div>
          )}

          {isDetailPage && selectedDataset?.kind === "dataset" && (
            <Dataset
              datasetId={selectedDataset.id}
              action={action}
              saveData={saveData}
              onSignalAction={handleSignalAction}
              onChangeCountChange={handleActionChangeCount}
              role={role}
            />
          )}

          {isDetailPage &&
            (selectedDataset?.kind === "map" || isNewMapPage) && (
              <MapDataset
                mapDatasetId={selectedDataset?.kind === "map" ? selectedDataset.id : null}
                ownerId={
                  selectedDataset?.user_id ||
                  searchParams.get("owner") ||
                  userId
                }
                role={role}
                view={
                  action === "add" || detailView === "mapadd"
                    ? "mapadd"
                    : detailView === "mapdataset" ||
                      detailView === "mapvisualization" ||
                      detailView === "publication"
                    ? detailView
                    : "mapdataset"
                }
                action={action}
                saveData={saveData}
                onAddReadyChange={setAddDataReady}
                onChangeCountChange={handleActionChangeCount}
                onCreated={() => setDetailAction("list")}
                mobileActionMenuOpen={mobileActions.mounted}
              />
            )}
          {isDetailPage && !selectedDataset && !isNewMapPage && datasetPages.length > 0 && (
            <div className="w-full rounded-2xl border border-stone-200 bg-white p-4 text-center text-[2.8vw] text-gray-600 shadow-md md:text-[1.5vw] lg:text-sm">
              Dataset tidak ditemukan.
            </div>
          )}
        </div>
      )}

      {mainPage !== "main" && (
        <div className="flex min-h-0 w-full min-w-0 max-w-full flex-col overflow-hidden">
          <div className="relative flex items-center justify-center mb-6">
            <Button
              variant="ghost"
              size="custom"
              aria-label="Kembali"
              className="rounded-sm py-3 pr-3 text-stone-900 hover:bg-transparent"
              onClick={resetToHome}
            >
              <LeftChevron className="size-6" />
            </Button>

            <p className="font-bold text-center mx-auto text-lg">{pageTitle}</p>

            <div className="hidden md:flex justify-center items-center">
              <div className="flex flex-row gap-1">
                {showOuterActionButtons && (
                  <div>
                    <Button
                      color="grey"
                      size="lg"
                      textSize="sm"
                      text="Batal"
                      link="none"
                      onClick={resetToHome}
                    />
                  </div>
                )}

                {showOuterActionButtons && (
                  <div>
                      <Button
                        color={action === "delete" ? "red" : "green"}
                        size="lg"
                        textSize="sm"
                      text={actionCountLabel}
                      link="none"
                      onClick={() => setSaveData((prev) => prev + 1)}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-col gap-6 mb-6">
            {(mainPage === "add" || mainPage === "mapadd") && (
              <div className="flex w-full flex-wrap gap-3">
                <Button
                  variant={mainPage === "add" ? "outline" : "primary"}
                  size="md"
                  onClick={() => setDatasetConfigAction("add", selectedActionOwnerId)}
                >
                  Tabel
                </Button>

                <Button
                  variant={mainPage === "mapadd" ? "outline" : "primary"}
                  size="md"
                  onClick={() => setMapAddAction(selectedActionOwnerId)}
                >
                  Peta
                </Button>
              </div>
            )}

            {mainPage === "mapadd" ? (
              <MapDataset
                mapDatasetId={null}
                ownerId={selectedActionOwnerId}
                role={role}
                view="mapadd"
                saveData={saveData}
                onAddReadyChange={setAddDataReady}
                onChangeCountChange={handleActionChangeCount}
                onCreated={handleSignalDatasetAction}
              />
            ) : (
              <DatasetConfig
                action={action}
                saveData={saveData}
                onSignalAction={handleSignalDatasetAction}
                onAddReadyChange={setAddDataReady}
                onChangeCountChange={handleActionChangeCount}
                userRole={role}
                userId={userId}
                editDataset={editDataset}
                scopedOwnerId={selectedActionOwnerId}
              />
            )}
          </div>
        </div>
      )}

      {mobileActions.mounted && (
        <div
          className={`fixed inset-0 z-[1200] md:hidden ${mobileActions.closing ? "pointer-events-none bg-transparent" : "bg-gray-950/70"}`}
          onClick={() => setShowMobileAction(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`${mobileActions.closing ? "bottom-menu-collapse" : "bottom-menu-expand"} fixed bottom-0 left-0 z-[1200] flex w-full flex-col items-center justify-center gap-3 rounded-t-2xl bg-stone-900 p-5`}
          >
          <div className="flex w-full flex-col gap-2">
            <button
              className="w-full rounded-xl border-2 border-white py-2 text-md text-white"
              onClick={() =>
                setDetailStep(isMapDetail ? "mapdataset" : "dataset")
              }
            >
              {isMapDetail ? "Layer" : "Dataset"}
            </button>

            <button
              className="w-full rounded-xl border-2 border-white py-2 text-md text-white"
              onClick={() =>
                setDetailStep(isMapDetail ? "mapvisualization" : "visualization")
              }
            >
              Visualisasi
            </button>

            <button
              className="w-full rounded-xl border-2 border-white py-2 text-md text-white"
              onClick={() => setDetailStep("publication")}
            >
              Publikasi
            </button>

            <button
              className="w-full rounded-xl border-2 border-white py-2 text-md text-white"
              onClick={handleDownloadCsv}
            >
              Download CSV
            </button>
          </div>

          <div className="flex gap-2 w-full">
            <button
              className="w-full bg-sky-800 rounded-xl border-2 border-white py-2 text-md text-white"
              onClick={() => {
                setDetailAction("edit");
              }}
            >
              Edit
            </button>

            <button
              className="w-full bg-green-600 rounded-xl border-2 border-white py-2 text-md text-white"
              onClick={() => {
                setDetailAction("add");
              }}
            >
              Tambah
            </button>

            <button
              className="w-full bg-red-600 rounded-xl border-2 border-white py-2 text-md text-white"
              onClick={() => {
                setDetailAction("delete");
              }}
            >
              Hapus
            </button>
          </div>
          </div>
        </div>
      )}

      {saveCancelActions.mounted && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`${saveCancelActions.closing ? "bottom-menu-collapse" : "bottom-menu-expand"} fixed bottom-0 left-0 z-40 flex w-full flex-col justify-center gap-3 rounded-t-2xl bg-stone-900 p-5 lg:hidden`}
        >
          <button
            className="w-full rounded-xl bg-gray-600 border-2 border-white py-2 text-md text-white"
            onClick={() => {
              if (mainPage !== "main") {
                resetToHome();
                return;
              }

              if (isDetailPage) {
                setDetailAction("list");
                return;
              }

              setAction("list");
            }}
          >
            Batal
          </button>

          {((isAddMode && addDataReady) ||
            (!isAddMode &&
              (action === "edit" || (action === "add" && addDataReady)))) && (
            <button
              className="w-full rounded-xl bg-green-600 border-2 border-white py-2 text-md text-white"
              onClick={() => setSaveData((prev) => prev + 1)}
            >
              Simpan ({actionChangeCount})
            </button>
          )}

          {action === "delete" && (
            <button
              className="w-full rounded-xl bg-rose-600 border-2 border-white py-2 text-md text-white"
              onClick={() => setSaveData((prev) => prev + 1)}
            >
              Hapus ({actionChangeCount})
            </button>
          )}
        </div>
      )}
    </div>
  );
}
