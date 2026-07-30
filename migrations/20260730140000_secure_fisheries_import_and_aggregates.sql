-- Secure normalized fisheries writes and public-safe aggregation.
-- Child tables deliberately have no INSERT/UPDATE/DELETE policies: writes occur
-- only through the ownership-checked transactional function below.

drop policy if exists "accessible trips" on public.fishing_trips;
drop policy if exists "accessible effort" on public.fishing_trip_effort;
drop policy if exists "accessible catches" on public.fishing_trip_catches;
drop policy if exists "accessible lengths" on public.fish_length_measurements;
drop policy if exists "authorized vessels" on public.vessels;

create policy "owners read vessels" on public.vessels for select to authenticated
using (partner_id = auth.uid() or public.is_admin());
create policy "owners read trips" on public.fishing_trips for select to authenticated
using (exists (
  select 1 from public.fisheries_datasets d
  where d.id = fisheries_dataset_id
    and (d.partner_id = auth.uid() or d.uploaded_by = auth.uid() or public.is_admin())
));
create policy "owners read effort" on public.fishing_trip_effort for select to authenticated
using (exists (
  select 1 from public.fishing_trips t
  join public.fisheries_datasets d on d.id = t.fisheries_dataset_id
  where t.id = fishing_trip_id
    and (d.partner_id = auth.uid() or d.uploaded_by = auth.uid() or public.is_admin())
));
create policy "owners read catches" on public.fishing_trip_catches for select to authenticated
using (exists (
  select 1 from public.fishing_trips t
  join public.fisheries_datasets d on d.id = t.fisheries_dataset_id
  where t.id = fishing_trip_id
    and (d.partner_id = auth.uid() or d.uploaded_by = auth.uid() or public.is_admin())
));
create policy "owners read lengths" on public.fish_length_measurements for select to authenticated
using (exists (
  select 1 from public.fishing_trip_catches c
  join public.fishing_trips t on t.id = c.fishing_trip_id
  join public.fisheries_datasets d on d.id = t.fisheries_dataset_id
  where c.id = fishing_trip_catch_id
    and (d.partner_id = auth.uid() or d.uploaded_by = auth.uid() or public.is_admin())
));

