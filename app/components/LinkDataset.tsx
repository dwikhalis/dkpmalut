"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/supabaseClient";
import AlertNotif from "./AlertNotif";
import Button from "./Button";
import SpinnerLoading from "./SpinnerLoading";
import {
  DATA_KKPD_OPTIONS,
  DATA_REGENCY_OPTIONS,
  DATA_SUBWPP_OPTIONS,
} from "./configAreaSelector";
import { getUploadTimestamp } from "@/lib/utils/uploadTimestamp";

type PublicationStatus = "requested" | "approved" | "rejected" | null;

type LinkRow = {
  label: string;
  path_redirect: string | null;
  published: PublicationStatus;
  tag: string[] | null;
  description: string | null;
  image_path: string | null;
  data_regency: string[] | null;
  data_kkpd: string[] | null;
  data_subwpp: string[] | null;
};

const TAG_OPTIONS = [
  "tangkap",
  "budidaya",
  "ekologi",
  "konservasi",
  "sosial",
  "ekonomi",
  "lainnya",
];

function validHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function LinkDatasetCreate({
  ownerId,
  saveData,
  onReadyChange,
  onCreated,
}: {
  ownerId: string | null;
  saveData: number;
  onReadyChange: (ready: boolean) => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const lastSave = useRef(saveData);

  const save = useCallback(async () => {
    if (!ownerId || !title.trim() || !validHttpUrl(link.trim())) {
      setMessage("Lengkapi Judul Link dan link tujuan yang valid.");
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      const { error } = await supabase.from("datasets").insert({
        user_id: ownerId,
        label: title.trim(),
        slug: toSlug(title),
        kind: "link",
        path_redirect: new URL(link.trim()).toString(),
        data: [],
        column_config: [],
        import_status: "ready",
      });
      if (error) throw error;
      onCreated();
    } catch (error) {
      console.error("Failed to create link dataset:", error);
      setMessage("Link gagal disimpan. Pastikan migrasi database terbaru sudah diterapkan.");
    } finally {
      setSaving(false);
    }
  }, [link, onCreated, ownerId, title]);

  useEffect(() => {
    onReadyChange(Boolean(title.trim() && validHttpUrl(link.trim())));
  }, [link, onReadyChange, title]);
  useEffect(() => {
    if (saveData === lastSave.current) return;
    lastSave.current = saveData;
    void save();
  }, [save, saveData]);

  return (
    <div className="flex flex-col gap-5">
      <label className="font-semibold">Judul Link<input value={title} onChange={(event) => setTitle(event.target.value)} className="mt-2 block w-full rounded-xl border border-stone-300 px-4 py-3 font-normal" /></label>
      <label className="font-semibold" htmlFor="new-link-destination">Link tujuan<input id="new-link-destination" type="url" value={link} onChange={(event) => setLink(event.target.value)} placeholder="https://example.com" className="mt-2 block w-full rounded-xl border border-stone-300 px-4 py-3 font-normal outline-none focus:border-sky-700" disabled={saving} /></label>
      {message && <p className="mt-3 text-sm text-red-600">{message}</p>}
      {saving && <div className="mt-4"><SpinnerLoading size="sm" color="black" /></div>}
    </div>
  );
}

export default function LinkDataset({
  datasetId,
  role,
  onSaved,
}: {
  datasetId: string;
  role: "admin" | "partner" | "kadis" | "sekdis" | null;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [row, setRow] = useState<LinkRow | null>(null);
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [regencies, setRegencies] = useState<string[]>([]);
  const [inKkpd, setInKkpd] = useState(false);
  const [kkpd, setKkpd] = useState<string[]>([]);
  const [inSubWpp, setInSubWpp] = useState(false);
  const [subWpp, setSubWpp] = useState<string[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [alert, setAlert] = useState<"none" | "invalid" | "success" | "failed">("none");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("datasets")
      .select("label, path_redirect, published, tag, description, image_path, data_regency, data_kkpd, data_subwpp")
      .eq("id", datasetId)
      .eq("kind", "link")
      .maybeSingle();
    if (error || !data) {
      setMessage("Link tidak ditemukan.");
      setLoading(false);
      return;
    }
    const next = data as LinkRow;
    setRow(next);
    setTitle(next.label);
    setLink(next.path_redirect ?? "");
    setTags(next.tag ?? []);
    setDescription(next.description ?? "");
    setRegencies(next.data_regency ?? []);
    setKkpd(next.data_kkpd ?? []);
    setInKkpd(Boolean(next.data_kkpd?.length));
    setSubWpp(next.data_subwpp ?? []);
    setInSubWpp(Boolean(next.data_subwpp?.length));
    setLoading(false);
  }, [datasetId]);

  useEffect(() => void load(), [load]);
  const chooseImage = (file?: File) => {
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setMessage("Gambar harus berformat JPG, JPEG, atau PNG.");
      setAlert("invalid");
      return;
    }
    setImageFile(file);
  };

  const save = async () => {
    if (!title.trim() || !validHttpUrl(link.trim()) || tags.length === 0 || (!row?.image_path && !imageFile)) {
      setMessage("Lengkapi judul, link yang valid, minimal satu tag, dan gambar.");
      setAlert("invalid");
      return;
    }
    setSaving(true);
    try {
      let imagePath = row?.image_path ?? null;
      if (imageFile) {
        const extension = imageFile.name.split(".").pop() || "png";
        imagePath = `charts/${toSlug(title)}-${getUploadTimestamp()}.${extension}`;
        const { error } = await supabase.storage.from("images").upload(imagePath, imageFile, {
          contentType: imageFile.type,
          upsert: true,
        });
        if (error) throw error;
      }
      const { error } = await supabase.from("datasets").update({
        label: title.trim(),
        slug: toSlug(title),
        path_redirect: new URL(link.trim()).toString(),
        tag: tags,
        description: description.trim(),
        image_path: imagePath,
        data_regency: regencies,
        data_kkpd: inKkpd && kkpd.length > 0 ? kkpd : null,
        data_subwpp: inSubWpp && subWpp.length > 0 ? subWpp : null,
        published: row?.published ?? "requested",
      }).eq("id", datasetId);
      if (error) throw error;
      setRow((current) => current ? { ...current, label: title.trim(), path_redirect: link.trim(), tag: tags, description, image_path: imagePath, data_regency: regencies, data_kkpd: inKkpd ? kkpd : null, data_subwpp: inSubWpp ? subWpp : null, published: current.published ?? "requested" } : current);
      setImageFile(null);
      setAlert("success");
      onSaved?.();
      router.replace(`/profile/data/${toSlug(title)}?view=publication`);
    } catch (error) {
      console.error("Failed to save link dataset:", error);
      setAlert("failed");
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (published: Exclude<PublicationStatus, null>) => {
    const { error } = await supabase.from("datasets").update({ published }).eq("id", datasetId);
    if (!error) setRow((current) => current ? { ...current, published } : current);
  };

  if (loading) return <div className="flex justify-center p-8"><SpinnerLoading size="sm" color="black" /></div>;
  if (!row) return <p className="rounded-xl bg-red-50 p-4 text-red-700">{message}</p>;

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-stone-200 bg-white p-6 shadow-md">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
        {row.published === "approved" ? "Link telah dipublikasikan." : row.published === "rejected" ? "Publikasi link ditolak." : row.published === "requested" ? "Publikasi link menunggu persetujuan." : "Link belum dipublikasikan."}
      </div>
      {role === "admin" && row.published && (
        <select value={row.published} onChange={(event) => void updateStatus(event.target.value as Exclude<PublicationStatus, null>)} className="rounded-xl border border-stone-300 px-4 py-3">
          <option value="requested">Requested</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      )}
      <div
        className="flex min-h-56 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-stone-300 bg-stone-50"
        onClick={() => fileInput.current?.click()}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event: DragEvent<HTMLDivElement>) => { event.preventDefault(); chooseImage(event.dataTransfer.files?.[0]); }}
      >
        <span className="px-6 text-center text-stone-500">
          {imageFile
            ? `${imageFile.name} dipilih. Jatuhkan gambar lain atau klik untuk mengganti.`
            : "Jatuhkan gambar JPG, JPEG, atau PNG di sini, atau klik untuk mencari dari perangkat."}
        </span>
      </div>
      <input ref={fileInput} hidden type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" onChange={(event) => chooseImage(event.target.files?.[0])} />
      <label className="font-semibold">Judul<input value={title} onChange={(event) => setTitle(event.target.value)} className="mt-2 block w-full rounded-xl border border-stone-300 px-4 py-3 font-normal" /></label>
      <label className="font-semibold">Link tujuan<input type="url" value={link} onChange={(event) => setLink(event.target.value)} className="mt-2 block w-full rounded-xl border border-stone-300 px-4 py-3 font-normal" /></label>
      <fieldset><legend className="mb-2 font-semibold">Tag</legend><div className="flex flex-wrap gap-2">{TAG_OPTIONS.map((tag) => <label key={tag} className="rounded-full border border-stone-300 px-3 py-2"><input type="checkbox" checked={tags.includes(tag)} onChange={() => setTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag])} className="mr-2" />{tag}</label>)}</div></fieldset>
      <fieldset><legend className="mb-2 font-semibold">Kabupaten/Kota</legend><div className="grid gap-2 md:grid-cols-2">{DATA_REGENCY_OPTIONS.map((item) => <label key={item.value}><input type="checkbox" checked={regencies.includes(item.value)} onChange={() => setRegencies((current) => current.includes(item.value) ? current.filter((value) => value !== item.value) : [...current, item.value])} className="mr-2" />{item.label}</label>)}</div></fieldset>
      <label className="font-semibold"><input type="checkbox" checked={inKkpd} onChange={(event) => setInKkpd(event.target.checked)} className="mr-2" />Termasuk data KKPD</label>
      {inKkpd && <div className="grid gap-2 md:grid-cols-2">{DATA_KKPD_OPTIONS.map((item) => <label key={item.value}><input type="checkbox" checked={kkpd.includes(item.value)} onChange={() => setKkpd((current) => current.includes(item.value) ? current.filter((value) => value !== item.value) : [...current, item.value])} className="mr-2" />{item.label}</label>)}</div>}
      <label className="font-semibold"><input type="checkbox" checked={inSubWpp} onChange={(event) => setInSubWpp(event.target.checked)} className="mr-2" />Termasuk data Sub-WPP</label>
      {inSubWpp && <div className="grid gap-2 md:grid-cols-2">{DATA_SUBWPP_OPTIONS.map((item) => <label key={item.value}><input type="checkbox" checked={subWpp.includes(item.value)} onChange={() => setSubWpp((current) => current.includes(item.value) ? current.filter((value) => value !== item.value) : [...current, item.value])} className="mr-2" />{item.label}</label>)}</div>}
      <label className="font-semibold">Deskripsi<textarea value={description} onChange={(event) => setDescription(event.target.value)} className="mt-2 block min-h-28 w-full rounded-xl border border-stone-300 px-4 py-3 font-normal" /></label>
      <Button onClick={() => void save()} loading={saving} disabled={saving}>Simpan Link</Button>
      {alert === "invalid" && <AlertNotif type="single" icon="failed" msg={message} yesText="Tutup" confirm={() => setAlert("none")} />}
      {alert === "failed" && <AlertNotif type="single" icon="failed" msg="Link gagal disimpan." yesText="Tutup" confirm={() => setAlert("none")} />}
      {alert === "success" && <AlertNotif type="single" icon="success" msg="Link berhasil disimpan." yesText="Tutup" confirm={() => setAlert("none")} />}
    </div>
  );
}
