"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase/supabaseClient";
import AlertNotif from "./AlertNotif";
import SpinnerLoading from "./SpinnerLoading";
import AuthAdminAccess from "../Auth/AuthAdminAccess";

type UserRow = {
  id: string;
  created_at: string | null;
  username: string | null;
  email: string | null;
  organization: string | null;
  email_confirm: boolean | null;
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
  | "email_confirm"
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
  | "email_confirm_asc"
  | "email_confirm_desc"
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
  { label: "Konfirm Email", value: "email_confirm" },
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
  { label: "Konfirm Email - A-Z", value: "email_confirm_asc" },
  { label: "Konfirm Email - Z-A", value: "email_confirm_desc" },
  { label: "Organisasi - A-Z", value: "organization_asc" },
  { label: "Organisasi - Z-A", value: "organization_desc" },
  { label: "Pekerjaan - A-Z", value: "occupation_asc" },
  { label: "Pekerjaan - Z-A", value: "occupation_desc" },
  { label: "Akses - A-Z", value: "role_asc" },
  { label: "Akses - Z-A", value: "role_desc" },
];

const tableHeaderClass =
  "border border-stone-200 bg-sky-800 px-3 py-3 text-center text-white whitespace-nowrap font-normal";

const tableCellClass =
  "border border-stone-200 px-3 py-3 align-middle whitespace-nowrap";

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
    timeZone: "Asia/Jayapura", // WIT / UTC+9
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
  if (key === "email_confirm") return displayEmailConfirm(user.email_confirm);
  if (key === "organization") return displayText(user.organization);
  if (key === "occupation") return displayText(user.occupation);
  if (key === "role") return displayText(user.role);

  return "";
}

function getSortableValue(user: UserRow, field: FilterKey) {
  if (field === "created_at") {
    return user.created_at ? new Date(user.created_at).getTime() : 0;
  }

  if (field === "email_confirm") {
    return displayEmailConfirm(user.email_confirm).toLowerCase();
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

export default function AdminUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingRole, setSavingRole] = useState(false);

  const [sortKey, setSortKey] = useState<SortKey>("created_at_newest");
  const [filterKey, setFilterKey] = useState<FilterKey>("all");
  const [filterValue, setFilterValue] = useState("all");

  const [alertType, setAlertType] = useState<AlertType>(null);
  const [pendingRoleChange, setPendingRoleChange] =
    useState<PendingRoleChange>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("users")
        .select(
          "id, created_at, username, email, organization, email_confirm, role, gender, phone, occupation, image_path",
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      setUsers((data ?? []) as UserRow[]);
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

  useEffect(() => {
    setFilterValue("all");
  }, [filterKey]);

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
            <h2>Pengguna</h2>
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
                  onChange={(event) =>
                    setFilterKey(event.target.value as FilterKey)
                  }
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

        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-max table-auto border-collapse lg:text-xs">
            <thead>
              <tr>
                <th className={tableHeaderClass}>No.</th>
                <th className={tableHeaderClass}>Photo</th>
                <th className={tableHeaderClass}>Terdaftar</th>
                <th className={tableHeaderClass}>Nama</th>
                <th className={tableHeaderClass}>Gender</th>
                <th className={tableHeaderClass}>Kontak</th>
                <th className={tableHeaderClass}>Email</th>
                <th className={tableHeaderClass}>Konfirm Email</th>
                <th className={tableHeaderClass}>Organisasi</th>
                <th className={tableHeaderClass}>Pekerjaan</th>
                <th className={tableHeaderClass}>Akses</th>
              </tr>
            </thead>

            <tbody>
              {visibleUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="border border-stone-200 px-3 py-8 text-center"
                  >
                    Tidak ada data pengguna.
                  </td>
                </tr>
              ) : (
                visibleUsers.map((user, index) => (
                  <tr key={user.id} className="hover:bg-stone-50">
                    <td className={tableCellClass}>{index + 1}</td>

                    <td className={tableCellClass}>
                      <div className="flex justify-center">
                        <div className="h-10 w-10 overflow-hidden rounded-full border-2 border-sky-700 bg-stone-100 md:h-12 md:w-12">
                          <Image
                            src={getPublicImageUrl(user.image_path)}
                            alt={user.username || "Foto pengguna"}
                            width={100}
                            height={100}
                            className="h-full w-full object-cover"
                            unoptimized
                          />
                        </div>
                      </div>
                    </td>

                    <td className={tableCellClass}>
                      {formatDateTime(user.created_at)}
                    </td>

                    <td className={tableCellClass}>
                      {displayText(user.username)}
                    </td>

                    <td className={tableCellClass}>
                      {displayGender(user.gender)}
                    </td>

                    <td className={tableCellClass}>
                      {displayText(user.phone)}
                    </td>

                    <td className={tableCellClass}>
                      {displayText(user.email)}
                    </td>

                    <td className={tableCellClass}>
                      {displayEmailConfirm(user.email_confirm)}
                    </td>

                    <td className={tableCellClass}>
                      {displayText(user.organization)}
                    </td>

                    <td className={tableCellClass}>
                      {displayText(user.occupation)}
                    </td>

                    <td className={tableCellClass}>
                      <select
                        value={user.role ?? ""}
                        onChange={(event) => handleRoleSelect(event, user)}
                        className="rounded-md bg-stone-100 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-400"
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
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
