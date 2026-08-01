begin;

set local statement_timeout = 0;

create index if not exists fisheries_trip_user_idx
  on public.dataset_fish_trip(user_id);

create index if not exists fisheries_length_user_idx
  on public.dataset_fish_length(user_id);

drop function if exists public.get_fisheries_dashboard_chart(uuid,text,jsonb,numeric,text);

create or replace function public.get_fisheries_dashboard_chart(
  p_user_id uuid,
  p_tab text,
  p_filters jsonb default '{}'::jsonb,
  p_bin_width numeric default 1,
  p_measurement text default 'TL'
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_options jsonb;
  v_series jsonb;
begin
  if p_tab not in ('cpue', 'totallanding', 'composition', 'lengthfrequency') then
    raise exception 'Unsupported dashboard tab: %', p_tab;
  end if;

  if p_tab = 'lengthfrequency' then
    select jsonb_build_object(
      'location', coalesce((select jsonb_agg(v order by v) from (select distinct fishing_ground::text v from public.dataset_fish_length where user_id = p_user_id and nullif(trim(fishing_ground::text), '') is not null) s), '[]'::jsonb),
      'year', coalesce((select jsonb_agg(v order by v) from (select distinct extract(year from tanggal::date)::int v from public.dataset_fish_length where user_id = p_user_id and tanggal is not null) s), '[]'::jsonb),
      'month', coalesce((select jsonb_agg(v order by v) from (select distinct to_char(tanggal::date, 'MM') v from public.dataset_fish_length where user_id = p_user_id and tanggal is not null) s), '[]'::jsonb),
      'gear', coalesce((select jsonb_agg(v order by v) from (select distinct alat_tangkap::text v from public.dataset_fish_length where user_id = p_user_id and nullif(trim(alat_tangkap::text), '') is not null) s), '[]'::jsonb),
      'area', coalesce((select jsonb_agg(v order by v) from (select distinct fishing_ground::text v from public.dataset_fish_length where user_id = p_user_id and nullif(trim(fishing_ground::text), '') is not null) s), '[]'::jsonb),
      'family', coalesce((select jsonb_agg(v order by v) from (select distinct family::text v from public.dataset_fish_length where user_id = p_user_id and nullif(trim(family::text), '') is not null) s), '[]'::jsonb),
      'species', coalesce((select jsonb_agg(v order by v) from (select distinct spesies::text v from public.dataset_fish_length where user_id = p_user_id and nullif(trim(spesies::text), '') is not null) s), '[]'::jsonb)
    ) into v_options;

    with filtered as (
      select to_char(tanggal::date, 'YYYY-MM') as month_key,
        nullif(panjang::text, '')::numeric as value
      from public.dataset_fish_length
      where user_id = p_user_id and tanggal is not null
        and (coalesce(p_filters->>'location','') = '' or fishing_ground::text = p_filters->>'location')
        and (coalesce(p_filters->>'year','') = '' or extract(year from tanggal::date)::text = p_filters->>'year')
        and (coalesce(p_filters->>'month','') = '' or to_char(tanggal::date,'MM') = p_filters->>'month')
        and (coalesce(p_filters->>'gear','') = '' or alat_tangkap::text = p_filters->>'gear')
        and (coalesce(p_filters->>'area','') = '' or fishing_ground::text = p_filters->>'area')
        and (coalesce(p_filters->>'family','') = '' or family::text = p_filters->>'family')
        and (coalesce(p_filters->>'species','') = '' or spesies::text = p_filters->>'species')
    ), binned as (
      select month_key, floor(value / greatest(p_bin_width, 0.1)) * greatest(p_bin_width, 0.1) as bin_lower, count(*) as frequency
      from filtered where value > 0 group by month_key, bin_lower
    )
    select coalesce(jsonb_agg(jsonb_build_object('month',month_key,'lower',bin_lower,'upper',bin_lower + greatest(p_bin_width,0.1),'frequency',frequency) order by month_key,bin_lower), '[]'::jsonb)
    into v_series from binned;
  else
    select jsonb_build_object(
      'location', coalesce((select jsonb_agg(v order by v) from (select distinct kode_lokasi::text v from public.dataset_fish_trip where user_id = p_user_id and nullif(trim(kode_lokasi::text), '') is not null) s), '[]'::jsonb),
      'year', coalesce((select jsonb_agg(v order by v) from (select distinct extract(year from tanggal::date)::int v from public.dataset_fish_trip where user_id = p_user_id and tanggal is not null) s), '[]'::jsonb),
      'month', coalesce((select jsonb_agg(v order by v) from (select distinct to_char(tanggal::date, 'MM') v from public.dataset_fish_trip where user_id = p_user_id and tanggal is not null) s), '[]'::jsonb),
      'gear', coalesce((select jsonb_agg(v order by v) from (select distinct alat_utama::text v from public.dataset_fish_trip where user_id = p_user_id and nullif(trim(alat_utama::text), '') is not null) s), '[]'::jsonb),
      'area', coalesce((select jsonb_agg(v order by v) from (select distinct zonasi::text v from public.dataset_fish_trip where user_id = p_user_id and nullif(trim(zonasi::text), '') is not null) s), '[]'::jsonb),
      'family', coalesce((select jsonb_agg(v order by v) from (select distinct family::text v from public.dataset_fish_trip where user_id = p_user_id and nullif(trim(family::text), '') is not null) s), '[]'::jsonb),
      'species', coalesce((select jsonb_agg(v order by v) from (select distinct nama_spesies::text v from public.dataset_fish_trip where user_id = p_user_id and nullif(trim(nama_spesies::text), '') is not null) s), '[]'::jsonb)
    ) into v_options;

    if p_tab = 'cpue' then
      with filtered as (
        select to_char(tanggal::date,'YYYY-MM') as month_key, trip_id::text as trip_key, coalesce(nullif(total_tangkapan::text,'')::numeric,0) as catch_kg
        from public.dataset_fish_trip where user_id = p_user_id and tanggal is not null
          and (coalesce(p_filters->>'location','')='' or kode_lokasi::text=p_filters->>'location') and (coalesce(p_filters->>'year','')='' or extract(year from tanggal::date)::text=p_filters->>'year') and (coalesce(p_filters->>'month','')='' or to_char(tanggal::date,'MM')=p_filters->>'month') and (coalesce(p_filters->>'gear','')='' or alat_utama::text=p_filters->>'gear') and (coalesce(p_filters->>'area','')='' or zonasi::text=p_filters->>'area') and (coalesce(p_filters->>'family','')='' or family::text=p_filters->>'family') and (coalesce(p_filters->>'species','')='' or nama_spesies::text=p_filters->>'species')
      ), trips as (select month_key,trip_key,sum(catch_kg) as catch_kg from filtered group by month_key,trip_key), monthly as (select month_key,count(*) as trip_count,sum(catch_kg) as catch_kg,avg(catch_kg) as cpue from trips group by month_key)
      select coalesce(jsonb_agg(jsonb_build_object('month',month_key,'tripCount',trip_count,'catchKg',catch_kg,'cpue',cpue) order by month_key),'[]'::jsonb) into v_series from monthly;
    elsif p_tab = 'totallanding' then
      with filtered as (
        select to_char(tanggal::date,'YYYY-MM') as month_key, coalesce(nullif(total_tangkapan::text,'')::numeric,0) as catch_kg
        from public.dataset_fish_trip where user_id=p_user_id and tanggal is not null
          and (coalesce(p_filters->>'location','')='' or kode_lokasi::text=p_filters->>'location') and (coalesce(p_filters->>'year','')='' or extract(year from tanggal::date)::text=p_filters->>'year') and (coalesce(p_filters->>'month','')='' or to_char(tanggal::date,'MM')=p_filters->>'month') and (coalesce(p_filters->>'gear','')='' or alat_utama::text=p_filters->>'gear') and (coalesce(p_filters->>'area','')='' or zonasi::text=p_filters->>'area') and (coalesce(p_filters->>'family','')='' or family::text=p_filters->>'family') and (coalesce(p_filters->>'species','')='' or nama_spesies::text=p_filters->>'species')
      ), monthly as (select month_key,sum(catch_kg) as total_kg from filtered group by month_key)
      select coalesce(jsonb_agg(jsonb_build_object('month',month_key,'totalKg',total_kg) order by month_key),'[]'::jsonb) into v_series from monthly;
    else
      with filtered as (
        select to_char(tanggal::date,'YYYY-MM') as month_key, coalesce(nullif(nama_spesies::text,''),'Tidak diketahui') as species, coalesce(nullif(total_tangkapan::text,'')::numeric,0) as catch_kg
        from public.dataset_fish_trip where user_id=p_user_id and tanggal is not null
          and (coalesce(p_filters->>'location','')='' or kode_lokasi::text=p_filters->>'location') and (coalesce(p_filters->>'year','')='' or extract(year from tanggal::date)::text=p_filters->>'year') and (coalesce(p_filters->>'month','')='' or to_char(tanggal::date,'MM')=p_filters->>'month') and (coalesce(p_filters->>'gear','')='' or alat_utama::text=p_filters->>'gear') and (coalesce(p_filters->>'area','')='' or zonasi::text=p_filters->>'area') and (coalesce(p_filters->>'family','')='' or family::text=p_filters->>'family') and (coalesce(p_filters->>'species','')='' or nama_spesies::text=p_filters->>'species')
      ), monthly as (select month_key,species,sum(catch_kg) as total_kg from filtered group by month_key,species)
      select coalesce(jsonb_agg(jsonb_build_object('month',month_key,'species',species,'totalKg',total_kg) order by month_key,species),'[]'::jsonb) into v_series from monthly;
    end if;
  end if;

  return jsonb_build_object('options',v_options,'series',v_series);
end;
$$;

grant execute on function public.get_fisheries_dashboard_chart(uuid,text,jsonb,numeric,text) to anon, authenticated;

create or replace function public.save_fisheries_dashboard_source(
  p_dataset_id uuid,
  p_source_type text,
  p_rows jsonb,
  p_compatible_tabs text[]
)
returns uuid
language plpgsql
security definer
set search_path = public
set statement_timeout = '5min'
as $$
declare
  v_user_id uuid;
  v_batch_id uuid;
  v_user_name text;
begin
  select user_id into v_user_id
  from public.datasets
  where id = p_dataset_id
    and kind = 'dashboard'
    and (user_id = auth.uid() or public.is_admin())
  for update;

  if v_user_id is null then
    raise exception 'dashboard_not_accessible' using errcode = '42501';
  end if;
  if p_source_type not in ('trip','length')
    or jsonb_typeof(p_rows) <> 'array'
    or jsonb_array_length(p_rows) = 0 then
    raise exception 'invalid_dashboard_source';
  end if;

  select coalesce(nullif(trim(username),''),nullif(trim(organization),''),nullif(trim(email),''),'Pengguna')
  into v_user_name from public.users where id = auth.uid();

  delete from public.dataset_import_batches
  where dataset_id = p_dataset_id and source_type = p_source_type;

  insert into public.dataset_import_batches(
    dataset_id, created_by, created_by_name, row_ids, row_count,
    source_type, compatible_tabs
  ) values (
    p_dataset_id, auth.uid(), coalesce(v_user_name,'Pengguna'), '{}',
    jsonb_array_length(p_rows), p_source_type, p_compatible_tabs
  ) returning id into v_batch_id;

  if p_source_type = 'trip' then
    insert into public.dataset_fish_trip(
      user_id,trip_id,tanggal,kode_lokasi,alat_utama,zonasi,
      family,nama_spesies,total_tangkapan
    )
    select v_user_id,item->>'trip_id',(item->>'tanggal')::date,
      item->>'kode_lokasi',item->>'alat_utama',item->>'zonasi',
      item->>'family',item->>'nama_spesies',
      nullif(item->>'total_tangkapan','')::numeric
    from jsonb_array_elements(p_rows) item;
  else
    insert into public.dataset_fish_length(
      user_id,id_trip,tanggal,fishing_ground,alat_tangkap,
      family,spesies,panjang
    )
    select v_user_id,item->>'id_trip',(item->>'tanggal')::date,
      item->>'fishing_ground',item->>'alat_tangkap',item->>'family',
      item->>'spesies',nullif(item->>'panjang','')::numeric
    from jsonb_array_elements(p_rows) item;
  end if;

  return v_batch_id;
end;
$$;

revoke all on function public.save_fisheries_dashboard_source(uuid,text,jsonb,text[]) from public;
grant execute on function public.save_fisheries_dashboard_source(uuid,text,jsonb,text[]) to authenticated;

alter table public.dataset_import_batches
  add column if not exists import_status text not null default 'complete'
  check (import_status in ('uploading','complete'));

alter table public.dataset_import_batches
  add column if not exists expected_row_count bigint;

alter table public.dataset_import_batches
  add column if not exists completed_at timestamptz;

alter table public.dataset_fish_trip
  add column if not exists import_batch_id uuid
  references public.dataset_import_batches(id) on delete cascade;

alter table public.dataset_fish_length
  add column if not exists import_batch_id uuid
  references public.dataset_import_batches(id) on delete cascade;

create index if not exists fisheries_trip_import_batch_idx
  on public.dataset_fish_trip(import_batch_id);
create index if not exists fisheries_length_import_batch_idx
  on public.dataset_fish_length(import_batch_id);

create table if not exists public.fisheries_dashboard_import_staging (
  batch_id uuid not null references public.dataset_import_batches(id) on delete cascade,
  row_number bigint not null,
  payload jsonb not null check (
    jsonb_typeof(payload) = 'array' and jsonb_array_length(payload) > 0
  ),
  primary key (batch_id, row_number)
);

-- Existing installations used one JSON object per staged row. Chunked uploads
-- store one non-empty JSON array per receipt. NOT VALID avoids blocking this
-- migration on abandoned legacy receipts while still enforcing all new writes.
alter table public.fisheries_dashboard_import_staging
  drop constraint if exists fisheries_dashboard_import_staging_payload_check;
alter table public.fisheries_dashboard_import_staging
  add constraint fisheries_dashboard_import_staging_payload_check
  check (jsonb_typeof(payload) = 'array' and jsonb_array_length(payload) > 0)
  not valid;

revoke all on public.fisheries_dashboard_import_staging from anon, authenticated;

create or replace function public.begin_fisheries_dashboard_import(
  p_dataset_id uuid,
  p_source_type text,
  p_compatible_tabs text[],
  p_total_rows bigint
)
returns uuid
language plpgsql
security definer
set search_path = public
set statement_timeout = '5min'
as $$
declare v_user_id uuid; v_batch_id uuid; v_user_name text;
begin
  select user_id into v_user_id from public.datasets
  where id = p_dataset_id and kind = 'dashboard'
    and (user_id = auth.uid() or public.is_admin()) for update;
  if v_user_id is null then raise exception 'dashboard_not_accessible' using errcode='42501'; end if;
  if p_source_type not in ('trip','length') or p_total_rows < 1 then raise exception 'invalid_dashboard_source'; end if;

  delete from public.dataset_import_batches
  where dataset_id = p_dataset_id and source_type = p_source_type
    and import_status = 'uploading';

  select coalesce(nullif(trim(username),''),nullif(trim(organization),''),nullif(trim(email),''),'Pengguna')
  into v_user_name from public.users where id = auth.uid();
  insert into public.dataset_import_batches(
    dataset_id,created_by,created_by_name,row_ids,row_count,source_type,
    compatible_tabs,import_status,expected_row_count
  ) values (
    p_dataset_id,auth.uid(),coalesce(v_user_name,'Pengguna'),'{}',0,p_source_type,
    p_compatible_tabs,'uploading',p_total_rows
  ) returning id into v_batch_id;
  return v_batch_id;
end;
$$;

create or replace function public.append_fisheries_dashboard_import_chunk(
  p_batch_id uuid,
  p_offset bigint,
  p_rows jsonb
)
returns bigint
language plpgsql
security definer
set search_path = public
set statement_timeout = '5min'
as $$
declare v_count bigint; v_inserted bigint; v_user_id uuid; v_source_type text;
begin
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then raise exception 'invalid_import_chunk'; end if;
  select d.user_id,b.source_type into v_user_id,v_source_type
    from public.dataset_import_batches b join public.datasets d on d.id=b.dataset_id
    where b.id=p_batch_id and b.import_status='uploading'
      and (d.user_id=auth.uid() or public.is_admin());
  if v_user_id is null then raise exception 'import_session_not_accessible' using errcode='42501'; end if;

  insert into public.fisheries_dashboard_import_staging(batch_id,row_number,payload)
  values (p_batch_id,p_offset,p_rows)
  on conflict (batch_id,row_number) do nothing;
  get diagnostics v_inserted = row_count;

  -- The chunk receipt makes retries idempotent. The receipt and destination rows
  -- are committed together, while aborting the batch removes destination rows
  -- through their import_batch_id foreign key.
  if v_inserted = 1 and v_source_type = 'trip' then
    insert into public.dataset_fish_trip(
      user_id,import_batch_id,trip_id,tanggal,kode_lokasi,alat_utama,
      zonasi,family,nama_spesies,total_tangkapan
    )
    select v_user_id,p_batch_id,item->>'trip_id',(item->>'tanggal')::date,
      item->>'kode_lokasi',item->>'alat_utama',item->>'zonasi',
      item->>'family',item->>'nama_spesies',
      nullif(item->>'total_tangkapan','')::numeric
    from jsonb_array_elements(p_rows) item;
  elsif v_inserted = 1 then
    insert into public.dataset_fish_length(
      user_id,import_batch_id,id_trip,tanggal,fishing_ground,
      alat_tangkap,family,spesies,panjang
    )
    select v_user_id,p_batch_id,item->>'id_trip',(item->>'tanggal')::date,
      item->>'fishing_ground',item->>'alat_tangkap',item->>'family',
      item->>'spesies',nullif(item->>'panjang','')::numeric
    from jsonb_array_elements(p_rows) item;
  end if;

  select coalesce(sum(jsonb_array_length(payload)),0) into v_count
  from public.fisheries_dashboard_import_staging where batch_id=p_batch_id;
  update public.dataset_import_batches set row_count=v_count where id=p_batch_id;
  return v_count;
end;
$$;

create or replace function public.finalize_fisheries_dashboard_import(p_batch_id uuid)
returns bigint
language plpgsql
security definer
set search_path = public
set statement_timeout = '5min'
as $$
declare v_user_id uuid; v_source_type text; v_expected bigint; v_actual bigint; v_dataset_id uuid; v_compatible_tabs text[]; v_saved_status jsonb;
begin
  select d.user_id,b.source_type,b.expected_row_count,b.dataset_id,b.compatible_tabs
  into v_user_id,v_source_type,v_expected,v_dataset_id,v_compatible_tabs
  from public.dataset_import_batches b join public.datasets d on d.id=b.dataset_id
  where b.id=p_batch_id and b.import_status='uploading'
    and (d.user_id=auth.uid() or public.is_admin()) for update;
  if v_user_id is null then raise exception 'import_session_not_accessible' using errcode='42501'; end if;
  select coalesce(sum(jsonb_array_length(payload)),0) into v_actual
  from public.fisheries_dashboard_import_staging where batch_id=p_batch_id;
  if v_actual <> v_expected then raise exception 'incomplete_import:%/%',v_actual,v_expected; end if;

  delete from public.fisheries_dashboard_import_staging where batch_id=p_batch_id;
  update public.dataset_import_batches set import_status='complete',row_count=v_actual,completed_at=now() where id=p_batch_id;
  select coalesce(jsonb_object_agg(tab, 'saved'), '{}'::jsonb)
  into v_saved_status from unnest(v_compatible_tabs) tab;
  update public.datasets
  set column_config = jsonb_set(
        column_config,
        '{dashboardWorkflow,uploadStatus}',
        coalesce(column_config->'dashboardWorkflow'->'uploadStatus','{}'::jsonb) || v_saved_status,
        true
      ),
      updated_at = now()
  where id = v_dataset_id;
  return v_actual;
end;
$$;

create or replace function public.abort_fisheries_dashboard_import(p_batch_id uuid)
returns void
language plpgsql
security definer
set search_path = public
set statement_timeout = '5min'
as $$
begin
  delete from public.dataset_import_batches b
  using public.datasets d
  where b.id=p_batch_id and d.id=b.dataset_id and b.import_status='uploading'
    and (d.user_id=auth.uid() or public.is_admin());
end;
$$;

grant execute on function public.begin_fisheries_dashboard_import(uuid,text,text[],bigint) to authenticated;
grant execute on function public.append_fisheries_dashboard_import_chunk(uuid,bigint,jsonb) to authenticated;
grant execute on function public.finalize_fisheries_dashboard_import(uuid) to authenticated;
grant execute on function public.abort_fisheries_dashboard_import(uuid) to authenticated;

commit;

