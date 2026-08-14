"use client";

import { useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabase/supabaseClient";
import SpinnerLoading from "../SpinnerLoading";
import { getSessionCache, setSessionCache } from "@/lib/utils/sessionCache";

const ACTIVITY_LOG_CACHE_KEY = "dashboard-activity-log";
const ACTIVITY_LOG_CACHE_TTL = 30 * 1000;

type ActivityLog = {
  id: string;
  action: "INSERT" | "UPDATE" | "DELETE";
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  actor: { username: string | null; email: string; role: string } | null;
};

const actionStyles = {
  INSERT: {
    label: "INSERT",
    className: "bg-emerald-100 text-emerald-700 ring-emerald-600/20",
  },
  UPDATE: {
    label: "UPDATE",
    className: "bg-amber-100 text-amber-700 ring-amber-600/20",
  },
  DELETE: {
    label: "DELETE",
    className: "bg-red-100 text-red-700 ring-red-600/20",
  },
};

const entityLabels: Record<string, string> = {
  app_cms: "Konten aplikasi",
  users: "Pengguna",
  messages: "Pesan",
  datasets: "Dataset",
  map_datasets: "Dataset peta",
  map_layers: "Layer peta",
  map_legend_items: "Legenda peta",
  table_config: "Konfigurasi tabel",
  dataset_import_batches: "Batch data",
  dataset_access_grants: "Hak akses dataset",
  dataset_validation_configs: "Validasi data",
};

const entityPageLabels: Record<string, string> = {
  users: "Profil",
  messages: "Kontak",
  datasets: "Data",
  map_datasets: "Peta",
  map_layers: "Peta",
  map_legend_items: "Peta",
  table_config: "Dashboard",
  dataset_import_batches: "Data",
  dataset_access_grants: "Data",
  dataset_validation_configs: "Data",
};

const cmsPageLabels: Record<string, string> = {
  navbar: "Semua Halaman",
  footer: "Semua Halaman",
  hero: "Beranda",
  secone: "Beranda",
  sectwo: "Beranda",
  secthree: "Beranda",
  secfour: "Beranda",
  secfive: "Beranda",
  secsix: "Beranda",
  page_rates: "Informasi Tarif",
  page_regulations: "Peraturan",
  page_privacy: "Kebijakan Privasi",
  page_terms: "Syarat dan Ketentuan",
  page_accessibility: "Aksesibilitas",
  page_contact: "Kontak",
};

function metadataText(metadata: Record<string, unknown> | null, key: string) {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function changedFields(metadata: Record<string, unknown> | null) {
  const value = metadata?.changed_fields;
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

const operationLabels: Record<string, string> = {
  UPLOAD_BATCH: "Upload batch data",
  DELETE_BATCH: "Hapus batch data",
  UPDATE_ACCESS: "Ubah hak akses",
  UPDATE_DUPLICATE_VALIDATION: "Ubah validasi duplikasi",
};

function metadataNumber(
  metadata: Record<string, unknown> | null,
  key: string,
) {
  const value = metadata?.[key];
  return typeof value === "number" ? value : 0;
}

function impactedPage(log: ActivityLog) {
  if (log.entity_type === "app_cms") {
    const component = metadataText(log.metadata, "component");
    return (component && cmsPageLabels[component]) || "Aplikasi";
  }

  return entityPageLabels[log.entity_type] ?? "Dashboard";
}

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeZone: "Asia/Jayapura",
});

const timeFormatter = new Intl.DateTimeFormat("id-ID", {
  timeStyle: "short",
  timeZone: "Asia/Jayapura",
});

const dateFilterFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "Asia/Jayapura",
});

const LOGS_PER_PAGE = 50;

function actorFilterValue(log: ActivityLog) {
  return log.actor?.email || log.actor?.username || "__system";
}

function actorName(log: ActivityLog) {
  return log.actor?.username || log.actor?.email || "System";
}

function actorRole(log: ActivityLog) {
  return log.actor?.role || "system";
}

