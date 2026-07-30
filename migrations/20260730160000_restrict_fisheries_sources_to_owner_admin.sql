-- Fisheries source data is private to its owner and administrators.
-- Remove the delegated stakeholder grant model introduced previously.

drop policy if exists "authorized users read fisheries source files" on storage.objects;
drop policy if exists "authorized users read fisheries datasets" on public.fisheries_datasets;
drop policy if exists "owners manage source grants" on public.fisheries_dataset_access_grants;
drop policy if exists "grantees read own source grant" on public.fisheries_dataset_access_grants;

create or replace function public.can_read_fisheries_dataset(p_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
 select exists(
  select 1 from public.fisheries_datasets d
  where d.id=p_id and(d.partner_id=auth.uid() or public.is_admin())
 );
$$;
create or replace function public.can_reuse_fisheries_dataset(p_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
 select exists(
  select 1 from public.fisheries_datasets d
  where d.id=p_id and(d.partner_id=auth.uid() or public.is_admin())
 );
$$;
create or replace function public.owns_fisheries_dataset(p_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
 select public.can_read_fisheries_dataset(p_id);
$$;

drop table if exists public.fisheries_dataset_access_grants;

create policy "owner or admin reads fisheries datasets"
on public.fisheries_datasets for select to authenticated
using(partner_id=auth.uid() or public.is_admin());

create policy "owner or admin reads fisheries source files"
on storage.objects for select to authenticated
using(
 bucket_id='fisheries-source-files' and exists(
  select 1 from public.fisheries_source_files f
  where f.storage_path=name and(f.owner_id=auth.uid() or public.is_admin())
 )
);

comment on table public.fisheries_source_files is
 'Private original fisheries files. Read/export is restricted to the data owner and administrators.';

