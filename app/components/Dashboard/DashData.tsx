"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LeftChevron, RightChevron, VerticalThreeDot } from "@/public/icons/iconSets";
import Button from "../Button";
import { getDatasetPages } from "@/lib/supabase/supabaseHelper";
import Dataset from "../Dataset";
import MapDataset from "../Maps/MapDataset";
import { LinkDatasetCreate } from "../LinkDataset";
import DashboardWorkflowView from "../fisheries-dashboard/DashboardWorkflow";
import { useAuthStore } from "@/app/Stores/authStores";
import type { EditSource } from "../DatasetConfig";
import { supabase } from "@/lib/supabase/supabaseClient";
import SpinnerLoading from "../SpinnerLoading";
import {
  collectionToCsv,
  isFeatureCollection,
} from "@/lib/utils/mapConfig";
import { useCollapsibleMount } from "@/lib/hooks/useCollapsibleMount";
import { canManageData, isPartnerRole } from "@/lib/utils/roles";
import {
  getDatasetListCache,
  setDatasetListCache,
} from "@/lib/utils/datasetListCache";

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
type MainPage = "main" | "add" | "edit" | "delete" | "mapadd" | "linkadd" | "dashboard";
type DetailView =
  | "dataset"
  | "configuration"
  | "visualization"
  | "publication"
  | "link"
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
  kind: "dataset" | "map" | "link" | "dashboard";
  view_count?: number;
  download_count?: number;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
  publication_changed_at?: string | null;
  approval_statuses?: Partial<
    Record<"admin" | "kadis" | "sekdis", "pending" | "approved" | "rejected">
  >;
};

function formatWitDateTime(value?: string) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return `${new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jayapura",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(date)
    .replace(",", "")} WIT`;
}

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

type DatasetAccess = {
  can_add: boolean;
  can_edit: boolean;
  can_delete: boolean;
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

  if (value === "configuration") {
    return "configuration";
  }

  if (value === "link") {
    return "link";
  }

  return "dataset";
}

function getPublicationStatus(
  dataset: DatasetPage,
): {
  label: string;
  className: string;
  title?: string;
} {
  const status = dataset.published;

  if (dataset.import_status === "draft") {
    return {
      label: "draf",
      className: "bg-violet-100 text-violet-800 ring-1 ring-violet-200",
      title: "Data masih berstatus draft",
    };
  }

  if (status === "requested") {
    const hasDecision = Object.values(dataset.approval_statuses ?? {}).some(
      (approval) => approval === "approved" || approval === "rejected",
    );
    return {
      label: hasDecision ? "proses" : "diajukan",
      className: "bg-amber-100 text-amber-800",
    };
  }

  if (status === "approved") {
    return {
      label: "dipublikasikan",
      className: "bg-emerald-100 text-emerald-800",
    };
  }

  if (status === "rejected") {
    return {
      label: "ditolak",
      className: "bg-rose-100 text-rose-800",
    };
  }

  return {
    label: "belum dipublikasikan",
    className: "bg-stone-100 text-stone-700 ring-1 ring-stone-200",
    title: "Data siap, tetapi belum dipublikasikan",
  };
}

function getPublicationFilterValue(dataset: DatasetPage) {
  if (dataset.import_status === "draft") return "draft";
  if (dataset.published !== "requested") {
    return dataset.published ?? "not-published";
  }
  return Object.values(dataset.approval_statuses ?? {}).some(
    (approval) => approval === "approved" || approval === "rejected",
  )
    ? "process"
    : "requested";
}

function getApprovalLabel(status?: "pending" | "approved" | "rejected") {
  if (status === "approved") return "Disetujui";
  if (status === "rejected") return "Ditolak";
  return "Menunggu";
}

function getStatusCallout(dataset: DatasetPage) {
  if (dataset.import_status === "draft") {
    return {
      message: "Data akan dihapus pada",
      date: formatWitDateTime(dataset.draft_expires_at ?? undefined),
    };
  }

  if (dataset.published === "requested") {
    return {
      message: "Data diajukan pada",
      date: formatWitDateTime(
        dataset.publication_changed_at ??
          dataset.updated_at ??
          dataset.created_at ??
          undefined,
      ),
    };
  }

  if (dataset.published === "rejected") {
    return {
      message: "Data ditolak pada",
      date: formatWitDateTime(
        dataset.publication_changed_at ?? dataset.updated_at ?? undefined,
      ),
    };
  }

  if (dataset.published === "approved") {
    return {
      message: "Data dipublikasikan pada",
      date: formatWitDateTime(
        dataset.publication_changed_at ?? dataset.updated_at ?? undefined,
      ),
    };
  }

  return {
    message: "Data diunggah pada",
    date: formatWitDateTime(dataset.created_at),
  };
}

