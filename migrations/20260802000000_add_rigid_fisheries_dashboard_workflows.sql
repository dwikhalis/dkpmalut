begin;

-- Remove the superseded dedicated metadata design if an earlier draft ran.
drop function if exists public.save_fisheries_dashboard_source(uuid,text,jsonb,text[]) cascade;
drop function if exists public.enforce_fisheries_dashboard_completion() cascade;
drop table if exists public.fisheries_dashboard_visualizations cascade;
drop table if exists public.fisheries_dashboard_source_uploads cascade;
drop table if exists public.fisheries_dashboard_workflows cascade;

-- A dashboard is an existing datasets record. Its workflow metadata is stored
-- in column_config, visualizations in chart_config, and publication in the
-- existing published/published_config columns.
alter table public.datasets drop constraint if exists datasets_kind_check;
alter table public.datasets add constraint datasets_kind_check
  check (kind in ('dataset','map','link','dashboard'));

alter table public.dataset_import_batches
  add column if not exists source_type text,
  add column if not exists compatible_tabs text[] not null default '{}';
alter table public.dataset_import_batches drop constraint if exists dataset_import_batches_source_type_check;
alter table public.dataset_import_batches add constraint dataset_import_batches_source_type_check
  check (source_type is null or source_type in ('trip','length'));
create unique index if not exists dataset_dashboard_source_type_uidx
  on public.dataset_import_batches(dataset_id,source_type) where source_type is not null;
drop policy if exists "public reads approved dashboard import batches" on public.dataset_import_batches;
create policy "public reads approved dashboard import batches" on public.dataset_import_batches for select to anon
using(exists(select 1 from public.datasets d where d.id=dataset_id and d.kind='dashboard' and d.published='approved'));

alter table public.dataset_fish_trip drop column if exists dashboard_source_upload_id;
alter table public.dataset_fish_length drop column if exists dashboard_source_upload_id;
alter table public.dataset_fish_trip drop column if exists id_trip;
alter table public.dataset_fish_trip add column if not exists user_id uuid references public.users(id) on delete set null;
alter table public.dataset_fish_length add column if not exists user_id uuid references public.users(id) on delete set null;

update public.dataset_fish_trip set user_id='6187a283-6e0f-4846-b923-b2d5308dd571'::uuid
where partner_id='b52046e5-edcb-4405-add1-9d570f82b379'::uuid and user_id is distinct from '6187a283-6e0f-4846-b923-b2d5308dd571'::uuid;
update public.dataset_fish_length set user_id='6187a283-6e0f-4846-b923-b2d5308dd571'::uuid
where partner_id='b52046e5-edcb-4405-add1-9d570f82b379'::uuid and user_id is distinct from '6187a283-6e0f-4846-b923-b2d5308dd571'::uuid;

create index if not exists fisheries_trip_user_idx on public.dataset_fish_trip(user_id);
create index if not exists fisheries_trip_filters_idx on public.dataset_fish_trip(tanggal,wpp,alat_utama,family,nama_spesies,zonasi,trip_id);
create index if not exists fisheries_length_user_idx on public.dataset_fish_length(user_id);
create index if not exists fisheries_length_filters_idx on public.dataset_fish_length(tanggal,wpp,spesies,alat_tangkap,id_trip);

alter table public.dataset_fish_trip enable row level security;
alter table public.dataset_fish_length enable row level security;
drop policy if exists "authorized trip source reads" on public.dataset_fish_trip;
drop policy if exists "authorized length source reads" on public.dataset_fish_length;
drop policy if exists "public reads approved dashboard trip rows" on public.dataset_fish_trip;
drop policy if exists "public reads approved dashboard length rows" on public.dataset_fish_length;
create policy "dashboard trip rows follow dataset access" on public.dataset_fish_trip for select to anon,authenticated
using(user_id=auth.uid() or public.is_admin() or exists(select 1 from public.datasets d where d.kind='dashboard' and d.column_config->'dashboardWorkflow'->>'sourcePartnerId'=partner_id::text and d.published='approved'));
create policy "dashboard length rows follow dataset access" on public.dataset_fish_length for select to anon,authenticated
using(user_id=auth.uid() or public.is_admin() or exists(select 1 from public.datasets d where d.kind='dashboard' and d.column_config->'dashboardWorkflow'->>'sourcePartnerId'=partner_id::text and d.published='approved'));

create or replace function public.save_fisheries_dashboard_source(p_dataset_id uuid,p_source_type text,p_rows jsonb,p_compatible_tabs text[])
returns uuid language plpgsql security definer set search_path=public as $$
declare v_owner uuid; v_partner uuid; v_batch uuid; v_name text;
begin
 select user_id,(column_config->'dashboardWorkflow'->>'sourcePartnerId')::uuid into v_owner,v_partner from public.datasets where id=p_dataset_id and kind='dashboard' and (user_id=auth.uid() or public.is_admin()) for update;
 if v_owner is null then raise exception 'dashboard_not_accessible' using errcode='42501'; end if;
 if p_source_type not in ('trip','length') or jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)=0 then raise exception 'invalid_dashboard_source'; end if;
 select coalesce(nullif(trim(username),''),nullif(trim(organization),''),nullif(trim(email),''),'Pengguna') into v_name from public.users where id=auth.uid();
 delete from public.dataset_import_batches where dataset_id=p_dataset_id and source_type=p_source_type;
 insert into public.dataset_import_batches(dataset_id,created_by,created_by_name,row_ids,row_count,source_type,compatible_tabs)
 values(p_dataset_id,auth.uid(),coalesce(v_name,'Pengguna'),'{}',jsonb_array_length(p_rows),p_source_type,p_compatible_tabs) returning id into v_batch;
 if p_source_type='trip' then
  insert into public.dataset_fish_trip(partner_id,user_id,trip_id,tanggal,wpp,alat_utama,zonasi,family,nama_spesies,total_tangkapan,harga,dpi)
  select v_partner,v_owner,r.trip_id,r.tanggal::date,r.wpp,r.alat_utama,r.zonasi,r.family,r.nama_spesies,r.total_tangkapan,r.harga,r.dpi
  from jsonb_to_recordset(p_rows) r(trip_id text,tanggal text,wpp text,alat_utama text,zonasi text,family text,nama_spesies text,total_tangkapan numeric,harga numeric,dpi text);
 else
  insert into public.dataset_fish_length(partner_id,user_id,id_trip,tanggal,wpp,spesies,panjang,fork_length,lokasi,fishing_ground,alat_tangkap,family)
  select v_partner,v_owner,r.id_trip,r.tanggal::date,r.wpp,r.spesies,r.panjang,r.fork_length,r.lokasi,r.fishing_ground,r.alat_tangkap,r.family
  from jsonb_to_recordset(p_rows) r(id_trip text,tanggal text,wpp text,spesies text,panjang numeric,fork_length numeric,lokasi text,fishing_ground text,alat_tangkap text,family text);
 end if;
 return v_batch;