export default function DashActivityLog() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [pageFilter, setPageFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    async function loadLogs() {
      const cached = getSessionCache<ActivityLog[]>(
        ACTIVITY_LOG_CACHE_KEY,
        ACTIVITY_LOG_CACHE_TTL,
      );

      if (cached) {
        setLogs(cached);
        setLoading(false);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setError("Sesi admin tidak tersedia.");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/activity-logs", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const result = await response.json();

      if (!response.ok)
        setError(result.message || "Log aktivitas gagal dimuat.");
      else {
        const nextLogs = result.logs ?? [];
        setLogs(nextLogs);
        setSessionCache(ACTIVITY_LOG_CACHE_KEY, nextLogs);
      }
      setLoading(false);
    }

    void loadLogs();
  }, []);

  const userOptions = useMemo(() => {
    const options = new Map<string, string>();
    logs.forEach((log) => {
      options.set(
        actorFilterValue(log),
        actorName(log),
      );
    });
    return [...options.entries()].sort(([, a], [, b]) =>
      a.localeCompare(b, "id", { sensitivity: "base" }),
    );
  }, [logs]);

  const pageOptions = useMemo(
    () =>
      [...new Set(logs.map(impactedPage))].sort((a, b) =>
        a.localeCompare(b, "id", { sensitivity: "base" }),
      ),
    [logs],
  );

  const filteredLogs = useMemo(
    () =>
      logs.filter((log) => {
        if (
          dateFilter &&
          dateFilterFormatter.format(new Date(log.created_at)) !== dateFilter
        )
          return false;
        if (userFilter && actorFilterValue(log) !== userFilter) return false;
        if (actionFilter && log.action !== actionFilter) return false;
        if (pageFilter && impactedPage(log) !== pageFilter) return false;
        return true;
      }),
    [actionFilter, dateFilter, logs, pageFilter, userFilter],
  );

  const hasFilters = Boolean(
    dateFilter || userFilter || actionFilter || pageFilter,
  );

  const totalPages = Math.max(
    1,
    Math.ceil(filteredLogs.length / LOGS_PER_PAGE),
  );

  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * LOGS_PER_PAGE;
    return filteredLogs.slice(start, start + LOGS_PER_PAGE);
  }, [currentPage, filteredLogs]);

  useEffect(() => {
    setCurrentPage(1);
  }, [actionFilter, dateFilter, pageFilter, userFilter]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  return (
    <section className="min-h-[70vh] w-full min-w-0 space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-stone-900">Log Aktivitas</h1>
        <p className="mt-2 text-sm text-stone-600">
          Riwayat perubahan data oleh admin, partner, dan sistem.
        </p>
      </header>

      {loading ? (
        <div className="flex min-h-48 items-center justify-center">
          <SpinnerLoading size="sm" color="black" />
        </div>
      ) : error ? (
        <p className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>
      ) : logs.length === 0 ? (
        <p className="rounded-xl bg-stone-50 p-4 text-stone-600">
          Belum ada aktivitas tercatat.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:grid-cols-2 xl:grid-cols-5">
            <label className="text-xs font-bold text-stone-600">
              Tanggal
              <input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2 text-sm font-normal text-stone-800" />
            </label>
            <label className="text-xs font-bold text-stone-600">
              Pengguna
              <select value={userFilter} onChange={(event) => setUserFilter(event.target.value)} className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2 text-sm font-normal text-stone-800">
                <option value="">Semua pengguna</option>
                {userOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold text-stone-600">
              Aktivitas
              <select value={actionFilter} onChange={(event) => setActionFilter(event.target.value)} className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2 text-sm font-normal text-stone-800">
                <option value="">Semua aktivitas</option>
                {Object.keys(actionStyles).map((action) => <option key={action} value={action}>{action}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold text-stone-600">
              Halaman
              <select value={pageFilter} onChange={(event) => setPageFilter(event.target.value)} className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2 text-sm font-normal text-stone-800">
                <option value="">Semua halaman</option>
                {pageOptions.map((page) => <option key={page} value={page}>{page}</option>)}
              </select>
            </label>
            <div className="flex items-end">
              <button type="button" disabled={!hasFilters} onClick={() => { setDateFilter(""); setUserFilter(""); setActionFilter(""); setPageFilter(""); }} className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 disabled:cursor-not-allowed disabled:opacity-40">Reset filter</button>
            </div>
          </div>

          <p className="text-sm text-stone-500">
            Menampilkan {filteredLogs.length} dari {logs.length} aktivitas
          </p>

          <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
          <table className="min-w-full table-auto text-left text-sm">
            <thead className="bg-stone-100 text-stone-700">
              <tr>
                <th className="whitespace-nowrap p-4">Waktu</th>
                <th className="whitespace-nowrap p-4">Pengguna</th>
                <th className="whitespace-nowrap p-4">Aktivitas</th>
                <th className="whitespace-nowrap p-4">Halaman</th>
                <th className="whitespace-nowrap p-4">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {paginatedLogs.map((log) => (
                <tr key={log.id}>
                  <td className="whitespace-nowrap p-4">
                    <span className="block font-medium text-stone-800">
                      {dateFormatter.format(new Date(log.created_at))}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-stone-500">
                      <span>{timeFormatter.format(new Date(log.created_at))}</span>
                      <span className="text-[10px] font-medium text-stone-400">
                        WIT
                      </span>
                    </span>
                  </td>
                  <td className="whitespace-nowrap p-4">
                    <span className="font-medium">
                      {actorName(log)}
                    </span>
                    <span className="block text-xs text-stone-500">
                      {actorRole(log)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap p-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${actionStyles[log.action].className}`}
                    >
                      {actionStyles[log.action].label}
                    </span>
                  </td>
                  <td className="whitespace-nowrap p-4 text-stone-700">
                    {impactedPage(log)}
                  </td>
                  <td className="whitespace-nowrap p-4">
                    <span className="font-medium">
                      {entityLabels[log.entity_type] ?? log.entity_type}
                    </span>
                    {metadataText(log.metadata, "label") && (
                      <span className="block text-sm text-stone-700">
                        {metadataText(log.metadata, "label")}
                      </span>
                    )}
                    {(metadataText(log.metadata, "component") ||
                      metadataText(log.metadata, "target")) && (
                      <span className="block text-xs text-stone-600">
                        {[
                          metadataText(log.metadata, "component"),
                          metadataText(log.metadata, "target"),
                        ]
                          .filter(Boolean)
                          .join(" / ")}
                      </span>
                    )}
                    {changedFields(log.metadata).length > 0 && (
                      <span className="block text-xs text-stone-500">
                        Kolom: {changedFields(log.metadata).join(", ")}
                      </span>
                    )}
                    {metadataText(log.metadata, "operation") && (
                      <span className="block text-xs font-medium text-sky-700">
                        {operationLabels[
                          metadataText(log.metadata, "operation") ?? ""
                        ] ?? metadataText(log.metadata, "operation")}
                      </span>
                    )}
                    {metadataNumber(log.metadata, "row_count") > 0 && (
                      <span className="block text-xs text-stone-500">
                        Jumlah baris:{" "}
                        {metadataNumber(log.metadata, "row_count")}
                      </span>
                    )}
                    {log.metadata?.row_changes != null &&
                      typeof log.metadata.row_changes === "object" && (
                        <span className="block text-xs text-stone-500">
                          Baris: +
                          {metadataNumber(
                            log.metadata.row_changes as Record<string, unknown>,
                            "added_count",
                          )}{" "}
                          / diubah{" "}
                          {metadataNumber(
                            log.metadata.row_changes as Record<string, unknown>,
                            "updated_count",
                          )}{" "}
                          / dihapus{" "}
                          {metadataNumber(
                            log.metadata.row_changes as Record<string, unknown>,
                            "removed_count",
                          )}
                        </span>
                      )}
                    {metadataText(log.metadata, "granted_user_name") && (
                      <span className="block text-xs text-stone-500">
                        Partner:{" "}
                        {metadataText(log.metadata, "granted_user_name")}
                      </span>
                    )}
                    {log.entity_id && (
                      <span className="block max-w-64 truncate text-xs text-stone-500">
                        {log.entity_id}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-stone-500">
                    Tidak ada aktivitas yang sesuai dengan filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>

          {filteredLogs.length > 0 && totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm shadow-sm">
              <span className="text-stone-600">
                Halaman {currentPage} dari {totalPages}
              </span>
              <div className="flex gap-2">
                <button type="button" disabled={currentPage === 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} className="rounded-lg border border-stone-300 px-3 py-1.5 font-semibold text-stone-700 disabled:cursor-not-allowed disabled:opacity-40">Sebelumnya</button>
                <button type="button" disabled={currentPage === totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} className="rounded-lg border border-stone-300 px-3 py-1.5 font-semibold text-stone-700 disabled:cursor-not-allowed disabled:opacity-40">Berikutnya</button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
