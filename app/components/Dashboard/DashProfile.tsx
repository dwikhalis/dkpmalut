"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase/supabaseClient";
import { useAuthStore } from "@/app/Stores/authStores";
import AlertNotif from "../AlertNotif";
import SpinnerLoading from "../SpinnerLoading";
import Link from "next/link";
import { getSessionCache, setSessionCache } from "@/lib/utils/sessionCache";

const PROFILE_CACHE_TTL = 2 * 60 * 1000;

type ProfileCache = {
  profile: UserProfile;
  uploaded: number;
  published: number;
};

type UserProfile = {
  id: string;
  created_at?: string | null;
  username: string | null;
  email: string | null;
  organization: string | null;
  email_confirmed?: boolean | null;
  role?: string | null;
  gender: string | null;
  phone: string | null;
  occupation: string | null;
  image_path: string | null;
};

type EditableProfile = {
  username: string;
  organization: string;
  gender: string;
  phone: string;
  occupation: string;
  image_path: string;
};

type AlertType =
  | null
  | "confirm-update"
  | "success-update"
  | "error-update"
  | "error-load"
  | "error-no-session"
  | "no-update";

const DEFAULT_PROFILE_IMAGE = "/assets/icon_profile_u.png";

const labelClass = "text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw]";

const inputClass =
  "h-9 md:h-10 w-full text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw] bg-stone-100 p-3 rounded-md mt-2 md:mb-6 mb-3 outline-none focus:ring-2 focus:ring-sky-400";

const selectClass =
  "w-full bg-stone-100 rounded-md mt-2 md:mb-6 mb-3 py-2 px-3 text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw] outline-none focus:ring-2 focus:ring-sky-400";

function getPublicImageUrl(imagePath: string | null | undefined) {
  if (!imagePath) return DEFAULT_PROFILE_IMAGE;

  if (imagePath.startsWith("http")) return imagePath;
  if (imagePath.startsWith("/")) return imagePath;

  const { data } = supabase.storage.from("images").getPublicUrl(imagePath);

  return data.publicUrl || DEFAULT_PROFILE_IMAGE;
}

function displayValue(value: string | null | undefined, placeholder: string) {
  return value && value.trim() !== "" ? value : placeholder;
}

function displayGender(value: string | null | undefined) {
  if (!value) return "Gender belum diisi";

  if (value === "Male") return "Laki-laki";
  if (value === "Female") return "Perempuan";
  if (value === "Other") return "Lainnya";

  return value;
}

async function getOwnedDataCounts(userId: string) {
  if (!userId) {
    return {
      uploaded: 0,
      published: 0,
    };
  }

  const [
    uploadedDatasetResult,
    publishedDatasetResult,
    uploadedMapResult,
    publishedMapResult,
  ] = await Promise.all([
    supabase
      .from("datasets")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),

    supabase
      .from("datasets")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("published", "approved"),

    supabase
      .from("map_datasets")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),

    supabase
      .from("map_datasets")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("published", "approved"),
  ]);

  const countError =
    uploadedDatasetResult.error ||
    publishedDatasetResult.error ||
    uploadedMapResult.error ||
    publishedMapResult.error;

  if (countError) {
    throw countError;
  }

  return {
    uploaded:
      (uploadedDatasetResult.count ?? 0) + (uploadedMapResult.count ?? 0),
    published:
      (publishedDatasetResult.count ?? 0) + (publishedMapResult.count ?? 0),
  };
}

function ProfileInfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col rounded-md bg-stone-100 p-3 text-left">
      <p className="text-sm font-bold text-stone-600">{label}</p>
      <p className="break-words text-base">{value}</p>
    </div>
  );
}

function StatBlock({ label, value }: { label: [string, string]; value: number }) {
  return (
    <div className="flex grow p-6 m-3 shadow-xl rounded-2xl border-3 border-stone-100 min-w-30 min-h-30 md:min-w-[20vw] md:min-h-[15vw]">
      <div className="flex flex-col justify-center items-center gap-2 w-full">
        <h3 className="flex flex-col text-center text-lg md:text-xl">
          <span>{label[0]}</span>
          <span>{label[1]}</span>
        </h3>
        <p className="text-3xl font-semibold md:text-4xl">{value}</p>
      </div>
    </div>
  );
}

