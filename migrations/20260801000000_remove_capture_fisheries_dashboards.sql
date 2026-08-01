begin;

-- Remove policies that live outside the feature-owned tables.
drop policy if exists "owners upload fisheries source files" on storage.objects;
drop policy if exists "authorized users read fisheries source files" on storage.objects;
drop policy if exists "owner or admin reads fisheries source files" on storage.objects;

-- Remove dashboard guards before removing their backing columns.
drop trigger if exists prevent_published_dashboard_material_changes on public.datasets;
drop trigger if exists prevent_dashboard_self_approval_on_insert on public.datasets;

drop function if exists public.prevent_published_dashboard_material_changes() cascade;
drop function if exists public.prevent_dashboard_self_approval_on_insert() cascade;
drop function if exists public.get_public_fisheries_dashboard_snapshot(uuid) cascade;
drop function if exists public.get_private_fisheries_analysis_snapshot(uuid,date,date,text,text,text) cascade;
drop function if exists public.detach_fisheries_source_from_dashboard(uuid) cascade;
drop function if exists public.attach_fisheries_source_to_dashboard(uuid,uuid) cascade;
drop function if exists public.import_normalized_fisheries_dataset(uuid,jsonb,jsonb,jsonb,jsonb) cascade;
drop function if exists public.import_normalized_fisheries_dataset_core_v1(uuid,jsonb,jsonb,jsonb,jsonb) cascade;
drop function if exists public.get_published_fisheries_summary(text) cascade;
drop function if exists public.can_read_fisheries_dataset(uuid) cascade;
drop function if exists public.can_reuse_fisheries_dataset(uuid) cascade;
drop function if exists public.owns_fisheries_dataset(uuid) cascade;
drop function if exists public.import_lbi_dataset(jsonb,jsonb) cascade;
drop function if exists public.prevent_approved_reference_mutation() cascade;

alter table if exists public.datasets
  drop column if exists fisheries_dataset_id,
  drop column if exists dashboard_config;

drop index if exists public.datasets_dashboard_kind_idx;

-- Delete only dashboards created through the removed feature. Regular
-- dataset, map, and link records must remain untouched.
delete from public.datasets where kind = 'dashboard';

alter table if exists public.datasets drop constraint if exists datasets_kind_check;
alter table if exists public.datasets add constraint datasets_kind_check
  check (kind in ('dataset', 'map', 'link'));

-- Drop children first so no feature data or foreign keys remain.
drop table if exists public.fisheries_import_species_mappings cascade;
drop table if exists public.dashboard_fisheries_sources cascade;
drop table if exists public.fisheries_source_files cascade;
drop table if exists public.fisheries_import_batches cascade;
drop table if exists public.fisheries_dataset_access_grants cascade;
drop table if exists public.fish_length_measurements cascade;
drop table if exists public.fishing_trip_catches cascade;
drop table if exists public.fishing_trip_effort cascade;
drop table if exists public.fishing_trips cascade;
drop table if exists public.vessels cascade;
drop table if exists public.fisheries_datasets cascade;
drop table if exists public.lbi_observations cascade;
drop table if exists public.lbi_datasets cascade;
drop table if exists public.species_biological_references cascade;
drop table if exists public.species cascade;

commit;
