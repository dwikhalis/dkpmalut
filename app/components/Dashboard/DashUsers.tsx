"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase/supabaseClient";
import { useUrlQueryState } from "@/lib/hooks/useUrlQueryState";
import AlertNotif from "../AlertNotif";
import SpinnerLoading from "../SpinnerLoading";
import AuthAdminAccess from "@/app/Auth/AuthAdminAccess";
import { getSessionCache, setSessionCache } from "@/lib/utils/sessionCache";

const USERS_CACHE_KEY = "dashboard-users";
const USERS_CACHE_TTL = 2 * 60 * 1000;

type UserRow = {
  id: string;
  created_at: string | null;
  username: string | null;
  email: string | null;
  organization: string | null;
  email_confirmed: boolean | null;
  role: string | null;
  gender: string | null;
  phone: string | null;
  occupation: string | null;
  image_path: string | null;
};

type FilterKey =
  | "all"
  | "created_at"
  | "username"
  | "gender"
  | "email_confirmed"
  | "organization"
  | "occupation"
  | "role";

type SortKey =
  | "created_at_newest"
  | "created_at_oldest"
  | "username_asc"
  | "username_desc"
  | "gender_asc"
  | "gender_desc"
  | "email_confirmed_asc"
  | "email_confirmed_desc"
  | "organization_asc"
  | "organization_desc"
  | "occupation_asc"
  | "occupation_desc"
  | "role_asc"
  | "role_desc";

type AlertType = null | "confirm-role" | "success-role" | "error-role";

type PendingRoleChange = {
  userId: string;
  username: string;
  oldRole: string;
  newRole: string;
} | null;

const DEFAULT_PROFILE_IMAGE = "/assets/icon_profile_u.png";

const roleOptions = ["admin", "partner", "user"];

const filterOptions: { label: string; value: FilterKey }[] = [
  { label: "Semua Kolom", value: "all" },
  { label: "Terdaftar", value: "created_at" },
  { label: "Nama", value: "username" },
  { label: "Gender", value: "gender" },
  { label: "Konfirm Email", value: "email_confirmed" },
  { label: "Organisasi", value: "organization" },
  { label: "Pekerjaan", value: "occupation" },
  { label: "Akses", value: "role" },
];

const sortOptions: { label: string; value: SortKey }[] = [
  { label: "Terdaftar - Terbaru", value: "created_at_newest" },
  { label: "Terdaftar - Terlama", value: "created_at_oldest" },
  { label: "Nama - A-Z", value: "username_asc" },
  { label: "Nama - Z-A", value: "username_desc" },
  { label: "Gender - A-Z", value: "gender_asc" },
  { label: "Gender - Z-A", value: "gender_desc" },
  { label: "Konfirm Email - A-Z", value: "email_confirmed_asc" },
  { label: "Konfirm Email - Z-A", value: "email_confirmed_desc" },
  { label: "Organisasi - A-Z", value: "organization_asc" },
  { label: "Organisasi - Z-A", value: "organization_desc" },
  { label: "Pekerjaan - A-Z", value: "occupation_asc" },
  { label: "Pekerjaan - Z-A", value: "occupation_desc" },
  { label: "Akses - A-Z", value: "role_asc" },
  { label: "Akses - Z-A", value: "role_desc" },
];

const filterOptionValues = filterOptions.map((option) => option.value);
const sortOptionValues = sortOptions.map((option) => option.value);

function getPublicImageUrl(imagePath: string | null | undefined) {
  if (!imagePath) return DEFAULT_PROFILE_IMAGE;

  if (imagePath.startsWith("http")) return imagePath;
  if (imagePath.startsWith("/")) return imagePath;

  const { data } = supabase.storage.from("images").getPublicUrl(imagePath);

  return data.publicUrl || DEFAULT_PROFILE_IMAGE;
}

function formatDateTime(value: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  const formatter = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jayapura", // WIT
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);

  const day = parts.find((part) => part.type === "day")?.value ?? "00";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  const year = parts.find((part) => part.type === "year")?.value ?? "00";
  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";

  return `${day}-${month}-${year} / ${hour}:${minute} WIT`;
}

