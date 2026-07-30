alter table public.fisheries_import_batches
 add column if not exists mapping_config jsonb not null default '{}',
 add column if not exists field_inventory jsonb not null default '{}',
 add column if not exists validation_report jsonb not null default '[]',
 add column if not exists validation_version text,
 add column if not exists updated_at timestamptz not null default now();
create index if not exists fisheries_import_batches_dashboard_status_idx
 on public.fisheries_import_batches(dashboard_id,status,created_at desc);

create policy "owners update unfinished import batches"
on public.fisheries_import_batches for update to authenticated
using(owner_id=auth.uid() and status in('pending','validating','failed'))
with check(owner_id=auth.uid() and status in('pending','validating','failed'));
