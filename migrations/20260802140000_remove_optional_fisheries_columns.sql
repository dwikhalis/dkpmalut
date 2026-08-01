begin;

set local statement_timeout = 0;

drop policy if exists "capture dashboard trip rows" on public.dataset_fish_trip;
drop policy if exists "capture dashboard length rows" on public.dataset_fish_length;
drop index if exists public.fisheries_trip_dashboard_filters_idx;
drop index if exists public.fisheries_length_dashboard_filters_idx;
drop index if exists public.fisheries_trip_partner_idx;
drop index if exists public.fisheries_length_partner_idx;

alter table public.dataset_fish_trip
  drop column if exists partner_id,
  drop column if exists wpp,
  drop column if exists desa,
  drop column if exists nama_enumerator,
  drop column if exists pelabuhan_asal,
  drop column if exists lokasi_pendaratan,
  drop column if exists nama_nelayan,
  drop column if exists nama_pengumpul,
  drop column if exists nama_kapal,
  drop column if exists tgl_berangkat,
  drop column if exists waktu_berangkat,
  drop column if exists tgl_pulang,
  drop column if exists waktu_pulang,
  drop column if exists alat_lain,
  drop column if exists alat_bantu,
  drop column if exists dpi,
  drop column if exists kedalaman,
  drop column if exists jumlah_pancing,
  drop column if exists material_alat,
  drop column if exists panjang_jaring,
  drop column if exists panjang_tali_ris,
  drop column if exists ukuran_jaring,
  drop column if exists ukuran_pancing,
  drop column if exists waktu_memancing,
  drop column if exists jumlah_setting,
  drop column if exists jenis_rumpon,
  drop column if exists jumlah_rumpon_dikunjungi,
  drop column if exists jumlah_rumpon_berhasil,
  drop column if exists mesin_bantu,
  drop column if exists kapal_bantu,
  drop column if exists "GPS",
  drop column if exists gps,
  drop column if exists daya_cahaya,
  drop column if exists sumber_informasi,
  drop column if exists kategori_mesin,
  drop column if exists kekuatan_mesin,
  drop column if exists abk,
  drop column if exists tonase_kapal,
  drop column if exists panjang_kapal,
  drop column if exists material_kapal,
  drop column if exists biaya_es,
  drop column if exists biaya_bbm,
  drop column if exists biaya_umpan,
  drop column if exists lainnya,
  drop column if exists harga_lainnya,
  drop column if exists jumlah_palka,
  drop column if exists freezer,
  drop column if exists kfreezer,
  drop column if exists nama_umum,
  drop column if exists harga,
  drop column if exists jumlah,
  drop column if exists penyimpanan,
  drop column if exists id_trip,
  drop column if exists id_trip_1;

alter table public.dataset_fish_length
  drop column if exists partner_id,
  drop column if exists wpp,
  drop column if exists fork_length,
  drop column if exists lokasi;

create index if not exists fisheries_trip_dashboard_filters_idx
  on public.dataset_fish_trip(user_id,tanggal,kode_lokasi,alat_utama,zonasi,family,nama_spesies,trip_id);
create index if not exists fisheries_length_dashboard_filters_idx
  on public.dataset_fish_length(user_id,tanggal,fishing_ground,alat_tangkap,family,spesies,id_trip);

create policy "capture dashboard trip rows"
on public.dataset_fish_trip for select to anon,authenticated
using (
  user_id=auth.uid() or public.is_admin() or exists (
    select 1 from public.datasets d
    where d.kind='dashboard' and d.user_id=dataset_fish_trip.user_id and d.published='approved'
  )
);

create policy "capture dashboard length rows"
on public.dataset_fish_length for select to anon,authenticated
using (
  user_id=auth.uid() or public.is_admin() or exists (
    select 1 from public.datasets d
    where d.kind='dashboard' and d.user_id=dataset_fish_length.user_id and d.published='approved'
  )
);

commit;