function displayText(value: string | null | undefined) {
  return value && value.trim() !== "" ? value : "-";
}

function displayGender(value: string | null | undefined) {
  if (!value) return "-";

  if (value === "Male") return "Laki-laki";
  if (value === "Female") return "Perempuan";

  return value;
}

function displayEmailConfirm(value: boolean | null | undefined) {
  if (value === true) return "Ya";
  if (value === false) return "Tidak";

  return "-";
}

function getFilterDisplayValue(user: UserRow, key: FilterKey) {
  if (key === "created_at") return formatDateTime(user.created_at);
  if (key === "username") return displayText(user.username);
  if (key === "gender") return displayGender(user.gender);
  if (key === "email_confirmed")
    return displayEmailConfirm(user.email_confirmed);
  if (key === "organization") return displayText(user.organization);
  if (key === "occupation") return displayText(user.occupation);
  if (key === "role") return displayText(user.role);

  return "";
}

function getSortableValue(user: UserRow, field: FilterKey) {
  if (field === "created_at") {
    return user.created_at ? new Date(user.created_at).getTime() : 0;
  }

  if (field === "email_confirmed") {
    return displayEmailConfirm(user.email_confirmed).toLowerCase();
  }

  if (field === "gender") {
    return displayGender(user.gender).toLowerCase();
  }

  if (field === "username") return displayText(user.username).toLowerCase();
  if (field === "organization") {
    return displayText(user.organization).toLowerCase();
  }
  if (field === "occupation") {
    return displayText(user.occupation).toLowerCase();
  }
  if (field === "role") return displayText(user.role).toLowerCase();

  return "";
}

function parseSortKey(sortKey: SortKey): {
  field: FilterKey;
  direction: "asc" | "desc";
} {
  if (sortKey === "created_at_newest") {
    return { field: "created_at", direction: "desc" };
  }

  if (sortKey === "created_at_oldest") {
    return { field: "created_at", direction: "asc" };
  }

  const parts = sortKey.split("_");
  const direction = parts[parts.length - 1] === "desc" ? "desc" : "asc";
  const field = parts.slice(0, -1).join("_") as FilterKey;

  return {
    field,
    direction,
  };
}