export default function DashData({ onSignal = noopSignal }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const loading = useAuthStore((state) => state.loading);
  const userId = useAuthStore((state) => state.userId);
  const role = useAuthStore((state) => state.role);
  const isPublicationReviewer = role === "kadis" || role === "sekdis";
  const isPublicationGranter = role === "admin" || isPublicationReviewer;

  const [action, setAction] = useState<ActionType>("list");
  const [mainPage, setMainPage] = useState<MainPage>("main");

  const [datasetPages, setDatasetPages] = useState<DatasetPage[]>([]);
  const [ownerRows, setOwnerRows] = useState<OwnerRow[]>([]);
  const [kindFilter, setKindFilter] = useState("all");
  const [publicationFilter, setPublicationFilter] = useState("all");
  const publicationFilterTouchedRef = useRef(false);
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [showMobileAction, setShowMobileAction] = useState(false);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(null);
  const [saveData, setSaveData] = useState(0);
  const [actionChangeCount, setActionChangeCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [addDataReady, setAddDataReady] = useState(false);
  const [grantedAccess, setGrantedAccess] = useState<DatasetAccess | null>(null);
  const [dashboardUploadsReady, setDashboardUploadsReady] = useState(true);
  const [missingDashboardUploads, setMissingDashboardUploads] = useState<string[]>([]);
  const [dashboardUploadWarning, setDashboardUploadWarning] = useState("");
  const [visualizationSaved, setVisualizationSaved] = useState(false);
  const [visualizationWarning, setVisualizationWarning] = useState("");
  const [openStatusCallout, setOpenStatusCallout] = useState<string | null>(
    null,
  );
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
  const isLinkDetail = selectedDataset?.kind === "link";
  const ownsSelectedDataset = selectedDataset?.user_id === userId;
  const datasetAccess = {
    can_add: !isPublicationReviewer && (role === "admin" || ownsSelectedDataset || grantedAccess?.can_add),
    can_edit:
      !isPublicationReviewer && (role === "admin" || ownsSelectedDataset || grantedAccess?.can_edit),
    can_delete:
      !isPublicationReviewer && (role === "admin" || ownsSelectedDataset || grantedAccess?.can_delete),
  };
  const isSharedPartnerDataset =
    isPartnerRole(role) &&
    !isPublicationReviewer &&
    Boolean(selectedDataset) &&
    !ownsSelectedDataset;
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
    : isLinkDetail
      ? "Publikasi"
    : detailView === "visualization"
      ? isSharedPartnerDataset
        ? "Preview"
        : "Visualisasi"
      : detailView === "configuration"
        ? "Pengaturan"
      : detailView === "publication"
        ? "Publikasi"
        : "Dataset";
  const nextDetailView = isLinkDetail
    ? null
    : isPublicationReviewer
    ? null
    : isMapDetail
    ? detailView === "mapadd"
      ? "mapdataset"
      : detailView === "mapdataset"
        ? "mapvisualization"
        : detailView === "mapvisualization"
        ? "publication"
        : null
    : detailView === "dataset"
      ? "visualization"
      : detailView === "visualization" && (!isSharedPartnerDataset || isPublicationReviewer)
        ? "publication"
        : null;
  const nextDetailLabel =
    nextDetailView === "mapdataset"
      ? "Layer"
      : nextDetailView === "mapvisualization"
      ? "Visualisasi"
      : nextDetailView === "visualization" && isSharedPartnerDataset
        ? "Preview"
        : nextDetailView === "visualization"
          ? "Visualisasi"
          : nextDetailView === "publication"
            ? "Publikasi"
            : "";

  const selectedActionOwnerId =
    selectedOwnerId || searchParams.get("owner") || userId;
  const isAddMode = mainPage === "add" || mainPage === "mapadd" || mainPage === "linkadd";
  const showOuterActionButtons =
    mainPage === "linkadd" || !isAddMode || addDataReady;
  const actionCountLabel =
    action === "delete"
      ? `Hapus (${actionChangeCount})`
      : `Simpan (${actionChangeCount})`;
  const handleActionChangeCount = useCallback((count: number) => {
    if (!mountedRef.current) return;

    setActionChangeCount(count);
  }, []);
  const handleDashboardUploadReadiness = useCallback((ready: boolean, missing: string[]) => {
    setDashboardUploadsReady(ready);
    setMissingDashboardUploads(missing);
    if (ready) setDashboardUploadWarning("");
  }, []);
  const handleVisualizationSaved = useCallback(() => {
    setVisualizationSaved(true);
    setVisualizationWarning("");
    setDatasetPages((current) =>
      current.map((dataset) =>
        dataset.id === selectedDataset?.id
          ? {
              ...dataset,
              import_status: "ready",
              draft_expires_at: null,
            }
          : dataset,
      ),
    );
  }, [selectedDataset?.id]);

  useEffect(() => {
    if (detailView === "visualization" || detailView === "mapvisualization") {
      setVisualizationSaved(selectedDataset?.import_status === "ready");
      setVisualizationWarning("");
    }
  }, [detailView, selectedDataset?.id, selectedDataset?.import_status]);

  const ownerNameMap = useMemo(() => {
    return ownerRows.reduce<Record<string, string>>((acc, owner) => {
      const username = owner.username?.trim() || "Pengguna tanpa nama";
      const organization = owner.organization?.trim() || "Tanpa organisasi";

      acc[owner.id] = `${username} - ${organization}`;

      return acc;
    }, {});
  }, [ownerRows]);

  const getOwnerName = (ownerId: string | null) => {
    if (!ownerId) return "Tanpa Pemilik";

    return ownerNameMap[ownerId] ?? "Dataset Dibagikan";
  };

  const datasetFilterOptions = useMemo(() => ({
    kinds: Array.from(new Set(datasetPages.map((dataset) => dataset.kind))),
    owners: Array.from(
      new Set(
        datasetPages
          .map((dataset) => dataset.user_id)
          .filter(
            (ownerId): ownerId is string =>
              Boolean(ownerId) &&
              ownerRows.some(
                (owner) => owner.id === ownerId && owner.role === "partner",
              ),
          ),
      ),
    ) as string[],
  }), [datasetPages, ownerRows]);

  const filteredDatasetPages = useMemo(
    () => datasetPages.filter((dataset) => {
      const publication = getPublicationFilterValue(dataset);
      return (
        (kindFilter === "all" || dataset.kind === kindFilter) &&
        (publicationFilter === "all" ||
          (publicationFilter === "requested"
            ? publication === "requested" || publication === "process"
            : publication === publicationFilter)) &&
        (!isPublicationGranter ||
          ownerFilter === "all" ||
          dataset.user_id === ownerFilter)
      );
    }),
    [datasetPages, isPublicationGranter, kindFilter, publicationFilter, ownerFilter],
  );

  const pendingPublicationCount = useMemo(
    () => datasetPages.filter((dataset) => dataset.published === "requested").length,
    [datasetPages],
  );

  const ownerGroups = useMemo(() => {
    const groups = new Map<
      string,
      {
        ownerId: string;
        ownerName: string;
        datasets: DatasetPage[];
      }
    >();

    filteredDatasetPages.forEach((dataset) => {
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

    if (userId && !isPublicationReviewer && !groups.has(userId)) {
      groups.set(userId, {
        ownerId: userId,
        ownerName: getOwnerName(userId),
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
  }, [getOwnerName, filteredDatasetPages, isPublicationReviewer, role, userId]);

  const pageTitle =
    isNewMapPage
      ? "Tambah Peta"
      : mainPage === "mapadd"
        ? labels.add
        : mainPage === "linkadd"
          ? "Tambah Link"
        : mainPage === "dashboard"
          ? "Dashboard Perikanan"
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
    if (
      !selectedDataset ||
      selectedDataset.kind !== "dataset" ||
      !isPartnerRole(role) ||
      ownsSelectedDataset
    ) {
      setGrantedAccess(null);
      return;
    }

    const fetchGrant = async () => {
      const { data, error } = await supabase
        .from("dataset_access_grants")
        .select("can_add, can_edit, can_delete")
        .eq("dataset_id", selectedDataset.id)
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Failed to fetch dataset access:", error);
        setGrantedAccess(null);
        return;
      }

      setGrantedAccess(data as DatasetAccess | null);
    };

    void fetchGrant();
  }, [ownsSelectedDataset, role, selectedDataset, userId]);

  useEffect(() => {
    if (
      !isSharedPartnerDataset || !selectedDataset
    ) {
      return;
    }

    if (
      detailView === "publication"
    ) {
      setAction("list");
      setShowMobileAction(false);
      const params = new URLSearchParams(searchParams.toString());
      params.delete("action");
      params.set("view", "visualization");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [
    detailView,
    isSharedPartnerDataset,
    pathname,
    router,
    searchParams,
    selectedDataset,
  ]);

  useEffect(() => {
    if (!isDetailPage || selectedDataset?.kind !== "link") return;
    if (searchParams.get("view") === "publication") return;

    const params = new URLSearchParams(searchParams.toString());
    params.delete("action");
    params.set("view", "publication");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [isDetailPage, pathname, router, searchParams, selectedDataset]);

  useEffect(() => {
    if (!isPublicationReviewer || !isDetailPage || !selectedDataset) return;
    if (searchParams.get("view") === "publication") return;
    router.replace(`${pathname}?view=publication`, { scroll: false });
  }, [isDetailPage, isPublicationReviewer, pathname, router, searchParams, selectedDataset]);

  useEffect(() => {
    if (loading || !userId) return;
    if (!canManageData(role)) return;

    const cacheScope = `${role}:${role === "admin" || isPublicationReviewer ? "all" : userId}`;

    if (refreshKey === 0) {
      const cached = getDatasetListCache<DatasetPage, OwnerRow>(cacheScope);

      if (
        cached &&
        role === "admin" &&
        cached.datasets.every(
          (dataset) =>
            typeof dataset.view_count === "number" &&
            typeof dataset.download_count === "number",
        )
      ) {
        const cachedReviewerOwnerIds = new Set(
          cached.owners
            .filter((owner) => owner.role === "kadis" || owner.role === "sekdis")
            .map((owner) => owner.id),
        );
        setDatasetPages(
          cached.datasets.filter(
            (dataset) =>
              !dataset.user_id || !cachedReviewerOwnerIds.has(dataset.user_id),
          ),
        );
        setOwnerRows(
          cached.owners.filter(
            (owner) => owner.role !== "kadis" && owner.role !== "sekdis",
          ),
        );
      }
    }

    const fetchDatasetPages = async () => {
      try {
        const result = await getDatasetPages("all");
        let visibleDatasetRows = result.filter(
          (dataset) => dataset.kind === "dataset" || dataset.kind === "link",
        );

        if (role === "partner") {
          const { data: grantRows, error: grantError } = await supabase
            .from("dataset_access_grants")
            .select("dataset_id")
            .eq("user_id", userId);

          if (grantError) {
            console.warn(
              "Dataset grants are unavailable; showing owned datasets only:",
              grantError,
            );
          }

          const grantedDatasetIds = new Set(
            (grantRows ?? []).map((grant) => grant.dataset_id),
          );

          visibleDatasetRows = visibleDatasetRows.filter(
            (dataset) =>
              dataset.user_id === userId || grantedDatasetIds.has(dataset.id),
          );
        }

        let mapQuery = supabase
          .from("map_datasets")
          .select("id, label, user_id, published, import_status, draft_expires_at, created_at, updated_at")
          .order("label", { ascending: true });

        if (role !== "admin" && !isPublicationReviewer) {
          mapQuery = mapQuery.eq("user_id", userId);
        }

        let { data: mapRows, error: mapError } = await mapQuery;

        if (mapError) {
          console.warn("Map draft columns unavailable, using legacy query:", mapError);

          let fallbackMapQuery = supabase
            .from("map_datasets")
            .select("id, label, user_id, published, created_at, updated_at")
            .order("label", { ascending: true });

          if (role !== "admin" && !isPublicationReviewer) {
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

        let nextDatasetPages: DatasetPage[] = [
          ...visibleDatasetRows.map((item) => ({
            ...item,
            kind: item.kind === "link" ? "link" as const : "dataset" as const,
          })),
          ...((mapRows ?? []) as Omit<DatasetPage, "kind">[]).map((item) => ({
            ...item,
            label: item.label || "Peta Tanpa Nama",
            kind: "map" as const,
          })),
        ];

        let workflowQuery = supabase.from("datasets").select("id, user_id, label, published, created_at, updated_at").eq("kind", "dashboard").order("label", { ascending: true });
        if (role !== "admin" && !isPublicationReviewer) workflowQuery = workflowQuery.eq("user_id", userId);
        const { data: workflowRows, error: workflowError } = await workflowQuery;
        if (workflowError) console.warn("Dashboard workflows are unavailable:", workflowError);
        else nextDatasetPages.push(...(workflowRows ?? []).map((item) => ({ id: item.id, user_id: item.user_id, label: item.label, published: item.published, kind: "dashboard" as const, import_status: "ready" as const, draft_expires_at: null })));

        const approvalResourceIds = nextDatasetPages.map((item) => item.id);
        if (approvalResourceIds.length > 0) {
          const { data: approvalRows, error: approvalError } = await supabase
            .from("publication_approvals")
            .select("resource_kind,resource_id,approver_role,status")
            .in("resource_id", approvalResourceIds);

          if (approvalError) {
            console.warn("Status persetujuan publikasi tidak tersedia:", approvalError);
          } else {
            const approvalMap = new Map<string, DatasetPage["approval_statuses"]>();
            (approvalRows ?? []).forEach((approval) => {
              const key = `${approval.resource_kind}:${approval.resource_id}`;
              const current = approvalMap.get(key) ?? {};
              if (
                approval.approver_role === "admin" ||
                approval.approver_role === "kadis" ||
                approval.approver_role === "sekdis"
              ) {
                const approverRole = approval.approver_role as
                  | "admin"
                  | "kadis"
                  | "sekdis";
                current[approverRole] = approval.status as
                  | "pending"
                  | "approved"
                  | "rejected";
              }
              approvalMap.set(key, current);
            });
            nextDatasetPages = nextDatasetPages.map((item) => ({
              ...item,
              approval_statuses: approvalMap.get(
                `${item.kind === "map" ? "map" : "dataset"}:${item.id}`,
              ),
            }));
          }
        }

        const metricResourceIds = nextDatasetPages.map((item) => item.id);
        if (metricResourceIds.length > 0) {
          const { data: metricRows, error: metricError } = await supabase
            .from("dataset_public_metrics")
            .select(
              "resource_kind, resource_id, view_count, download_count",
            )
            .in("resource_id", metricResourceIds);

          if (metricError) {
            console.warn("Dataset public metrics are unavailable:", metricError);
          } else {
            const metricMap = new Map(
              (metricRows ?? []).map((metric) => [
                `${metric.resource_kind}:${metric.resource_id}`,
                metric,
              ]),
            );

            nextDatasetPages = nextDatasetPages.map((item) => {
              const metric = metricMap.get(
                `${item.kind === "map" ? "map" : "dataset"}:${item.id}`,
              );

              return {
                ...item,
                view_count: Number(metric?.view_count ?? 0),
                download_count: Number(metric?.download_count ?? 0),
              };
            });
          }
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.access_token && nextDatasetPages.length > 0) {
          try {
            const response = await fetch("/api/dataset-last-updates", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${session.access_token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                resources: nextDatasetPages.map((dataset) => ({
                  id: dataset.id,
                  kind: dataset.kind === "map" ? "map" : "dataset",
                })),
              }),
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const payload = (await response.json()) as {
              updates?: Array<{
                resource_kind: "dataset" | "map";
                resource_id: string;
                updated_by: string;
                updated_at: string;
                publication_changed_at: string | null;
              }>;
            };
            const updateMap = new Map(
              (payload.updates ?? []).map((update) => [
                `${update.resource_kind}:${update.resource_id}`,
                update,
              ]),
            );

            nextDatasetPages = nextDatasetPages.map((dataset) => {
              const update = updateMap.get(
                `${dataset.kind === "map" ? "map" : "dataset"}:${dataset.id}`,
              );

              return update
                ? {
                    ...dataset,
                    updated_by: update.updated_by,
                    updated_at: update.updated_at,
                    publication_changed_at: update.publication_changed_at,
                  }
                : dataset;
            });
          } catch (error) {
            console.warn("Dataset last-update metadata is unavailable:", error);
          }
        }

        const ownerIds = Array.from(
          new Set([
            userId,
            ...nextDatasetPages.map((dataset) => dataset.user_id),
          ].filter((ownerId): ownerId is string => Boolean(ownerId))),
        );
        let nextOwnerRows: OwnerRow[] = [];

        if (ownerIds.length > 0) {
          const { data: owners, error: ownersError } = await supabase
            .from("users")
            .select("id, username, organization, role")
            .in("id", ownerIds)
            .order("organization", { ascending: true });

          if (ownersError) throw ownersError;

          nextOwnerRows = (owners ?? []) as OwnerRow[];
        }

        const reviewerOwnerIds = new Set(
          nextOwnerRows
            .filter((owner) => owner.role === "kadis" || owner.role === "sekdis")
            .map((owner) => owner.id),
        );
        nextDatasetPages = nextDatasetPages.filter(
          (dataset) => !dataset.user_id || !reviewerOwnerIds.has(dataset.user_id),
        );
        nextOwnerRows = nextOwnerRows.filter(
          (owner) => owner.role !== "kadis" && owner.role !== "sekdis",
        );

        if (
          !publicationFilterTouchedRef.current &&
          (role === "admin" || role === "kadis" || role === "sekdis")
        ) {
          setPublicationFilter(
            nextDatasetPages.some((dataset) => dataset.published === "requested")
              ? "requested"
              : "all",
          );
        }

        setDatasetPages(nextDatasetPages);
        setOwnerRows(nextOwnerRows);
        setDatasetListCache(cacheScope, nextDatasetPages, nextOwnerRows);
      } catch (err) {
        console.error("Fetching datasets:", err);
      }
    };

    fetchDatasetPages();
  }, [loading, userId, role, refreshKey]);

  useEffect(() => {
    if (!isPublicationReviewer && role !== "admin") return;
    const channel = supabase
      .channel("dash-data:publication-approval-statuses")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "publication_approvals" },
        () => setRefreshKey((current) => current + 1),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [isPublicationReviewer, role]);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      if (!target.closest("[data-status-callout='true']")) {
        setOpenStatusCallout(null);
      }

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

    if (urlAction === "linkadd") {
      setSelectedOwnerId(searchParams.get("owner") || userId);
      setMainPage("linkadd");
      setAction("list");
      onSignal("dataset");
      return;
    }

    if (["dashboardadd", "dashboardvisualize", "dashboardpublish"].includes(urlAction ?? "")) {
      setSelectedOwnerId(searchParams.get("owner") || userId);
      setMainPage("dashboard");
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
    ((mainPage === "linkadd") ||
      (isAddMode && addDataReady) ||
      (!isAddMode &&
        (action === "edit" ||
          action === "delete" ||
          (action === "add" && addDataReady))));
  const mobileActions = useCollapsibleMount(showMobileAction);
  const saveCancelActions = useCollapsibleMount(showSaveCancelAction);
  const publicationStepLocked =
    nextDetailView === "publication" &&
    (detailView === "visualization" || detailView === "mapvisualization") &&
    !visualizationSaved;

  if (loading) {
    return (
      <div className="flex w-full items-center justify-center rounded-2xl border border-stone-200 bg-white p-4 shadow-md">
        <SpinnerLoading size="sm" color="black" />
      </div>
    );
  }

  if (!userId || !canManageData(role)) {
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
    if (
      view === "publication" &&
      (detailView === "visualization" || detailView === "mapvisualization") &&
      !visualizationSaved
    ) {
      setVisualizationWarning(
        "Simpan Visualisasi terlebih dahulu sebelum melanjutkan ke Publikasi.",
      );
      return;
    }

    setVisualizationWarning("");
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
    if (isLinkDetail) {
      resetToHome();
      return;
    }

    if (isMapDetail) {
      if (detailView === "publication") {
        setDetailStep("mapvisualization");
        return;
      }

      if (detailView === "mapvisualization") {
        if (isPublicationReviewer) {
          resetToHome();
          return;
        }
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
      if (selectedDataset?.kind === "dashboard") {
        router.replace(pathname, { scroll: false });
        return;
      }
      setDetailStep("dataset");
      return;
    }

    if (detailView === "configuration") {
      if (selectedDataset?.kind === "dashboard") {
        router.replace(pathname, { scroll: false });
        return;
      }
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
      if (selectedDataset?.kind === "dashboard") {
        params.delete("view");
      } else {
        params.set("view", isMapDetail ? "mapdataset" : "dataset");
      }
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

  const setLinkAddAction = (ownerId: string | null) => {
    setMainPage("linkadd");
    setAction("list");
    setShowMobileAction(false);
    setSelectedOwnerId(ownerId);
    onSignal("dataset");
    const params = new URLSearchParams(searchParams.toString());
    params.set("action", "linkadd");
    if (ownerId) params.set("owner", ownerId);
    router.replace(`/profile/data?${params.toString()}`, { scroll: false });
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
      <summary className="list-none cursor-pointer text-xs">
        <VerticalThreeDot className="size-6 drop-shadow-md" />
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
    <div
      className={`flex w-full max-w-full ${isDetailPage ? "overflow-hidden" : "overflow-visible"} md:pb-0 ${
        mobileActions.mounted || saveCancelActions.mounted ? "pb-52" : "pb-0"
      }`}
    >
      {mainPage === "main" && (
        <div className={`flex w-full min-w-0 max-w-full flex-col ${isDetailPage ? "overflow-hidden" : "overflow-visible"}`}>
          <div className="mb-6 flex w-full min-w-0 items-center gap-3">
            {isDetailPage && (
              <Button
                variant="ghost"
                size="custom"
                aria-label="Kembali"
                className="shrink-0 items-center justify-start rounded-sm py-3 pr-3 text-stone-900 hover:bg-transparent"
                onClick={() => {
                  if (
                    detailView === "publication" &&
                    (role === "admin" || isPublicationReviewer)
                  ) {
                    resetToHome();
                    return;
                  }

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

            {isDetailPage && selectedDataset && !isLinkDetail && !isPublicationReviewer && (
              <>
                <div className="hidden shrink-0 items-center justify-end md:flex">
                  <details
                    three-dot-menu="true"
                    className="group relative"
                  >
                    <summary
                      className={`list-none cursor-pointer text-xs ${
                        action === "edit" ||
                        action === "add" ||
                        action === "delete"
                          ? "hidden"
                          : "flex"
                      }`}
                    >
                      <VerticalThreeDot className="size-6 drop-shadow-md" />
                    </summary>

                    <div className="absolute right-0 z-30 mt-2 flex flex-col rounded-lg border border-gray-400 bg-white p-2 shadow-lg">
                      {selectedDataset.kind === "map" ? (
                        <>
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
                          {selectedDataset.kind !== "dashboard" && datasetAccess.can_edit && <button
                            className="whitespace-nowrap text-left text-sm hover:bg-sky-200 px-2 p-2"
                            onClick={() => setDetailAction("edit")}
                          >
                            Edit Data
                          </button>}

                          {datasetAccess.can_add && <button
                            className="whitespace-nowrap text-left text-sm hover:bg-sky-200 px-2 p-2"
                            onClick={() => setDetailAction("add")}
                          >
                            Tambah Data
                          </button>}

                          {selectedDataset.kind !== "dashboard" && datasetAccess.can_delete && <button
                            className="whitespace-nowrap text-left text-sm hover:bg-sky-200 px-2 p-2"
                            onClick={() => setDetailAction("delete")}
                          >
                            Hapus Data
                          </button>}

                          {selectedDataset.kind !== "dashboard" && <button
                            className="whitespace-nowrap text-left text-sm hover:bg-sky-200 px-2 p-2"
                            onClick={handleDownloadCsv}
                          >
                            Download CSV
                          </button>}

                          {role === "admin" && (
                            <button
                              className="whitespace-nowrap p-2 px-2 text-left text-sm hover:bg-sky-200"
                              onClick={() => setDetailView("configuration")}
                            >
                              Pengaturan
                            </button>
                          )}
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
                    className="py-3 pl-3 text-stone-900 hover:bg-transparent"
                    onClick={() => setShowMobileAction(true)}
                  >
                    <VerticalThreeDot className="size-6 drop-shadow-md" />
                  </Button>
                </div>
              </>
            )}

            {isDetailPage && (!selectedDataset || isLinkDetail) && (
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
                  aria-disabled={
                    publicationStepLocked ||
                    (selectedDataset?.kind === "dashboard" &&
                      nextDetailView === "visualization" &&
                      !dashboardUploadsReady)
                  }
                  onClick={() => {
                    if (selectedDataset?.kind === "dashboard" && nextDetailView === "visualization" && !dashboardUploadsReady) {
                      setDashboardUploadWarning(`Upload belum lengkap: ${missingDashboardUploads.join(" dan ")}.`);
                      return;
                    }
                    setDetailStep(nextDetailView);
                  }}
                  className={`flex items-center gap-1 text-lg font-normal ${publicationStepLocked || (selectedDataset?.kind === "dashboard" && nextDetailView === "visualization" && !dashboardUploadsReady) ? "cursor-not-allowed text-stone-300" : "text-stone-400 hover:text-black"}`}
                >
                  <span>{nextDetailLabel}</span>
                  <RightChevron className="h-5 w-5" strokeWidth={1.8} />
                </button>
              )}
            </div>
          )}

          {dashboardUploadWarning && selectedDataset?.kind === "dashboard" && (
            <div role="alert" className="mb-5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
              {dashboardUploadWarning}
            </div>
          )}

          {visualizationWarning &&
            (detailView === "visualization" ||
              detailView === "mapvisualization") && (
              <div
                role="alert"
                className="mb-5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900"
              >
                {visualizationWarning}
              </div>
            )}

          {!isDetailPage && (
            <div className="flex w-full min-w-0 max-w-full flex-col gap-6 mb-6 px-1 py-2">
              <div
                className={`grid w-full grid-cols-1 gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-md ${
                  isPublicationGranter ? "md:grid-cols-3" : "sm:grid-cols-2"
                }`}
              >
                <label className="flex flex-col gap-1 text-sm font-semibold text-stone-700">
                  Tipe Dataset
                  <select
                    value={kindFilter}
                    onChange={(event) => setKindFilter(event.target.value)}
                    className="rounded-lg border border-stone-300 bg-white px-3 py-2 font-normal"
                  >
                    <option value="all">Semua tipe</option>
                    {datasetFilterOptions.kinds.includes("dataset") && (
                      <option value="dataset">Table</option>
                    )}
                    {datasetFilterOptions.kinds.includes("link") && (
                      <option value="link">Link</option>
                    )}
                    {datasetFilterOptions.kinds.includes("map") && (
                      <option value="map">Map</option>
                    )}
                    {datasetFilterOptions.kinds.includes("dashboard") && (
                      <option value="dashboard">Dashboard</option>
                    )}
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-sm font-semibold text-stone-700">
                  Publikasi
                  <select
                    value={publicationFilter}
                    onChange={(event) => {
                      publicationFilterTouchedRef.current = true;
                      setPublicationFilter(event.target.value);
                    }}
                    className="rounded-lg border border-stone-300 bg-white px-3 py-2 font-normal"
                  >
                    <option value="all">Semua status</option>
                    {datasetPages.some(
                      (dataset) =>
                        dataset.import_status === "draft",
                    ) && (
                      <option value="draft">Draf</option>
                    )}
                    {datasetPages.some(
                      (dataset) =>
                        dataset.import_status !== "draft" &&
                        dataset.published === null,
                    ) && (
                      <option value="not-published">Belum Dipublikasikan</option>
                    )}
                    {datasetPages.some((dataset) => dataset.published === "requested") && (
                      <option value="requested">Diajukan &amp; Proses</option>
                    )}
                    {datasetPages.some(
                      (dataset) => dataset.published === "approved",
                    ) && (
                      <option value="approved">Dipublikasikan</option>
                    )}
                    {datasetPages.some((dataset) => dataset.published === "rejected") && (
                      <option value="rejected">Ditolak</option>
                    )}
                  </select>
                </label>

                {isPublicationGranter && (
                  <label className="flex flex-col gap-1 text-sm font-semibold text-stone-700">
                    Diunggah Oleh
                    <select
                      value={ownerFilter}
                      onChange={(event) => setOwnerFilter(event.target.value)}
                      className="rounded-lg border border-stone-300 bg-white px-3 py-2 font-normal"
                    >
                      <option value="all">Semua Partner</option>
                      {datasetFilterOptions.owners.map((ownerId) => (
                        <option key={ownerId} value={ownerId}>
                          {ownerNameMap[ownerId] ?? getOwnerName(ownerId)}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>

              {pendingPublicationCount > 0 && (
                <div
                  role="status"
                  className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 shadow-sm"
                >
                  {pendingPublicationCount} dataset masih menunggu persetujuan publikasi.
                </div>
              )}

              {ownerGroups.map((group) => (
                <section key={group.ownerId} className="flex flex-col gap-3">
                  <div className="relative flex w-full items-center justify-between">
                    <h2 className="mb-1 text-lg font-bold">
                      {group.ownerName}
                    </h2>

                    {!isPublicationReviewer && (role === "admin" || group.ownerId === userId) &&
                      renderGroupActions(group.ownerId)}
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
                      const statusCallout = getStatusCallout(dataset);

                      return (
                        <button
                          key={dataset.id}
                          type="button"
                          className="group flex w-full items-center justify-between gap-3 rounded-2xl border-1 border-stone-200 bg-white p-3 text-left shadow-xl hover:bg-sky-800 hover:text-white cursor-pointer"
                          onClick={() => {
                            setMainPage("main");
                            setAction("list");
                            window.dispatchEvent(
                              new Event("dash-side-menu-close"),
                            );

                            window.setTimeout(() => {
                              if (!mountedRef.current) return;

                              if (dataset.kind === "dashboard") {
                                router.push(
                                  `/profile/data/${toSlug(dataset.label)}${isPublicationReviewer ? "?view=publication" : ""}`,
                                );
                                return;
                              }
                              router.push(
                                `/profile/data/${toSlug(dataset.label)}${
                                  dataset.kind === "map"
                                    ? isPublicationReviewer ? "?view=publication" : "?view=mapdataset"
                                    : dataset.kind === "link"
                                      ? "?view=publication"
                                      : isPublicationReviewer ? "?view=publication" : ""
                                }`,
                              );
                            }, 500);
                          }}
                        >
                          <span className="min-w-0 flex-1 text-left">
                            <span className="block">{dataset.label}</span>
                            <span className="mt-0.5 block text-xs text-gray-500 group-hover:text-white/80">
                              Dilihat: {dataset.view_count ?? 0}
                              {dataset.kind !== "link" && (
                                <>
                                  {" "}
                                  | Diunduh: {dataset.download_count ?? 0}
                                </>
                              )}
                            </span>
                            <span className="mt-1 block text-xs text-gray-500 group-hover:text-white/80">
                              Terakhir diupdate oleh {dataset.updated_by ??
                                ownerRows.find(
                                  (owner) => owner.id === dataset.user_id,
                                )?.username ??
                                "Tidak diketahui"}
                            </span>
                            <span className="block text-xs text-gray-500 group-hover:text-white/80">
                              {formatWitDateTime(dataset.updated_at)}
                            </span>
                          </span>

                          {dataset.kind === "dataset" && (
                            <span className="shrink-0 rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700">
                              table
                            </span>
                          )}
                          {dataset.kind === "map" && (
                            <span className="shrink-0 rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800">
                              peta
                            </span>
                          )}
                          {dataset.kind === "link" && (
                            <span className="shrink-0 rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-800">
                              link
                            </span>
                          )}
                          {dataset.kind === "dashboard" && (
                            <span className="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                              dashboard
                            </span>
                          )}

                          <span
                            data-status-callout="true"
                            className="group/status relative shrink-0"
                          >
                            <span
                              role="button"
                              tabIndex={0}
                              aria-expanded={openStatusCallout === dataset.id}
                              title={publicationStatus.title}
                              onClick={(event) => {
                                event.stopPropagation();
                                setOpenStatusCallout((current) =>
                                  current === dataset.id ? null : dataset.id,
                                );
                              }}
                              onKeyDown={(event) => {
                                if (event.key !== "Enter" && event.key !== " ") {
                                  return;
                                }
                                event.preventDefault();
                                event.stopPropagation();
                                setOpenStatusCallout((current) =>
                                  current === dataset.id ? null : dataset.id,
                                );
                              }}
                              className={`block rounded-full px-3 py-1 text-xs font-semibold ${publicationStatus.className}`}
                            >
                              {publicationStatus.label}
                            </span>

                            <span
                              role="tooltip"
                              className={`${
                                openStatusCallout === dataset.id
                                  ? "block"
                                  : "hidden group-hover/status:block group-focus-within/status:block"
                              } absolute right-0 top-full z-[100] mt-2 w-56 rounded-lg border border-stone-300 bg-white px-3 py-2 text-left text-xs font-normal leading-relaxed text-stone-700 shadow-xl`}
                              onClick={(event) => event.stopPropagation()}
                            >
                              <span className="block">{statusCallout.message}</span>
                              <span className="block font-semibold">
                                {statusCallout.date}
                              </span>
                              {getPublicationFilterValue(dataset) === "process" && (
                                <span className="mt-2 block space-y-1 border-t border-stone-200 pt-2">
                                  <span className="flex justify-between gap-3"><span>Kadis</span><strong>{getApprovalLabel(dataset.approval_statuses?.kadis)}</strong></span>
                                  <span className="flex justify-between gap-3"><span>Sekdis</span><strong>{getApprovalLabel(dataset.approval_statuses?.sekdis)}</strong></span>
                                  <span className="flex justify-between gap-3"><span>Admin</span><strong>{getApprovalLabel(dataset.approval_statuses?.admin)}</strong></span>
                                </span>
                              )}
                            </span>
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
              canAdd={Boolean(datasetAccess.can_add)}
              previewOnly={isSharedPartnerDataset || isPublicationReviewer}
              onVisualizationSaved={handleVisualizationSaved}
            />
          )}
          {isDetailPage && selectedDataset?.kind === "link" && (
            <Dataset
              datasetId={selectedDataset.id}
              action="list"
              saveData={saveData}
              onSignalAction={handleSignalAction}
              onChangeCountChange={handleActionChangeCount}
              role={role}
              linkMode
            />
          )}
          {isDetailPage && selectedDataset?.kind === "dashboard" && (
            <DashboardWorkflowView
              workflowId={selectedDataset.id}
              detailPath={`/profile/data/${currentSlug}`}
              stage={
                detailView === "configuration"
                  ? "configuration"
                  : detailView === "visualization"
                  ? "visualization"
                  : detailView === "publication"
                    ? "publication"
                    : "upload"
              }
              onExit={resetToHome}
              action={action}
              onUploadReadinessChange={handleDashboardUploadReadiness}
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
                onVisualizationSaved={handleVisualizationSaved}
                onCreated={() => setDetailAction("list")}
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
            {(mainPage === "add" || mainPage === "mapadd" || mainPage === "linkadd" || mainPage === "dashboard") && (
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

                {!isPartnerRole(role) && (
                  <>
                    <Button
                      variant={mainPage === "linkadd" ? "outline" : "primary"}
                      size="md"
                      onClick={() => setLinkAddAction(selectedActionOwnerId)}
                    >
                      Link
                    </Button>

                    <Button
                      variant={mainPage === "dashboard" ? "outline" : "primary"}
                      size="md"
                      onClick={() => router.push("/profile/data?action=dashboardadd")}
                    >
                      Dashboard
                    </Button>
                  </>
                )}
              </div>
            )}

            {mainPage === "dashboard" ? (
              <DashboardWorkflowView
                stage={
                  searchParams.get("action") === "dashboardvisualize"
                    ? "visualization"
                    : searchParams.get("action") === "dashboardpublish"
                      ? "publication"
                      : searchParams.get("workflow")
                        ? "upload"
                        : "selection"
                }
                onExit={resetToHome}
              />
            ) : mainPage === "linkadd" ? (
              <LinkDatasetCreate
                ownerId={selectedActionOwnerId}
                saveData={saveData}
                onReadyChange={setAddDataReady}
                onCreated={handleSignalDatasetAction}
              />
            ) : mainPage === "mapadd" ? (
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

      {mobileActions.mounted && !isLinkDetail && !isPublicationReviewer && (
        <div
          className="h-[calc(16rem+env(safe-area-inset-bottom))] md:hidden"
          aria-hidden="true"
        />
      )}

      {saveCancelActions.mounted && (
        <div
          className="h-[calc(11rem+env(safe-area-inset-bottom))] md:hidden"
          aria-hidden="true"
        />
      )}

      {mobileActions.mounted && !isLinkDetail && !isPublicationReviewer && (
        <div
          className={`fixed inset-0 z-[1200] md:hidden ${mobileActions.closing ? "pointer-events-none bg-transparent" : "bg-gray-950/70"}`}
          onClick={() => setShowMobileAction(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`${mobileActions.closing ? "bottom-menu-collapse" : "bottom-menu-expand"} fixed bottom-0 left-0 z-[1200] flex w-full flex-col items-center justify-center gap-3 rounded-t-2xl bg-stone-900 p-5`}
          >
          <div className="flex w-full flex-col gap-2">
            {selectedDataset?.kind !== "dashboard" && <button
              className="w-full rounded-xl border-2 border-white py-2 text-md text-white"
              onClick={handleDownloadCsv}
            >
              Download CSV
            </button>}
            {role === "admin" && (selectedDataset?.kind === "dataset" || selectedDataset?.kind === "dashboard") && (
              <button
                className="w-full rounded-xl border-2 border-white py-2 text-md text-white"
                onClick={() => setDetailView("configuration")}
              >
                Pengaturan
              </button>
            )}
          </div>

          <div className="flex gap-2 w-full">
            {selectedDataset?.kind !== "dashboard" && datasetAccess.can_edit && <button
              className="w-full bg-sky-800 rounded-xl border-2 border-white py-2 text-md text-white"
              onClick={() => {
                setDetailAction("edit");
              }}
            >
              Edit
            </button>}

            {datasetAccess.can_add && <button
              className="w-full bg-green-600 rounded-xl border-2 border-white py-2 text-md text-white"
              onClick={() => {
                setDetailAction("add");
              }}
            >
              Tambah
            </button>}

            {selectedDataset?.kind !== "dashboard" && datasetAccess.can_delete && <button
              className="w-full bg-red-600 rounded-xl border-2 border-white py-2 text-md text-white"
              onClick={() => {
                setDetailAction("delete");
              }}
            >
              Hapus
            </button>}
          </div>
          </div>
        </div>
      )}

      {saveCancelActions.mounted && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`${saveCancelActions.closing ? "bottom-menu-collapse" : "bottom-menu-expand"} fixed bottom-0 left-0 z-40 flex w-full flex-col justify-center gap-3 rounded-t-2xl bg-stone-900 p-5 md:hidden`}
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

          {((mainPage === "linkadd") ||
            (isAddMode && addDataReady) ||
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
