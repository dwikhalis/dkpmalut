create table public.fisheries_import_species_mappings(
 import_batch_id uuid not null references public.fisheries_import_batches(id) on delete cascade,
 original_name text not null,
 normalized_name text not null,
 species_id uuid not null references public.species(id) on delete restrict,
 confirmed_by uuid not null references public.users(id) on delete restrict,
 confirmed_at timestamptz not null default now(),
 primary key(import_batch_id,normalized_name)
);
create index fisheries_import_species_mappings_species_idx
 on public.fisheries_import_species_mappings(species_id);
alter table public.fisheries_import_species_mappings enable row level security;
create policy "owners read confirmed import species"
 on public.fisheries_import_species_mappings for select to authenticated
 using(exists(select 1 from public.fisheries_import_batches b
  where b.id=import_batch_id and(b.owner_id=auth.uid() or public.is_admin())));
-- Mutations are performed only by the authenticated server endpoint after it
-- verifies batch ownership. There are deliberately no direct client writes.