export default function DashUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingRole, setSavingRole] = useState(false);

  const [sortKey, setSortKey] = useUrlQueryState<SortKey>(
    "sort",
    "created_at_newest",
    {
      allowedValues: sortOptionValues,
    },
  );
  const [filterKey, setFilterKey] = useUrlQueryState<FilterKey>(
    "filter",
    "all",
    {
      allowedValues: filterOptionValues,
    },
  );
  const [filterValue, setFilterValue] = useUrlQueryState<string>(
    "value",
    "all",
  );

  const [alertType, setAlertType] = useState<AlertType>(null);
  const [pendingRoleChange, setPendingRoleChange] =
    useState<PendingRoleChange>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const cached = getSessionCache<UserRow[]>(
        USERS_CACHE_KEY,
        USERS_CACHE_TTL,
      );

      if (cached) {
        setUsers(cached);
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select(
          "id, created_at, username, email, organization, email_confirmed, role, gender, phone, occupation, image_path",
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      const nextUsers = (data ?? []) as UserRow[];
      setUsers(nextUsers);
      setSessionCache(USERS_CACHE_KEY, nextUsers);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      setErrorMsg(
        error instanceof Error
          ? error.message
          : "Gagal mengambil data pengguna.",
      );
      setAlertType("error-role");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filterValues = useMemo(() => {
    if (filterKey === "all") return [];

    const uniqueValues = Array.from(
      new Set(
        users
          .map((user) => getFilterDisplayValue(user, filterKey))
          .filter((value) => value && value !== "-"),
      ),
    );

    return uniqueValues.sort((a, b) => a.localeCompare(b));
  }, [users, filterKey]);

  useEffect(() => {
    if (loading) return;

    if (filterKey === "all") {
      if (filterValue !== "all") {
        setFilterValue("all");
      }

      return;
    }

    if (filterValues.length === 0) return;

    if (filterValue !== "all" && !filterValues.includes(filterValue)) {
      setFilterValue("all");
    }
  }, [filterKey, filterValue, filterValues, loading, setFilterValue]);

  const visibleUsers = useMemo(() => {
    const { field, direction } = parseSortKey(sortKey);

    let result = [...users];

    if (filterKey !== "all" && filterValue !== "all") {
      result = result.filter((user) => {
        return getFilterDisplayValue(user, filterKey) === filterValue;
      });
    }

    result.sort((a, b) => {
      const aValue = getSortableValue(a, field);
      const bValue = getSortableValue(b, field);

      if (typeof aValue === "number" && typeof bValue === "number") {
        return direction === "asc" ? aValue - bValue : bValue - aValue;
      }

      const comparison = String(aValue).localeCompare(String(bValue));

      return direction === "asc" ? comparison : -comparison;
    });

    return result;
  }, [users, sortKey, filterKey, filterValue]);

  const handleRoleSelect = (
    event: ChangeEvent<HTMLSelectElement>,
    user: UserRow,
  ) => {
    const newRole = event.target.value;
    const oldRole = user.role ?? "";

    if (newRole === oldRole) return;

    setPendingRoleChange({
      userId: user.id,
      username: user.username || user.email || "pengguna ini",
      oldRole,
      newRole,
    });

    setAlertType("confirm-role");
  };

  const handleConfirmRoleChange = async () => {
    if (!pendingRoleChange) return;

    try {
      setSavingRole(true);
      setErrorMsg(null);

      const { error } = await supabase
        .from("users")
        .update({
          role: pendingRoleChange.newRole,
        })
        .eq("id", pendingRoleChange.userId);

      if (error) throw error;

      setUsers((prev) =>
        prev.map((user) =>
          user.id === pendingRoleChange.userId
            ? {
                ...user,
                role: pendingRoleChange.newRole,
              }
            : user,
        ),
      );
      setSessionCache(
        USERS_CACHE_KEY,
        users.map((user) =>
          user.id === pendingRoleChange.userId
            ? { ...user, role: pendingRoleChange.newRole }
            : user,
        ),
      );

      setAlertType("success-role");
    } catch (error) {
      console.error("Failed to update user role:", error);
      setErrorMsg(
        error instanceof Error
          ? error.message
          : "Gagal mengubah akses pengguna.",
      );
      setAlertType("error-role");
    } finally {
      setSavingRole(false);
    }
  };

  const handleRoleConfirmation = (confirmation: boolean) => {
    if (!confirmation) {
      setAlertType(null);
      setPendingRoleChange(null);
      return;
    }

    handleConfirmRoleChange();
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] w-full items-center justify-center">
        <SpinnerLoading size="sm" color="black" />
      </div>
    );
  }

  return (
    <AuthAdminAccess>
      <div className="flex w-full min-h-[70vh] flex-col gap-6 rounded-2xl">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-6">
            <h1>Pengguna</h1>
            <div className="flex flex-col gap-3 md:flex-row">
              <div className="flex flex-col">
                <label
                  htmlFor="sort"
                  className="mb-1 text-[2.8vw] md:text-[1.5vw] lg:text-sm"
                >
                  Urutkan
                </label>
                <select
                  id="sort"
                  value={sortKey}
                  onChange={(event) =>
                    setSortKey(event.target.value as SortKey)
                  }
                  className="rounded-md bg-stone-100 px-3 py-2 text-[2.8vw] outline-none focus:ring-2 focus:ring-sky-400 md:text-[1.5vw] lg:text-sm"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col">
                <label
                  htmlFor="filter-column"
                  className="mb-1 text-[2.8vw] md:text-[1.5vw] lg:text-sm"
                >
                  Filter Kolom
                </label>
                <select
                  id="filter-column"
                  value={filterKey}
                  onChange={(event) => {
                    setFilterKey(event.target.value as FilterKey);
                    setFilterValue("all");
                  }}
                  className="rounded-md bg-stone-100 px-3 py-2 text-[2.8vw] outline-none focus:ring-2 focus:ring-sky-400 md:text-[1.5vw] lg:text-sm"
                >
                  {filterOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col">
                <label
                  htmlFor="filter-value"
                  className="mb-1 text-[2.8vw] md:text-[1.5vw] lg:text-sm"
                >
                  Nilai Filter
                </label>
                <select
                  id="filter-value"
                  value={filterValue}
                  onChange={(event) => setFilterValue(event.target.value)}
                  disabled={filterKey === "all"}
                  className="rounded-md bg-stone-100 px-3 py-2 text-[2.8vw] outline-none focus:ring-2 focus:ring-sky-400 disabled:cursor-not-allowed disabled:text-stone-400 md:text-[1.5vw] lg:text-sm"
                >
                  <option value="all">Semua Data</option>

                  {filterValues.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {visibleUsers.length === 0 ? (
          <div className="rounded-2xl border border-stone-200 bg-white px-4 py-10 text-center text-stone-600">
            Tidak ada data pengguna.
          </div>
        ) : (
          <div className="grid w-full gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visibleUsers.map((user, index) => (
              <article
                key={user.id}
                className="min-w-0 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                <header className="flex items-center gap-4 border-b border-stone-100 bg-sky-50 p-4">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-sky-700 bg-stone-100">
                    <Image
                      src={getPublicImageUrl(user.image_path)}
                      alt={user.username || "Foto pengguna"}
                      width={100}
                      height={100}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h5 className="truncate font-semibold text-sky-950">
                        {displayText(user.username)}
                      </h5>
                      <span className="shrink-0 text-xs font-medium text-stone-400">
                        #{index + 1}
                      </span>
                    </div>
                    <p className="truncate text-sm text-stone-600">
                      {displayText(user.email)}
                    </p>
                  </div>
                </header>

                <div className="space-y-4 p-4">
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    <div className="col-span-2">
                      <dt className="text-xs text-stone-500">Terdaftar</dt>
                      <dd className="mt-0.5 font-medium text-stone-800">
                        {formatDateTime(user.created_at)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-stone-500">Gender</dt>
                      <dd className="mt-0.5 text-stone-800">
                        {displayGender(user.gender)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-stone-500">Konfirm Email</dt>
                      <dd className="mt-0.5 text-stone-800">
                        {displayEmailConfirm(user.email_confirmed)}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-xs text-stone-500">Kontak</dt>
                      <dd className="mt-0.5 truncate text-stone-800">
                        {displayText(user.phone)}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-xs text-stone-500">Organisasi</dt>
                      <dd className="mt-0.5 truncate text-stone-800">
                        {displayText(user.organization)}
                      </dd>
                    </div>
                    <div className="col-span-2 min-w-0">
                      <dt className="text-xs text-stone-500">Pekerjaan</dt>
                      <dd className="mt-0.5 truncate text-stone-800">
                        {displayText(user.occupation)}
                      </dd>
                    </div>
                  </dl>

                  <label className="block border-t border-stone-100 pt-4 text-sm">
                    <span className="mb-1 block text-xs font-medium text-stone-500">
                      Akses
                    </span>
                    <select
                      value={user.role ?? ""}
                      onChange={(event) => handleRoleSelect(event, user)}
                      className="w-full rounded-lg border border-stone-200 bg-stone-100 px-3 py-2 font-medium outline-none focus:ring-2 focus:ring-sky-400"
                      disabled={savingRole}
                    >
                      <option value="" disabled>
                        Pilih Akses
                      </option>

                      {roleOptions.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {alertType === "confirm-role" && pendingRoleChange && (
        <AlertNotif
          type="double"
          msg={`Ubah akses ${pendingRoleChange.username} menjadi ${pendingRoleChange.newRole}?`}
          yesText="Ya"
          noText="Tidak"
          icon="warning"
          loading={savingRole}
          confirm={handleRoleConfirmation}
        />
      )}

      {alertType === "success-role" && (
        <AlertNotif
          type="single"
          msg="Akses pengguna berhasil diubah."
          yesText="OK"
          icon="success"
          confirm={() => {
            setAlertType(null);
            setPendingRoleChange(null);
          }}
        />
      )}

      {alertType === "error-role" && (
        <AlertNotif
          type="single"
          msg={errorMsg || "Gagal mengubah akses pengguna."}
          yesText="OK"
          icon="error"
          confirm={() => {
            setAlertType(null);
            setPendingRoleChange(null);
          }}
        />
      )}
    </AuthAdminAccess>
  );
}
