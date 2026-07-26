import { writeFile } from "node:fs/promises";
import { conservationZones } from "../lib/conservation/publicDocuments.ts";

const databaseSlugs = {
  widi: "kepulauan-widi",
  "makian-moti": "makian-moti",
  guraici: "kepulauan-guraici",
  mare: "pulau-mare",
  "rao-dehegila": "rao-tanjung-dehegila",
  sula: "sula",
};

const localized = (id) => ({ id, en: "" });
const sqlJson = (value) =>
  `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;
const sqlText = (value) => `'${value.replaceAll("'", "''")}'`;
const areaNumber = (value) =>
  Number(
    value
      .replace(/[^\d,]/g, "")
      .replaceAll(".", "")
      .replace(",", "."),
  );

function guidance(name) {
  const value = name.toLowerCase();
  if (value.includes("inti"))
    return {
      allowed: [
        "Perlindungan dan pengawasan kawasan",
        "Penelitian atau pendidikan dengan izin",
      ],
      prohibited: [
        "Menangkap atau mengambil biota",
        "Wisata umum, budidaya, dan kegiatan yang merusak habitat",
      ],
    };
  if (value.includes("pariwisata"))
    return {
      allowed: [
        "Wisata bahari sesuai daya dukung dan arahan petugas",
        "Penelitian, pendidikan, snorkeling, atau menyelam sesuai ketentuan",
      ],
      prohibited: [
        "Mengambil biota, karang, atau benda alam",
        "Membuang sampah, menginjak karang, memberi makan, atau mengganggu satwa",
      ],
    };
  if (value.includes("penangkapan") || value.includes("perikanan tangkap"))
    return {
      allowed: [
        "Penangkapan ikan sesuai izin, kuota, musim, dan alat tangkap yang diperbolehkan",
        "Aktivitas nelayan tradisional sesuai ketentuan kawasan",
      ],
      prohibited: [
        "Bom, racun, setrum, dan alat tangkap merusak",
        "Menangkap jenis dilindungi atau ikan yang tidak sesuai ukuran dan ketentuan",
      ],
    };
  if (value.includes("budidaya"))
    return {
      allowed: [
        "Budidaya pada lokasi, komoditas, dan kapasitas yang diizinkan",
        "Pemantauan kualitas air serta pengelolaan limbah budidaya",
      ],
      prohibited: [
        "Membuka budidaya tanpa izin atau di luar batas zona",
        "Membuang limbah, bahan kimia, atau spesies asing yang membahayakan ekosistem",
      ],
    };
  if (value.includes("rehabilitasi"))
    return {
      allowed: [
        "Rehabilitasi, pemantauan, dan penelitian dengan persetujuan pengelola",
        "Kegiatan pemulihan habitat sesuai rencana teknis",
      ],
      prohibited: [
        "Mengambil hasil rehabilitasi atau mengganggu lokasi pemulihan",
        "Kegiatan yang menghambat pemulihan habitat",
      ],
    };
  if (value.includes("lalu lintas kapal"))
    return {
      allowed: ["Pelayaran pada koridor dan kecepatan yang ditetapkan"],
      prohibited: [
        "Keluar dari jalur atau berlabuh pada habitat sensitif",
        "Membuang sampah, minyak, atau limbah ke laut",
      ],
    };
  if (value.includes("tambat labuh"))
    return {
      allowed: ["Tambat labuh pada fasilitas atau titik yang ditentukan"],
      prohibited: [
        "Menjatuhkan jangkar pada terumbu karang atau padang lamun",
        "Pembuangan limbah kapal",
      ],
    };
  return {
    allowed: ["Kegiatan sesuai fungsi zona dan izin pengelola"],
    prohibited: [
      "Kegiatan yang merusak habitat atau bertentangan dengan ketentuan zonasi",
    ],
  };
}

const header = `-- Adds all public Explore content to conservation_areas.
alter table public.conservation_areas
  add column if not exists short_name jsonb not null default '{}'::jsonb,
  add column if not exists official_name jsonb not null default '{}'::jsonb,
  add column if not exists category jsonb not null default '{}'::jsonb,
  add column if not exists location jsonb not null default '{}'::jsonb,
  add column if not exists summary jsonb not null default '{}'::jsonb,
  add column if not exists area_hectares numeric not null default 0,
  add column if not exists ecosystems jsonb not null default '[]'::jsonb,
  add column if not exists key_features jsonb not null default '[]'::jsonb,
  add column if not exists zoning_summary jsonb not null default '{}'::jsonb,
  add column if not exists zoning_details jsonb not null default '[]'::jsonb,
  add column if not exists documents jsonb not null default '[]'::jsonb,
  add column if not exists map_image_path text,
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.set_conservation_area_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists set_conservation_area_updated_at on public.conservation_areas;
create trigger set_conservation_area_updated_at before update on public.conservation_areas
for each row execute function public.set_conservation_area_updated_at();

alter table public.conservation_areas enable row level security;
drop policy if exists "admins manage conservation area content" on public.conservation_areas;
create policy "admins manage conservation area content"
on public.conservation_areas for all to authenticated
using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'))
with check (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));
`;

const updates = conservationZones.map((zone, index) => {
  const zoning = zone.zoningDetails.map((detail) => ({
    name: localized(detail.name),
    area: detail.area,
    percentage: detail.percentage,
    purpose: localized(detail.purpose),
    allowed: guidance(detail.name).allowed.map(localized),
    prohibited: guidance(detail.name).prohibited.map(localized),
  }));
  const documents = zone.documents.map((document) => ({
    label: localized(document.label),
    title: localized(document.title),
    path: document.href,
    kind: document.kind,
  }));
  return `update public.conservation_areas set
  slug = '${zone.slug}',
  short_name = ${sqlJson(localized(zone.shortName))},
  official_name = ${sqlJson(localized(zone.officialName))},
  category = ${sqlJson(localized(zone.category))},
  location = ${sqlJson(localized(zone.location))},
  summary = ${sqlJson(localized(zone.summary))},
  area_hectares = ${areaNumber(zone.area)},
  ecosystems = ${sqlJson(zone.ecosystems.map(localized))},
  key_features = ${sqlJson(zone.keyFeatures.map(localized))},
  zoning_summary = ${sqlJson(localized(zone.zoning))},
  zoning_details = ${sqlJson(zoning)},
  documents = ${sqlJson(documents)},
  map_image_path = ${sqlText(zone.mapImage)},
  display_order = ${index}
where slug = '${databaseSlugs[zone.slug]}';`;
});

const footer = `
create unique index if not exists conservation_areas_slug_unique_idx
  on public.conservation_areas (slug);
`;

await writeFile(
  new URL("../supabase/sql/add_conservation_area_content.sql", import.meta.url),
  `${header}\n${updates.join("\n\n")}\n${footer}`,
);