create or replace function public.import_normalized_fisheries_dataset(
  p_dashboard_id uuid,
  p_metadata jsonb,
  p_trips jsonb,
  p_catches jsonb,
  p_lengths jsonb default '[]'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_owner uuid;
  v_dataset_id uuid;
  v_trip_id uuid;
  v_vessel_id uuid;
  v_catch_id uuid;
  v_item jsonb;
  v_trip_count integer;
  v_catch_count integer;
begin
  if v_user is null or not public.is_admin_or_partner() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  select user_id into v_owner from public.datasets
    where id = p_dashboard_id and kind = 'dashboard'
      and (user_id = v_user or public.is_admin())
      and fisheries_dataset_id is null;
  if v_owner is null then
    raise exception 'dashboard_not_importable' using errcode = '42501';
  end if;
  if jsonb_typeof(p_trips) <> 'array' or jsonb_typeof(p_catches) <> 'array'
     or jsonb_typeof(p_lengths) <> 'array' then
    raise exception 'payload_arrays_required' using errcode = '22023';
  end if;
  v_trip_count := jsonb_array_length(p_trips);
  v_catch_count := jsonb_array_length(p_catches);
  if v_trip_count < 1 or v_trip_count > 50000
     or v_catch_count < 1 or v_catch_count > 500000
     or jsonb_array_length(p_lengths) > 1000000 then
    raise exception 'payload_size_invalid' using errcode = '22023';
  end if;

  create temporary table trip_import_map(
    trip_code text primary key, trip_id uuid not null
  ) on commit drop;
  create temporary table catch_import_map(
    source_key text primary key, catch_id uuid not null
  ) on commit drop;

  insert into public.fisheries_datasets(
    dataset_name, slug, partner_id, organization_id, uploaded_by,
    source_file_name, template_version, validation_summary,
    calculation_snapshot, status
  ) values (
    left(trim(p_metadata->>'dataset_name'), 200),
    p_metadata->>'slug', v_owner, v_owner, v_user,
    nullif(left(trim(p_metadata->>'source_file_name'), 255), ''),
    coalesce(nullif(p_metadata->>'template_version', ''), '1.0'),
    coalesce(p_metadata->'validation_summary', '{}'::jsonb),
    coalesce(p_metadata->'calculation_snapshot', '{}'::jsonb),
    'ready'
  ) returning id into v_dataset_id;

  for v_item in select value from jsonb_array_elements(p_trips)
  loop
    if nullif(trim(v_item->>'trip_id'), '') is null
       or nullif(trim(v_item->>'landing_location'), '') is null
       or nullif(trim(v_item->>'primary_gear'), '') is null then
      raise exception 'invalid_trip_required_fields' using errcode = '22023';
    end if;
    v_vessel_id := null;
    if nullif(trim(v_item->>'vessel_code'), '') is not null then
      insert into public.vessels(
        partner_id, vessel_code, vessel_name, engine_category, engine_power,
        engine_power_unit, gross_tonnage, vessel_length, vessel_material,
        hold_count, hold_capacity, freezer_available, freezer_capacity
      ) values (
        v_owner, left(trim(v_item->>'vessel_code'), 100),
        nullif(left(trim(v_item->>'vessel_name'), 200), ''),
        nullif(left(trim(v_item->>'engine_category'), 100), ''),
        nullif(v_item->>'engine_power','')::numeric,
        nullif(left(trim(v_item->>'engine_power_unit'), 30), ''),
        nullif(v_item->>'gross_tonnage','')::numeric,
        nullif(v_item->>'vessel_length','')::numeric,
        nullif(left(trim(v_item->>'vessel_material'), 100), ''),
        nullif(v_item->>'hold_count','')::integer,
        nullif(v_item->>'hold_capacity','')::numeric,
        nullif(v_item->>'freezer_available','')::boolean,
        nullif(v_item->>'freezer_capacity','')::numeric
      )
      on conflict(partner_id, vessel_code) do update set
        vessel_name = coalesce(excluded.vessel_name, public.vessels.vessel_name),
        updated_at = now()
      returning id into v_vessel_id;
    end if;

    insert into public.fishing_trips(
      fisheries_dataset_id, trip_code, village, enumerator_name, origin_port,
      landing_location, fisher_name, collector_name, vessel_id, vessel_name,
      wpp, departure_at, return_at, primary_fishing_gear,
      secondary_fishing_gear, fishing_aid, fishing_location, latitude,
      longitude, depth, zoning, crew_count, operational_cost, source_row_number
    ) values (
      v_dataset_id, left(trim(v_item->>'trip_id'), 200),
      nullif(left(trim(v_item->>'village'), 200), ''),
      nullif(left(trim(v_item->>'enumerator_name'), 200), ''),
      nullif(left(trim(v_item->>'origin_port'), 200), ''),
      left(trim(v_item->>'landing_location'), 300),
      nullif(left(trim(v_item->>'fisher_name'), 200), ''),
      nullif(left(trim(v_item->>'collector_name'), 200), ''),
      v_vessel_id, nullif(left(trim(v_item->>'vessel_name'), 200), ''),
      nullif(left(trim(v_item->>'wpp'), 50), ''),
      (v_item->>'departure_at')::timestamptz,
      (v_item->>'return_at')::timestamptz,
      left(trim(v_item->>'primary_gear'), 200),
      nullif(left(trim(v_item->>'secondary_gear'), 200), ''),
      nullif(left(trim(v_item->>'fishing_aid'), 200), ''),
      nullif(left(trim(v_item->>'fishing_location'), 300), ''),
      nullif(v_item->>'latitude','')::numeric,
      nullif(v_item->>'longitude','')::numeric,
      nullif(v_item->>'depth','')::numeric,
      nullif(left(trim(v_item->>'zoning'), 100), ''),
      nullif(v_item->>'crew_count','')::integer,
      nullif(v_item->>'operational_cost','')::numeric,
      nullif(v_item->>'source_row_number','')::integer
    ) returning id into v_trip_id;
    insert into trip_import_map values (v_item->>'trip_id', v_trip_id);

    if coalesce(v_item ? 'fishing_duration_hours', false)
       or coalesce(v_item ? 'number_of_settings', false)
       or coalesce(v_item ? 'number_of_hooks', false)
       or coalesce(v_item ? 'net_length', false) then
      insert into public.fishing_trip_effort(
        fishing_trip_id, gear_material, net_length, headline_length, mesh_size,
        hook_number_or_size, number_of_hooks, fishing_duration_hours,
        number_of_settings
      ) values (
        v_trip_id, nullif(left(trim(v_item->>'gear_material'), 100), ''),
        nullif(v_item->>'net_length','')::numeric,
        nullif(v_item->>'headline_length','')::numeric,
        nullif(v_item->>'mesh_size','')::numeric,
        nullif(left(trim(v_item->>'hook_size'), 100), ''),
        nullif(v_item->>'number_of_hooks','')::integer,
        nullif(v_item->>'fishing_duration_hours','')::numeric,
        nullif(v_item->>'number_of_settings','')::integer
      );
    end if;
  end loop;

  for v_item in select value from jsonb_array_elements(p_catches)
  loop
    select trip_id into v_trip_id from trip_import_map
      where trip_code = v_item->>'trip_id';
    if v_trip_id is null or nullif(v_item->>'species_id','') is null
       or nullif(v_item->>'source_key','') is null then
      raise exception 'invalid_catch_reference' using errcode = '23503';
    end if;
    insert into public.fishing_trip_catches(
      fishing_trip_id, species_id, original_species_name, catch_weight_kg,
      individual_count, retained_weight_kg, discarded_weight_kg,
      source_row_number
    ) values (
      v_trip_id, (v_item->>'species_id')::uuid,
      left(trim(v_item->>'original_species_name'), 300),
      nullif(v_item->>'catch_weight_kg','')::numeric,
      nullif(v_item->>'individual_count','')::integer,
      nullif(v_item->>'retained_weight_kg','')::numeric,
      nullif(v_item->>'discarded_weight_kg','')::numeric,
      nullif(v_item->>'source_row_number','')::integer
    ) returning id into v_catch_id;
    insert into catch_import_map values (v_item->>'source_key', v_catch_id);
  end loop;

  for v_item in select value from jsonb_array_elements(p_lengths)
  loop
    select catch_id into v_catch_id from catch_import_map
      where source_key = v_item->>'catch_source_key';
    if v_catch_id is null then
      raise exception 'invalid_length_catch_reference' using errcode = '23503';
    end if;
    insert into public.fish_length_measurements(
      fishing_trip_catch_id, species_id, measurement_type, length_cm,
      fish_sequence, source_row_number
    ) values (
      v_catch_id, (v_item->>'species_id')::uuid,
      v_item->>'measurement_type', (v_item->>'length_cm')::numeric,
      nullif(v_item->>'fish_sequence','')::integer,
      nullif(v_item->>'source_row_number','')::integer
    );
  end loop;

  update public.datasets
  set fisheries_dataset_id = v_dataset_id,
      dashboard_config = jsonb_set(
        coalesce(dashboard_config, '{}'::jsonb),
        '{sharedDatasetStatus}', '"imported"'::jsonb, true
      ),
      import_status = 'ready', draft_expires_at = null, updated_at = now()
  where id = p_dashboard_id;
  return v_dataset_id;
end;
$$;
revoke all on function public.import_normalized_fisheries_dataset(uuid,jsonb,jsonb,jsonb,jsonb) from public;
grant execute on function public.import_normalized_fisheries_dataset(uuid,jsonb,jsonb,jsonb,jsonb) to authenticated;

create or replace function public.get_published_fisheries_summary(p_slug text)
returns jsonb
language sql stable security definer set search_path = public
as $$
  with target as (
    select id, updated_at from public.fisheries_datasets
    where slug = p_slug and published = 'approved'
  ), trip_stats as (
    select count(*) trip_count, count(distinct coalesce(t.vessel_id::text,
      nullif(lower(trim(t.vessel_name)),''))) vessel_count,
      max(t.return_at) latest_field_date
    from public.fishing_trips t join target d on d.id=t.fisheries_dataset_id
  ), catch_stats as (
    select coalesce(sum(c.catch_weight_kg),0) total_weight_kg,
      coalesce(sum(c.individual_count),0) total_individuals
    from public.fishing_trip_catches c join public.fishing_trips t on t.id=c.fishing_trip_id
    join target d on d.id=t.fisheries_dataset_id
  ), length_stats as (
    select count(*) length_count from public.fish_length_measurements l
    join public.fishing_trip_catches c on c.id=l.fishing_trip_catch_id
    join public.fishing_trips t on t.id=c.fishing_trip_id
    join target d on d.id=t.fisheries_dataset_id
  )
  select case when exists(select 1 from target) then jsonb_build_object(
    'tripCount',ts.trip_count,'vesselCount',ts.vessel_count,
    'totalWeightKg',cs.total_weight_kg,'totalIndividuals',cs.total_individuals,
    'lengthMeasurementCount',ls.length_count,'latestFieldDate',ts.latest_field_date,
    'systemUpdatedAt',(select updated_at from target limit 1)
  ) else null end
  from trip_stats ts cross join catch_stats cs cross join length_stats ls;
$$;
revoke all on function public.get_published_fisheries_summary(text) from public;
grant execute on function public.get_published_fisheries_summary(text) to anon, authenticated;
