"use client";

import { useEffect, useMemo, useState, type DragEvent } from "react";
import { supabase } from "@/lib/supabase/supabaseClient";
import type { ColumnConfig } from "./DatasetTable";
import SpinnerLoading from "./SpinnerLoading";
import { DownChevron } from "@/public/icons/iconSets";
import { PARTNER_EQUIVALENT_ROLES } from "@/lib/utils/roles";

type Partner = {
  id: string;
  username: string | null;
  organization: string | null;
  email: string | null;
};

type Grant = {
  user_id: string;
  can_add: boolean;
  can_edit: boolean;
  can_delete: boolean;
};

const profileName = ({
  username,
  organization,
  email,
}: {
  username: string | null;
  organization: string | null;
  email: string | null;
}) => {
  const cleanUsername = username?.trim();
  const cleanOrganization = organization?.trim();

  if (cleanUsername && cleanOrganization) {
    return `${cleanUsername} - ${cleanOrganization}`;
  }

  return cleanUsername || cleanOrganization || email?.trim() || "Pengguna";
};

export default function DatasetConfiguration({
  datasetId,
  columns,
  onValidationChange,
  resourceKind = "dataset",
  showValidation = true,
}: {
  datasetId: string;
  columns: ColumnConfig[];
  onValidationChange?: (keys: string[]) => void;
  resourceKind?: "dataset" | "map";
  showValidation?: boolean;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [ownerName, setOwnerName] = useState("Pengguna");
  const [partners, setPartners] = useState<Partner[]>([]);
  const [duplicateKeys, setDuplicateKeys] = useState<string[]>([]);
  const [grants, setGrants] = useState<Record<string, Grant>>({});
  const [draggedKey, setDraggedKey] = useState<string | null>(null);

  const usableColumns = useMemo(
    () => columns.filter((column) => column.key !== "id"),
    [columns],
  );
  const grantDatasetColumn =
    resourceKind === "map" ? "map_dataset_id" : "dataset_id";

  useEffect(() => {
    const fetchConfiguration = async () => {
      setLoading(true);
      setMessage("");

      try {
        const { data: dataset, error: datasetError } = await supabase
          .from(resourceKind === "map" ? "map_datasets" : "datasets")
          .select("user_id")
          .eq("id", datasetId)
          .single();
        if (datasetError) throw datasetError;

        const [ownerResult, partnersResult, validationResult, grantsResult] =
          await Promise.all([
            dataset.user_id
              ? supabase
                  .from("users")
                  .select("username, organization, email")
                  .eq("id", dataset.user_id)
                  .maybeSingle()
              : Promise.resolve({ data: null, error: null }),
            supabase
              .from("users")
              .select("id, username, organization, email")
              .in("role", [...PARTNER_EQUIVALENT_ROLES])
              .order("organization"),
            showValidation
              ? supabase
                  .from("dataset_validation_configs")
                  .select("duplicate_keys")
                  .eq("dataset_id", datasetId)
                  .maybeSingle()
              : Promise.resolve({ data: null, error: null }),
            supabase
              .from(
                resourceKind === "map"
                  ? "map_dataset_access_grants"
                  : "dataset_access_grants",
              )
              .select("user_id, can_add, can_edit, can_delete")
              .eq(grantDatasetColumn, datasetId),
          ]);

        if (partnersResult.error) throw partnersResult.error;
        if (validationResult.error) throw validationResult.error;
        if (grantsResult.error) throw grantsResult.error;

        const owner = ownerResult.data;
        setOwnerName(owner ? profileName(owner) : "Pengguna");
        setPartners(
          ((partnersResult.data ?? []) as Partner[]).filter(
            (partner) => partner.id !== dataset.user_id,
          ),
        );
        setDuplicateKeys(
          Array.isArray(validationResult.data?.duplicate_keys)
            ? validationResult.data.duplicate_keys.filter((key: string) =>
                usableColumns.some((column) => column.key === key),
              )
            : [],
        );
        setGrants(
          ((grantsResult.data ?? []) as Grant[]).reduce<Record<string, Grant>>(
            (result, grant) => {
              result[grant.user_id] = grant;
              return result;
            },
            {},
          ),
        );
      } catch (error) {
        console.error("Failed to load dataset configuration:", error);
        setMessage("Gagal memuat pengaturan dataset.");
      } finally {
        setLoading(false);
      }
    };

    void fetchConfiguration();
  }, [
    datasetId,
    grantDatasetColumn,
    resourceKind,
    showValidation,
    usableColumns,
  ]);

  const toggleDuplicateKey = (key: string) => {
    setDuplicateKeys((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    );
  };

  const moveKey = (index: number, direction: -1 | 1) => {
    setDuplicateKeys((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const dropKey = (event: DragEvent<HTMLDivElement>, targetKey: string) => {
    event.preventDefault();
    if (!draggedKey || draggedKey === targetKey) return;

    setDuplicateKeys((current) => {
      const next = current.filter((key) => key !== draggedKey);
      next.splice(next.indexOf(targetKey), 0, draggedKey);
      return next;
    });
    setDraggedKey(null);
  };

  const togglePartner = (partnerId: string) => {
    setGrants((current) => {
      if (current[partnerId]) {
        const next = { ...current };
        delete next[partnerId];
        return next;
      }
      return {
        ...current,
        [partnerId]: {
          user_id: partnerId,
          can_add: false,
          can_edit: false,
          can_delete: false,
        },
      };
    });
  };

  const togglePermission = (
    partnerId: string,
    permission: "can_add" | "can_edit" | "can_delete",
  ) => {
    setGrants((current) => ({
      ...current,
      [partnerId]: {
        ...current[partnerId],
        user_id: partnerId,
        [permission]: !current[partnerId]?.[permission],
      },
    }));
  };

  const save = async () => {
    setSaving(true);
    setMessage("");

    try {
      if (showValidation) {
        const { error: validationError } = await supabase
          .from("dataset_validation_configs")
          .upsert(
            {
              dataset_id: datasetId,
              duplicate_keys: duplicateKeys,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "dataset_id" },
          );
        if (validationError) throw validationError;
      }

      const { error: deleteError } = await supabase
        .from(
          resourceKind === "map"
            ? "map_dataset_access_grants"
            : "dataset_access_grants",
        )
        .delete()
        .eq(grantDatasetColumn, datasetId);
      if (deleteError) throw deleteError;

      const selectedGrants = Object.values(grants);
      if (selectedGrants.length > 0) {
        const { error: grantError } = await supabase
          .from(
            resourceKind === "map"
              ? "map_dataset_access_grants"
              : "dataset_access_grants",
          )
            .insert(
            selectedGrants.map((grant) => ({
              [grantDatasetColumn]: datasetId,
              ...grant,
            })),
          );
        if (grantError) throw grantError;
      }

      setMessage("Pengaturan berhasil disimpan.");
      onValidationChange?.(duplicateKeys);
    } catch (error) {
      console.error("Failed to save dataset configuration:", error);
      setMessage("Gagal menyimpan pengaturan dataset.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-40 items-center justify-center">
        <SpinnerLoading size="sm" color="black" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {showValidation && (
        <section className="space-y-4 rounded-xl border border-gray-300 bg-white p-4">
        <div>
          <h4 className="font-semibold">Validasi Data</h4>
          <p className="text-sm text-gray-500">
            Atur kombinasi kolom yang harus unik pada seluruh riwayat data.
          </p>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Data Duplikasi</h3>
          <details className="group relative">
            <summary className="cursor-pointer rounded border border-gray-400 px-3 py-2 text-sm">
              Kolom ({duplicateKeys.length}/{usableColumns.length})
            </summary>
            <div className="absolute z-40 mt-1 max-h-64 w-full overflow-y-auto rounded border border-gray-300 bg-white p-3 shadow-lg">
              {usableColumns.map((column) => (
                <label key={column.key} className="flex gap-2 py-1 text-sm">
                  <input
                    type="checkbox"
                    checked={duplicateKeys.includes(column.key)}
                    onChange={() => toggleDuplicateKey(column.key)}
                  />
                  {column.label}
                </label>
              ))}
            </div>
          </details>

          <div className="space-y-2 rounded-lg border border-dashed border-gray-300 p-3">
            {duplicateKeys.length === 0 ? (
              <p className="text-sm text-gray-500">
                Validasi data belum diatur
              </p>
            ) : (
              duplicateKeys.map((key, index) => {
                const column = usableColumns.find((item) => item.key === key);
                return (
                  <div
                    key={key}
                    draggable
                    onDragStart={() => setDraggedKey(key)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => dropKey(event, key)}
                    className="flex cursor-grab items-center gap-2 rounded border border-gray-300 bg-gray-50 p-2"
                  >
                    <span className="w-6 text-center text-sm text-gray-500">
                      {index + 1}
                    </span>
                    <span className="grow text-sm">{column?.label ?? key}</span>
                    <button
                      type="button"
                      aria-label="Naikkan urutan"
                      disabled={index === 0}
                      onClick={() => moveKey(index, -1)}
                      className="rotate-180 disabled:opacity-30"
                    >
                      <DownChevron className="size-5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Turunkan urutan"
                      disabled={index === duplicateKeys.length - 1}
                      onClick={() => moveKey(index, 1)}
                      className="disabled:opacity-30"
                    >
                      <DownChevron className="size-5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
        </section>
      )}

      <section className="space-y-4 rounded-xl border border-gray-300 bg-white p-4">
        <div>
          <h4 className="font-semibold">Hak Akses</h4>
          <p className="text-sm text-gray-500">
            Pilih Partner, Kadis, atau Sekdis dan tindakan yang diperbolehkan.
          </p>
        </div>

        <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm">
          <span className="font-semibold">Pengunggah:</span> {ownerName}
        </div>

        <div className="space-y-3">
          {partners.length === 0 && (
            <p className="text-sm text-gray-500">Belum ada akun Partner, Kadis, atau Sekdis.</p>
          )}
          {partners.map((partner) => {
            const grant = grants[partner.id];
            return (
              <div
                key={partner.id}
                className="rounded-lg border border-gray-300 p-3"
              >
                <label className="flex items-center gap-2 font-medium">
                  <input
                    type="checkbox"
                    checked={Boolean(grant)}
                    onChange={() => togglePartner(partner.id)}
                  />
                  {profileName(partner)}
                </label>
                {grant && (
                  <div className="mt-3 flex flex-wrap gap-4 pl-6 text-sm">
                    {[
                      ["can_add", "Tambah"],
                      ["can_edit", "Edit"],
                      ["can_delete", "Hapus"],
                    ].map(([permission, label]) => (
                      <label key={permission} className="flex gap-2">
                        <input
                          type="checkbox"
                          checked={grant[permission as keyof Grant] === true}
                          onChange={() =>
                            togglePermission(
                              partner.id,
                              permission as
                                | "can_add"
                                | "can_edit"
                                | "can_delete",
                            )
                          }
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {message && (
        <p className="rounded border border-gray-300 bg-white p-3 text-sm">
          {message}
        </p>
      )}

      <button
        type="button"
        disabled={saving}
        onClick={() => void save()}
        className="w-full rounded-lg bg-sky-800 px-4 py-3 font-semibold text-white disabled:opacity-50"
      >
        {saving ? "Menyimpan…" : "Simpan Pengaturan"}
      </button>
    </div>
  );
}
