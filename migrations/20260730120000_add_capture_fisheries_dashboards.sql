create table public.fisheries_datasets (
 id uuid primary key default gen_random_uuid(), dataset_name text not null, slug text not null unique,
 partner_id uuid references public.users(id), organization_id uuid references public.users(id),
 uploaded_by uuid not null references public.users(id), source_file_name text, template_version text not null,
 validation_summary jsonb not null default '{}', calculation_snapshot jsonb not null default '{}',
 status text not null default 'draft' check(status in('draft','ready','failed')),
 published text check(published is null or published in('requested','approved','rejected')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.species add column if not exists genus text;
alter table public.species add column if not exists species_group text;
create table public.vessels (
 id uuid primary key default gen_random_uuid(), partner_id uuid references public.users(id), vessel_code text,
 vessel_name text, engine_category text, engine_power numeric, engine_power_unit text, gross_tonnage numeric,
 vessel_length numeric, vessel_material text, hold_count integer, hold_capacity numeric,
 freezer_available boolean, freezer_capacity numeric, created_at timestamptz default now(), updated_at timestamptz default now(),
 unique(partner_id,vessel_code)
);
create table public.fishing_trips (
 id uuid primary key default gen_random_uuid(), fisheries_dataset_id uuid not null references public.fisheries_datasets on delete cascade,
 trip_code text not null, village text, enumerator_name text, origin_port text, landing_location text not null,
 fisher_name text, collector_name text, vessel_id uuid references public.vessels, vessel_name text, wpp text,
 departure_at timestamptz not null, return_at timestamptz not null, primary_fishing_gear text not null,
 secondary_fishing_gear text, fishing_aid text, fishing_location text, latitude numeric, longitude numeric,
 depth numeric, zoning text, crew_count integer, operational_cost numeric, source_row_number integer,
 created_at timestamptz default now(), updated_at timestamptz default now(),
 unique(fisheries_dataset_id,trip_code), check(return_at>departure_at), check(crew_count is null or crew_count>=0),
 check(latitude is null or latitude between -90 and 90), check(longitude is null or longitude between -180 and 180)
);
create table public.fishing_trip_effort (
 id uuid primary key default gen_random_uuid(), fishing_trip_id uuid not null unique references public.fishing_trips on delete cascade,
 gear_material text, net_length numeric, headline_length numeric, mesh_size numeric, hook_number_or_size text,
 number_of_hooks integer, fishing_duration_hours numeric, number_of_settings integer,
 check(net_length is null or net_length>0), check(number_of_hooks is null or number_of_hooks>0),
 check(fishing_duration_hours is null or fishing_duration_hours>0), check(number_of_settings is null or number_of_settings>0)
);
create table public.fishing_trip_catches (
 id uuid primary key default gen_random_uuid(), fishing_trip_id uuid not null references public.fishing_trips on delete cascade,
 species_id uuid not null references public.species, original_species_name text not null, catch_weight_kg numeric,
 individual_count integer, retained_weight_kg numeric, discarded_weight_kg numeric, source_row_number integer,
 created_at timestamptz default now(), check(catch_weight_kg is null or catch_weight_kg>=0),
 check(individual_count is null or individual_count>=0),
 check(catch_weight_kg is not null or individual_count is not null)
);
create table public.fish_length_measurements (
 id uuid primary key default gen_random_uuid(), fishing_trip_catch_id uuid not null references public.fishing_trip_catches on delete cascade,
 species_id uuid not null references public.species, measurement_type text not null check(measurement_type in('total_length','fork_length')),
 length_cm numeric not null check(length_cm>0), fish_sequence integer, source_row_number integer, created_at timestamptz default now()
);
create index fisheries_dataset_owner_idx on public.fisheries_datasets(uploaded_by,published);
create index fishing_trips_filters_idx on public.fishing_trips(fisheries_dataset_id,return_at,wpp,primary_fishing_gear);
create index fishing_trips_location_idx on public.fishing_trips(landing_location,village);
create index fishing_catches_species_idx on public.fishing_trip_catches(fishing_trip_id,species_id);
create index fish_lengths_species_type_idx on public.fish_length_measurements(species_id,measurement_type);
alter table public.fisheries_datasets enable row level security;
alter table public.vessels enable row level security;
alter table public.fishing_trips enable row level security;
alter table public.fishing_trip_effort enable row level security;
alter table public.fishing_trip_catches enable row level security;
alter table public.fish_length_measurements enable row level security;
create policy "published or owned fisheries datasets" on public.fisheries_datasets for select
 using(published='approved' or uploaded_by=auth.uid() or public.is_admin());
create policy "managers create fisheries datasets" on public.fisheries_datasets for insert to authenticated
 with check(uploaded_by=auth.uid() and public.is_admin_or_partner());
create policy "owners manage fisheries datasets" on public.fisheries_datasets for all to authenticated
 using(uploaded_by=auth.uid() or public.is_admin()) with check(uploaded_by=auth.uid() or public.is_admin());
create policy "authorized vessels" on public.vessels for all to authenticated
 using(partner_id=auth.uid() or public.is_admin()) with check(partner_id=auth.uid() or public.is_admin());
create policy "accessible trips" on public.fishing_trips for select using(exists(
 select 1 from public.fisheries_datasets d where d.id=fisheries_dataset_id
 and(d.published='approved' or d.uploaded_by=auth.uid() or public.is_admin())));
create policy "accessible effort" on public.fishing_trip_effort for select using(exists(
 select 1 from public.fishing_trips tr join public.fisheries_datasets d on d.id=tr.fisheries_dataset_id
 where tr.id=fishing_trip_id and(d.published='approved' or d.uploaded_by=auth.uid() or public.is_admin())));
create policy "accessible catches" on public.fishing_trip_catches for select using(exists(
 select 1 from public.fishing_trips tr join public.fisheries_datasets d on d.id=tr.fisheries_dataset_id
 where tr.id=fishing_trip_id and(d.published='approved' or d.uploaded_by=auth.uid() or public.is_admin())));
create policy "accessible lengths" on public.fish_length_measurements for select using(exists(
 select 1 from public.fishing_trip_catches c join public.fishing_trips tr on tr.id=c.fishing_trip_id
 join public.fisheries_datasets d on d.id=tr.fisheries_dataset_id where c.id=fishing_trip_catch_id
 and(d.published='approved' or d.uploaded_by=auth.uid() or public.is_admin())));
-- Public access remains table-level protected; public dashboards must use privacy-safe aggregate RPCs,
-- never select personal names, exact coordinates, vessel ownership, or operational cost.