end $$;
revoke all on function public.save_fisheries_dashboard_source(uuid,text,jsonb,text[]) from public;
grant execute on function public.save_fisheries_dashboard_source(uuid,text,jsonb,text[]) to authenticated;

create or replace function public.enforce_dataset_dashboard_completion() returns trigger language plpgsql set search_path=public as $$
declare v_meta jsonb; v_tab text; v_stage text; v_visual jsonb;
begin
 if new.kind<>'dashboard' then return new; end if;
 v_meta:=coalesce(new.column_config,'{}'::jsonb)->'dashboardWorkflow';
 v_visual:=coalesce(new.chart_config,'{}'::jsonb);
 v_stage:=coalesce(v_meta->>'currentStage','selection');
 if v_stage in ('visualization','publication') then
  for v_tab in select jsonb_array_elements_text(coalesce(v_meta->'selectedTabs','[]')) loop
   if coalesce(v_meta->'uploadStatus'->>v_tab,'pending')<>'saved' then raise exception 'dashboard_upload_incomplete:%',v_tab using errcode='23514'; end if;
  end loop;
 end if;
 if v_stage='publication' or new.published is not null then
  for v_tab in select jsonb_array_elements_text(coalesce(v_meta->'selectedTabs','[]')) loop
   if coalesce(v_meta->'visualizationStatus'->>v_tab,'pending')<>'saved' or coalesce(v_visual->v_tab->>'status','pending')<>'saved' then raise exception 'dashboard_visualization_incomplete:%',v_tab using errcode='23514'; end if;
  end loop;
 end if;
 if old.published is distinct from new.published and not public.is_admin() and new.published is distinct from 'requested' then raise exception 'dashboard_publication_status_forbidden' using errcode='42501'; end if;
 return new;
end $$;
drop trigger if exists enforce_dataset_dashboard_completion on public.datasets;
create trigger enforce_dataset_dashboard_completion before update on public.datasets for each row execute function public.enforce_dataset_dashboard_completion();

-- Register the client's already-populated rigid source data as one dashboard.
insert into public.datasets (
  user_id,label,slug,kind,data,column_config,chart_config,published_config,published,
  tag,description,image_path,import_status,draft_expires_at,data_regency,data_subwpp
)
select
  '6187a283-6e0f-4846-b923-b2d5308dd571'::uuid,
  'Dashboar Perikanan Tangkap Malut',
  'dashboar-perikanan-tangkap-malut',
  'dashboard',
  '[]'::jsonb,
  jsonb_build_object('dashboardWorkflow',jsonb_build_object(
    'selectedTabs',jsonb_build_array('cpue','totallanding','composition','lengthfrequency'),
    'currentStage','publication','activeTab','cpue',
    'uploadStatus',jsonb_build_object('cpue','saved','totallanding','saved','composition','saved','lengthfrequency','saved'),
    'visualizationStatus',jsonb_build_object('cpue','saved','totallanding','saved','composition','saved','lengthfrequency','saved'),
    'sourcePartnerId','b52046e5-edcb-4405-add1-9d570f82b379'
  )),
  jsonb_build_object(
    'cpue',jsonb_build_object('status','saved','title','CPUE','config',jsonb_build_object('chartType','bar')),
    'totallanding',jsonb_build_object('status','saved','title','Total Landing','config',jsonb_build_object('chartType','bar')),
    'composition',jsonb_build_object('status','saved','title','Komposisi','config',jsonb_build_object('chartType','doughnut','compositionThreshold',2)),
    'lengthfrequency',jsonb_build_object('status','saved','title','Frekuensi Panjang','config',jsonb_build_object('chartType','histogram','measurementType','TL','binWidth',1))
  ),
  jsonb_build_object('dashboard',jsonb_build_object('selectedTabs',jsonb_build_array('cpue','totallanding','composition','lengthfrequency'))),
  'requested',array['tangkap'],'Dashboard Perikanan Tangkap Malut',null,'ready',null,
  array['Pulau Morotai','Kota Ternate','Kota Tidore','Halmahera Selatan','Halmahera Utara'],
  array['Morotai - Halut','Ternate - Tidore - Halsel']
where not exists (
  select 1 from public.datasets
  where user_id='6187a283-6e0f-4846-b923-b2d5308dd571'::uuid
    and kind='dashboard' and label='Dashboar Perikanan Tangkap Malut'
);

commit;
