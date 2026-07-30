"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "@/app/components/Button";
import { useAuthStore } from "@/app/Stores/authStores";
import { supabase } from "@/lib/supabase/supabaseClient";
import { validateReferenceForApproval } from "@/lib/fisheries/validateLBIFile";

type Species = { id: string; scientific_name: string; common_name: string | null; local_name: string | null };
type RefRow = {
  id: string; species_id: string; linf: number; lm: number; lopt: number; length_type: string; length_unit: string;
  sex_applicability: string; geographic_area: string | null; stock_name: string | null; source_title: string;
  source_authors: string | null; source_year: number | null; source_url: string | null; doi: string | null;
  notes: string | null; status: "draft" | "under_review" | "approved" | "archived"; version: number;
};
const blank = { species_id: "", linf: "", lm: "", lopt: "", length_type: "total_length", length_unit: "cm", sex_applicability: "combined", geographic_area: "", stock_name: "", source_title: "", source_authors: "", source_year: "", source_url: "", doi: "", notes: "" };
const field = "w-full rounded-md border border-stone-300 px-3 py-2 text-sm";

export default function BiologicalReferenceManager() {
  const userId = useAuthStore((state) => state.userId);
  const [species, setSpecies] = useState<Species[]>([]);
  const [refs, setRefs] = useState<RefRow[]>([]);
  const [form, setForm] = useState(blank);
  const [sourceVersion, setSourceVersion] = useState<RefRow | null>(null);
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    const [{ data: s }, { data: r }] = await Promise.all([
      supabase.from("species").select("id,scientific_name,common_name,local_name").order("scientific_name"),
      supabase.from("species_biological_references").select("*").order("created_at", { ascending: false }),
    ]);
    setSpecies((s ?? []) as Species[]); setRefs((r ?? []) as RefRow[]);
  }, []);
  useEffect(() => { void load(); }, [load]);
  const save = async () => {
    setMessage("");
    const values = { linf: Number(form.linf), lm: Number(form.lm), lopt: Number(form.lopt) };
    const checks = validateReferenceForApproval(values);
    if (!form.species_id || !form.source_title.trim() || checks.errors.length) { setMessage(checks.errors.join(" ") || "Spesies dan sumber wajib diisi."); return; }
    const version = sourceVersion
      ? Math.max(0, ...refs.filter((item) => item.species_id === sourceVersion.species_id).map((item) => item.version)) + 1
      : Math.max(0, ...refs.filter((item) => item.species_id === form.species_id).map((item) => item.version)) + 1;
    const { error } = await supabase.from("species_biological_references").insert({
      ...values, species_id: form.species_id, length_type: form.length_type, length_unit: form.length_unit,
      sex_applicability: form.sex_applicability, geographic_area: form.geographic_area || null, stock_name: form.stock_name || null,
      source_title: form.source_title.trim(), source_authors: form.source_authors || null,
      source_year: form.source_year ? Number(form.source_year) : null, source_url: form.source_url || null,
      doi: form.doi || null, notes: form.notes || null, status: "draft", version, created_by: userId,
      supersedes_id: sourceVersion?.id ?? null,
    });
    if (error) { console.error("Reference insert failed:", error); setMessage("Referensi gagal disimpan."); return; }
    setForm(blank); setSourceVersion(null); setMessage(checks.warnings.join(" ") || "Referensi draft berhasil dibuat."); await load();
  };
  const transition = async (item: RefRow, status: RefRow["status"]) => {
    if (status === "approved") {
      const checks = validateReferenceForApproval(item);
      if (checks.errors.length) { setMessage(checks.errors.join(" ")); return; }
      if (checks.warnings.length && !window.confirm(`${checks.warnings.join(" ")} Tetap setujui?`)) return;
    }
    const { error } = await supabase.from("species_biological_references").update({ status }).eq("id", item.id);
    if (error) { console.error("Reference transition failed:", error); setMessage("Perubahan status gagal."); }
    else { setMessage("Status referensi diperbarui."); await load(); }
  };
  const versionFrom = (item: RefRow) => {
    setSourceVersion(item);
    setForm({
      species_id: item.species_id, linf: String(item.linf), lm: String(item.lm), lopt: String(item.lopt),
      length_type: item.length_type, length_unit: item.length_unit, sex_applicability: item.sex_applicability,
      geographic_area: item.geographic_area ?? "", stock_name: item.stock_name ?? "", source_title: item.source_title,
      source_authors: item.source_authors ?? "", source_year: item.source_year ? String(item.source_year) : "",
      source_url: item.source_url ?? "", doi: item.doi ?? "", notes: item.notes ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return <div className="min-w-0 flex-1 space-y-5 overflow-y-auto rounded-2xl border bg-stone-50 p-5 shadow-md">
    <div><h1 className="text-2xl font-bold">Referensi Biologis Spesies</h1><p className="text-sm text-stone-600">Draft → Ditinjau → Disetujui → Diarsipkan. Referensi disetujui tidak dapat ditimpa.</p></div>
    {message && <div role="status" className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm">{message}</div>}
    <div className="rounded-xl border bg-white p-4"><h2 className="font-semibold">{sourceVersion ? `Buat versi baru dari v${sourceVersion.version}` : "Tambah referensi"}</h2>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <label className="text-sm">Spesies *<select className={field} value={form.species_id} disabled={Boolean(sourceVersion)} onChange={(e) => setForm({ ...form, species_id: e.target.value })}><option value="">Pilih</option>{species.map((item) => <option key={item.id} value={item.id}>{item.scientific_name}</option>)}</select></label>
        {(["linf","lm","lopt"] as const).map((key) => <label key={key} className="text-sm">{key === "linf" ? "L∞" : key === "lm" ? "Lm" : "Lopt"} *<input type="number" min="0" step="any" className={field} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></label>)}
        <label className="text-sm">Tipe panjang<select className={field} value={form.length_type} onChange={(e) => setForm({ ...form, length_type: e.target.value })}><option value="total_length">Total</option><option value="fork_length">Cagak</option><option value="standard_length">Standar</option></select></label>
        <label className="text-sm">Satuan<select className={field} value={form.length_unit} onChange={(e) => setForm({ ...form, length_unit: e.target.value })}><option value="cm">cm</option><option value="mm">mm</option></select></label>
        <label className="text-sm">Penerapan jenis kelamin<select className={field} value={form.sex_applicability} onChange={(e) => setForm({ ...form, sex_applicability: e.target.value })}><option value="combined">Gabungan</option><option value="male">Jantan</option><option value="female">Betina</option></select></label>
        <label className="text-sm md:col-span-2">Judul sumber *<input className={field} value={form.source_title} onChange={(e) => setForm({ ...form, source_title: e.target.value })} /></label>
        <label className="text-sm">Penulis<input className={field} value={form.source_authors} onChange={(e) => setForm({ ...form, source_authors: e.target.value })} /></label>
        <label className="text-sm">Tahun<input type="number" className={field} value={form.source_year} onChange={(e) => setForm({ ...form, source_year: e.target.value })} /></label>
        <label className="text-sm">Wilayah geografis<input className={field} value={form.geographic_area} onChange={(e) => setForm({ ...form, geographic_area: e.target.value })} /></label>
        <label className="text-sm">Nama stok<input className={field} value={form.stock_name} onChange={(e) => setForm({ ...form, stock_name: e.target.value })} /></label>
        <label className="text-sm">URL sumber<input type="url" className={field} value={form.source_url} onChange={(e) => setForm({ ...form, source_url: e.target.value })} /></label>
        <label className="text-sm">DOI<input className={field} value={form.doi} onChange={(e) => setForm({ ...form, doi: e.target.value })} /></label>
        <label className="text-sm md:col-span-3">Catatan<textarea className={field} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
      </div><div className="mt-3 flex gap-2"><Button onClick={() => void save()}>Simpan draft</Button>{sourceVersion && <Button variant="outline" onClick={() => { setSourceVersion(null); setForm(blank); }}>Batal</Button>}</div>
    </div>
    <div className="overflow-x-auto rounded-xl border bg-white"><table className="min-w-full text-sm"><thead className="bg-sky-100"><tr>{["Spesies","Versi","Nilai","Pengukuran","Sumber","Status","Aksi"].map((text) => <th key={text} className="p-3 text-left">{text}</th>)}</tr></thead><tbody>{refs.map((item) => <tr key={item.id} className="border-t"><td className="p-3 italic">{species.find((s) => s.id === item.species_id)?.scientific_name}</td><td className="p-3">v{item.version}</td><td className="p-3">Lm {item.lm}; Lopt {item.lopt}; L∞ {item.linf}</td><td className="p-3">{item.length_type}, {item.length_unit}</td><td className="max-w-64 p-3">{item.source_title}{item.source_year ? ` (${item.source_year})` : ""}</td><td className="p-3">{item.status}</td><td className="p-3"><div className="flex flex-wrap gap-1">{item.status === "draft" && <Button size="xs" onClick={() => void transition(item, "under_review")}>Ajukan tinjau</Button>}{item.status === "under_review" && <Button size="xs" variant="success" onClick={() => void transition(item, "approved")}>Setujui</Button>}{item.status === "approved" && <><Button size="xs" variant="outline" onClick={() => versionFrom(item)}>Versi baru</Button><Button size="xs" variant="neutral" onClick={() => void transition(item, "archived")}>Arsipkan</Button></>}</div></td></tr>)}</tbody></table></div>
  </div>;
}

