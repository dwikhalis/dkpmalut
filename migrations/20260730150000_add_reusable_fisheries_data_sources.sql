-- Reusable, versioned fisheries sources. Original files remain private while
-- multiple dashboards can safely reference one normalized dataset.
alter table public.fisheries_datasets
  add column if not exists version integer not null default 1 check(version > 0),
  add column if not exists supersedes_id uuid references public.fisheries_datasets(id) on delete restrict,
  add column if not exists field_inventory jsonb not null default '{}',
  add column if not exists taxonomy_version text,
  add column if not exists validation_version text,
  add column if not exists import_completed_at timestamptz;
create unique index if not exists fisheries_dataset_version_uidx
  on public.fisheries_datasets(partner_id, dataset_name, version);

create table public.fisheries_import_batches(
  id uuid primary key default gen_random_uuid(),
  fisheries_dataset_id uuid references public.fisheries_datasets(id) on delete cascade,
  dashboard_id uuid references public.datasets(id) on delete set null,
  owner_id uuid not null references public.users(id) on delete restrict,
  created_by uuid not null references public.users(id) on delete restrict,
  status text not null default 'pending'
    check(status in('pending','uploading','validating','importing','completed','failed')),
  source_manifest jsonb not null default '[]',
  validation_summary jsonb not null default '{}',
  technical_error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index fisheries_import_batches_owner_idx on public.fisheries_import_batches(owner_id,created_at desc);

create table public.fisheries_source_files(
  id uuid primary key default gen_random_uuid(),
  import_batch_id uuid not null references public.fisheries_import_batches(id) on delete cascade,
  fisheries_dataset_id uuid references public.fisheries_datasets(id) on delete cascade,
  owner_id uuid not null references public.users(id) on delete restrict,
  file_role text not null check(file_role in('trips','catches','effort','lengths','species_mapping','original','other')),
  original_file_name text not null,
  storage_path text not null unique,
  content_type text not null,
  size_bytes bigint not null check(size_bytes between 1 and 52428800),
  sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
  template_version text,
  column_inventory jsonb not null default '[]',
  row_count integer check(row_count is null or row_count >= 0),
  created_at timestamptz not null default now()
);
create index fisheries_source_files_dataset_idx on public.fisheries_source_files(fisheries_dataset_id,file_role);

create table public.dashboard_fisheries_sources(
  dashboard_id uuid not null references public.datasets(id) on delete cascade,
  fisheries_dataset_id uuid not null references public.fisheries_datasets(id) on delete restrict,
  attached_by uuid not null references public.users(id) on delete restrict,
  is_primary boolean not null default true,
  created_at timestamptz not null default now(),
  primary key(dashboard_id,fisheries_dataset_id)
);
create unique index dashboard_primary_fisheries_source_uidx
  on public.dashboard_fisheries_sources(dashboard_id) where is_primary;

create table public.fisheries_dataset_access_grants(
  fisheries_dataset_id uuid not null references public.fisheries_datasets(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  granted_by uuid not null references public.users(id) on delete restrict,
  can_read boolean not null default true,
  can_reuse boolean not null default false,
  can_export_original boolean not null default false,
  created_at timestamptz not null default now(),
  primary key(fisheries_dataset_id,user_id)
);

alter table public.fisheries_import_batches enable row level security;
alter table public.fisheries_source_files enable row level security;
alter table public.dashboard_fisheries_sources enable row level security;
alter table public.fisheries_dataset_access_grants enable row level security;

drop policy if exists "published or owned fisheries datasets" on public.fisheries_datasets;
create policy "authorized users read fisheries datasets" on public.fisheries_datasets
 for select to authenticated using(
  partner_id=auth.uid() or uploaded_by=auth.uid() or public.is_admin() or exists(
   select 1 from public.fisheries_dataset_access_grants g where
    g.fisheries_dataset_id=id and g.user_id=auth.uid() and g.can_read));

create or replace function public.can_read_fisheries_dataset(p_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.fisheries_datasets d where d.id=p_id and
  (d.partner_id=auth.uid() or d.uploaded_by=auth.uid() or public.is_admin() or exists(
   select 1 from public.fisheries_dataset_access_grants g
   where g.fisheries_dataset_id=d.id and g.user_id=auth.uid() and g.can_read)));
$$;
create or replace function public.can_reuse_fisheries_dataset(p_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.fisheries_datasets d where d.id=p_id and
  (d.partner_id=auth.uid() or public.is_admin() or exists(
   select 1 from public.fisheries_dataset_access_grants g
   where g.fisheries_dataset_id=d.id and g.user_id=auth.uid() and g.can_reuse)));
$$;
create or replace function public.owns_fisheries_dataset(p_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.fisheries_datasets d where d.id=p_id
  and(d.partner_id=auth.uid() or public.is_admin()));
$$;
revoke all on function public.can_read_fisheries_dataset(uuid),public.can_reuse_fisheries_dataset(uuid) from public;
revoke all on function public.owns_fisheries_dataset(uuid) from public;
grant execute on function public.can_read_fisheries_dataset(uuid),public.can_reuse_fisheries_dataset(uuid),
 public.owns_fisheries_dataset(uuid) to authenticated;

create policy "owners read import batches" on public.fisheries_import_batches for select to authenticated
 using(owner_id=auth.uid() or public.is_admin());
create policy "owners read source files" on public.fisheries_source_files for select to authenticated
 using(public.can_read_fisheries_dataset(fisheries_dataset_id) or (fisheries_dataset_id is null and owner_id=auth.uid()) or public.is_admin());
create policy "users read attached sources" on public.dashboard_fisheries_sources for select to authenticated
 using(public.can_read_fisheries_dataset(fisheries_dataset_id));
create policy "owners manage source grants" on public.fisheries_dataset_access_grants for all to authenticated
 using(public.owns_fisheries_dataset(fisheries_dataset_id))
 with check(public.owns_fisheries_dataset(fisheries_dataset_id) and granted_by=auth.uid());
create policy "grantees read own source grant" on public.fisheries_dataset_access_grants
 for select to authenticated using(user_id=auth.uid());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('fisheries-source-files','fisheries-source-files',false,52428800,
 array['text/csv','application/csv','text/plain','application/zip'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,
 allowed_mime_types=excluded.allowed_mime_types;
create policy "owners upload fisheries source files" on storage.objects for insert to authenticated
 with check(bucket_id='fisheries-source-files' and (storage.foldername(name))[1]=auth.uid()::text
  and public.is_admin_or_partner());
create policy "authorized users read fisheries source files" on storage.objects for select to authenticated
 using(bucket_id='fisheries-source-files' and exists(
  select 1 from public.fisheries_source_files f where f.storage_path=name and
   (f.owner_id=auth.uid() or public.is_admin() or exists(
    select 1 from public.fisheries_dataset_access_grants g where
     g.fisheries_dataset_id=f.fisheries_dataset_id and g.user_id=auth.uid()
     and g.can_export_original))));

create or replace function public.attach_fisheries_source_to_dashboard(
 p_dashboard_id uuid,p_fisheries_dataset_id uuid
) returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null or not exists(select 1 from public.datasets where id=p_dashboard_id
   and kind='dashboard' and(user_id=auth.uid() or public.is_admin())) then
  raise exception 'dashboard_not_editable' using errcode='42501';
 end if;
 if not public.can_reuse_fisheries_dataset(p_fisheries_dataset_id) then
  raise exception 'source_not_reusable' using errcode='42501';
 end if;
 insert into public.dashboard_fisheries_sources(dashboard_id,fisheries_dataset_id,attached_by,is_primary)
 values(p_dashboard_id,p_fisheries_dataset_id,auth.uid(),true)
 on conflict(dashboard_id,fisheries_dataset_id) do update set is_primary=true;
 update public.datasets set fisheries_dataset_id=p_fisheries_dataset_id,
  dashboard_config=jsonb_set(coalesce(dashboard_config,'{}'),'{sharedDatasetStatus}','"imported"',true),
  updated_at=now() where id=p_dashboard_id;
end $$;
revoke all on function public.attach_fisheries_source_to_dashboard(uuid,uuid) from public;
grant execute on function public.attach_fisheries_source_to_dashboard(uuid,uuid) to authenticated;

-- Backfill the link table for sources imported before this migration.
insert into public.dashboard_fisheries_sources(dashboard_id,fisheries_dataset_id,attached_by,is_primary)
select id,fisheries_dataset_id,user_id,true from public.datasets
where kind='dashboard' and fisheries_dataset_id is not null and user_id is not null
on conflict do nothing;

-- Wrap the original atomic importer so every successful import also records
-- its reusable field inventory and dashboard/source relationship.
alter function public.import_normalized_fisheries_dataset(uuid,jsonb,jsonb,jsonb,jsonb)
  rename to import_normalized_fisheries_dataset_core_v1;
create function public.import_normalized_fisheries_dataset(
 p_dashboard_id uuid,p_metadata jsonb,p_trips jsonb,p_catches jsonb,
 p_lengths jsonb default '[]'::jsonb
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
 v_id := public.import_normalized_fisheries_dataset_core_v1(
  p_dashboard_id,p_metadata,p_trips,p_catches,p_lengths);
 update public.fisheries_datasets set
  field_inventory=coalesce(p_metadata->'field_inventory','{}'),
  validation_version=nullif(p_metadata->>'validation_version',''),
  taxonomy_version=nullif(p_metadata->>'taxonomy_version',''),
  import_completed_at=now() where id=v_id;
 insert into public.dashboard_fisheries_sources(
  dashboard_id,fisheries_dataset_id,attached_by,is_primary)
 values(p_dashboard_id,v_id,auth.uid(),true) on conflict do nothing;
 return v_id;
end $$;
revoke all on function public.import_normalized_fisheries_dataset_core_v1(uuid,jsonb,jsonb,jsonb,jsonb) from public;
revoke all on function public.import_normalized_fisheries_dataset(uuid,jsonb,jsonb,jsonb,jsonb) from public;
grant execute on function public.import_normalized_fisheries_dataset(uuid,jsonb,jsonb,jsonb,jsonb) to authenticated;
