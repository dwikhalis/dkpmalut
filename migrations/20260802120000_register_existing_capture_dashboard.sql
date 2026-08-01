begin;

-- Supabase's SQL editor can impose a short statement timeout. The ownership
-- backfill may touch many existing fisheries rows and needs to finish as one
-- atomic migration.
set local statement_timeout = 0;

-- Allow dashboard records in the existing datasets table.
alter table public.datasets
  drop constraint if exists datasets_kind_check;

alter table public.datasets
  add constraint datasets_kind_check
  check (kind in ('dataset', 'map', 'link', 'dashboard'));

-- Table datasets store their column definitions as an array. Dashboard rows
-- store workflow metadata as an object instead, while keeping the legacy rule
-- unchanged for every other dataset kind.
alter table public.datasets
  drop constraint if exists datasets_column_config_check;

alter table public.datasets
  add constraint datasets_column_config_check
  check (
    case
      when kind = 'dashboard'
        then jsonb_typeof(column_config) = 'object'
      else jsonb_typeof(column_config) = 'array'
    end
  );

-- Preserve partner_id, add the application user owner, and use only trip_id
-- as the trip identifier in dataset_fish_trip.
alter table public.dataset_fish_trip
  drop column if exists id_trip;

alter table public.dataset_fish_trip
  drop column if exists id_trip_1;

alter table public.dataset_fish_trip
  add column if not exists user_id uuid
  references public.users(id) on delete set null;

alter table public.dataset_fish_length
  add column if not exists user_id uuid
  references public.users(id) on delete set null;

-- Link the already-populated client rows to their application user.
-- These statements update existing rows only; they do not insert fish data.
update public.dataset_fish_trip
set user_id = '6187a283-6e0f-4846-b923-b2d5308dd571'::uuid
where partner_id = 'b52046e5-edcb-4405-add1-9d570f82b379'::uuid
  and user_id is distinct from
    '6187a283-6e0f-4846-b923-b2d5308dd571'::uuid;

update public.dataset_fish_length
set user_id = '6187a283-6e0f-4846-b923-b2d5308dd571'::uuid
where partner_id = 'b52046e5-edcb-4405-add1-9d570f82b379'::uuid
  and user_id is distinct from
    '6187a283-6e0f-4846-b923-b2d5308dd571'::uuid;

create index if not exists fisheries_trip_user_idx
  on public.dataset_fish_trip(user_id);

create index if not exists fisheries_trip_dashboard_filters_idx
  on public.dataset_fish_trip(
    tanggal,
    wpp,
    alat_utama,
    family,
    nama_spesies,
    zonasi,
    trip_id
  );

create index if not exists fisheries_length_user_idx
  on public.dataset_fish_length(user_id);

create index if not exists fisheries_length_dashboard_filters_idx
  on public.dataset_fish_length(
    tanggal,
    wpp,
    spesies,
    alat_tangkap,
    id_trip
  );

alter table public.dataset_fish_trip enable row level security;
alter table public.dataset_fish_length enable row level security;

drop policy if exists "capture dashboard trip rows" on public.dataset_fish_trip;
create policy "capture dashboard trip rows"
on public.dataset_fish_trip
for select
to anon, authenticated
using (
  user_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1
    from public.datasets d
    where d.kind = 'dashboard'
      and d.column_config->'dashboardWorkflow'->>'sourcePartnerId' =
        partner_id::text
      and d.published = 'approved'
  )
);

drop policy if exists "capture dashboard length rows" on public.dataset_fish_length;
create policy "capture dashboard length rows"
on public.dataset_fish_length
for select
to anon, authenticated
using (
  user_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1
    from public.datasets d
    where d.kind = 'dashboard'
      and d.column_config->'dashboardWorkflow'->>'sourcePartnerId' =
        partner_id::text
      and d.published = 'approved'
  )
);

-- Register the existing rigid source data as one dashboard publication.
-- No rows are inserted into dataset_fish_trip or dataset_fish_length.
insert into public.datasets (
  user_id,
  label,
  slug,
  kind,
  data,
  column_config,
  chart_config,
  published_config,
  published,
  tag,
  description,
  image_path,
  import_status,
  draft_expires_at,
  data_regency,
  data_subwpp
)
select
  '6187a283-6e0f-4846-b923-b2d5308dd571'::uuid,
  'Dashboar Perikanan Tangkap Malut',
  'dashboar-perikanan-tangkap-malut',
  'dashboard',
  '[]'::jsonb,
  jsonb_build_object(
    'dashboardWorkflow',
    jsonb_build_object(
      'selectedTabs', jsonb_build_array(
        'cpue',
        'totallanding',
        'composition',
        'lengthfrequency'
      ),
      'currentStage', 'publication',
      'activeTab', 'cpue',
      'uploadStatus', jsonb_build_object(
        'cpue', 'saved',
        'totallanding', 'saved',
        'composition', 'saved',
        'lengthfrequency', 'saved'
      ),
      'visualizationStatus', jsonb_build_object(
        'cpue', 'saved',
        'totallanding', 'saved',
        'composition', 'saved',
        'lengthfrequency', 'saved'
      ),
      'sourcePartnerId', 'b52046e5-edcb-4405-add1-9d570f82b379'
    )
  ),
  jsonb_build_object(
    'cpue', jsonb_build_object(
      'status', 'saved',
      'title', 'CPUE',
      'config', jsonb_build_object('chartType', 'bar')
    ),
    'totallanding', jsonb_build_object(
      'status', 'saved',
      'title', 'Total Landing',
      'config', jsonb_build_object('chartType', 'bar')
    ),
    'composition', jsonb_build_object(
      'status', 'saved',
      'title', 'Komposisi',
      'config', jsonb_build_object(
        'chartType', 'doughnut',
        'compositionThreshold', 2
      )
    ),
    'lengthfrequency', jsonb_build_object(
      'status', 'saved',
      'title', 'Frekuensi Panjang',
      'config', jsonb_build_object(
        'chartType', 'histogram',
        'measurementType', 'TL',
        'binWidth', 1
      )
    )
  ),
  jsonb_build_object(
    'dashboard',
    jsonb_build_object(
      'selectedTabs', jsonb_build_array(
        'cpue',
        'totallanding',
        'composition',
        'lengthfrequency'
      )
    )
  ),
  'requested',
  array['tangkap'],
  'Dashboard Perikanan Tangkap Malut',
  null,
  'ready',
  null,
  array[
    'Pulau Morotai',
    'Kota Ternate',
    'Kota Tidore',
    'Halmahera Selatan',
    'Halmahera Utara'
  ],
  array[
    'Morotai - Halut',
    'Ternate - Tidore - Halsel'
  ]
where not exists (
  select 1
  from public.datasets
  where user_id = '6187a283-6e0f-4846-b923-b2d5308dd571'::uuid
    and kind = 'dashboard'
    and label = 'Dashboar Perikanan Tangkap Malut'
);

commit;