export default function DashProfile() {
  const authStoreUserId = useAuthStore((state) => state.userId);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [resolvedUserId, setResolvedUserId] = useState("");

  const [formData, setFormData] = useState<EditableProfile>({
    username: "",
    organization: "",
    gender: "",
    phone: "",
    occupation: "",
    image_path: "",
  });

  const [editMode, setEditMode] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);

  const [uploadedDataCount, setUploadedDataCount] = useState(0);
  const [publishedDataCount, setPublishedDataCount] = useState(0);

  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState<
    string | null
  >(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [alertType, setAlertType] = useState<AlertType>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const profileImageSrc = useMemo(() => {
    if (selectedImagePreview) return selectedImagePreview;

    return getPublicImageUrl(profile?.image_path);
  }, [profile?.image_path, selectedImagePreview]);

  const resetFormFromProfile = (userProfile: UserProfile | null) => {
    if (!userProfile) return;

    setFormData({
      username: userProfile.username ?? "",
      organization: userProfile.organization ?? "",
      gender: userProfile.gender ?? "",
      phone: userProfile.phone ?? "",
      occupation: userProfile.occupation ?? "",
      image_path: userProfile.image_path ?? "",
    });
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!actionMenuRef.current) return;

      if (!actionMenuRef.current.contains(event.target as Node)) {
        setShowActionMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);

        if (authStoreUserId) {
          const cached = getSessionCache<ProfileCache>(
            `dashboard-profile:${authStoreUserId}`,
            PROFILE_CACHE_TTL,
          );

          if (cached) {
            let uploaded = cached.uploaded;
            let published = cached.published;

            if (cached.profile.role !== "user") {
              const counts = await getOwnedDataCounts(authStoreUserId);
              uploaded = counts.uploaded;
              published = counts.published;
            }

            setResolvedUserId(authStoreUserId);
            setProfile(cached.profile);
            resetFormFromProfile(cached.profile);
            setUploadedDataCount(uploaded);
            setPublishedDataCount(published);
            setSessionCache<ProfileCache>(
              `dashboard-profile:${authStoreUserId}`,
              {
                ...cached,
                uploaded,
                published,
              },
            );
            return;
          }
        }

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        if (!session?.user) {
          setAlertType("error-no-session");
          return;
        }

        const currentUserId = authStoreUserId || session.user.id;
        const authUserEmail = session.user.email ?? "";

        setResolvedUserId(currentUserId);

        let { data, error } = await supabase
          .from("users")
          .select(
            "id, created_at, username, email, organization, email_confirmed, role, gender, phone, occupation, image_path",
          )
          .eq("id", currentUserId)
          .maybeSingle();

        if (!data && authUserEmail) {
          const fallback = await supabase
            .from("users")
            .select(
              "id, created_at, username, email, organization, email_confirmed, role, gender, phone, occupation, image_path",
            )
            .eq("email", authUserEmail)
            .maybeSingle();

          data = fallback.data;
          error = fallback.error;
        }

        if (error) throw error;

        if (!data) {
          setErrorMsg("Profil pengguna tidak ditemukan.");
          setAlertType("error-load");
          return;
        }

        const userProfile = data as UserProfile;

        setProfile(userProfile);
        resetFormFromProfile(userProfile);

        let uploaded = 0;
        let published = 0;

        if (userProfile.role !== "user") {
          const counts = await getOwnedDataCounts(currentUserId);
          uploaded = counts.uploaded;
          published = counts.published;
          setUploadedDataCount(counts.uploaded);
          setPublishedDataCount(counts.published);
        }

        setSessionCache<ProfileCache>(`dashboard-profile:${currentUserId}`, {
          profile: userProfile,
          uploaded,
          published,
        });
      } catch (error) {
        console.error("Failed to fetch profile:", error);
        setErrorMsg(
          error instanceof Error
            ? error.message
            : "Gagal memuat data profil pengguna.",
        );
        setAlertType("error-load");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [authStoreUserId]);

  useEffect(() => {
    return () => {
      if (selectedImagePreview) {
        URL.revokeObjectURL(selectedImagePreview);
      }
    };
  }, [selectedImagePreview]);

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleOpenEditMode = () => {
    resetFormFromProfile(profile);
    setSelectedImageFile(null);

    if (selectedImagePreview) {
      URL.revokeObjectURL(selectedImagePreview);
      setSelectedImagePreview(null);
    }

    setShowActionMenu(false);
    setEditMode(true);
  };

  const handleImageClick = () => {
    if (!editMode) return;

    fileInputRef.current?.click();
  };

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMsg("File harus berupa gambar.");
      setAlertType("error-update");
      return;
    }

    if (selectedImagePreview) {
      URL.revokeObjectURL(selectedImagePreview);
    }

    setSelectedImageFile(file);
    setSelectedImagePreview(URL.createObjectURL(file));
    event.target.value = "";
  };

  const uploadProfileImage = async () => {
    if (!selectedImageFile || !profile) {
      return formData.image_path || profile?.image_path || null;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("Sesi login telah berakhir. Silakan masuk kembali.");
    }

    const uploadData = new FormData();
    uploadData.set("file", selectedImageFile);

    const response = await fetch("/api/profile-image", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: uploadData,
    });
    const result = (await response.json().catch(() => null)) as {
      message?: string;
      path?: string;
      publicUrl?: string;
    } | null;

    if (!response.ok) {
      throw new Error(result?.message || "Gagal mengunggah foto profil.");
    }

    return result?.publicUrl || result?.path || null;
  };

  const hasChanges = () => {
    if (!profile) return false;

    return (
      formData.username.trim() !== (profile.username ?? "") ||
      formData.organization.trim() !== (profile.organization ?? "") ||
      formData.gender.trim() !== (profile.gender ?? "") ||
      formData.phone.trim() !== (profile.phone ?? "") ||
      formData.occupation.trim() !== (profile.occupation ?? "") ||
      selectedImageFile !== null
    );
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!profile) {
      setErrorMsg("Data profil belum tersedia.");
      setAlertType("error-update");
      return;
    }

    if (!hasChanges()) {
      setAlertType("no-update");
      return;
    }

    setAlertType("confirm-update");
  };

  const handleConfirmUpdate = async () => {
    if (!profile) return;

    try {
      setSaving(true);
      setErrorMsg(null);

      const imagePath = await uploadProfileImage();

      const payload = {
        username: formData.username.trim() || null,
        organization: formData.organization.trim() || null,
        gender: formData.gender.trim() || null,
        phone: formData.phone.trim() || null,
        occupation: formData.occupation.trim() || null,
        image_path: imagePath,
      };

      const { data, error } = await supabase
        .from("users")
        .update(payload)
        .eq("id", profile.id)
        .select(
          "id, created_at, username, email, organization, email_confirmed, role, gender, phone, occupation, image_path",
        )
        .single();

      if (error) throw error;

      const updatedProfile = data as UserProfile;
      let uploaded = uploadedDataCount;
      let published = publishedDataCount;

      setProfile(updatedProfile);
      resetFormFromProfile(updatedProfile);

      setSelectedImageFile(null);

      if (selectedImagePreview) {
        URL.revokeObjectURL(selectedImagePreview);
        setSelectedImagePreview(null);
      }

      if (resolvedUserId && updatedProfile.role !== "user") {
        const counts = await getOwnedDataCounts(resolvedUserId);
        uploaded = counts.uploaded;
        published = counts.published;
        setUploadedDataCount(counts.uploaded);
        setPublishedDataCount(counts.published);
      }

      if (resolvedUserId) {
        setSessionCache<ProfileCache>(
          `dashboard-profile:${resolvedUserId}`,
          {
            profile: updatedProfile,
            uploaded,
            published,
          },
        );
      }

      setEditMode(false);
      setAlertType("success-update");
    } catch (error) {
      console.error("Failed to update profile:", error);
      setErrorMsg(
        error instanceof Error
          ? error.message
          : "Gagal mengupdate profil pengguna.",
      );
      setAlertType("error-update");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    resetFormFromProfile(profile);
    setSelectedImageFile(null);

    if (selectedImagePreview) {
      URL.revokeObjectURL(selectedImagePreview);
      setSelectedImagePreview(null);
    }

    setEditMode(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-[80vh] w-full items-center justify-center">
        <SpinnerLoading size="sm" color="black" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[80vh] w-full items-start justify-center px-6 py-10">
      <div className="flex w-full max-w-4xl flex-col items-center">
        {!editMode && (
          <div className="relative flex w-full flex-col items-center rounded-2xl border border-stone-200 bg-white p-6 shadow-xl md:p-10">
            {profile?.role === "partner" && (
              <span className="absolute left-3 top-3 rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800 ring-1 ring-sky-200">
                Mitra
              </span>
            )}

            <div ref={actionMenuRef} className="absolute right-3 top-3 z-20">
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-200"
                onClick={() => setShowActionMenu((prev) => !prev)}
                aria-label="Menu profil"
              >
                ⋮
              </button>

              {showActionMenu && (
                <div className="absolute right-0 top-11 min-w-40 rounded-xl border border-stone-200 bg-white p-2 shadow-xl">
                  <button
                    type="button"
                    className="w-full rounded-lg px-3 py-2 text-left text-[2.8vw] hover:bg-stone-100 md:text-[1.8vw] lg:text-[1.2vw]"
                    onClick={handleOpenEditMode}
                  >
                    Update Profil
                  </button>
                </div>
              )}
            </div>

            <div className="relative mb-6 flex h-36 w-36 items-center justify-center overflow-hidden rounded-full border-4 border-sky-700 bg-stone-100 shadow-xl md:h-44 md:w-44">
              <Image
                src={profileImageSrc}
                alt="Foto Profil"
                width={400}
                height={400}
                className="h-full w-full object-cover"
                priority
                unoptimized
              />
            </div>

            <div className="flex w-full flex-col items-center gap-3 text-center">
              <h1>{displayValue(profile?.username, "Username belum diisi")}</h1>

              <p className="break-all text-base text-stone-500 md:text-lg">
                {displayValue(profile?.email, "Email belum tersedia")}
              </p>

              <div className="mt-6 flex w-full flex-col gap-3">
                <ProfileInfoItem
                  label="Organisasi"
                  value={displayValue(
                    profile?.organization,
                    "Organisasi belum diisi",
                  )}
                />

                <ProfileInfoItem
                  label="Pekerjaan / Jabatan"
                  value={displayValue(
                    profile?.occupation,
                    "Pekerjaan / Jabatan belum diisi",
                  )}
                />

                <ProfileInfoItem
                  label="Nomor Telepon"
                  value={displayValue(
                    profile?.phone,
                    "Nomor telepon belum diisi",
                  )}
                />

                <ProfileInfoItem
                  label="Gender"
                  value={displayGender(profile?.gender)}
                />
              </div>

              {profile?.role !== "user" && (
                <div className="mt-6 flex w-full flex-wrap justify-start gap-3 md:justify-between">
                  <Link href={"/profile/data"} className="w-[45%]">
                    <StatBlock
                      label={["Data", "Terupload"]}
                      value={uploadedDataCount}
                    />
                  </Link>
                  <Link href={"/profile/data"} className="w-[45%]">
                    <StatBlock
                      label={["Data", "Terpublikasi"]}
                      value={publishedDataCount}
                    />
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {editMode && (
          <form
            className="relative flex w-full flex-col rounded-2xl border border-stone-200 bg-white p-6 shadow-xl md:p-10"
            onSubmit={handleSubmit}
          >
            {profile?.role === "partner" && (
              <span className="absolute left-3 top-3 rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800 ring-1 ring-sky-200">
                Mitra
              </span>
            )}

            <button
              type="button"
              className="mx-auto mb-6 flex flex-col items-center"
              onClick={handleImageClick}
            >
              <div className="relative flex h-36 w-36 items-center justify-center overflow-hidden rounded-full border-4 border-sky-700 bg-stone-100 shadow-xl transition hover:opacity-80 md:h-44 md:w-44">
                <Image
                  src={profileImageSrc}
                  alt="Foto Profil"
                  width={400}
                  height={400}
                  className="h-full w-full object-cover"
                  priority
                  unoptimized
                />
              </div>

              <span className="mt-3 text-center text-[2.8vw] text-stone-500 md:text-[1.8vw] lg:text-[1.2vw]">
                Klik foto untuk mengganti foto profil
              </span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />

            <label className={labelClass} htmlFor="username">
              Username
            </label>
            <input
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Username belum diisi"
              className={inputClass}
            />

            <label className={labelClass} htmlFor="email">
              Email
            </label>
            <input
              id="email"
              value={profile?.email ?? ""}
              disabled
              placeholder="Email belum tersedia"
              className={`${inputClass} cursor-not-allowed text-stone-500`}
            />

            <label className={labelClass} htmlFor="organization">
              Organisasi
            </label>
            <input
              id="organization"
              name="organization"
              value={formData.organization}
              onChange={handleChange}
              placeholder="Organisasi belum diisi"
              className={inputClass}
            />

            <label className={labelClass} htmlFor="occupation">
              Pekerjaan / Jabatan
            </label>
            <input
              id="occupation"
              name="occupation"
              value={formData.occupation}
              onChange={handleChange}
              placeholder="Pekerjaan / Jabatan belum diisi"
              className={inputClass}
            />

            <label className={labelClass} htmlFor="phone">
              Nomor Telepon
            </label>
            <input
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Nomor telepon belum diisi"
              className={inputClass}
            />

            <label className={labelClass} htmlFor="gender">
              Gender
            </label>
            <select
              id="gender"
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className={selectClass}
            >
              <option value="">-- Pilih Gender --</option>
              <option value="Male">Laki-laki</option>
              <option value="Female">Perempuan</option>
              <option value="Other">Lainnya</option>
            </select>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <button
                type="button"
                className="flex items-center justify-center rounded-lg bg-stone-200 p-1.5 text-black hover:bg-stone-400 md:mb-6 mb-3 md:rounded-2xl md:p-3"
                onClick={handleCancelEdit}
                disabled={saving}
              >
                <p className="text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw]">
                  Batal
                </p>
              </button>

              <button
                type="submit"
                className="flex items-center justify-center rounded-lg bg-sky-800 p-1.5 text-white hover:bg-stone-400 hover:text-black md:mb-6 mb-3 md:rounded-2xl md:p-3"
                disabled={saving}
              >
                <p
                  className={`${
                    saving ? "hidden" : "flex"
                  } text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw]`}
                >
                  Kirim
                </p>

                <div className={saving ? "flex" : "hidden"}>
                  <SpinnerLoading size="sm" color="white" />
                </div>
              </button>
            </div>
          </form>
        )}
      </div>

      {alertType === "confirm-update" && (
        <AlertNotif
          type="double"
          msg="Apakah Anda yakin ingin mengupdate profil?"
          yesText="Ya"
          noText="Tidak"
          icon="warning"
          loading={saving}
          confirm={handleConfirmUpdate}
        />
      )}

      {alertType === "success-update" && (
        <AlertNotif
          type="single"
          msg="Profil berhasil diupdate."
          yesText="OK"
          icon="success"
          confirm={() => setAlertType(null)}
        />
      )}

      {alertType === "no-update" && (
        <AlertNotif
          type="single"
          msg="Tidak ada perubahan data."
          yesText="OK"
          icon="warning"
          confirm={() => setAlertType(null)}
        />
      )}

      {alertType === "error-update" && (
        <AlertNotif
          type="single"
          msg={errorMsg || "Gagal mengupdate profil."}
          yesText="OK"
          icon="error"
          confirm={() => setAlertType(null)}
        />
      )}

      {alertType === "error-load" && (
        <AlertNotif
          type="single"
          msg={errorMsg || "Gagal memuat profil pengguna."}
          yesText="OK"
          icon="error"
          confirm={() => setAlertType(null)}
        />
      )}

      {alertType === "error-no-session" && (
        <AlertNotif
          type="single"
          msg="Sesi login tidak ditemukan. Silakan login ulang."
          yesText="OK"
          icon="error"
          confirm={() => setAlertType(null)}
        />
      )}
    </div>
  );
}
