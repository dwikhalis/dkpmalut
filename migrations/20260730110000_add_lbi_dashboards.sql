-- Length-Based Indicator datasets, versioned biological references, and atomic imports.
create table if not exists public.species (
  id uuid primary key default gen_random_uuid(),
  scientific_name text not null,
  common_name text,
  local_name text,
  family text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (scientific_name)
);

create table if not exists public.species_biological_references (
  id uuid primary key default gen_random_uuid(),
  species_id uuid not null references public.species(id) on delete restrict,
  linf numeric not null check (linf > 0),
  lm numeric not null check (lm > 0),
  lopt numeric not null check (lopt > 0),
  length_type text not null check (length_type in ('total_length','fork_length','standard_length')),
  length_unit text not null check (length_unit in ('cm','mm')),
  sex_applicability text not null default 'combined' check (sex_applicability in ('combined','male','female')),
  geographic_area text,
  stock_name text,
  source_title text not null,
  source_authors text,
  source_year integer check (source_year is null or source_year between 1800 and 2200),
  source_url text,
  doi text,
  notes text,
  status text not null default 'draft' check (status in ('draft','under_review','approved','archived')),
  version integer not null default 1 check (version > 0),
  created_by uuid not null references public.users(id) on delete restrict,
  reviewed_by uuid references public.users(id) on delete set null,
  approved_at timestamptz,
  supersedes_id uuid references public.species_biological_references(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (lm < linf and lopt < linf),
  unique (species_id, version)
);
create index if not exists species_reference_selection_idx
  on public.species_biological_references(species_id, status, version desc);

create table if not exists public.lbi_datasets (
  id uuid primary key default gen_random_uuid(),
  dataset_name text not null,
  slug text not null unique,
  species_id uuid not null references public.species(id) on delete restrict,
  biological_reference_id uuid not null references public.species_biological_references(id) on delete restrict,
  organization_id uuid references public.users(id) on delete set null,
  uploaded_by uuid not null references public.users(id) on delete restrict,
  sampling_location text not null,
  latitude numeric check (latitude is null or latitude between -90 and 90),
  longitude numeric check (longitude is null or longitude between -180 and 180),
  landing_site text not null,
  sampling_start_date date not null,
  sampling_end_date date not null,
  fishing_gear text not null,
  sampling_method text not null check (sampling_method in ('random','systematic','opportunistic','census','unknown')),
  catch_scope text not null check (catch_scope in ('retained_catch','total_catch','landing_sample','market_sample','other')),
  market_sorting boolean not null,
  collector_name text not null,
  collector_organization text,
  notes text,
  length_type text not null check (length_type in ('total_length','fork_length','standard_length')),
  length_unit text not null check (length_unit in ('cm','mm')),
  template_version text not null,
  calculation_version text not null,
  reference_snapshot jsonb not null,
  validation_summary jsonb not null,
  analysis_result jsonb not null,
  original_csv_path text,
  validation_report jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft','ready','failed')),
  published text check (published is null or published in ('requested','approved','rejected')),
  tag text[] not null default array['tangkap','lbi'],
  description text,
  image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (sampling_end_date >= sampling_start_date)
);
create index if not exists lbi_datasets_owner_idx on public.lbi_datasets(uploaded_by);
create index if not exists lbi_datasets_public_idx on public.lbi_datasets(published) where published = 'approved';
create index if not exists lbi_datasets_species_idx on public.lbi_datasets(species_id);

create table if not exists public.lbi_observations (
  id uuid primary key default gen_random_uuid(),
  lbi_dataset_id uuid not null references public.lbi_datasets(id) on delete cascade,
  sample_id text not null,
  sampling_date date not null,
  length numeric not null check (length > 0),
  sex text not null default 'unknown' check (sex in ('male','female','unknown')),
  weight numeric check (weight is null or weight > 0),
  maturity_stage text,
  notes text,
  source_row_number integer not null check (source_row_number > 0),
  created_at timestamptz not null default now(),
  unique (lbi_dataset_id, sample_id)
);
create index if not exists lbi_observations_filter_idx on public.lbi_observations(lbi_dataset_id, sampling_date, sex);
create index if not exists lbi_observations_length_idx on public.lbi_observations(lbi_dataset_id, length);

alter table public.species enable row level security;
alter table public.species_biological_references enable row level security;
alter table public.lbi_datasets enable row level security;
alter table public.lbi_observations enable row level security;

drop policy if exists "active species readable" on public.species;
drop policy if exists "admins manage species" on public.species;
drop policy if exists "approved references readable" on public.species_biological_references;
drop policy if exists "admins manage references" on public.species_biological_references;
drop policy if exists "read published or owned lbi datasets" on public.lbi_datasets;
drop policy if exists "content managers create lbi datasets" on public.lbi_datasets;
drop policy if exists "owners update lbi datasets" on public.lbi_datasets;
drop policy if exists "owners delete lbi datasets" on public.lbi_datasets;
drop policy if exists "read accessible lbi observations" on public.lbi_observations;

create policy "active species readable" on public.species for select
  using (is_active or public.is_admin());
create policy "admins manage species" on public.species for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "approved references readable" on public.species_biological_references for select
  using (status = 'approved' or public.is_admin());
create policy "admins manage references" on public.species_biological_references for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "read published or owned lbi datasets" on public.lbi_datasets for select
  using (published = 'approved' or uploaded_by = auth.uid() or public.is_admin());
create policy "content managers create lbi datasets" on public.lbi_datasets for insert to authenticated
  with check (uploaded_by = auth.uid() and public.is_admin_or_partner());
create policy "owners update lbi datasets" on public.lbi_datasets for update to authenticated
  using (uploaded_by = auth.uid() or public.is_admin())
  with check (uploaded_by = auth.uid() or public.is_admin());
create policy "owners delete lbi datasets" on public.lbi_datasets for delete to authenticated
  using (uploaded_by = auth.uid() or public.is_admin());

create policy "read accessible lbi observations" on public.lbi_observations for select
  using (exists (select 1 from public.lbi_datasets d where d.id = lbi_dataset_id
    and (d.published = 'approved' or d.uploaded_by = auth.uid() or public.is_admin())));

-- The function validates ownership and inserts the dataset and observations in
-- one transaction. Any raised exception rolls the complete import back.
create or replace function public.import_lbi_dataset(p_dataset jsonb, p_observations jsonb)
returns uuid language plpgsql security invoker set search_path = public as $$
declare v_id uuid; v_reference public.species_biological_references;
begin
  if not public.is_admin_or_partner() then raise exception 'Not authorized'; end if;
  if jsonb_typeof(p_observations) <> 'array' or jsonb_array_length(p_observations) = 0
    or jsonb_array_length(p_observations) > 25000 then raise exception 'Invalid observation count'; end if;
  select * into v_reference from public.species_biological_references
    where id = (p_dataset->>'biological_reference_id')::uuid and status = 'approved';
  if not found then raise exception 'Approved biological reference not found'; end if;
  if v_reference.species_id <> (p_dataset->>'species_id')::uuid
    or v_reference.length_type <> p_dataset->>'length_type'
    or v_reference.length_unit <> p_dataset->>'length_unit' then
    raise exception 'Biological reference is incompatible';
  end if;
  insert into public.lbi_datasets (
    dataset_name,slug,species_id,biological_reference_id,organization_id,uploaded_by,
    sampling_location,latitude,longitude,landing_site,sampling_start_date,sampling_end_date,
    fishing_gear,sampling_method,catch_scope,market_sorting,collector_name,collector_organization,
    notes,length_type,length_unit,template_version,calculation_version,reference_snapshot,
    validation_summary,analysis_result,validation_report,status
  ) values (
    left(trim(p_dataset->>'dataset_name'),200), p_dataset->>'slug',
    (p_dataset->>'species_id')::uuid,(p_dataset->>'biological_reference_id')::uuid,auth.uid(),auth.uid(),
    left(trim(p_dataset->>'sampling_location'),300),nullif(p_dataset->>'latitude','')::numeric,
    nullif(p_dataset->>'longitude','')::numeric,left(trim(p_dataset->>'landing_site'),300),
    (p_dataset->>'sampling_start_date')::date,(p_dataset->>'sampling_end_date')::date,
    left(trim(p_dataset->>'fishing_gear'),200),p_dataset->>'sampling_method',p_dataset->>'catch_scope',
    (p_dataset->>'market_sorting')::boolean,left(trim(p_dataset->>'collector_name'),200),
    nullif(left(trim(p_dataset->>'collector_organization'),200),''),
    nullif(left(trim(p_dataset->>'notes'),4000),''),p_dataset->>'length_type',p_dataset->>'length_unit',
    p_dataset->>'template_version',p_dataset->>'calculation_version',p_dataset->'reference_snapshot',
    p_dataset->'validation_summary',p_dataset->'analysis_result',coalesce(p_dataset->'validation_report','[]'), 'ready'
  ) returning id into v_id;
  insert into public.lbi_observations
    (lbi_dataset_id,sample_id,sampling_date,length,sex,weight,maturity_stage,notes,source_row_number)
  select v_id,left(trim(x.sample_id),200),x.sampling_date,x.length,x.sex,x.weight,
    nullif(left(trim(x.maturity_stage),200),''),nullif(left(trim(x.notes),2000),''),x.source_row_number
  from jsonb_to_recordset(p_observations) as x(
    sample_id text,sampling_date date,length numeric,sex text,weight numeric,
    maturity_stage text,notes text,source_row_number integer);
  return v_id;
end $$;
grant execute on function public.import_lbi_dataset(jsonb,jsonb) to authenticated;

-- Approved references are immutable. Edits must insert a new version.
create or replace function public.prevent_approved_reference_mutation() returns trigger
language plpgsql set search_path = public as $$
begin
  if old.status = 'approved' and (new.* is distinct from old.*) then
    if new.status = 'archived' and
       (to_jsonb(new) - array['status','updated_at']) = (to_jsonb(old) - array['status','updated_at'])
    then return new; end if;
    raise exception 'Approved references are immutable; create a new version';
  end if;
  if new.status = 'approved' and old.status <> 'under_review' then
    raise exception 'Only under-review references can be approved';
  end if;
  if new.status = 'approved' then new.approved_at = now(); new.reviewed_by = auth.uid(); end if;
  new.updated_at = now();
  return new;
end $$;
drop trigger if exists protect_approved_reference on public.species_biological_references;
create trigger protect_approved_reference before update on public.species_biological_references
for each row execute function public.prevent_approved_reference_mutation();
